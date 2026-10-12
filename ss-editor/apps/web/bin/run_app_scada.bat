@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ================================================
echo          SS-SCADA Editor Development
echo ================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%\..\..\.."
set "PROJECT_ROOT=%cd%"

echo Project Root: !PROJECT_ROOT!
echo.

if not exist "packages\core" (
    echo ERROR: Not in the correct project directory!
    pause
    exit /b 1
)

echo [1/4] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
    if !errorlevel! equ 1 (
        echo.
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)
echo Dependencies OK.

echo.
echo [2/4] Building @scada-editor/core...
pnpm --filter @scada-editor/core build
if !errorlevel! equ 1 (
    echo ERROR: Failed to build @scada-editor/core!
    pause
    exit /b 1
)
echo @scada-editor/core built successfully.

echo.
echo [3/4] Building @scada-editor/editor...
pnpm --filter @scada-editor/editor build
if !errorlevel! equ 1 (
    echo ERROR: Failed to build @scada-editor/editor!
    pause
    exit /b 1
)
echo @scada-editor/editor built successfully.

echo.
echo [4/4] Starting development server with HMR...
echo ================================================
echo.
echo Server will start at: http://localhost:5173
echo Hot Update: Frontend files (Vue/TS/SCSS) - Auto
echo Hot Update: Core/UI libraries - Use build --watch
echo Press Ctrl+C to stop the server.
echo.

pnpm --filter scada-editor-web dev --host

echo.
echo ================================================
echo SS-SCADA editor stopped!
echo ================================================
pause
endlocal