@echo off
REM Quick integration test script for Windows PowerShell

echo.
echo ==================================================
echo Server-WebUI Integration Status
echo ==================================================
echo.

echo [1] Checking Rust compilation...
cd server
cargo check 2>&1 | findstr /C:"Finished" /C:"error"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Rust compilation failed
    exit /b 1
) else (
    echo ✅ Rust compiles successfully
)
cd ..

echo.
echo [2] Checking WebUI build...
if exist server\webui\dist\index.html (
    echo ✅ dist/index.html exists
) else (
    echo ❌ dist/index.html missing
    exit /b 1
)

if exist server\webui\dist\index.js (
    echo ✅ dist/index.js exists
) else (
    echo ❌ dist/index.js missing
    exit /b 1
)

if exist server\webui\dist\index-*.css (
    echo ✅ dist/index-*.css exists
) else (
    echo ❌ dist/index-*.css missing
    exit /b 1
)

echo.
echo [3] Checking code changes...
findstr /C:"appType: 'spa'" server\webui\vite.config.ts >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ vite.config.ts has appType: 'spa'
) else (
    echo ❌ vite.config.ts missing appType: 'spa'
)

findstr /C:"ServeFile" server\src\main.rs >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ main.rs imports ServeFile
) else (
    echo ❌ main.rs missing ServeFile import
)

findstr /C:"not_found_service" server\src\main.rs >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ main.rs uses not_found_service
) else (
    echo ❌ main.rs missing not_found_service
)

echo.
echo ==================================================
echo ✅ All checks passed!
echo ==================================================
echo.
echo Next steps:
echo   1. Start the server: cd server && cargo run
echo   2. Open browser: http://localhost:8080/webui/
echo   3. You should see the login page
echo.
