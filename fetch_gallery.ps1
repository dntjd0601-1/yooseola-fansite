$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$items = @()
$seen = @{}

$MaxCafe = 80
$MaxVCompany = 150
$CafePages = 5
$CafePageSize = 50
$CafeReferer = 'https://cafe.naver.com/yoonanana'
$ArticleApi = 'https://apis.naver.com/cafe-web/cafe-articleapi/cafes/31396984/articles'

function Escape-Js([string]$text) {
    if (-not $text) { return '' }
    return $text.Replace('\', '\\').Replace("'", "\'").Replace("`r", '').Replace("`n", ' ')
}

function Test-CafeLogoThumb([string]$src) {
    return ($src -match '/image\.PNG$') -or ($src -match '/default/cafe_profile')
}

function Get-ArticleImages([int]$articleId) {
    $path = Join-Path $root "article_$articleId.json"
    curl.exe -s -H "Referer: $CafeReferer" "$ArticleApi/$articleId" -o $path | Out-Null
    if (-not (Test-Path $path)) { return @() }

    $raw = Get-Content $path -Encoding UTF8 -Raw
    if (-not $raw) { return @() }

    $urls = New-Object System.Collections.Generic.List[string]
    $localSeen = @{}

    foreach ($match in [regex]::Matches($raw, 'https://cafeptthumb-phinf\.pstatic\.net/[^"\\]+')) {
        $src = [uri]::UnescapeDataString($match.Value)
        if (-not $src -or $localSeen.ContainsKey($src)) { continue }
        if ($src -match '\.gif($|\?)') { continue }
        if (Test-CafeLogoThumb $src) { continue }
        $localSeen[$src] = $true
        [void]$urls.Add($src)
    }

    return $urls.ToArray()
}

function Add-CafeArticleItems([object]$article, [string]$source) {
    $images = Get-ArticleImages ([int]$article.articleId)
    if (-not $images -or $images.Count -eq 0) {
        $images = @([uri]::UnescapeDataString($article.representImage))
    }

    $link = "https://cafe.naver.com/yoonanana/$($article.articleId)"
    $caption = $article.subject
    $postId = [string]$article.articleId
    $imageCount = $images.Count
    $imageIndex = 0

    foreach ($img in $images) {
        if (-not $img -or $seen.ContainsKey($img)) { continue }
        $seen[$img] = $true
        $script:items += ,@{
            src = $img
            caption = $caption
            source = $source
            url = $link
            postId = $postId
            imageIndex = $imageIndex
            imageCount = $imageCount
        }
        $imageIndex++
    }

    return ($imageIndex -gt 0)
}

function Add-VCompanyItem([string]$src, [string]$caption) {
    if (-not $src -or $seen.ContainsKey($src)) { return $false }
    if ($src -match '\.gif($|\?)') { return $false }
    $seen[$src] = $true
    $script:items += ,@{
        src = $src
        caption = $caption
        source = 'v-company'
        url = 'https://v-company.xyz/gallery'
        postId = ''
        imageIndex = 0
        imageCount = 1
    }
    return $true
}

# Naver cafe fan art board (menu 22)
$cafeCount = 0
for ($page = 1; $page -le $CafePages; $page++) {
    if ($cafeCount -ge $MaxCafe) { break }
    $cafePath = Join-Path $root "cafe_fanart_p$page.json"
    curl.exe -s -H "Referer: $CafeReferer" `
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
        if (Add-CafeArticleItems $it 'fan-cafe') {
            $cafeCount++
        }
        Start-Sleep -Milliseconds 120
    }
    Start-Sleep -Milliseconds 200
}

# Naver cafe photo board (menu 18)
$cafePhotoCount = 0
for ($page = 1; $page -le $CafePages; $page++) {
    if ($cafePhotoCount -ge $MaxCafe) { break }
    $cafePath = Join-Path $root "cafe_photo_p$page.json"
    curl.exe -s -H "Referer: $CafeReferer" `
        "https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/31396984/menus/18/articles?page=$page&pageSize=$CafePageSize" `
        -o $cafePath | Out-Null
    if (-not (Test-Path $cafePath)) { continue }
    $cafe = Get-Content $cafePath -Encoding UTF8 -Raw | ConvertFrom-Json
    if (-not $cafe.result.articleList) { continue }

    foreach ($row in $cafe.result.articleList) {
        if ($cafePhotoCount -ge $MaxCafe) { break }
        $it = $row.item
        if (-not $it.hasImage) { continue }
        if ($it.representImageType -notin @('I', 'M')) { continue }
        if (Add-CafeArticleItems $it 'cafe-photo') {
            $cafePhotoCount++
        }
        Start-Sleep -Milliseconds 120
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
        if (Add-VCompanyItem $row.image_url $caption) {
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
    $postId = Escape-Js $it.postId
    [void]$sb.AppendLine(
        "  { src: '$(Escape-Js $it.src)', caption: '$(Escape-Js $it.caption)', source: '$(Escape-Js $it.source)', url: '$(Escape-Js $it.url)', postId: '$postId', imageIndex: $($it.imageIndex), imageCount: $($it.imageCount) },"
    )
}
[void]$sb.AppendLine('];')

$out = Join-Path $root 'js\gallery-data.js'
[System.IO.File]::WriteAllText($out, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Wrote $($items.Count) gallery items (fan-cafe=$cafeCount, cafe-photo=$cafePhotoCount, v-company=$vCount)"
