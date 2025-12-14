@echo off
REM Complete setup and build script for Obsidian Publisher with Web UI (Windows)

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Obsidian Publisher - Setup ^& Build
echo ========================================
echo.

REM Check prerequisites
echo Checking Prerequisites...
echo.

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [X] Node.js is not installed
    echo Please install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check pnpm
where pnpm >nul 2>nul
if errorlevel 1 (
    echo [!] pnpm not found, installing...
    call npm install -g pnpm
)
echo [OK] pnpm found

REM Check Cargo/Rust (optional)
where cargo >nul 2>nul
if errorlevel 1 (
    echo [!] Rust not found (optional)
    echo Install from https://rustup.rs/
    echo Continuing with frontend setup only...
    set SKIP_RUST=1
) else (
    echo [OK] Rust found
)

echo.
echo ========================================
echo   Setting up Frontend
echo ========================================
echo.

cd server\webui
if errorlevel 1 (
    echo [X] Failed to change to webui directory
    pause
    exit /b 1
)
echo [OK] Changed to webui directory

echo Installing dependencies...
call pnpm install
if errorlevel 1 (
    echo [X] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo Building frontend...
call pnpm build
if errorlevel 1 (
    echo [X] Failed to build frontend
    pause
    exit /b 1
)
echo [OK] Frontend built successfully

cd ..\..
echo [OK] Changed back to project root

REM Build Rust backend if available
if "%SKIP_RUST%"=="" (
    echo.
    echo ========================================
    echo   Building Rust Backend
    echo ========================================
    echo.
    
    cd server
    echo Building Rust server...
    call cargo build --release
    if errorlevel 1 (
        echo [X] Failed to build Rust backend
        pause
        exit /b 1
    )
    echo [OK] Rust backend built successfully
    cd ..
)

REM Success message
echo.
echo ========================================
echo   Setup Complete! ✨
echo ========================================
echo.

echo Ready to use! Next steps:
echo.

if "%SKIP_RUST%"=="" (
    echo Option 1 - Full Stack:
    echo   1. cd server
    echo   2. .\target\release\obsidian-publisher-server
    echo   3. Open http://localhost:8080/webui/
    echo.
)

echo Option 2 - Frontend Development (with mock API):
echo   PowerShell 1:
echo     cd server\webui
echo     node build\mock-api-server.mjs
echo.
echo   PowerShell 2:
echo     cd server\webui
echo     pnpm dev
echo     Open http://localhost:3000/
echo.

echo Test Credentials (mock API):
echo   Username: admin
echo   Password: password123
echo.

echo Documentation:
echo   - Frontend: server\webui\README.md
echo   - Integration: server\FRONTEND_INTEGRATION.md
echo   - Summary: FRONTEND_SUMMARY.md
echo   - Troubleshooting: FRONTEND_TROUBLESHOOTING.md
echo.

pause
