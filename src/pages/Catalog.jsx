import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import styles from './Catalog.module.css';

export default function Catalog() {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Catálogo de cocina</h1>
        <p>Encuentra sartenes, ollas, electrodomésticos y más para tu cocina.</p>
      </header>
      <section className={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </div>
  );
}
