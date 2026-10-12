@echo off
chcp 65001 >nul

cd "%~dp0\.."
echo Installing dependencies...
pnpm install
echo Dependencies installed!
pause