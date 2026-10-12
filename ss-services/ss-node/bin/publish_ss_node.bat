@echo off
:: Smart SCADA - ss-node Publish Script
:: Publish compiled application to runtime directory

setlocal enabledelayedexpansion

echo ========================================
echo     Smart SCADA - ss-node Publish      
echo ========================================
echo.

cd /d "%~dp0.."
set "PROJECT_ROOT=%cd%"
set "BIN_DIR=%PROJECT_ROOT%\bin"
set "APPS_DIR=%PROJECT_ROOT%\apps\ss-node-server"
set "DIST_DIR=%APPS_DIR%\dist"

set "RUN_ROOT=F:\work\smartdata\202603_trace\trunk\code\ss-v7\ss-run"
set "SS_RUN_DIR=%RUN_ROOT%\ss"
set "SERVICES_DIR=%SS_RUN_DIR%\services"
set "TARGET_DIR=%SERVICES_DIR%\ss-node"
set "TARGET_DIST=%TARGET_DIR%\dist"
set "TARGET_DATA=%TARGET_DIR%\data"
set "TARGET_LOGS=%TARGET_DIR%\logs"

echo [INFO] Project Root: %PROJECT_ROOT%
echo [INFO] Dist Directory: %DIST_DIR%
echo [INFO] Target Directory: %TARGET_DIR%
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found, please install Node.js 18+
    pause
    exit /b 1
)

set "PKG_MANAGER="
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PKG_MANAGER=pnpm"
    echo [INFO] Using package manager: pnpm
) else (
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PKG_MANAGER=npm"
        echo [INFO] Using package manager: npm
    ) else (
        echo [ERROR] Neither npm nor pnpm found
        pause
        exit /b 1
    )
)
echo.

:: Check for command line parameter
if not "%1"=="" (
    set "MODE=%1"
    goto :execute_mode
)

:menu
echo ========================================
echo     Select Publish Mode                
echo ========================================
echo.
echo   [1] Full Publish (Build + Copy + Scripts)
echo   [2] Copy Only (Use existing dist)
echo   [3] Incremental Publish
echo   [4] Clean Target Directory
echo   [5] Exit
echo.
set /p MODE="Enter option (1-5): "

:execute_mode
if "%MODE%"=="1" goto :full_publish
if "%MODE%"=="2" goto :copy_only
if "%MODE%"=="3" goto :incremental_publish
if "%MODE%"=="4" goto :clean_target
if "%MODE%"=="5" goto :end
if /i "%MODE%"=="full_publish" goto :full_publish
if /i "%MODE%"=="copy_only" goto :copy_only
if /i "%MODE%"=="incremental_publish" goto :incremental_publish
if /i "%MODE%"=="clean_target" goto :clean_target

echo [ERROR] Invalid selection
pause
goto :menu

:full_publish
echo.
echo ========================================
echo     Full Publish Process               
echo ========================================
echo.

echo [STEP 1/4] Building project...
call "%BIN_DIR%\build_ss_node.bat" quick_build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed, publish aborted
    pause
    exit /b 1
)
echo [DONE] Project build successful
echo.

echo [STEP 2/4] Cleaning target directory...
if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to clean target directory
        pause
        exit /b 1
    )
    echo [DONE] Target directory cleaned
)
echo.

echo [STEP 3/4] Creating directory structure...
mkdir "%TARGET_DIR%"          >nul 2>&1
mkdir "%TARGET_DIST%"         >nul 2>&1
mkdir "%TARGET_DATA%"         >nul 2>&1
mkdir "%TARGET_LOGS%"         >nul 2>&1
mkdir "%TARGET_DATA%\db"      >nul 2>&1
mkdir "%TARGET_DATA%\projects">nul 2>&1
mkdir "%TARGET_DATA%\templates">nul 2>&1
echo [DONE] Directory structure created
echo.

echo [STEP 4/4] Copying files to target...
goto :copy_files

:copy_only
echo.
echo ========================================
echo     Copy Only Mode                     
echo ========================================
echo.
echo [INFO] Checking build directory...
if not exist "%DIST_DIR%" (
    echo [ERROR] Build directory not found: %DIST_DIR%
    echo [ERROR] Please build first
    pause
    exit /b 1
)

