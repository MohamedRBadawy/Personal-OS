$ErrorActionPreference = 'Stop'

$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
    throw 'Set DATABASE_URL to a PostgreSQL connection string before running scripts\validate_postgres.ps1.'
}

if (-not ($databaseUrl -match '^postgres(ql)?://')) {
    throw "DATABASE_URL must use the postgres:// or postgresql:// scheme. Received: $databaseUrl"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendDir = Join-Path $repoRoot 'backend'

Write-Host '==> PostgreSQL backend parity checks'
Push-Location $backendDir
python manage.py migrate
python manage.py seed_initial_data
python manage.py check
python manage.py test
Pop-Location

Write-Host 'PostgreSQL parity validation passed.'
