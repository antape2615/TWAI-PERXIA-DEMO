import { useCallback, useMemo, useState } from 'react';
import {
  COLUMN_CONSTRAINTS,
  constrainColumnsByDevice,
  persistCatalogColumns,
  readCatalogColumns,
  validateColumns,
} from '../utils/columnValidator';

/**
 * @param {{ defaultColumns?: number, breakpoint?: string }} [options]
 */
export function useColumnPreference(options = {}) {
  const {
    defaultColumns = COLUMN_CONSTRAINTS.DEFAULT,
    breakpoint = 'md',
  } = options;

  const [preference, setPreference] = useState(() => {
    const stored = readCatalogColumns();
    return stored.columns;
  });

  const [inputValue, setInputValue] = useState(() => String(readCatalogColumns().columns));
  const [error, setError] = useState(null);

  const effectiveColumns = useMemo(
    () => constrainColumnsByDevice(preference, breakpoint),
    [preference, breakpoint]
  );

  const setColumnInput = useCallback((value) => {
    setInputValue(String(value));

    if (value === '') {
      setError('Debe ser un número válido');
      return false;
    }

    const validation = validateColumns(value);

    if (!validation.isValid) {
      setError(validation.error);
      return false;
    }

    const persisted = persistCatalogColumns(validation.value);

    if (!persisted.ok) {
      setError('No fue posible guardar tu preferencia de columnas.');
      return false;
    }

    setPreference(validation.value);
    setInputValue(String(validation.value));
    setError(null);
    return true;
  }, []);

  const resetToDefault = useCallback(() => {
    const persisted = persistCatalogColumns(defaultColumns);

    if (!persisted.ok) {
      setError('No fue posible guardar tu preferencia de columnas.');
      return false;
    }

    setPreference(defaultColumns);
    setInputValue(String(defaultColumns));
    setError(null);
    return true;
  }, [defaultColumns]);

  return {
    columns: preference,
    inputValue,
    setColumnInput,
    error,
    isValid: error === null,
    resetToDefault,
    effectiveColumns,
  };
}

export default useColumnPreference;
