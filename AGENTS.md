# AGENTS.md

## Cursor Cloud specific instructions

CocinaStore is a single-product **Vite + React 19 SPA** (Spanish kitchen e-commerce demo) with one
**Netlify Function** (`netlify/functions/auth/auth.js`) backed by **MongoDB Atlas**. There is no
monorepo, no Docker, and no automated test suite (QA is manual / external Selenium using the
`casos_prueba_*` files).

### Running the app

- **Frontend only:** `npm run dev` (Vite, http://localhost:5173). This is what the README documents,
  but it does **not** serve `/api/auth`, so **login / "Mi cuenta" / full checkout will fail** with a
  connection error.
- **Full stack (recommended, enables login):** `netlify dev` (serves Vite + the auth function with the
  `/api/auth/*` redirects on http://localhost:8888). The `netlify-cli` is installed globally during
  environment setup; its bin dir (`$HOME/.npm-global/bin`) is added to `PATH` via `~/.bashrc`. If
  `netlify` is not found, run `npm install -g netlify-cli` (the npm prefix is set to `$HOME/.npm-global`
  so this does not need root). Netlify auto-detects Vite — no extra config needed.

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
  are installed separately during setup.
- Credit-card payment at checkout is **simulated** (client-side only) — no real gateway.
