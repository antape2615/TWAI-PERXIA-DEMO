/** CocinaStore brand palette (HU: Identidad visual / Design system). */
export const BRAND_TOKENS = {
  light: {
    primary: '#2d6a4f',
    primaryDark: '#1b4332',
    focusRing: 'rgba(45, 106, 79, 0.4)',
    accent: '#40916c',
  },
  dark: {
    primary: '#74c69d',
    primaryDark: '#52b788',
    focusRing: 'rgba(116, 198, 157, 0.45)',
    accent: '#95d5b2',
  },
};

/** Forbidden legacy brand blues (RN-04). */
export const FORBIDDEN_BRAND_BLUES = [
  '#2563eb',
  '#1e40af',
  '#60a5fa',
  '#3b82f6',
];

/** RGB/RGBA equivalents of forbidden blues. */
export const FORBIDDEN_BRAND_BLUE_PATTERNS = [
  /#2563eb/i,
  /#1e40af/i,
  /#60a5fa/i,
  /#3b82f6/i,
  /rgba?\(\s*37\s*,\s*99\s*,\s*235/i,
  /rgba?\(\s*96\s*,\s*165\s*,\s*250/i,
  /rgba?\(\s*30\s*,\s*64\s*,\s*175/i,
  /rgba?\(\s*59\s*,\s*130\s*,\s*246/i,
];

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio between two hex colors. */
export function contrastRatio(foregroundHex, backgroundHex) {
  const l1 = relativeLuminance(hexToRgb(foregroundHex));
  const l2 = relativeLuminance(hexToRgb(backgroundHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function findForbiddenBrandBlues(source) {
  const hits = [];
  for (const pattern of FORBIDDEN_BRAND_BLUE_PATTERNS) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    let match;
    while ((match = re.exec(source)) !== null) {
      hits.push(match[0]);
    }
  }
  return hits;
}

export function extractCssTokenValue(css, tokenName, selector = ":root[data-theme='light']") {
  const selectorPattern = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{([^}]+)\\}`,
    's',
  );
  const block = css.match(selectorPattern)?.[1] ?? '';
  const tokenPattern = new RegExp(`--${tokenName}\\s*:\\s*([^;]+);`);
  return block.match(tokenPattern)?.[1]?.trim() ?? null;
}
