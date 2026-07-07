@echo off
setlocal
cd /d "%~dp0"

set "NODE_DIR=C:\Users\SSAFY\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "BIN_DIR=C:\Users\SSAFY\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
set "PNPM=%BIN_DIR%\pnpm.cmd"

if not exist "%PNPM%" (
  echo Could not find bundled pnpm at:
  echo %PNPM%
  pause
  exit /b 1
)

set "PATH=%NODE_DIR%;%BIN_DIR%;%PATH%"
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173/'"
"%PNPM%" dev -- --port 5173
pause
