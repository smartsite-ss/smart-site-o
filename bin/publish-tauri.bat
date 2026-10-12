@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Desktop (Tauri) Build & Publish
::  Build Tauri app + deploy to ss-run/desktop-tauri
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
set "PUBLISH_TAURI=%RUN_DIR%\desktop-tauri"
set "TAURI_SRC=%EDITOR_DIR%\apps\desktop-tauri"
set "TAURI_BUNDLE=%TAURI_SRC%\src-tauri\target\release\bundle"
set "PUBLIC_DOWNLOADS=%EDITOR_DIR%\apps\web\public\downloads"
set "SITE_PUBLIC_DOWNLOADS=%SS_ROOT%\ss-site\public\downloads"

:: Raise Node.js heap limit: vue-tsc / Vite production build in this monorepo
:: can exceed the default ~4GB cap and crash with "JavaScript heap out of memory".
:: Inherited by all child node processes (pnpm, vite, tauri beforeBuildCommand).
set "NODE_OPTIONS=--max-old-space-size=8192"

:: GNU Rust toolchain (x86_64-pc-windows-gnu) requires MinGW windres to embed
:: Windows resources; add the bundled MinGW bin to PATH if windres is missing.
where windres >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    if exist "%RUN_DIR%\mingw64\mingw64\bin\windres.exe" (
        set "PATH=%RUN_DIR%\mingw64\mingw64\bin;!PATH!"
        echo %YELLOW%[INFO]%NC% windres not found, using bundled MinGW: %RUN_DIR%\mingw64\mingw64\bin
    )
)

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Smart Site V7 - Desktop (Tauri) Publish      %NC%
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
echo %BLUE%[PATH]%NC% Publish Target:   %PUBLISH_TAURI%
echo %BLUE%[PATH]%NC% Build Output:     %TAURI_BUNDLE%
echo.

:: Check Rust environment (warn only at startup, build step will check again)
echo %BLUE%[CHECK]%NC% Rust environment...
where rustc >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[WARN]%NC% Rust not found! Build will fail, but deploy-only is still available.
    echo.
    set "RUST_AVAILABLE=0"
) else (
    for /f "tokens=1,2 delims= " %%a in ('rustc --version') do echo %GREEN%[OK]%NC% Rust: %%a %%b
    echo.
    set "RUST_AVAILABLE=1"
)

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
echo   [3] Deploy Only ^(copy bundle to ss-run\desktop-tauri^)
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
echo %GREEN%  Output: %TAURI_BUNDLE%%NC%
echo.
pause
goto :end

:: ============================================================
::  Build Desktop (Tauri)
:: ============================================================
:do_build
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Building Desktop (Tauri)...                     %NC%
echo %CYAN%===================================================%NC%
echo.

:: Step 0: Check Rust environment
echo %BLUE%[0/4]%NC% Checking Rust environment...
where rustc >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Rust not found! Tauri build requires Rust.
    echo.
    echo   Install Rust from https://rustup.rs/
    echo   Download rustup-init.exe and follow the setup wizard.
    echo.
    exit /b 1
)
for /f "tokens=1,2 delims= " %%a in ('rustc --version') do echo %GREEN%[OK]%NC% Rust: %%a %%b
echo.

where cargo >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Cargo not found!
    exit /b 1
)
echo %GREEN%[OK]%NC% Cargo available
echo.

:: Step 1: Check dependencies
echo %BLUE%[1/5]%NC% Checking dependencies...
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
echo %BLUE%[2/5]%NC% Cleaning previous builds...
rmdir /s /q "%TAURI_SRC%\dist" 2>nul
if exist "%TAURI_SRC%\src-tauri\target\release\bundle" (
    rmdir /s /q "%TAURI_SRC%\src-tauri\target\release\bundle" 2>nul
)
echo %GREEN%[OK]%NC% Cleaned
echo.

:: Step 3: Build core packages
echo %BLUE%[3/5]%NC% Building core packages...
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

echo %GREEN%[OK]%NC% Core packages built
echo.

