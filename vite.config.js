import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    host: true,
    strictPort: false,
    // Túnel Cloudflare / ngrok para iPhone (HTTPS)
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', 'localhost'],
    proxy: {
      // API local (scripts/local-api.mjs) — evita depender de `netlify dev` en Node 26+
      '/api': {
        target: 'http://127.0.0.1:8881',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
