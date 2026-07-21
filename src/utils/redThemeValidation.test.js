import { describe, expect, it, vi } from 'vitest';
import {
  getContrastRatio,
  RED_THEME_PARAMS,
  validateRedThemeContrast,
  validateRedThemeCssVars,
} from './redThemeValidation';

describe('redThemeValidation', () => {
  it('exports parameterized red theme colors from CSS module', () => {
    expect(RED_THEME_PARAMS.colorBotonRojo).toBe('#b22222');
    expect(RED_THEME_PARAMS.colorIconoRojo).toBe('#b22222');
    expect(RED_THEME_PARAMS.colorFondoHeaderRojo).toBe('#8b0000');
    expect(RED_THEME_PARAMS.colorTextoHeaderRojo).toBe('#ffffff');
  });

  it('meets WCAG contrast for header and primary buttons (CA-04)', () => {
    const result = validateRedThemeContrast();

    expect(result.headerContrast).toBeGreaterThanOrEqual(4.5);
    expect(result.buttonContrast).toBeGreaterThanOrEqual(4.5);
    expect(result.passesWcag).toBe(true);
  });

  it('calculates contrast ratio between white and firebrick red', () => {
    const ratio = getContrastRatio('#ffffff', '#b22222');
    expect(ratio).toBeGreaterThan(4.5);
  });

  it('detects missing CSS variables when not applied', () => {
    const mockRoot = {
      style: {},
    };

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    });

    const result = validateRedThemeCssVars(mockRoot);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