:: Step 4: Stage WebView2Loader.dll for bundling
:: The Tauri CLI validates bundle resources before cargo runs, so the DLL must
:: exist in src-tauri ahead of time. src-tauri/build.rs refreshes it from the
:: cargo profile directory on every build; this step covers clean checkouts.
echo %BLUE%[4/5]%NC% Staging WebView2Loader.dll for bundling...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$destination = '%TAURI_SRC%\src-tauri\WebView2Loader.dll'; if (Test-Path $destination) { Write-Host 'Already staged'; exit 0 }; $release = '%TAURI_SRC%\src-tauri\target\release\WebView2Loader.dll'; if (Test-Path $release) { Copy-Item $release $destination -Force; Write-Host 'Staged from release directory'; exit 0 }; $cargoHome = if ($env:CARGO_HOME) { $env:CARGO_HOME } else { Join-Path $env:USERPROFILE '.cargo' }; $source = Get-ChildItem -Path (Join-Path $cargoHome 'registry\src') -Recurse -Filter WebView2Loader.dll -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'webview2-com-sys.*x64' } | Select-Object -First 1 -ExpandProperty FullName; if ($source) { Copy-Item $source $destination -Force; Write-Host ('Staged from ' + $source) } else { Write-Warning 'WebView2Loader.dll not found; bundle resource validation may fail' }"
if exist "%TAURI_SRC%\src-tauri\WebView2Loader.dll" (
    echo %GREEN%[OK]%NC% WebView2Loader.dll staged
) else (
    echo %YELLOW%[WARN]%NC% WebView2Loader.dll unavailable, installer may miss the WebView2 loader
)
echo.

:: Step 5: Build Tauri application
echo %BLUE%[5/5]%NC% Building Tauri application (Vite + Rust + Bundle^)...
echo.
echo   This step includes:
echo     - pnpm build   (Vite frontend build)
echo     - cargo build --release  (Rust compilation, may take 5-15 min on first run^)
echo     - Tauri bundler (package installer)
echo.
call %PKG_MANAGER% build:tauri
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Tauri build failed
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% Build completed
echo %GREEN%  Output: %TAURI_BUNDLE%%NC%
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
::  Deploy to ss-run/desktop-tauri
:: ============================================================
:do_deploy
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Deploying to ss-run\desktop-tauri...             %NC%
echo %CYAN%===================================================%NC%

if not exist "%TAURI_BUNDLE%" (
    echo %RED%[ERROR]%NC% Build output not found at:
    echo    %TAURI_BUNDLE%
    echo    Run build first (option [2]^)
    pause
    exit /b 1
)

:: Create target directory
echo %BLUE%[1/2]%NC% Preparing target directory...
mkdir "%PUBLISH_TAURI%" >nul 2>&1

:: Clean previous deployment
if exist "%PUBLISH_TAURI%\*" (
    del /f /q "%PUBLISH_TAURI%\*" 2>nul
    for /d %%d in ("%PUBLISH_TAURI%\*") do rmdir /s /q "%%d" 2>nul
)

:: Copy bundle output (recursive to include msi/nsis subdirs)
echo %BLUE%[2/2]%NC% Copying bundle files...
xcopy /E /I /Y /Q "%TAURI_BUNDLE%\*" "%PUBLISH_TAURI%\"

set FILE_COUNT=0
for /f %%a in ('dir /b /s "%PUBLISH_TAURI%\*" 2^>nul ^| find /c /v ""') do set FILE_COUNT=%%a
echo %GREEN%[OK]%NC% Deployed !FILE_COUNT! file(s^) to:
echo    %PUBLISH_TAURI%
echo.

:: Show installed files summary
echo %BLUE%  Package formats:%NC%
if exist "%PUBLISH_TAURI%\msi\*.msi" (
    for %%f in ("%PUBLISH_TAURI%\msi\*.msi") do echo    [MSI]    msi\%%~nxf
)
if exist "%PUBLISH_TAURI%\nsis\*.exe" (
    for %%f in ("%PUBLISH_TAURI%\nsis\*.exe") do echo    [NSIS]   nsis\%%~nxf
)
if exist "%PUBLISH_TAURI%\zip\*.zip" (
    for %%f in ("%PUBLISH_TAURI%\zip\*.zip") do echo    [ZIP]    zip\%%~nxf
)
if exist "%PUBLISH_TAURI%\dmg\*.dmg" (
    for %%f in ("%PUBLISH_TAURI%\dmg\*.dmg") do echo    [DMG]    dmg\%%~nxf
)
if exist "%PUBLISH_TAURI%\deb\*.deb" (
    for %%f in ("%PUBLISH_TAURI%\deb\*.deb") do echo    [DEB]    deb\%%~nxf
)
if exist "%PUBLISH_TAURI%\appimage\*.AppImage" (
    for %%f in ("%PUBLISH_TAURI%\appimage\*.AppImage") do echo    [AppImage] appimage\%%~nxf
)
echo.

