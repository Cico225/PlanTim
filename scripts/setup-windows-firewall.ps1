# Potrebne administratorske privilegije
$ErrorActionPreference = 'Stop'

Write-Host 'PlanTim - Windows Firewall pravila' -ForegroundColor Cyan

# HTTPS ulaz
$ruleHttps = Get-NetFirewallRule -DisplayName 'PlanTim HTTPS (443)' -ErrorAction SilentlyContinue
if (-not $ruleHttps) {
    New-NetFirewallRule -DisplayName 'PlanTim HTTPS (443)' -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow | Out-Null
    Write-Host 'Dodano: PlanTim HTTPS (443)' -ForegroundColor Green
} else {
    Write-Host 'Vec postoji: PlanTim HTTPS (443)' -ForegroundColor Yellow
}

# HTTP ulaz (redirect na HTTPS)
$ruleHttp = Get-NetFirewallRule -DisplayName 'PlanTim HTTP (80)' -ErrorAction SilentlyContinue
if (-not $ruleHttp) {
    New-NetFirewallRule -DisplayName 'PlanTim HTTP (80)' -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow | Out-Null
    Write-Host 'Dodano: PlanTim HTTP (80)' -ForegroundColor Green
} else {
    Write-Host 'Vec postoji: PlanTim HTTP (80)' -ForegroundColor Yellow
}

# Blokiraj Vite dev port javno
$ruleVite = Get-NetFirewallRule -DisplayName 'PlanTim Block Vite 5173' -ErrorAction SilentlyContinue
if (-not $ruleVite) {
    New-NetFirewallRule -DisplayName 'PlanTim Block Vite 5173' -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Block | Out-Null
    Write-Host 'Dodano: blokada porta 5173' -ForegroundColor Green
} else {
    Write-Host 'Vec postoji: blokada porta 5173' -ForegroundColor Yellow
}

Write-Host 'Firewall konfiguracija zavrsena.' -ForegroundColor Cyan
