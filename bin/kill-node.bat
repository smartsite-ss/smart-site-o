﻿@echo off
chcp 65001 >nul
echo ========================================
echo   Kill all Node.js processes
echo ========================================
echo.
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo [OK] All node.exe processes terminated.
) else (
    echo [INFO] No node.exe processes found.
)
echo.
pause
