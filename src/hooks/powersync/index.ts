/**
 * ⚡ PowerSync Hooks - v2.0 (Best Practices 2025)
 * ============================================================
 *
 * 🚀 Hooks تستخدم useQuery من @powersync/react
 *    - تحديث تلقائي عند تغير البيانات
 *    - لا تستخدم getAll() أبداً
 *    - أداء ممتاز مع caching
 *
 * الاستخدام:
 * ```tsx
 * // ✅ الطريقة الصحيحة
 * import { useReactiveProducts, useReactiveCategories } from '@/hooks/powersync';
 *
 * function MyComponent() {
 *   const { products, isLoading } = useReactiveProducts();
 *   const { categories } = useReactiveCategories();
 *   // البيانات تتحدث تلقائياً!
 * }
 * ```
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * - https://powersync-ja.github.io/powersync-js/react-sdk
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Core Hooks (Legacy - for backwards compatibility)
// ═══════════════════════════════════════════════════════════════════════════

export { usePowerSync } from './usePowerSync';
export { usePowerSyncQuery } from './usePowerSyncQuery';
export { usePowerSyncStatus } from './usePowerSyncStatus';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Products
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveProducts,
  useReactiveProduct,
  useReactiveProductByBarcode,
  useReactiveProductCount,
  type ReactiveProduct,
  type UseReactiveProductsOptions,
  type UseReactiveProductsResult
} from './useReactiveProducts';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Categories
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveCategories,
  useReactiveSubcategories,
  useReactiveCategoriesWithSubs,
  useReactiveCategory,
  useReactiveCategoryCount,
  type ReactiveCategory,
  type ReactiveSubcategory,
  type ReactiveCategoryWithSubs,
  type UseReactiveCategoriesOptions
} from './useReactiveCategories';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Customers
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveCustomers,
  useReactiveCustomer,
  useReactiveCustomerByPhone,
  useReactiveCustomerCount,
  useReactiveCustomerDebts,
  type ReactiveCustomer,
  type UseReactiveCustomersOptions
} from './useReactiveCustomers';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Orders
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveOrders,
  useReactiveOrder,
  useReactiveOrderItems,
  useReactiveOrderStats,
  useReactiveRecentOrders,
  type ReactiveOrder,
  type ReactiveOrderItem,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type UseReactiveOrdersOptions
} from './useReactiveOrders';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Suppliers
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveSuppliers,
  useReactiveSupplier,
  useReactiveSupplierCount,
  type ReactiveSupplier,
  type UseReactiveSuppliersOptions
} from './useReactiveSuppliers';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Expenses
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveExpenses,
  useReactiveExpenseCategories,
  useReactiveExpense,
  useReactiveExpenseStats,
  type ReactiveExpense,
  type ReactiveExpenseCategory,
  type ExpenseStatus,
  type ExpensePaymentMethod,
  type UseReactiveExpensesOptions
} from './useReactiveExpenses';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Staff
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveStaff,
  useReactiveStaffMember,
  useReactiveStaffCount,
  useReactiveWorkSessions,
  useActiveWorkSession,
  type ReactiveStaff,
  type ReactiveWorkSession,
  type UseReactiveStaffOptions,
  type UseReactiveStaffResult
} from './useReactiveStaff';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Returns (المرتجعات)
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveReturns,
  useReactiveReturn,
  useReactiveReturnStats,
  useReactiveRecentReturns,
  useReactiveReturnCount,
  type ReactiveReturn,
  type ReturnStatus,
  type ReturnType,
  type RefundMethod,
  type UseReactiveReturnsOptions,
  type UseReactiveReturnsResult
} from './useReactiveReturns';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Losses (الخسائر)
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveLosses,
  useReactiveLoss,
  useReactiveLossStats,
  useReactiveRecentLosses,
  useReactiveLossCount,
  type ReactiveLoss,
  type LossStatus,
  type LossType,
  type UseReactiveLossesOptions,
  type UseReactiveLossesResult
} from './useReactiveLosses';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Invoices (الفواتير)
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveInvoices,
  useReactiveInvoice,
  useReactiveInvoiceByNumber,
  useReactiveInvoiceStats,
  useReactiveRecentInvoices,
  useReactiveCustomerInvoices,
  useReactiveInvoiceCount,
  type ReactiveInvoice,
  type InvoiceStatus,
  type UseReactiveInvoicesOptions,
  type UseReactiveInvoicesResult
} from './useReactiveInvoices';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 TanStack Query Integration (Best Practices 2025)
// ═══════════════════════════════════════════════════════════════════════════

export {
  usePowerSyncTanstack,
  useProductsTanstack,
  useOrdersTanstack,
  useCustomersTanstack,
  useCategoriesTanstack,
  useExpensesTanstack,
  type PowerSyncQueryOptions,
  type UsePowerSyncTanstackOptions,
  type UsePowerSyncTanstackResult
} from './usePowerSyncTanstack';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Differential Watch Hooks (Advanced)
// ═══════════════════════════════════════════════════════════════════════════

export {
  useDifferentialOrders,
  useDifferentialPOSOrders,
  type DifferentialOrder,
  type OrderDiff,
  type DifferentialOrdersStats,
  type UseDifferentialOrdersOptions,
  type UseDifferentialOrdersResult
} from './useDifferentialOrders';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Re-export from @powersync/react
// ═══════════════════════════════════════════════════════════════════════════

export { useQuery, useStatus, usePowerSync as usePowerSyncDb } from '@powersync/react';

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 Smart Hooks (2025 Performance Optimized)
// ═══════════════════════════════════════════════════════════════════════════

export {
  usePOSProductsSmart,
  type ProductsQueryOptions,
  type ProductsQueryResult
} from './usePOSProductsSmart';

export {
  usePOSOrdersSmart,
  type OrdersQueryOptions,
  type OrdersQueryResult
} from './usePOSOrdersSmart';

export {
  usePOSStatsSmart,
  type POSStats,
  type POSStatsResult
} from './usePOSStatsSmart';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - Orders with Debts (المديونيات) + Pagination
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactiveOrdersWithDebts,
  useReactiveCustomerDebtsComplete,
  // ⚡ New Pagination Hooks (2025)
  usePaginatedCustomerDebts,
  useReactiveDebtsGlobalStats,
  useCustomerOrdersDebts,
  // Types
  type ReactiveOrderWithDebt,
  type CustomerDebtSummary,
  type CustomerDebtsComplete,
  type DebtsGlobalStats,
  type UsePaginatedCustomerDebtsOptions,
  type UsePaginatedCustomerDebtsResult,
  type CustomerOrderDebt,
  type UseReactiveOrdersWithDebtsOptions,
  type UseReactiveOrdersWithDebtsResult
} from './useReactiveOrdersWithDebts';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Reactive Hooks - POS Orders (طلبيات نقطة البيع)
// ═══════════════════════════════════════════════════════════════════════════

export {
  useReactivePOSOrders,
  useReactivePOSOrderItems,
  useReactivePOSOrderWithItems,
  useReactivePOSOrdersItems,
  type ReactivePOSOrder,
  type ReactivePOSOrderItem,
  type ReactivePOSOrderWithItems,
  type POSOrderStatus,
  type POSPaymentMethod,
  type POSPaymentStatus,
  type POSOrdersStats,
  type UseReactivePOSOrdersOptions,
  type UseReactivePOSOrdersResult,
  // ⚡ أنواع نوع البيع (علبة، لتر، وزن، متر)
  type SellingUnitType,
  type SaleType
} from './useReactivePOSOrders';
