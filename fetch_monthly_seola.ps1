param(
    [switch]$ForceRefresh
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$spreadsheetId = '1AJPoSE5AA9mgpzSSYuKG6oLpG3Ww71kMfHILqsu-JJs'
$year = 2026
$monthSuffix = [string][char]0xC6D4
$lt = [string][char]0x3C
$gt = [string][char]0x3E
$tdPattern = $lt + 'td[^' + $gt + ']*' + $gt + '(.*?)' + $lt + '/td' + $gt
$tbodyPattern = $lt + 'tbody' + $gt + '(.*?)' + $lt + '/tbody' + $gt
$trPattern = $lt + 'tr[^' + $gt + ']*' + $gt + '(.*?)' + $lt + '/tr' + $gt
$monthPattern = '\d+\s*' + [string][char]0xC6D4
$broadcastPattern = [string][char]0xBC29 + '\s*' + [string][char]0xC1A1 + '\s*' + [string][char]0xC77C

$sheets = @(
    @{ month = 1; gid = '2071435345' },
    @{ month = 2; gid = '1609338384' },
    @{ month = 3; gid = '1310139476' },
    @{ month = 4; gid = '572344322' },
    @{ month = 5; gid = '1282475979' },
    @{ month = 6; gid = '1607442918' }
)

function Get-CellPlainText([string]$html) {
    if ([string]::IsNullOrWhiteSpace($html)) { return '' }
    $text = $html -replace '(?i)<br\s*/?>', ' '
    $text = $text -replace '<[^>]+>', ''
    $text = [System.Net.WebUtility]::HtmlDecode($text)
    return ($text -replace '\s+', ' ').Trim()
}

function Get-CellImageUrl([string]$html) {
    if ([string]::IsNullOrWhiteSpace($html)) { return $null }
    if ($html -match 'src="([^"]+)"') {
        return $Matches[1]
    }
    return $null
}

function Test-DateCell([string]$html) {
    $text = Get-CellPlainText $html
    return $text -match '^\d{1,2}$'
}

function Get-DateFromCell([string]$html) {
    $text = Get-CellPlainText $html
    if ($text -match '^\d{1,2}$') {
        return [int]$text
    }
    return $null
}

function Test-WeekdayHeaderRow([string]$rowHtml) {
    return $rowHtml -match 'SUN|MON|TUE|WED'
}

function Test-MetadataCell([string]$html) {
    $plain = Get-CellPlainText $html
    if ([string]::IsNullOrWhiteSpace($plain)) { return $false }
    return ($plain -match $monthPattern) -or ($plain -match $broadcastPattern)
}

function Expand-WeekSlots {
    param(
        [array]$Values,
        [int]$Offset
    )

    $slots = @(1..7 | ForEach-Object { $null })
    for ($i = 0; $i -lt $Values.Count; $i++) {
        $index = $Offset + $i
        if ($index -ge 0 -and $index -lt 7) {
            $slots[$index] = $Values[$i]
        }
    }
    return ,$slots
}

function Get-TdCells([string]$rowHtml) {
    $cells = New-Object System.Collections.Generic.List[string]
    foreach ($match in [regex]::Matches($rowHtml, $tdPattern, 'Singleline')) {
        [void]$cells.Add($match.Groups[1].Value)
    }
    return ,$cells.ToArray()
}

function Parse-HtmlViewMonth {
    param(
        [string]$Html,
        [int]$Month,
        [int]$Year
    )

    $monthLabel = $null
    $summary = $null
    $weeks = New-Object System.Collections.Generic.List[object]
    $currentDays = $null
    $currentImages = $null
    $currentOffset = 0

    $tbody = if ($Html -match $tbodyPattern) { $Matches[1] } else { $Html }
    $rowMatches = [regex]::Matches($tbody, $trPattern, 'Singleline')

    foreach ($row in $rowMatches) {
        $rowHtml = $row.Groups[1].Value
        if (Test-WeekdayHeaderRow $rowHtml) { continue }

        $cells = Get-TdCells $rowHtml
        if (-not $cells -or $cells.Count -eq 0) { continue }

        foreach ($cell in $cells) {
            $plain = Get-CellPlainText $cell
            if (-not $monthLabel -and $plain -match "($monthPattern)") {
                $monthLabel = $Matches[1].Trim()
            }
            if (-not $summary -and $plain -match $broadcastPattern) {
                $summary = $plain
            }
        }

        $dataCells = @($cells | Where-Object { -not (Test-MetadataCell $_) })
        if ($dataCells.Count -eq 0) { continue }

        $dateValues = @($dataCells | ForEach-Object { Get-DateFromCell $_ } | Where-Object { $null -ne $_ })
        $imageValues = @($dataCells | ForEach-Object { Get-CellImageUrl $_ } | Where-Object { $_ })
        $eventValues = @($dataCells | ForEach-Object {
            if (Test-DateCell $_) { return $null }
            if (Get-CellImageUrl $_) { return $null }
            $plain = Get-CellPlainText $_
            if ([string]::IsNullOrWhiteSpace($plain)) { return $null }
            return $plain
        })

        if ($dateValues.Count -ge 1) {
            if ($dataCells.Count -eq 7) {
                $currentDays = @($dataCells | ForEach-Object { Get-DateFromCell $_ })
                $currentOffset = 0
            } else {
                $firstDay = $dateValues[0]
                $currentOffset = [int](Get-Date -Year $Year -Month $Month -Day $firstDay).DayOfWeek
                $currentDays = Expand-WeekSlots $dateValues $currentOffset
            }
            $currentImages = @(1..7 | ForEach-Object { $null })
            continue
        }

        if ($imageValues.Count -ge 1 -and $null -ne $currentDays) {
            if ($dataCells.Count -eq 7) {
                $currentImages = @($dataCells | ForEach-Object { Get-CellImageUrl $_ })
            } else {
                $currentImages = Expand-WeekSlots $imageValues $currentOffset
            }
            continue
        }

        $hasEvents = @($eventValues | Where-Object { $_ }).Count -gt 0
        if ($hasEvents -and $null -ne $currentDays) {
            if ($dataCells.Count -eq 7) {
                $events = @($dataCells | ForEach-Object {
                    if (Test-DateCell $_) { return $null }
                    if (Get-CellImageUrl $_) { return $null }
                    $plain = Get-CellPlainText $_
                    if ([string]::IsNullOrWhiteSpace($plain)) { return $null }
                    return $plain
                })
            } else {
                $events = Expand-WeekSlots $eventValues $currentOffset
            }

            $weeks.Add([pscustomobject]@{
                days = @($currentDays)
                images = @($currentImages)
                events = @($events)
            })
            $currentDays = $null
            $currentImages = $null
            $currentOffset = 0
        }
    }

    if (-not $monthLabel) {
        $monthLabel = "{0}{1}" -f $Month, $monthSuffix
    }

    return [pscustomobject]@{
        monthLabel = $monthLabel
        summary = $summary
        weeks = $weeks
    }
}

$parsedMonths = @()

foreach ($sheet in $sheets) {
    $cachePath = Join-Path $root ("monthly_seola_{0}_html.html" -f $sheet.month)
    $url = "https://docs.google.com/spreadsheets/d/$spreadsheetId/htmlview/sheet?headers=true&gid=$($sheet.gid)"

    if (-not (Test-Path $cachePath) -or $ForceRefresh) {
        curl.exe -sL $url --max-time 45 -o $cachePath
        Start-Sleep -Milliseconds 250
    }

    $html = [System.IO.File]::ReadAllText($cachePath, [System.Text.Encoding]::UTF8)
    $parsed = Parse-HtmlViewMonth -Html $html -Month $sheet.month -Year $year

    $label = ($parsed.monthLabel -split [Environment]::NewLine)[0].Trim()
    $summary = if ($parsed.summary) {
        ($parsed.summary -replace "\s+", " ").Trim()
    } else {
        ""
    }

    $parsedMonths += [pscustomobject]@{
        month = $sheet.month
        year = $year
        gid = $sheet.gid
        label = $label
        summary = $summary
        weeks = $parsed.weeks
    }
}

$jsPath = Join-Path $root 'js/monthly-seola-data.js'
$json = ($parsedMonths | ConvertTo-Json -Depth 8 -Compress)
$sourceUrl = 'https://docs.google.com/spreadsheets/d/' + $spreadsheetId + '/edit?usp=sharing'
$lines = @(
    '// Auto-generated by fetch_monthly_seola.ps1'
    ('const MONTHLY_SEOLA_SPREADSHEET_ID = ''{0}'';' -f $spreadsheetId)
    ('const MONTHLY_SEOLA_SOURCE_URL = ''{0}'';' -f $sourceUrl)
    ('const MONTHLY_SEOLA_MONTHS = {0};' -f $json)
)
$content = ($lines -join [Environment]::NewLine) + [Environment]::NewLine

[System.IO.File]::WriteAllText($jsPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host ("Wrote {0} with {1} months" -f $jsPath, $parsedMonths.Count)
