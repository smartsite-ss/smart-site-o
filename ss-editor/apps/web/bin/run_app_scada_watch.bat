@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%..\..\.."
set "EDITOR_ROOT=%cd%"

echo Starting SS-SCADA Editor with full HMR support...
echo Editor Root: !EDITOR_ROOT!
echo.

echo Step 1: Build @scada-editor/core...
pushd "!EDITOR_ROOT!\packages\core"
call pnpm build
if errorlevel 1 (
    echo ERROR: Failed to build @scada-editor/core!
    popd
    pause
    exit /b 1
)
popd
echo @scada-editor/core built successfully.
echo.

echo Step 2: Build @scada-editor/editor...
pushd "!EDITOR_ROOT!\packages\editor"
call pnpm build
if errorlevel 1 (
    echo ERROR: Failed to build @scada-editor/editor!
    popd
    pause
    exit /b 1
)
popd
echo @scada-editor/editor built successfully.
echo.

echo Step 3: Start development server...
echo Server will start at http://localhost:5173
echo Press Ctrl+C to stop.
echo.

 

pushd "!EDITOR_ROOT!"
call pnpm --filter scada-editor-web dev --host 
popd

echo Server stopped.
pause
endlocal