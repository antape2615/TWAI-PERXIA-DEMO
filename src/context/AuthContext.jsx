import { createContext, useContext, useState, useCallback } from 'react';
import { validateUser } from '../data/users';

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

  const login = useCallback((email, password) => {
    const found = validateUser(email, password);
    if (found) {
      setUser(found);
      localStorage.setItem('catalog_user', JSON.stringify(found));
      return { ok: true };
    }
    return { ok: false, error: 'Email o contraseña incorrectos' };
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
    <AuthContext.Provider value={{ user, login, logout, updateAddresses }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
