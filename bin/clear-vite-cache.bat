@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Clear All Caches & Rebuild (Frontend + Backend)
::  Frontend: Clear Vite optimizeDeps cache + rebuild editor
::  Backend:  Clear dist/ + tsbuildinfo + rebuild workspace packages
:: ============================================================

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "BLUE=[94m"
set "NC=[0m"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Smart Site V7 - Clear All Caches ^& Rebuild       %NC%
echo %CYAN%   (Frontend + Backend)                             %NC%
echo %CYAN%===================================================%NC%
echo.

:: Resolve paths relative to bin/ directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "SS_ROOT=%cd%"
set "EDITOR_DIR=%SS_ROOT%\ss-editor"
set "WEB_DIR=%EDITOR_DIR%\apps\web"
set "VITE_CACHE=%WEB_DIR%\node_modules\.vite"
set "BACKEND_DIR=%SS_ROOT%\ss-services\ss-node"
set "WX_DIR=%SS_ROOT%\ss-wx\smart-site"
set "WX_VITE_CACHE=%WX_DIR%\node_modules\.vite"
set "WX_UNI_CACHE=%WX_DIR%\node_modules\.cache"
set "WX_UNPACKAGE=%WX_DIR%\unpackage"

echo %BLUE%[PATH]%NC% SS Root:      %SS_ROOT%
echo %BLUE%[PATH]%NC% Editor Dir:   %EDITOR_DIR%
echo %BLUE%[PATH]%NC% Backend Dir:  %BACKEND_DIR%
echo.

:: Check pnpm
where pnpm >nul 2>nul
if errorlevel 1 (
    echo %RED%[ERROR]%NC% pnpm not found. Please install pnpm first.
    pause & exit /b 1
)

:: ============================================================
::  Step 1/5: Rebuild @scada-editor/editor package
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [1/5] Rebuilding @scada-editor/editor ...        %NC%
echo %CYAN%---------------------------------------------------%NC%

cd /d "%EDITOR_DIR%"
echo %YELLOW%[RUN]%NC% pnpm --filter @scada-editor/editor build
call pnpm --filter @scada-editor/editor build
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[FAIL]%NC% Editor build failed.
    pause & exit /b 1
)
echo %GREEN%[OK]%NC% Editor package rebuilt successfully.
echo.

:: ============================================================
::  Step 2/5: Clear Vite dep cache (frontend)
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [2/5] Clearing Vite dep cache (frontend) ...     %NC%
echo %CYAN%---------------------------------------------------%NC%

if exist "%VITE_CACHE%" (
    echo %YELLOW%[RUN]%NC% Removing %VITE_CACHE%
    rmdir /s /q "%VITE_CACHE%"
    if exist "%VITE_CACHE%" (
        echo %RED%[ERROR]%NC% Failed to remove Vite cache. Try closing the dev server first.
        pause & exit /b 1
    )
    echo %GREEN%[OK]%NC% Vite cache cleared.
) else (
    echo %GREEN%[OK]%NC% No Vite cache found (already clean).
)
echo.

:: ============================================================
::  Step 2b: Clear H5 mobile program (ss-wx/smart-site) caches
::  Includes Vite optimizeDeps cache, uni-app compile cache and
::  unpackage build output. Must stop the dev server first.
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [2b]  Clearing H5 program caches (smart-site) ...  %NC%
echo %CYAN%---------------------------------------------------%NC%

if not exist "%WX_DIR%" (
    echo %YELLOW%[SKIP]%NC% H5 program directory not found: %WX_DIR%
    goto :wx_after_skip
)

set "WX_CLEANED=0"
:: Vite optimizeDeps cache
if exist "%WX_VITE_CACHE%" (
    echo %YELLOW%[RUN]%NC% Removing %WX_VITE_CACHE%
    rmdir /s /q "%WX_VITE_CACHE%"
    if exist "%WX_VITE_CACHE%" (
        echo %RED%[ERROR]%NC% Failed to remove %WX_VITE_CACHE%. Close the smart-site dev server first.
        pause & exit /b 1
    )
    set /a WX_CLEANED+=1
)
:: uni-app compile cache
if exist "%WX_UNI_CACHE%" (
    echo %YELLOW%[RUN]%NC% Removing %WX_UNI_CACHE%
    rmdir /s /q "%WX_UNI_CACHE%"
    if exist "%WX_UNI_CACHE%" (
        echo %RED%[ERROR]%NC% Failed to remove %WX_UNI_CACHE%. Close the smart-site dev server first.
        pause & exit /b 1
    )
    set /a WX_CLEANED+=1
)
:: uni-app unpackage build output
if exist "%WX_UNPACKAGE%" (
    echo %YELLOW%[RUN]%NC% Removing %WX_UNPACKAGE%
    rmdir /s /q "%WX_UNPACKAGE%"
    if exist "%WX_UNPACKAGE%" (
        echo %RED%[ERROR]%NC% Failed to remove %WX_UNPACKAGE%. Close the smart-site dev server first.
        pause & exit /b 1
    )
    set /a WX_CLEANED+=1
)
if !WX_CLEANED!==0 (
    echo %GREEN%[OK]%NC% H5 program caches cleared ^(!WX_CLEANED! items^).
) else (
    echo %GREEN%[OK]%NC% No H5 program caches found (already clean).
)
:wx_after_skip
echo.

