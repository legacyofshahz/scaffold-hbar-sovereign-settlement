#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Repository = "legacyofshahz/scaffold-hbar-sovereign-settlement"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "REQUIRED_COMMAND_MISSING=$Name"
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )
    Write-Host ("EXEC=" + $FilePath + " " + ($Arguments -join " "))
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "COMMAND_FAILED=$FilePath EXIT_CODE=$LASTEXITCODE"
    }
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

Assert-Command node
Assert-Command npm
Assert-Command git
Assert-Command gh

$nodeRaw = (& node --version).Trim()
if ($nodeRaw -notmatch '^v(?<version>\d+\.\d+\.\d+)$') {
    throw "NODE_VERSION_UNPARSEABLE=$nodeRaw"
}
$nodeVersion = [version]$Matches.version
if ($nodeVersion -lt [version]'20.18.3') {
    throw "NODE_VERSION_TOO_OLD=$nodeVersion REQUIRED=20.18.3"
}

Invoke-Checked npm @('install', '--no-audit', '--no-fund')
Invoke-Checked npm @('run', 'check')

if (-not (Test-Path (Join-Path $Root 'package-lock.json'))) {
    throw 'PACKAGE_LOCK_MISSING_AFTER_INSTALL'
}

Invoke-Checked gh @('auth', 'status')

if (-not (Test-Path (Join-Path $Root '.git'))) {
    Invoke-Checked git @('init')
}
Invoke-Checked git @('branch', '-M', 'main')
Invoke-Checked git @('add', '--all')

$trackedEnv = (& git ls-files) | Where-Object { $_ -match '(^|/)\.env($|\.)' -and $_ -notmatch '\.env\.example$' }
if ($trackedEnv) {
    throw ("TRACKED_SECRET_FILE=" + ($trackedEnv -join ','))
}

$changes = (& git status --porcelain)
if ($changes) {
    $userName = [string](& git config user.name)
    $userEmail = [string](& git config user.email)
    $userName = $userName.Trim()
    $userEmail = $userEmail.Trim()
    if (-not $userName -or -not $userEmail) {
        throw 'GIT_IDENTITY_REQUIRED configure user.name and user.email locally before publishing'
    }
    Invoke-Checked git @('commit', '-m', 'feat: oracle-guarded sovereign settlement template')
}

$repoExists = $true
& gh repo view $Repository '--json' 'nameWithOwner' *> $null
if ($LASTEXITCODE -ne 0) { $repoExists = $false }

if (-not $repoExists) {
    Invoke-Checked gh @('repo', 'create', $Repository, '--public', '--source', '.', '--remote', 'origin', '--push')
} else {
    $origin = (& git remote get-url origin 2>$null)
    if (-not $origin) {
        Invoke-Checked git @('remote', 'add', 'origin', "https://github.com/$Repository.git")
    }
    Invoke-Checked git @('push', '-u', 'origin', 'main')
}

Write-Host "LOCAL_GATE=PASS"
Write-Host "PUBLIC_REPOSITORY=https://github.com/$Repository"
Write-Host "NEXT_GATE=GitHub Actions Eligibility Gate + External Scaffold Proof"
