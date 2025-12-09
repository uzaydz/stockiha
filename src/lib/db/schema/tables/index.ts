/**
 * ⚡ Tables Schema Index
 * تصدير جميع schemas الجداول
 *
 * الجداول المدعومة:
 * - Products (المنتجات)
 * - Orders (الطلبات)
 * - Customers (العملاء)
 * - Employees/Users (الموظفين)
 * - Work Sessions (جلسات العمل)
 * - Repairs (التصليحات)
 * - Invoices (الفواتير)
 * - Returns (المرتجعات)
 * - Expenses (المصروفات)
 * - Losses (الخسائر)
 * - Supplier Purchases (مشتريات الموردين)
 */

// ============================================
// 📦 Products - المنتجات
// ============================================
export {
    PRODUCTS_TABLE,
    PRODUCTS_INDEXES,
    PRODUCT_COLORS_TABLE,
    PRODUCT_SIZES_TABLE,
    PRODUCT_IMAGES_TABLE,
    PRODUCT_CATEGORIES_TABLE,
    PRODUCT_SUBCATEGORIES_TABLE,
} from './products.sql';

// ============================================
// 🛒 Orders - الطلبات
// ============================================
export {
    ORDERS_TABLE,
    ORDERS_INDEXES,
    ORDER_ITEMS_TABLE,
    ORDER_ITEMS_INDEXES,
} from './orders.sql';

// ============================================
// 👤 Customers - العملاء
// ============================================
export {
    CUSTOMERS_TABLE,
    CUSTOMERS_INDEXES,
    CUSTOMER_ADDRESSES_TABLE,
} from './customers.sql';

// ============================================
// 👥 Employees/Users - الموظفين
// ============================================
export {
    USERS_TABLE,
    USERS_INDEXES,
    EMPLOYEE_SALARIES_TABLE,
    EMPLOYEE_SALARIES_INDEXES,
} from './employees.sql';

// ============================================
// ⏱️ Work Sessions - جلسات العمل
// ============================================
export {
    STAFF_WORK_SESSIONS_TABLE,
    STAFF_WORK_SESSIONS_INDEXES,
} from './work-sessions.sql';

// ============================================
// 🔧 Repairs - التصليحات
// ============================================
export {
    REPAIR_ORDERS_TABLE,
    REPAIR_ORDERS_INDEXES,
    REPAIR_STATUS_HISTORY_TABLE,
    REPAIR_STATUS_HISTORY_INDEXES,
} from './repairs.sql';

// ============================================
// 🧾 Invoices - الفواتير
// ============================================
export {
    INVOICES_TABLE,
    INVOICES_INDEXES,
    INVOICE_ITEMS_TABLE,
    INVOICE_ITEMS_INDEXES,
} from './invoices.sql';

// ============================================
// 🔄 Returns - المرتجعات
// ============================================
export {
    RETURNS_TABLE,
    RETURNS_INDEXES,
    RETURN_ITEMS_TABLE,
    RETURN_ITEMS_INDEXES,
} from './returns.sql';

// ============================================
// 💸 Expenses - المصروفات
// ============================================
export {
    EXPENSES_TABLE,
    EXPENSES_INDEXES,
    EXPENSE_CATEGORIES_TABLE,
    EXPENSE_CATEGORIES_INDEXES,
} from './expenses.sql';

// ============================================
// 📉 Losses - الخسائر
// ============================================
export {
    LOSSES_TABLE,
    LOSSES_INDEXES,
    LOSS_ITEMS_TABLE,
    LOSS_ITEMS_INDEXES,
} from './losses.sql';

// ============================================
// 🛒 Supplier Purchases - مشتريات الموردين
// ============================================
export {
    SUPPLIER_PURCHASES_TABLE,
    SUPPLIER_PURCHASES_INDEXES,
    SUPPLIER_PURCHASE_ITEMS_TABLE,
    SUPPLIER_PURCHASE_ITEMS_INDEXES,
    SUPPLIER_PAYMENTS_TABLE,
    SUPPLIER_PAYMENTS_INDEXES,
    SUPPLIERS_TABLE,
    SUPPLIERS_INDEXES,
} from './supplier-purchases.sql';

// ============================================
// 📋 Helper Functions - دوال مساعدة
// ============================================

/**
 * ⚡ Get all table creation statements
 * جلب جميع جمل إنشاء الجداول
 */
export function getAllTableStatements(): string[] {
    return [
        // Core tables - الجداول الأساسية
        PRODUCTS_TABLE,
        PRODUCT_CATEGORIES_TABLE,
        PRODUCT_SUBCATEGORIES_TABLE,
        PRODUCT_COLORS_TABLE,
        PRODUCT_SIZES_TABLE,
        PRODUCT_IMAGES_TABLE,

        CUSTOMERS_TABLE,
        CUSTOMER_ADDRESSES_TABLE,

        ORDERS_TABLE,
        ORDER_ITEMS_TABLE,

        // Users & Sessions - المستخدمين والجلسات
        USERS_TABLE,
        EMPLOYEE_SALARIES_TABLE,
        STAFF_WORK_SESSIONS_TABLE,

        // Repairs - التصليحات
        REPAIR_ORDERS_TABLE,
        REPAIR_STATUS_HISTORY_TABLE,

        // Invoices - الفواتير
        INVOICES_TABLE,
        INVOICE_ITEMS_TABLE,

        // Returns - المرتجعات
        RETURNS_TABLE,
        RETURN_ITEMS_TABLE,

        // Expenses - المصروفات
        EXPENSE_CATEGORIES_TABLE,
        EXPENSES_TABLE,

        // Losses - الخسائر
        LOSSES_TABLE,
        LOSS_ITEMS_TABLE,

        // Suppliers & Purchases - الموردين والمشتريات
        SUPPLIERS_TABLE,
        SUPPLIER_PURCHASES_TABLE,
        SUPPLIER_PURCHASE_ITEMS_TABLE,
        SUPPLIER_PAYMENTS_TABLE,
    ];
}

/**
 * ⚡ Get all index creation statements
 * جلب جميع جمل إنشاء الفهارس
 */
export function getAllIndexStatements(): string[] {
    return [
        PRODUCTS_INDEXES,
        CUSTOMERS_INDEXES,
        ORDERS_INDEXES,
        ORDER_ITEMS_INDEXES,
        USERS_INDEXES,
        EMPLOYEE_SALARIES_INDEXES,
        STAFF_WORK_SESSIONS_INDEXES,
        REPAIR_ORDERS_INDEXES,
        REPAIR_STATUS_HISTORY_INDEXES,
        INVOICES_INDEXES,
        INVOICE_ITEMS_INDEXES,
        RETURNS_INDEXES,
        RETURN_ITEMS_INDEXES,
        EXPENSE_CATEGORIES_INDEXES,
        EXPENSES_INDEXES,
        LOSSES_INDEXES,
        LOSS_ITEMS_INDEXES,
        SUPPLIERS_INDEXES,
        SUPPLIER_PURCHASES_INDEXES,
        SUPPLIER_PURCHASE_ITEMS_INDEXES,
        SUPPLIER_PAYMENTS_INDEXES,
    ];
}

/**
 * ⚡ Get schema version
 */
export const SCHEMA_VERSION = 43;
