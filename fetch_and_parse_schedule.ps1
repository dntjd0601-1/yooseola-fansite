param(
    [switch]$ForceRefresh
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$spreadsheetId = "15fY3MiUeEYFjIb3RxpPTF59hLLJKBoj5x1aciuLGnQg"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
$offRest = [string]([char]0xD734) + [char]0xBC29
$offBang = [string]([char]0xD734) + [char]0xBC45
$offTune = [string]([char]0xD29C) + [char]0xBC29

function ConvertFrom-CsvLine {
    param([string]$Line)
    $result = New-Object System.Collections.Generic.List[string]
    $sb = New-Object System.Text.StringBuilder
    $inQuotes = $false
    for ($i = 0; $i -lt $Line.Length; $i++) {
        $ch = $Line[$i]
        if ($ch -eq [char]34) {
            if ($inQuotes -and ($i + 1) -lt $Line.Length -and $Line[$i + 1] -eq [char]34) {
                [void]$sb.Append([char]34)
                $i++
            } else {
                $inQuotes = -not $inQuotes
            }
        } elseif ($ch -eq [char]44 -and -not $inQuotes) {
            $result.Add($sb.ToString())
            [void]$sb.Clear()
        } else {
            [void]$sb.Append($ch)
        }
    }
    $result.Add($sb.ToString())
    return ,$result.ToArray()
}

function Get-CleanCell {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
    $clean = ($Text -replace "[\u200B\uFEFF]", "").Trim()
    $clean = $clean -replace "\s+", " "
    return $clean.Trim()
}

function Get-SheetList {
    $htmlPath = Join-Path $root "tmp_yuki_sheet_index.html"
    $url = "https://docs.google.com/spreadsheets/d/$spreadsheetId/htmlview"
    curl.exe -sL -A $ua $url --max-time 30 -o $htmlPath | Out-Null
    $html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
    $pattern = 'items\.push\(\{name:\s*"([^"]+)"[\s\S]*?gid:\s*"(\d+)"'
    $sheets = @()
    foreach ($m in [regex]::Matches($html, $pattern)) {
        $sheets += [pscustomobject]@{
            name = [regex]::Unescape($m.Groups[1].Value)
            gid  = $m.Groups[2].Value
        }
    }
    if ($sheets.Count -eq 0) {
        $sheets = @(
            [pscustomobject]@{ name = "2026.09"; gid = "1186211302" }
            [pscustomobject]@{ name = "2026.10"; gid = "1594753512" }
        )
    }
    return $sheets
}

function Get-SheetCsv {
    param([string]$Gid, [string]$Name)
    $safe = ($Name -replace "[^\d.]", "")
    if (-not $safe) { $safe = $Gid }
    $path = Join-Path $root "tmp_yuki_cal_$safe.csv"
    if ($ForceRefresh -or -not (Test-Path $path)) {
        $url = "https://docs.google.com/spreadsheets/d/$spreadsheetId/export?format=csv&gid=$Gid"
        curl.exe -sL -A $ua $url --max-time 30 -o $path | Out-Null
    }
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Test-DayHeaderRow {
    param([string[]]$Cells, [int[]]$Cols)
    $hits = 0
    $other = 0
    foreach ($col in $Cols) {
        if ($col -ge $Cells.Count) { continue }
        $cell = Get-CleanCell $Cells[$col]
        if (-not $cell) { continue }
        if ($cell -match "^\d{1,2}$" -and [int]$cell -ge 1 -and [int]$cell -le 31) {
            $hits++
        } else {
            $other++
        }
    }
    return ($hits -ge 1 -and $other -eq 0)
}

function Parse-MonthCsv {
    param([string]$Csv, [int]$Year, [int]$Month)

    $lines = $Csv -split "\r?\n"
    $rows = foreach ($line in $lines) {
        if ($line -eq "") { continue }
        ConvertFrom-CsvLine $line
    }

    $calCols = $null
    $weekDays = $null
    $buckets = @{}

    foreach ($cells in $rows) {
        if (-not $calCols) {
            for ($i = 0; $i -lt $cells.Count; $i++) {
                if ((Get-CleanCell $cells[$i]) -eq "SUNDAY") {
                    $calCols = 0..6 | ForEach-Object { $i + $_ }
                    break
                }
            }
            continue
        }

        if (Test-DayHeaderRow $cells $calCols) {
            $weekDays = @($null) * 7
            for ($idx = 0; $idx -lt 7; $idx++) {
                $col = $calCols[$idx]
                if ($col -ge $cells.Count) { continue }
                $cell = Get-CleanCell $cells[$col]
                if ($cell -match "^\d{1,2}$") {
                    $weekDays[$idx] = [int]$cell
                    $dayKey = [string]$weekDays[$idx]
                    if (-not $buckets.ContainsKey($dayKey)) {
                        $buckets[$dayKey] = New-Object System.Collections.Generic.List[string]
                    }
                }
            }
            continue
        }

        if (-not $weekDays) { continue }

        for ($idx = 0; $idx -lt 7; $idx++) {
            $day = $weekDays[$idx]
            if ($null -eq $day) { continue }
            $col = $calCols[$idx]
            if ($col -ge $cells.Count) { continue }
            $cell = Get-CleanCell $cells[$col]
            if (-not $cell) { continue }
            if ($cell -match "^(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|memo|#REF!)$") { continue }
            $buckets["$day"].Add($cell)
        }
    }

    $events = [ordered]@{}
    foreach ($day in ($buckets.Keys | ForEach-Object { [int]$_ } | Sort-Object)) {
        try {
            $date = Get-Date -Year $Year -Month $Month -Day $day
        } catch {
            continue
        }
        $key = $date.ToString("yyyy-MM-dd")
        $linesForDay = @($buckets["$day"] | Where-Object { $_ })
        if ($linesForDay.Count -eq 0) { continue }

        $isOff = $false
        $titles = New-Object System.Collections.Generic.List[string]
        foreach ($line in $linesForDay) {
            $plain = $line.Trim().Trim([char]45).Trim()
            $plain = [regex]::Replace($plain, "^[^\p{L}\d]+", "")
            if ($plain.Contains($offBang) -or $plain.Contains($offRest) -or $plain.Contains($offTune)) {
                $isOff = $true
                continue
            }
            if ($plain) { $titles.Add($plain) }
        }

        if ($isOff -and $titles.Count -eq 0) {
            $events[$key] = @(@{ type = "off"; title = $offRest })
        } elseif ($titles.Count -gt 0) {
            $type = if ($isOff) { "off" } else { "live" }
            $events[$key] = @(@{ type = $type; title = ($titles -join "`n") })
        }
    }
    return $events
}

$sheets = Get-SheetList
$allEvents = [ordered]@{}

foreach ($sheet in $sheets) {
    if ($sheet.name -notmatch "^(20\d{2})\.(\d{1,2})$") { continue }
    $year = [int]$Matches[1]
    $month = [int]$Matches[2]
    Write-Output ("Using sheet {0} gid={1} -> {2}-{3}" -f $sheet.name, $sheet.gid, $year, $month)
    $csv = Get-SheetCsv -Gid $sheet.gid -Name $sheet.name
    $monthEvents = Parse-MonthCsv -Csv $csv -Year $year -Month $month
    foreach ($kv in $monthEvents.GetEnumerator()) {
        $allEvents[$kv.Name] = $kv.Value
    }
}

$overridePath = Join-Path $root "schedule-overrides.json"
if (Test-Path $overridePath) {
    $overrides = [System.IO.File]::ReadAllText($overridePath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($prop in $overrides.PSObject.Properties) {
        $allEvents[$prop.Name] = @(
            foreach ($entry in @($prop.Value)) {
                @{ type = $entry.type; title = $entry.title }
            }
        )
    }
}

$json = ($allEvents | ConvertTo-Json -Depth 6)
$js = @"
/**
 * Schedule from https://docs.google.com/spreadsheets/d/$spreadsheetId
 */
const SCHEDULE_EVENTS = $json;
"@

$outPath = Join-Path $root "js\schedule-data.js"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outPath, $js, $utf8)

$buildOverrides = Join-Path $root "build-schedule-overrides-js.ps1"
if (Test-Path $buildOverrides) {
    & $buildOverrides
}
Write-Output "Sheets: $($sheets.Count), Events: $(($allEvents.Keys).Count)"
