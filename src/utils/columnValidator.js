export const COLUMN_CONSTRAINTS = {
  MIN: 1,
  MAX: 5,
  DEFAULT: 3,
};

export const CATALOG_COLUMNS_STORAGE_KEY = 'cocinastore_catalog_columns';

const MAX_COLUMNS_BY_DEVICE = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
};

/**
 * @param {number|string} value
 * @returns {{ isValid: boolean, value: number, error: string|null }}
 */
export function validateColumns(value) {
  if (value === '' || value == null) {
    return {
      isValid: false,
      value: COLUMN_CONSTRAINTS.DEFAULT,
      error: 'Debe ser un número válido',
    };
  }

  const numValue = typeof value === 'string' ? parseInt(value, 10) : value;

  if (!Number.isFinite(numValue) || Number.isNaN(numValue)) {
    return {
      isValid: false,
      value: COLUMN_CONSTRAINTS.DEFAULT,
      error: 'Debe ser un número válido',
    };
  }

  if (numValue < COLUMN_CONSTRAINTS.MIN || numValue > COLUMN_CONSTRAINTS.MAX) {
    return {
      isValid: false,
      value: COLUMN_CONSTRAINTS.DEFAULT,
      error: `Las columnas deben estar entre ${COLUMN_CONSTRAINTS.MIN} y ${COLUMN_CONSTRAINTS.MAX}`,
    };
  }

  return {
    isValid: true,
    value: numValue,
    error: null,
  };
}

/**
 * @param {string} breakpoint
 * @returns {number}
 */
export function getMaxColumnsByDevice(breakpoint) {
  return MAX_COLUMNS_BY_DEVICE[breakpoint] ?? COLUMN_CONSTRAINTS.DEFAULT;
}

/**
 * @param {number} requestedColumns
 * @param {string} breakpoint
 * @returns {number}
 */
export function constrainColumnsByDevice(requestedColumns, breakpoint) {
  const maxForDevice = getMaxColumnsByDevice(breakpoint);
  return Math.min(requestedColumns, maxForDevice);
}

/**
 * @param {number} width
 * @returns {'xs'|'sm'|'md'|'lg'|'xl'}
 */
export function getBreakpointFromWidth(width) {
  if (width < 480) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1440) return 'lg';
  return 'xl';
}

/**
 * @param {number} columns
 * @param {Storage} [storage]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function persistCatalogColumns(columns, storage = globalThis?.localStorage) {
  const validation = validateColumns(columns);

  if (!validation.isValid) {
    return { ok: false, reason: 'invalid_columns' };
  }

  if (!storage || typeof storage.setItem !== 'function') {
    return { ok: false, reason: 'storage_unavailable' };
  }

  try {
    storage.setItem(CATALOG_COLUMNS_STORAGE_KEY, String(validation.value));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage_error' };
  }
}

/**
 * @param {Storage} [storage]
 * @returns {{ columns: number, source: string }}
 */
export function readCatalogColumns(storage = globalThis?.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return {
      columns: COLUMN_CONSTRAINTS.DEFAULT,
      source: 'storage_unavailable',
    };
  }

  try {
    const stored = storage.getItem(CATALOG_COLUMNS_STORAGE_KEY);
    if (stored == null) {
      return {
        columns: COLUMN_CONSTRAINTS.DEFAULT,
        source: 'default',
      };
    }

    const validation = validateColumns(stored);
    if (validation.isValid) {
      return {
        columns: validation.value,
        source: 'local_storage',
      };
    }

    return {
      columns: COLUMN_CONSTRAINTS.DEFAULT,
      source: 'invalid_value',
    };
  } catch {
    return {
      columns: COLUMN_CONSTRAINTS.DEFAULT,
      source: 'storage_error',
    };
  }
}
