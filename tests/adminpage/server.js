const http = require('http');
const net = require('net');
const url = require('url');
const fs = require('fs');
const path = require('path');

const LISTEN_PORT = process.env.PORT || 3000;
const TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '8080', 10);
const ADMIN_KEY = process.env.ADMIN_KEY || '';

function probe(port, timeout = 800) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    s.setTimeout(timeout);
    s.once('connect', () => { done = true; s.destroy(); resolve({ open: true }); });
    s.once('timeout', () => { if (!done) { done = true; s.destroy(); resolve({ open: false, reason: 'timeout' }); } });
    s.once('error', (e) => { if (!done) { done = true; resolve({ open: false, reason: String(e) }); } });
    s.connect(port, TARGET_HOST);
  });
}

function proxyTo(targetPath, clientReq, clientRes) {
  const keyFromQuery = url.parse(clientReq.url, true).query.key;
  const key = keyFromQuery || ADMIN_KEY ? `?key=${encodeURIComponent(keyFromQuery || ADMIN_KEY)}` : '';
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: `/api/${targetPath}${key}`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  };

  const req = http.request(options, (res) => {
    clientRes.writeHead(res.statusCode, { 'Content-Type': res.headers['content-type'] || 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.pipe(clientRes);
  });
  req.on('error', (e) => {
    clientRes.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    clientRes.end(JSON.stringify({ error: String(e) }));
  });
  req.end();
}

const indexPath = path.join(__dirname, 'index.html');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);
  if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return fs.createReadStream(indexPath).pipe(res);
  }

  if (parsed.pathname === '/probe') {
    const result = await probe(TARGET_PORT, 800);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end(JSON.stringify({ port: TARGET_PORT, ts: Date.now(), ...result }));
  }

  if (parsed.pathname === '/admin/all') return proxyTo('admin/all', req, res);
  if (parsed.pathname === '/admin/storage') return proxyTo('admin/storage', req, res);
  if (parsed.pathname === '/admin/sites') return proxyTo('admin/sites', req, res);

  res.statusCode = 404; res.end('Not found');
});

server.listen(LISTEN_PORT, () => console.log(`Admin analyzer running: http://localhost:${LISTEN_PORT}  (proxy -> ${TARGET_HOST}:${TARGET_PORT})`));
