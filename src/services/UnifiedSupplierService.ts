/**
 * ⚡ UnifiedSupplierService - v3.0 (PowerSync Best Practices 2025)
 * ================================================================
 *
 * نظام Offline-First كامل للموردين:
 * - CRUD كامل محلياً
 * - إدارة المشتريات والمدفوعات
 * - بحث وتصفية سريع
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

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  tax_number?: string;
  business_type?: string;
  notes?: string;
  rating: number;
  supplier_type: 'local' | 'international';
  supplier_category: 'wholesale' | 'retail' | 'both';
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierFilters {
  search?: string;
  supplier_type?: 'local' | 'international';
  supplier_category?: 'wholesale' | 'retail' | 'both';
  is_active?: boolean;
}

export interface PaginatedSuppliers {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ========================================
// 🔧 UnifiedSupplierService Class
// ========================================

class UnifiedSupplierServiceClass {
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
   * ⚡ جلب الموردين مع Pagination
   */
  async getSuppliers(
    filters: SupplierFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedSuppliers> {
    const orgId = this.getOrgId();
    const offset = (page - 1) * limit;

    // بناء شروط البحث
    let whereClause = 'organization_id = ?';
    const params: any[] = [orgId];

    if (filters.search) {
      whereClause += ' AND (name LIKE ? OR company_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (filters.supplier_type) {
      whereClause += ' AND supplier_type = ?';
      params.push(filters.supplier_type);
    }

    if (filters.supplier_category) {
      whereClause += ' AND supplier_category = ?';
      params.push(filters.supplier_category);
    }

    if (filters.is_active !== undefined) {
      whereClause += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    // ✅ v3.0: استخدام count() الجديد
    const total = await powerSyncService.count('suppliers', whereClause, params);

    // ✅ v3.0: استخدام query() الجديد
    const suppliers = await powerSyncService.query<Supplier>({
      sql: `SELECT * FROM suppliers WHERE ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      params: [...params, limit, offset]
    });

    return {
      data: suppliers,
      total,
      page,
      limit,
      hasMore: offset + suppliers.length < total
    };
  }

  /**
   * ⚡ جلب مورد واحد
   */
  async getSupplier(supplierId: string): Promise<Supplier | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    return powerSyncService.queryOne<Supplier>({
      sql: 'SELECT * FROM suppliers WHERE id = ?',
      params: [supplierId]
    });
  }

  /**
   * ⚡ بحث سريع في الموردين
   */
  async searchSuppliers(query: string, limit: number = 20): Promise<Supplier[]> {
    if (!query || query.trim().length < 2) return [];

    const orgId = this.getOrgId();
    const searchPattern = `%${query.trim()}%`;

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<Supplier>({
      sql: `SELECT * FROM suppliers
       WHERE organization_id = ?
       AND (name LIKE ? OR company_name LIKE ? OR email LIKE ? OR phone LIKE ?)
       AND is_active = 1
       ORDER BY name ASC
       LIMIT ?`,
      params: [orgId, searchPattern, searchPattern, searchPattern, searchPattern, limit]
    });
  }

  // ========================================
  // ✏️ CREATE Operations
  // ========================================

  /**
   * ⚡ إنشاء مورد جديد
   */
  async createSupplier(
    data: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Supplier> {
    const orgId = this.getOrgId();
    const now = new Date().toISOString();
    const supplierId = uuidv4();

    const supplier: Supplier = {
      ...data,
      id: supplierId,
      organization_id: orgId,
      rating: data.rating || 0,
      supplier_type: data.supplier_type || 'local',
      supplier_category: data.supplier_category || 'wholesale',
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now
    };

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'suppliers',
      operation: 'INSERT',
      data: supplier
    });

    console.log(`[UnifiedSupplier] ✅ Created supplier: ${supplierId}`);
    return supplier;
  }

  // ========================================
  // 📝 UPDATE Operations
  // ========================================

  /**
   * ⚡ تحديث مورد
   */
  async updateSupplier(
    supplierId: string,
    updates: Partial<Omit<Supplier, 'id' | 'organization_id' | 'created_at'>>
  ): Promise<Supplier | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const existing = await powerSyncService.queryOne<Supplier>({
      sql: 'SELECT * FROM suppliers WHERE id = ?',
      params: [supplierId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedSupplier = {
      ...existing,
      ...updates,
      updated_at: now
    };

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'suppliers',
      operation: 'UPDATE',
      data: { ...updates, updated_at: now },
      where: { id: supplierId }
    });

    console.log(`[UnifiedSupplier] ✅ Updated supplier: ${supplierId}`);
    return updatedSupplier;
  }

  // ========================================
  // 🗑️ DELETE Operations
  // ========================================

  /**
   * ⚡ حذف مورد
   */
  async deleteSupplier(supplierId: string): Promise<boolean> {
    try {
      // ✅ v3.0: استخدام mutate() الجديد
      await powerSyncService.mutate({
        table: 'suppliers',
        operation: 'DELETE',
        where: { id: supplierId }
      });

      console.log(`[UnifiedSupplier] ✅ Deleted supplier: ${supplierId}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedSupplier] ❌ Failed to delete supplier:`, error);
      return false;
    }
  }

  /**
   * ⚡ تعطيل مورد (بدلاً من الحذف)
   */
  async deactivateSupplier(supplierId: string): Promise<Supplier | null> {
    return this.updateSupplier(supplierId, { is_active: false });
  }

  /**
   * ⚡ تفعيل مورد
   */
  async activateSupplier(supplierId: string): Promise<Supplier | null> {
    return this.updateSupplier(supplierId, { is_active: true });
  }

  // ========================================
  // 📊 Statistics
  // ========================================

  /**
   * ⚡ إحصائيات الموردين
   */
  async getSupplierStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    local: number;
    international: number;
  }> {
    const orgId = this.getOrgId();

    // ✅ v3.0: استخدام count() الجديد
    const total = await powerSyncService.count('suppliers', 'organization_id = ?', [orgId]);
    const active = await powerSyncService.count('suppliers', 'organization_id = ? AND is_active = 1', [orgId]);
    const local = await powerSyncService.count('suppliers', "organization_id = ? AND supplier_type = 'local'", [orgId]);
    const international = await powerSyncService.count('suppliers', "organization_id = ? AND supplier_type = 'international'", [orgId]);

    return {
      total,
      active,
      inactive: total - active,
      local,
      international
    };
  }

  /**
   * ⚡ جلب جميع الموردين النشطين
   */
  async getActiveSuppliers(): Promise<Supplier[]> {
    const orgId = this.getOrgId();

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<Supplier>({
      sql: 'SELECT * FROM suppliers WHERE organization_id = ? AND is_active = 1 ORDER BY name ASC',
      params: [orgId]
    });
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const unifiedSupplierService = new UnifiedSupplierServiceClass();
export default unifiedSupplierService;
