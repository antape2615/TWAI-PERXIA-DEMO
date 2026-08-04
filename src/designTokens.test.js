import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAND_TOKENS,
  FORBIDDEN_BRAND_BLUES,
  contrastRatio,
  extractCssTokenValue,
  findForbiddenBrandBlues,
} from './utils/designTokens.js';

const SRC_ROOT = dirname(fileURLToPath(import.meta.url));

function collectSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectSourceFiles(fullPath, acc);
      continue;
    }
    const ext = extname(fullPath);
    if (ext === '.css' || ext === '.jsx' || ext === '.js') {
      if (entry === 'designTokens.js' || entry === 'designTokens.test.js') {
        continue;
      }
      acc.push(fullPath);
    }
  }
  return acc;
}

describe('CocinaStore design tokens — paleta verde (HU Identidad visual)', () => {
  const indexCss = readFileSync(join(SRC_ROOT, 'index.css'), 'utf8');
  const srcFiles = collectSourceFiles(SRC_ROOT);

  it('CA-03 / RN-04: no forbidden brand blues in src/', () => {
    const violations = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf8');
      const hits = findForbiddenBrandBlues(content);
      if (hits.length > 0) {
        violations.push({ file, hits });
      }
    }
    expect(violations).toEqual([]);
  });

  it.each(FORBIDDEN_BRAND_BLUES)('RN-04: index.css must not define legacy blue %s', (hex) => {
    expect(indexCss.toLowerCase()).not.toContain(hex.toLowerCase());
  });

  it('CA-01 / RN-01: light theme tokens match approved green palette', () => {
    expect(extractCssTokenValue(indexCss, 'primary')).toBe(BRAND_TOKENS.light.primary);
    expect(extractCssTokenValue(indexCss, 'primary-dark')).toBe(BRAND_TOKENS.light.primaryDark);
    expect(extractCssTokenValue(indexCss, 'focus-ring')).toBe(BRAND_TOKENS.light.focusRing);
    expect(extractCssTokenValue(indexCss, 'accent')).toBe(BRAND_TOKENS.light.accent);
  });

  it('CA-02 / RN-01: dark theme tokens match approved green palette', () => {
    const darkSelector = ":root[data-theme='dark']";
    expect(extractCssTokenValue(indexCss, 'primary', darkSelector)).toBe(BRAND_TOKENS.dark.primary);
    expect(extractCssTokenValue(indexCss, 'primary-dark', darkSelector)).toBe(
      BRAND_TOKENS.dark.primaryDark,
    );
    expect(extractCssTokenValue(indexCss, 'focus-ring', darkSelector)).toBe(
      BRAND_TOKENS.dark.focusRing,
    );
    expect(extractCssTokenValue(indexCss, 'accent', darkSelector)).toBe(BRAND_TOKENS.dark.accent);
  });

  it('CA-04 / RN-05: var() fallbacks in CSS modules use green family, not blue', () => {
    const cssFiles = srcFiles.filter((f) => f.endsWith('.css') && f !== join(SRC_ROOT, 'index.css'));
    const badFallbacks = [];
    for (const file of cssFiles) {
      const content = readFileSync(file, 'utf8');
      const hits = findForbiddenBrandBlues(content);
      if (hits.length > 0) {
        badFallbacks.push({ file, hits });
      }
    }
    expect(badFallbacks).toEqual([]);
  });

  it('CA-11 / RN-06: primary buttons and links meet WCAG 2.1 AA contrast on light theme', () => {
    const whiteOnPrimary = contrastRatio('#ffffff', BRAND_TOKENS.light.primary);
    const primaryOnPage = contrastRatio(BRAND_TOKENS.light.primary, '#faf8f5');
    expect(whiteOnPrimary).toBeGreaterThanOrEqual(4.5);
    expect(primaryOnPage).toBeGreaterThanOrEqual(4.5);
  });

  it('CA-11 / RN-06: dark theme primary buttons meet WCAG 2.1 AA with on-primary text', () => {
    const onPrimaryContrast = contrastRatio(BRAND_TOKENS.dark.primary, '#1c1917');
    const primaryLinkContrast = contrastRatio(BRAND_TOKENS.dark.primary, '#1c1917');
    expect(onPrimaryContrast).toBeGreaterThanOrEqual(4.5);
    expect(primaryLinkContrast).toBeGreaterThanOrEqual(4.5);
  });

  it('RN-03: semantic error colors remain in CSS (not replaced by brand green)', () => {
    const allCss = srcFiles
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(allCss).toMatch(/#dc2626|#9b1c1c|#fde8e8/);
    expect(allCss).toMatch(/#92400e|#fcd34d|#fffbeb/);
  });
});
