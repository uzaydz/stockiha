// استيراد الأنواع الأساسية من تطبيقنا
import type { Database } from '@/types/database.types';
import { Product, Service, User, Order, Transaction, Expense, ProductCategory, ServiceCategory, OrderStatus, ServiceStatus, OrderItem, ServiceBooking, UserRole } from '../../types';

// أنواع لواجهة Supabase
export type SupabaseProduct = Database['public']['Tables']['products']['Row'];
export type SupabaseService = Database['public']['Tables']['services']['Row'];
export type SupabaseOrder = Database['public']['Tables']['orders']['Row'];
export type SupabaseUser = Database['public']['Tables']['users']['Row'];

// واجهة عنصر عربة التسوق
export interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number; // سعر المتغير (اللون أو المقاس) إذا كان مختلفًا
  variantImage?: string; // صورة المتغير (اللون) إذا كانت متوفرة
}

// واجهة سياق المتجر
export interface ShopContextType {
  // Authentication
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  
  // Services
  services: Service[];
  addService: (service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateService: (service: Service) => void;
  deleteService: (serviceId: string) => void;
  
  // Service Bookings
  updateServiceBookingStatus: (
    orderId: string, 
    serviceBookingId: string, 
    status: ServiceStatus, 
    note?: string
  ) => Promise<void>;
  assignServiceBooking: (
    orderId: string, 
    serviceBookingId: string, 
    employeeId: string
  ) => Promise<void>;
  getServiceBookings: () => Promise<{
    orderId: string;
    order: Order;
    serviceBooking: ServiceBooking;
  }[]>;
  
  // Users
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  createCustomer: (customerData: { name: string; email?: string; phone?: string }) => Promise<User>;
  
  // Orders
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  updateOrder: (order: Order) => void;
  deleteOrder: (orderId: string) => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  
  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;
  
  // Loading state
  isLoading: boolean;
  refreshData: () => Promise<void>;
}
