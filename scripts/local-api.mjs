/**
 * Servidor local que ejecuta las Netlify Functions sin netlify-cli.
 * Necesario en Node 24+ / 26 donde `netlify dev` falla con TypeError (prototype).
 *
 * Uso: node --env-file=.env scripts/local-api.mjs
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tunnelFile = path.join(root, '.tunnel-url');

const auth = require(path.join(root, 'netlify/functions/auth/auth.js'));
const cobranzas = require(path.join(root, 'netlify/functions/cobranzas/cobranzas.js'));
const realtime = require(path.join(root, 'netlify/functions/realtime/realtime.js'));

const PORT = Number(process.env.LOCAL_API_PORT || 8881);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function pickHandler(pathname) {
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/.netlify/functions/auth')) {
    return auth.handler;
  }
  if (pathname.startsWith('/api/cobranzas') || pathname.startsWith('/.netlify/functions/cobranzas')) {
    return cobranzas.handler;
  }
  if (pathname.startsWith('/api/realtime') || pathname.startsWith('/.netlify/functions/realtime')) {
    return realtime.handler;
  }
  return null;
}

function jsonResponse(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Email',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    });
    res.end();
    return;
  }

  // URL pública HTTPS del túnel (para QR en iPhone)
  if (
    req.method === 'GET' &&
    (url.pathname === '/api/realtime/tunnel' || url.pathname === '/.netlify/functions/realtime/tunnel')
  ) {
    let origin = '';
    try {
      if (existsSync(tunnelFile)) {
        origin = readFileSync(tunnelFile, 'utf8').trim();
      }
    } catch {
      origin = '';
    }
    jsonResponse(res, 200, { ok: true, origin: origin || null, httpsRequired: true });
    return;
  }

  const handler = pickHandler(url.pathname);

  if (!handler) {
    jsonResponse(res, 404, { ok: false, error: 'Ruta no encontrada' });
    return;
  }

  try {
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? await readBody(req) : undefined;
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(',') : v;
    }

    const event = {
      httpMethod: req.method || 'GET',
      path: url.pathname,
      rawPath: url.pathname,
      headers,
      body,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      isBase64Encoded: false,
    };

    const result = await handler(event, {});
    const status = result.statusCode || 200;
    const outHeaders = {
      'Content-Type': 'application/json',
      ...(result.headers || {}),
    };
    res.writeHead(status, outHeaders);
    res.end(result.body ?? '');
  } catch (err) {
    console.error('[local-api]', err);
    jsonResponse(res, 500, { ok: false, error: 'Error interno del API local' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[local-api] http://0.0.0.0:${PORT}  (auth / cobranzas / realtime)`);
});
