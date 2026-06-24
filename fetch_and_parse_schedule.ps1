param(
    [switch]$ForceRefresh
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$ref = 'https://cafe.naver.com/yoonanana'
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
$offMarker = [char]0xD29C + [char]0xBC29
$schedWord = [char]0xC77C + [char]0xC815
$weekWord = [char]0xC774 + [char]0xBC88 + [char]0xC8FC
$monthChar = [char]0xC6D4
$weekdays = @([char]0xC77C,[char]0xC6D4,[char]0xD654,[char]0xC218,[char]0xBAA9,[char]0xAE08,[char]0xD1A0)

$listUrl = 'https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/31396984/menus/11/articles?page=1&pageSize=50'
$listPath = Join-Path $root 'schedule_boardlist.json'
curl.exe -sL -A $ua -H "Referer: $ref" $listUrl --max-time 25 -o $listPath | Out-Null
$listRaw = [System.IO.File]::ReadAllText($listPath, [System.Text.Encoding]::UTF8)
$listJson = $listRaw | ConvertFrom-Json
$list = $listJson.result.articleList
if (-not $list -or $list.Count -eq 0) {
    throw "Failed to fetch schedule board list from Naver cafe (menu 11)."
}

$targets = @()
foreach ($entry in $list) {
    $item = $entry.item
    if ($item.subject -notlike "*$schedWord*") { continue }
    if ($item.subject -like "*$weekWord*") { continue }

    if ($item.subject -match '(\d{1,2})') {
        $month = [int]$Matches[1]
    } else {
        continue
    }

    $posted = [DateTimeOffset]::FromUnixTimeMilliseconds($item.writeDateTimestamp)
    $year = $posted.Year
    if ($month -lt $posted.Month -and $posted.Month -ge 10) { $year += 1 }

    $targets += [pscustomobject]@{
        id = $item.articleId
        month = $month
        year = $year
        writeDate = $item.writeDateTimestamp
    }
}

$targets = $targets |
    Sort-Object year, month, writeDate |
    Group-Object year, month |
    ForEach-Object { $_.Group[-1] }

$allEvents = [ordered]@{}

foreach ($t in ($targets | Sort-Object year, month)) {
    $id = $t.id
    $path = Join-Path $root "article_$id.json"
    if (-not (Test-Path $path) -or $ForceRefresh) {
        $url = "https://article.cafe.naver.com/gw/cafes/31396984/articles/$id"
        curl.exe -sL -A $ua -H "Referer: $ref" $url --max-time 25 -o $path
        Start-Sleep -Milliseconds 300
    }

    $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $json = $raw | ConvertFrom-Json
    $html = $json.article.content
    if ($html -notmatch 'se-table') { continue }

    $spans = [regex]::Matches($html, '<span[^>]*>([\s\S]*?)</span>') | ForEach-Object {
        ($_.Groups[1].Value -replace '&#8203;', '' -replace '&#9729;&#65039;', 'OFFDAY' -replace '<[^>]+>', '').Trim()
    } | Where-Object { $_ }

    $rows = @()
    $day = $null
    $lines = @()
    foreach ($text in $spans) {
        if ($text -match '^\d{1,2}$') {
            if ($null -ne $day) { $rows += [pscustomobject]@{ day = $day; lines = $lines } }
            $day = [int]$text
            $lines = @()
            continue
        }
        if ($null -ne $day) { $lines += $text }
    }
    if ($null -ne $day) { $rows += [pscustomobject]@{ day = $day; lines = $lines } }

    foreach ($r in $rows) {
        $date = '{0}-{1:D2}-{2:D2}' -f $t.year, $t.month, $r.day
        $hasOff = ($r.lines | Where-Object { $_ -like "*$offMarker*" -or $_ -like '*OFFDAY*' }).Count -gt 0
        $filtered = $r.lines | Where-Object {
            $_ -and $_ -notlike "*$offMarker*" -and $_ -notlike '*OFFDAY*' -and ($weekdays -notcontains $_)
        }

        if ($filtered.Count -eq 0 -and -not $hasOff) { continue }
        $title = if ($filtered.Count -gt 0) { ($filtered -join ' + ') } else { $offMarker }
        if ($hasOff -and $filtered.Count -eq 0) {
            $type = 'off'
        } elseif ($title -eq $offMarker -or $title -like "$offMarker*") {
            $type = 'off'
        } else {
            $type = 'live'
        }
        $allEvents[$date] = @{ type = $type; title = $title }
    }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('/**')
[void]$sb.AppendLine(' * Schedule from https://cafe.naver.com/yoonanana')
[void]$sb.AppendLine(' */')
[void]$sb.AppendLine('const SCHEDULE_EVENTS = {')
foreach ($kv in $allEvents.GetEnumerator() | Sort-Object Name) {
    $title = $kv.Value.title.Replace("'", "\'")
    [void]$sb.AppendLine("  '$($kv.Name)': [{ type: '$($kv.Value.type)', title: '$title' }],")
}
[void]$sb.AppendLine('};')
$outPath = Join-Path $root 'js\schedule-data.js'
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Articles: $($targets.Count), Events: $(($allEvents.Keys).Count)"
