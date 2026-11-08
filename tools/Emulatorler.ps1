[CmdletBinding()]
param(
    [ValidateSet('3.0', '8.0', '9.0', '10.0')][string]$Version,
    [switch]$InstallApp,
    [switch]$LaunchOnly,
    [string]$Package = '',
    [switch]$CheckOnly,
    [switch]$Rebuild
)

# Local SDK/WSL launcher; no agent plugin is needed. Never included in the WGT.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
$taskRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'app-identity.ps1')

function Invoke-FilmTool {
    param([string]$File, [string[]]$ToolArguments, [int]$TimeoutSeconds = 30)
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $File
    $info.Arguments = (@($ToolArguments | ForEach-Object {
        if ($_.Length -gt 0 -and $_ -notmatch '[\s"]') { $_ }
        else { '"' + ([regex]::Replace(([regex]::Replace($_, '(\\*)"', '$1$1\"')), '(\\+)$', '$1$1')) + '"' }
    }) -join ' ')
    $info.WorkingDirectory = $taskRoot
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        $null = $process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (!$process.WaitForExit($TimeoutSeconds * 1000)) {
            $process.Kill()
            $process.WaitForExit()
            throw ('Komut zaman asimi: ' + [IO.Path]::GetFileName($File))
        }
        return [pscustomobject]@{ ExitCode = $process.ExitCode; Output = ($stdout.Result + $stderr.Result).Trim() }
    } finally { $process.Dispose() }
}

function Get-FilmDevices {
    $result = Invoke-FilmTool $script:sdb @('devices')
    if ($result.ExitCode -ne 0) { throw $result.Output }
    foreach ($line in ($result.Output -split '\r?\n')) {
        if ($line -match '^(\S+)\s+device\s+(\S+)') {
            [pscustomobject]@{ Serial = $Matches[1]; Name = $Matches[2] }
        }
    }
}

function Wait-FilmEmulator {
    param([string]$VmName, [string]$Endpoint)
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $lastNotice = -20
    while ($timer.Elapsed.TotalSeconds -lt 180) {
        $device = @(Get-FilmDevices | Where-Object {
            $_.Name -eq $VmName
        }) | Select-Object -First 1
        if (!$device -and $Endpoint) {
            # A connection attempted before guest boot can remain offline in SDB.
            $null = Invoke-FilmTool $script:sdb @('disconnect', $Endpoint)
            $null = Invoke-FilmTool $script:sdb @('connect', $Endpoint) -TimeoutSeconds 12
            $device = @(Get-FilmDevices | Where-Object { $_.Name -eq $VmName }) | Select-Object -First 1
        }
        if ($device) {
            # TV emulators reject echo/id. Capability is the supported readiness check.
            $capability = Invoke-FilmTool $script:sdb @('-s', $device.Serial, 'capability')
            if ($capability.ExitCode -eq 0 -and $capability.Output -match ('(?m)^platform_version:' + [regex]::Escape($Version) + '\s*$')) {
                return $device.Serial
            }
            if ($Endpoint) { $null = Invoke-FilmTool $script:sdb @('disconnect', $Endpoint) }
        }
        if ($timer.Elapsed.TotalSeconds - $lastNotice -ge 15) {
            Write-Host ('Emulatorun SDB baglantisi bekleniyor... ' + [int]$timer.Elapsed.TotalSeconds + ' sn')
            $lastNotice = $timer.Elapsed.TotalSeconds
        }
        Start-Sleep -Seconds 2
    }
    throw ('Emulator 180 saniyede hazir olmadi: ' + $VmName + '. Pencereyi ve WSL/SDK durumunu kontrol edin.')
}

function Assert-FilmSignedPackage {
    param([string]$Path)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        if (!$archive.GetEntry('author-signature.xml') -or !$archive.GetEntry('signature1.xml')) {
            throw 'Public WGT imzasizdir. -Package vermeden emulator icin imzali paketi hazirlayin.'
        }
    } finally { $archive.Dispose() }
}

