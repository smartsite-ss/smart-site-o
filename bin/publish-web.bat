@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  Smart Site V7 - Publish & Deploy with Nginx
::  Build ss-editor + deploy to nginx web server
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
set "RUN_DIR=%SS_ROOT%\ss-run\ss"
set "PUBLISH_WEB=%RUN_DIR%\web"
set "NGINX_DIR=%PUBLISH_WEB%\nginx"
set "FRONTEND_WEB_DIST=%EDITOR_DIR%\apps\web\dist"
set "PLUGINS_DIR=%EDITOR_DIR%\packages\plugins"
set "DIST_PLUGINS=%PLUGINS_DIR%\dist-plugins"
set "PUBLIC_PLUGINS=%EDITOR_DIR%\apps\web\public\plugins"
set "ENV_DEVELOPMENT=%EDITOR_DIR%\apps\web\.env.development"
set "ENV_PRODUCTION=%EDITOR_DIR%\apps\web\.env.production"

:: Parse VITE_DEPLOY_BASE from .env.production (fallback to .env.development)
:: Then derive PLUGIN_CDN_URL from it (for backward compatibility)
set "VITE_DEPLOY_BASE="
if exist "%ENV_PRODUCTION%" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%ENV_PRODUCTION%") do (
        if "%%A"=="VITE_DEPLOY_BASE" set "VITE_DEPLOY_BASE=%%B"
    )
)
if "%VITE_DEPLOY_BASE%"=="" (
    if exist "%ENV_DEVELOPMENT%" (
        for /f "usebackq tokens=1,2 delims==" %%A in ("%ENV_DEVELOPMENT%") do (
            if "%%A"=="VITE_DEPLOY_BASE" set "VITE_DEPLOY_BASE=%%B"
        )
    )
)
:: Derive PLUGIN_CDN_URL from VITE_DEPLOY_BASE, or fallback to direct PLUGIN_CDN_URL parsing
if not "%VITE_DEPLOY_BASE%"=="" (
    set "PLUGIN_CDN_URL=%VITE_DEPLOY_BASE%plugins"
) else (
    set "PLUGIN_CDN_URL="
    if exist "%ENV_PRODUCTION%" (
        for /f "usebackq tokens=1,2 delims==" %%A in ("%ENV_PRODUCTION%") do (
            if "%%A"=="PLUGIN_CDN_URL" set "PLUGIN_CDN_URL=%%B"
        )
    )
    if "%PLUGIN_CDN_URL%"=="" (
        if exist "%ENV_DEVELOPMENT%" (
            for /f "usebackq tokens=1,2 delims==" %%A in ("%ENV_DEVELOPMENT%") do (
                if "%%A"=="PLUGIN_CDN_URL" set "PLUGIN_CDN_URL=%%B"
            )
        )
    )
)

:: Nginx config
set "NGINX_PORT=8800"
set "NGINX_VERSION=1.26.3"
set "NGINX_ZIP=nginx-%NGINX_VERSION%.zip"
set "NGINX_URL=https://nginx.org/download/%NGINX_ZIP%"
set "NGINX_TEMP=%TEMP%\%NGINX_ZIP%"

:: Backend proxy target (must match backend PORT in .env, default 4000)
set "API_TARGET=http://localhost:4000"
set "BACKEND_PORT=4000"

echo.
echo %CYAN%===================================================%NC%
echo %CYAN%   Smart Site V7 - Publish with Nginx           %NC%
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
echo %BLUE%[PATH]%NC% Publish Target:   %PUBLISH_WEB%
echo %BLUE%[PATH]%NC% Nginx Dir:        %NGINX_DIR%
echo %BLUE%[PATH]%NC% Plugins Source:  %PLUGINS_DIR%
if not "%PLUGIN_CDN_URL%"=="" (
    echo %BLUE%[CDN]%NC%  Plugin CDN:     %PLUGIN_CDN_URL%
) else (
    echo %BLUE%[CDN]%NC%  Plugin CDN:     /plugins (local, no external CDN)
)
echo.

