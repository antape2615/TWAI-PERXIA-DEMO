import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const CartContext = createContext(null);

const initialState = [];

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => i.productId === action.payload.productId);
      if (existing) {
        return state.map((i) =>
          i.productId === action.payload.productId
            ? { ...i, quantity: Math.min(i.quantity + (action.payload.quantity || 1), action.payload.maxStock ?? 99) }
            : i
        );
      }
      return [...state, { productId: action.payload.productId, quantity: action.payload.quantity || 1 }];
    }
    case 'UPDATE': {
      if (action.payload.quantity <= 0) {
        return state.filter((i) => i.productId !== action.payload.productId);
      }
      return state.map((i) =>
        i.productId === action.payload.productId ? { ...i, quantity: action.payload.quantity } : i
      );
    }
    case 'REMOVE':
      return state.filter((i) => i.productId !== action.payload.productId);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem('catalog_cart');
      return saved ? JSON.parse(saved) : init;
    } catch {
      return init;
    }
  });

  const addToCart = useCallback((productId, quantity = 1, maxStock = 99) => {
    dispatch({ type: 'ADD', payload: { productId, quantity, maxStock } });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    dispatch({ type: 'UPDATE', payload: { productId, quantity } });
  }, []);

  const removeFromCart = useCallback((productId) => {
    dispatch({ type: 'REMOVE', payload: { productId } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  useEffect(() => {
    localStorage.setItem('catalog_cart', JSON.stringify(items));
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        dispatch,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