:: Build portable zip package (no-install)
call :do_package_zip

:: Generate runtime batch
call :generate_runtime_scripts
exit /b 0

:: ============================================================
::  Build Portable ZIP Package (no-install)
:: ============================================================
:do_package_zip
echo %BLUE%[ZIP]%NC% Building portable zip package...

set "RELEASE_DIR=%TAURI_SRC%\src-tauri\target\release"
set "ZIP_STAGE=%TAURI_SRC%\src-tauri\target\portable-stage"

:: Read app version from Cargo.toml
set "APP_VERSION=0.0.0"
for /f "tokens=2 delims== " %%v in ('findstr /b "version = " "%TAURI_SRC%\src-tauri\Cargo.toml"') do set "APP_VERSION=%%~v"
set "ZIP_NAME=scada-editor-tauri_!APP_VERSION!_x64-portable.zip"

if not exist "%RELEASE_DIR%\scada-editor-tauri.exe" (
    echo %YELLOW%[WARN]%NC% Release binary not found, skipping zip package:
    echo    %RELEASE_DIR%\scada-editor-tauri.exe
    exit /b 0
)

:: Stage portable layout: exe + WebView2Loader.dll + config.json in one directory
:: (main.rs resolves config.json from the exe directory)
if exist "%ZIP_STAGE%" rmdir /s /q "%ZIP_STAGE%"
mkdir "%ZIP_STAGE%"
copy /y "%RELEASE_DIR%\scada-editor-tauri.exe" "%ZIP_STAGE%\" >nul
if exist "%RELEASE_DIR%\WebView2Loader.dll" (
    copy /y "%RELEASE_DIR%\WebView2Loader.dll" "%ZIP_STAGE%\" >nul
) else (
    echo %YELLOW%[WARN]%NC% WebView2Loader.dll not found in release dir, zip package may fail to start
)
if exist "%TAURI_SRC%\config.json" (
    copy /y "%TAURI_SRC%\config.json" "%ZIP_STAGE%\" >nul
)

:: Create zip archive (tar ships with Windows 10+, fallback to Compress-Archive)
mkdir "%PUBLISH_TAURI%\zip" >nul 2>&1
where tar >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    pushd "%ZIP_STAGE%"
    tar -a -c -f "%PUBLISH_TAURI%\zip\!ZIP_NAME!" *
    set "TAR_RESULT=!ERRORLEVEL!"
    popd
    if !TAR_RESULT! NEQ 0 (
        echo %RED%[ERROR]%NC% Failed to create zip package
        exit /b 1
    )
) else (
    powershell -NoProfile -Command "Compress-Archive -Path '%ZIP_STAGE%\*' -DestinationPath '%PUBLISH_TAURI%\zip\!ZIP_NAME!' -Force"
)

rmdir /s /q "%ZIP_STAGE%" 2>nul
echo %GREEN%[OK]%NC% Portable zip created:
echo    %PUBLISH_TAURI%\zip\!ZIP_NAME!
echo.

:: Copy portable zip to frontend public/downloads for web download
echo %BLUE%[SYNC]%NC% Syncing portable zip to frontend public/downloads...
if not exist "%PUBLIC_DOWNLOADS%" mkdir "%PUBLIC_DOWNLOADS%"
:: Remove old portable zip files to avoid stale versions
del /f /q "%PUBLIC_DOWNLOADS%\*-portable.zip" 2>nul
copy /y "%PUBLISH_TAURI%\zip\!ZIP_NAME!" "%PUBLIC_DOWNLOADS%\!ZIP_NAME!" >nul
if !ERRORLEVEL! EQU 0 (
    echo %GREEN%[OK]%NC% Synced to: %PUBLIC_DOWNLOADS%\!ZIP_NAME!
) else (
    echo %YELLOW%[WARN]%NC% Failed to sync portable zip to public/downloads
)
echo.