:: ============================================================
::  Menu (supports CLI arg: publish-web.bat [full|build|deploy|nginx|start|stop|status])
:: ============================================================
set "NONINTERACTIVE=0"
if /i "%~1"=="full" set "NONINTERACTIVE=1" & goto :full_publish
if /i "%~1"=="build" set "NONINTERACTIVE=1" & goto :build_only
if /i "%~1"=="deploy" set "NONINTERACTIVE=1" & goto :deploy_web
if /i "%~1"=="nginx" set "NONINTERACTIVE=1" & goto :ensure_nginx
if /i "%~1"=="start" set "NONINTERACTIVE=1" & goto :start_nginx
if /i "%~1"=="stop" set "NONINTERACTIVE=1" & goto :stop_nginx
if /i "%~1"=="status" set "NONINTERACTIVE=1" & goto :nginx_status

:menu
echo %CYAN%===================================================%NC%
echo %CYAN%   Select Action                                  %NC%
echo %CYAN%===================================================%NC%
echo.
echo   [1] Full Publish ^(Build + Plugins + Deploy + Nginx^)
echo   [2] Build Frontend Only
echo   [3] Download / Update Nginx
echo   [4] Deploy to Nginx ^(copy build output^)
echo   [5] Start Nginx
echo   [6] Stop Nginx
echo   [7] Nginx Status
echo   [8] Exit
echo   [9] Build Directory Plugins Only
echo.
set /p MODE="Enter option (1-9): "

if "%MODE%"=="1" goto :full_publish
if "%MODE%"=="2" goto :build_only
if "%MODE%"=="3" goto :download_nginx
if "%MODE%"=="4" goto :deploy_web
if "%MODE%"=="5" goto :start_nginx
if "%MODE%"=="6" goto :stop_nginx
if "%MODE%"=="7" goto :nginx_status
if "%MODE%"=="8" goto :end
if "%MODE%"=="9" goto :build_plugins

echo %RED%[ERROR]%NC% Invalid selection
pause
goto :menu

:: ============================================================
::  Full Publish
:: ============================================================
:full_publish
call :do_build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    if "%NONINTERACTIVE%"=="1" goto :end
    pause & goto :menu
)

call :ensure_nginx
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Nginx setup failed
    if "%NONINTERACTIVE%"=="1" goto :end
    pause & goto :menu
)

call :deploy_web

call :generate_nginx_config

echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   Full Publish Completed!                       %NC%
echo %GREEN%===================================================%NC%
echo.
call :print_summary
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Build Only
:: ============================================================
:build_only
call :do_build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    if "%NONINTERACTIVE%"=="1" goto :end
    pause & goto :menu
)
echo.
echo %GREEN%[SUCCESS]%NC% Build completed
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Build Frontend (ss-editor)
:: ============================================================
:do_build
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Building ss-editor...                           %NC%
echo %CYAN%===================================================%NC%
echo.

:: Step 1: Check dependencies
echo %BLUE%[1/3]%NC% Checking frontend dependencies...
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
rmdir /s /q "%EDITOR_DIR%\packages\core\dist"      2>nul
rmdir /s /q "%EDITOR_DIR%\packages\editor\dist"    2>nul
rmdir /s /q "%EDITOR_DIR%\packages\system\dist"    2>nul
rmdir /s /q "%EDITOR_DIR%\packages\plugin-sdk\dist" 2>nul
rmdir /s /q "%FRONTEND_WEB_DIST%"                  2>nul
rmdir /s /q "%DIST_PLUGINS%"                       2>nul
echo %GREEN%[OK]%NC% Cleaned
echo.

:: Step 3: Full build via plugins-cli.js
echo %BLUE%[3/3]%NC% Running full build pipeline (plugins-cli.js build)...
node packages\plugins\scripts\plugins-cli.cjs build
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Build pipeline failed
    exit /b 1
)
echo.
echo %GREEN%[OK]%NC% Build completed
echo %GREEN%  Output: %FRONTEND_WEB_DIST%%NC%
echo.
exit /b 0

:: ============================================================
::  Build Directory Plugins Only
:: ============================================================
:build_plugins
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Building Directory Plugins (plugins-cli.js)     %NC%
echo %CYAN%===================================================%NC%
echo.

