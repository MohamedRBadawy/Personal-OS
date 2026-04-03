$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'

Write-Host '==> Backend checks'
Push-Location $backendDir
python manage.py check
python manage.py test
Pop-Location

Write-Host '==> Frontend checks'
Push-Location $frontendDir
npm.cmd test
npm.cmd run build
npm.cmd run lint
Pop-Location

Write-Host 'Baseline validation passed.'
