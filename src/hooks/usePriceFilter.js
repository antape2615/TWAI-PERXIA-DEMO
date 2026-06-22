import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Hook reutilizable para filtrar una lista de productos por rango de precios
 * y, opcionalmente, por término de búsqueda en nombre o categoría.
 *
 * Devuelve el rango total disponible, los valores actuales del filtro,
 * setters validados (min <= max) y la lista ya filtrada y memoizada.
 *
 * @param {Array<{id: string, name: string, price: number, category?: string}>} products
 * @param {string} [searchTerm='']
 * @param {{ step?: number, onEvent?: (eventName: string, payload?: Record<string, unknown>) => void }} [options]
 */
export function usePriceFilter(products = [], searchTerm = '', options = {}) {
  const { step = 1, onEvent } = options;

  const emitEvent = useCallback(
    (eventName, payload = {}) => {
      if (typeof onEvent === 'function') {
        onEvent(eventName, payload);
      }
    },
    [onEvent]
  );

  const normalizedTerm = (searchTerm || '').trim().toLowerCase();

  const textFilteredProducts = useMemo(() => {
    if (!normalizedTerm) {
      return products || [];
    }

    return (products || []).filter((product) => {
      const name = (product?.name || '').toLowerCase();
      const category = (product?.category || '').toLowerCase();
      return name.includes(normalizedTerm) || category.includes(normalizedTerm);
    });
  }, [products, normalizedTerm]);

  const priceRange = useMemo(() => {
    if (!textFilteredProducts || textFilteredProducts.length === 0) {
      return { min: 0, max: 0, hasProducts: false };
    }

    const prices = textFilteredProducts
      .map((p) => Number(p?.price))
      .filter((p) => Number.isFinite(p));

    if (prices.length === 0) {
      return { min: 0, max: 0, hasProducts: false };
    }

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
      hasProducts: true,
    };
  }, [textFilteredProducts]);

  const [minPrice, setMinPriceState] = useState(priceRange.min);
  const [maxPrice, setMaxPriceState] = useState(priceRange.max);
  const [lastRange, setLastRange] = useState(priceRange);

  if (
    lastRange.min !== priceRange.min ||
    lastRange.max !== priceRange.max ||
    lastRange.hasProducts !== priceRange.hasProducts
  ) {
    setLastRange(priceRange);
    setMinPriceState(priceRange.min);
    setMaxPriceState(priceRange.max);
  }

  useEffect(() => {
    emitEvent('Rango de precios actualizado', {
      searchTerm: normalizedTerm,
      minPrice: priceRange.hasProducts ? priceRange.min : null,
      maxPrice: priceRange.hasProducts ? priceRange.max : null,
      baseProducts: textFilteredProducts.length,
    });
  }, [
    emitEvent,
    normalizedTerm,
    priceRange.hasProducts,
    priceRange.max,
    priceRange.min,
    textFilteredProducts.length,
  ]);

  const normalizeWithStep = useCallback(
    (value) => {
      const bounded = Math.max(priceRange.min, Math.min(value, priceRange.max));
      if (!Number.isFinite(step) || step <= 1) {
        return bounded;
      }
      const snapped =
        priceRange.min +
        Math.round((bounded - priceRange.min) / step) * step;
      return Math.max(priceRange.min, Math.min(snapped, priceRange.max));
    },
    [priceRange.max, priceRange.min, step]
  );

  const setMinPrice = useCallback(
    (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;

      const nextMin = normalizeWithStep(numeric);
      const previousMin = minPrice;
      const previousMax = maxPrice;
      let nextMax = maxPrice;

      if (nextMin > maxPrice) {
        nextMax = nextMin;
        setMaxPriceState(nextMin);
        emitEvent('Validación rango precio', {
          beforeMin: previousMin,
          beforeMax: previousMax,
          afterMin: nextMin,
          afterMax: nextMax,
          adjustedBy: 'min',
        });
      }

      setMinPriceState(nextMin);
      emitEvent('Filtro precio ajustado', {
        changed: 'min',
        minPrice: nextMin,
        maxPrice: nextMax,
      });
    },
    [emitEvent, maxPrice, minPrice, normalizeWithStep]
  );

  const setMaxPrice = useCallback(
    (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;

      const nextMax = normalizeWithStep(numeric);
      const previousMin = minPrice;
      const previousMax = maxPrice;
      let nextMin = minPrice;

      if (nextMax < minPrice) {
        nextMin = nextMax;
        setMinPriceState(nextMax);
        emitEvent('Validación rango precio', {
          beforeMin: previousMin,
          beforeMax: previousMax,
          afterMin: nextMin,
          afterMax: nextMax,
          adjustedBy: 'max',
        });
      }

      setMaxPriceState(nextMax);
      emitEvent('Filtro precio ajustado', {
        changed: 'max',
        minPrice: nextMin,
        maxPrice: nextMax,
      });
    },
    [emitEvent, maxPrice, minPrice, normalizeWithStep]
  );

  const resetPriceFilter = useCallback(() => {
    setMinPriceState(priceRange.min);
    setMaxPriceState(priceRange.max);
  }, [priceRange.min, priceRange.max]);

  const effectiveMinPrice = Math.max(
    priceRange.min,
    Math.min(minPrice, priceRange.max)
  );
  const effectiveMaxPrice = Math.max(
    effectiveMinPrice,
    Math.min(maxPrice, priceRange.max)
  );

  const filteredProducts = useMemo(() => {
    return textFilteredProducts.filter((product) => {
      const price = Number(product?.price) || 0;
      return price >= effectiveMinPrice && price <= effectiveMaxPrice;
    });
  }, [textFilteredProducts, effectiveMinPrice, effectiveMaxPrice]);

  const totalProducts = products?.length ?? 0;

  useEffect(() => {
    emitEvent('Filtro combinado aplicado', {
      searchTerm: normalizedTerm,
      minPrice: effectiveMinPrice,
      maxPrice: effectiveMaxPrice,
      filteredProducts: filteredProducts.length,
      baseProducts: textFilteredProducts.length,
      totalProducts,
    });
  }, [
    emitEvent,
    filteredProducts.length,
    effectiveMaxPrice,
    effectiveMinPrice,
    normalizedTerm,
    textFilteredProducts.length,
    totalProducts,
  ]);

  const isFiltering =
    effectiveMinPrice !== priceRange.min || effectiveMaxPrice !== priceRange.max;

  return {
    priceRange,
    minPrice: effectiveMinPrice,
    maxPrice: effectiveMaxPrice,
    setMinPrice,
    setMaxPrice,
    resetPriceFilter,
    filteredProducts,
    isFiltering,
    hasPriceRange: priceRange.hasProducts,
    step,
  };
}
