# Admin Analyzer (tests/adminpage)

Tiny admin UI + Node.js proxy for quick local checks of server admin endpoints.

Run (PowerShell):

```powershell
cd tests\adminpage
node server.js
# open http://localhost:3000
```

Environment variables:
- `PORT` — port for this small UI (default 3000)
- `TARGET_PORT` — port of the server to probe (default 8080)
- `ADMIN_KEY` — optional admin key forwarded to admin endpoints

The UI provides buttons to probe the target port and call `/api/admin/all`, `/api/admin/storage`, `/api/admin/sites` through the proxy.
