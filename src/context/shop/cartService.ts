import { Product } from '../../types';
import { CartItem } from './types';

// إضافة منتج إلى عربة التسوق
export const addToCart = (
  cart: CartItem[], 
  product: Product, 
  quantity: number = 1
): CartItem[] => {
  const existingItem = cart.find(item => item.product.id === product.id);
  
  if (existingItem) {
    return cart.map(item => 
      item.product.id === product.id 
        ? { ...item, quantity: item.quantity + quantity } 
        : item
    );
  } else {
    return [...cart, { product, quantity }];
  }
};

// إزالة منتج من عربة التسوق
export const removeFromCart = (
  cart: CartItem[], 
  productId: string
): CartItem[] => {
  return cart.filter(item => item.product.id !== productId);
};

// تحديث كمية منتج في عربة التسوق
export const updateCartItemQuantity = (
  cart: CartItem[],
  productId: string, 
  quantity: number
): CartItem[] => {
  if (quantity <= 0) {
    return removeFromCart(cart, productId);
  } else {
    return cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity } 
        : item
    );
  }
};

// تفريغ عربة التسوق
export const clearCart = (): CartItem[] => {
  return [];
};

// حساب المجموع الكلي لعربة التسوق
export const calculateCartTotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
};
