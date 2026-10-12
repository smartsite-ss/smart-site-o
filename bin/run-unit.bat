@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Frontend Unit Test Runner
::  Runs Vitest unit tests for all frontend packages:
::    core, editor, plugin-sdk, plugins, system, shared, web
:: ============================================================

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "BLUE=[94m"
set "NC=[0m"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Frontend Unit Test Runner (All Packages)       %NC%
echo %CYAN%===================================================%NC%
echo.

:: Resolve paths relative to ss-v7 root
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "SS_ROOT=%cd%"
set "EDITOR_DIR=%SS_ROOT%\ss-editor"

echo %BLUE%[PATH]%NC% Project Root:     %SS_ROOT%
echo %BLUE%[PATH]%NC% Editor Dir:       %EDITOR_DIR%
echo.

:: ============================================================
::  Check prerequisites
:: ============================================================
where node >nul 2>nul
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Node.js not found. Please install Node.js 18+
    pause & exit /b 1
)
for /f "delims=" %%v in ('node --version') do echo %GREEN%[OK]%NC% Node.js: %%v

where pnpm >nul 2>nul
if errorlevel 1 (
    echo %RED%[ERROR]%NC% pnpm not found. Please install pnpm first.
    pause & exit /b 1
)
for /f "delims=" %%v in ('pnpm --version') do echo %GREEN%[OK]%NC% pnpm: %%v

:: Check node_modules
if not exist "%EDITOR_DIR%\node_modules" (
    echo %YELLOW%[WARN]%NC% node_modules not found. Installing dependencies...
    cd /d "%EDITOR_DIR%"
    call pnpm install
    cd /d "%SS_ROOT%"
)
echo %GREEN%[OK]%NC% Dependencies found
echo.

:: ============================================================
::  Run Vitest unit tests for all frontend packages
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  Running Frontend Unit Tests (All Packages)...   %NC%
echo %CYAN%---------------------------------------------------%NC%
echo.

cd /d "%EDITOR_DIR%"

set "HAS_ERROR=0"
set "TOTAL=0"
set "PASSED=0"
set "FAILED=0"

:: --- ss-scada packages ---
call :run_test "packages/core"       "ss-editor/packages/core"
call :run_test "packages/editor"     "ss-editor/packages/editor"
call :run_test "packages/plugin-sdk" "ss-editor/packages/plugin-sdk"
call :run_test "packages/plugins"    "ss-editor/packages/plugins"

:: --- ss-data packages ---
call :run_test "packages/system"     "ss-editor/packages/system"
call :run_test "packages/shared"     "ss-editor/packages/shared"
call :run_test "apps/web"            "ss-editor/apps/web"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Test Results                                    %NC%
echo %CYAN%===================================================%NC%
echo.
echo   Packages tested: %TOTAL%
echo   Passed:          %PASSED%
echo   Failed:          %FAILED%
echo.

if "!HAS_ERROR!"=="0" (
    echo %GREEN%[PASS]%NC% All frontend unit tests passed!
) else (
    echo %RED%[FAIL]%NC% Some tests failed. Check the output above for details.
)

echo.

cd /d "%SS_ROOT%"
pause
endlocal
exit /b 0

:: ============================================================
::  Helper: run vitest for a single package
:: ============================================================
:run_test
set /a TOTAL+=1
echo %BLUE%[PACKAGE]%NC% %~2 ...
cd /d "%EDITOR_DIR%\%~1"
npx vitest run --passWithNoTests
if errorlevel 1 (
    set "HAS_ERROR=1"
    set /a FAILED+=1
    echo %RED%  [FAIL]%NC%
) else (
    set /a PASSED+=1
    echo %GREEN%  [OK]%NC%
)
exit /b 0
