import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getProductById } from '../data/products';
import { formatCOP } from '../utils/currency';
import styles from './Cart.module.css';

export default function Cart() {
  const { items, updateQuantity, removeFromCart } = useCart();
  const lines = items.map((item) => {
    const product = getProductById(item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);

  const subtotal = lines.reduce((acc, l) => acc + l.product.price * l.quantity, 0);
  const shipping = subtotal > 0 ? 40000 : 0;
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>Tu carrito está vacío</h2>
        <p>Añade productos desde el catálogo.</p>
        <Link to="/" className={styles.cta}>
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1>Carrito</h1>
      <div className={styles.content}>
        <ul className={styles.list}>
          {lines.map(({ productId, product, quantity }) => (
            <li key={productId} className={styles.line}>
              <img src={product.image} alt={product.name} className={styles.thumb} />
              <div className={styles.lineInfo}>
                <Link to={`/producto/${productId}`} className={styles.lineName}>
                  {product.name}
                </Link>
                <p className={styles.linePrice}>{formatCOP(product.price)}</p>
                <div className={styles.quantityRow}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(productId, Math.max(0, quantity - 1))}
                    className={styles.qtyBtn}
                    aria-label="Menos"
                  >
                    −
                  </button>
                  <span className={styles.qty}>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(productId, Math.min(product.stock, quantity + 1))}
                    className={styles.qtyBtn}
                    aria-label="Más"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(productId)}
                    className={styles.removeBtn}
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <p className={styles.lineTotal}>
                {formatCOP(product.price * quantity)}
              </p>
            </li>
          ))}
        </ul>
        <aside className={styles.summary}>
          <h3>Resumen</h3>
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Envío</span>
            <span>{formatCOP(shipping)}</span>
          </div>
          <div className={styles.summaryRow + ' ' + styles.totalRow}>
            <span>Total</span>
            <span>{formatCOP(total)}</span>
          </div>
          <Link to="/checkout" className={styles.checkoutBtn}>
            Ir a pagar
          </Link>
        </aside>
      </div>
    </div>
  );
}
