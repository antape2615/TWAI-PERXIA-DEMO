import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../hooks/useTheme';
import { isAdminRole } from '../utils/cobranzasLogic';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isVoiceMobile = location.pathname.startsWith('/voz/');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isDark = theme === 'dark';
  const nextThemeLabel = isDark ? 'claro' : 'oscuro';

  if (isVoiceMobile) {
    return <div className={styles.wrapper}>{children}</div>;
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          CocinaStore
        </Link>
        <nav className={styles.nav}>
          <Link to="/">Catálogo</Link>
          {user ? (
            <>
              <Link to="/cuenta">Mi cuenta</Link>
              {isAdminRole(user) && <Link to="/admin/cobranzas">Cobranzas</Link>}
              <Link to="/carrito" className={styles.cartLink}>
                Carrito {count > 0 && <span className={styles.badge}>{count}</span>}
              </Link>
              <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/carrito" className={styles.cartLink}>
                Carrito {count > 0 && <span className={styles.badge}>{count}</span>}
              </Link>
              <Link to="/login" className={styles.loginBtn}>
                Iniciar sesión
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label={`Cambiar a tema ${nextThemeLabel}`}
            aria-pressed={isDark}
            title={`Cambiar a tema ${nextThemeLabel}`}
          >
            <span aria-hidden="true" className={styles.themeIcon}>
              {isDark ? '☀️' : '🌙'}
            </span>
          </button>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>CocinaStore — Catálogo de demostración. Pago simulado, no real.</p>
      </footer>
    </div>
  );
}
