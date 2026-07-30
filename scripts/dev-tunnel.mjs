/**
 * Túnel HTTPS público → Vite local (necesario para iPhone/Safari + micrófono).
 * iOS bloquea HTTP en LAN y getUserMedia exige contexto seguro (HTTPS).
 *
 * Uso (con `npm run dev:full` ya corriendo):
 *   npm run tunnel
 */
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tunnelFile = path.join(root, '.tunnel-url');
const target = process.env.TUNNEL_TARGET || 'http://127.0.0.1:5173';

function saveUrl(url) {
  writeFileSync(tunnelFile, `${url.trim()}\n`, 'utf8');
  console.log('\n========================================');
  console.log('iPhone / Safari — abre o escanea:');
  console.log(url);
  console.log('========================================');
  console.log('Deja esta terminal abierta. El QR del dashboard se actualizará solo.\n');
}

function clearUrl() {
  try {
    if (existsSync(tunnelFile)) unlinkSync(tunnelFile);
  } catch {
    /* ignore */
  }
}

clearUrl();

const child = spawn(
  'npx',
  ['--yes', 'cloudflared', 'tunnel', '--url', target],
  {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  },
);

let buffered = '';
let found = false;

function consume(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  buffered += text;
  if (found) return;
  const match = buffered.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (match) {
    found = true;
    saveUrl(match[0]);
  }
}

child.stdout.on('data', consume);
child.stderr.on('data', consume);

child.on('exit', (code) => {
  clearUrl();
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  clearUrl();
  child.kill('SIGINT');
});
process.on('SIGTERM', () => {
  clearUrl();
  child.kill('SIGTERM');
});
