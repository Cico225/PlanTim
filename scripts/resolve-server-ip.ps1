param(
    [string]$OutputFile
)

$ErrorActionPreference = 'SilentlyContinue'

$dir = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { Get-Location }
$ip = $null

$plantimIp = Join-Path $dir 'PLANTIM_SERVER_IP.txt'
$trenutna = Join-Path $dir 'TRENUTNA_IP_ADRESA.txt'

if (Test-Path $plantimIp) {
    $ip = (Get-Content $plantimIp -Raw).Trim()
}

if (-not $ip -and (Test-Path $trenutna)) {
    $t = Get-Content $trenutna -Raw
    if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') {
        $ip = $Matches[1]
    }
}

if (-not $ip) {
    $ip = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '127.*' } |
        Select-Object -First 1 -ExpandProperty IPAddress
}

if (-not $ip) {
    $line = ipconfig | Select-String 'IPv4' | Select-Object -First 1
    if ($line -match '(\d{1,3}(?:\.\d{1,3}){3})') {
        $ip = $Matches[1]
    }
}

if ($OutputFile) {
    if ($ip) {
        [System.IO.File]::WriteAllText($OutputFile, $ip)
        exit 0
    }
    exit 1
}

if ($ip) {
    Write-Output $ip
    exit 0
}

exit 1
