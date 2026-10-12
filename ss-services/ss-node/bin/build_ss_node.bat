
@echo off
:: Smart SCADA - ss-node Build Script
:: Compiles TypeScript code to JavaScript

setlocal enabledelayedexpansion

:: Color definitions
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

echo %CYAN%========================================%NC%
echo %CYAN%    Smart SCADA - ss-node Build Script  %NC%
echo %CYAN%========================================%NC%
echo.

:: Switch to project root directory
cd /d "%~dp0.."

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Node.js not found, please install Node.js 18+
    pause
    exit /b 1
)

:: Display Node.js version
echo %BLUE%[INFO]%NC% Node.js version:
node --version
echo.

:: Check package manager
set "PKG_MANAGER="
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PKG_MANAGER=pnpm"
    echo %BLUE%[INFO]%NC% Package manager: pnpm
) else (
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PKG_MANAGER=npm"
        echo %BLUE%[INFO]%NC% Package manager: npm
    ) else (
        echo %RED%[ERROR]%NC% npm or pnpm not found, please install Node.js
        pause
        exit /b 1
    )
)
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo %YELLOW%[WARNING]%NC% node_modules not found, installing dependencies...
    %PKG_MANAGER% install
    if %ERRORLEVEL% NEQ 0 (
        echo %RED%[ERROR]%NC% Dependency installation failed
        pause
        exit /b 1
    )
    echo.
    echo %GREEN%[SUCCESS]%NC% Dependencies installed successfully
    echo.
)

:: Select build mode
echo %BLUE%========================================%NC%
echo %BLUE%    Select Build Mode                   %NC%
echo %BLUE%========================================%NC%
echo.
echo   [1] Quick Build (Compile only)
echo   [2] Full Build (Clean + Type Check + Compile)
echo   [3] Production Build (Full Build + Optimize)
echo   [4] Type Check Only
echo   [5] Generate Migration File
echo   [6] Exit
echo.
set /p MODE="Please select an option (1-6): "

if "%MODE%"=="1" goto :quick_build
if "%MODE%"=="2" goto :full_build
if "%MODE%"=="3" goto :prod_build
if "%MODE%"=="4" goto :typecheck
if "%MODE%"=="5" goto :migration
if "%MODE%"=="6" goto :end

echo %RED%[ERROR]%NC% Invalid selection
pause
exit /b 1

:quick_build
echo.
echo %GREEN%========================================%NC%
echo %GREEN%    Quick Build                        %NC%
echo %GREEN%========================================%NC%
echo.
%PKG_MANAGER% run build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    pause
    exit /b 1
)
echo.
echo %GREEN%[SUCCESS]%NC% Quick build completed
goto :build_complete

:full_build
echo.
echo %GREEN%========================================%NC%
echo %GREEN%    Full Build                         %NC%
echo %GREEN%========================================%NC%
echo.

:: Step 1: Clean old builds
echo %BLUE%[Step 1/4]%NC% Cleaning old build files...
if exist "dist" (
    rmdir /s /q "dist"
    echo %GREEN%[DONE]%NC% Cleaned dist/ directory
) else (
    echo %YELLOW%[INFO]%NC% dist/ directory does not exist, skipping cleanup
)
echo.

:: Step 2: Type check
echo %BLUE%[Step 2/4]%NC% Running type check...
%PKG_MANAGER% run typecheck
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Type check failed, please fix type errors and retry
    pause
    exit /b 1
)
echo %GREEN%[PASS]%NC% Type check passed
echo.

:: Step 3: Code linting
echo %BLUE%[Step 3/4]%NC% Running ESLint check...
%PKG_MANAGER% run lint
if %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%[WARNING]%NC% ESLint found issues, but continuing build
) else (
    echo %GREEN%[PASS]%NC% ESLint check passed
)
echo.

:: Step 4: Build
echo %BLUE%[Step 4/4]%NC% Compiling TypeScript...
%PKG_MANAGER% run build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    pause
    exit /b 1
)
echo %GREEN%[DONE]%NC% TypeScript compilation completed
echo.

goto :build_complete

