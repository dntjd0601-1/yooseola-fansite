$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$out = Join-Path $root 'netlify-deploy'

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $out 'css'), (Join-Path $out 'js'), (Join-Path $out 'images') -Force | Out-Null

Copy-Item (Join-Path $root 'index.html') $out
Copy-Item (Join-Path $root 'netlify.toml') $out
if (Test-Path (Join-Path $root 'schedule-overrides.json')) {
    Copy-Item (Join-Path $root 'schedule-overrides.json') $out
}
& (Join-Path $root 'build-schedule-overrides-js.ps1')
Copy-Item (Join-Path $root 'css/style.css') (Join-Path $out 'css')
Copy-Item (Join-Path $root 'js/*.js') (Join-Path $out 'js')
$vendorDir = Join-Path $root 'js/vendor'
if (Test-Path $vendorDir) {
    New-Item -ItemType Directory -Path (Join-Path $out 'js/vendor') -Force | Out-Null
    Copy-Item (Join-Path $vendorDir '*') (Join-Path $out 'js/vendor')
}
$imagesDir = Join-Path $root 'images'
$gamesDir = Join-Path $root 'games'
if (Test-Path $gamesDir) {
    New-Item -ItemType Directory -Path (Join-Path $out 'games') -Force | Out-Null
    Copy-Item (Join-Path $gamesDir '*') (Join-Path $out 'games') -Recurse -Force
}

if (Test-Path $imagesDir) {
    $destImages = Join-Path $out 'images'
    Get-ChildItem -Path $imagesDir | Copy-Item -Destination $destImages -Recurse -Force
}
$fnDir = Join-Path $root 'netlify/functions'
if (Test-Path $fnDir) {
    $destFn = Join-Path $out 'netlify/functions'
    New-Item -ItemType Directory -Path $destFn -Force | Out-Null
    Get-ChildItem -Path $fnDir -Exclude 'node_modules','admin-config.mjs' | Copy-Item -Destination $destFn -Recurse -Force
    $rpDir = Join-Path $destFn 'rolling-paper'
    if (Test-Path $rpDir) {
        & (Join-Path $root 'install-function-deps.ps1') -FnDir $rpDir
        $adminCfg = Join-Path $rpDir 'admin-config.mjs'
        if (Test-Path $adminCfg) {
            Remove-Item $adminCfg -Force
            Write-Warning 'Removed admin-config.mjs from deploy bundle. Use ROLLING_PAPER_ADMIN_KEY env var on Netlify.'
        }
    }
}

New-Item -ItemType File -Path (Join-Path $out '.nojekyll') -Force | Out-Null

Write-Host 'OK: netlify-deploy folder is ready.' -ForegroundColor Green
Write-Host $out -ForegroundColor Cyan
