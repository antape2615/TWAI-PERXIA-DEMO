import { useCallback, useMemo, useState } from 'react';

function computePriceRange(items) {
  if (!items.length) {
    return { min: 0, max: 0 };
  }
  const prices = items.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * Filtrado puro (exportado para tests y documentación).
 * @param {Array<{ id: string, name: string, category: string, price: number }>} productsList
 * @param {{ searchName: string, selectedCategory: string, priceMin: number, priceMax: number }} filters
 */
export function applyProductFilters(productsList, filters) {
  const q = filters.searchName.trim().toLowerCase();
  return productsList.filter((product) => {
    if (q && !product.name.toLowerCase().includes(q)) {
      return false;
    }
    if (filters.selectedCategory && product.category !== filters.selectedCategory) {
      return false;
    }
    if (product.price < filters.priceMin || product.price > filters.priceMax) {
      return false;
    }
    return true;
  });
}

/**
 * @param {Array<{ id: string, name: string, category: string, price: number }>} products
 */
export function useProductFilters(products) {
  const priceRange = useMemo(() => computePriceRange(products), [products]);

  const [filters, setFilters] = useState(() => {
    const range = computePriceRange(products);
    return {
      searchName: '',
      selectedCategory: '',
      priceMin: range.min,
      priceMax: range.max,
    };
  });

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return cats.sort((a, b) => a.localeCompare(b, 'es'));
  }, [products]);

  const filteredProducts = useMemo(
    () => applyProductFilters(products, filters),
    [products, filters]
  );

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (next.priceMin > next.priceMax) {
        if (Object.prototype.hasOwnProperty.call(patch, 'priceMin')) {
          next.priceMax = next.priceMin;
        } else {
          next.priceMin = next.priceMax;
        }
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchName: '',
      selectedCategory: '',
      priceMin: priceRange.min,
      priceMax: priceRange.max,
    });
  }, [priceRange.min, priceRange.max]);

  return {
    filters,
    filteredProducts,
    categories,
    priceRange,
    updateFilters,
    resetFilters,
  };
}
