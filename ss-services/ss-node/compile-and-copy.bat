@echo off
setlocal enabledelayedexpansion

cd /d "f:\work\smartdata\202603_trace\trunk\code\ss-v7\ss-services\ss-node"
set "PROJECT_ROOT=%cd%"
set "APPS_DIR=%PROJECT_ROOT%\apps\ss-node-server"

set "RUN_ROOT=F:\work\smartdata\202603_trace\trunk\code\ss-v7\ss-run"
set "SS_RUN_DIR=%RUN_ROOT%\ss"
set "SERVICES_DIR=%SS_RUN_DIR%\services"
set "TARGET_DIR=%SERVICES_DIR%\ss-node"
set "TARGET_DIST=%TARGET_DIR%\dist"
set "TARGET_DATA=%TARGET_DIR%\data"
set "TARGET_LOGS=%TARGET_DIR%\logs"

echo ========================================
echo     Smart SCADA - Build and Publish     
echo ========================================
echo.

echo === Step 1: Build core packages ===
call pnpm --filter @ss-node/ss-sdk build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-sdk FAILED & exit /b 1)
echo [DONE] ss-sdk

call pnpm --filter @ss-node/ss-i18n build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-i18n FAILED & exit /b 1)
echo [DONE] ss-i18n

call pnpm --filter @ss-node/ss-core build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-core FAILED & exit /b 1)
echo [DONE] ss-core

echo === Step 2: Build business packages ===
call pnpm --filter @ss-node/ss-device build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-device FAILED & exit /b 1)
echo [DONE] ss-device

call pnpm --filter @ss-node/ss-project build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-project FAILED & exit /b 1)
echo [DONE] ss-project

echo === Step 3: Build new feature packages ===
call pnpm --filter @ss-node/ss-alarm build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-alarm FAILED & exit /b 1)
echo [DONE] ss-alarm

call pnpm --filter @ss-node/ss-datatag build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-datatag FAILED & exit /b 1)
echo [DONE] ss-datatag

call pnpm --filter @ss-node/ss-report build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-report FAILED & exit /b 1)
echo [DONE] ss-report

call pnpm --filter @ss-node/ss-system build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-system FAILED & exit /b 1)
echo [DONE] ss-system

echo === Step 4: Build collectors ===
call pnpm --filter @ss-node/ss-collector-modbus build
call pnpm --filter @ss-node/ss-collector-mqtt build
call pnpm --filter @ss-node/ss-collector-opcua build
call pnpm --filter @ss-node/ss-storage-influx build
echo [DONE] Collectors

echo === Step 5: Build main server ===
call pnpm --filter ss-node-server build
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] ss-node-server FAILED & exit /b 1)
echo [DONE] ss-node-server

echo === Step 6: Find build output ===
set "DIST_FOUND="
if exist "%APPS_DIR%\dist" (
    echo [INFO] Found dist in app directory
    set "DIST_FOUND=%APPS_DIR%\dist"
) else if exist "%PROJECT_ROOT%\dist" (
    echo [INFO] Found dist in project root
    set "DIST_FOUND=%PROJECT_ROOT%\dist"
) else if exist "%PROJECT_ROOT%\apps\ss-node-server\dist" (
    echo [INFO] Found dist in apps directory
    set "DIST_FOUND=%PROJECT_ROOT%\apps\ss-node-server\dist"
)

if not defined DIST_FOUND (
    echo [ERROR] Build output not found, running build again...
    call pnpm build 2>&1
    if exist "%APPS_DIR%\dist" (
        set "DIST_FOUND=%APPS_DIR%\dist"
    ) else if exist "%PROJECT_ROOT%\dist" (
        set "DIST_FOUND=%PROJECT_ROOT%\dist"
    )
)

if not defined DIST_FOUND (
    echo [ERROR] Build output directory not found after build
    exit /b 1
)

echo [DONE] Build output found at: %DIST_FOUND%
set "BUILD_DIST=%DIST_FOUND%"

echo === Step 7: Create target directory structure ===
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
if not exist "%TARGET_DIST%" mkdir "%TARGET_DIST%"
if not exist "%TARGET_DATA%" mkdir "%TARGET_DATA%"
if not exist "%TARGET_DATA%\db" mkdir "%TARGET_DATA%\db"
if not exist "%TARGET_DATA%\projects" mkdir "%TARGET_DATA%\projects"
if not exist "%TARGET_DATA%\templates" mkdir "%TARGET_DATA%\templates"
if not exist "%TARGET_LOGS%" mkdir "%TARGET_LOGS%"
echo [DONE] Directory structure created

echo === Step 8: Copy dist files ===
echo [INFO] Copying dist directory from: %BUILD_DIST%
rmdir /s /q "%TARGET_DIST%" 2>nul
xcopy /E /I /Y "%BUILD_DIST%" "%TARGET_DIST%"
IF %ERRORLEVEL% NEQ 0 (echo [ERROR] Failed to copy dist & exit /b 1)
echo [DONE] dist copied

