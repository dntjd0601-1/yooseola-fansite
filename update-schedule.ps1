# Fetch schedule only, bump cache, pack for deploy.
param(
    [switch]$SkipPack
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

& "$PSScriptRoot\fetch_and_parse_schedule.ps1" -ForceRefresh
& "$PSScriptRoot\bump-data-cache.ps1"

if (-not $SkipPack) {
    & "$PSScriptRoot\pack-netlify.ps1"
}

Write-Host 'Schedule update complete.' -ForegroundColor Green
