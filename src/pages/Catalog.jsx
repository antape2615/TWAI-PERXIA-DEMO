import { useMemo, useState } from 'react';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import styles from './Catalog.module.css';

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Catálogo de cocina</h1>
        <p>Encuentra sartenes, ollas, electrodomésticos y más para tu cocina.</p>
      </header>

      <div className={styles.searchContainer}>
        <input
          type="search"
          placeholder="Buscar productos por nombre o categoría..."
          value={searchTerm}
          onChange={handleSearch}
          className={styles.searchInput}
          aria-label="Buscar productos"
        />
      </div>

      {filteredProducts.length > 0 ? (
        <section className={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <p className={styles.noResults} role="status">
          No se encontraron productos que coincidan con &quot;{searchTerm}&quot;.
        </p>
      )}
    </div>
  );
}
