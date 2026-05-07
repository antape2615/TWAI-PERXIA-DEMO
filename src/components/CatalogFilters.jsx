import { getCategoryLabel } from '../constants/productCategories';
import { formatCOP } from '../utils/currency';
import styles from './CatalogFilters.module.css';

export default function CatalogFilters({
  filters,
  categories,
  priceRange,
  onFilterChange,
  onReset,
  resultCount,
}) {
  const handleSearchChange = (e) => {
    onFilterChange({ searchName: e.target.value });
  };

  const handleCategoryChange = (e) => {
    onFilterChange({ selectedCategory: e.target.value });
  };

  const handlePriceMinChange = (e) => {
    onFilterChange({ priceMin: Number(e.target.value) });
  };

  const handlePriceMaxChange = (e) => {
    onFilterChange({ priceMax: Number(e.target.value) });
  };

  const minVal = priceRange.max > 0 ? filters.priceMin : priceRange.min;
  const maxVal = priceRange.max > 0 ? filters.priceMax : priceRange.max;

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <h3 className={styles.title}>Filtrar productos</h3>
        <span className={styles.resultCount}>{resultCount} resultados</span>
      </div>
      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label htmlFor="catalog-search" className={styles.label}>
            Buscar por nombre
          </label>
          <input
            id="catalog-search"
            type="search"
            placeholder="Ej: sartén, batidora…"
            value={filters.searchName}
            onChange={handleSearchChange}
            className={styles.input}
            autoComplete="off"
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="catalog-category" className={styles.label}>
            Categoría
          </label>
          <select
            id="catalog-category"
            value={filters.selectedCategory}
            onChange={handleCategoryChange}
            className={styles.select}
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="catalog-price-min" className={styles.label}>
            Precio mínimo: {formatCOP(minVal)}
          </label>
          <input
            id="catalog-price-min"
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            value={minVal}
            onChange={handlePriceMinChange}
            className={styles.range}
            disabled={priceRange.max <= 0}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="catalog-price-max" className={styles.label}>
            Precio máximo: {formatCOP(maxVal)}
          </label>
          <input
            id="catalog-price-max"
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            value={maxVal}
            onChange={handlePriceMaxChange}
            className={styles.range}
            disabled={priceRange.max <= 0}
          />
        </div>
      </div>
      <button type="button" onClick={onReset} className={styles.resetButton}>
        Limpiar todos los filtros
      </button>
    </div>
  );
}
