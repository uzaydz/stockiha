/**
 * Cart Types
 * أنواع البيانات الخاصة بعربة التسوق
 */

export interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    stock?: number;
  };
  quantity: number;
  variantId?: string;
  variantName?: string;
  variantPrice?: number;
  notes?: string;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isUpdating: boolean;
}

export type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_UPDATING'; payload: boolean }
  | { type: 'LOAD_CART'; payload: CartItem[] };

export interface CartContextType {
  state: CartState;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
}
