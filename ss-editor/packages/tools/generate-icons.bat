@echo off
setlocal enabledelayedexpansion

:: ================================================================
::  SCADA Editor Component Icon Generator & Preview
::
::  Usage:
::    generate-icons.bat mines         Generate by category
::    generate-icons.bat electric      Generate by category
::    generate-icons.bat --all         Generate all components
::    generate-icons.bat --list        List all categories
::    generate-icons.bat --preview mines  Preview existing icons
:: ================================================================

set "SCRIPT_DIR=%~dp0"
set "BIN_DIR=%SCRIPT_DIR%bin"
set "PREVIEW_DIR=%SCRIPT_DIR%preview"
set "GENERATE_SCRIPT=%BIN_DIR%\generate-icons.mjs"
set "PREVIEW_SCRIPT=%BIN_DIR%\preview-icons.mjs"

:: ---- Argument parsing ------------------------------------------

set "ARG=%~1"

if "%ARG%"=="" (
    echo.
    echo  ============================================================
    echo   SCADA Editor Component Icon Generator and Preview
    echo  ============================================================
    echo.
    echo  Usage:
    echo    generate-icons.bat ^<category^>     Generate by category
    echo    generate-icons.bat --all            Generate all components
    echo    generate-icons.bat --list           List all categories
    echo    generate-icons.bat --preview mines  Preview existing icons
    echo.
    echo  Examples:
    echo    generate-icons.bat mines
    echo    generate-icons.bat electric
    echo    generate-icons.bat basic
    echo.
    exit /b 1
)

:: ---- List categories -------------------------------------------

if /i "%ARG%"=="--list" (
    echo.
    for /d %%D in ("%SCRIPT_DIR%..\plugins\*") do (
        set "CAT_NAME=%%~nxD"
        if not "!CAT_NAME:~0,1!"=="." (
            echo   [!CAT_NAME!]
        )
    )
    echo.
    exit /b 0
)

:: ---- Preview only (skip generation) ----------------------------

if /i "%ARG%"=="--preview" (
    set "MODE=preview"
    set "CATEGORY=%~2"
    if "!CATEGORY!"=="" set "CATEGORY=--all"
    goto :PREVIEW_STEP
)

:: ---- Determine category flags ---------------------------------

if /i "%ARG%"=="--all" (
    set "CATEGORY=--all"
    set "CAT_FLAG=--all"
) else (
    set "CATEGORY=%ARG%"
    set "CAT_FLAG=--category %ARG%"
)

:: ---- Step 1: Scan + generate icons -----------------------------

echo.
echo  =====================================================
echo   Step 1/2: Generating component icons...
echo  =====================================================
echo.

node "%GENERATE_SCRIPT%" %CAT_FLAG% --format both --force
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Icon generation failed.
    echo Please check if playwright is installed:
    echo   npm install -g playwright
    echo   npx playwright install chromium
    pause
    exit /b 1
)

:PREVIEW_STEP

:: ---- Step 2: Generate HTML preview page ------------------------

echo.
echo  =====================================================
echo   Step 2/2: Generating preview page...
echo  =====================================================
echo.

if "%CATEGORY%"=="--all" (
    node "%PREVIEW_SCRIPT%" --all
) else (
    node "%PREVIEW_SCRIPT%" --category "%CATEGORY%"
)

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Preview page generation failed.
    pause
    exit /b 1
)

:: ---- Step 3: Open browser -------------------------------------

:: Path is deterministic: preview/<category>-icons.html
if "%CATEGORY%"=="--all" (
    set "HTML_FILE=%PREVIEW_DIR%\all-icons.html"
) else (
    set "HTML_FILE=%PREVIEW_DIR%\%CATEGORY%-icons.html"
)

:OPEN_BROWSER

echo.
echo  Opening browser...
start "" "!HTML_FILE!"

echo.
echo  =====================================================
echo   Done. Browser opened with icon preview page.
echo.
echo   Click icon      = Download PNG
echo   Right-click     = Save as...
echo   Press / key     = Search component
echo   Press Esc key   = Clear search
echo  =====================================================
echo.

endlocal
exit /b 0