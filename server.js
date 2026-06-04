/**
 * 本地开发服务器
 * 同时服务静态文件和 API 路由。
 * 用法: node server.js
 * 访问: http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2'
};

// 加载 API handler
function loadApi(name) {
  try {
    var p = path.join(__dirname, 'api', name + '.js');
    return require(p);
  } catch (e) {
    console.error('API load error: ' + name + ' — ' + e.message);
    return null;
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // API 路由
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.replace('/api/', '').split('?')[0];
    const handler = loadApi(apiName);

    if (!handler) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'API not found' }));
    }

    // 模拟 Vercel serverless 接口
    const mockRes = {
      status(code) {
        res.statusCode = code;
        return this;
      },
      json(data) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(data));
        return this;
      },
      end(data) {
        res.end(data || '');
        return this;
      }
    };

    const mockReq = {
      method: req.method,
      query: parsed.query,
      body: (req.method === 'POST') ? await parseBody(req) : {}
    };

    return handler(mockReq, mockRes);
  }

  // 静态文件
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    // SPA fallback: 未知路径 → index.html
    try {
      const fallback = fs.readFileSync(path.join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fallback);
    } catch (e2) {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log('Dev server running at http://localhost:' + PORT);
  console.log('API endpoints: /api/create-order, /api/check-order, /api/verify-token');
});