::: Copy portable zip to ss-site public/downloads for official site download
echo %BLUE%[SYNC]%NC% Syncing portable zip to ss-site public/downloads...
if not exist "%SITE_PUBLIC_DOWNLOADS%" mkdir "%SITE_PUBLIC_DOWNLOADS%"
::: Remove old portable zip files to avoid stale versions
del /f /q "%SITE_PUBLIC_DOWNLOADS%\*-portable.zip" 2>nul
copy /y "%PUBLISH_TAURI%\zip\!ZIP_NAME!" "%SITE_PUBLIC_DOWNLOADS%\!ZIP_NAME!" >nul
if !ERRORLEVEL! EQU 0 (
    echo %GREEN%[OK]%NC% Synced to: %SITE_PUBLIC_DOWNLOADS%\!ZIP_NAME!
) else (
    echo %YELLOW%[WARN]%NC% Failed to sync portable zip to ss-site/public/downloads
)
echo.
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
echo echo   Smart Site V7 - Desktop ^(Tauri^)
echo echo   Runtime Launcher
echo echo ========================================
echo echo.
echo echo Available packages:
echo if exist "msi\*.msi" ^(
echo     echo   [MSI Installer] msi\
echo     for %%%%f in ^(msi\*.msi^) do echo     %%%%~nxf
echo ^)
echo if exist "nsis\*.exe" ^(
echo     echo   [NSIS Installer] nsis\
echo     for %%%%f in ^(nsis\*.exe^) do echo     %%%%~nxf
echo ^)
echo if exist "zip\*.zip" ^(
echo     echo   [Portable ZIP] zip\
echo     for %%%%f in ^(zip\*.zip^) do echo     %%%%~nxf
echo ^)
echo if exist "dmg\*.dmg" ^(
echo     echo   [DMG] dmg\
echo     for %%%%f in ^(dmg\*.dmg^) do echo     %%%%~nxf
echo ^)
echo if exist "deb\*.deb" ^(
echo     echo   [DEB] deb\
echo     for %%%%f in ^(deb\*.deb^) do echo     %%%%~nxf
echo ^)
echo if exist "appimage\*.AppImage" ^(
echo     echo   [AppImage] appimage\
echo     for %%%%f in ^(appimage\*.AppImage^) do echo     %%%%~nxf
echo ^)
echo echo.
echo echo Run the MSI or NSIS installer to install,
echo echo or extract the portable ZIP to any folder and run the exe directly.
echo pause
) > "%PUBLISH_TAURI%\run.bat"

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
echo %CYAN%  Desktop (Tauri) Build Output                   %NC%
echo %CYAN%===================================================%NC%
echo.

if not exist "%TAURI_BUNDLE%" (
    echo %YELLOW%[WARN]%NC% No build output found.
    echo    Expected: %TAURI_BUNDLE%
    echo    Run build first (option [2]^)
    pause
    goto :end
)

echo %GREEN%[OK]%NC% Build output: %TAURI_BUNDLE%
echo.
echo Directory structure:
echo.
dir /s /b "%TAURI_BUNDLE%"
echo.
pause
goto :end

:: ============================================================
::  Summary
:: ============================================================
:print_summary
echo %BLUE%  Component              Path                                     %NC%
echo %BLUE%  ---------------------  ---------------------------------------  %NC%
echo %BLUE%  Bundle Output          %TAURI_BUNDLE%                           %NC%
echo %BLUE%  Publish Target         %PUBLISH_TAURI%                          %NC%
echo %BLUE%  Runtime Launcher       %PUBLISH_TAURI%\run.bat                  %NC%
echo.
echo %YELLOW%  Publish Target Contents:%NC%
if exist "%PUBLISH_TAURI%\msi\*.msi" (
    for %%f in ("%PUBLISH_TAURI%\msi\*.msi") do echo    [MSI]    msi\%%~nxf
)
if exist "%PUBLISH_TAURI%\nsis\*.exe" (
    for %%f in ("%PUBLISH_TAURI%\nsis\*.exe") do echo    [NSIS]   nsis\%%~nxf
)
if exist "%PUBLISH_TAURI%\zip\*.zip" (
    for %%f in ("%PUBLISH_TAURI%\zip\*.zip") do echo    [ZIP]    zip\%%~nxf
)
if exist "%PUBLISH_TAURI%\dmg\*.dmg" (
    for %%f in ("%PUBLISH_TAURI%\dmg\*.dmg") do echo    [DMG]    dmg\%%~nxf
)
echo.
echo %YELLOW%  Quick Start:%NC%
echo     Run installer from ss-run\desktop-tauri\
echo     Or double-click: ss-run\desktop-tauri\run.bat
echo.
exit /b 0

:: ============================================================
::  Exit
:: ============================================================
:end
echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   Publish Tauri Script Exited                   %NC%
echo %GREEN%===================================================%NC%
echo.
endlocal