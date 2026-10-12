@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Backend Dev Launcher
::  Called by start.bat or can be used standalone
:: ============================================================

:: Resolve paths relative to this script (bin/ directory)
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "SS_ROOT=%cd%"
set "NODE_DIR=%SS_ROOT%\ss-services\ss-node"

:: Set UV_THREADPOOL_SIZE before Node starts (must be in environment, not dotenv)
set UV_THREADPOOL_SIZE=8

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

echo.
echo ============================================================
echo   Smart Site V7 Backend - Development Mode
echo ============================================================
echo.
echo [DIR]  %NODE_DIR%
echo [MODE] Development Hot-Reload
echo [PORT] http://localhost:4000
echo [DOCS] http://localhost:4000/api/docs
echo [DEBUG] Chrome DevTools port 9229
echo.
echo [INFO] Package Manager: !PKG_MANAGER!
echo.

cd /d "%NODE_DIR%"

:: Timing: use PowerShell to get high-resolution timestamps
echo.
echo [STARTUP] Phase A: Installing dependencies ...
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'"') do set "T0=%%t"
echo [STARTUP] Start: !T0!
call !PKG_MANAGER! install
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'"') do set "T1=%%t"
echo [STARTUP] Phase A done: !T1!

echo.
echo [STARTUP] Phase B: Building all packages ...
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'"') do set "T2=%%t"
echo [STARTUP] Start: !T2!
call !PKG_MANAGER! build
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'"') do set "T3=%%t"
echo [STARTUP] Phase B done: !T3!

echo.
echo [STARTUP] Phase C: Copying SQL init scripts to data dir ...
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'"') do set "T4=%%t"
echo [STARTUP] Start: !T4!
if not exist "%SS_ROOT%\ss-run\ss\data\init" mkdir "%SS_ROOT%\ss-run\ss\data\init"
xcopy /Y /Q "%NODE_DIR%\data\init\*.sql" "%SS_ROOT%\ss-run\ss\data\init\" >nul 2>&1
echo [STARTUP] Phase C done: Init scripts synced

echo.
echo [STARTUP] Phase D: NestJS dev server ...
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'"') do set "T5=%%t"
echo [STARTUP] Start: !T5!
call !PKG_MANAGER! --filter ss-node-server start:dev

echo.
echo [EXIT] Backend process ended. Press any key to close...
pause >nul
endlocal