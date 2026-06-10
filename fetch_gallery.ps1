$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$items = @()
$seen = @{}

function Escape-Js([string]$text) {
    if (-not $text) { return '' }
    return $text.Replace('\', '\\').Replace("'", "\'").Replace("`r", '').Replace("`n", ' ')
}

function Add-Item([string]$src, [string]$caption, [string]$source, [string]$url) {
    if (-not $src -or $seen.ContainsKey($src)) { return }
    if ($src -match '\.gif($|\?)') { return }
    $seen[$src] = $true
    $script:items += ,@{
        src = $src
        caption = $caption
        source = $source
        url = $url
    }
}

# Naver cafe fan art board (menu 22)
$cafePath = Join-Path $root 'cafe_fanart.json'
curl.exe -s -H "Referer: https://cafe.naver.com/yoonanana" "https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/31396984/menus/22/articles?page=1&pageSize=24" -o $cafePath | Out-Null
$cafe = Get-Content $cafePath -Encoding UTF8 -Raw | ConvertFrom-Json
foreach ($row in $cafe.result.articleList) {
    $it = $row.item
    if (-not $it.hasImage) { continue }
    if ($it.representImageType -ne 'I') { continue }
    $img = [uri]::UnescapeDataString($it.representImage)
    $subject = $it.subject
    $link = "https://cafe.naver.com/yoonanana/$($it.articleId)"
    Add-Item $img $subject 'fan-cafe' $link
    if ($items.Count -ge 12) { break }
}

# v-company gallery - yeveee (Seola) solo
$vPath = Join-Path $root 'vcompany_yeveee.json'
curl.exe -s "https://v-company.xyz/api/gallery?member_id=yeveee&limit=20" -o $vPath | Out-Null
$vjson = Get-Content $vPath -Encoding UTF8 -Raw | ConvertFrom-Json
foreach ($row in $vjson.data) {
    if ($row.member_id -ne 'yeveee') { continue }
    if ($row.image_type -match 'gif') { continue }
    Add-Item $row.image_url 'Seola' 'v-company' 'https://v-company.xyz/gallery'
    if ($items.Count -ge 20) { break }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('/**')
[void]$sb.AppendLine(' * Gallery data')
[void]$sb.AppendLine(' * Regenerate: powershell -File fetch_gallery.ps1')
[void]$sb.AppendLine(' */')
[void]$sb.AppendLine('const GALLERY_DATA = [')
foreach ($it in $items) {
    [void]$sb.AppendLine("  { src: '$(Escape-Js $it.src)', caption: '$(Escape-Js $it.caption)', source: '$(Escape-Js $it.source)', url: '$(Escape-Js $it.url)' },")
}
[void]$sb.AppendLine('];')

$out = Join-Path $root 'js\gallery-data.js'
[System.IO.File]::WriteAllText($out, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Wrote $($items.Count) gallery items"
