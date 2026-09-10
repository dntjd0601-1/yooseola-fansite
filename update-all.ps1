# Fetch latest VOD, gallery, schedule data and rebuild netlify-deploy.
# Used locally and by GitHub Actions.
param(
    [switch]$SkipPack
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host '=== [1/5] VOD data ===' -ForegroundColor Cyan
Write-Host 'Skip: fetch_vod.ps1 still targets the previous streamer. Keep js/vod-data.js.' -ForegroundColor Yellow

Write-Host '=== [2/5] Gallery data ===' -ForegroundColor Cyan
Write-Host 'Skip: gallery is not on the Yuki site.' -ForegroundColor Yellow

Write-Host '=== [3/5] Schedule data ===' -ForegroundColor Cyan
& (Join-Path $root 'fetch_and_parse_schedule.ps1') -ForceRefresh

Write-Host '=== [4/5] Memory playlist data ===' -ForegroundColor Cyan
Write-Host 'Skip: memory playlist is not on the Yuki site.' -ForegroundColor Yellow

if (-not $SkipPack) {
    Write-Host '=== [5/6] Bump data cache versions ===' -ForegroundColor Cyan
    & (Join-Path $root 'bump-data-cache.ps1')

    Write-Host '=== [6/6] Pack netlify-deploy ===' -ForegroundColor Cyan
    & (Join-Path $root 'pack-netlify.ps1')
}

Write-Host 'Done.' -ForegroundColor Green
