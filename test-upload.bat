@echo off
echo 🧪 Testing upload to Obsidian Publisher Server

REM 创建测试文件
mkdir test-site 2>nul
echo ^<h1^>Test Site^</h1^>^<p^>This is a test upload.^</p^> > test-site\index.html
echo # Test Page > test-site\test.md

REM 使用 PowerShell 创建压缩包
powershell -Command "Compress-Archive -Path 'test-site\*' -DestinationPath 'test-site.zip' -Force"

echo 📤 Uploading test site...

REM 上传测试 (需要安装 curl 或使用 PowerShell)
curl -X POST -F "site=@test-site.zip" -v http://localhost:3000/api/upload

echo.
echo 🧹 Cleaning up...
rmdir /s /q test-site
del test-site.zip

echo ✅ Test completed!