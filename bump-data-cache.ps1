# Bump ?v= query strings in index.html so data file updates bypass browser cache.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$htmlTargets = @(
    (Join-Path $root 'index.html'),
    (Join-Path $root 'live-check.html')
)
$dateStamp = (Get-Date).ToUniversalTime().AddHours(9).ToString('yyyyMMdd')

$dataFiles = @(
    @{ path = 'js/schedule-data.js'; mode = 'hash' },
    @{ path = 'js/schedule-overrides.js'; mode = 'hash' },
    @{ path = 'js/gallery-data.js'; mode = 'date' },
    @{ path = 'js/vod-data.js'; mode = 'date' },
    @{ path = 'js/memory-playlist-data.js'; mode = 'date' },
    @{ path = 'js/monthly-seola-data.js'; mode = 'date' }
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

$anyChanged = $false

foreach ($indexPath in $htmlTargets) {
    if (-not (Test-Path $indexPath)) { continue }

    $html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
    $changed = $false

    foreach ($file in $dataFiles) {
        $version = Get-CacheVersion $file.path $file.mode
        $withVersion = "($([regex]::Escape($file.path))\?v=)[^""']+"
        if ($html -match $withVersion) {
            $html = [regex]::Replace($html, $withVersion, "`${1}$version")
            $changed = $true
            Write-Host "$(Split-Path $indexPath -Leaf): $($file.path) -> v=$version" -ForegroundColor DarkGray
        } elseif ($html -match [regex]::Escape($file.path)) {
            $html = [regex]::Replace($html, "($([regex]::Escape($file.path)))(?!\?v=)", "`${1}?v=$version")
            $changed = $true
            Write-Host "$(Split-Path $indexPath -Leaf): $($file.path) -> v=$version (added)" -ForegroundColor DarkGray
        }
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($indexPath, $html, [System.Text.Encoding]::UTF8)
        $anyChanged = $true
    }
}

if ($anyChanged) {
    Write-Host 'Bumped data cache versions in HTML entrypoints' -ForegroundColor Green
} else {
    Write-Host 'No data cache tags found in HTML entrypoints' -ForegroundColor Yellow
}
