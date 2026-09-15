param(
    [string]$OutputFile
)

$ErrorActionPreference = 'SilentlyContinue'

$dir = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { (Get-Location).Path }

function Get-LocalLanIps {
    $list = @()

    try {
        $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*' -and
                $_.PrefixOrigin -ne 'WellKnown'
            }

        foreach ($a in $addrs) {
            $if = Get-NetIPInterface -InterfaceIndex $a.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
            $alias = (Get-NetAdapter -InterfaceIndex $a.InterfaceIndex -ErrorAction SilentlyContinue).Name
            $list += [pscustomobject]@{
                IP        = $a.IPAddress
                Alias     = $alias
                Connected = ($if -and $if.ConnectionState -eq 'Connected')
                Metric    = if ($if) { $if.InterfaceMetric } else { 9999 }
            }
        }
    } catch {}

    if ($list.Count -eq 0) {
        foreach ($line in (ipconfig)) {
            if ($line -match 'IPv4.*?:\s*(\d{1,3}(?:\.\d{1,3}){3})') {
                $candidate = $Matches[1]
                if ($candidate -notlike '127.*' -and $candidate -notlike '169.254.*') {
                    $list += [pscustomobject]@{
                        IP        = $candidate
                        Alias     = ''
                        Connected = $true
                        Metric    = 100
                    }
                }
            }
        }
    }

    # Prefer private LAN, connected adapters, lower metric, Ethernet-like names
    return $list |
        Sort-Object `
            @{ Expression = {
                if ($_.IP -like '192.168.*') { 0 }
                elseif ($_.IP -like '10.*') { 1 }
                elseif ($_.IP -like '172.*') { 2 }
                else { 3 }
            }}, `
            @{ Expression = { if ($_.Connected) { 0 } else { 1 } } }, `
            @{ Expression = {
                $n = [string]$_.Alias
                if ($n -match 'Ethernet|Local Area|LAN') { 0 }
                elseif ($n -match 'Wi-?Fi|Wireless') { 1 }
                else { 2 }
            }}, `
            Metric |
        Select-Object -ExpandProperty IP -Unique
}

function Read-ConfiguredIp {
    $plantimIp = Join-Path $dir 'PLANTIM_SERVER_IP.txt'
    $trenutna = Join-Path $dir 'TRENUTNA_IP_ADRESA.txt'

    if (Test-Path $plantimIp) {
        $raw = (Get-Content $plantimIp -Raw).Trim()
        if ($raw -match '^(\d{1,3}(?:\.\d{1,3}){3})$') {
            return $Matches[1]
        }
    }

    if (Test-Path $trenutna) {
        $t = Get-Content $trenutna -Raw
        if ($t -match '(\d{1,3}(?:\.\d{1,3}){3})') {
            return $Matches[1]
        }
    }

    return $null
}

$localIps = @(Get-LocalLanIps)
$configured = Read-ConfiguredIp
$ip = $null

# Use configured IP only if it belongs to THIS machine (dev laptop vs production server)
if ($configured -and $localIps -contains $configured) {
    $ip = $configured
} elseif ($localIps.Count -gt 0) {
    $ip = $localIps[0]
} elseif ($configured) {
    # Last resort: file value (machine has no usable NIC IP yet)
    $ip = $configured
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
