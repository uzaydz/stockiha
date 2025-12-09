/**
 * ⚡ UnifiedCustomerService - v3.0 (PowerSync Best Practices 2025)
 * ================================================================
 *
 * نظام Offline-First كامل للعملاء:
 * - CRUD كامل محلياً
 * - إدارة الديون والمدفوعات
 * - بحث وتصفية سريع
 * - تاريخ المشتريات محلياً
 *
 * ✅ يستخدم powerSyncService.query() بدل db.getAll()
 * ✅ يستخدم powerSyncService.queryOne() بدل db.get()
 * ✅ يستخدم powerSyncService.mutate() للكتابة
 * ✅ يستخدم powerSyncService.transaction() للعمليات المتعددة
 */

import { v4 as uuidv4 } from 'uuid';
import { powerSyncService } from '@/lib/powersync';

// ========================================
// 📦 Types
// ========================================

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;

  // Business info
  nif?: string;
  rc?: string;
  nis?: string;
  rib?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface CustomerWithStats extends Customer {
  total_orders: number;
  total_spent: number;
  total_debt: number;
  last_order_date?: string;
}

export interface CustomerFilters {
  search?: string;
  has_debt?: boolean;
  min_spent?: number;
  max_spent?: number;
}

export interface PaginatedCustomers {
  data: CustomerWithStats[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CustomerStats {
  total_customers: number;
  customers_with_debt: number;
  total_debt: number;
  average_spending: number;
  new_this_month: number;
}

// ========================================
// 🔧 UnifiedCustomerService Class
// ========================================

class UnifiedCustomerServiceClass {
  private organizationId: string | null = null;

  /**
   * تعيين معرف المؤسسة
   */
  setOrganizationId(orgId: string): void {
    this.organizationId = orgId;
  }

  /**
   * الحصول على معرف المؤسسة
   */
  private getOrgId(): string {
    if (this.organizationId) return this.organizationId;

    const stored = localStorage.getItem('bazaar_organization_id') ||
                   localStorage.getItem('currentOrganizationId');
    if (stored) {
      this.organizationId = stored;
      return stored;
    }

    throw new Error('Organization ID not set');
  }

  // ========================================
  // 📖 READ Operations
  // ========================================

  /**
   * ⚡ جلب العملاء مع Pagination
   */
  async getCustomers(
    filters: CustomerFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedCustomers> {
    const orgId = this.getOrgId();
    const offset = (page - 1) * limit;

    // بناء شروط البحث
    let whereClause = 'c.organization_id = ?';
    const params: any[] = [orgId];

    if (filters.search) {
      whereClause += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // ✅ v3.0: استخدام count() الجديد
    const total = await powerSyncService.count('customers c', whereClause, params);

    // ✅ v3.0: استخدام query() الجديد
    const customers = await powerSyncService.query<Customer>({
      sql: `SELECT c.* FROM customers c WHERE ${whereClause} ORDER BY c.name ASC LIMIT ? OFFSET ?`,
      params: [...params, limit, offset]
    });

    // ⚡ v4.0: جلب إحصائيات جميع العملاء في استعلام واحد بدلاً من استعلام لكل عميل
    let customersWithStats: CustomerWithStats[];

    if (customers.length > 0) {
      const customerIds = customers.map(c => c.id);
      const placeholders = customerIds.map(() => '?').join(',');

      // استعلام واحد لجميع الإحصائيات
      const allStats = await powerSyncService.query<{
        customer_id: string;
        total_orders: number;
        total_spent: number;
        total_debt: number;
        last_order_date: string;
      }>({
        sql: `SELECT
          customer_id,
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_spent,
          COALESCE(SUM(remaining_amount), 0) as total_debt,
          MAX(created_at) as last_order_date
        FROM orders
        WHERE customer_id IN (${placeholders}) AND status != 'cancelled'
        GROUP BY customer_id`,
        params: customerIds
      });

      // تحويل النتائج إلى Map للوصول السريع
      const statsMap = new Map(allStats.map(s => [s.customer_id, s]));

      // دمج العملاء مع إحصائياتهم
      customersWithStats = customers.map(customer => {
        const stats = statsMap.get(customer.id);
        return {
          ...customer,
          total_orders: stats?.total_orders || 0,
          total_spent: stats?.total_spent || 0,
          total_debt: stats?.total_debt || 0,
          last_order_date: stats?.last_order_date || undefined
        };
      });
    } else {
      customersWithStats = [];
    }

    // تصفية حسب الديون إذا طُلب
    let filteredCustomers = customersWithStats;
    if (filters.has_debt) {
      filteredCustomers = customersWithStats.filter(c => c.total_debt > 0);
    }

    if (filters.min_spent !== undefined) {
      filteredCustomers = filteredCustomers.filter(c => c.total_spent >= filters.min_spent!);
    }

    if (filters.max_spent !== undefined) {
      filteredCustomers = filteredCustomers.filter(c => c.total_spent <= filters.max_spent!);
    }

    return {
      data: filteredCustomers,
      total,
      page,
      limit,
      hasMore: offset + customers.length < total
    };
  }

  /**
   * ⚡ جلب عميل واحد مع التفاصيل
   */
  async getCustomer(customerId: string): Promise<CustomerWithStats | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const customer = await powerSyncService.queryOne<Customer>({
      sql: 'SELECT * FROM customers WHERE id = ?',
      params: [customerId]
    });

    if (!customer) return null;

    const stats = await this.getCustomerOrderStats(customerId);

    return {
      ...customer,
      ...stats
    };
  }

  /**
   * ⚡ إحصائيات طلبات العميل
   */
  private async getCustomerOrderStats(customerId: string): Promise<{
    total_orders: number;
    total_spent: number;
    total_debt: number;
    last_order_date?: string;
  }> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const stats = await powerSyncService.queryOne<{
      total_orders: number;
      total_spent: number;
      total_debt: number;
      last_order_date: string;
    }>({
      sql: `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_spent,
        COALESCE(SUM(remaining_amount), 0) as total_debt,
        MAX(created_at) as last_order_date
      FROM orders
      WHERE customer_id = ? AND status != 'cancelled'`,
      params: [customerId]
    });

    return {
      total_orders: stats?.total_orders || 0,
      total_spent: stats?.total_spent || 0,
      total_debt: stats?.total_debt || 0,
      last_order_date: stats?.last_order_date || undefined
    };
  }

  /**
   * ⚡ بحث سريع في العملاء
   */
  async searchCustomers(query: string, limit: number = 20): Promise<Customer[]> {
    if (!query || query.trim().length < 2) return [];

    const orgId = this.getOrgId();
    const searchPattern = `%${query.trim()}%`;

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<Customer>({
      sql: `SELECT * FROM customers
       WHERE organization_id = ?
       AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
       ORDER BY name ASC
       LIMIT ?`,
      params: [orgId, searchPattern, searchPattern, searchPattern, limit]
    });
  }

  /**
   * ⚡ جلب عميل بالهاتف
   */
  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const orgId = this.getOrgId();

    // ✅ v3.0: استخدام queryOne() الجديد
    return powerSyncService.queryOne<Customer>({
      sql: 'SELECT * FROM customers WHERE organization_id = ? AND phone = ?',
      params: [orgId, phone]
    });
  }

  /**
   * ⚡ العملاء المدينين
   */
  async getCustomersWithDebt(limit: number = 50): Promise<CustomerWithStats[]> {
    const result = await this.getCustomers({ has_debt: true }, 1, limit);
    return result.data.filter(c => c.total_debt > 0).sort((a, b) => b.total_debt - a.total_debt);
  }

  /**
   * ⚡ v4.0: جلب عملاء متعددين بـ IDs في استعلام واحد
   * بدلاً من استعلام لكل عميل
   */
  async getCustomersByIds(customerIds: string[]): Promise<CustomerWithStats[]> {
    if (!customerIds.length) return [];

    // إزالة التكرارات
    const uniqueIds = [...new Set(customerIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');

    // استعلام واحد لجميع العملاء
    const customers = await powerSyncService.query<Customer>({
      sql: `SELECT * FROM customers WHERE id IN (${placeholders})`,
      params: uniqueIds
    });

    if (!customers.length) return [];

    // استعلام واحد لجميع الإحصائيات
    const allStats = await powerSyncService.query<{
      customer_id: string;
      total_orders: number;
      total_spent: number;
      total_debt: number;
      last_order_date: string;
    }>({
      sql: `SELECT
        customer_id,
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_spent,
        COALESCE(SUM(remaining_amount), 0) as total_debt,
        MAX(created_at) as last_order_date
      FROM orders
      WHERE customer_id IN (${placeholders}) AND status != 'cancelled'
      GROUP BY customer_id`,
      params: uniqueIds
    });

    const statsMap = new Map(allStats.map(s => [s.customer_id, s]));

    return customers.map(customer => {
      const stats = statsMap.get(customer.id);
      return {
        ...customer,
        total_orders: stats?.total_orders || 0,
        total_spent: stats?.total_spent || 0,
        total_debt: stats?.total_debt || 0,
        last_order_date: stats?.last_order_date || undefined
      };
    });
  }

  // ========================================
  // ✏️ CREATE Operations
  // ========================================

  /**
   * ⚡ إنشاء عميل جديد
   */
  async createCustomer(
    data: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Customer> {
    const orgId = this.getOrgId();
    const now = new Date().toISOString();
    const customerId = uuidv4();

    const customer: Customer = {
      ...data,
      id: customerId,
      organization_id: orgId,
      created_at: now,
      updated_at: now
    };

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'customers',
      operation: 'INSERT',
      data: customer
    });

    console.log(`[UnifiedCustomer] ✅ Created customer: ${customerId}`);
    return customer;
  }

  /**
   * ⚡ إنشاء أو الحصول على عميل بالهاتف
   */
  async getOrCreateByPhone(
    phone: string,
    defaultName?: string
  ): Promise<Customer> {
    const existing = await this.getCustomerByPhone(phone);
    if (existing) return existing;

    return this.createCustomer({
      name: defaultName || `عميل ${phone}`,
      phone
    });
  }

  // ========================================
  // 📝 UPDATE Operations
  // ========================================

  /**
   * ⚡ تحديث عميل
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<Omit<Customer, 'id' | 'organization_id' | 'created_at'>>
  ): Promise<Customer | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const existing = await powerSyncService.queryOne<Customer>({
      sql: 'SELECT * FROM customers WHERE id = ?',
      params: [customerId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedCustomer = {
      ...existing,
      ...updates,
      updated_at: now
    };

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'customers',
      operation: 'UPDATE',
      data: { ...updates, updated_at: now },
      where: { id: customerId }
    });

    console.log(`[UnifiedCustomer] ✅ Updated customer: ${customerId}`);
    return updatedCustomer;
  }

  // ========================================
  // 🗑️ DELETE Operations
  // ========================================

  /**
   * ⚡ حذف عميل
   */
  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      // التحقق من عدم وجود طلبات مرتبطة
      const ordersCount = await powerSyncService.count('orders', 'customer_id = ?', [customerId]);

      if (ordersCount > 0) {
        console.warn(`[UnifiedCustomer] ⚠️ Cannot delete customer with orders: ${customerId}`);
        return false;
      }

      // ✅ v3.0: استخدام mutate() الجديد
      await powerSyncService.mutate({
        table: 'customers',
        operation: 'DELETE',
        where: { id: customerId }
      });

      console.log(`[UnifiedCustomer] ✅ Deleted customer: ${customerId}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedCustomer] ❌ Failed to delete customer:`, error);
      return false;
    }
  }