cd /d "%EDITOR_DIR%"
node packages\plugins\scripts\plugins-cli.cjs build:plugins
if !ERRORLEVEL! NEQ 0 (
    echo %RED%[ERROR]%NC% Directory plugin build failed
    pause
    goto :menu
)

echo.
echo %GREEN%[SUCCESS]%NC% Directory plugins built to:
echo    %DIST_PLUGINS%
echo.

echo.
echo %YELLOW%  To deploy: run option [4] Deploy to Nginx%NC%
echo.
pause
goto :menu

:: ============================================================
::  Ensure Nginx is Downloaded and Extracted
:: ============================================================
:ensure_nginx
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Setting up Nginx...                             %NC%
echo %CYAN%===================================================%NC%

if exist "%NGINX_DIR%\nginx.exe" (
    echo %GREEN%[OK]%NC% Nginx already exists at:
    echo    %NGINX_DIR%\nginx.exe
    echo.
    :: Show version
    cd /d "%NGINX_DIR%"
    nginx.exe -v 2>&1
    echo.
    exit /b 0
)

echo %YELLOW%[INFO]%NC% Nginx not found, downloading...
goto :download_nginx

:: ============================================================
::  Download Nginx
:: ============================================================
:download_nginx
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Downloading Nginx %NGINX_VERSION%                  %NC%
echo %CYAN%===================================================%NC%
echo.

:: Create nginx directory
mkdir "%NGINX_DIR%" >nul 2>&1

:: Download nginx zip
echo %BLUE%[1/3]%NC% Downloading from: %NGINX_URL%
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NGINX_URL%' -OutFile '%NGINX_TEMP%' -UseBasicParsing"
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Download failed. Please check network or download manually:
    echo   URL: %NGINX_URL%
    echo   Extract to: %NGINX_DIR%
    if "%NONINTERACTIVE%"=="1" exit /b 1
    pause
    exit /b 1
)
echo %GREEN%[OK]%NC% Downloaded
echo.

:: Extract
echo %BLUE%[2/3]%NC% Extracting...
powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%NGINX_TEMP%', '%TEMP%\nginx-extract')"
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Extraction failed
    if "%NONINTERACTIVE%"=="1" exit /b 1
    pause
    exit /b 1
)

:: Move files from nginx-VERSION subdirectory to nginx dir
xcopy /E /I /Y /Q "%TEMP%\nginx-extract\nginx-%NGINX_VERSION%\*" "%NGINX_DIR%\"

:: Move files up one level if they ended up in another subdirectory
if not exist "%NGINX_DIR%\nginx.exe" (
    for /d %%D in ("%NGINX_DIR%\nginx-*") do (
        xcopy /E /I /Y /Q "%%D\*" "%NGINX_DIR%\"
        rmdir /s /q "%%D"
    )
)

:: Cleanup temp files
rmdir /s /q "%TEMP%\nginx-extract" 2>nul
del /f /q "%NGINX_TEMP%" 2>nul

:: Verify
if not exist "%NGINX_DIR%\nginx.exe" (
    echo %RED%[ERROR]%NC% nginx.exe not found after extraction
    if "%NONINTERACTIVE%"=="1" exit /b 1
    pause
    exit /b 1
)

echo %GREEN%[OK]%NC% Extracted
echo.

:: Create required directories for nginx
echo %BLUE%[3/3]%NC% Creating nginx runtime directories...
mkdir "%NGINX_DIR%\temp"       >nul 2>&1
mkdir "%NGINX_DIR%\logs"       >nul 2>&1
mkdir "%NGINX_DIR%\conf.d"     >nul 2>&1
mkdir "%NGINX_DIR%\html"       >nul 2>&1
echo %GREEN%[OK]%NC% Directories created
echo.

:: Show version
cd /d "%NGINX_DIR%"
nginx.exe -v 2>&1
echo.

call :generate_nginx_config
echo %GREEN%[SUCCESS]%NC% Nginx %NGINX_VERSION% installed to:
echo    %NGINX_DIR%
echo.
exit /b 0

