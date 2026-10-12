@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Desktop (Electron) Build & Publish
::  Build Electron app + deploy to ss-run/desktop
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
set "EDITOR_DIR=%SS_ROOT%\ss-editor"
set "RUN_DIR=%SS_ROOT%\ss-run"
set "PUBLISH_DESKTOP=%RUN_DIR%\desktop"
set "DESKTOP_SRC=%EDITOR_DIR%\apps\desktop"
set "DESKTOP_RELEASE=%DESKTOP_SRC%\release"
set "DESKTOP_PACKAGE=%DESKTOP_SRC%\package.json"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Smart Site V7 - Desktop (Electron) Publish   %NC%
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

echo %BLUE%[PATH]%NC% Project Root:     %SS_ROOT%
echo %BLUE%[PATH]%NC% Frontend Source:  %EDITOR_DIR%
echo %BLUE%[PATH]%NC% Publish Target:   %PUBLISH_DESKTOP%
echo %BLUE%[PATH]%NC% Build Output:     %DESKTOP_RELEASE%
echo.

:: ============================================================
::  Menu
:: ============================================================
:menu
echo %CYAN%===================================================%NC%
echo %CYAN%   Select Action                                  %NC%
echo %CYAN%===================================================%NC%
echo.
echo   [1] Full Publish (Build + Deploy)
echo   [2] Build Only
echo   [3] Deploy Only ^(copy release to ss-run\desktop^)
echo   [4] Show Build Output
echo   [5] Exit
echo.
set /p MODE="Enter option (1-5): "

if "%MODE%"=="1" goto :full_publish
if "%MODE%"=="2" goto :build_only
if "%MODE%"=="3" goto :deploy_only
if "%MODE%"=="4" goto :show_output
if "%MODE%"=="5" goto :end

echo %RED%[ERROR]%NC% Invalid selection
pause
goto :end

:: ============================================================
::  Full Publish
:: ============================================================
:full_publish
call :do_build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    pause & goto :end
)

call :do_deploy

echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   Full Publish Completed!                       %NC%
echo %GREEN%===================================================%NC%
echo.
call :print_summary
pause
goto :end

:: ============================================================
::  Build Only
:: ============================================================
:build_only
call :do_build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    pause & goto :end
)
echo.
echo %GREEN%[SUCCESS]%NC% Build completed
echo %GREEN%  Output: %DESKTOP_RELEASE%%NC%
echo.
pause
goto :end

:: ============================================================
::  Clean Target Directory
::  Delegates to force-clean.ps1 (kills leftover build
::  processes, takes ownership, retries removal).
:: ============================================================
:clean_target
if exist "%~1" (
    echo   Cleaning: %~1
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0force-clean.ps1" -target "%~1" 2>nul
    if exist "%~1" (
        echo   [WARN] Could not fully remove: %~1
        echo   Try running bin\force-clean.ps1 -target "%~1" manually,
        echo   or restart the machine to clear locked system handles.
    )
)
exit /b 0

:: ============================================================
::  Build Desktop (Electron)
:: ============================================================
:do_build
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Building Desktop (Electron)...                  %NC%
echo %CYAN%===================================================%NC%
echo.

:: Step 1: Check dependencies
echo %BLUE%[1/3]%NC% Checking dependencies...
cd /d "%EDITOR_DIR%"
if not exist "node_modules" (
    echo %YELLOW%[INFO]%NC% Installing dependencies...
    call %PKG_MANAGER% install
    if !ERRORLEVEL! NEQ 0 (
        echo %RED%[ERROR]%NC% Dependency installation failed
        exit /b 1
    )
)
echo %GREEN%[OK]%NC% Dependencies ready
echo.

:: Step 2: Clean old builds
echo %BLUE%[2/3]%NC% Cleaning previous builds...
call :clean_target "%DESKTOP_RELEASE%"
call :clean_target "%DESKTOP_SRC%\dist"
call :clean_target "%DESKTOP_SRC%\dist-electron"
echo %GREEN%[OK]%NC% Cleaned
echo.

:: Step 3: Build core packages + desktop
echo %BLUE%[3/3]%NC% Building core packages + Electron app...
echo.
echo   [3.1] Building @scada-editor/core...
call %PKG_MANAGER% --filter @scada-editor/core build
if !ERRORLEVEL! NEQ 0 exit /b 1

echo   [3.2] Building @scada-editor/editor...
call %PKG_MANAGER% --filter @scada-editor/editor build
if !ERRORLEVEL! NEQ 0 exit /b 1

echo   [3.3] Building @scada-editor/system...
call %PKG_MANAGER% --filter @scada-editor/system build
if !ERRORLEVEL! NEQ 0 exit /b 1

echo   [3.4] Building Electron app (vite build + electron-builder^)...
call %PKG_MANAGER% build:desktop
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Electron build failed
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% Build completed
echo %GREEN%  Output: %DESKTOP_RELEASE%%NC%
echo.
exit /b 0