  // ========================================
  // 📊 Statistics
  // ========================================

  /**
   * ⚡ إحصائيات العملاء
   */
  async getCustomerStats(): Promise<CustomerStats> {
    const orgId = this.getOrgId();
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // ✅ v3.0: استخدام count() و queryOne() الجديد
    const totalCustomers = await powerSyncService.count('customers', 'organization_id = ?', [orgId]);

    const newThisMonthResult = await powerSyncService.queryOne<{ count: number }>({
      sql: 'SELECT COUNT(*) as count FROM customers WHERE organization_id = ? AND created_at >= ?',
      params: [orgId, firstOfMonth]
    });

    const debtStats = await powerSyncService.queryOne<{
      customers_with_debt: number;
      total_debt: number;
    }>({
      sql: `SELECT
        COUNT(DISTINCT customer_id) as customers_with_debt,
        COALESCE(SUM(remaining_amount), 0) as total_debt
      FROM orders
      WHERE organization_id = ?
      AND remaining_amount > 0
      AND status != 'cancelled'`,
      params: [orgId]
    });

    const avgSpending = await powerSyncService.queryOne<{ avg_spending: number }>({
      sql: `SELECT AVG(customer_total) as avg_spending FROM (
        SELECT SUM(total) as customer_total
        FROM orders
        WHERE organization_id = ? AND status != 'cancelled' AND customer_id IS NOT NULL
        GROUP BY customer_id
      )`,
      params: [orgId]
    });

    return {
      total_customers: totalCustomers,
      customers_with_debt: debtStats?.customers_with_debt || 0,
      total_debt: debtStats?.total_debt || 0,
      average_spending: avgSpending?.avg_spending || 0,
      new_this_month: newThisMonthResult?.count || 0
    };
  }