:: ============================================================
::  Generate Nginx Configuration
:: ============================================================
:generate_nginx_config
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Generating Nginx Configuration...               %NC%
echo %CYAN%===================================================%NC%

:: Generate nginx.conf
(
echo # ======================================================
echo #  Smart Site V7 - Nginx Configuration
echo #  Generated by publish-scada.bat
echo # ======================================================
echo.
echo worker_processes  2;
echo.
echo events {
echo     worker_connections  1024;
echo }
echo.
echo http {
echo     include       mime.types;
echo     default_type  application/octet-stream;
echo.
echo     # Performance
echo     sendfile        on;
echo     keepalive_timeout  65;
echo.
echo     # Gzip compression
echo     gzip  on;
echo     gzip_min_length  1000;
echo     gzip_types  text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
echo.
echo     # Logs
echo     access_log  logs/access.log;
echo     error_log   logs/error.log;
echo.
echo     # ================================================
echo     #  Smart Site V7 - Main Server
echo     # ================================================
echo     server {
echo         listen       %NGINX_PORT%;
echo         server_name  localhost;
echo.
echo         # Web root - serve built files
echo         root   html;
echo         index  index.html;
echo.
echo         # Character set
echo         charset utf-8;
echo.
echo         # ===========================================
echo         #  API Proxy to Backend
echo         # ===========================================
echo         location /api/ {
echo             proxy_pass %API_TARGET%/api/;
echo             proxy_set_header Host $host;
echo             proxy_set_header X-Real-IP $remote_addr;
echo             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo             proxy_set_header X-Forwarded-Proto $scheme;
echo             proxy_connect_timeout 30s;
echo             proxy_read_timeout 300s;
echo             proxy_send_timeout 300s;
echo         }
echo.
echo         # ===========================================
echo         #  Directory Plugins - Static CDN
echo         # ===========================================
echo         location /plugins/ {
echo             alias html/plugins/;
echo             expires 7d;
echo             add_header Cache-Control "public";
echo             add_header Access-Control-Allow-Origin *;
echo         }
echo.
echo         # Socket.IO WebSocket proxy
echo         location /socket.io/ {
echo             proxy_pass %API_TARGET%/socket.io/;
echo             proxy_http_version 1.1;
echo             proxy_set_header Upgrade $http_upgrade;
echo             proxy_set_header Connection "upgrade";
echo             proxy_set_header Host $host;
echo             proxy_set_header X-Real-IP $remote_addr;
echo         }
echo.
echo         # ===========================================
echo         #  Static Assets - long cache
echo         # ===========================================
echo         location /assets/ {
echo             expires 30d;
echo             add_header Cache-Control "public, immutable";
echo         }
echo.
echo         # Favicon
echo         location = /favicon.svg {
echo             expires 7d;
echo             add_header Cache-Control "public";
echo         }
echo.
echo         # ===========================================
echo         #  SPA Fallback
echo         # ===========================================
echo         location / {
echo             try_files $uri $uri/ /index.html;
echo         }
echo     }
echo }
) > "%NGINX_DIR%\conf\nginx.conf"

echo %GREEN%[OK]%NC% Nginx config generated:
echo    %NGINX_DIR%\conf\nginx.conf
echo    Port: %NGINX_PORT%
echo    API Proxy: %API_TARGET%
echo.
exit /b 0

:: ============================================================
::  Deploy Web (copy build output to web directory)
:: ============================================================
:deploy_web
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Deploying to Nginx Web Directory...             %NC%
echo %CYAN%===================================================%NC%

if not exist "%FRONTEND_WEB_DIST%\index.html" (
    echo %RED%[ERROR]%NC% Build output not found. Run build first.
    if "%NONINTERACTIVE%"=="1" exit /b 1
    pause
    exit /b 1
)

:: Clean and copy
echo %BLUE%[1/2]%NC% Cleaning target directory...
set "NGINX_HTML=%NGINX_DIR%\html"
mkdir "%NGINX_HTML%" >nul 2>&1
if exist "%NGINX_HTML%\assets"    rmdir /s /q "%NGINX_HTML%\assets"    2>nul
if exist "%NGINX_HTML%\index.html" del /f /q "%NGINX_HTML%\index.html" 2>nul
if exist "%NGINX_HTML%\favicon.svg" del /f /q "%NGINX_HTML%\favicon.svg" 2>nul

