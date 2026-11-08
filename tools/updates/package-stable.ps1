param([string]$SignedArtifact='')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$taskOut=Join-Path $taskRoot 'tools/test-results/stable150'
$taskStage=Join-Path $taskOut 'stage'
$taskNames=Get-Content -LiteralPath (Join-Path $taskOut 'package-files.json') -Raw | ConvertFrom-Json
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$target=Join-Path $taskRoot 'Film-Merkezi-TV-1.5.0-public.wgt'
$stream=[IO.File]::Open($target,[IO.FileMode]::Create)
$archive=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try {foreach($entry in $taskNames){if($entry -match '(^tools/|signature.*\.xml$|author-signature\.xml$)'){throw 'Invalid public package entry'};[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $taskStage $entry),$entry)|Out-Null}}finally{$archive.Dispose();$stream.Dispose()}
if($SignedArtifact){Copy-Item -LiteralPath $SignedArtifact -Destination (Join-Path $taskRoot 'Film-Merkezi-TV-1.5.0.wgt')}
Get-FileHash -Algorithm SHA256 -LiteralPath $target | Select-Object Path,Hash
