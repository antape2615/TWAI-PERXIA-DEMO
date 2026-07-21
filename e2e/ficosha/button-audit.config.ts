/**
 * Parámetros de la auditoría de botones / performance UI — Ficohsa.
 */
export const BUTTON_AUDIT = {
  baseUrl: process.env.BASE_URL ?? 'https://www.grupoficohsa.com',
  /** Latencia por encima de la cual se marca el botón como lento (ms) */
  slowThresholdMs: Number(process.env.SLOW_THRESHOLD_MS ?? 2000),
  /** Páginas clave máximas a auditar (home + nav) */
  maxPages: Number(process.env.BUTTON_AUDIT_MAX_PAGES ?? 12),
  /** Botones máximos por página (evita timeouts en páginas muy densas) */
  maxButtonsPerPage: Number(process.env.BUTTON_AUDIT_MAX_BUTTONS ?? 40),
  /** Timeout de espera post-click hasta idle / UI estable (ms) */
  postClickIdleMs: Number(process.env.BUTTON_AUDIT_IDLE_MS ?? 12_000),
  /** Repeticiones por botón (para p50/p95); 1 = una sola medición */
  repetitions: Number(process.env.BUTTON_AUDIT_REPETITIONS ?? 1),
} as const;

export const TIMINGS_JSON = 'evidence/timings.json';
export const BUTTON_REPORT_CSV = 'evidence/button-audit-report.csv';
export const BUTTON_REPORT_MD = 'evidence/button-audit-report.md';

/** Textos / patrones que indican acciones destructivas o fuera de alcance */
export const SKIP_PATTERNS: RegExp[] = [
  /cerrar\s*sesi[oó]n/i,
  /\blogout\b/i,
  /\bsign\s*out\b/i,
  /\bpagar\b/i,
  /\bpayment\b/i,
  /\bcomprar\s+ahora\b/i,
  /\beliminar\b/i,
  /\bborrar\b/i,
  /\bdelete\b/i,
  /\bdescargar\s+estado\s+de\s+cuenta\b/i,
  /\btransferir\b/i,
  /\benviar\s+solicitud\b/i,
  /\bsolicitar\s+cr[eé]dito\b/i,
  /\baplicar\b/i,
  /\bconfirmar\s+pago\b/i,
];

export const ACTIONABLE_SELECTORS = [
  'button:visible',
  'a[role="button"]:visible',
  'input[type="submit"]:visible',
  'input[type="button"]:visible',
  '[role="button"]:visible',
  'a.btn:visible',
  'a.button:visible',
  'a[class*="btn"]:visible',
  'a[class*="cta"]:visible',
  'a[class*="CTA"]:visible',
].join(', ');