:prod_build
echo.
echo %GREEN%========================================%NC%
echo %GREEN%    Production Build                   %NC%
echo %GREEN%========================================%NC%
echo.

:: Step 1: Clean
echo %BLUE%[Step 1/5]%NC% Cleaning old build files...
if exist "dist" (
    rmdir /s /q "dist"
    echo %GREEN%[DONE]%NC% Cleaned dist/ directory
) else (
    echo %YELLOW%[INFO]%NC% dist/ directory does not exist, skipping cleanup
)
echo.

:: Step 2: Install dependencies (ensure latest)
echo %BLUE%[Step 2/5]%NC% Ensuring dependencies are up to date...
%PKG_MANAGER% install
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Dependency installation failed
    pause
    exit /b 1
)
echo %GREEN%[DONE]%NC% Dependency check completed
echo.

:: Step 3: Type check
echo %BLUE%[Step 3/5]%NC% Running type check...
%PKG_MANAGER% run typecheck
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Type check failed, production build aborted
    pause
    exit /b 1
)
echo %GREEN%[PASS]%NC% Type check passed
echo.

:: Step 4: Code linting
echo %BLUE%[Step 4/5]%NC% Running ESLint check...
%PKG_MANAGER% run lint
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% ESLint check failed, production build aborted
    pause
    exit /b 1
)
echo %GREEN%[PASS]%NC% ESLint check passed
echo.

:: Step 5: Build
echo %BLUE%[Step 5/5]%NC% Compiling TypeScript (production mode)...
%PKG_MANAGER% run build
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Build failed
    pause
    exit /b 1
)
echo %GREEN%[DONE]%NC% TypeScript compilation completed
echo.

goto :build_complete

:typecheck
echo.
echo %GREEN%========================================%NC%
echo %GREEN%    Type Check                         %NC%
echo %GREEN%========================================%NC%
echo.
%PKG_MANAGER% run typecheck
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Type check failed
    pause
    exit /b 1
)
echo.
echo %GREEN%[SUCCESS]%NC% Type check passed
goto :end

:migration
echo.
echo %GREEN%========================================%NC%
echo %GREEN%    Database Migration                 %NC%
echo %GREEN%========================================%NC%
echo.
echo %YELLOW%NOTE: Please ensure database connection is configured correctly%NC%
echo %NOTE% Migration files will be generated to migrations/ directory%NC%
echo.

set /p MIGRATION_NAME="Please enter migration name (e.g., add-user-table): "
if "%MIGRATION_NAME%"=="" (
    echo %RED%[ERROR]%NC% Migration name cannot be empty
    pause
    goto :end
)

%PKG_MANAGER% run typeorm migration:generate -n %MIGRATION_NAME%
if %ERRORLEVEL% NEQ 0 (
    echo %RED%[ERROR]%NC% Migration generation failed
    pause
    exit /b 1
)
echo.
echo %GREEN%[SUCCESS]%NC% Migration file generated successfully
goto :end

:build_complete
echo.
echo %GREEN%========================================%NC%
echo %GREEN%    Build Completed                    %NC%
echo %GREEN%========================================%NC%
echo.
echo %BLUE%[INFO]%NC% Build output:
dir /b dist 2>nul
echo.
echo %BLUE%[INFO]%NC% File count:
for /f %%a in ('dir /b /s dist\*.js 2^>nul ^| find /c /v ""') do set FILE_COUNT=%%a
echo %FILE_COUNT% JavaScript file(s)
echo.
echo %BLUE%[INFO]%NC% Output directory size:
for /f "tokens=3" %%a in ('dir /s dist 2^>nul ^| findstr /c:"File(s)"') do set DIR_SIZE=%%a
echo %DIR_SIZE% bytes
echo.
echo %GREEN%[TIP]%NC% Run production mode: pnpm run start:prod
echo %GREEN%[TIP]%NC% Or use: bin\run_ss_node.bat
echo.
pause
goto :end

:end
echo.
echo %GREEN%========================================%NC%
echo %GREEN%    Build Script Completed              %NC%
echo %GREEN%========================================%NC%
echo.
pause
