import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import CatalogFilters from '../components/CatalogFilters';
import { useProductFilters } from '../hooks/useProductFilters';
import styles from './Catalog.module.css';

export default function Catalog() {
  const { filters, filteredProducts, categories, priceRange, updateFilters, resetFilters } =
    useProductFilters(products);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Catálogo de cocina</h1>
        <p>Encuentra sartenes, ollas, electrodomésticos y más para tu cocina.</p>
      </header>
      <CatalogFilters
        filters={filters}
        categories={categories}
        priceRange={priceRange}
        onFilterChange={updateFilters}
        onReset={resetFilters}
        resultCount={filteredProducts.length}
      />
      <section className={styles.grid}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
        ) : (
          <div className={styles.noResults}>
            <p>No se encontraron productos con los filtros seleccionados.</p>
            <button type="button" onClick={resetFilters} className={styles.resetButton}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
