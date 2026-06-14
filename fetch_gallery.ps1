$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$items = @()
$seen = @{}

$MaxCafe = 80
$MaxVCompany = 150
$CafePages = 5
$CafePageSize = 50

function Escape-Js([string]$text) {
    if (-not $text) { return '' }
    return $text.Replace('\', '\\').Replace("'", "\'").Replace("`r", '').Replace("`n", ' ')
}

function Add-Item([string]$src, [string]$caption, [string]$source, [string]$url) {
    if (-not $src -or $seen.ContainsKey($src)) { return $false }
    if ($src -match '\.gif($|\?)') { return $false }
    $seen[$src] = $true
    $script:items += ,@{
        src = $src
        caption = $caption
        source = $source
        url = $url
    }
    return $true
}

# Naver cafe fan art board (menu 22) — multiple pages
$cafeCount = 0
for ($page = 1; $page -le $CafePages; $page++) {
    if ($cafeCount -ge $MaxCafe) { break }
    $cafePath = Join-Path $root "cafe_fanart_p$page.json"
    curl.exe -s -H "Referer: https://cafe.naver.com/yoonanana" `
        "https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/31396984/menus/22/articles?page=$page&pageSize=$CafePageSize" `
        -o $cafePath | Out-Null
    if (-not (Test-Path $cafePath)) { continue }
    $cafe = Get-Content $cafePath -Encoding UTF8 -Raw | ConvertFrom-Json
    if (-not $cafe.result.articleList) { continue }

    foreach ($row in $cafe.result.articleList) {
        if ($cafeCount -ge $MaxCafe) { break }
        $it = $row.item
        if (-not $it.hasImage) { continue }
        if ($it.representImageType -notin @('I', 'M')) { continue }
        $img = [uri]::UnescapeDataString($it.representImage)
        $subject = $it.subject
        $link = "https://cafe.naver.com/yoonanana/$($it.articleId)"
        if (Add-Item $img $subject 'fan-cafe' $link) {
            $cafeCount++
        }
    }
    Start-Sleep -Milliseconds 200
}

# v-company gallery — yeveee (Seola) solo
$vCount = 0
$offset = 0
$batch = 100
while ($vCount -lt $MaxVCompany) {
    $vPath = Join-Path $root "vcompany_yeveee_$offset.json"
    curl.exe -s "https://v-company.xyz/api/gallery?member_id=yeveee&limit=$batch&offset=$offset" -o $vPath | Out-Null
    if (-not (Test-Path $vPath)) { break }
    $vjson = Get-Content $vPath -Encoding UTF8 -Raw | ConvertFrom-Json
    if (-not $vjson.data -or $vjson.data.Count -eq 0) { break }

    $added = 0
    foreach ($row in $vjson.data) {
        if ($vCount -ge $MaxVCompany) { break }
        if ($row.member_id -ne 'yeveee') { continue }
        if ($row.image_type -match 'gif') { continue }
        if ($row.image_url -match '\.gif($|\?)') { continue }
        $caption = if ($row.artist) { $row.artist } else { 'Seola' }
        if (Add-Item $row.image_url $caption 'v-company' 'https://v-company.xyz/gallery') {
            $vCount++
            $added++
        }
    }

    if ($vjson.data.Count -lt $batch -or $added -eq 0) { break }
    $offset += $batch
    Start-Sleep -Milliseconds 150
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
Write-Output "Wrote $($items.Count) gallery items (cafe=$cafeCount, v-company=$vCount)"
