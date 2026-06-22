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
 * @param {{ step?: number, onEvent?: (eventName: string, payload: Record<string, unknown>) => void }} [options]
 */
export function usePriceFilter(products = [], searchTerm = '', options = {}) {
  const { step = 1, onEvent } = options;

  const normalizedTerm = (searchTerm || '').trim().toLowerCase();

  const emitEvent = useCallback(
    (eventName, payload = {}) => {
      if (typeof onEvent !== 'function') return;
      onEvent(eventName, payload);
    },
    [onEvent]
  );

  const normalizeByStep = useCallback(
    (value, minReference) => {
      if (!Number.isFinite(value)) return minReference;
      if (step <= 1) return value;
      const stepsFromMin = Math.round((value - minReference) / step);
      return minReference + (stepsFromMin * step);
    },
    [step]
  );

  const matchTextFilter = useCallback(
    (product) => {
      if (!normalizedTerm) return true;
      const name = (product?.name || '').toLowerCase();
      const category = (product?.category || '').toLowerCase();
      return name.includes(normalizedTerm) || category.includes(normalizedTerm);
    },
    [normalizedTerm]
  );

  const textFilteredProducts = useMemo(
    () => (products || []).filter(matchTextFilter),
    [products, matchTextFilter]
  );

  const priceRange = useMemo(() => {
    if (!textFilteredProducts.length) {
      return { min: 0, max: 0 };
    }
    const prices = textFilteredProducts
      .map((p) => Number(p?.price))
      .filter((p) => Number.isFinite(p));
    if (prices.length === 0) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [textFilteredProducts]);

  const [minPrice, setMinPriceState] = useState(priceRange.min);
  const [maxPrice, setMaxPriceState] = useState(priceRange.max);
  const [lastRange, setLastRange] = useState(priceRange);

  if (
    lastRange.min !== priceRange.min ||
    lastRange.max !== priceRange.max
  ) {
    setLastRange(priceRange);
    setMinPriceState(priceRange.min);
    setMaxPriceState(priceRange.max);
  }

  useEffect(() => {
    emitEvent('price_range_calculated', {
      searchTerm: normalizedTerm,
      visibleCatalogCount: textFilteredProducts.length,
      minRange: priceRange.min,
      maxRange: priceRange.max,
      step,
    });
  }, [
    emitEvent,
    normalizedTerm,
    textFilteredProducts.length,
    priceRange.min,
    priceRange.max,
    step,
  ]);

  const setMinPrice = useCallback(
    (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      const snappedValue = normalizeByStep(numeric, priceRange.min);
      const boundedValue = Math.min(
        priceRange.max,
        Math.max(priceRange.min, snappedValue)
      );
      const autoAdjusted = boundedValue > maxPrice;
      const nextMin = autoAdjusted ? maxPrice : boundedValue;
      setMinPriceState((prevMin) => {
        if (nextMin === prevMin) return prevMin;
        emitEvent('price_slider_updated', {
          slider: 'min',
          selectedMin: nextMin,
          selectedMax: maxPrice,
          requestedValue: numeric,
        });
        if (autoAdjusted) {
          emitEvent('price_slider_auto_adjusted', {
            slider: 'min',
            requestedValue: numeric,
            adjustedTo: maxPrice,
            selectedMax: maxPrice,
          });
        }
        return nextMin;
      });
    },
    [priceRange.min, priceRange.max, normalizeByStep, maxPrice, emitEvent]
  );

  const setMaxPrice = useCallback(
    (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      const snappedValue = normalizeByStep(numeric, priceRange.min);
      const boundedValue = Math.min(
        priceRange.max,
        Math.max(priceRange.min, snappedValue)
      );
      const autoAdjusted = boundedValue < minPrice;
      const nextMax = autoAdjusted ? minPrice : boundedValue;
      setMaxPriceState((prevMax) => {
        if (nextMax === prevMax) return prevMax;
        emitEvent('price_slider_updated', {
          slider: 'max',
          selectedMin: minPrice,
          selectedMax: nextMax,
          requestedValue: numeric,
        });
        if (autoAdjusted) {
          emitEvent('price_slider_auto_adjusted', {
            slider: 'max',
            requestedValue: numeric,
            adjustedTo: minPrice,
            selectedMin: minPrice,
          });
        }
        return nextMax;
      });
    },
    [priceRange.min, priceRange.max, normalizeByStep, minPrice, emitEvent]
  );

  const resetPriceFilter = useCallback(() => {
    setMinPriceState(priceRange.min);
    setMaxPriceState(priceRange.max);
    emitEvent('filters_cleared', {
      searchTerm: normalizedTerm,
      minRange: priceRange.min,
      maxRange: priceRange.max,
    });
  }, [priceRange.min, priceRange.max, normalizedTerm, emitEvent]);

  const filteredProducts = useMemo(() => {
    return textFilteredProducts.filter((product) => {
      const price = Number(product?.price) || 0;
      return price >= minPrice && price <= maxPrice;
    });
  }, [textFilteredProducts, minPrice, maxPrice]);

  useEffect(() => {
    emitEvent('filters_applied', {
      searchTerm: normalizedTerm,
      selectedMin: minPrice,
      selectedMax: maxPrice,
      filteredCount: filteredProducts.length,
      catalogCount: textFilteredProducts.length,
    });
  }, [
    emitEvent,
    normalizedTerm,
    minPrice,
    maxPrice,
    filteredProducts.length,
    textFilteredProducts.length,
  ]);

  const isFiltering =
    minPrice !== priceRange.min || maxPrice !== priceRange.max;

  return {
    priceRange,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    resetPriceFilter,
    filteredProducts,
    isFiltering,
    catalogTotal: textFilteredProducts.length,
    step,
  };
}
