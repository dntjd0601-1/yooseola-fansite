# Bump ?v= query strings in index.html so data file updates bypass browser cache.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$indexPath = Join-Path $root 'index.html'
$dateStamp = (Get-Date).ToUniversalTime().AddHours(9).ToString('yyyyMMdd')

$dataFiles = @(
    @{ path = 'js/schedule-data.js'; mode = 'hash' },
    @{ path = 'js/gallery-data.js'; mode = 'date' },
    @{ path = 'js/vod-data.js'; mode = 'date' },
    @{ path = 'js/memory-playlist-data.js'; mode = 'date' }
)

function Get-CacheVersion([string]$relativePath, [string]$mode) {
    $fullPath = Join-Path $root ($relativePath -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path $fullPath)) {
        return $dateStamp
    }

    if ($mode -eq 'hash') {
        $hash = (Get-FileHash -Path $fullPath -Algorithm MD5).Hash.Substring(0, 8).ToLower()
        return $hash
    }

    return $dateStamp
}

$html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
$changed = $false

foreach ($file in $dataFiles) {
    $version = Get-CacheVersion $file.path $file.mode
    $pattern = "($([regex]::Escape($file.path))\?v=)[^""']+"
    if ($html -match $pattern) {
        $html = [regex]::Replace($html, $pattern, "`${1}$version")
        $changed = $true
        Write-Host "$($file.path) -> v=$version" -ForegroundColor DarkGray
    }
}

if ($changed) {
    [System.IO.File]::WriteAllText($indexPath, $html, [System.Text.Encoding]::UTF8)
    Write-Host 'Bumped data cache versions in index.html' -ForegroundColor Green
} else {
    Write-Host 'No data cache tags found in index.html' -ForegroundColor Yellow
}
