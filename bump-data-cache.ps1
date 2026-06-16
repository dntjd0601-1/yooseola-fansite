# Bump ?v= query strings in index.html so data file updates bypass browser cache.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$indexPath = Join-Path $root 'index.html'
$stamp = (Get-Date).ToUniversalTime().AddHours(9).ToString('yyyyMMdd')

$dataFiles = @(
    'js/schedule-data.js',
    'js/gallery-data.js',
    'js/vod-data.js',
    'js/memory-playlist-data.js'
)

$html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
$changed = $false

foreach ($file in $dataFiles) {
    $pattern = "($([regex]::Escape($file))\?v=)\d+"
    if ($html -match $pattern) {
        $html = [regex]::Replace($html, $pattern, "`${1}$stamp")
        $changed = $true
    }
}

if ($changed) {
    [System.IO.File]::WriteAllText($indexPath, $html, [System.Text.Encoding]::UTF8)
    Write-Host "Bumped data cache versions to $stamp" -ForegroundColor Green
} else {
    Write-Host 'No data cache tags found in index.html' -ForegroundColor Yellow
}
