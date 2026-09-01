# PlanTim — interna mreza: HTTPS Vite (5173) + Laravel (8000)
# Pokrenite kao Administrator

$ErrorActionPreference = 'Stop'

Write-Host 'PlanTim - Firewall (interni HTTPS :5173)' -ForegroundColor Cyan

$blockRule = Get-NetFirewallRule -DisplayName 'PlanTim Block Vite 5173' -ErrorAction SilentlyContinue
if ($blockRule) {
    Remove-NetFirewallRule -DisplayName 'PlanTim Block Vite 5173'
    Write-Host 'Uklonjeno: blokada porta 5173' -ForegroundColor Yellow
}

foreach ($port in @(5173, 8000)) {
    $name = "PlanTim Internal ($port)"
    $rule = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
    if (-not $rule) {
        New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
        Write-Host "Dodano: $name" -ForegroundColor Green
    } else {
        Write-Host "Vec postoji: $name" -ForegroundColor Yellow
    }
}

Write-Host 'Firewall konfiguracija zavrsena.' -ForegroundColor Cyan
