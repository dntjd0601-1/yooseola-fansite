$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$out = Join-Path $root 'netlify-deploy'

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $out 'css'), (Join-Path $out 'js'), (Join-Path $out 'images') -Force | Out-Null

Copy-Item (Join-Path $root 'index.html') $out
Copy-Item (Join-Path $root 'netlify.toml') $out
Copy-Item (Join-Path $root 'css/style.css') (Join-Path $out 'css')
Copy-Item (Join-Path $root 'js/*.js') (Join-Path $out 'js')
$vendorDir = Join-Path $root 'js/vendor'
if (Test-Path $vendorDir) {
    New-Item -ItemType Directory -Path (Join-Path $out 'js/vendor') -Force | Out-Null
    Copy-Item (Join-Path $vendorDir '*') (Join-Path $out 'js/vendor')
}
$imagesDir = Join-Path $root 'images'
if (Test-Path $imagesDir) {
    $destImages = Join-Path $out 'images'
    Get-ChildItem -Path $imagesDir | Copy-Item -Destination $destImages -Recurse -Force
}
$fnDir = Join-Path $root 'netlify/functions'
if (Test-Path $fnDir) {
    $destFn = Join-Path $out 'netlify/functions'
    New-Item -ItemType Directory -Path $destFn -Force | Out-Null
    Get-ChildItem -Path $fnDir -Exclude 'node_modules' | Copy-Item -Destination $destFn -Recurse -Force
    $rpDir = Join-Path $destFn 'rolling-paper'
    if (Test-Path $rpDir) {
        & (Join-Path $root 'install-function-deps.ps1') -FnDir $rpDir
        $adminCfg = Join-Path $root 'netlify/functions/rolling-paper/admin-config.mjs'
        $adminExample = Join-Path $root 'netlify/functions/rolling-paper/admin-config.example.mjs'
        if (-not (Test-Path $adminCfg) -and (Test-Path $adminExample)) {
            Copy-Item $adminExample $adminCfg
            Write-Warning 'admin-config.mjs created — set ADMIN_KEY before using admin login.'
        }
    }
}

New-Item -ItemType File -Path (Join-Path $out '.nojekyll') -Force | Out-Null

Write-Host 'OK: netlify-deploy folder is ready.' -ForegroundColor Green
Write-Host $out -ForegroundColor Cyan
