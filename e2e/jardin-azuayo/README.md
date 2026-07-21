# Auditoría de botones — Jardín Azuayo (Playwright)

Suite de **performance UI / QA** que inventaría y prueba **todos los controles accionables** visibles en la web del cliente, midiendo **tiempos de respuesta** desde el click hasta idle de red / UI estable.

**Cliente:** Jardín Azuayo  
**BASE_URL:** https://www.jardinazuayo.fin.ec/

## Alcance

### Controles inventariados

- `button`
- `a[role="button"]`
- `input[type="submit"]`, `input[type="button"]`
- Elementos con `role="button"`
- CTAs principales (enlaces con estilo de botón o textos tipo "Más información", "Calcular", etc.)

### Páginas auditadas

1. Página principal (`BASE_URL`)
2. Páginas clave alcanzables desde header, nav y footer (hasta `BUTTON_AUDIT_MAX_PAGES`, default 12)

### Exclusiones (status `skipped`)

- Cierre de sesión / logout
- Pagos reales y transferencias
- Eliminaciones / borrados
- Envíos irreversibles (denuncias)
- Enlaces externos (app stores, mailto, tel)

## Métricas

| Campo | Descripción |
|-------|-------------|
| `latencyMs` | Tiempo click → red idle / UI estable |
| `p50Ms` / `p95Ms` | Percentiles si `BUTTON_AUDIT_REPETITIONS` > 1 |
| `slow` | `true` si latencia > 2000 ms (configurable) |
| `status` | `ok` / `error` / `skipped` |

## Ejecución

```bash
npm install
npx playwright install chromium

# Auditoría completa contra producción
npx playwright test e2e/jardin-azuayo/button-audit.spec.ts --project=jardin-azuayo-chromium

# Auditoría + PDF de evidencia
npm run test:jardin-azuayo:report
```

### Variables de entorno opcionales

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BASE_URL` | `https://www.jardinazuayo.fin.ec/` | URL del sitio |
| `SLOW_THRESHOLD_MS` | `2000` | Umbral botón lento |
| `BUTTON_AUDIT_MAX_PAGES` | `12` | Máx. páginas desde nav |
| `BUTTON_AUDIT_REPETITIONS` | `1` | Repeticiones por botón (p50/p95) |
| `CLICK_SETTLE_TIMEOUT_MS` | `8000` | Timeout post-click |

## Evidencia generada

| Ruta | Contenido |
|------|-----------|
| `evidence/screenshots/JA-BTN-*-before.png` | Captura antes del click |
| `evidence/screenshots/JA-BTN-*-after.png` | Captura después del click |
| `evidence/video/*.webm` | Video de la pasada completa |
| `evidence/report.pdf` | PDF con tabla + capturas |
| `evidence/timings.json` | Datos crudos de latencias |
| `evidence/button-audit-report.csv` | Reporte tabular CSV |
| `evidence/button-audit-report.md` | Reporte Markdown |
| `evidence/playwright-report.json` | Reporte JSON Playwright |

## Reproducción en CI

```bash
npx playwright test e2e/jardin-azuayo/button-audit.spec.ts --project=jardin-azuayo-chromium
node scripts/generate-jardin-azuayo-pdf.mjs
```
