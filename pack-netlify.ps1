$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$out = Join-Path $root 'netlify-deploy'

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $out 'css'), (Join-Path $out 'js'), (Join-Path $out 'images') -Force | Out-Null

Copy-Item (Join-Path $root 'index.html') $out
Copy-Item (Join-Path $root 'netlify.toml') $out
Copy-Item (Join-Path $root 'css\style.css') (Join-Path $out 'css')
Copy-Item (Join-Path $root 'js\*.js') (Join-Path $out 'js')
$imagesDir = Join-Path $root 'images'
if (Test-Path $imagesDir) {
    Copy-Item (Join-Path $imagesDir '*') (Join-Path $out 'images') -ErrorAction SilentlyContinue
}

Write-Host 'OK: netlify-deploy folder is ready.' -ForegroundColor Green
Write-Host $out -ForegroundColor Cyan
