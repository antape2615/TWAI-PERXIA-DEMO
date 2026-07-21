import '../styles/redTheme.module.css';
import { trackRedThemeEvent } from './redThemeTelemetry';
import {
  RED_THEME_PARAMS,
  validateButtonStyles,
  validateHeaderStyles,
  validateRedThemeContrast,
  validateRedThemeCssVars,
} from './redThemeValidation';

const RED_THEME_ATTR = 'data-red-theme';

export function applyRedTheme() {
  if (typeof document === 'undefined') {
    return { status: 'skipped', reason: 'no-document' };
  }

  const root = document.documentElement;

  try {
    const cssValidation = validateRedThemeCssVars(root);
    const contrast = validateRedThemeContrast();

    if (!cssValidation.ok) {
      const error = `Variables CSS del tema rojo no aplicadas: ${cssValidation.missing.join(', ')}`;
      if (import.meta.env.DEV) {
        console.warn('[RedTheme][DEV]', error);
      }
      trackRedThemeEvent('ErrorAplicacionTemaRojo', {
        status: 'error',
        description: error,
        missingVars: cssValidation.missing,
      });
      return { status: 'error', error, fallback: true };
    }

    root.setAttribute(RED_THEME_ATTR, 'active');

    trackRedThemeEvent('TemaRojoAplicado', {
      status: 'success',
      description: 'Hoja de estilos roja aplicada correctamente',
      params: RED_THEME_PARAMS,
      contrast,
    });

    if (!contrast.passesWcag && import.meta.env.DEV) {
      console.warn(
        '[RedTheme][DEV] Contraste WCAG por debajo del mínimo recomendado (4.5:1)',
        contrast
      );
    }

    return { status: 'success', contrast };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (import.meta.env.DEV) {
      console.warn('[RedTheme][DEV] Error al aplicar tema rojo:', message);
    }
    trackRedThemeEvent('ErrorAplicacionTemaRojo', {
      status: 'error',
      description: message,
    });
    return { status: 'error', error: message, fallback: true };
  }
}

export function auditRedThemeDom() {
  if (typeof document === 'undefined') return;

  const header = document.querySelector('header');
  const headerResult = validateHeaderStyles(header);

  if (!headerResult.ok) {
    const msg = `[RedTheme][DEV] Header sin estilos rojos aplicados (${headerResult.reason})`;
    if (import.meta.env.DEV) {
      console.warn(msg);
    }
    trackRedThemeEvent('HeaderSinTemaRojo', {
      status: 'warning',
      description: msg,
      reason: headerResult.reason,
    });
  } else {
    trackRedThemeEvent('HeaderTemaRojoRenderizado', {
      status: 'success',
      description: 'Header renderizado con tema rojo',
      ...headerResult,
    });
  }

  const buttons = document.querySelectorAll('button:not(:disabled)');
  const invalidButtons = [];

  buttons.forEach((button) => {
    const result = validateButtonStyles(button);
    if (!result.ok && !result.skipped) {
      invalidButtons.push(button);
      if (import.meta.env.DEV) {
        console.warn(
          '[RedTheme][DEV] Botón visible sin tono rojo aplicado:',
          button.textContent?.trim() || button.getAttribute('aria-label') || 'sin etiqueta',
          result
        );
      }
    }
  });

  if (invalidButtons.length > 0) {
    trackRedThemeEvent('BotonesSinTemaRojo', {
      status: 'warning',
      description: `${invalidButtons.length} botón(es) sin estilo rojo detectado(s)`,
      count: invalidButtons.length,
    });
  }

  const icons = document.querySelectorAll('[data-red-icon="true"]');
  trackRedThemeEvent('IconosTemaRojoRenderizados', {
    status: 'success',
    description: 'Iconos renderizados con color aplicado',
    count: icons.length,
  });
}
