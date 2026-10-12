
@echo off
:: Smart SCADA - ss-node Quick Debug Launcher
:: One-click debug mode startup (no menu selection required)

setlocal enabledelayedexpansion

:: Color definitions
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

echo %CYAN%========================================%NC%
echo %CYAN%  Smart SCADA - Debug Mode Launcher   %NC%
echo %CYAN%========================================%NC%
echo.

:: Switch to project root
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT_ROOT=%cd%"
popd

set "APP_DIR=%PROJECT_ROOT%\apps\ss-node-server"

echo [INFO] Project Root: %PROJECT_ROOT%
echo [INFO] Application: %APP_DIR%
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Node.js not found, please install Node.js 18+
    pause
    exit /b 1
)

echo [INFO] Node.js Version:
node --version
echo.

:: Detect package manager
set "PKG_MANAGER="
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PKG_MANAGER=pnpm"
    echo [INFO] Package Manager: pnpm
) else (
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PKG_MANAGER=npm"
        echo [INFO] Package Manager: npm
    ) else (
        echo %RED%[ERROR]%NC% Package manager not found
        pause
        exit /b 1
    )
)
echo.

:: Auto-install dependencies if needed
if not exist "%PROJECT_ROOT%\node_modules" (
    echo %YELLOW%[WARNING]%NC% node_modules not found, installing...
    cd /d "%PROJECT_ROOT%"
    %PKG_MANAGER% install
    if %ERRORLEVEL% NEQ 0 (
        echo %RED%[ERROR]%NC% Dependency installation failed
        pause
        exit /b 1
    )
    echo %GREEN%[SUCCESS]%NC% Dependencies installed
    echo.
)

:: Check application directory
if not exist "%APP_DIR%\package.json" (
    echo %RED%[ERROR]%NC% Application directory not found: %APP_DIR%
    pause
    exit /b 1
)

:: Start Debug Mode
echo.
echo %GREEN%========================================%NC%
echo %GREEN%  Starting Debug Mode (Hot Reload)     %NC%
echo %GREEN%========================================%NC%
echo.
echo [INFO] Mode: Development with Hot Reload
echo [INFO] Watch: Enabled (auto-restart on file changes)
echo [INFO] Debug Port: 9229 (Chrome DevTools)
echo [INFO] API URL: http://localhost:4000
echo.
echo %YELLOW%Press Ctrl+C to stop the server%NC%
echo.

cd /d "%APP_DIR%"
%PKG_MANAGER% run start:dev

:: If server crashes
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %RED%[ERROR]%NC% Server exited with error code: %ERRORLEVEL%
    echo.
    echo [TIP] Check the logs above for error details
    echo [TIP] Common fixes:
    echo      1. Ensure port 4000 is not in use
    echo      2. Check database connection in .env.ss
    echo      3. Run 'pnpm build' to check for compilation errors
)

echo.
pause
