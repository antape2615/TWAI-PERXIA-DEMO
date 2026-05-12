import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { cssClass } from '../utils/cssClass';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          PerxiaStore
        </Link>
        <nav className={styles.nav}>
          <Link to="/">Catálogo</Link>
          {user ? (
            <>
              <Link to="/cuenta">Mi cuenta</Link>
              <Link to="/carrito" className={styles.cartLink}>
                Carrito {count > 0 && <span className={cssClass(styles.badge, 'badge')}>{count}</span>}
              </Link>
              <button type="button" onClick={handleLogout} className={cssClass(styles.logoutBtn, 'logoutBtn')}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/carrito" className={styles.cartLink}>
                Carrito {count > 0 && <span className={cssClass(styles.badge, 'badge')}>{count}</span>}
              </Link>
              <Link to="/login" className={styles.loginBtn}>
                Iniciar sesión
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>&copy; 2024 PerxiaStore. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