echo === Step 9: Copy package.json ===
copy "%APPS_DIR%\package.json" "%TARGET_DIR%\" >nul
echo [DONE] package.json copied

echo === Step 10: Generate runtime scripts ===
echo [INFO] Generating start.bat...
(
echo @echo off
echo setlocal enabledelayedexpansion
echo set "NODE_ENV=production"
echo set "DATA_DIR=%TARGET_DATA%"
echo set "LOG_DIR=%TARGET_LOGS%"
echo set "APP_DIR=%TARGET_DIR%"
echo if not exist "!DATA_DIR!" mkdir "!DATA_DIR!"
echo if not exist "!LOG_DIR!" mkdir "!LOG_DIR!"
echo echo [INFO] Starting Smart SCADA ss-node Service
echo echo [INFO] Environment: production
echo echo [INFO] Data Directory: !DATA_DIR!
echo echo [INFO] Log Directory: !LOG_DIR!
echo echo.
echo cd /d "!APP_DIR!"
echo node dist/main.js
echo echo [INFO] Service stopped
echo pause
) > "%TARGET_DIR%\start.bat"
echo [DONE] start.bat generated

echo [INFO] Generating start-service.bat...
echo @echo off > "%TARGET_DIR%\start-service.bat"
echo setlocal enabledelayedexpansion >> "%TARGET_DIR%\start-service.bat"
echo set "NODE_ENV=production" >> "%TARGET_DIR%\start-service.bat"
echo set "DATA_DIR=%TARGET_DATA%" >> "%TARGET_DIR%\start-service.bat"
echo set "LOG_DIR=%TARGET_LOGS%" >> "%TARGET_DIR%\start-service.bat"
echo set "APP_DIR=%TARGET_DIR%" >> "%TARGET_DIR%\start-service.bat"
echo set "PID_FILE=!APP_DIR!\ss-node.pid" >> "%TARGET_DIR%\start-service.bat"
echo set "LOG_FILE=!LOG_DIR!\ss-node.log" >> "%TARGET_DIR%\start-service.bat"
echo if not exist "!DATA_DIR!" mkdir "!DATA_DIR!" >> "%TARGET_DIR%\start-service.bat"
echo if not exist "!LOG_DIR!" mkdir "!LOG_DIR!" >> "%TARGET_DIR%\start-service.bat"
echo echo [INFO] Starting Smart SCADA ss-node in background >> "%TARGET_DIR%\start-service.bat"
echo echo [INFO] Log file: !LOG_FILE! >> "%TARGET_DIR%\start-service.bat"
echo. >> "%TARGET_DIR%\start-service.bat"
echo taskkill /F /IM node.exe ^>nul 2^>nul >> "%TARGET_DIR%\start-service.bat"
echo timeout /t 1 /nobreak ^>nul >> "%TARGET_DIR%\start-service.bat"
echo. >> "%TARGET_DIR%\start-service.bat"
echo start "SmartSCADA-ss-node" node "!APP_DIR!\dist\main.js" >> "%TARGET_DIR%\start-service.bat"
echo echo [INFO] Service started >> "%TARGET_DIR%\start-service.bat"
echo timeout /t 2 /nobreak ^>nul >> "%TARGET_DIR%\start-service.bat"
echo [DONE] start-service.bat generated

echo [INFO] Generating stop-service.bat...
echo @echo off > "%TARGET_DIR%\stop-service.bat"
echo setlocal enabledelayedexpansion >> "%TARGET_DIR%\stop-service.bat"
echo set "APP_DIR=%TARGET_DIR%" >> "%TARGET_DIR%\stop-service.bat"
echo echo [INFO] Stopping Smart SCADA ss-node Service >> "%TARGET_DIR%\stop-service.bat"
echo. >> "%TARGET_DIR%\stop-service.bat"
echo tasklist /FI "IMAGENAME eq node.exe" 2^>nul ^| find /I "node.exe" ^>nul >> "%TARGET_DIR%\stop-service.bat"
echo if not errorlevel 1 ( >> "%TARGET_DIR%\stop-service.bat"
echo     echo [INFO] Found node processes, stopping all... >> "%TARGET_DIR%\stop-service.bat"
echo     taskkill /F /IM node.exe ^>nul 2^>nul >> "%TARGET_DIR%\stop-service.bat"
echo     if not errorlevel 1 ( >> "%TARGET_DIR%\stop-service.bat"
echo         echo [DONE] All node processes stopped >> "%TARGET_DIR%\stop-service.bat"
echo     ) >> "%TARGET_DIR%\stop-service.bat"
echo ) else ( >> "%TARGET_DIR%\stop-service.bat"
echo     echo [INFO] No node processes running >> "%TARGET_DIR%\stop-service.bat"
echo ) >> "%TARGET_DIR%\stop-service.bat"
echo. >> "%TARGET_DIR%\stop-service.bat"
echo pause >> "%TARGET_DIR%\stop-service.bat"
echo [DONE] stop-service.bat generated

