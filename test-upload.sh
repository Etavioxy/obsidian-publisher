#!/bin/bash

echo "🧪 Testing upload to Obsidian Publisher Server"

# 创建测试文件
mkdir -p test-site
echo "<h1>Test Site</h1><p>This is a test upload.</p>" > test-site/index.html
echo "# Test Page" > test-site/test.md

# 创建压缩包
tar -czf test-site.tar.gz -C test-site .

echo "📤 Uploading test site..."

# 上传测试
curl -X POST \
  -F "site=@test-site.tar.gz" \
  -v \
  http://localhost:3000/api/upload

echo ""
echo "🧹 Cleaning up..."
rm -rf test-site test-site.tar.gz

echo "✅ Test completed!"