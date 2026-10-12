@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "SCRIPT=%SCRIPT_DIR%generate-icons.mjs"

if not exist "%SCRIPT%" (
    echo [ERROR] Script not found: %SCRIPT%
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH.
    pause
    exit /b 1
)

if "%~1"=="" (
    echo.
    echo ========================================================
    echo   SCADA Editor - Icon Generator
    echo ========================================================
    echo.
    echo Usage:
    echo   generate-icons --all                   Generate all components
    echo   generate-icons --category ^<name^>         Generate by category
    echo   generate-icons --type ^<name^>             Generate single component
    echo   generate-icons --force                Overwrite existing icons
    echo   generate-icons --list                 List components only
    echo   generate-icons --help                 Show full help
    echo.
    echo Examples:
    echo   generate-icons --all
    echo   generate-icons --all --force
    echo   generate-icons --category electric
    echo   generate-icons --type daozha --force
    echo   generate-icons --list
    echo.
    pause
    exit /b 0
)

node "%SCRIPT%" %*
if %errorlevel% neq 0 (
    echo.
    pause
)
endlocal