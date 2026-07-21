/**
 * Configuración — Auditoría de botones UI / performance
 * Cliente: Jardín Azuayo
 */
export const JARDIN_AZUAYO = {
  id: 'JARDIN-AZUAYO-BUTTON-AUDIT',
  cliente: 'Jardín Azuayo',
  baseUrl: process.env.BASE_URL ?? 'https://www.jardinazuayo.fin.ec/',
  /** Umbral de latencia lenta (ms) */
  slowThresholdMs: Number(process.env.SLOW_THRESHOLD_MS ?? 2000),
  /** Repeticiones por botón para p50/p95 */
  repetitions: Number(process.env.BUTTON_AUDIT_REPETITIONS ?? 1),
  /** Páginas clave alcanzables desde la navegación principal */
  keyPages: [
    '/',
    '/historia/',
    '/nosotros/',
    '/ahorros/',
    '/creditos/',
    '/nuevos-canales/',
    '/jardin-azuayo-tiendas/',
    '/calculadoras-credito-ahorro/',
    '/linea-de-credito/',
  ],
} as const;

export const EVIDENCE_DIR = 'evidence';
export const SCREENSHOTS_DIR = `${EVIDENCE_DIR}/screenshots/jardin-azuayo`;
export const VIDEO_DIR = `${EVIDENCE_DIR}/video`;
export const TIMINGS_JSON = `${EVIDENCE_DIR}/timings.json`;
export const CSV_REPORT = `${EVIDENCE_DIR}/button-audit-report.csv`;
export const MD_REPORT = `${EVIDENCE_DIR}/button-audit-report.md`;
export const PDF_REPORT = `${EVIDENCE_DIR}/report.pdf`;