echo %BLUE%[2/2]%NC% Copying build output...
xcopy /E /I /Y /Q "%FRONTEND_WEB_DIST%\*" "%NGINX_HTML%\"

:: 2b: Deploy directory plugins to local nginx
if exist "%DIST_PLUGINS%" (
    echo %BLUE%[2b]%NC% Deploying directory plugins to html\plugins\...
    set "NGINX_PLUGINS=%NGINX_HTML%\plugins"
    mkdir "!NGINX_PLUGINS!" >nul 2>&1
    xcopy /E /I /Y /Q "%DIST_PLUGINS%\*" "!NGINX_PLUGINS!\"
    if not "%PLUGIN_CDN_URL%"=="" (
        echo %GREEN%[OK]%NC% Directory plugins deployed ^(CDN: %PLUGIN_CDN_URL%^)
    ) else (
        echo %GREEN%[OK]%NC% Directory plugins deployed ^(local: /plugins^)
    )
) else (
    echo %YELLOW%[2b]%NC% dist-plugins not found, skipping directory plugin deploy
)

for /f %%a in ('dir /b /s "%NGINX_HTML%\*" 2^>nul ^| find /c /v ""') do set FILE_COUNT=%%a
echo %GREEN%[OK]%NC% Deployed !FILE_COUNT! files to:
echo    %NGINX_HTML%
echo.

call :generate_runtime_scripts
exit /b 0

:: ============================================================
::  Generate Runtime Scripts
:: ============================================================
:generate_runtime_scripts
echo %BLUE%[SCRIPT]%NC% Generating runtime scripts...

:: Nginx start script
(
echo @echo off
echo chcp 65001 ^>nul
echo setlocal enabledelayedexpansion
echo cd /d "%%~dp0nginx"
echo echo ========================================
echo echo     Smart Site V7 - Nginx Start
echo echo ========================================
echo echo [PORT] %NGINX_PORT%
echo echo [ROOT] html\
echo echo.
echo if not exist "nginx.exe" ^(
echo     echo [ERROR] nginx.exe not found!
echo     echo Run publish-web.bat ^> Download Nginx first.
echo     pause
echo     exit /b 1
echo ^)
echo echo [INFO] Starting nginx...
echo start "" nginx.exe
echo timeout /t 2 ^>nul
echo echo.
echo echo [INFO] Checking status...
echo set "NGINX_PROC_COUNT=0"
echo for /f "tokens=2" %%p in ^('tasklist /fi "imagename eq nginx.exe" /nh 2^>nul ^| find /c "nginx.exe"'^) do set "NGINX_PROC_COUNT=%%p"
echo if !NGINX_PROC_COUNT! GEQ 1 ^(
echo     echo [OK] Nginx is running
echo     echo URL: http://localhost:%NGINX_PORT%
echo     echo.
echo     echo To stop: nginx.exe -s stop
echo     echo Or use: stop_nginx.bat
echo ^) else ^(
echo     echo [ERROR] Nginx failed to start. Check logs\error.log
echo ^)
echo endlocal
) > "%PUBLISH_WEB%\start_nginx.bat"

:: Nginx stop script
(
echo @echo off
echo cd /d "%%~dp0nginx"
echo echo ========================================
echo echo     Smart Site V7 - Nginx Stop
echo echo ========================================
echo if not exist "nginx.exe" ^(
echo     echo [ERROR] nginx.exe not found
echo     pause
echo     exit /b 1
echo ^)
echo echo [INFO] Stopping nginx...
echo nginx.exe -s stop
echo if errorlevel 1 ^(
echo     echo [WARN] Nginx may not be running
echo ^) else ^(
echo     echo [OK] Nginx stopped
echo ^)
echo pause
) > "%PUBLISH_WEB%\stop_nginx.bat"

