@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     Smart SCADA - ss-node Service       
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT_ROOT=%cd%"
popd

echo [INFO] Project Root: %PROJECT_ROOT%
echo [INFO] Script Directory: %SCRIPT_DIR%
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found, please install Node.js 18+
    pause
    exit /b 1
)

echo [INFO] Node.js Version:
node --version
echo.

set "PKG_MANAGER="
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PKG_MANAGER=pnpm"
    echo [INFO] Using package manager: pnpm
) else (
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PKG_MANAGER=npm"
        echo [INFO] Using package manager: npm
    ) else (
        echo [ERROR] Neither npm nor pnpm found, please install Node.js
        pause
        exit /b 1
    )
)
echo.

if not exist "%PROJECT_ROOT%\node_modules" (
    echo [WARN] node_modules not found at %PROJECT_ROOT%
    echo [INFO] Installing dependencies...
    cd /d "%PROJECT_ROOT%"
    %PKG_MANAGER% install --no-frozen-lockfile
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Dependency installation failed
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully
    echo.
)

:menu
echo ========================================
echo    Select Run Mode
echo ========================================
echo.
echo   [1] Development Mode (Hot Reload)
echo   [2] Debug Mode (With Debugger)
echo   [3] Production Mode (Compiled)
echo   [4] Build Only
echo   [5] Exit
echo.
set /p MODE="Enter option (1-5): "

if "%MODE%"=="1" goto :dev
if "%MODE%"=="2" goto :debug
if "%MODE%"=="3" goto :prod
if "%MODE%"=="4" goto :build
if "%MODE%"=="5" goto :end

echo [ERROR] Invalid selection, please try again
echo.
goto :menu

:dev
echo.
echo ========================================
echo    Development Mode (Hot Reload)
echo ========================================
echo.
set "APP_DIR=%PROJECT_ROOT%\apps\ss-node-server"
echo [INFO] Application Directory: %APP_DIR%
if not exist "%APP_DIR%\package.json" (
    echo [ERROR] Application directory not found: %APP_DIR%
    pause
    goto :menu
)
cd /d "%APP_DIR%"
echo [INFO] Running: %PKG_MANAGER% run start:dev
echo.
%PKG_MANAGER% run start:dev
goto :end

:debug
echo.
echo ========================================
echo    Debug Mode
echo ========================================
echo.
set "APP_DIR=%PROJECT_ROOT%\apps\ss-node-server"
echo [INFO] Application Directory: %APP_DIR%
if not exist "%APP_DIR%\package.json" (
    echo [ERROR] Application directory not found: %APP_DIR%
    pause
    goto :menu
)
cd /d "%PROJECT_ROOT%"
echo [INFO] Running: %PKG_MANAGER% --filter ss-node-server run start:debug
echo.
%PKG_MANAGER% --filter ss-node-server run start:debug
goto :end

:prod
echo.
echo ========================================
echo    Production Mode
echo ========================================
echo.
set "APP_DIR=%PROJECT_ROOT%\apps\ss-node-server"
set "DIST_DIR=%APP_DIR%\dist"
echo [INFO] Application Directory: %APP_DIR%
echo [INFO] Dist Directory: %DIST_DIR%

if not exist "%DIST_DIR%\main.js" (
    echo [WARN] Compiled files not found at %DIST_DIR%
    echo [INFO] Building project...
    cd /d "%PROJECT_ROOT%"
    %PKG_MANAGER% --filter ss-node-server build
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Build failed
        pause
        goto :menu
    )
)

echo [INFO] Starting compiled application from %DIST_DIR%...
echo.
cd /d "%DIST_DIR%"
set APP_ENV=pro
node main.js
goto :end

:build
echo.
echo ========================================
echo    Building Project
echo ========================================
echo.
cd /d "%PROJECT_ROOT%"
%PKG_MANAGER% -r build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    goto :menu
)
echo [SUCCESS] Build completed
echo [INFO] Output directory: apps/ss-node-server/dist/
pause
goto :menu

:end
echo.
echo ========================================
echo    Service Stopped
echo ========================================
echo.
