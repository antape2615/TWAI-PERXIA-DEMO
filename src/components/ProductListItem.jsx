import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCOP } from '../utils/currency';
import styles from './ProductListItem.module.css';

export default function ProductListItem({ product }) {
  const { addToCart } = useCart();

  const productId = product?.id || '';
  const productName = product?.name || 'No disponible';
  const productCategory = product?.category || 'No disponible';
  const productPrice = Number.isFinite(Number(product?.price))
    ? formatCOP(Number(product.price))
    : 'No disponible';

  const handleAdd = (e) => {
    e.preventDefault();
    if (!productId) return;
    addToCart(productId, 1, product?.stock);
  };

  return (
    <article className={styles.item}>
      <Link to={productId ? `/producto/${productId}` : '#'} className={styles.productLink}>
        <div className={styles.imageWrap}>
          {product?.image ? (
            <img src={product.image} alt={productName} className={styles.image} />
          ) : (
            <div className={styles.imagePlaceholder}>No disponible</div>
          )}
        </div>
        <div className={styles.info}>
          <span className={styles.category}>{productCategory}</span>
          <h3 className={styles.name}>{productName}</h3>
          <p className={styles.price}>{productPrice}</p>
        </div>
      </Link>

      <button type="button" onClick={handleAdd} className={styles.addBtn}>
        Añadir al carrito
      </button>
    </article>
  );
}
