const http = require('http');
const fs = require('fs');
const path = require('path');

const START_PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function makeHandler() {
  return (req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = path.join(ROOT, path.normalize(urlPath));

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  };
}

function startServer(port) {
  const server = http.createServer(makeHandler());

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServer(port + 1);
      return;
    }
    throw err;
  });

  server.listen(port, () => {
    console.log(`TasseeyCalc running at http://localhost:${port}`);
  });
}

startServer(START_PORT);