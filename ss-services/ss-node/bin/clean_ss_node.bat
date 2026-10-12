@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     Smart SCADA - ss-node Cleanup
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=!SCRIPT_DIR!.."
set "TARGET_DIR=F:\work\smartdata\202603_trace\trunk\code\ss-v7\ss-run\ss\services\ss-node"

echo [INFO] Script Directory: !SCRIPT_DIR!
echo [INFO] Project Root: !PROJECT_ROOT!
echo [INFO] Target Directory: !TARGET_DIR!
echo.

echo === Step 1: Clean build output in source directory ===
if exist "!PROJECT_ROOT!\dist" (
    echo [INFO] Removing dist directory from project root...
    rmdir /s /q "!PROJECT_ROOT!\dist"
    if !ERRORLEVEL! equ 0 (
        echo [DONE] Project root dist cleaned
    ) else (
        echo [ERROR] Failed to clean project root dist
    )
) else (
    echo [INFO] No dist directory in project root
)

echo === Step 2: Clean apps build output ===
if exist "!PROJECT_ROOT!\apps\ss-node-server\dist" (
    echo [INFO] Removing dist directory from apps...
    rmdir /s /q "!PROJECT_ROOT!\apps\ss-node-server\dist"
    if !ERRORLEVEL! equ 0 (
        echo [DONE] Apps dist cleaned
    ) else (
        echo [ERROR] Failed to clean apps dist
    )
) else (
    echo [INFO] No dist directory in apps
)

echo === Step 3: Clean packages build output ===
for /d %%d in ("!PROJECT_ROOT!\packages\*") do (
    if exist "%%d\dist" (
        echo [INFO] Removing dist directory from %%~nxd...
        rmdir /s /q "%%d\dist"
        if !ERRORLEVEL! equ 0 (
            echo [DONE] %%~nxd dist cleaned
        )
    )
)

echo === Step 4: Clean target deployment directory ===
if exist "!TARGET_DIR!\dist" (
    echo [INFO] Removing dist directory from target...
    rmdir /s /q "!TARGET_DIR!\dist"
    if !ERRORLEVEL! equ 0 (
        echo [DONE] Target dist cleaned
    ) else (
        echo [ERROR] Failed to clean target dist
    )
) else (
    echo [INFO] No dist directory in target
)

echo === Step 5: Clean logs (optional) ===
set /p "clean_logs=Clean log files? (y/N): "
if /i "!clean_logs!"=="y" (
    if exist "!TARGET_DIR!\logs" (
        echo [INFO] Removing log files...
        del /q "!TARGET_DIR!\logs\*" 2>nul
        echo [DONE] Log files cleaned
    ) else (
        echo [INFO] No log directory found
    )
) else (
    echo [INFO] Skipping log cleanup
)

echo === Step 6: Clean npm cache (optional) ===
set /p "clean_cache=Clean npm cache? (y/N): "
if /i "!clean_cache!"=="y" (
    echo [INFO] Clearing npm cache...
    npm cache clean --force 2>nul
    if !ERRORLEVEL! equ 0 (
        echo [DONE] npm cache cleaned
    ) else (
        echo [WARN] npm cache cleanup may have failed
    )
) else (
    echo [INFO] Skipping npm cache cleanup
)

echo.
echo ========================================
echo     Cleanup completed
echo ========================================
pause