@echo off
cd /d "%~dp0"
echo.
echo [1/2] Fetching latest data and preparing netlify-deploy folder...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-all.ps1"
if errorlevel 1 goto error

echo.
echo [2/2] Done!
echo.
echo Next steps:
echo   1. Open https://app.netlify.com/drop
echo   2. Drag the "netlify-deploy" folder onto the page
echo.
start https://app.netlify.com/drop
explorer "%~dp0netlify-deploy"
goto end

:error
echo.
echo ERROR: Failed to prepare files.
echo Make sure PowerShell is available on your PC.

:end
pause