:: ============================================================
::  Step 3/5: Clear backend build cache (dist/ + tsbuildinfo)
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [3/5] Clearing backend build cache ...            %NC%
echo %CYAN%---------------------------------------------------%NC%

if not exist "%BACKEND_DIR%" (
    echo %YELLOW%[SKIP]%NC% Backend directory not found: %BACKEND_DIR%
    goto :backend_rebuild_skip
)

cd /d "%BACKEND_DIR%"

:: Clear dist/ directories in workspace packages
echo %YELLOW%[RUN]%NC% Clearing workspace package dist/ directories
set "CLEANED_COUNT=0"
for /d %%d in (packages\*) do (
    if exist "%%d\dist" (
        echo   Removing %%d\dist
        rmdir /s /q "%%d\dist" 2>nul
        set /a CLEANED_COUNT+=1
    )
)
if !CLEANED_COUNT!==0 echo   (no dist/ directories found)

:: Clear TypeScript incremental build info files
echo %YELLOW%[RUN]%NC% Clearing tsconfig.tsbuildinfo & *.tsbuildinfo files
set "TSINFO_COUNT=0"
for /r packages %%f in (*.tsbuildinfo) do (
    if exist "%%f" (
        echo   Removing %%f
        del /q "%%f" 2>nul
        set /a TSINFO_COUNT+=1
    )
)
for /r apps %%f in (*.tsbuildinfo) do (
    if exist "%%f" (
        echo   Removing %%f
        del /q "%%f" 2>nul
        set /a TSINFO_COUNT+=1
    )
)
if !TSINFO_COUNT!==0 echo   (no tsbuildinfo files found)

echo %GREEN%[OK]%NC% Backend build cache cleared ^(!CLEANED_COUNT! dist + !TSINFO_COUNT! tsbuildinfo^).
echo.

:: ============================================================
::  Step 4/5: Rebuild backend workspace packages
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [4/5] Rebuilding backend workspace packages ...   %NC%
echo %CYAN%---------------------------------------------------%NC%

cd /d "%BACKEND_DIR%"
echo %YELLOW%[RUN]%NC% pnpm build
call pnpm build
if !ERRORLEVEL! NEQ 0 (
    echo %YELLOW%[WARN]%NC% Backend build had errors (some packages may have failed).
    echo %YELLOW%[WARN]%NC% Check the output above for details.
    echo %YELLOW%[WARN]%NC% You may need to run: cd ss-services\ss-node ^&^& pnpm build
) else (
    echo %GREEN%[OK]%NC% Backend workspace packages rebuilt.
)
echo.

:backend_rebuild_skip

:: ============================================================
::  Step 5/5: Start frontend dev server
:: ============================================================
echo %CYAN%---------------------------------------------------%NC%
echo %CYAN%  [5/5] Starting frontend dev server ...            %NC%
echo %CYAN%---------------------------------------------------%NC%

cd /d "%EDITOR_DIR%"
echo %YELLOW%[RUN]%NC% node packages\plugins\scripts\plugins-cli.cjs dev
echo.
echo %BLUE%[TIP]%NC% Vite will re-optimize deps on startup.
echo %BLUE%[TIP]%NC% Backend must be started separately:
echo %BLUE%[TIP]%NC%   cd ss-services\ss-node ^&^& pnpm start:dev
echo %BLUE%[TIP]%NC% Close this window to stop the frontend dev server.
echo %BLUE%[TIP]%NC% H5 mobile program (smart-site) must be started separately:
echo %BLUE%[TIP]%NC%   cd ss-wx\smart-site ^&^& npm run dev:h5
echo.

node packages\plugins\scripts\plugins-cli.cjs dev

echo.
echo %YELLOW%[EXIT]%NC% Frontend dev server stopped.
pause >nul
endlocal
