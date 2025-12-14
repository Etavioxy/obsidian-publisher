# Frontend - Troubleshooting Guide

## Common Issues & Solutions

### 1. "Port 3000 already in use"

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Kill process on port 3000
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Or use different port in vite.config.ts
```

### 2. "Port 8080 already in use"

**Problem**: Backend can't start on port 8080

**Solutions**:
```bash
# Change port in server config.json
# Or kill the process using it
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process
```

### 3. API requests return 404

**Problem**: Frontend can't reach API endpoints

**Solutions**:
1. **Check Rust server is running**
   ```bash
   cd server && cargo run
   ```

2. **Check Vite proxy config** in `vite.config.ts`
   ```typescript
   proxy: {
     '/auth': { target: 'http://localhost:8080', ... },
     '/api': { target: 'http://localhost:8080', ... },
   }
   ```

3. **Test API directly**
   ```bash
   curl http://localhost:8080/auth/login
   # Should return 405 Method Not Allowed (or actual API response)
   ```

### 4. Login fails with "Invalid username or password"

**Problem**: Can't login even with correct credentials

**Solutions**:

**With Mock API**:
- Use test credentials: `admin` / `password123`
- Check mock server is running: `node build/mock-api-server.mjs`

**With Rust Backend**:
- Register a new user first
- Check server logs for errors
- Make sure user exists in database

### 5. "Cannot find module" errors

**Problem**: TypeScript import errors

**Solutions**:
```bash
# Install dependencies
cd server/webui
pnpm install

# Check tsconfig.json paths are correct
# Make sure file extensions match (no .ts needed in imports)
```

### 6. Blank page with "Loading..."

**Problem**: App doesn't render content

**Solutions**:

1. **Check browser console**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Check index.html**
   - Verify `<div id="app">` exists
   - Check script tag points to correct file

3. **Check build output**
   ```bash
   ls -la server/webui/dist/
   # Should have: index.html, app.js, uno.global.css
   ```

4. **Try rebuilding**
   ```bash
   cd server/webui
   pnpm build
   ```

### 7. Token not persisting after refresh

**Problem**: User logged out after page refresh

**Solutions**:
1. Check browser allows localStorage
   - Some browsers block in private/incognito mode
   - Check DevTools → Application → Local Storage

2. Check token is being stored
   ```javascript
   // In browser console
   localStorage.getItem('auth_token')
   localStorage.getItem('auth_user')
   ```

3. Check for CORS blocking localStorage
   - Should work from `http://localhost:8080` or `http://localhost:3000`

### 8. Styles not loading

**Problem**: UI looks unstyled (no colors, spacing, etc.)

**Solutions**:
1. **Check uno.global.css exists**
   ```bash
   ls server/webui/dist/uno.global.css
   ```

2. **Rebuild UnoCSS**
   ```bash
   cd server/webui
   pnpm build  # Vite rebuilds with UnoCSS
   ```

3. **Check inline styles in index.html**
   - Fallback styles should still show some styling

4. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R or Cmd+Shift+R

### 9. 401 Unauthorized errors

**Problem**: Protected endpoints return 401

**Solutions**:
1. **Check token is sent**
   ```bash
   # In DevTools Network tab, check request headers
   Authorization: Bearer <token>
   ```

2. **Login first**
   - Visit `/webui/#/login` or `/webui/#/register`
   - Get a valid token

3. **Check token format**
   - Should be: `Authorization: Bearer <token>`
   - Not: `Authorization: <token>`

4. **Check token expiration** (if using real backend)
   - Server side: Token might have expired
   - Re-login to get fresh token

### 10. CORS errors in console

**Problem**: "Access to XMLHttpRequest blocked by CORS policy"

**Solutions**:
1. **Check backend has CORS enabled** (`main.rs`)
   ```rust
   .layer(CorsLayer::permissive())  // Should be there
   ```

2. **Check requests go to correct origin**
   - Dev: `localhost:8080` (Rust backend)
   - Vite proxy should handle this

3. **Check headers**
   - `Content-Type: application/json`
   - Should be included

4. **Test with curl**
   ```bash
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"pass"}'
   ```

### 11. Type errors in TypeScript

**Problem**: "Type '...' is not assignable to..."

**Solutions**:
1. **Check function signatures**
   - View the function's `.ts` file
   - Check parameter types match

2. **Use `as` type assertion if needed**
   ```typescript
   (value as User).id
   ```

3. **Check imports**
   - Make sure importing from correct file
   - No `.ts` extension in imports

### 12. Dev server won't start

**Problem**: `pnpm dev` crashes or won't start

**Solutions**:
```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall
pnpm install

# Try again
pnpm dev

# If still fails, check logs
pnpm dev 2>&1 | head -50
```

### 13. Build succeeds but nothing in dist/

**Problem**: `pnpm build` completes but `dist/` is empty

**Solutions**:
```bash
# Check build output
pnpm build --verbose

# Make sure outDir is correct
cat vite.config.ts | grep outDir

# Check file permissions
ls -la dist/
```

## Debugging Tips

### 1. Enable Debug Mode
```bash
# Start with more verbose logging
VITE_DEBUG=true pnpm dev
```

### 2. Check Browser Console
```javascript
// Check auth state
localStorage.getItem('auth_token')
localStorage.getItem('auth_user')

// Check current route
window.location.hash
```

### 3. Network Inspection
1. Open DevTools (F12)
2. Go to Network tab
3. Try login
4. Check request headers and response
5. Look for CORS or 401 issues

### 4. Server Logs
```bash
# Start backend with debug logging
RUST_LOG=debug cargo run
```

### 5. Check Config Files
- `vite.config.ts` - Build and dev server config
- `tsconfig.json` - TypeScript compiler options
- `uno.config.ts` - UnoCSS configuration
- `package.json` - Dependencies and scripts

## Performance Tips

### Slow Build?
```bash
# Clear caches
rm -rf node_modules/.vite
rm -rf dist/

# Rebuild
pnpm build
```

### Slow Dev Server?
```bash
# Check no heavy operations in main.ts
# Use Vite's built-in profiling
# Monitor CPU/memory: pnpm dev
```

### Large Bundle?
```bash
# Check what's included
pnpm build --visualize

# Look for unexpected dependencies in src/
# Remove unused imports
```

## Testing Issues

### Tests won't run
```bash
# Make sure Node.js version supports ES modules
node --version  # Should be 14+

# Check test file syntax
node test/basic.test.js
```

### Import errors in tests
```bash
# Tests use dynamic imports, must use async
const { Button } = await import('../src/ui/components.ts');
```

## Deployment Issues

### Built files not found
1. Check `dist/` folder exists and has content
2. Check Rust server can access the path
3. Verify relative path in `main.rs`

### Assets not loading in production
1. Check `index.html` script tags
2. Verify Vite built the assets correctly
3. Check browser DevTools Network tab

## Still Stuck?

1. **Check error message carefully**
   - Usually tells you what's wrong
   - Google the error if stuck

2. **Check recent changes**
   - Did you modify config files?
   - Did you update dependencies?

3. **Try fresh install**
   ```bash
   cd server/webui
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   pnpm build
   ```

4. **Check documentation**
   - `server/webui/README.md` - Frontend docs
   - `server/FRONTEND_INTEGRATION.md` - Integration guide
   - Vite: https://vitejs.dev/guide/troubleshooting
   - UnoCSS: https://unocss.dev/guide/

5. **Ask for help**
   - Share error message
   - Show terminal output
   - Describe what you were doing
