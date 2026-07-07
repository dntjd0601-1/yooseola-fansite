# Build js/schedule-overrides.js from schedule-overrides.json (sync patch for SCHEDULE_EVENTS).
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$overridePath = Join-Path $root 'schedule-overrides.json'
$outJs = Join-Path $root 'js/schedule-overrides.js'

if (-not (Test-Path $overridePath)) {
    if (Test-Path $outJs) { Remove-Item $outJs -Force }
    return
}

$json = [System.IO.File]::ReadAllText($overridePath, [System.Text.Encoding]::UTF8).Trim()
$content = @"
/** Manual schedule overrides from schedule-overrides.json */
(function () {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;
  const overrides = $json;
  Object.keys(overrides).forEach((date) => {
    SCHEDULE_EVENTS[date] = overrides[date];
  });
})();
"@

[System.IO.File]::WriteAllText($outJs, $content, [System.Text.Encoding]::UTF8)
Write-Output "OK: js/schedule-overrides.js"
