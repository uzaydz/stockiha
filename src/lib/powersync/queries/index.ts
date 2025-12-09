/**
 * ⚡ Shared PowerSync Queries - v2.0 (Best Practices 2025)
 * ============================================================
 *
 * 🚀 Shared query definitions للتطبيق:
 *   - استعلامات مركزية قابلة لإعادة الاستخدام
 *   - تقليل التكرار وتحسين الأداء
 *   - تسهيل الصيانة
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📦 SQL Query Definitions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📦 Products Queries
 */
export const ProductQueries = {
  // Get all active products for organization - الأحدث أولاً
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM products
      WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)
      ORDER BY created_at DESC
    `,
    params: [orgId],
  }),

  // Get products with pagination - الأحدث أولاً
  getPaginated: (orgId: string, limit: number, offset: number) => ({
    sql: `
      SELECT * FROM products
      WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    params: [orgId, limit, offset],
  }),

  // Get products count
  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM products WHERE organization_id = ?`,
    params: [orgId],
  }),

  // Search products - الأحدث أولاً
  search: (orgId: string, searchTerm: string) => ({
    sql: `
      SELECT * FROM products
      WHERE organization_id = ?
        AND (is_active = 1 OR is_active IS NULL)
        AND (
          name LIKE ?
          OR sku LIKE ?
          OR barcode LIKE ?
        )
      ORDER BY created_at DESC
      LIMIT 50
    `,
    params: [orgId, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
  }),

  // Get by barcode
  getByBarcode: (orgId: string, barcode: string) => ({
    sql: `
      SELECT * FROM products
      WHERE organization_id = ? AND barcode = ?
      LIMIT 1
    `,
    params: [orgId, barcode],
  }),

  // Get by category - الأحدث أولاً
  getByCategory: (orgId: string, categoryId: string) => ({
    sql: `
      SELECT * FROM products
      WHERE organization_id = ? AND category_id = ?
      ORDER BY created_at DESC
    `,
    params: [orgId, categoryId],
  }),
};

/**
 * 📁 Categories Queries
 */
export const CategoryQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM product_categories
      WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)
      ORDER BY name
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM product_categories WHERE organization_id = ?`,
    params: [orgId],
  }),
};

/**
 * 📁 Subcategories Queries
 */
export const SubcategoryQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM product_subcategories
      WHERE organization_id = ?
      ORDER BY name
    `,
    params: [orgId],
  }),

  getByCategory: (orgId: string, categoryId: string) => ({
    sql: `
      SELECT * FROM product_subcategories
      WHERE organization_id = ? AND category_id = ?
      ORDER BY name
    `,
    params: [orgId, categoryId],
  }),
};

/**
 * 👥 Customers Queries
 */
export const CustomerQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM customers
      WHERE organization_id = ?
      ORDER BY name
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM customers WHERE organization_id = ?`,
    params: [orgId],
  }),

  search: (orgId: string, searchTerm: string) => ({
    sql: `
      SELECT * FROM customers
      WHERE organization_id = ?
        AND (
          name LIKE ?
          OR phone LIKE ?
          OR email LIKE ?
        )
      ORDER BY name
      LIMIT 20
    `,
    params: [orgId, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
  }),
};

/**
 * 🏭 Suppliers Queries
 */
export const SupplierQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM suppliers
      WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)
      ORDER BY name
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM suppliers WHERE organization_id = ?`,
    params: [orgId],
  }),
};

/**
 * 📋 Orders Queries
 */
export const OrderQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM orders
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `,
    params: [orgId],
  }),

  getRecent: (orgId: string, limit: number = 50) => ({
    sql: `
      SELECT * FROM orders
      WHERE organization_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    params: [orgId, limit],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM orders WHERE organization_id = ?`,
    params: [orgId],
  }),

  getByStatus: (orgId: string, status: string) => ({
    sql: `
      SELECT * FROM orders
      WHERE organization_id = ? AND status = ?
      ORDER BY created_at DESC
    `,
    params: [orgId, status],
  }),

  getToday: (orgId: string) => ({
    sql: `
      SELECT * FROM orders
      WHERE organization_id = ?
        AND date(created_at) = date('now')
      ORDER BY created_at DESC
    `,
    params: [orgId],
  }),
};

/**
 * 📦 Order Items Queries
 */
export const OrderItemQueries = {
  getByOrder: (orderId: string) => ({
    sql: `
      SELECT * FROM order_items
      WHERE order_id = ?
      ORDER BY created_at
    `,
    params: [orderId],
  }),
};

/**
 * 💰 Expenses Queries
 */
export const ExpenseQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM expenses
      WHERE organization_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY expense_date DESC
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `
      SELECT COUNT(*) as count FROM expenses
      WHERE organization_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
    `,
    params: [orgId],
  }),

  getByMonth: (orgId: string, year: number, month: number) => ({
    sql: `
      SELECT * FROM expenses
      WHERE organization_id = ?
        AND (is_deleted = 0 OR is_deleted IS NULL)
        AND strftime('%Y', expense_date) = ?
        AND strftime('%m', expense_date) = ?
      ORDER BY expense_date DESC
    `,
    params: [orgId, String(year), String(month).padStart(2, '0')],
  }),
};

/**
 * 📁 Expense Categories Queries
 */
