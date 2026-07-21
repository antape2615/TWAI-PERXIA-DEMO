import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyRedTheme } from './applyRedTheme';

describe('applyRedTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-red-theme');
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies red theme and logs success event (RN-01/RN-03)', () => {
    const result = applyRedTheme();

    expect(result.status).toBe('success');
    expect(document.documentElement.getAttribute('data-red-theme')).toBe('active');
    expect(console.info).toHaveBeenCalledWith(
      '[RedTheme]',
      expect.objectContaining({
        action: 'TemaRojoAplicado',
        status: 'success',
        description: 'Hoja de estilos roja aplicada correctamente',
      })
    );
  });

  it('logs error when CSS variables are missing (fallback path)', () => {
    const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = applyRedTheme();

    expect(result.status).toBe('error');
    expect(result.fallback).toBe(true);
    expect(console.info).toHaveBeenCalledWith(
      '[RedTheme]',
      expect.objectContaining({
        action: 'ErrorAplicacionTemaRojo',
        status: 'error',
      })
    );

    if (import.meta.env.DEV) {
      expect(warnSpy).toHaveBeenCalled();
    }

    getComputedStyleSpy.mockRestore();
  });
});
