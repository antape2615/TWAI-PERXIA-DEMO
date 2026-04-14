import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('catalog_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('catalog_user', JSON.stringify(data.user));
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Email o contraseña incorrectos' };
    } catch (err) {
      return { ok: false, error: 'Error de conexión al servidor' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('catalog_user');
  }, []);

  const updateAddresses = useCallback((addresses) => {
    if (!user) return;
    const updated = { ...user, addresses };
    setUser(updated);
    localStorage.setItem('catalog_user', JSON.stringify(updated));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAddresses, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
