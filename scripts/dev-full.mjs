/**
 * Arranca API local + Vite (reemplazo de `netlify dev` en Node 26).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
const nodeArgs = existsSync(envFile) ? [`--env-file=${envFile}`] : [];

const children = [];

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] detenido (${signal})`);
    } else if (code && code !== 0) {
      console.error(`[${name}] salió con código ${code}`);
      shutdown(code);
    }
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run(process.execPath, [...nodeArgs, path.join(root, 'scripts/local-api.mjs')], 'api');
run(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host'], 'vite');

console.log('Stack local: Vite + API (sin netlify-cli). Abre http://localhost:5173');
console.log('En el celular usa la URL Network (IP LAN) que muestre Vite, no localhost.');
