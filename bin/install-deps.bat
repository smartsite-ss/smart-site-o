@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 (ss-o) - Dependency Install Script
::  Target: fresh environment (new machine / CI)
::  Installs dependency libraries for:
::    1. Frontend workspace : ss-editor
::    2. Backend  workspace : ss-services/ss-node
::  Usage: bin\install-deps.bat
:: ============================================================

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "BLUE=[94m"
set "NC=[0m"

:: Resolve project root (parent of bin/)
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "SS_ROOT=%cd%"
set "EDITOR_DIR=%SS_ROOT%\ss-editor"
set "NODE_DIR=%SS_ROOT%\ss-services\ss-node"

:: Pinned pnpm version (matches root package.json "packageManager")
set "PNPM_VERSION=11.21.0"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Smart Site V7 - Dependency Install            %NC%
echo %CYAN%===================================================%NC%
echo.
echo %BLUE%[PATH]%NC% Project Root : %SS_ROOT%
echo %BLUE%[PATH]%NC% Frontend     : %EDITOR_DIR%
echo %BLUE%[PATH]%NC% Backend      : %NODE_DIR%
echo.

:: ============================================================
:: Step 1: Check Node.js (>= 18 required)
:: ============================================================
echo %CYAN%[1/4] Checking Node.js ...%NC%
where node >nul 2>nul
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Node.js not found. Please install Node.js 18 or newer.
    pause & exit /b 1
)
for /f "tokens=1 delims=." %%a in ('node --version') do set "NODE_MAJOR=%%a"
set "NODE_MAJOR=%NODE_MAJOR:v=%"
if %NODE_MAJOR% LSS 18 (
    echo %RED%[ERROR]%NC% Node.js %NODE_MAJOR% detected. Node.js 18+ is required.
    pause & exit /b 1
)
for /f "delims=" %%v in ('node --version') do echo %GREEN%[OK]%NC% Node.js: %%v
echo.

:: ============================================================
:: Step 2: Ensure pnpm is available (pin to 11.21.0)
:: ============================================================
echo %CYAN%[2/4] Ensuring pnpm ...%NC%
where pnpm >nul 2>nul
if errorlevel 1 (
    echo %YELLOW%[WARN]%NC% pnpm not found. Trying to install pnpm@%PNPM_VERSION% ...
    :: Prefer corepack (ships with Node.js), fall back to npm global install
    corepack enable >nul 2>&1
    if not errorlevel 1 (
        corepack prepare pnpm@%PNPM_VERSION% --activate >nul 2>&1
    )
    where pnpm >nul 2>nul
    if errorlevel 1 (
        echo %YELLOW%[WARN]%NC% corepack unavailable, installing via npm -g pnpm@%PNPM_VERSION% ...
        call npm install -g pnpm@%PNPM_VERSION%
        if errorlevel 1 (
            echo %RED%[ERROR]%NC% Failed to install pnpm. Please install it manually:
            echo         npm install -g pnpm@%PNPM_VERSION%
            pause & exit /b 1
        )
    )
) else (
    :: pnpm exists; align to pinned version to avoid lockfile mismatch
    call pnpm --version | findstr "%PNPM_VERSION%" >nul 2>&1
    if errorlevel 1 (
        echo %YELLOW%[WARN]%NC% pnpm version mismatch. Aligning to pnpm@%PNPM_VERSION% ...
        call npm install -g pnpm@%PNPM_VERSION% >nul 2>&1
    )
)
for /f "delims=" %%v in ('pnpm --version') do echo %GREEN%[OK]%NC% pnpm: %%v
echo.

:: ============================================================
:: Step 3: Install frontend dependencies (ss-editor)
:: ============================================================
echo %CYAN%[3/4] Installing frontend dependencies ...%NC%
if not exist "%EDITOR_DIR%" (
    echo %RED%[ERROR]%NC% Frontend directory not found: %EDITOR_DIR%
    pause & exit /b 1
)
cd /d "%EDITOR_DIR%"
call pnpm install
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Frontend dependency install failed.
    pause & exit /b 1
)
echo %GREEN%[OK]%NC% Frontend dependencies installed.
echo.

:: ============================================================
:: Step 4: Install backend dependencies (ss-services/ss-node)
:: ============================================================
echo %CYAN%[4/4] Installing backend dependencies ...%NC%
if not exist "%NODE_DIR%" (
    echo %RED%[ERROR]%NC% Backend directory not found: %NODE_DIR%
    pause & exit /b 1
)
cd /d "%NODE_DIR%"
call pnpm install
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Backend dependency install failed.
    pause & exit /b 1
)
echo %GREEN%[OK]%NC% Backend dependencies installed.
echo.

:: ============================================================
:: Summary
:: ============================================================
echo %GREEN%===================================================%NC%
echo %GREEN%   All dependencies installed successfully!       %NC%
echo %GREEN%===================================================%NC%
echo.
echo %BLUE%  Next steps:%NC%
echo %BLUE%  - Frontend dev : bin\start-frontend.bat          %NC%
echo %BLUE%  - Backend  dev : bin\start-backend.bat           %NC%
echo %BLUE%  - Full stack   : bin\start.bat                   %NC%
echo.
echo %YELLOW%  Note:%NC%
echo %YELLOW%  Native modules (better-sqlite3, sqlite3, bcrypt,%NC%
echo %YELLOW%  serialport) need a C/C++ build toolchain.%NC%
echo %YELLOW%  On Windows install "Visual Studio Build Tools"%NC%
echo %YELLOW%  (Desktop development with C++) and Python 3.%NC%
echo %YELLOW%  Prebuilt binaries are used when available.%NC%
echo.
echo %YELLOW%  Tip: for reproducible installs use:%NC%
echo %YELLOW%  pnpm install --frozen-lockfile%NC%
echo.
pause
endlocal
