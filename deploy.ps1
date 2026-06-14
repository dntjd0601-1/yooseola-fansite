# Deploy helper: fetch data, pack netlify-deploy, open Netlify + folder.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host ''
Write-Host '[1/2] Fetching data and building netlify-deploy...' -ForegroundColor Cyan
& (Join-Path $root 'update-all.ps1')

Write-Host ''
Write-Host '[2/2] Ready!' -ForegroundColor Green
Write-Host ''
Write-Host '========================================' -ForegroundColor Yellow
Write-Host ' Upload netlify-deploy to Netlify Deploys' -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Yellow
Write-Host ''
Write-Host '1. Open https://app.netlify.com'
Write-Host '2. Click your fansite site'
Write-Host '3. Open the Deploys tab'
Write-Host '4. Drag and drop ONLY this folder (not the parent myWebsite folder):'
Write-Host ''
Write-Host "   $(Join-Path $root 'netlify-deploy')" -ForegroundColor White
Write-Host ''
Write-Host '5. After deploy, press Ctrl+F5 on the live site'
Write-Host ''
Write-Host 'IMPORTANT: rolling paper needs this folder in the deploy zip:' -ForegroundColor Yellow
Write-Host '  netlify/functions/rolling-paper/lib/' -ForegroundColor Yellow
Write-Host ''

$deployDir = Join-Path $root 'netlify-deploy'
Start-Process 'https://app.netlify.com'
Start-Process 'explorer.exe' -ArgumentList $deployDir
