/**
 * CartContext - سياق عربة التسوق المحسن
 *
 * التحسينات:
 * - useReducer بدلاً من useState للأداء الأفضل
 * - React.memo لمنع إعادة التصيير غير الضرورية
 * - useMemo/useCallback للتحسين
 * - localStorage persistence للحفاظ على البيانات
 * - دعم المتغيرات (variants) والملاحظات
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  ReactNode
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CartItem, CartState, CartAction, CartContextType } from './types';
import { Product } from '@/types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  isUpdating: false,
};

// ============================================================================
// Reducer
// ============================================================================

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem = action.payload;

      // التحقق من وجود العنصر (بنفس المنتج والـ variant)
      const existingItemIndex = state.items.findIndex(item =>
        item.product.id === newItem.product.id &&
        item.variantId === newItem.variantId
      );

      let newItems: CartItem[];

      if (existingItemIndex >= 0) {
        // تحديث الكمية للعنصر الموجود
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      } else {
        // إضافة عنصر جديد
        newItems = [...state.items, { ...newItem, id: uuidv4() }];
      }

      // حساب الإجمالي وعدد العناصر
      const total = newItems.reduce((sum, item) => {
        const price = item.variantPrice || item.product.price;
        return sum + (price * item.quantity);
      }, 0);

      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...state,
        items: newItems,
        total,
        itemCount,
      };
    }

    case 'REMOVE_ITEM': {
      const itemId = action.payload;
      const newItems = state.items.filter(item => item.id !== itemId);

      const total = newItems.reduce((sum, item) => {
        const price = item.variantPrice || item.product.price;
        return sum + (price * item.quantity);
      }, 0);

      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...state,
        items: newItems,
        total,
        itemCount,
      };
    }

    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;

      // إذا كانت الكمية 0 أو أقل، احذف العنصر
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: itemId });
      }

      const newItems = state.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );

      const total = newItems.reduce((sum, item) => {
        const price = item.variantPrice || item.product.price;
        return sum + (price * item.quantity);
      }, 0);

      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...state,
        items: newItems,
        total,
        itemCount,
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        total: 0,
        itemCount: 0,
      };

    case 'SET_UPDATING':
      return {
        ...state,
        isUpdating: action.payload,
      };

    case 'LOAD_CART': {
      const items = action.payload;

      const total = items.reduce((sum, item) => {
        const price = item.variantPrice || item.product.price;
        return sum + (price * item.quantity);
      }, 0);

      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...state,
        items,
        total,
        itemCount,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = React.memo(function CartProvider({
  children
}: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // ========================================================================
  // localStorage Persistence
  // ========================================================================

  // تحميل العربة من localStorage عند التهيئة
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('bazaar_cart');
      if (savedCart) {
        const items = JSON.parse(savedCart) as CartItem[];
        dispatch({ type: 'LOAD_CART', payload: items });
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
      // في حالة حدوث خطأ، نبدأ بعربة فارغة
      localStorage.removeItem('bazaar_cart');
    }
  }, []);

  // حفظ العربة في localStorage عند التغيير
  useEffect(() => {
    try {
      if (state.items.length > 0) {
        localStorage.setItem('bazaar_cart', JSON.stringify(state.items));
      } else {
        localStorage.removeItem('bazaar_cart');
      }
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [state.items]);

  // ========================================================================
  // Cart Actions
  // ========================================================================

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    dispatch({ type: 'SET_UPDATING', payload: true });

    try {
      // التحقق من المخزون إذا كان متوفراً
      if (item.product.stock !== undefined && item.product.stock < item.quantity) {
        throw new Error(`المخزون غير كافي. المتوفر: ${item.product.stock}`);
      }

      dispatch({
        type: 'ADD_ITEM',
        payload: {
          ...item,
          id: uuidv4(), // سيتم تجاوزه في الـ reducer إذا كان العنصر موجوداً
        },
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    dispatch({ type: 'SET_UPDATING', payload: true });

    try {
      dispatch({ type: 'REMOVE_ITEM', payload: itemId });
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'SET_UPDATING', payload: true });

    try {
      // التحقق من المخزون
      const item = state.items.find(i => i.id === itemId);
      if (item && item.product.stock !== undefined && item.product.stock < quantity) {
        throw new Error(`المخزون غير كافي. المتوفر: ${item.product.stock}`);
      }

      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { itemId, quantity },
      });
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, [state.items]);

  const clearCart = useCallback(() => {
    dispatch({ type: 'SET_UPDATING', payload: true });

    try {
      dispatch({ type: 'CLEAR_CART' });
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  // ========================================================================
  // Utility Functions
  // ========================================================================

  const getCartTotal = useCallback(() => state.total, [state.total]);

  const getItemCount = useCallback(() => state.itemCount, [state.itemCount]);

  // ========================================================================
  // Context Value (memoized)
  // ========================================================================

  const value = useMemo<CartContextType>(
    () => ({
      state,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getItemCount,
    }),
    [
      state,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getItemCount,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
});

// ============================================================================
// Hook
// ============================================================================

export function useCart(): CartContextType {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}

// ============================================================================
// Selectors (for performance)
// ============================================================================

/**
 * Hook للحصول على العناصر في العربة فقط
 */
export function useCartItems() {
  const { state } = useCart();
  return useMemo(() => state.items, [state.items]);
}

/**
 * Hook للحصول على الإجمالي فقط
 */
export function useCartTotal() {
  const { state } = useCart();
  return useMemo(() => state.total, [state.total]);
}

/**
 * Hook للحصول على عدد العناصر فقط
 */
export function useCartItemCount() {
  const { state } = useCart();
  return useMemo(() => state.itemCount, [state.itemCount]);
}

/**
 * Hook للحصول على حالة التحديث فقط
 */
export function useCartUpdating() {
  const { state } = useCart();
  return useMemo(() => state.isUpdating, [state.isUpdating]);
}
