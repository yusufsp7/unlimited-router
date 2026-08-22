@echo off
title Unlimited Router
set PATH=C:\Program Files\nodejs;C:\Windows\System32;%PATH%
set DATA_DIR=%APPDATA%\urouter
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%" 2>nul
if not exist "%DATA_DIR%\.env" (
    echo JWT_SECRET=urouter-local-secret> "%DATA_DIR%\.env"
    echo INITIAL_PASSWORD=123456>> "%DATA_DIR%\.env"
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":20128" ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
timeout /t 1 /nobreak >nul
node "%~dp0cli\cli.js" --tray --host 127.0.0.1 --port 20128
pause
