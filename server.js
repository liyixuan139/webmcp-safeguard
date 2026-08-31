/* =============================================================
   server.js — zero-dependency local static server
   -------------------------------------------------------------
   WebMCP requires a secure context (HTTPS or localhost). This
   serves SafeGuard from http://localhost:8000 so document.modelContext
   is available (localhost counts as a secure context).

   Run:  node server.js
   ============================================================= */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }
    if (urlPath === '/') urlPath = '/index.html';

    // Resolve against ROOT and require the result to stay inside it. Compare
    // against `ROOT + path.sep` (not a bare startsWith), so a sibling directory
    // like `D:\claude\SafeGuard2` can't pass a prefix check.
    const filePath = path.resolve(ROOT, '.' + urlPath);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`SafeGuard serving at http://localhost:${PORT}`);
    console.log('Enable the WebMCP flag first: chrome://flags/#enable-webmcp-testing');
  });
