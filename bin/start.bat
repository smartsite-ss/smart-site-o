@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Full Stack Development Launcher
::  Starts Backend (NestJS) + Frontend (Vite) simultaneously
:: ============================================================

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "BLUE=[94m"
set "NC=[0m"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Smart Site V7 - Full Stack Dev Launcher     %NC%
echo %CYAN%===================================================%NC%
echo.

:: Resolve paths relative to ss-v7 root
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "SS_ROOT=%cd%"
set "NODE_DIR=%SS_ROOT%\ss-services\ss-node"
set "EDITOR_DIR=%SS_ROOT%\ss-editor"

echo %BLUE%[PATH]%NC% Project Root:     %SS_ROOT%
echo %BLUE%[PATH]%NC% Backend:          %NODE_DIR%
echo %BLUE%[PATH]%NC% Frontend:         %EDITOR_DIR%
echo.

:: Check prerequisites
where node >nul 2>nul
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Node.js not found. Please install Node.js 18+
    pause & exit /b 1
)

for /f "delims=" %%v in ('node --version') do echo %GREEN%[OK]%NC% Node.js: %%v

where pnpm >nul 2>nul
if errorlevel 1 (
    where npm >nul 2>nul
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% No package manager found (pnpm or npm)
        pause & exit /b 1
    ) else (
        set "PKG_MANAGER=npm"
    )
) else (
    set "PKG_MANAGER=pnpm"
)
echo %GREEN%[OK]%NC% Package Manager: !PKG_MANAGER!
echo.

:: Check port availability
netstat -an | findstr ":3000 " >nul 2>nul
if not errorlevel 1 (
    echo %YELLOW%[WARN]%NC% Port 3000 is already in use. Backend may fail to start.
    echo.
)

netstat -an | findstr ":5173 " >nul 2>nul
if not errorlevel 1 (
    echo %YELLOW%[WARN]%NC% Port 5173 is already in use. Frontend may fail to start.
    echo.
)

:: Read frontend env for API target (optional display)
set "API_TARGET=localhost:3000"
if exist "%EDITOR_DIR%\apps\web\.env.development" (
    for /f "tokens=1,2 delims==" %%a in ('type "%EDITOR_DIR%\apps\web\.env.development" ^| findstr "VITE_API_BASE_URL"') do (
        if "%%a"=="VITE_API_BASE_URL" set "API_TARGET=%%b"
    )
)
echo %BLUE%[CONFIG]%NC% API Proxy Target: %API_TARGET%
echo.

:: ============================================================
::  Launch Backend (Terminal 1)
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [1/2] Starting Backend (NestJS) ...              %NC%
echo %CYAN%---------------------------------------------------%NC%

start "ss-node" cmd /c "%SS_ROOT%\bin\start-backend.bat"

echo %GREEN%[LAUNCHED]%NC% Backend started in new window
echo.

:: ============================================================
::  Launch Frontend (Terminal 2)
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [2/2] Starting Frontend (Vite) ...               %NC%
echo %CYAN%---------------------------------------------------%NC%

start "ss-web" cmd /c "%SS_ROOT%\bin\start-frontend.bat"

echo %GREEN%[LAUNCHED]%NC% Frontend started in new window
echo.

:: ============================================================
::  Summary
:: ============================================================
echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   All Services Launched!                         %NC%
echo %GREEN%===================================================%NC%
echo.
echo %BLUE%  Service           URL                              %NC%
echo %BLUE%  ----------------  --------------------------------%NC%
echo %BLUE%  Frontend (Vite)   http://localhost:5173            %NC%
echo %BLUE%  Editor Page       http://localhost:5173/editor     %NC%
echo %BLUE%  System Page       http://localhost:5173/system     %NC%
echo %BLUE%  Backend (NestJS)  http://localhost:3000            %NC%
echo %BLUE%  Swagger Docs      http://localhost:3000/api/docs   %NC%
echo %BLUE%  Health Check      http://localhost:3000/system/health %NC%
echo.
echo %YELLOW%  Tips:%NC%
echo %YELLOW%  - Close individual windows to stop each service   %NC%
echo %YELLOW%  - Modify .env.development to change backend port %NC%
echo %YELLOW%  - Check browser F12 Network tab for API errors   %NC%
echo.
pause
endlocal
