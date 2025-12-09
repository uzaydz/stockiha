/**
 * ⚡ Unified Services - الخدمات الموحدة
 * 
 * خدمات Offline-First تعتمد على PowerSync
 */

export { unifiedProductService } from './UnifiedProductService';
export type { 
  Product, 
  ProductWithDetails, 
  ProductColor, 
  ProductSize,
  ProductCategory,
  ProductSubcategory,
  ProductFilters,
  PaginatedResult 
} from './UnifiedProductService';

export { unifiedOrderService } from './UnifiedOrderService';
export type {
  Order,
  OrderItem,
  OrderWithItems,
  OrderFilters,
  OrderStats,
  CreateOrderInput,
  PaginatedOrders,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  POSOrderType
} from './UnifiedOrderService';

export { unifiedCustomerService } from './UnifiedCustomerService';
export type {
  Customer,
  CustomerWithStats,
  CustomerFilters,
  CustomerStats,
  PaginatedCustomers
} from './UnifiedCustomerService';

export { unifiedExpenseService } from './UnifiedExpenseService';
export type {
  Expense,
  ExpenseCategory,
  ExpenseWithCategory,
  ExpenseFilters,
  ExpenseStats,
  PaginatedExpenses,
  ExpenseStatus
} from './UnifiedExpenseService';

export { categoryImageService } from './CategoryImageService';