echo [INFO] Generating status.bat...
echo @echo off > "%TARGET_DIR%\status.bat"
echo setlocal enabledelayedexpansion >> "%TARGET_DIR%\status.bat"
echo set "APP_DIR=%TARGET_DIR%" >> "%TARGET_DIR%\status.bat"
echo set "LOG_DIR=%TARGET_LOGS%" >> "%TARGET_DIR%\status.bat"
echo. >> "%TARGET_DIR%\status.bat"
echo ======================================== >> "%TARGET_DIR%\status.bat"
echo     Smart SCADA - ss-node Service Status >> "%TARGET_DIR%\status.bat"
echo ======================================== >> "%TARGET_DIR%\status.bat"
echo. >> "%TARGET_DIR%\status.bat"
echo [INFO] Application Directory: !APP_DIR! >> "%TARGET_DIR%\status.bat"
echo. >> "%TARGET_DIR%\status.bat"
echo --- Process Status --- >> "%TARGET_DIR%\status.bat"
echo. >> "%TARGET_DIR%\status.bat"
echo tasklist /FI "IMAGENAME eq node.exe" 2^>nul ^| find /I "node.exe" ^>nul >> "%TARGET_DIR%\status.bat"
echo if not errorlevel 1 ( >> "%TARGET_DIR%\status.bat"
echo     echo [RUNNING] Node.js process is running >> "%TARGET_DIR%\status.bat"
echo ) else ( >> "%TARGET_DIR%\status.bat"
echo     echo [STOPPED] No Node.js process running >> "%TARGET_DIR%\status.bat"
echo ) >> "%TARGET_DIR%\status.bat"
echo. >> "%TARGET_DIR%\status.bat"
echo --- Port Check --- >> "%TARGET_DIR%\status.bat"
echo. >> "%TARGET_DIR%\status.bat"
echo netstat -ano ^| find ":4000" 2^>nul >> "%TARGET_DIR%\status.bat"
echo if not errorlevel 1 ( >> "%TARGET_DIR%\status.bat"
echo     echo [INFO] Port 4000 is in use >> "%TARGET_DIR%\status.bat"
echo ) else ( >> "%TARGET_DIR%\status.bat"
echo     echo [INFO] Port 4000 is not in use >> "%TARGET_DIR%\status.bat"
echo ) >> "%TARGET_DIR%\status.bat"
echo. >> "%TARGET_DIR%\status.bat"
echo pause >> "%TARGET_DIR%\status.bat"
echo [DONE] status.bat generated

echo === Step 11: Generate .env file ===
echo [INFO] Generating .env file...
(
echo # Application Configuration
echo NODE_ENV=production
echo PORT=4000
echo.
echo # Database Configuration
echo DB_TYPE=sqlite
echo DATABASE_PATH=%TARGET_DATA%\db\ss-node.db
echo.
echo # InfluxDB Configuration (Optional)
echo INFLUXDB_URL=http://localhost:8086
echo INFLUXDB_TOKEN=
echo INFLUXDB_ORG=ss-org
echo INFLUXDB_BUCKET=ss_node_data
echo INFLUXDB_BATCH_SIZE=1000
echo INFLUXDB_FLUSH_INTERVAL=5000
echo.
echo # Data Directories
echo DATA_DIR=%TARGET_DATA%
echo LOG_DIR=%TARGET_LOGS%
echo PROJECTS_DIR=%TARGET_DATA%\projects
echo TEMPLATES_DIR=%TARGET_DATA%\templates
echo.
echo # JWT Configuration
echo JWT_SECRET=smart_scada_secret_key_change_this_in_production
echo JWT_EXPIRES_IN=3600s
echo.
echo # Log Configuration
echo LOG_LEVEL=info
echo LOG_MAX_SIZE=100m
echo LOG_MAX_FILES=10
) > "%TARGET_DIR%\.env"
echo [DONE] .env generated

echo.
echo ========================================
echo     Build and Publish Complete          
echo ========================================
echo.
echo [SUCCESS] Output at: %TARGET_DIR%
echo.
echo [INFO] Directory structure:
echo     dist\          - Application files
echo     data\          - Data directory
echo       ^-- db\       - Database files
echo       ^-- projects\ - Project files
echo       ^-- templates\ - Template files
echo     logs\          - Log files
echo     start.bat      - Start script
echo     start-service.bat - Background service script
echo     stop-service.bat  - Stop service script
echo     status.bat      - Status check script
echo     .env           - Environment configuration
echo.
echo [USAGE]
echo   1. Start service:      Double-click start.bat
echo   2. Background service: Run start-service.bat
echo   3. Stop service:       Run stop-service.bat
echo   4. Check status:       Run status.bat
echo   5. Access service:     http://localhost:4000
echo.
echo [NOTE] Please review .env file before first start
echo.
