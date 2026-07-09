$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

function Format-Duration([long]$ms) {
    if (-not $ms) { return '' }
    $total = [math]::Floor($ms / 1000)
    $h = [math]::Floor($total / 3600)
    $m = [math]::Floor(($total % 3600) / 60)
    $s = $total % 60
    $mm = $m.ToString('00')
    $ss = $s.ToString('00')
    if ($h -gt 0) { return "$h`:$mm`:$ss" }
    return "$m`:$ss"
}

function Format-Date([string]$value) {
    if (-not $value) { return '' }
    if ($value -match '^\d+$') {
        $dt = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$value).ToOffset([TimeSpan]::FromHours(9))
        return $dt.ToString('yyyy.MM.dd')
    }
    if ($value -match '^\d{4}-\d{2}-\d{2}') {
        return ($value.Substring(0, 10) -replace '-', '.')
    }
    return $value
}

function Escape-Js([string]$text) {
    if (-not $text) { return '' }
    return $text.Replace('\', '\\').Replace("'", "\'").Replace("`r", '').Replace("`n", ' ')
}

function Invoke-CurlJson([string]$url, [string]$outPath, [string[]]$headers = @()) {
    $args = @('-s', '-A', 'Mozilla/5.0')
    foreach ($h in $headers) { $args += @('-H', $h) }
    $args += @($url, '-o', $outPath)
    & curl.exe @args | Out-Null
    $raw = [System.IO.File]::ReadAllText($outPath, [System.Text.Encoding]::UTF8)
    return $raw | ConvertFrom-Json
}

# SOOP 다시보기
$replay = @()
$soopPath = Join-Path $root 'soop_vods.json'
$soopJson = Invoke-CurlJson 'https://chapi.sooplive.com/api/yeveee/vods/review?page=1&per_page=15&orderby=reg_date' $soopPath
foreach ($item in $soopJson.data) {
    $thumb = $item.ucc.thumb
    if ($thumb -and $thumb.StartsWith('//')) { $thumb = "https:$thumb" }
    $replay += ,@{
        title = $item.title_name
        url = "https://vod.sooplive.com/player/$($item.title_no)"
        thumb = $thumb
        date = Format-Date $item.reg_date
        duration = Format-Duration $item.ucc.total_file_duration
        views = $item.count.vod_read_cnt
    }
    if ($replay.Count -ge 15) { break }
}

# YouTube RSS — 쇼츠 분리 + 메타데이터 맵
$shorts = @()
$rssById = @{}
$ytXmlPath = Join-Path $root 'youtube_feed.xml'
curl.exe -s "https://www.youtube.com/feeds/videos.xml?channel_id=UCCeCOBCcnkMxy7Hb09u8dxg" -o $ytXmlPath | Out-Null
[xml]$ytXml = Get-Content $ytXmlPath -Encoding UTF8
$ns = New-Object System.Xml.XmlNamespaceManager($ytXml.NameTable)
$ns.AddNamespace('atom', 'http://www.w3.org/2005/Atom')
$ns.AddNamespace('media', 'http://search.yahoo.com/mrss/')
$ns.AddNamespace('yt', 'http://www.youtube.com/xml/schemas/2015')
$entries = $ytXml.SelectNodes('//atom:entry', $ns)
foreach ($entry in $entries) {
    $videoId = $entry.SelectSingleNode('yt:videoId', $ns).'#text'
    $title = $entry.SelectSingleNode('media:group/media:title', $ns).'#text'
    if (-not $title) { $title = $entry.SelectSingleNode('atom:title', $ns).'#text' }
    $link = ($entry.SelectNodes('atom:link', $ns) | Where-Object { $_.rel -eq 'alternate' } | Select-Object -First 1).href
    if (-not $link) { $link = "https://www.youtube.com/watch?v=$videoId" }
    $published = $entry.SelectSingleNode('atom:published', $ns).'#text'
    $views = $entry.SelectSingleNode('media:group/media:community/media:statistics', $ns).views
    $row = @{
        title = $title
        url = $link
        thumb = "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"
        date = Format-Date $published
        duration = ''
        views = [int]$views
    }
    if (-not $rssById.ContainsKey($videoId)) { $rssById[$videoId] = $row }
    if ($link -like '*youtube.com/shorts/*') {
        $shorts += ,$row
    }
}

# YouTube 롱폼 — @yoo_seola/videos (동영상 탭) 순서
$youtube = @()
$ytVideosPath = Join-Path $root 'yt_videos_page.html'
curl.exe -s -A "Mozilla/5.0" "https://www.youtube.com/@yoo_seola/videos" -o $ytVideosPath | Out-Null
$ytHtml = [System.IO.File]::ReadAllText($ytVideosPath, [System.Text.Encoding]::UTF8)
$seenIds = @{}
$idMatches = [regex]::Matches($ytHtml, '"videoId":"([a-zA-Z0-9_-]{11})"')
foreach ($m in $idMatches) {
    $id = $m.Groups[1].Value
    if ($seenIds.ContainsKey($id)) { continue }
    if ($id -eq 'CeCOBCcnkMxy7Hb09u8dxg') { continue }
    $seenIds[$id] = $true

    $title = $id
    $thumb = "https://i.ytimg.com/vi/$id/hqdefault.jpg"
    $date = ''
    $views = 0
    if ($rssById.ContainsKey($id)) {
        $title = $rssById[$id].title
        $date = $rssById[$id].date
        $views = $rssById[$id].views
        $thumb = $rssById[$id].thumb
    }

    $oembedPath = Join-Path $root "oembed_$id.json"
    curl.exe -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$id&format=json" -o $oembedPath | Out-Null
    if (Test-Path $oembedPath) {
        try {
            $oembed = Get-Content $oembedPath -Encoding UTF8 -Raw | ConvertFrom-Json
            if ($oembed.title) { $title = $oembed.title }
            if ($oembed.thumbnail_url) { $thumb = $oembed.thumbnail_url }
        } catch { }
        Remove-Item $oembedPath -Force -ErrorAction SilentlyContinue
    }

    $youtube += ,@{
        title = $title
        url = "https://www.youtube.com/watch?v=$id"
        thumb = $thumb
        date = $date
        duration = ''
        views = $views
    }
    if ($youtube.Count -ge 15) { break }
}

# YouTube 기타 — 버컴 플레이리스트
$etc = @()
$etcListId = 'PLR2c_oelBOVU'
$etcMetaById = @{}
$etcRssPath = Join-Path $root 'etc_playlist_feed.xml'
curl.exe -s "https://www.youtube.com/feeds/videos.xml?playlist_id=$etcListId" -o $etcRssPath | Out-Null
if (Test-Path $etcRssPath) {
    [xml]$etcXml = Get-Content $etcRssPath -Encoding UTF8
    $ns = New-Object System.Xml.XmlNamespaceManager($etcXml.NameTable)
    $ns.AddNamespace('atom', 'http://www.w3.org/2005/Atom')
    $ns.AddNamespace('media', 'http://search.yahoo.com/mrss/')
    $ns.AddNamespace('yt', 'http://www.youtube.com/xml/schemas/2015')
    foreach ($entry in $etcXml.SelectNodes('//atom:entry', $ns)) {
        $videoId = $entry.SelectSingleNode('yt:videoId', $ns).'#text'
        if (-not $videoId) { continue }
        $title = $entry.SelectSingleNode('media:group/media:title', $ns).'#text'
        if (-not $title) { $title = $entry.SelectSingleNode('atom:title', $ns).'#text' }
        $published = $entry.SelectSingleNode('atom:published', $ns).'#text'
        $views = $entry.SelectSingleNode('media:group/media:community/media:statistics', $ns).views
        $etcMetaById[$videoId] = @{
            title = $title
            url = "https://www.youtube.com/watch?v=$videoId"
            thumb = "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"
            date = Format-Date $published
            duration = ''
            views = [int]$views
        }
    }
}

$etcHtmlPath = Join-Path $root 'etc_playlist_page.html'
curl.exe -s -A "Mozilla/5.0" "https://www.youtube.com/playlist?list=$etcListId" -o $etcHtmlPath | Out-Null
$etcHtml = if (Test-Path $etcHtmlPath) { [System.IO.File]::ReadAllText($etcHtmlPath, [System.Text.Encoding]::UTF8) } else { '' }
$seenEtcIds = @{}
$etcIdMatches = [regex]::Matches($etcHtml, '"videoId":"([a-zA-Z0-9_-]{11})"')
foreach ($m in $etcIdMatches) {
    $id = $m.Groups[1].Value
    if ($seenEtcIds.ContainsKey($id)) { continue }
    if ($id -eq 'CeCOBCcnkMxy7Hb09u8dxg') { continue }
    $seenEtcIds[$id] = $true

    if ($etcMetaById.ContainsKey($id)) {
        $etc += ,$etcMetaById[$id]
    } else {
        $title = $id
        $thumb = "https://i.ytimg.com/vi/$id/hqdefault.jpg"
        $oembedPath = Join-Path $root "oembed_$id.json"
        curl.exe -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$id&format=json" -o $oembedPath | Out-Null
        if (Test-Path $oembedPath) {
            try {
                $oembed = Get-Content $oembedPath -Encoding UTF8 -Raw | ConvertFrom-Json
                if ($oembed.title) { $title = $oembed.title }
                if ($oembed.thumbnail_url) { $thumb = $oembed.thumbnail_url }
            } catch { }
            Remove-Item $oembedPath -Force -ErrorAction SilentlyContinue
        }
        $etc += ,@{
            title = $title
            url = "https://www.youtube.com/watch?v=$id"
            thumb = $thumb
            date = ''
            duration = ''
            views = 0
        }
    }
    if ($etc.Count -ge 15) { break }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('/**')
[void]$sb.AppendLine(' * VOD data - SOOP / YouTube / YouTube Shorts / 기타')
[void]$sb.AppendLine(' * Regenerate: powershell -File fetch_vod.ps1')
[void]$sb.AppendLine(' */')
[void]$sb.AppendLine('const VOD_DATA = {')

function Write-List($sb, $name, $items) {
    [void]$sb.AppendLine("  $name`: [")
    foreach ($it in $items) {
        $thumb = Escape-Js $it.thumb
        $title = Escape-Js $it.title
        $url = Escape-Js $it.url
        $date = Escape-Js $it.date
        $duration = Escape-Js $it.duration
        $views = if ($it.views) { $it.views } else { 0 }
        [void]$sb.AppendLine("    { title: '$title', url: '$url', thumb: '$thumb', date: '$date', duration: '$duration', views: $views },")
    }
    [void]$sb.AppendLine('  ],')
}

Write-List $sb 'replay' $replay
Write-List $sb 'youtube' $youtube
Write-List $sb 'shorts' $shorts
Write-List $sb 'etc' $etc
[void]$sb.AppendLine('};')

$out = Join-Path $root 'js\vod-data.js'
[System.IO.File]::WriteAllText($out, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Wrote replay=$($replay.Count) youtube=$($youtube.Count) shorts=$($shorts.Count) etc=$($etc.Count)"