try {
    if ($InstallApp -and $LaunchOnly) { throw '-InstallApp ve -LaunchOnly birlikte kullanilamaz.' }
    if ($CheckOnly -and !$Version) { throw '-CheckOnly icin -Version secilmelidir.' }
    if (!$Version) {
        Write-Host ''
        Write-Host 'FILM MERKEZI - EMULATOR SECIMI' -ForegroundColor Yellow
        Write-Host '  1  Tizen 3.0  - WSL / KVM'
        Write-Host '  2  Tizen 8.0  - Samsung TV, 1920x1080'
        Write-Host '  3  Tizen 9.0  - Samsung TV, 1920x1080'
        Write-Host '  4  Tizen 10.0 - Samsung TV, 1920x1080'
        Write-Host '  5  Acik Windows emulatorlerini kapat'
        Write-Host '  0  Cikis'
        Write-Host ''
        Write-Host 'Secilen emulator acilir, guncel uygulama kurulur ve baslatilir.'
        Write-Host 'Surum degistirmeden once diger emulator penceresini kapatin.'
        $choice = Read-Host 'Secim'
        if ($choice -eq '0') { exit 0 }
        if ($choice -eq '5') {
            $sdkConfig = Join-Path $env:USERPROFILE '.tizen.sdk.path.config'
            $sdkRoot = if (Test-Path -LiteralPath $sdkConfig) { ([IO.File]::ReadAllText($sdkConfig)).Trim() } else { 'C:\tizen-studio' }
            foreach ($emulator in @(Get-Process -Name 'emulator*' -ErrorAction SilentlyContinue)) {
                if ($emulator.Path -and $emulator.Path.StartsWith($sdkRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
                    $null = $emulator.CloseMainWindow()
                }
            }
            Write-Host 'Windows emulatorlerine pencere kapatma istegi gonderildi. WSL Tizen 3 penceresini ayrica kapatin.'
            exit 0
        }
        $choices = @{ '1' = '3.0'; '2' = '8.0'; '3' = '9.0'; '4' = '10.0' }
        if (!$choices.ContainsKey($choice)) { throw 'Gecersiz secim.' }
        $Version = $choices[$choice]
    }
    if (!$LaunchOnly) { $InstallApp = $true }

    $sdkConfig = Join-Path $env:USERPROFILE '.tizen.sdk.path.config'
    $sdkRoot = if (Test-Path -LiteralPath $sdkConfig) { ([IO.File]::ReadAllText($sdkConfig)).Trim() } else { 'C:\tizen-studio' }
    $script:sdb = Join-Path $sdkRoot 'tools\sdb.exe'
    if (!(Test-Path -LiteralPath $script:sdb -PathType Leaf)) { throw ('SDB bulunamadi: ' + $script:sdb) }
    $vmNames = @{ '3.0' = 'KAYHAN-WSL-TIZEN3'; '8.0' = 'FilmMerkezi-TV8-1080'; '9.0' = 'FilmMerkezi-TV9-1080'; '10.0' = 'T-samsung-10.0-x86_64' }
    $vmName = $vmNames[$Version]
    $wslLauncher = Join-Path (Split-Path -Parent $taskRoot) 'wsl-tizen-deneme\start-emulator.sh'
    $emCli = Join-Path $sdkRoot 'tools\emulator\bin\em-cli.bat'
    if ($Version -eq '3.0') {
        if (!(Test-Path -LiteralPath $wslLauncher -PathType Leaf)) { throw ('WSL baslaticisi bulunamadi: ' + $wslLauncher) }
    } elseif (!(Test-Path -LiteralPath $emCli -PathType Leaf)) { throw ('Emulator baslaticisi bulunamadi: ' + $emCli) }

    $normalPackage = Join-Path $taskRoot 'Film-Merkezi-TV-1.5.0.wgt'
    if (!$Package -and (Test-Path -LiteralPath $normalPackage -PathType Leaf)) { $Package = $normalPackage }
    $identity = Get-FilmAppIdentity -ConfigPath (Join-Path $taskRoot 'deneme\config.xml')
    $signProfile = if ($Version -eq '3.0') { 'KayhanEmulator' } else { 'FilmMerkeziEmulator' }
    $stage = Join-Path $PSScriptRoot 'emulator-build\FilmMerkeziEmulator\FilmMerkezi'
    $packagePath = if ($Package) { (Resolve-Path -LiteralPath $Package).Path } elseif ($Version -eq '3.0') {
        Join-Path $taskRoot ('Film-Merkezi-TV-' + $identity.Version + '.wgt')
    } else { Join-Path $stage 'Debug\FilmMerkezi.wgt' }
    if ($Package) { $identity = Get-FilmAppIdentity -PackagePath $packagePath }
    if ($identity.ApplicationId -notin @('FilmMerkez.FilmMerkezi','FMUpTest01.FilmMerkezi')) { throw 'Secilen paket Film Merkezi uygulamasi degil.' }

    if ($CheckOnly) {
        [pscustomobject]@{
            kind = 'launcher-preview'; deviceActionsExecuted = $false; version = $Version
            vm = $vmName; sdb = $script:sdb; installApp = [bool]$InstallApp
            launcher = if ($Version -eq '3.0') { $wslLauncher } else { $emCli }
            connection = 'VM adi ve platform surumu ile secilir; sabit cihaz kimligi kullanilmaz'
            package = $packagePath; signingProfile = $signProfile; application = $identity
        } | ConvertTo-Json -Depth 4
        exit 0
    }

    if ($InstallApp) {
        $node = (Get-Command node -ErrorAction Stop).Source
        if (!$Package) {
            $verified = if (!$Rebuild -and (Test-Path -LiteralPath $packagePath)) {
                Invoke-FilmTool $node @((Join-Path $PSScriptRoot 'verify-emulator.cjs'), $packagePath)
            } else { $null }
            if (!$verified -or $verified.ExitCode -ne 0) {
                Write-Host ('Guncel Film Merkezi ' + $identity.Version + ' emulator paketi hazirlaniyor...') -ForegroundColor Yellow
                if ($Version -eq '3.0') {
                    & (Join-Path $PSScriptRoot 'build.ps1')
                } else {
                    & $node (Join-Path $PSScriptRoot 'prepare-emulator.cjs') 'FilmMerkeziEmulator'
                    if ($LASTEXITCODE -ne 0) { throw 'Emulator kaynaklari hazirlanamadi.' }
                    & (Join-Path $sdkRoot 'tools\tizen-core\tz.exe') build -w $stage -b Debug -s 'FilmMerkeziEmulator'
                }
                if ($LASTEXITCODE -ne 0) { throw 'Emulator paketi olusturulamadi.' }
            }
            $verified = Invoke-FilmTool $node @((Join-Path $PSScriptRoot 'verify-emulator.cjs'), $packagePath)
            if ($verified.ExitCode -ne 0) { throw $verified.Output }
            Write-Host $verified.Output
        }
        Assert-FilmSignedPackage $packagePath
        $packageIdentity = Get-FilmAppIdentity -PackagePath $packagePath
        if ($packageIdentity.ApplicationId -ne $identity.ApplicationId -or $packageIdentity.Version -ne $identity.Version) { throw 'Paket kimligi/surumu kaynakla eslesmiyor.' }
    }

    Write-Host ('Tizen ' + $Version + ' aciliyor...') -ForegroundColor Yellow
    $endpoint = ''
    if ($Version -eq '3.0') {
        $wsl = Join-Path $env:SystemRoot 'System32\wsl.exe'
        $linuxLauncher = '/mnt/' + $wslLauncher.Substring(0, 1).ToLowerInvariant() + $wslLauncher.Substring(2).Replace('\', '/')
        $running = Invoke-FilmTool $wsl @('-d', 'Ubuntu-22.04', '-u', 'root', '--exec', 'pgrep', '-x', 'emulator-x86_64')
        if ($running.ExitCode -ne 0) {
            Start-Process -FilePath $wsl -ArgumentList @('-d', 'Ubuntu-22.04', '-u', 'root', '--exec', 'bash', $linuxLauncher) -WindowStyle Hidden | Out-Null
        }
        $endpoint = '127.0.0.1:26101'
    } elseif (!(@(Get-FilmDevices | Where-Object Name -EQ $vmName).Count)) {
        $commandLine = '""' + $emCli + '" launch -n "' + $vmName + '""'
        Start-Process -FilePath $env:ComSpec -ArgumentList @('/d', '/s', '/c', $commandLine) -WindowStyle Hidden | Out-Null
    }
    $serial = Wait-FilmEmulator -VmName $vmName -Endpoint $endpoint
    Write-Host ('Baglandi: ' + $serial + ' / ' + $vmName)

    if ($InstallApp) {
        Write-Host ('Film Merkezi ' + $identity.Version + ' kuruluyor...')
        # New SDB install uses an incompatible path on old TV emulators.
        # Explicit push + the TV installer also gives an unambiguous completion result.
        $remotePackage = '/home/owner/share/tmp/FilmMerkezi.wgt'
        $pushed = Invoke-FilmTool $script:sdb @('-s', $serial, 'push', $packagePath, $remotePackage) -TimeoutSeconds 90
        if ($pushed.ExitCode -ne 0) { throw $pushed.Output }
        $installed = Invoke-FilmTool $script:sdb @('-s', $serial, 'shell', '0', 'vd_appinstall', $identity.PackageId, $remotePackage) -TimeoutSeconds 120
        Write-Host $installed.Output
        if ($installed.ExitCode -ne 0 -or $installed.Output -notmatch 'install completed' -or $installed.Output -match '(?i)failed\[|install failed') {
            throw 'Kurulum tamamlanmadi. Yukaridaki TV kurulum yanitini kontrol edin; uygulama kaldirilmadi.'
        }
        $launched = Invoke-FilmTool $script:sdb @('-s', $serial, 'shell', '0', 'was_execute', $identity.ApplicationId)
        Write-Host $launched.Output
        if ($launched.ExitCode -ne 0 -or $launched.Output -notmatch '\b(launched|resumed)\b' -or $launched.Output -match '(?i)failed') { throw 'Kurulum tamamlandi fakat uygulamanin acilisi onaylanmadi.' }
    }
    Write-Host 'Hazir. Bu pencerenin kapanmasi emulatoru kapatmaz.' -ForegroundColor Green
    exit 0
} catch {
    Write-Host ('HATA: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