:: Nginx reload script
(
echo @echo off
echo cd /d "%%~dp0nginx"
echo echo ========================================
echo echo     Smart Site V7 - Nginx Reload
echo echo ========================================
echo if not exist "nginx.exe" ^(
echo     echo [ERROR] nginx.exe not found
echo     pause
echo     exit /b 1
echo ^)
echo echo [INFO] Reloading nginx config...
echo nginx.exe -s reload
echo echo [OK] Config reloaded
echo pause
) > "%PUBLISH_WEB%\reload_nginx.bat"

:: Status script
(
echo @echo off
echo cd /d "%%~dp0nginx"
echo echo ========================================
echo echo     Smart Site V7 - Nginx Status
echo echo ========================================
echo echo [DIR]  %%cd%%
echo echo.
echo echo --- Web Files ---
echo cd html
echo if exist "index.html" ^(echo [OK] index.html EXISTS^) else ^(echo [WARN] index.html MISSING^)
echo if exist "assets" ^(dir /b assets 2^>nul ^| find /c /v "" ^& echo assets found^) else ^(echo [WARN] assets MISSING^)
echo echo.
echo echo --- Nginx ---
echo cd nginx
echo if exist "nginx.exe" ^(
echo     echo [OK] nginx.exe EXISTS
echo     nginx.exe -v 2^>^&1
echo ^) else ^(
echo     echo [WARN] nginx.exe MISSING
echo ^)
echo echo.
echo echo --- Port %NGINX_PORT% ---
echo netstat -ano ^| find ":%NGINX_PORT%" 2^>nul
echo if errorlevel 1 ^(echo [INFO] Port %NGINX_PORT% is free^) else ^(echo [INFO] Port %NGINX_PORT% is in use^)
echo echo.
echo echo --- Port %BACKEND_PORT% ^(Backend^) ---
echo netstat -ano ^| find ":%BACKEND_PORT%" 2^>nul
echo if errorlevel 1 ^(echo [INFO] Backend port is free^) else ^(echo [INFO] Backend port is in use^)
echo pause
) > "%PUBLISH_WEB%\status_nginx.bat"

:: Quick start (full stack)
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%%~dp0"
echo echo ========================================
echo echo     Smart Site V7 - Full Stack Start
echo echo ========================================
echo echo.
echo echo [1/2] Starting Nginx ^(port %NGINX_PORT%^)...
echo cd nginx
echo start "" nginx.exe
echo timeout /t 2 ^>nul
echo cd ..
echo echo [OK] Nginx started
echo echo        http://localhost:%NGINX_PORT%
echo echo.
echo echo [2/2] ==============================
echo echo        Backend ^(port %BACKEND_PORT%^) must be started separately
echo echo        cd ..\services\ss-node ^&^& start.bat
echo echo ====================================
echo echo.
echo start http://localhost:%NGINX_PORT%
echo pause
) > "%PUBLISH_WEB%\start.bat"

echo %GREEN%[OK]%NC% Runtime scripts generated:
echo    start_nginx.bat   - Start nginx server
echo    stop_nginx.bat    - Stop nginx server
echo    reload_nginx.bat  - Reload nginx config
echo    status_nginx.bat  - Check status
echo    start.bat         - Quick start ^(nginx only^)
echo.
exit /b 0

:: ============================================================
::  Start Nginx
:: ============================================================
:start_nginx
if not exist "%NGINX_DIR%\nginx.exe" (
    echo %RED%[ERROR]%NC% nginx.exe not found. Run option [3] first.
    if "%NONINTERACTIVE%"=="1" goto :end
    pause
    goto :menu
)

echo Starting nginx...
cd /d "%NGINX_DIR%"
start "" nginx.exe
timeout /t 2 >nul

:: Check if running
netstat -ano | find ":%NGINX_PORT%" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%[OK]%NC% Nginx is running on port %NGINX_PORT%
    echo    URL: http://localhost:%NGINX_PORT%
) else (
    echo %YELLOW%[WARN]%NC% Nginx may have failed. Check logs\error.log
)
echo.
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Stop Nginx
:: ============================================================
:stop_nginx
if not exist "%NGINX_DIR%\nginx.exe" (
    echo %RED%[ERROR]%NC% nginx.exe not found
    if "%NONINTERACTIVE%"=="1" goto :end
    pause
    goto :menu
)

