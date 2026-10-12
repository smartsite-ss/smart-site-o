@echo off
chcp 65001 >nul

echo ================================================
echo       Building SS-SCADA Editor (Full)
echo ================================================

cd /d "%~dp0\..\..\.."
set "PROJECT_ROOT=%cd%"

echo [1/6] Cleaning previous builds...
rmdir /s /q "packages\core\dist" 2>nul
rmdir /s /q "packages/editor\dist" 2>nul
rmdir /s /q "apps\web\dist" 2>nul
echo Clean completed.

echo.
echo [2/6] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo.
echo [3/6] Building @scada-editor/core...
pnpm --filter @scada-editor/core build
if errorlevel 1 (
    echo ERROR: Failed to build @scada-editor/core!
    pause
    exit /b 1
)

echo.
echo [4/6] Building @scada-editor/editor...
pnpm --filter @scada-editor/editor build
if errorlevel 1 (
    echo ERROR: Failed to build @scada-editor/editor!
    pause
    exit /b 1
)

echo.
echo [5/6] Building scada-editor-web...
pnpm --filter scada-editor-web build
if errorlevel 1 (
    echo ERROR: Failed to build scada-editor-web!
    pause
    exit /b 1
)

echo.
echo [6/6] Building other apps...
pnpm --filter @ss/admin run build
pnpm --filter @ss/mobile run build
pnpm --filter @ss/scada run build

echo.
echo ================================================
echo        All builds completed successfully!
echo ================================================
pause