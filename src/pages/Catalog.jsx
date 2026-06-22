import { useState } from 'react';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import { usePriceFilter } from '../hooks/usePriceFilter';
import { formatCOP } from '../utils/currency';
import { trackCatalogFilterEvent } from '../utils/catalogFilterTelemetry';
import {
  NO_RESULTS_MESSAGE,
  PRICE_SLIDER_STEP,
} from '../config/catalogFilters';
import styles from './Catalog.module.css';

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    priceRange,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    resetPriceFilter,
    filteredProducts,
    isFiltering,
    catalogTotal,
  } = usePriceFilter(products, searchTerm, {
    step: PRICE_SLIDER_STEP,
    onEvent: trackCatalogFilterEvent,
  });

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    resetPriceFilter();
  };

  const hasAnyFilter = isFiltering || Boolean(searchTerm.trim());

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
              {formatCOP(minPrice)} – {formatCOP(maxPrice)}
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
              step={PRICE_SLIDER_STEP}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label="Precio mínimo en COP"
              aria-valuemin={priceRange.min}
              aria-valuemax={priceRange.max}
              aria-valuenow={minPrice}
              aria-valuetext={formatCOP(minPrice)}
              className={styles.rangeInput}
            />
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
              step={PRICE_SLIDER_STEP}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Precio máximo en COP"
              aria-valuemin={priceRange.min}
              aria-valuemax={priceRange.max}
              aria-valuenow={maxPrice}
              aria-valuetext={formatCOP(maxPrice)}
              className={styles.rangeInput}
            />
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
            Mostrando {filteredProducts.length} de {catalogTotal} productos
          </p>
          <section className={styles.grid}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        </>
      ) : (
        <p className={styles.noResults} role="status">
          {NO_RESULTS_MESSAGE}
        </p>
      )}
    </div>
  );
}
