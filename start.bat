@echo off
cd /d "%~dp0"

if exist "node_modules\" (
    start http://127.0.0.1:3000
    cls
    node index.js
) else (
    echo First startup detected, installing dependencies...
    npm install
    start http://127.0.0.1:3000
    cls
    node index.js
)

pause
