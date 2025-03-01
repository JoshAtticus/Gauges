@echo off
cd /d "%~dp0"

if exist "node_modules\" (
    node index.js
) else (
    echo First startup detected, installing dependencies...
    npm install
    cls
    node index.js
)

pause
