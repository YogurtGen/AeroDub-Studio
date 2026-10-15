param([string] $GitHubCli, [string] $ReleaseDirectory)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$metadata = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
if (-not $ReleaseDirectory) { $ReleaseDirectory = Join-Path $projectRoot ('dist\setup-' + $metadata.version) }
$manifestPath = Join-Path $ReleaseDirectory 'release-manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$repository = 'YogurtGen/AeroDub-Studio'
if ($manifest.repository -ne $repository -or $manifest.version -ne $metadata.version -or $manifest.tag -ne ('v' + $metadata.version + '-preview.1')) { throw 'Unexpected release manifest. Rebuild the intended preview before publishing.' }
if (-not $GitHubCli) {
    $available = Get-Command gh -ErrorAction SilentlyContinue
    if ($available) { $GitHubCli = $available.Source }
    else { $GitHubCli = Join-Path $projectRoot 'test-output\build-tools\github-cli\bin\gh.exe' }
}
if (-not (Test-Path -LiteralPath $GitHubCli)) { throw 'Install the official GitHub CLI, then run gh auth login.' }
& $GitHubCli auth status
if ($LASTEXITCODE -ne 0) { throw ('GitHub sign-in is required. Run: & "' + $GitHubCli + '" auth login --hostname github.com --web') }

$assetPaths = @()
foreach ($asset in $manifest.assets) {
    if ($asset.name -notmatch '^[A-Za-z0-9_.-]+$' -or $asset.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Invalid release asset metadata.' }
    $assetPath = Join-Path $ReleaseDirectory $asset.name
    if ((Get-Item -LiteralPath $assetPath).Length -ne $asset.size -or (Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $asset.sha256) { throw ('Release asset changed: ' + $asset.name) }
    $assetPaths += $assetPath
}
$assetPaths += $manifestPath
$assetPaths += Join-Path $ReleaseDirectory 'SHA256SUMS.txt'
$verificationAssets = @($manifest.assets)
foreach ($extraPath in @($manifestPath, (Join-Path $ReleaseDirectory 'SHA256SUMS.txt'))) {
    $verificationAssets += [pscustomobject]@{ name = (Split-Path -Leaf $extraPath); size = (Get-Item -LiteralPath $extraPath).Length; sha256 = (Get-FileHash -LiteralPath $extraPath -Algorithm SHA256).Hash.ToLowerInvariant() }
}

function Invoke-Git {
    & git @args
    if ($LASTEXITCODE -ne 0) { throw ('Git failed: ' + ($args -join ' ')) }
}

Push-Location $projectRoot
try {
    & $GitHubCli auth setup-git --hostname github.com
    if ($LASTEXITCODE -ne 0) { throw 'Could not configure GitHub authentication for Git.' }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.git'))) { Invoke-Git init -b main }
    $origin = & git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0) { Invoke-Git remote add origin ('https://github.com/' + $repository + '.git') }
    elseif ($origin -notin @(('https://github.com/' + $repository + '.git'), ('git@github.com:' + $repository + '.git'))) { throw 'The existing origin points to another repository.' }
    $branch = & git branch --show-current
    if ($branch -ne 'main') { throw 'Switch to the intended main branch before publishing.' }
    $authorOptions = @()
    & git var GIT_AUTHOR_IDENT *> $null
    if ($LASTEXITCODE -ne 0) {
        $account = & $GitHubCli api user | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0 -or $account.login -notmatch '^[A-Za-z0-9-]+$' -or $account.id -le 0) { throw 'Could not determine the signed-in GitHub author.' }
        $authorOptions = @('-c', ('user.name=' + $account.login), '-c', ('user.email=' + $account.id + '+' + $account.login + '@users.noreply.github.com'))
    }
    Invoke-Git add -- src scripts tests docs installer .gitignore DESIGN.md LICENSE package.json package-lock.json README.md RELEASE_NOTES.md THIRD_PARTY_NOTICES.md
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) { Invoke-Git @authorOptions commit -m ('Release AeroDub Studio ' + $metadata.version + ' preview') }
    elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged source.' }
    Invoke-Git push -u origin main
    $commit = & git rev-parse HEAD

    $existing = & $GitHubCli release view $manifest.tag --repo $repository --json isDraft 2>$null
    if ($LASTEXITCODE -eq 0) {
        if (-not ($existing | ConvertFrom-Json).isDraft) { throw 'The release is already public. Published assets will not be replaced.' }
        & $GitHubCli release edit $manifest.tag --repo $repository --target $commit --notes-file (Join-Path $ReleaseDirectory 'RELEASE_NOTES.md')
        if ($LASTEXITCODE -ne 0) { throw 'Could not update the draft target and notes.' }
    } else {
        & $GitHubCli release create $manifest.tag --repo $repository --target $commit --draft --prerelease --title ('AeroDub Studio ' + $metadata.version + ' preview') --notes-file (Join-Path $ReleaseDirectory 'RELEASE_NOTES.md')
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the draft release.' }
    }
    foreach ($assetPath in $assetPaths) {
        & $GitHubCli release upload $manifest.tag $assetPath --repo $repository --clobber
        if ($LASTEXITCODE -ne 0) { throw 'Upload failed. The release remains a draft; rerun to retry.' }
    }
    $release = & $GitHubCli api ('repos/' + $repository + '/releases/tags/' + $manifest.tag) | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Could not verify uploaded release assets.' }
    foreach ($asset in $verificationAssets) {
        $remote = @($release.assets | Where-Object name -EQ $asset.name)
        if ($remote.Count -ne 1 -or $remote[0].size -ne $asset.size -or $remote[0].digest -ne ('sha256:' + $asset.sha256)) { throw ('Uploaded asset verification failed: ' + $asset.name + '. Release remains a draft.') }
    }
    & $GitHubCli release edit $manifest.tag --repo $repository --draft=false --prerelease
    if ($LASTEXITCODE -ne 0) { throw 'Assets are uploaded, but publishing failed. The draft is retained.' }
    Write-Output ('Published: https://github.com/' + $repository + '/releases/tag/' + $manifest.tag)
} finally { Pop-Location }