if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%" >nul 2>&1
)
goto :copy_files

:copy_files
echo [INFO] Copying dist directory...
xcopy /E /I /Y "%DIST_DIR%\*" "%TARGET_DIST%\"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to copy dist directory
    pause
    exit /b 1
)
echo [DONE] dist directory copied

echo [INFO] Copying package.json...
copy "%APPS_DIR%\package.json" "%TARGET_DIR%\" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Failed to copy package.json
)

echo.
set /p COPY_NODE_MODULES="Copy node_modules (y/n, default n): "
if /I "%COPY_NODE_MODULES%"=="Y" (
    echo [INFO] Copying node_modules...
    xcopy /E /I /Y "%PROJECT_ROOT%\node_modules\*" "%TARGET_DIR%\node_modules\"
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to copy node_modules
        pause
        exit /b 1
    )
    echo [DONE] node_modules copied
)
echo.
goto :generate_scripts

:incremental_publish
echo.
echo ========================================
echo     Incremental Publish                
echo ========================================
echo.
echo [INFO] Checking build directory...
if not exist "%DIST_DIR%" (
    echo [ERROR] Build directory not found
    pause
    exit /b 1
)

echo [INFO] Syncing changed files...
robocopy "%DIST_DIR%" "%TARGET_DIST%" /MIR /NFL /NDL /NJH /NJS
if %ERRORLEVEL% GTR 1 (
    echo [ERROR] Incremental copy failed
    pause
    exit /b 1
)
echo [DONE] Incremental sync completed
echo.
goto :generate_scripts

:clean_target
echo.
echo ========================================
echo     Clean Target Directory             
echo ========================================
echo.
echo [WARN] About to delete: %TARGET_DIR%
set /p CONFIRM="Confirm delete (y/n): "
if /I NOT "%CONFIRM%"=="Y" (
    echo [INFO] Delete operation cancelled
    pause
    goto :menu
)

if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Clean failed
        pause
        exit /b 1
    )
    echo [DONE] Target directory deleted
) else (
    echo [INFO] Directory does not exist
)
echo.
goto :menu

:generate_scripts
echo.
echo ========================================
echo     Generating Runtime Scripts         
echo ========================================
echo.

