import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../data/products';
import { useCart } from '../context/CartContext';
import { formatCOP } from '../utils/currency';
import styles from './ProductDetail.module.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = getProductById(id);
  const { addToCart } = useCart();

  if (!product) {
    return (
      <div className={styles.notFound}>
        <p>Producto no encontrado</p>
        <button type="button" onClick={() => navigate('/')} className={styles.backBtn}>
          Volver al catálogo
        </button>
      </div>
    );
  }

  const handleAdd = () => {
    addToCart(product.id, 1, product.stock);
    navigate('/carrito');
  };

  return (
    <div className={styles.wrapper}>
      <button type="button" onClick={() => navigate(-1)} className={styles.backLink}>
        ← Volver
      </button>
      <article className={styles.article}>
        <div className={styles.imageWrap}>
          <img src={product.image} alt={product.name} className={styles.image} />
        </div>
        <div className={styles.info}>
          <span className={styles.category}>{product.category}</span>
          <h1>{product.name}</h1>
          <p className={styles.price}>{formatCOP(product.price)}</p>
          <p className={styles.description}>{product.description}</p>
          <p className={styles.stock}>Disponibles: {product.stock}</p>
          <button type="button" onClick={handleAdd} className={styles.addBtn}>
            Añadir al carrito
          </button>
        </div>
      </article>
    </div>
  );
}
