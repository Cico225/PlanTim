param(
    [Parameter(Mandatory = $true)]
    [string]$ServerIp
)

$ErrorActionPreference = 'Stop'
$front = "https://$ServerIp`:5173"
$sanctum = "$ServerIp,$ServerIp`:5173,localhost,localhost:5173,127.0.0.1,127.0.0.1:5173"

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
if (-not (Test-Path $envPath)) {
    Write-Error ".env ne postoji: $envPath"
    exit 1
}

$c = Get-Content $envPath
$c = $c -replace '^APP_URL=.*', "APP_URL=$front"
$c = $c -replace '^FRONTEND_URL=.*', "FRONTEND_URL=$front"
$c = $c -replace '^SANCTUM_STATEFUL_DOMAINS=.*', "SANCTUM_STATEFUL_DOMAINS=$sanctum"
$c = $c -replace '^CORS_ALLOWED_ORIGINS=.*', "CORS_ALLOWED_ORIGINS=$front"
$c = $c -replace '^SESSION_SECURE_COOKIE=.*', 'SESSION_SECURE_COOKIE=true'

if ($c -notmatch '^SESSION_DOMAIN=') {
    $c += 'SESSION_DOMAIN='
} else {
    $c = $c -replace '^SESSION_DOMAIN=.*', 'SESSION_DOMAIN='
}

Set-Content $envPath $c -Encoding UTF8
exit 0
