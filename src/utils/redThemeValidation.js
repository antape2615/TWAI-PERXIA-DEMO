import redThemeParams from '../styles/redTheme.module.css';

export const RED_THEME_PARAMS = {
  colorBotonRojo: redThemeParams.colorBotonRojo,
  colorIconoRojo: redThemeParams.colorIconoRojo,
  colorFondoHeaderRojo: redThemeParams.colorFondoHeaderRojo,
  colorTextoHeaderRojo: redThemeParams.colorTextoHeaderRojo,
  colorBotonRojoHover: redThemeParams.colorBotonRojoHover,
  colorBotonDeshabilitado: redThemeParams.colorBotonDeshabilitado,
};

const REQUIRED_CSS_VARS = [
  '--color-boton-rojo',
  '--color-icono-rojo',
  '--color-fondo-header-rojo',
  '--color-texto-header-rojo',
  '--color-boton-rojo-hover',
  '--primary',
  '--header-bg',
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

export function getContrastRatio(foregroundHex, backgroundHex) {
  const l1 = relativeLuminance(hexToRgb(foregroundHex));
  const l2 = relativeLuminance(hexToRgb(backgroundHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateRedThemeContrast(params = RED_THEME_PARAMS) {
  const headerContrast = getContrastRatio(
    params.colorTextoHeaderRojo,
    params.colorFondoHeaderRojo
  );
  const buttonContrast = getContrastRatio('#ffffff', params.colorBotonRojo);

  return {
    headerContrast,
    buttonContrast,
    passesWcag: headerContrast >= 4.5 && buttonContrast >= 4.5,
  };
}

export function validateRedThemeCssVars(root = document.documentElement) {
  const missing = REQUIRED_CSS_VARS.filter((name) => {
    const value = getComputedStyle(root).getPropertyValue(name).trim();
    return !value;
  });

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function validateHeaderStyles(headerElement) {
  if (!headerElement) {
    return { ok: false, reason: 'header-not-found' };
  }

  const styles = getComputedStyle(headerElement);
  const bg = styles.backgroundColor;
  const color = styles.color;

  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
    return { ok: false, reason: 'header-background-missing' };
  }

  if (!color) {
    return { ok: false, reason: 'header-text-color-missing' };
  }

  return { ok: true, backgroundColor: bg, color };
}

export function validateButtonStyles(buttonElement) {
  if (!buttonElement || buttonElement.disabled) {
    return { ok: true, skipped: true };
  }

  const styles = getComputedStyle(buttonElement);
  const bg = styles.backgroundColor;
  const border = styles.borderColor;

  const hasRedTone =
    (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') ||
    (border && border !== 'rgba(0, 0, 0, 0)');

  return {
    ok: hasRedTone,
    backgroundColor: bg,
    borderColor: border,
  };
}
