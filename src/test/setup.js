import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/** In-memory Storage with methods on the prototype (Vitest spies need that). */
class MemoryStorage {
  constructor() {
    this._store = new Map();
  }

  get length() {
    return this._store.size;
  }

  key(index) {
    return Array.from(this._store.keys())[index] ?? null;
  }

  getItem(key) {
    const k = String(key);
    return this._store.has(k) ? this._store.get(k) : null;
  }

  setItem(key, value) {
    this._store.set(String(key), String(value));
  }

  removeItem(key) {
    this._store.delete(String(key));
  }

  clear() {
    this._store.clear();
  }
}

/** Polyfill: Node experimental localStorage can leave window.localStorage unusable in jsdom. */
function ensureLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    const probe = window.localStorage;
    if (probe && typeof probe.clear === 'function' && !(probe instanceof MemoryStorage)) {
      probe.setItem('__probe__', '1');
      probe.removeItem('__probe__');
      return;
    }
    if (probe instanceof MemoryStorage) return;
  } catch {
    /* fall through */
  }

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    enumerable: true,
    value: new MemoryStorage(),
  });
}

ensureLocalStorage();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  ensureLocalStorage();
  window.localStorage.clear();
});
