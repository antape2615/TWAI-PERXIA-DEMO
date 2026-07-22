import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCOP } from '../utils/currency';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const handleAdd = (e) => {
    e.preventDefault();
    addToCart(product.id, 1, product.stock);
  };

  return (
    <article className={styles.card} aria-label={`Producto: ${product.name}`}>
      <Link to={`/producto/${product.id}`} className={styles.link}>
        <div className={styles.imageWrap}>
          <img
            src={product.image}
            alt={product.name}
            className={styles.image}
            loading="lazy"
          />
          <span className={styles.category}>{product.category}</span>
        </div>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>{formatCOP(product.price)}</p>
      </Link>
      <button
        type="button"
        onClick={handleAdd}
        className={styles.addBtn}
        aria-label={`Agregar ${product.name} al carrito`}
      >
        Añadir al carrito
      </button>
    </article>
  );
}
