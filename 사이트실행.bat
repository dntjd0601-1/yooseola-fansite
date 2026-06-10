@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 유설아 팬사이트
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause
