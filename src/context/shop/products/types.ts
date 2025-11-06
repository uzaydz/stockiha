/**
 * Products Types
 * أنواع البيانات الخاصة بالمنتجات
 */

import { Product } from '@/types';

export interface ProductsState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

export interface ProductsContextType {
  state: ProductsState;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (product: Product) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<boolean>;
  refreshProducts: () => Promise<void>;
}
