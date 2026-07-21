# E2E Playwright — Ficohsa

Suites de pruebas E2E contra **https://www.grupoficohsa.com** (BASE_URL del cliente).

## Auditoría de botones + tiempos de respuesta

Automatiza el inventario de **todos los controles accionables visibles** en la página principal y páginas clave alcanzables desde la navegación. Para cada botón seguro de probar:

1. Click con medición de latencia (click → idle de red / UI estable).
2. Registro de selector, texto, URL antes/después, estado (`ok` / `error` / `skipped`), errores de consola/red.
3. Marcado de botones **lentos** (>2 s) y **rotos**.

### Ejecución

```bash
npm install
npx playwright install chromium

# Auditoría completa + PDF de evidencia
npm run test:button-audit:report

# Solo la suite Playwright
npx playwright test e2e/ficosha/button-audit.spec.ts
```

### Variables opcionales

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BUTTON_SLOW_THRESHOLD_MS` | 2000 | Umbral para marcar botón lento |
| `BUTTON_AUDIT_MAX_PAGES` | 12 | Máximo de páginas internas a auditar |
| `BUTTON_AUDIT_REPEATS` | 1 | Repeticiones por botón (habilita p50/p95 si >1) |

### Evidencia generada

| Ruta | Contenido |
|------|-----------|
| `evidence/timings.json` | Datos crudos de latencias y metadatos |
| `evidence/button-audit-report.csv` | Tabla exportable |
| `evidence/button-audit-report.md` | Reporte Markdown con resumen |
| `evidence/screenshots/button-audit/` | Capturas antes/después por botón |
| `evidence/video/*.webm` | Video de la pasada completa |
| `evidence/report.pdf` | PDF con tabla + capturas |

### Controles excluidos (skipped)

Logout, pagos reales, borrados, envíos irreversibles, newsletter submit, enlaces externos y controles deshabilitados.

### Última ejecución (2026-07-21)

| Resultado | Valor |
|-----------|-------|
| **Páginas auditadas** | 11 (nav principal + secciones clave) |
| **Controles inventariados** | 68 |
| **OK / Error / Skipped** | 59 / 2 / 7 |
| **Lentos (>2 s)** | 0 |
| **p50 / p95 (ok)** | 709 ms / 1255 ms |
| **Hallazgo** | CTA «Prensa Ficohsa» en home no visible tras recarga (2 errores) |

---

## HU-ARQ-001 — Arquitectura SSR / Microfrontends

Suite para validar criterios de aceptación de la historia de usuario **HU-ARQ-001** (arquitectura SSR / microfrontends).

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
