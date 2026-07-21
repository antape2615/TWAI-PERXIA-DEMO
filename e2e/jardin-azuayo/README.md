# E2E Playwright — Auditoría de botones UI (Jardín Azuayo)

Suite de **auditoría de performance UI** contra **https://www.jardinazuayo.fin.ec/**. Inventaría controles accionables, mide latencia desde el click hasta UI/red estable, y genera evidencia para gobernanza.

> **Alcance:** QA / performance. No implementa features de producto.

## Qué audita

| Tipo de control | Selectores |
|-----------------|------------|
| Botones nativos | `button`, `input[type=submit/button]` |
| Role button | `[role="button"]`, `a[role="button"]` |
| CTAs principales | `.btn`, `.button`, `a[class*="btn"]`, links con texto tipo "Más información", "Calcular", etc. |

## Páginas clave (nav principal)

- `/` (inicio)
- `/historia/`, `/nosotros/`
- `/ahorros/`, `/creditos/`, `/nuevos-canales/`, `/jardin-azuayo-tiendas/`
- `/calculadoras-credito-ahorro/`, `/linea-de-credito/`

## Controles excluidos (skipped)

- Cierre de sesión, eliminaciones, pagos reales
- Envíos irreversibles / apertura de cuenta / contratación
- WhatsApp, `mailto:`, `tel:`
- Dominios externos (p. ej. calculadoras en otros hosts)

## Métricas

- **Latencia (ms):** click → `networkidle` / UI estable
- **p50 / p95:** si `BUTTON_AUDIT_REPETITIONS` > 1
- **Lento:** latencia > `SLOW_THRESHOLD_MS` (default 2000 ms)
- **Roto:** click fallido o error HTTP ≥ 500

## Ejecución

```bash
npm install
npx playwright install chromium

# Suite completa contra producción
npx playwright test e2e/jardin-azuayo/button-audit.spec.ts --project=jardin-azuayo-chromium

# Suite + PDF de evidencia
npm run test:jardin-azuayo:report
```

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BASE_URL` | `https://www.jardinazuayo.fin.ec/` | URL del sitio |
| `SLOW_THRESHOLD_MS` | `2000` | Umbral botón lento |
| `BUTTON_AUDIT_REPETITIONS` | `1` | Repeticiones por botón (p50/p95) |

## Evidencia generada

| Ruta | Contenido |
|------|-----------|
| `evidence/timings.json` | Datos crudos de latencias |
| `evidence/button-audit-report.csv` | Tabla exportable |
| `evidence/button-audit-report.md` | Reporte legible |
| `evidence/screenshots/jardin-azuayo/*.png` | Antes/después por botón |
| `evidence/video/*.webm` | Video de la pasada completa |
| `evidence/report.pdf` | PDF con tabla + capturas |

## Última ejecución (2026-07-21)

| Resultado | Valor |
|-----------|-------|
| **Global** | **PASS** (auditoría completada; 1 botón roto detectado) |
| BASE_URL | https://www.jardinazuayo.fin.ec/ |
| Controles inventariados | 39 |
| OK / Error / Skipped | 37 / 1 / 1 |
| Lentos (>2s) | 34 |
| p50 / p95 global | 5329 ms / 5337 ms |

### Hallazgos destacados

- **Roto:** botón búsqueda (`search submit`) no visible en `/historia/`
- **Skipped:** CTA WhatsApp «Solicitar tu crédito» (externo)
- **404:** enlace «Calcular interés» → `servicios.jardinazuayo.fin.ec/calculadora-ja-app/calculadoraAhorros`
- **Lentos:** mayoría de navegaciones internas ~5.3s (medición incluye `networkidle`)
