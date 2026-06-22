import {
  CATALOG_VIEW_STORAGE_KEY,
  DEFAULT_CATALOG_VIEW_MODE,
  persistCatalogViewMode,
  readCatalogViewMode,
} from './catalogViewMode';

describe('catalogViewMode', () => {
  it('uses grid mode when no preference is saved', () => {
    const result = readCatalogViewMode();
    expect(result).toEqual({
      mode: DEFAULT_CATALOG_VIEW_MODE,
      source: 'default',
    });
  });

  it('returns stored list mode when preference is valid', () => {
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, 'list');

    const result = readCatalogViewMode();

    expect(result).toEqual({
      mode: 'list',
      source: 'local_storage',
    });
  });

  it('falls back to grid when preference is invalid', () => {
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, 'compact');

    const result = readCatalogViewMode();

    expect(result).toEqual({
      mode: DEFAULT_CATALOG_VIEW_MODE,
      source: 'invalid_value',
    });
  });

  it('falls back to grid when storage getter throws', () => {
    const brokenStorage = {
      getItem() {
        throw new Error('storage disabled');
      },
    };

    const result = readCatalogViewMode(brokenStorage);

    expect(result).toEqual({
      mode: DEFAULT_CATALOG_VIEW_MODE,
      source: 'storage_error',
    });
  });

  it('persists a valid mode in storage', () => {
    const result = persistCatalogViewMode('list');

    expect(result).toEqual({ ok: true });
    expect(window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY)).toBe('list');
  });

  it('rejects unknown view modes', () => {
    const result = persistCatalogViewMode('table');

    expect(result).toEqual({
      ok: false,
      reason: 'invalid_mode',
    });
  });

  it('returns storage_error when storage write fails', () => {
    const brokenStorage = {
      setItem() {
        throw new Error('storage disabled');
      },
    };

    const result = persistCatalogViewMode('grid', brokenStorage);

    expect(result).toEqual({
      ok: false,
      reason: 'storage_error',
    });
  });
});