cd /d "%NGINX_DIR%"
nginx.exe -s stop
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%[OK]%NC% Nginx stopped
) else (
    echo %YELLOW%[WARN]%NC% Nginx may not have been running
)
echo.
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Nginx Status
:: ============================================================
:nginx_status
echo.
echo %CYAN%===================================================%NC%
echo %CYAN%  Nginx Status                                   %NC%
echo %CYAN%===================================================%NC%
echo.

if not exist "%NGINX_DIR%\nginx.exe" (
    echo %RED%[STATUS]%NC% nginx.exe NOT INSTALLED
    echo    Run option [3] to download
    pause
    goto :menu
)

echo %GREEN%[OK]%NC% nginx.exe installed
cd /d "%NGINX_DIR%"
echo    Path: %NGINX_DIR%
nginx.exe -v 2>&1
echo.

echo %BLUE%--- Config ---%NC%
if exist "%NGINX_DIR%\conf\nginx.conf" (
    echo [OK] conf\nginx.conf EXISTS
) else (
    echo [WARN] conf\nginx.conf MISSING
)
echo    Port: %NGINX_PORT%
echo.

echo %BLUE%--- Process ---%NC%
netstat -ano | find ":%NGINX_PORT%" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%[RUNNING]%NC% Nginx is running on port %NGINX_PORT%
) else (
    echo %YELLOW%[STOPPED]%NC% Nginx is not running
)

echo.
echo %BLUE%--- Web Files ---%NC%
if exist "%NGINX_DIR%\html\index.html" (
    echo %GREEN%[OK]%NC% Web files deployed
) else (
    echo %YELLOW%[WARN]%NC% No web files deployed. Run option [4]
)

echo.
if "%NONINTERACTIVE%"=="1" goto :end
pause
goto :menu

:: ============================================================
::  Summary
:: ============================================================
:print_summary
echo %BLUE%  Component       Path/URL                                      %NC%
echo %BLUE%  --------------  --------------------------------------------  %NC%
echo %BLUE%  Frontend Build  %FRONTEND_WEB_DIST%                          %NC%
echo %BLUE%  Plugins Build   %DIST_PLUGINS%                                %NC%
if not "%PLUGIN_CDN_URL%"=="" (
    echo %BLUE%  CDN URL         %PLUGIN_CDN_URL%                                %NC%
) else (
    echo %BLUE%  CDN URL         /plugins ^(local nginx, no external CDN^)         %NC%
)
echo %BLUE%  Web Root        %NGINX_DIR%\html                             %NC%
echo %BLUE%  Nginx Binary    %NGINX_DIR%\nginx.exe                        %NC%
echo %BLUE%  Nginx Config    %NGINX_DIR%\conf\nginx.conf                  %NC%
echo.
echo %YELLOW%  Quick Start:%NC%
echo     Double-click: %PUBLISH_WEB%\start.bat
echo.
echo %YELLOW%  Manual Control:%NC%
echo     Start:  %PUBLISH_WEB%\start_nginx.bat
echo     Stop:   %PUBLISH_WEB%\stop_nginx.bat
echo     Status: %PUBLISH_WEB%\status_nginx.bat
echo     Reload: %PUBLISH_WEB%\reload_nginx.bat
echo.
echo %YELLOW%  URLs:%NC%
echo     Frontend:  http://localhost:%NGINX_PORT%
echo     Plugins:   http://localhost:%NGINX_PORT%/plugins/registry.json
echo     API Proxy: http://localhost:%NGINX_PORT%/api/ -^> %API_TARGET%
echo.
echo %YELLOW%  Prerequisites for Full Stack:%NC%
echo     Backend must be running: cd ss-run\ss\services\ss-node ^&^& start.bat
echo.
exit /b 0

:: ============================================================
::  Exit
:: ============================================================
:end
echo.
echo %GREEN%===================================================%NC%
echo %GREEN%   Publish Scada Script Exited                   %NC%
echo %GREEN%===================================================%NC%
echo.
endlocal