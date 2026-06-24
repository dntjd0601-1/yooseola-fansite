$ErrorActionPreference = 'Stop'
$port = 8765
$root = $PSScriptRoot
$url = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

function Get-MimeType([string]$path) {
    switch ([System.IO.Path]::GetExtension($path).ToLower()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.css'  { return 'text/css; charset=utf-8' }
        '.js'   { return 'application/javascript; charset=utf-8' }
        '.json' { return 'application/json; charset=utf-8' }
        '.png'  { return 'image/png' }
        '.jpg'  { return 'image/jpeg' }
        '.jpeg' { return 'image/jpeg' }
        '.webp' { return 'image/webp' }
        '.svg'  { return 'image/svg+xml' }
        '.ico'  { return 'image/x-icon' }
        '.swf'  { return 'application/x-shockwave-flash' }
        default { return 'application/octet-stream' }
    }
}

Write-Host ''
Write-Host '유설아 팬사이트 로컬 서버' -ForegroundColor Cyan
Write-Host "주소: $url"
Write-Host '종료: 이 창에서 Ctrl+C' -ForegroundColor DarkGray
Write-Host ''

Start-Process $url

while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
        $localPath = $context.Request.Url.LocalPath
        if ($localPath -eq '/') { $localPath = '/index.html' }

        $relative = $localPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        $filePath = Join-Path $root $relative

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $context.Response.StatusCode = 200
            $context.Response.ContentType = Get-MimeType $filePath
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $context.Response.StatusCode = 404
            $msg = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $context.Response.OutputStream.Write($msg, 0, $msg.Length)
        }
    } finally {
        $context.Response.Close()
    }
}
