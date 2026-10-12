@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Publish & Deploy Backend (ss-node)
::  Build NestJS monorepo + deploy to ss-run/ss/services/ss-node
::  Strategy: build -> copy dist + node_modules + package.json
:: ============================================================

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "BLUE=[94m"
set "NC=[0m"

:: Resolve paths relative to ss-v7 root
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "SS_ROOT=%cd%"
set "NODE_SRC=%SS_ROOT%\ss-services\ss-node"
set "NODE_APP=%NODE_SRC%\apps\ss-node-server"
set "PUBLISH_TARGET=%SS_ROOT%\ss-run\ss\services\ss-node"
set "DATA_DIR=%SS_ROOT%\ss-run\ss\data"
set "DEFAULT_PORT=4000"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Smart Site V7 - Publish Backend (ss-node)    %NC%
echo %CYAN%===================================================%NC%
echo.

:: Check prerequisites
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Node.js not found. Please install Node.js 18+
    pause & exit /b 1
)
echo %GREEN%[OK]%NC% Node.js:
node --version

set "PKG_MANAGER="
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PKG_MANAGER=pnpm"
) else (
    echo %RED%[ERROR]%NC% pnpm not found. Please install pnpm first.
    pause & exit /b 1
)
echo %GREEN%[OK]%NC% Package Manager: %PKG_MANAGER%
echo.
echo %BLUE%[PATH]%NC% Project Root:      %SS_ROOT%
echo %BLUE%[PATH]%NC% Backend Source:    %NODE_SRC%
echo %BLUE%[PATH]%NC% Publish Target:    %PUBLISH_TARGET%
echo %BLUE%[PATH]%NC% Data Directory:    %DATA_DIR%
echo.

:: ============================================================
::  Menu (supports CLI arg: publish-node.bat [full|build|deploy|test])
:: ============================================================
set "NONINTERACTIVE=0"
if /i "%~1"=="full" set "NONINTERACTIVE=1" & goto :full_publish
if /i "%~1"=="build" set "NONINTERACTIVE=1" & goto :build_only
if /i "%~1"=="deploy" set "NONINTERACTIVE=1" & goto :deploy_only
if /i "%~1"=="test" set "NONINTERACTIVE=1" & goto :self_test_menu
if /i "%~1"=="selftest" set "NONINTERACTIVE=1" & goto :self_test_menu

:menu
echo %CYAN%===================================================%NC%
echo %CYAN%   Select Action                                  %NC%
echo %CYAN%===================================================%NC%
echo.
echo   [1] Full Publish (Build + Deploy)
echo   [2] Build Only
echo   [3] Deploy Only (use existing dist)
echo   [4] Self Test (start service + health check)
echo   [5] Exit
echo.
set /p MODE="Enter option (1-5): "

if "%MODE%"=="1" goto :full_publish
if "%MODE%"=="2" goto :build_only
if "%MODE%"=="3" goto :deploy_only
if "%MODE%"=="4" goto :self_test_menu
if "%MODE%"=="5" goto :end

echo %RED%[ERROR]%NC% Invalid selection
pause
goto :menu

:: ============================================================
::  Full Publish
:: ============================================================
:full_publish
call :do_build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    if "%NONINTERACTIVE%"=="1" goto :end
    pause & goto :menu
)

call :do_deploy
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Deploy failed
    if "%NONINTERACTIVE%"=="1" goto :end
    pause & goto :menu
)

echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   Full Publish Completed!                       %NC%
echo %GREEN%===================================================%NC%
echo.
call :print_summary
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Build Only
:: ============================================================
:build_only
call :do_build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    if "%NONINTERACTIVE%"=="1" goto :end
    pause & goto :menu
)
echo.
echo %GREEN%[SUCCESS]%NC% Build completed
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Build Backend (ss-node monorepo)
:: ============================================================
:do_build
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Building ss-node (NestJS monorepo)...           %NC%
echo %CYAN%===================================================%NC%
echo.

:: Step 1: Check dependencies
echo %BLUE%[1/3]%NC% Checking backend dependencies...
cd /d "%NODE_SRC%"
if not exist "node_modules" (
    echo %YELLOW%[INFO]%NC% Installing dependencies...
    call %PKG_MANAGER% install --no-frozen-lockfile
    if !ERRORLEVEL! NEQ 0 (
        echo %RED%[ERROR]%NC% Dependency installation failed
        exit /b 1
    )
)
echo %GREEN%[OK]%NC% Dependencies ready
echo.

:: Step 2: Clean old builds
:: Note: Must also delete tsconfig.tsbuildinfo (incremental cache).
:: If only dist/ is deleted, tsc with "incremental": true sees the stale cache,
:: thinks nothing changed, and silently skips emitting .js files -> empty dist.
echo %BLUE%[2/3]%NC% Cleaning previous builds...
if exist "%NODE_APP%\dist" rmdir /s /q "%NODE_APP%\dist" 2>nul
if exist "%NODE_APP%\tsconfig.tsbuildinfo" del /f /q "%NODE_APP%\tsconfig.tsbuildinfo" 2>nul
echo %GREEN%[OK]%NC% Cleaned
echo.

:: Step 3: Build all packages in monorepo
echo %BLUE%[3/5]%NC% Building all packages (pnpm -r build)...
call %PKG_MANAGER% -r build
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    exit /b 1
)

