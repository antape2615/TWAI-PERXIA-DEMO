import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getProductById } from '../data/products';
import { logInventoryChange } from '../utils/inventoryAudit';
import { formatCOP } from '../utils/currency';
import CardPaymentForm from '../components/CardPaymentForm';
import styles from './Checkout.module.css';

export default function Checkout() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const [selectedAddressId, setSelectedAddressId] = useState(user?.addresses?.[0]?.id || '');
  const [paymentDone, setPaymentDone] = useState(false);

  const lines = items.map((item) => {
    const product = getProductById(item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);

  const subtotal = lines.reduce((acc, l) => acc + l.product.price * l.quantity, 0);
  const shipping = subtotal > 0 ? 40000 : 0;
  const total = subtotal + shipping;

  const selectedAddress = user?.addresses?.find((a) => a.id === selectedAddressId);

  const handlePaymentSuccess = () => {
    const actor = user?.email ?? 'guest';
    lines.forEach(({ productId, product, quantity }) => {
      const newStock = Math.max(0, product.stock - quantity);
      logInventoryChange(productId, product.stock, newStock, 'venta_simulada', actor);
    });
    setPaymentDone(true);
    clearCart();
  };

  if (!user) {
    return (
      <div className={styles.authRequired}>
        <h2>Inicia sesión para continuar</h2>
        <p>Necesitas una cuenta para realizar la compra.</p>
        <Link to={`/login?from=${encodeURIComponent('/checkout')}`} className={styles.loginLink}>
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (lines.length === 0 && !paymentDone) {
    return (
      <div className={styles.empty}>
        <h2>No hay productos en el carrito</h2>
        <Link to="/">Ir al catálogo</Link>
      </div>
    );
  }

  if (paymentDone) {
    return (
      <div className={styles.success}>
        <h2>¡Gracias por tu compra!</h2>
        <p>Este fue un pago simulado. No se ha cobrado nada.</p>
        <Link to="/" className={styles.cta}>
          Seguir comprando
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1>Checkout</h1>
      <div className={styles.content}>
        <div className={styles.sections}>
          <section className={styles.section}>
            <h3>Dirección de envío</h3>
            {user.addresses?.length > 0 ? (
              <div className={styles.addressList}>
                {user.addresses.map((addr) => (
                  <label key={addr.id} className={styles.addressOption}>
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                    />
                    <span className={styles.addressLabel}>{addr.label}</span>
                    <span className={styles.addressText}>
                      {addr.street}, {addr.city}, {addr.state} {addr.zip}, {addr.country}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className={styles.noAddress}>
                <Link to="/cuenta">Añade una dirección</Link> en Mi cuenta.
              </p>
            )}
            {selectedAddress && (
              <p className={styles.selectedSummary}>
                Enviar a: <strong>{selectedAddress.street}, {selectedAddress.city}</strong>
              </p>
            )}
          </section>
          <section className={styles.section}>
            <h3>Pago con tarjeta</h3>
            <CardPaymentForm total={total} onSuccess={handlePaymentSuccess} />
          </section>
        </div>
        <aside className={styles.orderSummary}>
          <h3>Tu pedido</h3>
          <ul className={styles.orderList}>
            {lines.map(({ productId, product, quantity }) => (
              <li key={productId} className={styles.orderLine}>
                <span>{product.name} × {quantity}</span>
                <span>{formatCOP(product.price * quantity)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.orderTotals}>
            <div className={styles.orderRow}>
              <span>Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            <div className={styles.orderRow}>
              <span>Envío</span>
              <span>{formatCOP(shipping)}</span>
            </div>
            <div className={styles.orderRow + ' ' + styles.orderTotal}>
              <span>Total</span>
              <span>{formatCOP(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
