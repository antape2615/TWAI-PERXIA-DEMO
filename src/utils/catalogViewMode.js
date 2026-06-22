export const CATALOG_VIEW_STORAGE_KEY = 'cocinastore_catalog_view';
export const DEFAULT_CATALOG_VIEW_MODE = 'grid';
export const VALID_CATALOG_VIEW_MODES = ['grid', 'list'];

export function isValidCatalogViewMode(mode) {
  return VALID_CATALOG_VIEW_MODES.includes(mode);
}

export function readCatalogViewMode(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return {
      mode: DEFAULT_CATALOG_VIEW_MODE,
      source: 'storage_unavailable',
    };
  }

  try {
    const value = storage.getItem(CATALOG_VIEW_STORAGE_KEY);
    if (isValidCatalogViewMode(value)) {
      return {
        mode: value,
        source: 'local_storage',
      };
    }

    return {
      mode: DEFAULT_CATALOG_VIEW_MODE,
      source: value == null ? 'default' : 'invalid_value',
    };
  } catch {
    return {
      mode: DEFAULT_CATALOG_VIEW_MODE,
      source: 'storage_error',
    };
  }
}

export function persistCatalogViewMode(mode, storage = globalThis?.localStorage) {
  if (!isValidCatalogViewMode(mode)) {
    return {
      ok: false,
      reason: 'invalid_mode',
    };
  }

  if (!storage || typeof storage.setItem !== 'function') {
    return {
      ok: false,
      reason: 'storage_unavailable',
    };
  }

  try {
    storage.setItem(CATALOG_VIEW_STORAGE_KEY, mode);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: 'storage_error',
    };
  }
}