:: Step 4: Rebuild app with nest build (copies assets like logo.txt via nest-cli.json)
echo %BLUE%[4/5]%NC% Rebuilding app with nest build (production mode)...
if exist "%NODE_APP%\dist" rmdir /s /q "%NODE_APP%\dist" 2>nul
if exist "%NODE_APP%\tsconfig.build.tsbuildinfo" del /f /q "%NODE_APP%\tsconfig.build.tsbuildinfo" 2>nul
cd /d "%NODE_APP%"
call npx nest build
cd /d "%NODE_SRC%"
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Production build failed
    exit /b 1
)

:: Step 5: Verify build output
echo %BLUE%[5/5]%NC% Verifying build output...

:: Verify build output
if not exist "%NODE_APP%\dist\main.js" (
    echo %RED%[ERROR]%NC% Build output not found: %NODE_APP%\dist\main.js
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% Build completed
echo %GREEN%  Output: %NODE_APP%\dist%NC%
echo.
exit /b 0

:: ============================================================
::  Deploy Only
:: ============================================================
:deploy_only
if not exist "%NODE_APP%\dist\main.js" (
    echo %RED%[ERROR]%NC% Build output not found. Run build first.
    if "%NONINTERACTIVE%"=="1" goto :end
    pause
    goto :menu
)
call :do_deploy
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Deploy failed
    if "%NONINTERACTIVE%"=="1" goto :end
    pause & goto :menu
)
echo.
echo %GREEN%[SUCCESS]%NC% Deploy completed
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Deploy Backend to Target
::  Strategy: Delegate to deploy-ss-node.ps1 (PowerShell)
::  - Copy dist + workspace packages to staging
::  - Merge all 3rd-party deps from app + root + workspace packages
::  - pnpm install --prod --ignore-workspace (with local store)
::  - Swap staging to target (preserve .env)
::  - Generate runtime scripts
:: ============================================================
:do_deploy
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Deploying ss-node to publish target...          %NC%
echo %CYAN%===================================================%NC%
echo.

set "DEPLOY_PS1=%SCRIPT_DIR%deploy-ss-node.ps1"
if not exist "%DEPLOY_PS1%" (
    echo %RED%[ERROR]%NC% Deploy script not found: %DEPLOY_PS1%
    exit /b 1
)

echo %BLUE%[INFO]%NC% Calling PowerShell deploy script...
echo %BLUE%[INFO]%NC% %DEPLOY_PS1%
echo.

powershell -ExecutionPolicy Bypass -NoProfile -File "%DEPLOY_PS1%"
set "DEPLOY_EXIT=!ERRORLEVEL!"
if !DEPLOY_EXIT! NEQ 0 (
    echo %RED%[ERROR]%NC% Deploy script failed (exit code: !DEPLOY_EXIT!)
    exit /b !DEPLOY_EXIT!
)

echo.
echo %GREEN%[OK]%NC% Deploy completed
echo.
exit /b 0

:: ============================================================
::  Self Test Menu
:: ============================================================
:self_test_menu
if not exist "%PUBLISH_TARGET%\start.bat" (
    echo %RED%[ERROR]%NC% Publish target not found: %PUBLISH_TARGET%
    echo %YELLOW%[INFO]%NC% Please run Full Publish first.
    if "%NONINTERACTIVE%"=="1" goto :end
    pause
    goto :menu
)
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Running Self Test...                            %NC%
echo %CYAN%===================================================%NC%
call "%PUBLISH_TARGET%\self-test.bat"
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Summary
:: ============================================================
:print_summary
echo %BLUE%  Component         Path                                          %NC%
echo %BLUE%  ----------------  --------------------------------------------  %NC%
echo %BLUE%  Backend Source    %NODE_SRC%                                     %NC%
echo %BLUE%  Build Output      %NODE_APP%\dist                              %NC%
echo %BLUE%  Publish Target    %PUBLISH_TARGET%                               %NC%
echo %BLUE%  Data Directory    %DATA_DIR%                                     %NC%
echo.
echo %YELLOW%  Quick Start:%NC%
echo     Double-click: %PUBLISH_TARGET%\start.bat
echo.
echo %YELLOW%  Manual Control:%NC%
echo     Start (foreground):  %PUBLISH_TARGET%\start.bat
echo     Start (background):  %PUBLISH_TARGET%\start-service.bat
echo     Stop:                %PUBLISH_TARGET%\stop-service.bat
echo     Status:              %PUBLISH_TARGET%\status.bat
echo     Self Test:           %PUBLISH_TARGET%\self-test.bat
echo.
echo %YELLOW%  URLs:%NC%
echo     API:      http://localhost:%DEFAULT_PORT%
echo     Swagger:  http://localhost:%DEFAULT_PORT%/api/docs
echo     Health:   http://localhost:%DEFAULT_PORT%/api/v1/system/health
echo.
echo %YELLOW%  Ports:%NC%
echo     Backend:  %DEFAULT_PORT%
echo.
exit /b 0

:: ============================================================
::  Exit
:: ============================================================
:end
echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   Publish Node Script Exited                     %NC%
echo %GREEN%===================================================%NC%
echo.
endlocal
