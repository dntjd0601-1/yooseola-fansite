# Fetch latest VOD, gallery, schedule data and rebuild netlify-deploy.
# Used locally and by GitHub Actions.
param(
    [switch]$SkipPack
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host '=== [1/4] VOD data ===' -ForegroundColor Cyan
& (Join-Path $root 'fetch_vod.ps1')

Write-Host '=== [2/4] Gallery data ===' -ForegroundColor Cyan
& (Join-Path $root 'fetch_gallery.ps1')

Write-Host '=== [3/4] Schedule data ===' -ForegroundColor Cyan
try {
    & (Join-Path $root 'fetch_and_parse_schedule.ps1') -ForceRefresh
} catch {
    Write-Warning "Schedule fetch failed, keeping existing schedule-data.js: $($_.Exception.Message)"
}

if (-not $SkipPack) {
    Write-Host '=== [4/4] Pack netlify-deploy ===' -ForegroundColor Cyan
    & (Join-Path $root 'pack-netlify.ps1')
}

Write-Host 'Done.' -ForegroundColor Green
