import {
  COLUMN_CONSTRAINTS,
  CATALOG_COLUMNS_STORAGE_KEY,
  constrainColumnsByDevice,
  getBreakpointFromWidth,
  getMaxColumnsByDevice,
  persistCatalogColumns,
  readCatalogColumns,
  validateColumns,
} from './columnValidator';

describe('columnValidator', () => {
  describe('validateColumns', () => {
    it('accepts valid values between 1 and 5', () => {
      expect(validateColumns(1)).toEqual({ isValid: true, value: 1, error: null });
      expect(validateColumns('3')).toEqual({ isValid: true, value: 3, error: null });
      expect(validateColumns(5)).toEqual({ isValid: true, value: 5, error: null });
    });

    it('rejects invalid numbers', () => {
      expect(validateColumns(0).isValid).toBe(false);
      expect(validateColumns(6).isValid).toBe(false);
      expect(validateColumns('').isValid).toBe(false);
      expect(validateColumns('abc').isValid).toBe(false);
      expect(validateColumns(null).isValid).toBe(false);
    });

    it('returns Spanish error messages', () => {
      expect(validateColumns(0).error).toMatch(/entre 1 y 5/);
      expect(validateColumns('').error).toBe('Debe ser un número válido');
    });
  });

  describe('getMaxColumnsByDevice', () => {
    it('returns device-specific caps', () => {
      expect(getMaxColumnsByDevice('xs')).toBe(1);
      expect(getMaxColumnsByDevice('sm')).toBe(2);
      expect(getMaxColumnsByDevice('md')).toBe(3);
      expect(getMaxColumnsByDevice('lg')).toBe(4);
      expect(getMaxColumnsByDevice('xl')).toBe(5);
    });

    it('falls back to default for unknown breakpoints', () => {
      expect(getMaxColumnsByDevice('unknown')).toBe(COLUMN_CONSTRAINTS.DEFAULT);
    });
  });

  describe('constrainColumnsByDevice', () => {
    it('limits columns to device maximum', () => {
      expect(constrainColumnsByDevice(5, 'md')).toBe(3);
      expect(constrainColumnsByDevice(2, 'xl')).toBe(2);
    });
  });

  describe('getBreakpointFromWidth', () => {
    it('maps widths to breakpoints', () => {
      expect(getBreakpointFromWidth(320)).toBe('xs');
      expect(getBreakpointFromWidth(479)).toBe('xs');
      expect(getBreakpointFromWidth(480)).toBe('sm');
      expect(getBreakpointFromWidth(767)).toBe('sm');
      expect(getBreakpointFromWidth(768)).toBe('md');
      expect(getBreakpointFromWidth(1023)).toBe('md');
      expect(getBreakpointFromWidth(1024)).toBe('lg');
      expect(getBreakpointFromWidth(1439)).toBe('lg');
      expect(getBreakpointFromWidth(1440)).toBe('xl');
    });
  });

  describe('readCatalogColumns', () => {
    it('returns default when no preference is saved', () => {
      expect(readCatalogColumns()).toEqual({
        columns: COLUMN_CONSTRAINTS.DEFAULT,
        source: 'default',
      });
    });

    it('returns stored value when valid', () => {
      window.localStorage.setItem(CATALOG_COLUMNS_STORAGE_KEY, '4');

      expect(readCatalogColumns()).toEqual({
        columns: 4,
        source: 'local_storage',
      });
    });

    it('falls back to default when stored value is invalid', () => {
      window.localStorage.setItem(CATALOG_COLUMNS_STORAGE_KEY, '9');

      expect(readCatalogColumns()).toEqual({
        columns: COLUMN_CONSTRAINTS.DEFAULT,
        source: 'invalid_value',
      });
    });
  });

  describe('persistCatalogColumns', () => {
    it('persists valid column preference', () => {
      const result = persistCatalogColumns(4);

      expect(result).toEqual({ ok: true });
      expect(window.localStorage.getItem(CATALOG_COLUMNS_STORAGE_KEY)).toBe('4');
    });

    it('rejects invalid column values', () => {
      const result = persistCatalogColumns(0);

      expect(result).toEqual({ ok: false, reason: 'invalid_columns' });
    });
  });
});
