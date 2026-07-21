/**
 * Configuración auditoría de botones — Jardín Azuayo
 * BASE_URL: https://www.jardinazuayo.fin.ec/
 */
export const JARDIN_AZUAYO = {
  id: 'JA-BTN-AUDIT',
  cliente: 'Jardín Azuayo',
  baseUrl: process.env.BASE_URL ?? 'https://www.jardinazuayo.fin.ec/',
  /** Umbral para marcar botón como lento (ms) */
  slowThresholdMs: Number(process.env.SLOW_THRESHOLD_MS ?? 2000),
  /** Repeticiones por botón para p50/p95 (1 = sin percentiles) */
  repetitions: Number(process.env.BUTTON_AUDIT_REPETITIONS ?? 1),
  /** Máximo de páginas clave a auditar desde la home */
  maxPages: Number(process.env.BUTTON_AUDIT_MAX_PAGES ?? 12),
  /** Timeout espera estabilidad UI/red tras click (ms) */
  clickSettleTimeoutMs: Number(process.env.CLICK_SETTLE_TIMEOUT_MS ?? 8000),
} as const;

export const EVIDENCE_DIR = 'evidence';
export const SCREENSHOTS_DIR = `${EVIDENCE_DIR}/screenshots`;
export const VIDEO_DIR = `${EVIDENCE_DIR}/video`;
export const TIMINGS_JSON = `${EVIDENCE_DIR}/timings.json`;
export const REPORT_CSV = `${EVIDENCE_DIR}/button-audit-report.csv`;
export const REPORT_MD = `${EVIDENCE_DIR}/button-audit-report.md`;
