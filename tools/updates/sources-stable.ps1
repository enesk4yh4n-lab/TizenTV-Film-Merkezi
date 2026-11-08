$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$taskOut=Join-Path $taskRoot 'tools/test-results/stable150'
$stage=Join-Path $taskOut 'stage'
$dest=Join-Path $taskRoot 'updates/sources/Film-Merkezi-Kaynak-1.5.0.zip'
[IO.Directory]::CreateDirectory((Split-Path -Parent $dest))|Out-Null
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream=[IO.File]::Open($dest,[IO.FileMode]::Create)
$zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
function Add-FilmSource([string]$Source,[string]$Name){[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$Source,$Name)|Out-Null}
try {
 $manifest=Get-Content -LiteralPath (Join-Path $stage 'bundled/manifest.json') -Raw | ConvertFrom-Json
 foreach($file in $manifest.files){Add-FilmSource (Join-Path $stage $file.path) ('runtime/'+$file.path)}
 $siteDir=Join-Path $stage 'bundled/sites'
 foreach($file in Get-ChildItem -LiteralPath $siteDir -Recurse -File){Add-FilmSource $file.FullName ('bundled/sites/'+$file.FullName.Substring($siteDir.Length+1).Replace('\','/'))}
 foreach($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'stable') -File){Add-FilmSource $file.FullName ('tools/updates/stable/'+$file.Name)}
 foreach($file in Get-ChildItem -LiteralPath (Join-Path $taskRoot 'tools/plugins/native') -File | Where-Object { $_.Extension -eq '.h' -or $_.Name -in @('secure-http.cpp','ca-bundle.pem') }){Add-FilmSource $file.FullName ('kaynak/ortak/ag/native/'+$file.Name)}
 foreach($file in Get-ChildItem -LiteralPath (Join-Path $taskRoot 'deneme/ortak/ag/native/notices') -File){Add-FilmSource $file.FullName ('kaynak/ortak/ag/native/notices/'+$file.Name)}
 Add-FilmSource (Join-Path $taskOut 'native/build-hashes.json') 'kaynak/ortak/ag/native/build-hashes.json'
 Add-FilmSource (Join-Path $taskRoot 'tools/build-native-http.py') 'tools/build-native-http.py'
 $decoder=Join-Path $taskRoot 'kaynak/siteler/hdfilmcehennemi/decoder-kaynak'
 foreach($file in Get-ChildItem -LiteralPath $decoder -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.git)[\\/]' }){Add-FilmSource $file.FullName ('kaynak/siteler/hdfilmcehennemi/decoder-kaynak/'+$file.FullName.Substring($decoder.Length+1).Replace('\','/'))}
}finally{$zip.Dispose();$stream.Dispose()}
Get-FileHash -LiteralPath $dest -Algorithm SHA256 | Select-Object Path,Hash
