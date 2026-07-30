# AGENTS.md

## Cursor Cloud specific instructions

CocinaStore is a single-product **Vite + React 19 SPA** (Spanish kitchen e-commerce demo) with
**Netlify Functions** (`netlify/functions/auth/auth.js`, `netlify/functions/cobranzas/cobranzas.js`,
`netlify/functions/realtime/realtime.js`) backed by **MongoDB Atlas**. Unit tests: `npm test`
(Vitest). Manual QA also uses `casos_prueba_*` files / Selenium.

### Running the app

- **Frontend only:** `npm run dev` (Vite, http://localhost:5173). This is what the README documents,
  but it does **not** serve `/api/auth`, so **login / "Mi cuenta" / full checkout will fail** with a
  connection error.
- **Full stack (recommended, enables login):** `npm run dev:full` — arranca Vite +
  `scripts/local-api.mjs` (auth/cobranzas/realtime) con proxy `/api` → `http://127.0.0.1:8881`.
  Abre **http://localhost:5173**. Carga `.env` vía `--env-file`. Esto evita `netlify dev`, que falla
  en Node 24+/26 con `TypeError: ... 'prototype'`. Opcional: `npm run dev:netlify` si usas Node LTS
  (22) y tienes `netlify-cli`.
- **Cobranzas (admin):** route `/admin/cobranzas` («Gestiona tus créditos»), API `/api/cobranzas/*`.
  Login admin: **admin@cocina.com** / **admin123** (`node scripts/ensure-admin-user.js`). La
  colección `cobranzas` se siembra automáticamente al primer listado (o `node scripts/seed-cobranzas.js`).
- **Chatbot de voz (Realtime):** en `/admin/cobranzas`, API `/api/realtime/*`. Requiere
  `OPENAI_API_KEY` (y opcionalmente `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`). Usa
  `npm run dev:full`. **iPhone/Safari:** HTTP en LAN no funciona (exige HTTPS + micrófono). Con
  el stack corriendo, en otra terminal: `npm run tunnel` (Cloudflare) y abre/escanea la URL
  `https://….trycloudflare.com`.

### Auth / MongoDB

- The auth function has **committed MongoDB Atlas credentials as a fallback** in `auth.js`, so login
  works out-of-the-box against a shared cloud DB with no local env setup. Override with `MONGODB_URI`
  (or `MONGO_URI`), `MONGODB_DATABASE`, `MONGODB_COLLECTION` if pointing at your own DB.
- Demo login: `demo@cocina.com` / `demo123`.
- Optional DB seeding scripts (need a reachable MongoDB): `node scripts/seed-users-mongo.js`,
  `node scripts/ensure-demo-user.js`. Not required if using the shared Atlas DB.

### Lint / build

- Lint: `npm run lint` (ESLint flat config; currently 0 errors, 3 `react-refresh` warnings — expected).
- Build: `npm run build` (Vite → `dist/`). Preview a prod build with `npm run preview`.

### Notes

- The auth function has its own `package.json` in `netlify/functions/auth/` (only `mongodb`); its deps
  are installed separately during setup. The cobranzas and realtime functions mirror this under
  `netlify/functions/cobranzas/` and `netlify/functions/realtime/` (`npm run postinstall` at repo root
  installs all three).
- Credit-card payment at checkout is **simulated** (client-side only) — no real gateway.
