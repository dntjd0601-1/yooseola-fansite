$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$listId = 'PLDmzzSPk7ZiAFX3Gk9kOR0AwTeId5WolD'
$startVideoId = 'i-TFmaRcoKs'
$htmlPath = Join-Path $root 'yt_memory_playlist.html'

function Escape-Js([string]$text) {
    if (-not $text) { return '' }
    return $text.Replace('\', '\\').Replace("'", "\'").Replace("`r", '').Replace("`n", ' ')
}

function Get-Mood([string]$title) {
    return '노래'
}

$titleById = @{}
$rssPath = Join-Path $root 'memory_playlist_feed.xml'
curl.exe -s "https://www.youtube.com/feeds/videos.xml?playlist_id=$listId" -o $rssPath | Out-Null
if (Test-Path $rssPath) {
    [xml]$xml = Get-Content $rssPath -Encoding UTF8
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace('atom', 'http://www.w3.org/2005/Atom')
    $ns.AddNamespace('yt', 'http://www.youtube.com/xml/schemas/2015')
    $playlistTitle = $xml.SelectSingleNode('//atom:feed/atom:title', $ns).'#text'
    foreach ($entry in $xml.SelectNodes('//atom:entry', $ns)) {
        $videoId = $entry.SelectSingleNode('yt:videoId', $ns).'#text'
        $title = $entry.SelectSingleNode('atom:title', $ns).'#text'
        if ($videoId -and $title) { $titleById[$videoId] = $title }
    }
}

if (-not (Test-Path $htmlPath)) {
    curl.exe -s -A "Mozilla/5.0" "https://www.youtube.com/playlist?list=$listId" -o $htmlPath | Out-Null
}
$html = [IO.File]::ReadAllText($htmlPath, [Text.Encoding]::UTF8)
if (-not $playlistTitle) {
    if ($html -match '<title>([^<]+)</title>') {
        $playlistTitle = ($matches[1] -replace ' - YouTube$', '').Trim()
    }
}
if (-not $playlistTitle) { $playlistTitle = '설아의 추억 심야버스(0614)' }

$orderedIds = New-Object System.Collections.Generic.List[string]
$seen = @{}
$idMatches = [regex]::Matches($html, '"videoId":"([a-zA-Z0-9_-]{11})"')
foreach ($m in $idMatches) {
    $id = $m.Groups[1].Value
    if ($seen.ContainsKey($id)) { continue }
    if ($id -eq 'CeCOBCcnkMxy7Hb09u8dxg') { continue }
    $seen[$id] = $true
    [void]$orderedIds.Add($id)
}

$items = @()
foreach ($id in $orderedIds) {
    $title = $titleById[$id]
    if (-not $title) {
        $idx = $html.IndexOf('"videoId":"' + $id + '"')
        if ($idx -ge 0) {
            $chunk = $html.Substring($idx, [Math]::Min(5000, $html.Length - $idx))
            if ($chunk -match '"title":\{"runs":\[\{"text":"([^"]+)"') { $title = $matches[1] }
            elseif ($chunk -match '"title":\{"simpleText":"([^"]+)"') { $title = $matches[1] }
        }
    }
    if (-not $title -or $title -eq $id) {
        $oembedPath = Join-Path $root "oembed_$id.json"
        curl.exe -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$id&format=json" -o $oembedPath | Out-Null
        if (Test-Path $oembedPath) {
            try {
                $oembed = Get-Content $oembedPath -Encoding UTF8 -Raw | ConvertFrom-Json
                if ($oembed.title) { $title = $oembed.title }
            } catch { }
            Remove-Item $oembedPath -Force -ErrorAction SilentlyContinue
        }
    }
    if (-not $title) { $title = $id }
    $items += ,@{
        title = $title
        videoId = $id
        thumb = "https://i.ytimg.com/vi/$id/hqdefault.jpg"
        mood = Get-Mood $title
    }
    Start-Sleep -Milliseconds 80
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('/**')
[void]$sb.AppendLine(' * 추억의 플리 — YouTube 재생목록')
[void]$sb.AppendLine(' * Regenerate: powershell -File fetch_memory_playlist.ps1')
[void]$sb.AppendLine(' */')
[void]$sb.AppendLine('const MEMORY_YOUTUBE_PLAYLIST = {')
[void]$sb.AppendLine("  id: '$listId',")
[void]$sb.AppendLine("  title: '$(Escape-Js $playlistTitle)',")
[void]$sb.AppendLine("  url: 'https://www.youtube.com/playlist?list=$listId',")
[void]$sb.AppendLine("  startVideoId: '$startVideoId',")
[void]$sb.AppendLine('};')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('const MEMORY_PLAYLIST_DATA = [')
foreach ($it in $items) {
    [void]$sb.AppendLine("  { title: '$(Escape-Js $it.title)', videoId: '$($it.videoId)', thumb: '$($it.thumb)', mood: '$(Escape-Js $it.mood)' },")
}
[void]$sb.AppendLine('];')

$out = Join-Path $root 'js\memory-playlist-data.js'
[System.IO.File]::WriteAllText($out, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Wrote $($items.Count) playlist items from $playlistTitle"
