@echo off
cd /d "%~dp0"

where python3 >nul 2>nul
if %errorlevel% neq 0 (
    echo python3 is not installed or not in your PATH.
    echo Please install Python 3. Opening the Microsoft Store page...
    start "" "https://apps.microsoft.com/detail/9PNRBTZXMB4Z"
    pause
    exit /b
)

python3 main.py
pause
