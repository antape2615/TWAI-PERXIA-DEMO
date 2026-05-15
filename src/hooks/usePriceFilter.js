import { useCallback, useMemo, useState } from 'react';

/**
 * Hook reutilizable para filtrar una lista de productos por rango de precios
 * y, opcionalmente, por término de búsqueda en nombre o categoría.
 *
 * Devuelve el rango total disponible, los valores actuales del filtro,
 * setters validados (min <= max) y la lista ya filtrada y memoizada.
 *
 * @param {Array<{id: string, name: string, price: number, category?: string}>} products
 * @param {string} [searchTerm='']
 * @param {{ step?: number }} [options]
 */
export function usePriceFilter(products = [], searchTerm = '', options = {}) {
  const { step = 1 } = options;

  const priceRange = useMemo(() => {
    if (!products || products.length === 0) {
      return { min: 0, max: 0 };
    }
    const prices = products
      .map((p) => Number(p?.price))
      .filter((p) => Number.isFinite(p));
    if (prices.length === 0) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  const [minPrice, setMinPriceState] = useState(priceRange.min);
  const [maxPrice, setMaxPriceState] = useState(priceRange.max);
  const [lastRange, setLastRange] = useState(priceRange);

  // Re-sincronizamos cuando cambia el conjunto de productos (p.ej. recarga
  // del catálogo) ajustando estado durante el render — patrón recomendado por
  // React para derivar estado de props sin useEffect.
  if (
    lastRange.min !== priceRange.min ||
    lastRange.max !== priceRange.max
  ) {
    setLastRange(priceRange);
    setMinPriceState(priceRange.min);
    setMaxPriceState(priceRange.max);
  }

  const setMinPrice = useCallback(
    (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      setMinPriceState((prevMin) => {
        const clamped = Math.max(priceRange.min, Math.min(numeric, maxPrice));
        return clamped === prevMin ? prevMin : clamped;
      });
    },
    [priceRange.min, maxPrice]
  );

  const setMaxPrice = useCallback(
    (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      setMaxPriceState((prevMax) => {
        const clamped = Math.min(priceRange.max, Math.max(numeric, minPrice));
        return clamped === prevMax ? prevMax : clamped;
      });
    },
    [priceRange.max, minPrice]
  );

  const resetPriceFilter = useCallback(() => {
    setMinPriceState(priceRange.min);
    setMaxPriceState(priceRange.max);
  }, [priceRange.min, priceRange.max]);

  const filteredProducts = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    return (products || []).filter((product) => {
      const price = Number(product?.price) || 0;
      const matchesPrice = price >= minPrice && price <= maxPrice;
      if (!matchesPrice) return false;
      if (!term) return true;
      const name = (product?.name || '').toLowerCase();
      const category = (product?.category || '').toLowerCase();
      return name.includes(term) || category.includes(term);
    });
  }, [products, searchTerm, minPrice, maxPrice]);

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
    step,
  };
}
