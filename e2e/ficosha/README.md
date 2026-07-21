# E2E Playwright — Ficohsa HU-ARQ-001

Suite de pruebas E2E contra **https://www.grupoficohsa.com** para validar criterios de aceptación de la historia de usuario **HU-ARQ-001** (arquitectura SSR / microfrontends).

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

---

## Auditoría de botones UI (latencia / performance)

Suite independiente que inventaría **todos los controles accionables** visibles en la home y páginas clave del nav, mide **tiempo de respuesta** (click → red idle / UI estable) y genera evidencia para gobernanza.

### Alcance

| Selector / control | Incluido |
|--------------------|----------|
| `button`, `input[type=submit/button]` | ✅ |
| `[role=button]`, `a[role=button]` | ✅ |
| CTAs (`a.btn`, `a.button`, `a[class*=cta]`) | ✅ |
| Logout, pagos, borrados, envíos irreversibles | ⏭ skipped con motivo |

### Ejecución

```bash
npm install
npx playwright install chromium

# Auditoría completa contra producción
npx playwright test e2e/ficosha/button-audit.spec.ts

# Auditoría + PDF de evidencia
npm run test:button-audit:report
```

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BASE_URL` | `https://www.grupoficohsa.com` | Sitio bajo prueba |
| `SLOW_THRESHOLD_MS` | `2000` | Umbral botón lento |
| `BUTTON_AUDIT_MAX_PAGES` | `8` | Páginas clave desde nav |
| `BUTTON_AUDIT_MAX_BUTTONS` | `40` | Botones máx. por página |
| `BUTTON_AUDIT_REPEAT` | `1` | Repeticiones (p50/p95) |

### Evidencia generada

| Ruta | Contenido |
|------|-----------|
| `evidence/timings.json` | Datos crudos: latencias, status, errores consola/red |
| `evidence/button-audit.csv` | Tabla exportable |
| `evidence/button-audit.md` | Reporte Markdown con p50/p95 y botones lentos/rotos |
| `evidence/screenshots/BTN-*-before.png` | Captura antes del click |
| `evidence/screenshots/BTN-*-after.png` | Captura después del click |
| `evidence/video/*.webm` | Video de la pasada completa |
| `evidence/report.pdf` | PDF con tabla + capturas |
