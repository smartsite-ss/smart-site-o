@echo off
:: Smart SCADA - ss-node Build and Publish Script
:: One-click build and publish workflow

setlocal enabledelayedexpansion

echo ========================================
echo     Smart SCADA - Build and Publish
echo ========================================
echo.

cd /d "%~dp0.."
set "PROJECT_ROOT=%cd%"
set "BIN_DIR=%PROJECT_ROOT%\bin"

echo [INFO] Project Root: %PROJECT_ROOT%
echo [INFO] Script Directory: %BIN_DIR%
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

set "PKG_MANAGER="
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PKG_MANAGER=pnpm"
) else (
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PKG_MANAGER=npm"
    ) else (
        echo [ERROR] Package manager not found
        pause
        exit /b 1
    )
)

:menu
cls
echo ========================================
echo     Smart SCADA - Build and Publish Center
echo ========================================
echo.
echo   [1] Full Flow (Build + Publish)
echo   [2] Build Only
echo   [3] Publish Only
echo   [4] Build + Publish + Start Service
echo   [5] Exit
echo.
set /p MODE="Enter option (1-5): "

if "%MODE%"=="1" goto :full_flow
if "%MODE%"=="2" goto :only_build
if "%MODE%"=="3" goto :only_publish
if "%MODE%"=="4" goto :full_flow_with_start
if "%MODE%"=="5" goto :end

echo [ERROR] Invalid selection
pause
goto :menu

:full_flow
call :do_build
if %ERRORLEVEL% NEQ 0 exit /b 1
call :do_publish
if %ERRORLEVEL% NEQ 0 exit /b 1
goto :complete

:full_flow_with_start
call :do_build
if %ERRORLEVEL% NEQ 0 exit /b 1
call :do_publish
if %ERRORLEVEL% NEQ 0 exit /b 1
call :do_start
goto :complete

:only_build
call :do_build
if %ERRORLEVEL% NEQ 0 exit /b 1
goto :complete

:only_publish
call :do_publish
if %ERRORLEVEL% NEQ 0 exit /b 1
goto :complete

:do_build
echo.
echo ========================================
echo     Step 1: Build Project
echo ========================================
echo.
echo [INFO] Starting build...
call "%BIN_DIR%\build_ss_node.bat" quick_build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [SUCCESS] Build completed
echo.
goto :eof

:do_publish
echo.
echo ========================================
echo     Step 2: Publish Project
echo ========================================
echo.
echo [INFO] Starting publish...
call "%BIN_DIR%\publish_ss_node.bat" full_publish
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Publish failed
    pause
    exit /b 1
)
echo [SUCCESS] Publish completed
echo.
goto :eof

:do_start
echo.
echo ========================================
echo     Step 3: Start Service
echo ========================================
echo.
set "TARGET_DIR=F:\work\smartdata\202603_trace\trunk\code\ss-v7\ss-run\ss\services\ss-node"
echo [INFO] Starting service...
start "" "%TARGET_DIR%\start.bat"
echo [INFO] Service startup script executed
echo [INFO] Please wait for service to start
echo.
echo [INFO] Service URL: http://localhost:4000
echo.
timeout /t 3 /nobreak >nul
start "" http://localhost:4000
goto :eof

:complete
echo.
echo ========================================
echo     Operation Complete
echo ========================================
echo.
echo [SUCCESS] All operations completed
echo.
echo [INFO] Publish Directory:
echo        F:\work\smartdata\202603_trace\trunk\code\ss-v7\ss-run\ss\services\ss-node
echo.
echo [Available Scripts]
echo   start.bat          - Start service
echo   start-service.bat  - Start in background
echo   stop-service.bat   - Stop service
echo   status.bat         - Check status
echo.
pause
goto :menu

:end
echo.
echo ========================================
echo     Thank you for using Smart SCADA
echo ========================================
echo.