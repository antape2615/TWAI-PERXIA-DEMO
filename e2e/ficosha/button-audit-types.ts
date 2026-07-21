export type ButtonKind = 'button' | 'role-button' | 'submit' | 'input-button' | 'cta-link';

export type ButtonStatus = 'ok' | 'error' | 'skipped';

export interface ButtonCandidate {
  index: number;
  kind: ButtonKind;
  tagName: string;
  text: string;
  ariaLabel: string;
  href: string | null;
  selector: string;
  role: string | null;
  type: string | null;
  disabled: boolean;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface ButtonTimingSample {
  latencyMs: number;
  timestamp: string;
}

export interface ButtonAuditRecord {
  id: string;
  pageUrl: string;
  pagePath: string;
  pageTitle: string;
  selector: string;
  text: string;
  kind: ButtonKind;
  tagName: string;
  urlBefore: string;
  urlAfter: string;
  status: ButtonStatus;
  skipReason?: string;
  latencyMs: number;
  samples: ButtonTimingSample[];
  p50Ms: number | null;
  p95Ms: number | null;
  slow: boolean;
  broken: boolean;
  consoleErrors: string[];
  networkErrors: string[];
  screenshotBefore?: string;
  screenshotAfter?: string;
  error?: string;
  auditedAt: string;
}

export interface ButtonAuditSummary {
  baseUrl: string;
  auditedAt: string;
  pagesVisited: string[];
  totalButtons: number;
  ok: number;
  error: number;
  skipped: number;
  slow: number;
  broken: number;
  globalP50Ms: number | null;
  globalP95Ms: number | null;
  records: ButtonAuditRecord[];
}
