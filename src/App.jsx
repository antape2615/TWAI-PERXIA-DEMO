import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Catalog from './pages/Catalog';
import Login from './pages/Login';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import Cobranzas from './pages/admin/Cobranzas';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Catalog />} />
                <Route path="/login" element={<Login />} />
                <Route path="/producto/:id" element={<ProductDetail />} />
                <Route path="/carrito" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/cuenta" element={<Account />} />
                <Route path="/admin/cobranzas" element={<Cobranzas />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
