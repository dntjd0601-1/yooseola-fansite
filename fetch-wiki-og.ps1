# Fetch og:image from Namu Wiki pages (one-off helper)
$pages = [ordered]@{
    'gamchester'  = 'https://namu.wiki/w/%EA%B0%90%EC%B2%B4%EC%8A%A4%ED%84%B0%20%ED%81%AC%EB%A3%A8'
    'yuyuuldda'   = 'https://namu.wiki/w/%EC%9C%A0%EC%9C%A0%EC%9A%B8%EB%94%B0'
    'pongland'    = 'https://namu.wiki/w/%ED%90%81%ED%90%81%EB%9E%9C%EB%93%9C'
    'gapjildan'   = 'https://namu.wiki/w/%EA%B0%91%EC%A7%88%EB%8B%A8'
    'ronaworld'   = 'https://namu.wiki/w/%EB%A1%9C%EB%82%98%EC%9B%94%EB%93%9C'
    'macaotalk'   = 'https://namu.wiki/w/%EB%A7%88%EC%B9%B4%EC%98%A4%ED%86%A1'
    'mingchin'    = 'https://namu.wiki/w/%EB%B0%8D%EC%B9%9C%EC%84%9C%EB%B2%84:%20%EB%8D%94%20%EB%8B%A4%EC%9D%B4%EB%85%B8'
    'chungdong'   = 'https://namu.wiki/w/RPG%EC%B6%A9%EB%8F%99%20%EC%84%9C%EB%B2%84'
    'rpg'         = 'https://namu.wiki/w/RPG%EC%97%B0%EC%8A%B5'
    'jeonjaeng'   = 'https://namu.wiki/w/%EC%A0%84%EC%9F%81%EC%A4%91%20(%EB%A7%88%EC%9D%B8%ED%81%AC%EB%9E%98%ED%94%84%ED%8A%B8)'
    'yeombyeong'  = 'https://namu.wiki/w/%EC%97%BC%EB%B3%91%EC%84%9C%EB%B2%84'
    'gamwak'      = 'https://namu.wiki/w/%EA%B0%90%EC%99%81%EB%8C%80%EC%A0%84'
    'duaon'       = 'https://namu.wiki/w/%EB%91%90%EC%95%84%EC%98%A8'
    'haechomaeul' = 'https://namu.wiki/w/%ED%95%B4%EC%B4%88%EB%A7%88%EC%9D%84'
}

$outDir = Join-Path $PSScriptRoot 'wiki-og'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

foreach ($entry in $pages.GetEnumerator()) {
    $file = Join-Path $outDir "$($entry.Key).html"
    curl.exe -sL -A "Mozilla/5.0" $entry.Value -o $file | Out-Null
    $html = Get-Content $file -Raw -Encoding UTF8
    if ($html -match 'property="og:image" content="(//i\.namu\.wiki/i/[^"]+)"') {
        Write-Output "$($entry.Key) -> $($matches[1])"
    } else {
        Write-Output "$($entry.Key) -> NOT FOUND"
    }
}
