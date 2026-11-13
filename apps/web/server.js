import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const indexFile = path.join(root, 'index.html');
const port = Number(process.env.PORT ?? 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`PORT inválido: "${process.env.PORT}"`);
}

async function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok' }));
    return;
  }

  let filePath;
  try {
    filePath = path.resolve(root, `.${decodeURIComponent(pathname)}`);
  } catch {
    res.writeHead(400).end();
    return;
  }

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    res.writeHead(403).end();
    return;
  }

  let content;
  let responsePath = filePath;
  try {
    const info = await stat(filePath);
    if (info.isFile()) content = await readFile(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (!content) {
    if (path.extname(pathname)) {
      res.writeHead(404).end();
      return;
    }

    responsePath = indexFile;
    content = await readFile(indexFile);
  }

  res.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(responsePath).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': path.basename(responsePath) === 'index.html'
      ? 'no-cache'
      : 'public, max-age=3600',
  });
  res.end(req.method === 'HEAD' ? undefined : content);
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('Falha ao servir ficheiro do frontend:', error.message);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend disponível na porta ${port}`);
});
