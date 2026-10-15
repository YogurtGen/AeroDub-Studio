param([string] $AppSource, [string] $ReleaseTag = 'v0.5.2-preview.1')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$metadata = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
if (-not $AppSource) { $AppSource = Join-Path $projectRoot ('dist\' + $metadata.version + '\win-unpacked') }
$appSource = (Resolve-Path -LiteralPath $AppSource).Path
$appExe = Join-Path $appSource 'AeroDub Studio.exe'
if (-not (Test-Path -LiteralPath $appExe)) { throw 'Run npm run build:win first.' }
if ((Get-Item -LiteralPath $appExe).VersionInfo.FileVersion -ne $metadata.version) { throw 'Folder build version does not match package.json.' }

$taskTools = Join-Path $projectRoot 'test-output\build-tools'
$compilerDir = Join-Path $taskTools 'inno-7.1.0'
$compiler = Join-Path $compilerDir 'ISCC.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    New-Item -ItemType Directory -Force -Path $taskTools | Out-Null
    $compilerSetup = Join-Path $taskTools 'innosetup-7.1.0-x64.exe'
    Invoke-WebRequest -Uri 'https://github.com/jrsoftware/issrc/releases/download/is-7_1_0/innosetup-7.1.0-x64.exe' -OutFile $compilerSetup
    $expected = '0362A383ED217D4C4239B5933866DD96D3EB2102737DA92F80F6057A4B40DF2F'
    $signature = Get-AuthenticodeSignature -LiteralPath $compilerSetup
    if ((Get-FileHash -LiteralPath $compilerSetup -Algorithm SHA256).Hash -ne $expected -or $signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Pyrsys') { throw 'Compiler download verification failed.' }
    $toolArgs = @('/PORTABLE=1', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', ('/DIR="' + $compilerDir + '"'))
    $toolProcess = Start-Process -FilePath $compilerSetup -ArgumentList $toolArgs -WindowStyle Hidden -Wait -PassThru
    if ($toolProcess.ExitCode -ne 0) { throw 'Portable compiler preparation failed.' }
}
$compilerSignature = Get-AuthenticodeSignature -LiteralPath $compiler
if ($compilerSignature.Status -ne 'Valid' -or $compilerSignature.SignerCertificate.Subject -notmatch 'Pyrsys') { throw 'Compiler signature verification failed.' }

Push-Location $projectRoot
$previousPackageDir = $env:AERODUB_PACKAGE_DIR
try {
    $env:AERODUB_PACKAGE_DIR = $appSource
    & node 'tests/verify-package.js'
    if ($LASTEXITCODE -ne 0) { throw 'Folder build validation failed.' }
    $setupOutput = Join-Path $projectRoot ('dist\setup-' + $metadata.version)
    $compilerArgs = @('--quiet-progress', ('--define=AppVersion=' + $metadata.version), ('--define=AppSource=' + $appSource), ('--define=SetupOutput=' + $setupOutput), ('--define=CompilerDir=' + $compilerDir), (Join-Path $projectRoot 'installer\aerodub.iss'))
    & $compiler @compilerArgs
    if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
    Copy-Item -LiteralPath (Join-Path $projectRoot 'installer\README-INSTALL.txt') -Destination $setupOutput -Force
    $hashLines = @(Get-ChildItem -LiteralPath $setupOutput -File | Where-Object { $_.Extension -in '.exe', '.bin' } | Sort-Object Name | Get-FileHash -Algorithm SHA256 | ForEach-Object { $_.Hash.ToLowerInvariant() + '  ' + (Split-Path -Leaf $_.Path) })
    [System.IO.File]::WriteAllLines((Join-Path $setupOutput 'SHA256SUMS.txt'), [string[]] $hashLines, (New-Object System.Text.UTF8Encoding $false))
    & node 'scripts/build-download-setup.js' $setupOutput $compiler $ReleaseTag
    if ($LASTEXITCODE -ne 0) { throw 'Download installer compilation failed.' }
    Write-Output ('Setup files: ' + $setupOutput)
} finally { $env:AERODUB_PACKAGE_DIR = $previousPackageDir; Pop-Location }
