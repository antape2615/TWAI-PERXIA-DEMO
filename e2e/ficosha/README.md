# E2E Playwright — Ficohsa

Suites de pruebas E2E contra **https://www.grupoficohsa.com**.

## Auditoría de botones — Performance UI

Suite automatizada que inventaría **todos los controles accionables** visibles en la home y páginas clave del nav, mide **tiempo de respuesta** (click → idle de red / UI estable) y genera evidencia de gobernanza.

### Alcance

| Selector / control | Incluido |
|--------------------|----------|
| `button` | ✅ |
| `a[role=button]` | ✅ |
| `input[type=submit/button]` | ✅ |
| `[role=button]` | ✅ |
| CTAs (`a.btn`, `a[class*="cta"]`) | ✅ |

**Excluidos (status `skipped`):** logout, pagos reales, borrados, transferencias, enlaces externos, mailto/tel.

### Ejecución

```bash
npm install
npx playwright install chromium

# Auditoría completa de botones
npx playwright test e2e/ficosha/button-audit.spec.ts

# Auditoría + PDF de evidencia
npm run test:button-audit:report
```

### Variables opcionales

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BASE_URL` | `https://www.grupoficohsa.com` | URL del cliente |
| `SLOW_THRESHOLD_MS` | `2000` | Umbral botón lento |
| `BUTTON_AUDIT_MAX_PAGES` | `12` | Páginas máximas desde nav |
| `BUTTON_AUDIT_MAX_BUTTONS` | `40` | Botones máximos por página |
| `BUTTON_AUDIT_REPETITIONS` | `1` | Repeticiones (p50/p95) |

### Evidencia generada (auditoría de botones)

| Ruta | Contenido |
|------|-----------|
| `evidence/timings.json` | Datos crudos: latencias, URLs, errores |
| `evidence/button-audit-report.csv` | Tabla exportable |
| `evidence/button-audit-report.md` | Reporte legible con p50/p95 |
| `evidence/screenshots/btn-*-before.png` | Captura antes del click |
| `evidence/screenshots/btn-*-after.png` | Captura después del click |
| `evidence/video/*.webm` | Video de la pasada completa |
| `evidence/report.pdf` | PDF con tabla + capturas |

### Última ejecución — auditoría de botones (2026-07-21)

| Resultado | Valor |
|-----------|-------|
| **Global** | **PASS** (1 passed) |
| BASE_URL | https://www.grupoficohsa.com |
| Botones inventariados | 63 (59 ok / 3 error / 1 skipped) |
| Latencia p50 / p95 | 441 ms / 464 ms |
| Lentos (>2s) | 0 |
| Rotos | 3 (`Suscribirme`, `control-4`, `control-5`) |
| Páginas auditadas | 12 (home + nav) |

Evidencia: `evidence/timings.json`, `evidence/button-audit-report.csv`, `evidence/screenshots/btn-*`, `evidence/video/*.webm`, `evidence/report.pdf`

---

## HU-ARQ-001 — Arquitectura SSR / Microfrontends

## Casos de prueba derivados

| ID | Criterio / Regla | Descripción |
|----|------------------|-------------|
| TC-ARQ-001-01 | CA-RN01-01 / RN-01 | Tiempo de carga inicial ≤ `TiempoCargaMaximoInicial` (8 s) |
| TC-ARQ-001-02 | CA-RN01-01 / RN-01 | Documento SSR HTTP 200 con HTML y título válidos |
| TC-ARQ-001-03 | RN-01 / HU visitante | Contenido principal visible, sin pantalla en blanco |
| TC-ARQ-001-04 | CA-RN02-01 / RN-02 | Sin errores críticos de consola en carga inicial |
| TC-ARQ-001-05 | CA-RN02-01 / RN-02 | Recursos de integración sin fallos HTTP ≥ 400 |
| TC-ARQ-001-06 | RN-02 / HU visitante | Navegación interna fluida entre secciones |
| TC-ARQ-001-07 | CA-RN02-02 / RN-02 | UI controlada sin página de error del servidor |
| TC-ARQ-001-08 | CA-RN01-01 / RN-01 | Métricas Performance API registradas para auditoría |

**Fuera de alcance E2E:** CA-RN03-01 (documentación técnica versionada con diagramas) — validación manual.

## Parámetros

| Parámetro | Valor por defecto | Variable de entorno |
|-----------|-------------------|---------------------|
| TiempoCargaMaximoInicial | 8 s | `TIEMPO_CARGA_MAXIMO_INICIAL` |
| MaxReintentosIntegracion | 3 | `MAX_REINTENTOS_INTEGRACION` |

## Ejecución

```bash
npm install
npx playwright install chromium

# Ejecutar suite E2E
npx playwright test e2e/ficosha/hu-arq-001.spec.ts

# Ejecutar y generar PDF de evidencia
npm run test:e2e:report
```

## Evidencia generada

| Ruta | Contenido |
|------|-----------|
| `evidence/screenshots/*.png` | Capturas happy-path por caso |
| `evidence/video/*.webm` | Videos en fallos (copiados desde test-results) |
| `evidence/report.pdf` | PDF con resumen, capturas incrustadas y links a video |
| `evidence/test-results.json` | Resultados estructurados por caso |
| `evidence/playwright-report.json` | Reporte JSON de Playwright |
| `evidence/html-report/index.html` | Reporte HTML interactivo |

## Última ejecución (2026-07-21)

| Resultado | Valor |
|-----------|-------|
| **Global** | **FAIL** (7 passed / 1 failed) |
| BASE_URL | https://www.grupoficohsa.com |
| Tiempo carga inicial medido | ~1.9 s (límite 8 s) ✅ |
| Caso fallido | TC-ARQ-001-04 — errores JS en consola del sitio |

### Fallo documentado (TC-ARQ-001-04)

Errores detectados en consola del sitio en producción:

1. `Cannot read properties of null (reading 'getAttribute')`
2. `Cannot read properties of undefined (reading 'addEventListener')`
3. Aviso CSP report-only (informativo)

Evidencia: `evidence/screenshots/TC-ARQ-001-04-failure.png`, `evidence/video/*.webm`, `evidence/report.pdf`
