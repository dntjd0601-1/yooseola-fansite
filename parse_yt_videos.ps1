param(
    [string]$HtmlPath = (Join-Path $PSScriptRoot 'yt_videos_page.html'),
    [int]$Limit = 15
)

$html = [System.IO.File]::ReadAllText($HtmlPath, [System.Text.Encoding]::UTF8)

function Get-MetaNearId([string]$html, [string]$id) {
    $idx = $html.IndexOf('"videoId":"' + $id + '"')
    if ($idx -lt 0) { return @{ title = $id; duration = ''; views = 0 } }
    $chunk = $html.Substring($idx, [Math]::Min(5000, $html.Length - $idx))
    $title = $id
    $duration = ''
    $views = 0

    if ($chunk -match '"lengthText":\{"simpleText":"([^"]+)"') {
        $duration = $matches[1]
    } elseif ($chunk -match '"lengthText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"') {
        $duration = ($matches[1] -split ' ')[0]
    }
    if ($chunk -match '"viewCountText":\{"simpleText":"([^"]+)"') {
        $views = 0
    }

    return @{ title = $title; duration = $duration; views = $views }
}

$ids = [regex]::Matches($html, '"videoId":"([a-zA-Z0-9_-]{11})"') | ForEach-Object { $_.Groups[1].Value }
$seen = @{}
$items = @()
foreach ($id in $ids) {
    if ($seen.ContainsKey($id)) { continue }
    if ($id -eq 'CeCOBCcnkMxy7Hb09u8dxg') { continue }
    $seen[$id] = $true

    $meta = Get-MetaNearId $html $id
    $oembedPath = Join-Path $PSScriptRoot "oembed_$id.json"
    curl.exe -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$id&format=json" -o $oembedPath | Out-Null
    $title = $meta.title
    $thumb = "https://i.ytimg.com/vi/$id/hqdefault.jpg"
    if (Test-Path $oembedPath) {
        $oembed = Get-Content $oembedPath -Encoding UTF8 -Raw | ConvertFrom-Json
        if ($oembed.title) { $title = $oembed.title }
        if ($oembed.thumbnail_url) { $thumb = $oembed.thumbnail_url }
        Remove-Item $oembedPath -Force -ErrorAction SilentlyContinue
    }

    $items += [pscustomobject]@{
        id = $id
        title = $title
        url = "https://www.youtube.com/watch?v=$id"
        thumb = $thumb
        duration = $meta.duration
        views = $meta.views
    }
    if ($items.Count -ge $Limit) { break }
}

$items | ConvertTo-Json -Compress
