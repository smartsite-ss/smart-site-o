@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Frontend Dev Launcher
::  Uses plugins-cli.js for unified build pipeline
:: ============================================================

:: Resolve paths relative to this script (bin/ directory)
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "SS_ROOT=%cd%"
set "EDITOR_DIR=%SS_ROOT%\ss-editor"

:: Detect package manager
where pnpm >nul 2>nul
if errorlevel 1 (
    where npm >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] No package manager found (pnpm or npm^)
        pause
        exit /b 1
    ) else (
        set "PKG_MANAGER=npm"
    )
) else (
    set "PKG_MANAGER=pnpm"
)

:: Read API target from frontend env
set "API_TARGET=localhost:3000"
if exist "%EDITOR_DIR%\apps\web\.env.development" (
    for /f "tokens=1,2 delims==" %%a in ('type "%EDITOR_DIR%\apps\web\.env.development" ^| findstr "VITE_API_BASE_URL"') do (
        if "%%a"=="VITE_API_BASE_URL" set "API_TARGET=%%b"
    )
)

echo.
echo ============================================================
echo   Smart Site V7 Frontend - Development Mode
echo ============================================================
echo.
echo [DIR]   %EDITOR_DIR%
echo [MODE]  Vite Dev Server
echo [PORT]  http://localhost:5173
echo [PROXY] /api -^> %API_TARGET%
echo.

cd /d "%EDITOR_DIR%"
echo Starting dev pipeline (plugins-cli.js dev)...
node packages\plugins\scripts\plugins-cli.cjs dev
if !ERRORLEVEL! NEQ 0 (
    echo [FAIL] Dev pipeline failed
    pause
    exit /b 1
)

echo.
echo [EXIT] Frontend process ended.
pause >nul