export const ExpenseCategoryQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM expense_categories
      WHERE organization_id = ?
      ORDER BY name
    `,
    params: [orgId],
  }),
};

/**
 * 👤 Staff Queries
 */
export const StaffQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM pos_staff_sessions
      WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)
      ORDER BY staff_name
    `,
    params: [orgId],
  }),

  getActive: (orgId: string) => ({
    sql: `
      SELECT * FROM pos_staff_sessions
      WHERE organization_id = ? AND is_active = 1
      ORDER BY staff_name
    `,
    params: [orgId],
  }),
};

/**
 * 📊 Work Sessions Queries
 */
export const WorkSessionQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM staff_work_sessions
      WHERE organization_id = ?
      ORDER BY started_at DESC
    `,
    params: [orgId],
  }),

  getActive: (orgId: string) => ({
    sql: `
      SELECT * FROM staff_work_sessions
      WHERE organization_id = ? AND status = 'active'
      ORDER BY started_at DESC
    `,
    params: [orgId],
  }),
};

/**
 * 📄 Invoices Queries
 */
export const InvoiceQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM invoices
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM invoices WHERE organization_id = ?`,
    params: [orgId],
  }),
};

/**
 * 📉 Losses Queries
 */
export const LossQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM losses
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM losses WHERE organization_id = ?`,
    params: [orgId],
  }),
};

/**
 * 🔧 Repairs Queries
 */
export const RepairQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM repair_orders
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM repair_orders WHERE organization_id = ?`,
    params: [orgId],
  }),
};

/**
 * 🔄 Returns Queries
 */
export const ReturnQueries = {
  getAll: (orgId: string) => ({
    sql: `
      SELECT * FROM returns
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `,
    params: [orgId],
  }),

  getCount: (orgId: string) => ({
    sql: `SELECT COUNT(*) as count FROM returns WHERE organization_id = ?`,
    params: [orgId],
  }),
};

/**
 * 🏢 Organization Queries
 */
export const OrganizationQueries = {
  get: (orgId: string) => ({
    sql: `SELECT * FROM organizations WHERE id = ? LIMIT 1`,
    params: [orgId],
  }),

  getSubscription: (orgId: string) => ({
    sql: `
      SELECT * FROM organization_subscriptions
      WHERE organization_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    params: [orgId],
  }),
};

/**
 * ⚙️ POS Settings Queries
 * ⚠️ تحديد الأعمدة الموجودة فقط (بدون printer_type, etc - تأتي من local_printer_settings)
 */
export const POSSettingsQueries = {
  get: (orgId: string) => ({
    sql: `
      SELECT
        id, organization_id,
        store_name, store_phone, store_email, store_address, store_website, store_logo_url,
        receipt_header_text, receipt_footer_text, welcome_message,
        show_qr_code, show_tracking_code, show_customer_info, show_store_logo,
        show_store_info, show_date_time, show_employee_name,
        paper_width, font_size, line_spacing, print_density, auto_cut,
        primary_color, secondary_color, text_color, background_color,
        receipt_template, header_style, footer_style, item_display_style, price_position,
        custom_css, currency_symbol, currency_position, tax_label, tax_number,
        business_license, activity, rc, nif, nis, rib,
        allow_price_edit, require_manager_approval,
        created_at, updated_at
      FROM pos_settings
      WHERE organization_id = ?
      LIMIT 1
    `,
    params: [orgId],
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 Stats Queries (للـ dashboard)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📊 Get all table counts in one query
 */
export const getTableCountsQuery = (orgId: string) => ({
  sql: `
    SELECT 'products' as table_name, COUNT(*) as count FROM products WHERE organization_id = ?
    UNION ALL SELECT 'product_categories', COUNT(*) FROM product_categories WHERE organization_id = ?
    UNION ALL SELECT 'product_subcategories', COUNT(*) FROM product_subcategories WHERE organization_id = ?
    UNION ALL SELECT 'customers', COUNT(*) FROM customers WHERE organization_id = ?
    UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers WHERE organization_id = ?
    UNION ALL SELECT 'orders', COUNT(*) FROM orders WHERE organization_id = ?
    UNION ALL SELECT 'expenses', COUNT(*) FROM expenses WHERE organization_id = ?
    UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE organization_id = ?
    UNION ALL SELECT 'losses', COUNT(*) FROM losses WHERE organization_id = ?
    UNION ALL SELECT 'returns', COUNT(*) FROM returns WHERE organization_id = ?
    UNION ALL SELECT 'repair_orders', COUNT(*) FROM repair_orders WHERE organization_id = ?
    UNION ALL SELECT 'pos_staff_sessions', COUNT(*) FROM pos_staff_sessions WHERE organization_id = ?
    UNION ALL SELECT 'staff_work_sessions', COUNT(*) FROM staff_work_sessions WHERE organization_id = ?
  `,
  params: Array(13).fill(orgId),
});

export default {
  ProductQueries,
  CategoryQueries,
  SubcategoryQueries,
  CustomerQueries,
  SupplierQueries,
  OrderQueries,
  OrderItemQueries,
  ExpenseQueries,
  ExpenseCategoryQueries,
  StaffQueries,
  WorkSessionQueries,
  InvoiceQueries,
  LossQueries,
  RepairQueries,
  ReturnQueries,
  OrganizationQueries,
  POSSettingsQueries,
  getTableCountsQuery,
};
