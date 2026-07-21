/**
 * Parámetros de la HU-ARQ-001 (Matriz de Parametrización).
 * Valores objetivo tras análisis de arquitectura SSR/microfrontends.
 */
export const HU_ARQ_001 = {
  id: 'HU-ARQ-001',
  titulo: 'Mejora en la integración y documentación de la arquitectura microfrontend',
  baseUrl: 'https://www.grupoficohsa.com',
  /** RN-01 / CA-RN01-01 — segundos */
  tiempoCargaMaximoInicial: Number(process.env.TIEMPO_CARGA_MAXIMO_INICIAL ?? 8),
  /** RN-02 / CA-RN02-01 — reintentos máximos de integración */
  maxReintentosIntegracion: Number(process.env.MAX_REINTENTOS_INTEGRACION ?? 3),
  /** Tiempo máximo para que el contenido principal sea visible (segundos) */
  tiempoContenidoVisible: 5,
} as const;

export const EVIDENCE_DIR = 'evidence';
export const SCREENSHOTS_DIR = `${EVIDENCE_DIR}/screenshots`;
export const VIDEO_DIR = `${EVIDENCE_DIR}/video`;
export const RESULTS_JSON = `${EVIDENCE_DIR}/test-results.json`;
