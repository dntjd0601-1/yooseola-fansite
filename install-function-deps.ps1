# Netlify Drop 배포용 — npm 없이 Blobs 라이브러리를 function/lib 에 넣습니다.
param(
    [Parameter(Mandatory = $true)]
    [string]$FnDir
)

$ErrorActionPreference = 'Stop'
$version = '8.1.0'
$base = "https://unpkg.com/@netlify/blobs@$version"
$libDir = Join-Path $FnDir 'lib'

New-Item -ItemType Directory -Path $libDir -Force | Out-Null

$files = @(
    @{ Url = "$base/dist/main.js"; Out = Join-Path $libDir 'main.js' },
    @{ Url = "$base/dist/server.js"; Out = Join-Path $libDir 'server.js' },
    @{ Url = "$base/dist/chunk-GUEW34CP.js"; Out = Join-Path $libDir 'chunk-GUEW34CP.js' }
)

foreach ($file in $files) {
    curl.exe -sL $file.Url -o $file.Out
    if (-not (Test-Path $file.Out) -or (Get-Item $file.Out).Length -lt 100) {
        throw "Failed to download $($file.Url)"
    }
}

Write-Host "OK: function lib installed in $libDir" -ForegroundColor Green