  /**
   * ⚡ v4.0: أفضل العملاء - محسّن باستعلام واحد
   */
  async getTopCustomers(limit: number = 10): Promise<CustomerWithStats[]> {
    const orgId = this.getOrgId();

    // جلب IDs أفضل العملاء
    const topCustomerIds = await powerSyncService.query<{ customer_id: string; total_spent: number }>({
      sql: `SELECT customer_id, SUM(total) as total_spent
       FROM orders
       WHERE organization_id = ? AND customer_id IS NOT NULL AND status != 'cancelled'
       GROUP BY customer_id
       ORDER BY total_spent DESC
       LIMIT ?`,
      params: [orgId, limit]
    });

    if (!topCustomerIds.length) return [];

    // ⚡ v4.0: استخدام getCustomersByIds بدلاً من استعلام لكل عميل
    const customerIds = topCustomerIds.map(c => c.customer_id);
    const customers = await this.getCustomersByIds(customerIds);

    // الحفاظ على الترتيب حسب total_spent
    const orderedCustomers: CustomerWithStats[] = [];
    for (const { customer_id } of topCustomerIds) {
      const customer = customers.find(c => c.id === customer_id);
      if (customer) {
        orderedCustomers.push(customer);
      }
    }

    return orderedCustomers;
  }

  /**
   * ⚡ تاريخ مشتريات العميل
   */
  async getCustomerOrderHistory(
    customerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: any[]; total: number }> {
    const offset = (page - 1) * limit;

    // ✅ v3.0: استخدام count() و query() الجديد
    const total = await powerSyncService.count('orders', 'customer_id = ?', [customerId]);

    const orders = await powerSyncService.query<any>({
      sql: `SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params: [customerId, limit, offset]
    });

    return {
      orders,
      total
    };
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const unifiedCustomerService = new UnifiedCustomerServiceClass();
export default unifiedCustomerService;
