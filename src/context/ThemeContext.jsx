import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const ThemeContext = createContext(null);

const STORAGE_KEY = 'cocinastore-theme';
const VALID_THEMES = ['light', 'dark'];

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage puede estar bloqueado (modo privado, permisos). Ignoramos.
  }

  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return prefersDark ? 'dark' : 'light';
}

function applyThemeAttribute(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [userPreference, setUserPreference] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    applyThemeAttribute(theme);
  }, [theme]);

  // Si el usuario no ha elegido manualmente, seguimos la preferencia del sistema.
  useEffect(() => {
    if (userPreference) return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => {
      setThemeState(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [userPreference]);

  const setTheme = useCallback((next) => {
    if (!VALID_THEMES.includes(next)) return;
    setThemeState(next);
    setUserPreference(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // sin persistencia, pero el cambio se mantiene en memoria.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      setUserPreference(true);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignoramos
      }
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignoramos
    }
    setUserPreference(false);
    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setThemeState(prefersDark ? 'dark' : 'light');
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, resetTheme }),
    [theme, setTheme, toggleTheme, resetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
