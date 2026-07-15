$ids = @{
    1428 = @{ year = 2025; month = 4 }
    1796 = @{ year = 2025; month = 5 }
    2362 = @{ year = 2025; month = 6 }
    2658 = @{ year = 2025; month = 7 }
    2829 = @{ year = 2025; month = 8 }
    3093 = @{ year = 2025; month = 9 }
    3629 = @{ year = 2025; month = 10 }
    4175 = @{ year = 2025; month = 11 }
    4679 = @{ year = 2025; month = 12 }
    5859 = @{ year = 2026; month = 2 }
    6946 = @{ year = 2026; month = 3 }
    8300 = @{ year = 2026; month = 4 }
    8957 = @{ year = 2026; month = 5 }
    9807 = @{ year = 2026; month = 6 }
}

$allEvents = [ordered]@{}
$offMarker = [char]0xD734 + [char]0xBC29
$offPatterns = @($offMarker, '튜방', 'OFFDAY')
$weekdays = @([char]0xC77C,[char]0xC6D4,[char]0xD654,[char]0xC218,[char]0xBAA9,[char]0xAE08,[char]0xD1A0)

foreach ($entry in ($ids.GetEnumerator() | Sort-Object { $_.Value.year }, { $_.Value.month })) {
    $id = $entry.Key
    $year = $entry.Value.year
    $month = $entry.Value.month
    $path = Join-Path $PSScriptRoot "article_$id.json"
    if (-not (Test-Path $path)) { continue }

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
        $date = '{0}-{1:D2}-{2:D2}' -f $year, $month, $r.day
        $isOffLine = { param($line)
            if (-not $line) { return $false }
            foreach ($p in $offPatterns) { if ($line -like "*$p*") { return $true } }
            return $false
        }
        $hasOff = ($r.lines | Where-Object { & $isOffLine $_ }).Count -gt 0
        $filtered = $r.lines | Where-Object {
            $_ -and -not (& $isOffLine $_) -and ($weekdays -notcontains $_)
        }
        if ($filtered.Count -eq 0 -and -not $hasOff) { continue }
        if ($filtered.Count -gt 0) {
            $title = ($filtered -join '\n').Replace("'", "\'")
            $allEvents[$date] = @(@{ type = 'live'; title = $title })
        } else {
            $allEvents[$date] = @(@{ type = 'off'; title = $offMarker })
        }
    }
}

function Format-ScheduleJsLine {
    param([string]$Date, $Events)
    $items = foreach ($ev in @($Events)) {
        $title = $ev.title.Replace("'", "\'")
        "{ type: '$($ev.type)', title: '$title' }"
    }
    return "  '$Date': [$($items -join ', ')],"
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('/**')
[void]$sb.AppendLine(' * Schedule from https://cafe.naver.com/yoonanana')
[void]$sb.AppendLine(' */')
[void]$sb.AppendLine('const SCHEDULE_EVENTS = {')
foreach ($kv in $allEvents.GetEnumerator() | Sort-Object Name) {
    [void]$sb.AppendLine((Format-ScheduleJsLine -Date $kv.Name -Events $kv.Value))
}
[void]$sb.AppendLine('};')
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'js\schedule-data.js'), $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Wrote $(($allEvents.Keys).Count) events"
