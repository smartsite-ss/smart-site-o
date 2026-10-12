@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ================================================
echo          SS-SCADA Editor Development
echo ================================================
echo.

 
 
pnpm --parallel --filter @scada-editor/core --filter @scada-editor/editor run watch


echo.
echo ================================================
echo SS-SCADA editor watch stopped!
echo ================================================
pause
endlocal