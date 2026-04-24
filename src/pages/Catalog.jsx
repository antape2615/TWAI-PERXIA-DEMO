import { useMemo, useState } from 'react';
import { products, getCategories } from '../data/products';
import ProductCard from '../components/ProductCard';
import styles from './Catalog.module.css';

const ALL_CATEGORIES = 'Todas';

function buildCategories() {
  try {
    return { categories: [ALL_CATEGORIES, ...getCategories()], error: null };
  } catch (err) {
    console.error('No se pudieron cargar las categorías:', err);
    return {
      categories: [ALL_CATEGORIES],
      error: 'No pudimos cargar las categorías. Inténtalo de nuevo más tarde.',
    };
  }
}

export default function Catalog() {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');

  const { categories, error: categoriesError } = useMemo(() => buildCategories(), []);
  const [dismissedError, setDismissedError] = useState(false);
  const error = dismissedError ? null : categoriesError;

  const filteredProducts = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORIES || product.category === selectedCategory;
      const matchesTerm =
        normalizedTerm === '' || product.name.toLowerCase().includes(normalizedTerm);
      return matchesCategory && matchesTerm;
    });
  }, [selectedCategory, searchTerm]);

  const handleCategoryChange = (category) => {
    setDismissedError(true);
    setSelectedCategory(category);
  };

  const handleReset = () => {
    setSelectedCategory(ALL_CATEGORIES);
    setSearchTerm('');
    setDismissedError(true);
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Catálogo de cocina</h1>
        <p>Encuentra sartenes, ollas, electrodomésticos y más para tu cocina.</p>
      </header>

      <section className={styles.filters} aria-label="Filtros de catálogo">
        <label className={styles.searchLabel} htmlFor="catalog-search">
          Buscar producto
          <input
            id="catalog-search"
            type="search"
            className={styles.searchInput}
            placeholder="Ej. sartén, batidora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar producto por nombre"
          />
        </label>

        <div
          className={styles.categoryGroup}
          role="group"
          aria-label="Filtros por categoría"
        >
          {categories.map((category) => {
            const isActive = category === selectedCategory;
            return (
              <button
                key={category}
                type="button"
                className={`${styles.categoryChip} ${isActive ? styles.categoryChipActive : ''}`}
                aria-pressed={isActive}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            );
          })}
        </div>

        {(selectedCategory !== ALL_CATEGORIES || searchTerm !== '') && (
          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            Limpiar filtros
          </button>
        )}
      </section>

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      <p className={styles.resultCount} aria-live="polite">
        {filteredProducts.length === 1
          ? '1 producto encontrado'
          : `${filteredProducts.length} productos encontrados`}
      </p>

      {filteredProducts.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <p>No encontramos productos que coincidan con tu búsqueda.</p>
          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            Ver todo el catálogo
          </button>
        </div>
      ) : (
        <section className={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </div>
  );
}
