import { useCallback, useEffect, useRef, useState } from 'react';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import { usePriceFilter } from '../hooks/usePriceFilter';
import { formatCOP } from '../utils/currency';
import { logCatalogFilterEvent } from '../utils/filterEvents';
import styles from './Catalog.module.css';

const PRICE_STEP = 10000;
const FULL_CATALOG_RANGE = (() => {
  if (!products.length) {
    return { min: 0, max: 0 };
  }

  const prices = products
    .map((product) => Number(product.price))
    .filter((price) => Number.isFinite(price));

  if (!prices.length) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
})();

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const hadZeroResultsRef = useRef(false);

  const handleFilterEvent = useCallback((eventName, payload = {}) => {
    logCatalogFilterEvent(eventName, payload);
  }, []);

  const {
    priceRange,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    resetPriceFilter,
    filteredProducts,
    isFiltering,
    hasPriceRange,
  } = usePriceFilter(products, searchTerm, {
    step: PRICE_STEP,
    onEvent: handleFilterEvent,
  });

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    resetPriceFilter();
    logCatalogFilterEvent('Filtros limpiados', {
      searchTerm: '',
      minPrice: FULL_CATALOG_RANGE.min,
      maxPrice: FULL_CATALOG_RANGE.max,
      filteredProducts: products.length,
      totalProducts: products.length,
    });
  };

  const hasAnyFilter = isFiltering || Boolean(searchTerm.trim());
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const rangeLabel = hasPriceRange
    ? `${formatCOP(priceRange.min)} – ${formatCOP(priceRange.max)}`
    : 'N/A';

  useEffect(() => {
    logCatalogFilterEvent('Contador actualizado', {
      searchTerm: normalizedSearchTerm,
      minPrice,
      maxPrice,
      filteredProducts: filteredProducts.length,
      totalProducts: products.length,
    });
  }, [filteredProducts.length, maxPrice, minPrice, normalizedSearchTerm]);

  useEffect(() => {
    const hasNoResults = filteredProducts.length === 0;

    if (hasNoResults && !hadZeroResultsRef.current) {
      logCatalogFilterEvent('Filtro sin resultados', {
        searchTerm: normalizedSearchTerm,
        minPrice,
        maxPrice,
        filteredProducts: 0,
        totalProducts: products.length,
      });
    }

    hadZeroResultsRef.current = hasNoResults;
  }, [filteredProducts.length, maxPrice, minPrice, normalizedSearchTerm]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Catálogo de cocina</h1>
        <p>Encuentra sartenes, ollas, electrodomésticos y más para tu cocina.</p>
      </header>

      <section className={styles.filters} aria-label="Filtros del catálogo">
        <div className={styles.searchContainer}>
          <label htmlFor="catalog-search" className={styles.visuallyHidden}>
            Buscar productos
          </label>
          <input
            id="catalog-search"
            type="search"
            placeholder="Buscar productos por nombre o categoría..."
            value={searchTerm}
            onChange={handleSearch}
            className={styles.searchInput}
            aria-label="Buscar productos"
          />
        </div>

        <div
          className={styles.priceFilter}
          role="group"
          aria-label="Filtrar por rango de precios"
        >
          <div className={styles.priceHeader}>
            <span className={styles.priceTitle}>Rango de precios</span>
            <span className={styles.priceValues} aria-live="polite">
              {rangeLabel}
            </span>
          </div>

          <div className={styles.rangeRow}>
            <label htmlFor="minPrice" className={styles.rangeLabel}>
              Mínimo
            </label>
            <input
              id="minPrice"
              type="range"
              min={priceRange.min}
              max={priceRange.max}
              step={PRICE_STEP}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label={`Precio mínimo: ${formatCOP(minPrice)}`}
              aria-valuemin={priceRange.min}
              aria-valuemax={priceRange.max}
              aria-valuenow={minPrice}
              disabled={!hasPriceRange}
              className={styles.rangeInput}
            />
            <span className={styles.rangeValue}>{formatCOP(minPrice)}</span>
          </div>

          <div className={styles.rangeRow}>
            <label htmlFor="maxPrice" className={styles.rangeLabel}>
              Máximo
            </label>
            <input
              id="maxPrice"
              type="range"
              min={priceRange.min}
              max={priceRange.max}
              step={PRICE_STEP}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label={`Precio máximo: ${formatCOP(maxPrice)}`}
              aria-valuemin={priceRange.min}
              aria-valuemax={priceRange.max}
              aria-valuenow={maxPrice}
              disabled={!hasPriceRange}
              className={styles.rangeInput}
            />
            <span className={styles.rangeValue}>{formatCOP(maxPrice)}</span>
          </div>
        </div>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={handleClearFilters}
            className={styles.clearBtn}
          >
            Limpiar filtros
          </button>
        )}
      </section>

      {filteredProducts.length > 0 ? (
        <>
          <p className={styles.resultsCount} role="status">
            Mostrando {filteredProducts.length} de {products.length} productos
          </p>
          <section className={styles.grid}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        </>
      ) : (
        <p className={styles.noResults} role="status">
          No se encontraron productos con los filtros aplicados.
        </p>
      )}
    </div>
  );
}
