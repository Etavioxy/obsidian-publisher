# Server-Webui 集成测试指南

## ✅ 完成的修改

### 1. **vite.config.ts** 
- ✅ 添加 `appType: 'spa'` - 明确 SPA 模式

### 2. **server/src/main.rs**
- ✅ 更新 imports：添加 `ServeFile`
- ✅ 修改 webui 服务：用 `.not_found_service()` 替换 redirect fallback
- ✅ 编译成功：`cargo check` ✓

### 3. **Webui 构建**
- ✅ 安装 terser 依赖
- ✅ `pnpm build` 成功生成：
  - `dist/index.html` (1.47 KB)
  - `dist/index-CxYRs1F-.css` (2.59 KB)
  - `dist/index.js` (16.82 KB)

---

## 🧪 测试步骤

### 方式 1：完整栈测试（推荐）

**终端 1 - 启动 Rust 服务器：**
```powershell
cd server
cargo run
```

**预期输出：**
```
🔧 Configuration loaded
💾 Storage initialized
🔒 Services initialized
🚀 Server running on 0.0.0.0:8080
📚 API endpoints:
  GET    /api/sites        - 列出站点
  POST   /auth/register    - 用户注册
  POST   /auth/login       - 用户登录
  ...
```

**终端 2 - 在浏览器中访问：**
```
http://localhost:8080/webui/
```

### 方式 2：开发模式测试

**终端 1 - 启动 Mock API（可选）：**
```powershell
cd server/webui
node build/mock-api-server.mjs
```

**终端 2 - 启动 Vite 开发服务器：**
```powershell
cd server/webui
pnpm dev
```

**浏览器访问：**
```
http://localhost:3000
```

---

## ✨ 验证清单

- [ ] Rust 服务器启动无错误
- [ ] 访问 `http://localhost:8080/webui/` 显示登录页面
- [ ] 可以在登录页输入用户名和密码
- [ ] 前端路由能正常工作（#/login, #/register 等）
- [ ] 页面刷新后不会 404（SPA 路由工作）
- [ ] API 请求能正确代理到后端

---

## 🔍 调试要点

### 如果看到 404

1. 检查 `webui/dist/` 文件夹是否存在
   ```powershell
   ls server/webui/dist/
   ```

2. 检查文件是否被正确生成
   - `index.html` 应该存在
   - `index.js` 应该存在
   - `*.css` 应该存在

### 如果看到白色页面

1. 打开浏览器控制台（F12）检查是否有错误
2. 检查 Network 标签：
   - `index.html` 应该返回 200
   - `index.js` 应该返回 200
   - API 调用应该代理到 `localhost:8080`

### 如果 API 请求失败

1. 确认后端服务器在 `localhost:8080` 运行
2. 检查 CORS 配置（应该已启用）
3. 查看服务器日志了解错误信息

---

## 📁 文件结构验证

```
server/
├── webui/
│   ├── src/              ✓ 源代码
│   ├── dist/             ✓ 构建输出（新生成）
│   │   ├── index.html
│   │   ├── index.js
│   │   └── index-*.css
│   ├── vite.config.ts    ✅ 已更新（appType: 'spa'）
│   └── package.json
│
└── src/
    └── main.rs          ✅ 已更新（ServeFile, not_found_service）
```

---

## 🚀 下一步

一旦验证通过：

1. **生产部署：**
   ```bash
   cd server
   cargo build --release
   ./target/release/obsidian-publisher-server
   ```

2. **Docker 部署：**
   ```bash
   docker build -t publisher-server .
   docker run -p 8080:8080 publisher-server
   ```

3. **配置优化：**
   - 在 `vite.config.ts` 中添加版本号或哈希名称
   - 配置缓存策略
   - 优化资源加载

---

**状态：✅ 所有修改完成，准备测试**