:: ============================================================
::  Deploy Only
:: ============================================================
:deploy_only
call :do_deploy
pause
goto :end

:: ============================================================
::  Deploy to ss-run/desktop
:: ============================================================
:do_deploy
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Deploying to ss-run\desktop...                   %NC%
echo %CYAN%===================================================%NC%

if not exist "%DESKTOP_RELEASE%" (
    echo %RED%[ERROR]%NC% Build output not found at:
    echo    %DESKTOP_RELEASE%
    echo    Run build first (option [2]^)
    pause
    exit /b 1
)

:: Create target directory
echo %BLUE%[1/2]%NC% Preparing target directory...
mkdir "%PUBLISH_DESKTOP%" >nul 2>&1

:: Clean previous deployment
if exist "%PUBLISH_DESKTOP%\*.exe" (
    del /f /q "%PUBLISH_DESKTOP%\*.exe" 2>nul
)
if exist "%PUBLISH_DESKTOP%\*.blockmap" (
    del /f /q "%PUBLISH_DESKTOP%\*.blockmap" 2>nul
)
if exist "%PUBLISH_DESKTOP%\*.yml" (
    del /f /q "%PUBLISH_DESKTOP%\*.yml" 2>nul
)

:: Copy build output
echo %BLUE%[2/2]%NC% Copying installer files...
xcopy /E /I /Y /Q "%DESKTOP_RELEASE%\*" "%PUBLISH_DESKTOP%\"

set FILE_COUNT=0
for /f %%a in ('dir /b "%PUBLISH_DESKTOP%\*" 2^>nul ^| find /c /v ""') do set FILE_COUNT=%%a
echo %GREEN%[OK]%NC% Deployed !FILE_COUNT! file(s^) to:
echo    %PUBLISH_DESKTOP%
echo.

:: Generate runtime batch
call :generate_runtime_scripts
exit /b 0

:: ============================================================
::  Generate Runtime Scripts
:: ============================================================
:generate_runtime_scripts
echo %BLUE%[SCRIPT]%NC% Generating runtime script...

(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%%~dp0"
echo echo ========================================
echo echo   Smart Site V7 - Desktop ^(Electron^)
echo echo   Runtime Launcher
echo echo ========================================
echo echo.
echo echo App:
echo if exist "win-unpacked\Smart Site Editor.exe" ^(
echo     echo   win-unpacked\Smart Site Editor.exe
echo     echo.
echo     echo Launching...
echo     start "" "win-unpacked\Smart Site Editor.exe"
echo ^) else ^(
echo     echo   win-unpacked\Smart Site Editor.exe not found
echo ^)
echo pause
) > "%PUBLISH_DESKTOP%\run.bat"

echo %GREEN%[OK]%NC% Runtime script generated:
echo    run.bat
echo.
exit /b 0

:: ============================================================
::  Show Build Output
:: ============================================================
:show_output
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Desktop (Electron) Build Output                 %NC%
echo %CYAN%===================================================%NC%
echo.

if not exist "%DESKTOP_RELEASE%" (
    echo %YELLOW%[WARN]%NC% No build output found.
    echo    Expected: %DESKTOP_RELEASE%
    echo    Run build first (option [2]^)
    pause
    goto :end
)

echo %GREEN%[OK]%NC% Build output: %DESKTOP_RELEASE%
echo.
echo App:
if exist "%DESKTOP_RELEASE%\win-unpacked\Smart Site Editor.exe" (
    echo   win-unpacked\Smart Site Editor.exe
    echo.
    echo File count:
    dir /s /b "%DESKTOP_RELEASE%\win-unpacked" 2>nul | find /c /v ""
) else (
    echo %YELLOW%[WARN]%NC% win-unpacked\Smart Site Editor.exe not found
)
echo.
pause
goto :end

:: ============================================================
::  Summary
:: ============================================================
:print_summary
echo %BLUE%  Component              Path                                     %NC%
echo %BLUE%  ---------------------  ---------------------------------------  %NC%
echo %BLUE%  Build Output           %DESKTOP_RELEASE%                       %NC%
echo %BLUE%  Publish Target         %PUBLISH_DESKTOP%                      %NC%
echo %BLUE%  Runtime Launcher       %PUBLISH_DESKTOP%\run.bat             %NC%
echo.
echo %YELLOW%  Publish Target Contents:%NC%
if exist "%PUBLISH_DESKTOP%\win-unpacked\Smart Site Editor.exe" (
    echo    win-unpacked\Smart Site Editor.exe
)
echo.
echo %YELLOW%  Quick Start:%NC%
echo     Run: ss-run\desktop\run.bat
echo     Or:  ss-run\desktop\win-unpacked\Smart Site Editor.exe
echo.
exit /b 0

:: ============================================================
::  Exit
:: ============================================================
:end
echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   Publish Desktop Script Exited                 %NC%
echo %GREEN%===================================================%NC%
echo.
endlocal