echo [INFO] Generating start.bat...
(
echo @echo off
echo :: Smart SCADA - ss-node Startup Script
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
(
echo @echo off
echo :: Smart SCADA - ss-node Background Service Script
echo setlocal enabledelayedexpansion
echo set "NODE_ENV=production"
echo set "DATA_DIR=%TARGET_DATA%"
echo set "LOG_DIR=%TARGET_LOGS%"
echo set "APP_DIR=%TARGET_DIR%"
echo set "PID_FILE=!APP_DIR!\ss-node.pid"
echo set "LOG_FILE=!LOG_DIR!\ss-node.log"
echo if not exist "!DATA_DIR!" mkdir "!DATA_DIR!"
echo if not exist "!LOG_DIR!" mkdir "!LOG_DIR!"
echo echo [INFO] Starting Smart SCADA ss-node in background
echo echo [INFO] Log file: !LOG_FILE!
echo.
echo if exist "!PID_FILE!" (
echo     for /f "delims=" %%a in (!PID_FILE!) do set "PID=%%a"
echo     tasklist /FI "PID eq !PID!" 2^>nul ^| find /I "node.exe" ^>nul
echo     if not errorlevel 1 (
echo         echo [WARN] Service already running (PID: !PID!)
echo         echo [INFO] Stopping existing service...
echo         taskkill /F /PID !PID! ^>nul 2^>nul
echo         timeout /t 2 /nobreak ^>nul
echo     )
echo )
echo.
echo where nssm ^>nul 2^>nul
echo if not errorlevel 1 (
echo     echo [INFO] Starting with nssm
echo     nssm start SmartSCADA-ss-node
echo ) else (
echo     echo [INFO] Starting directly
echo     start "SmartSCADA-ss-node" node "!APP_DIR!\dist\main.js"
echo )
echo echo [INFO] Service started
echo timeout /t 2 /nobreak ^>nul
) > "%TARGET_DIR%\start-service.bat"
echo [DONE] start-service.bat generated

echo [INFO] Generating stop-service.bat...
(
echo @echo off
echo :: Smart SCADA - ss-node Stop Service Script
echo setlocal enabledelayedexpansion
echo set "APP_DIR=%TARGET_DIR%"
echo set "PID_FILE=!APP_DIR!\ss-node.pid"
echo echo [INFO] Stopping Smart SCADA ss-node Service
echo.
echo if not exist "!PID_FILE!" (
echo     echo [WARN] PID file not found
echo     goto :check_process
echo )
echo.
echo for /f "delims=" %%a in (!PID_FILE!) do set "PID=%%a"
echo echo [INFO] Stopping process (PID: !PID!)
echo taskkill /F /PID !PID! ^>nul 2^>nul
echo if errorlevel 1 (
echo     echo [WARN] Failed to stop process
echo ) else (
echo     echo [DONE] Process stopped
echo )
echo.
echo if exist "!PID_FILE!" del "!PID_FILE!"
echo.
echo :check_process
echo echo [INFO] Checking for remaining node processes...
echo tasklist /FI "IMAGENAME eq node.exe" 2^>nul ^| find /I "node.exe" ^>nul
echo if not errorlevel 1 (
echo     echo [INFO] Found node processes, stopping all...
echo     taskkill /F /IM node.exe ^>nul 2^>nul
echo     if not errorlevel 1 (
echo         echo [DONE] All node processes stopped
echo     )
echo ) else (
echo     echo [INFO] No node processes running
echo )
echo.
echo pause
) > "%TARGET_DIR%\stop-service.bat"
echo [DONE] stop-service.bat generated

echo [INFO] Generating status.bat...
(
echo @echo off
echo :: Smart SCADA - ss-node Status Check Script
echo setlocal enabledelayedexpansion
echo set "APP_DIR=%TARGET_DIR%"
echo set "PID_FILE=!APP_DIR!\ss-node.pid"
echo set "LOG_DIR=%TARGET_LOGS%"
echo.
echo ========================================
echo     Smart SCADA - ss-node Service Status
echo ========================================
echo.
echo [INFO] Application Directory: !APP_DIR!
echo.
echo --- Process Status ---
echo.
echo [INFO] Checking PID file: !PID_FILE!
echo.
echo if exist "!PID_FILE!" (
echo     for /f "delims=" %%a in (!PID_FILE!) do set "PID=%%a"
echo     echo [INFO] Recorded PID: !PID!
echo.
echo     tasklist /FI "PID eq !PID!" 2^>nul ^| find /I "node.exe" ^>nul
echo     if not errorlevel 1 (
echo         echo [RUNNING] Service is running (PID: !PID!)
echo     ) else (
echo         echo [ERROR] PID file exists but process not found
echo     )
echo ) else (
echo     echo [INFO] PID file not found
echo )
echo.
echo --- Port Check ---
echo.
echo for /f "tokens=5" %%a in ('netstat -ano ^| find ":4000" 2^>nul') do (
echo     set "LISTEN_PID=%%a"
echo     echo [INFO] Port 4000 is in use (PID: !LISTEN_PID!)
echo     goto :end
echo )
echo echo [INFO] Port 4000 is not in use
echo.
echo --- Log Check ---
echo.
echo if exist "!LOG_DIR!\ss-node.log" (
echo     echo [INFO] Latest Log:
echo     echo ----------------------------------------
echo     type "!LOG_DIR!\ss-node.log" ^| tail -20 2^>nul || type "!LOG_DIR!\ss-node.log"
echo     echo ----------------------------------------
echo ) else (
echo     echo [INFO] Log file not found
echo )
echo.
echo :end
echo pause
) > "%TARGET_DIR%\status.bat"
echo [DONE] status.bat generated

echo [INFO] Generating .env file...
(
echo :: Smart SCADA - ss-node Environment Configuration
echo :: Published Directory: %TARGET_DIR%
echo.
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
echo [DONE] .env file generated

goto :publish_complete

:publish_complete
echo.
echo ========================================
echo     Publish Complete                    
echo ========================================
echo.
echo [SUCCESS] ss-node published to:
echo.
echo     %TARGET_DIR%
echo.
echo [INFO] Published Directory Structure:
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
pause
goto :end

:end
echo.
echo ========================================
echo     Publish Script Completed            
echo ========================================
echo.