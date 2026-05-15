import { useState } from 'react';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import { usePriceFilter } from '../hooks/usePriceFilter';
import { formatCOP } from '../utils/currency';
import styles from './Catalog.module.css';

const PRICE_STEP = 10000;

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
  } = usePriceFilter(products, searchTerm, { step: PRICE_STEP });

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
              step={PRICE_STEP}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label={`Precio mínimo: ${formatCOP(minPrice)}`}
              aria-valuemin={priceRange.min}
              aria-valuemax={priceRange.max}
              aria-valuenow={minPrice}
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
              step={PRICE_STEP}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label={`Precio máximo: ${formatCOP(maxPrice)}`}
              aria-valuemin={priceRange.min}
              aria-valuemax={priceRange.max}
              aria-valuenow={maxPrice}
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
