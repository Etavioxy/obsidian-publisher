@echo off
setlocal enabledelayedexpansion

rem Copy build outputs from mdit/dist to cli/src/siteconfig
set SRC=%~dp0dist
set DEST=%~dp0..\cli\src\siteconfig

copy /Y "%SRC%\index.mjs" "%DEST%\mdit-obsidian.min.mjs" >nul
copy /Y "%SRC%\styles.css" "%DEST%\theme\mdit-obsidian-styles.min.css" >nul

echo [OK] Copied build artifacts to %DEST%
exit /b 0
