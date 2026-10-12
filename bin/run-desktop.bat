@echo off
chcp 65001 >nul

:: ============================================================
::  Smart Site V7 - Desktop Dev Runner
::  Usage: run-desktop.bat [electron|tauri]
::  Default: electron
:: ============================================================

set "TARGET=%~1"
if "%TARGET%"=="" set "TARGET=electron"

if /i "%TARGET%"=="electron" goto :run_electron
if /i "%TARGET%"=="tauri"   goto :run_tauri

echo [ERROR] Unknown target: %TARGET%
echo Usage: run-desktop.bat [electron^|tauri]
pause
exit /b 1

:run_electron
echo ====================================
echo   Smart Site Desktop Editor (Electron)
echo   Development Mode
echo ====================================
echo.

cd /d "%~dp0.."
echo Project root: %CD%
echo.

if not exist "package.json" (
    echo [ERROR] package.json not found
    pause
    exit /b 1
)

if not exist "ss-editor\apps\desktop\node_modules" (
    echo First run, installing dependencies...
    cd ss-editor\apps\desktop
    call pnpm install
    cd ..\..
    echo.
)

echo Starting desktop development mode...
echo.
cd /d "%CD%\ss-editor"
call pnpm dev:desktop

echo.
echo ====================================
echo   Program exited
echo ====================================
pause
exit /b 0

:run_tauri
echo ====================================
echo   Smart Site Desktop Editor (Tauri)
echo   Development Mode
echo ====================================
echo.

cd /d "%~dp0.."
echo Project root: %CD%
echo.

echo Checking Rust environment...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Rust environment not found!
    echo.
    echo Please install Rust first:
    echo 1. Visit https://rustup.rs/
    echo 2. Download and run rustup-init.exe
    echo 3. Restart your terminal
    echo.
    pause
    exit /b 1
)

rustc --version
echo.

echo Starting Tauri development mode...
echo.
cd /d "%CD%\ss-editor"
call pnpm dev:tauri

echo.
echo ====================================
echo   Program exited
echo ====================================
pause
exit /b 0
