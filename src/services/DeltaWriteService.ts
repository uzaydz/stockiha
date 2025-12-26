/**
 * ⚡ DeltaWriteService - v3.1 (PowerSync Best Practices 2025)
 * ============================================================
 *
 * خدمة الكتابة والقراءة - محسّنة بالكامل:
 * - CRUD operations عبر PowerSync v3.0 API
 * - Transaction support للعمليات المعقدة
 * - Offline-First مع مزامنة تلقائية
 * - ⚡ Batch operations للأداء العالي
 *
 * ✅ يستخدم powerSyncService.query() بدل db.getAll()
 * ✅ يستخدم powerSyncService.queryOne() بدل db.get()
 * ✅ يستخدم powerSyncService.mutate() بدل db.execute()
 * ✅ يستخدم powerSyncService.mutateBatch() للعمليات المجمّعة
 * ✅ يستخدم powerSyncService.transaction() للعمليات المتعددة
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// =====================================================
// Types
// =====================================================

export interface WriteResult {
  success: boolean;
  id: string;
  error?: string;
}

// =====================================================
// DeltaWriteService
// =====================================================

class DeltaWriteServiceClass {

  // ========================================
  // 📝 CRUD Operations
  // ========================================

  /**
   * ⚡ إنشاء سجل جديد
   */
  async create<T extends Record<string, any>>(
    table: string,
    data: T
  ): Promise<WriteResult> {
    try {
      const id = data.id || crypto.randomUUID();
      const dataWithId = { ...data, id };

      const success = await powerSyncService.mutate({
        table,
        operation: 'INSERT',
        data: dataWithId
      });

      return { success, id };
    } catch (error: any) {
      console.error(`[DeltaWrite] Create failed for ${table}:`, error);
      return { success: false, id: '', error: error?.message };
    }
  }

  /**
   * ⚡ جلب سجل واحد
   */
  async get<T>(table: string, id: string): Promise<T | null> {
    return powerSyncService.queryOne<T>({
      sql: `SELECT * FROM ${table} WHERE id = ?`,
      params: [id]
    });
  }

  /**
   * ⚡ جلب جميع السجلات
   */
  async getAll<T>(
    table: string,
    organizationId?: string,
    options?: {
      where?: string;
      params?: any[];
      limit?: number;
      offset?: number;
      orderBy?: string;
    }
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    // بناء WHERE clause
    const conditions: string[] = [];

    if (organizationId) {
      conditions.push('organization_id = ?');
      params.push(organizationId);
    }

    if (options?.where) {
      conditions.push(options.where);
      if (options.params) {
        params.push(...options.params);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    // LIMIT & OFFSET
    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    return powerSyncService.query<T>({ sql, params });
  }

  /**
   * ⚡ تحديث سجل
   */
  async update<T extends Record<string, any>>(
    table: string,
    id: string,
    updates: Partial<T>
  ): Promise<WriteResult> {
    try {
      // إضافة updated_at
      const dataWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const success = await powerSyncService.mutate({
        table,
        operation: 'UPDATE',
        data: dataWithTimestamp,
        where: [{ column: 'id', value: id }]  // ⚡ تصحيح: array format
      });

      return { success, id };
    } catch (error: any) {
      console.error(`[DeltaWrite] Update failed for ${table}:`, error);
      return { success: false, id, error: error?.message };
    }
  }

  /**
   * ⚡ حذف سجل
   */
  async delete(table: string, id: string): Promise<WriteResult> {
    try {
      const success = await powerSyncService.mutate({
        table,
        operation: 'DELETE',
        data: { id },
        where: [{ column: 'id', value: id }]  // ⚡ تصحيح: array format
      });

      return { success, id };
    } catch (error: any) {
      console.error(`[DeltaWrite] Delete failed for ${table}:`, error);
      return { success: false, id, error: error?.message };
    }
  }

  // ========================================
  // 🔍 البحث والعد
  // ========================================

  /**
   * ⚡ البحث في السجلات
   */
  async search<T>(
    table: string,
    organizationId: string,
    fields: string[],
    searchTerm: string,
    limit: number = 50
  ): Promise<T[]> {
    if (!searchTerm.trim()) return [];

    const searchPattern = `%${searchTerm.trim()}%`;
    const conditions = fields.map(field => `${field} LIKE ?`).join(' OR ');

    return powerSyncService.query<T>({
      sql: `SELECT * FROM ${table} WHERE organization_id = ? AND (${conditions}) LIMIT ?`,
      params: [organizationId, ...fields.map(() => searchPattern), limit]
    });
  }

  /**
   * ⚡ عد السجلات
   */
  async count(table: string, organizationId?: string, where?: string, params?: any[]): Promise<number> {
    let whereClause = organizationId ? 'organization_id = ?' : '1=1';
    const queryParams: any[] = organizationId ? [organizationId] : [];

    if (where) {
      whereClause += ` AND ${where}`;
      if (params) queryParams.push(...params);
    }

    return powerSyncService.count(table, whereClause, queryParams);
  }

  // ========================================
  // 💾 حفظ من السيرفر (للمزامنة)
  // ========================================

  /**
   * ⚡ حفظ من السيرفر - INSERT OR REPLACE
   * 
   * ⚠️ تحذير: PowerSync ينشئ Views وليس Tables!
   * - الجداول المُزامنة (products, customers, orders, etc.) تُدار تلقائيًا من PowerSync
   * - محاولة الكتابة المباشرة تسبب: "cannot UPSERT a view"
   * 
   * ℹ️ هذه الدالة تعمل فقط مع الجداول المحلية (local-only tables)
   */
  async saveFromServer<T extends Record<string, any>>(
    table: string,
    data: T
  ): Promise<WriteResult> {
    // ⚡ الجداول المُزامنة من PowerSync - لا يجب الكتابة فيها يدويًا
    const syncedTables = [
      'products', 'product_colors', 'product_sizes', 'product_images',
      'product_categories', 'product_subcategories', 'product_wholesale_tiers',
      'inventory_batches', 'product_serial_numbers',
      'orders', 'order_items',
      'customers', 'suppliers',
      'invoices', 'invoice_items',
      'expenses', 'expense_categories',
      'losses', 'loss_items',
      'returns', 'return_items',
      'repair_orders', 'repair_locations', 'repair_images', 'repair_status_history',
      'pos_staff_sessions', 'staff_work_sessions',
      'subscription_transactions', 'organization_subscriptions',
      'users', 'organizations', 'pos_settings',
      'activation_codes', 'subscription_history',
      'supplier_purchases', 'supplier_purchase_items',
      'purchase_landed_costs', 'purchase_price_updates', 'purchase_templates',
      'supplier_payments'
    ];

    // ⚡ تجاهل الكتابة في الجداول المُزامنة - PowerSync يتولى جلبها تلقائيًا
    if (syncedTables.includes(table)) {
      // لا نسجل - لتقليل الضوضاء في console
      return { success: true, id: data.id || '' };
    }

    try {
      const id = data.id || crypto.randomUUID();
      const mappedData = this.mapDataForPowerSync(table, { ...data, id });

      const success = await powerSyncService.mutate({
        table,
        operation: 'UPSERT',
        data: mappedData
      });

      return { success, id };
    } catch (error: any) {
      console.error(`[DeltaWrite] SaveFromServer failed for ${table}:`, error);
      return { success: false, id: '', error: error?.message };
    }
  }

  // ========================================
  // 📦 عمليات المنتجات
  // ========================================

  /**
   * ⚡ v4.0: إنشاء منتج مع variants - باستخدام Batch Operations للأداء العالي
   * تحسين من 100+ INSERT إلى 3 فقط
   */
  async createProductWithVariants(
    organizationId: string,
    product: Record<string, any>,
    colors?: Array<{ name: string; code?: string; quantity?: number; barcode?: string; price?: number; purchase_price?: number }>,
    sizes?: Array<{ name: string; colorId: string; quantity?: number; barcode?: string; price?: number; purchase_price?: number }>
  ): Promise<WriteResult> {
    try {
      const productId = product.id || crypto.randomUUID();
      const now = new Date().toISOString();

      // ⚡ v4.0: إنشاء المنتج أولاً
      await powerSyncService.mutate({
        table: 'products',
        operation: 'INSERT',
        data: {
          ...product,
          id: productId,
          organization_id: organizationId,
          has_variants: (colors && colors.length > 0) ? 1 : 0,
          has_colors: (colors && colors.length > 0) ? 1 : 0,
          created_at: now,
          updated_at: now
        }
      });

      // ⚡ v4.0: Batch INSERT للألوان - استعلام واحد بدلاً من N استعلامات
      if (colors && colors.length > 0) {
        const colorData = colors.map(color => ({
          id: crypto.randomUUID(),
          product_id: productId,
          organization_id: organizationId,
          name: color.name,
          color_code: color.code || '#000000',
          quantity: color.quantity || 0,
          barcode: color.barcode || null,
          price: color.price || null,
          purchase_price: color.purchase_price || null,
          created_at: now,
          updated_at: now
        }));

        await powerSyncService.mutateBatch({
          table: 'product_colors',
          operation: 'INSERT',
          data: colorData,
          chunkSize: 50
        });

        console.log(`[DeltaWrite] ⚡ Batch inserted ${colorData.length} colors`);
      }

      // ⚡ v4.0: Batch INSERT للمقاسات - استعلام واحد بدلاً من N استعلامات
      if (sizes && sizes.length > 0) {
        const sizeData = sizes.map(size => ({
          id: crypto.randomUUID(),
          product_id: productId,
          color_id: size.colorId,
          organization_id: organizationId,
          size_name: size.name,
          quantity: size.quantity || 0,
          barcode: size.barcode || null,
          price: size.price || null,
          purchase_price: size.purchase_price || null,
          created_at: now,
          updated_at: now
        }));

        await powerSyncService.mutateBatch({
          table: 'product_sizes',
          operation: 'INSERT',
          data: sizeData,
          chunkSize: 50
        });

        console.log(`[DeltaWrite] ⚡ Batch inserted ${sizeData.length} sizes`);
      }

      console.log(`[DeltaWrite] ✅ Product created with variants: ${productId} (${colors?.length || 0} colors, ${sizes?.length || 0} sizes)`);
      return { success: true, id: productId };
    } catch (error: any) {
      console.error(`[DeltaWrite] CreateProductWithVariants failed:`, error);
      return { success: false, id: '', error: error?.message };
    }
  }

  /**
   * ⚡ تحديث مخزون المنتج (DELTA operation)
   */
  async updateProductStock(
    productId: string,
    delta: number,
    options?: { colorId?: string; sizeId?: string }
  ): Promise<WriteResult> {
    try {
      if (options?.sizeId) {
        // تحديث مخزون المقاس
        const size = await powerSyncService.queryOne<{ quantity: number }>({
          sql: 'SELECT quantity FROM product_sizes WHERE id = ?',
          params: [options.sizeId]
        });

        if (size) {
          await powerSyncService.mutate({
            table: 'product_sizes',
            operation: 'UPDATE',
            data: { quantity: (size.quantity || 0) + delta },
            where: [{ column: 'id', value: options.sizeId }]  // ⚡ تصحيح: array format
          });
        }
      } else if (options?.colorId) {
        // تحديث مخزون اللون
        const color = await powerSyncService.queryOne<{ quantity: number }>({
          sql: 'SELECT quantity FROM product_colors WHERE id = ?',
          params: [options.colorId]
        });

        if (color) {
          await powerSyncService.mutate({
            table: 'product_colors',
            operation: 'UPDATE',
            data: { quantity: (color.quantity || 0) + delta },
            where: [{ column: 'id', value: options.colorId }]  // ⚡ تصحيح: array format
          });
        }
      } else {
        // تحديث مخزون المنتج الرئيسي
        const product = await powerSyncService.queryOne<{ stock_quantity: number }>({
          sql: 'SELECT stock_quantity FROM products WHERE id = ?',
          params: [productId]
        });

        if (product) {
          await powerSyncService.mutate({
            table: 'products',
            operation: 'UPDATE',
            data: { stock_quantity: (product.stock_quantity || 0) + delta },
            where: [{ column: 'id', value: productId }]  // ⚡ تصحيح: array format
          });
        }
      }

      return { success: true, id: productId };
    } catch (error: any) {
      console.error(`[DeltaWrite] UpdateProductStock failed:`, error);
      return { success: false, id: productId, error: error?.message };
    }
  }

  // ========================================
  // 🛒 عمليات الطلبات
  // ========================================

  /**
   * ⚡ v4.0: إنشاء طلب مع عناصره - باستخدام Batch Operations للأداء العالي
   * تحسين من N+1 INSERT إلى 2 فقط (order + batch items)
   */
  async createOrderWithItems(
    organizationId: string,
    order: Record<string, any>,
    items: Array<Record<string, any>>
  ): Promise<WriteResult> {
    try {
      const orderId = order.id || crypto.randomUUID();
      const now = new Date().toISOString();

      // 1️⃣ إنشاء الطلب
      await powerSyncService.mutate({
        table: 'orders',
        operation: 'INSERT',
        data: {
          ...order,
          id: orderId,
          organization_id: organizationId,
          created_at: now
        }
      });

      // 2️⃣ إنشاء عناصر الطلب دفعة واحدة باستخدام Batch Operations
      if (items.length > 0) {
        const itemsData = items.map(item => ({
          ...item,
          id: item.id || crypto.randomUUID(),
          order_id: orderId,
          organization_id: organizationId,
          created_at: now
        }));

        await powerSyncService.mutateBatch({
          table: 'order_items',
          operation: 'INSERT',
          data: itemsData,
          chunkSize: 100  // معالجة حتى 100 عنصر في كل دفعة
        });
      }

      return { success: true, id: orderId };
    } catch (error: any) {
      console.error(`[DeltaWrite] CreateOrderWithItems failed:`, error);
      return { success: false, id: '', error: error?.message };
    }
  }

  // ========================================
  // 📦 Batch Operations (High Performance)
  // ========================================

  /**
   * ⚡ إنشاء سجلات متعددة دفعة واحدة
   * مثالي لاستيراد البيانات أو إنشاء طلبات متعددة
   */
  async createBatch<T extends Record<string, any>>(
    table: string,
    records: T[]
  ): Promise<{ success: boolean; count: number; errors: number }> {
    if (records.length === 0) {
      return { success: true, count: 0, errors: 0 };
    }

    const preparedRecords = records.map(record => ({
      ...record,
      id: record.id || crypto.randomUUID(),
      created_at: record.created_at || new Date().toISOString(),
    }));

    const result = await powerSyncService.mutateBatch({
      table,
      operation: 'INSERT',
      data: preparedRecords,
    });

    return {
      success: result.success,
      count: result.successCount,
      errors: result.errorCount,
    };
  }

  /**
   * ⚡ تحديث سجلات متعددة دفعة واحدة
   */
  async updateBatch<T extends Record<string, any>>(
    table: string,
    records: Array<{ id: string; updates: Partial<T> }>
  ): Promise<{ success: boolean; count: number; errors: number }> {
    if (records.length === 0) {
      return { success: true, count: 0, errors: 0 };
    }

    const preparedRecords = records.map(({ id, updates }) => ({
      id,
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    const result = await powerSyncService.mutateBatch({
      table,
      operation: 'UPSERT',
      data: preparedRecords,
      onConflict: ['id'],
    });

    return {
      success: result.success,
      count: result.successCount,
      errors: result.errorCount,
    };
  }

  /**
   * ⚡ حذف سجلات متعددة دفعة واحدة
   */
  async deleteBatch(
    table: string,
    ids: string[]
  ): Promise<{ success: boolean; count: number; errors: number }> {
    if (ids.length === 0) {
      return { success: true, count: 0, errors: 0 };
    }

    const records = ids.map(id => ({ id }));

    const result = await powerSyncService.mutateBatch({
      table,
      operation: 'DELETE',
      data: records,
    });

    return {
      success: result.success,
      count: result.successCount,
      errors: result.errorCount,
    };
  }

  /**
   * ⚡ Upsert سجلات متعددة (إدراج أو تحديث)
   */
  async upsertBatch<T extends Record<string, any>>(
    table: string,
    records: T[]
  ): Promise<{ success: boolean; count: number; errors: number }> {
    if (records.length === 0) {
      return { success: true, count: 0, errors: 0 };
    }

    const preparedRecords = records.map(record => ({
      ...record,
      id: record.id || crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    }));

    const result = await powerSyncService.mutateBatch({
      table,
      operation: 'UPSERT',
      data: preparedRecords,
      onConflict: ['id'],
    });

    return {
      success: result.success,
      count: result.successCount,
      errors: result.errorCount,
    };
  }

  // ========================================
  // 🚀 Smart Query Methods (SQL-Level Filtering)
  // ========================================

  /**
   * ⚡ البحث الذكي في المنتجات مع الألوان والمقاسات
   * يستخدم SQL JOINs بدلاً من تحميل كل البيانات للذاكرة
   */
  async searchProductsSmart(options: {
    organizationId: string;
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    isActive?: boolean;
    /** فلتر المخزون: 'all' | 'in_stock' | 'out_of_stock' */
    stockFilter?: 'all' | 'in_stock' | 'out_of_stock';
  }): Promise<{
    products: any[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    const { organizationId, search, categoryId, page = 1, limit = 50, isActive = true, stockFilter = 'all' } = options;
    const offset = (page - 1) * limit;
    const params: any[] = [organizationId];

    // بناء شروط WHERE
    let whereConditions = 'p.organization_id = ?';

    if (isActive) {
      whereConditions += ' AND (p.is_active = 1 OR p.is_active IS NULL)';
    }

    // ⚡ فلتر المخزون على مستوى SQL
    if (stockFilter === 'in_stock') {
      whereConditions += ' AND (p.stock_quantity > 0 OR p.available_weight > 0 OR p.available_length > 0 OR p.available_boxes > 0)';
    } else if (stockFilter === 'out_of_stock') {
      whereConditions += ' AND (p.stock_quantity <= 0 OR p.stock_quantity IS NULL) AND (p.available_weight <= 0 OR p.available_weight IS NULL)';
    }

    if (categoryId && categoryId.trim()) {
      whereConditions += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    if (search && search.trim().length >= 2) {
      // ⚡ تحسين الأداء: استخدام COLLATE NOCASE بدلاً من LOWER()
      // LOWER() يجبر CPU على تحويل كل سجل، بينما COLLATE NOCASE يستخدم مقارنة مباشرة
      const searchPattern = `%${search.trim()}%`;
      whereConditions += ` AND (
        p.name LIKE ? COLLATE NOCASE OR
        p.barcode LIKE ? COLLATE NOCASE OR
        p.sku LIKE ? COLLATE NOCASE OR
        p.id IN (
          SELECT DISTINCT pc.product_id FROM product_colors pc
          WHERE pc.name LIKE ? COLLATE NOCASE OR pc.barcode LIKE ? COLLATE NOCASE
        ) OR
        p.id IN (
          SELECT DISTINCT pc2.product_id FROM product_colors pc2
          INNER JOIN product_sizes ps ON ps.color_id = pc2.id
          WHERE ps.size_name LIKE ? COLLATE NOCASE OR ps.barcode LIKE ? COLLATE NOCASE
        )
      )`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // ⚡ v3.0: تحديد columns محددة بدلاً من SELECT * لتحسين الأداء
    const productsSql = `
      SELECT
        p.id, p.name, p.sku, p.barcode, p.price, p.purchase_price, p.compare_at_price,
        p.stock_quantity, p.min_stock_level, p.category_id, p.subcategory_id,
        p.description, p.thumbnail_image, p.images, p.has_variants, p.use_sizes,
        p.sell_by_weight, p.sell_by_meter, p.sell_by_box,
        p.available_weight, p.available_length, p.available_boxes,
        p.weight_unit, p.price_per_weight_unit, p.price_per_meter, p.box_price, p.units_per_box,
        p.is_active, p.organization_id, p.created_at, p.updated_at,
        lic.base64_data as thumbnail_base64
      FROM products p
      LEFT JOIN local_image_cache lic ON lic.product_id = p.id
      WHERE ${whereConditions}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    // استعلام العدد الكلي
    const countParams = params.slice(0, -2); // بدون LIMIT و OFFSET
    const countSql = `
      SELECT COUNT(*) as count FROM products p
      WHERE ${whereConditions}
    `;

    const [products, countResult] = await Promise.all([
      powerSyncService.query<any>({ sql: productsSql, params }),
      powerSyncService.queryOne<{ count: number }>({ sql: countSql, params: countParams })
    ]);

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // ⚡ DEBUG: تسجيل المنتجات التي لديها أنواع بيع متقدمة
    const advancedProducts = products.filter((p: any) =>
      p.sell_by_weight || p.sell_by_meter || p.sell_by_box
    );
    if (advancedProducts.length > 0) {
      console.log('[DeltaWriteService] 📦 منتجات بأنواع بيع متقدمة:', {
        count: advancedProducts.length,
        products: advancedProducts.map((p: any) => ({
          name: p.name,
          sell_by_weight: p.sell_by_weight,
          sell_by_meter: p.sell_by_meter,
          sell_by_box: p.sell_by_box,
          available_weight: p.available_weight,
          available_length: p.available_length,
          available_boxes: p.available_boxes,
          stock_quantity: p.stock_quantity
        }))
      });
    }

    // ⚡ DEBUG: تسجيل المنتجات التي لديها صور محلية
    const productsWithLocalImages = products.filter((p: any) => p.thumbnail_base64);
    if (productsWithLocalImages.length > 0) {
      console.log('[DeltaWriteService] 🖼️ منتجات بصور محلية للعمل Offline:', productsWithLocalImages.length);
    }

    // جلب الألوان والمقاسات للمنتجات المُرجعة فقط
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      await this.attachColorsAndSizesToProducts(products, productIds);
    }

    return { products, totalCount, page, totalPages };
  }

  /**
   * ⚡ جلب الألوان والمقاسات وإرفاقها بالمنتجات
   * استعلام واحد فقط بدلاً من N+2 استعلامات
   */
  private async attachColorsAndSizesToProducts(products: any[], productIds: string[]): Promise<void> {
    if (!productIds.length) return;

    const placeholders = productIds.map(() => '?').join(',');

    // ⚡ v3.0: تحديد columns محددة بدلاً من SELECT * لتحسين الأداء
    const [allColors, allSizes, allWholesaleTiers] = await Promise.all([
      powerSyncService.query<any>({
        sql: `SELECT id, product_id, name, color_code, quantity, barcode, price, purchase_price, image_url
              FROM product_colors WHERE product_id IN (${placeholders})`,
        params: productIds
      }),
      powerSyncService.query<any>({
        sql: `SELECT ps.id, ps.color_id, ps.size_name, ps.quantity, ps.barcode, ps.price, ps.purchase_price
              FROM product_sizes ps
              INNER JOIN product_colors pc ON ps.color_id = pc.id
              WHERE pc.product_id IN (${placeholders})`,
        params: productIds
      }),
      // ⚡ جلب مستويات أسعار الجملة من product_wholesale_tiers
      powerSyncService.query<any>({
        sql: `SELECT id, product_id, min_quantity, price_per_unit
              FROM product_wholesale_tiers WHERE product_id IN (${placeholders}) ORDER BY min_quantity ASC`,
        params: productIds
      })
    ]);

    // تجميع المقاسات حسب color_id
    const sizesMap = new Map<string, any[]>();
    for (const size of allSizes) {
      if (!sizesMap.has(size.color_id)) {
        sizesMap.set(size.color_id, []);
      }
      sizesMap.get(size.color_id)!.push(size);
    }

    // تجميع الألوان حسب product_id مع إضافة المقاسات
    const colorsMap = new Map<string, any[]>();
    for (const color of allColors) {
      color.sizes = sizesMap.get(color.id) || [];
      color.product_sizes = color.sizes;

      if (!colorsMap.has(color.product_id)) {
        colorsMap.set(color.product_id, []);
      }
      colorsMap.get(color.product_id)!.push(color);
    }

    // ⚡ تجميع مستويات أسعار الجملة حسب product_id
    const wholesaleTiersMap = new Map<string, any[]>();
    for (const tier of allWholesaleTiers) {
      if (!wholesaleTiersMap.has(tier.product_id)) {
        wholesaleTiersMap.set(tier.product_id, []);
      }
      wholesaleTiersMap.get(tier.product_id)!.push({
        id: tier.id,
        min_quantity: tier.min_quantity,
        price_per_unit: tier.price_per_unit,
      });
    }

    // إرفاق الألوان ومستويات الأسعار بالمنتجات
    for (const product of products) {
      const colors = colorsMap.get(product.id) || [];
      product.colors = colors;
      product.product_colors = colors;
      product.variants = colors;

      // ⚡ إرفاق مستويات أسعار الجملة
      const tiers = wholesaleTiersMap.get(product.id) || [];
      product.wholesale_tiers = tiers;

      // Debug: تسجيل المنتجات التي لديها مستويات أسعار
      if (tiers.length > 0) {
        console.log(`[DeltaWriteService] 💰 Product ${product.name} has ${tiers.length} wholesale tiers`);
      }
    }
  }

  /**
   * ⚡ جلب الطلبات مع فلترة SQL
   */
  async getOrdersSmart(options: {
    organizationId: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    orders: any[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    const {
      organizationId, status, paymentStatus,
      dateFrom, dateTo, customerId,
      page = 1, limit = 50
    } = options;
    const offset = (page - 1) * limit;
    const params: any[] = [organizationId];

    let whereConditions = 'organization_id = ?';

    if (status) {
      whereConditions += ' AND status = ?';
      params.push(status);
    }

    if (paymentStatus) {
      whereConditions += ' AND payment_status = ?';
      params.push(paymentStatus);
    }

    if (customerId) {
      whereConditions += ' AND customer_id = ?';
      params.push(customerId);
    }

    if (dateFrom) {
      whereConditions += ' AND created_at >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions += ' AND created_at <= ?';
      params.push(dateTo);
    }

    const ordersSql = `
      SELECT * FROM orders
      WHERE ${whereConditions}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const countParams = params.slice(0, -2);
    const countSql = `
      SELECT COUNT(*) as count FROM orders
      WHERE ${whereConditions}
    `;

    const [orders, countResult] = await Promise.all([
      powerSyncService.query<any>({ sql: ordersSql, params }),
      powerSyncService.queryOne<{ count: number }>({ sql: countSql, params: countParams })
    ]);

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { orders, totalCount, page, totalPages };
  }

  /**
   * ⚡ إحصائيات سريعة للمنتجات (SQL-level aggregation)
   */
  async getProductStats(organizationId: string): Promise<{
    totalProducts: number;
    outOfStock: number;
    totalStock: number;
  }> {
    const result = await powerSyncService.queryOne<{
      total: number;
      out_of_stock: number;
      total_stock: number;
    }>({
      sql: `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN (stock_quantity <= 0 OR stock_quantity IS NULL) THEN 1 ELSE 0 END) as out_of_stock,
          COALESCE(SUM(stock_quantity), 0) as total_stock
        FROM products
        WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)
      `,
      params: [organizationId]
    });

    return {
      totalProducts: result?.total || 0,
      outOfStock: result?.out_of_stock || 0,
      totalStock: result?.total_stock || 0
    };
  }

  /**
   * ⚡ إحصائيات سريعة للطلبات
   */
  async getOrderStats(organizationId: string): Promise<{
    totalOrders: number;
    todayOrders: number;
    totalSales: number;
    todaySales: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const result = await powerSyncService.queryOne<{
      total_orders: number;
      today_orders: number;
      total_sales: number;
      today_sales: number;
    }>({
      sql: `
        SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today_orders,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(CASE WHEN created_at >= ? THEN total ELSE 0 END), 0) as today_sales
        FROM orders
        WHERE organization_id = ?
      `,
      params: [todayISO, todayISO, organizationId]
    });

    return {
      totalOrders: result?.total_orders || 0,
      todayOrders: result?.today_orders || 0,
      totalSales: result?.total_sales || 0,
      todaySales: result?.today_sales || 0
    };
  }

  /**
   * ⚡ البحث بالباركود - استعلام واحد مُحسّن + دعم الصور المحلية Offline
   */
  async findByBarcode(
    organizationId: string,
    barcode: string
  ): Promise<{ product: any; color?: any; size?: any } | null> {
    if (!barcode?.trim()) return null;

    // ⚡ v3.0: البحث في المنتج الرئيسي مع الصورة المحلية - columns محددة
    const product = await powerSyncService.queryOne<any>({
      sql: `
        SELECT
          p.id, p.name, p.sku, p.barcode, p.price, p.purchase_price, p.compare_at_price,
          p.stock_quantity, p.category_id, p.thumbnail_image, p.images, p.has_variants, p.use_sizes,
          p.sell_by_weight, p.sell_by_meter, p.sell_by_box,
          p.available_weight, p.available_length, p.available_boxes,
          p.weight_unit, p.price_per_weight_unit, p.price_per_meter, p.box_price, p.units_per_box,
          p.is_active, p.organization_id,
          lic.base64_data as thumbnail_base64
        FROM products p
        LEFT JOIN local_image_cache lic ON lic.product_id = p.id
        WHERE p.organization_id = ? AND p.barcode = ?
        LIMIT 1
      `,
      params: [organizationId, barcode]
    });

    if (product) {
      await this.attachColorsAndSizesToProducts([product], [product.id]);
      return { product };
    }

    // ⚡ v3.0: البحث في الألوان - columns محددة
    const colorResult = await powerSyncService.queryOne<any>({
      sql: `
        SELECT pc.id, pc.product_id, pc.name, pc.color_code, pc.quantity, pc.barcode, pc.price, pc.purchase_price
        FROM product_colors pc
        INNER JOIN products p ON pc.product_id = p.id
        WHERE p.organization_id = ? AND pc.barcode = ?
        LIMIT 1
      `,
      params: [organizationId, barcode]
    });

    if (colorResult) {
      // ⚡ v3.0: جلب المنتج مع الصورة المحلية - columns محددة
      const productData = await powerSyncService.queryOne<any>({
        sql: `
          SELECT p.id, p.name, p.sku, p.barcode, p.price, p.purchase_price, p.compare_at_price,
                 p.stock_quantity, p.min_stock_level, p.category_id, p.subcategory_id,
                 p.description, p.thumbnail_image, p.images, p.has_variants, p.use_sizes,
                 p.sell_by_weight, p.sell_by_meter, p.sell_by_box,
                 p.available_weight, p.available_length, p.available_boxes,
                 p.weight_unit, p.price_per_weight_unit, p.price_per_meter, p.box_price, p.units_per_box,
                 p.is_active, p.organization_id, p.created_at, p.updated_at,
                 lic.base64_data as thumbnail_base64
          FROM products p
          LEFT JOIN local_image_cache lic ON lic.product_id = p.id
          WHERE p.id = ?
        `,
        params: [colorResult.product_id]
      });
      if (productData) {
        await this.attachColorsAndSizesToProducts([productData], [productData.id]);
        const color = productData.colors?.find((c: any) => c.id === colorResult.id);
        return { product: productData, color };
      }
    }

    // ⚡ v3.0: البحث في المقاسات - columns محددة
    const sizeResult = await powerSyncService.queryOne<any>({
      sql: `
        SELECT ps.id, ps.color_id, ps.name, ps.quantity, ps.barcode, ps.price, ps.purchase_price,
               pc.product_id, pc.id as color_id
        FROM product_sizes ps
        INNER JOIN product_colors pc ON ps.color_id = pc.id
        INNER JOIN products p ON pc.product_id = p.id
        WHERE p.organization_id = ? AND ps.barcode = ?
        LIMIT 1
      `,
      params: [organizationId, barcode]
    });

    if (sizeResult) {
      // ⚡ v3.0: جلب المنتج مع الصورة المحلية - columns محددة
      const productData = await powerSyncService.queryOne<any>({
        sql: `
          SELECT p.id, p.name, p.sku, p.barcode, p.price, p.purchase_price, p.compare_at_price,
                 p.stock_quantity, p.min_stock_level, p.category_id, p.subcategory_id,
                 p.description, p.thumbnail_image, p.images, p.has_variants, p.use_sizes,
                 p.sell_by_weight, p.sell_by_meter, p.sell_by_box,
                 p.available_weight, p.available_length, p.available_boxes,
                 p.weight_unit, p.price_per_weight_unit, p.price_per_meter, p.box_price, p.units_per_box,
                 p.is_active, p.organization_id, p.created_at, p.updated_at,
                 lic.base64_data as thumbnail_base64
          FROM products p
          LEFT JOIN local_image_cache lic ON lic.product_id = p.id
          WHERE p.id = ?
        `,
        params: [sizeResult.product_id]
      });
      if (productData) {
        await this.attachColorsAndSizesToProducts([productData], [productData.id]);
        const color = productData.colors?.find((c: any) => c.id === sizeResult.color_id);
        const size = color?.sizes?.find((s: any) => s.id === sizeResult.id);
        return { product: productData, color, size };
      }
    }

    return null;
  }

  // ========================================
  // ⚡ دوال مختصرة لتحسين الذاكرة
  // ========================================

  /**
   * ⚡ جلب سجلات مع تحديد الحد الأقصى - مختصر لتجنب تحميل كل البيانات
   * يستخدم SQL LIMIT مباشرة بدلاً من slice() في الذاكرة
   */
  async getWithLimit<T>(
    table: string,
    organizationId: string,
    limit: number,
    orderBy: string = 'created_at DESC'
  ): Promise<T[]> {
    return this.getAll<T>(table, organizationId, {
      limit,
      orderBy
    });
  }

  // ========================================
  // 🔧 Helper Methods
  // ========================================

  /**
   * ⚡ تحويل البيانات لـ PowerSync Schema
   * ⚠️ لا نحول price إلى selling_price - العمود الصحيح هو price
   */
  private mapDataForPowerSync(table: string, data: Record<string, any>): Record<string, any> {
    const mapped = { ...data };

    if (table === 'products') {
      // ⚡ إزالة selling_price إذا وُجد - العمود الصحيح هو price
      if ('selling_price' in mapped && !('price' in mapped)) {
        mapped.price = mapped.selling_price;
        delete mapped.selling_price;
      } else if ('selling_price' in mapped) {
        delete mapped.selling_price;
      }

      // تحويل category إلى category_id
      if ('category' in mapped && !('category_id' in mapped)) {
        if (typeof mapped.category === 'object' && mapped.category !== null) {
          mapped.category_id = mapped.category.id;
        } else {
          mapped.category_id = mapped.category;
        }
        delete mapped.category;
      }

      // ⚡ إزالة الحقول غير الموجودة في PowerSync Schema
      const invalidFields = ['synced', 'syncStatus', 'pendingOperation', 'product_colors', 'product_sizes', 'product_images'];
      invalidFields.forEach(field => {
        if (field in mapped) {
          delete mapped[field];
        }
      });

      // تحويل boolean إلى integer
      const booleanFields = [
        'is_active', 'is_featured', 'has_variants',
        'sell_by_weight', 'sell_by_meter', 'sell_by_box',
        'track_expiry', 'track_serial_numbers', 'track_batches', 'has_warranty',
        'allow_retail', 'allow_wholesale', 'allow_partial_wholesale',
        'is_digital', 'is_new', 'show_price_on_landing', 'use_sizes', 'use_variant_prices',
        'allow_single_unit_sale', 'is_sold_by_unit', 'require_serial_on_sale', 'use_fifo',
        'tax_included', 'has_fast_shipping', 'has_money_back', 'has_quality_guarantee',
        'requires_prescription', 'is_vegetarian', 'is_vegan', 'is_gluten_free'
      ];

      booleanFields.forEach(field => {
        if (typeof mapped[field] === 'boolean') {
          mapped[field] = mapped[field] ? 1 : 0;
        }
      });

      // تحويل JSON fields إلى strings
      const jsonFields = ['images', 'features', 'specifications', 'allergens', 'compatible_models', 'dimensions',
        'purchase_page_config', 'special_offers_config', 'advanced_description'];
      jsonFields.forEach(field => {
        if (field in mapped && typeof mapped[field] === 'object' && mapped[field] !== null) {
          try {
            mapped[field] = JSON.stringify(mapped[field]);
          } catch {
            mapped[field] = null;
          }
        }
      });
    }

    // ⚡ إزالة synced من جميع الجداول
    if ('synced' in mapped) {
      delete mapped.synced;
    }
    if ('syncStatus' in mapped) {
      delete mapped.syncStatus;
    }
    if ('pendingOperation' in mapped) {
      delete mapped.pendingOperation;
    }

    return mapped;
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const deltaWriteService = new DeltaWriteServiceClass();
export default deltaWriteService;

// Re-export types for compatibility
export type {
  LocalOrder,
  LocalOrderItem,
  CreateOrderInput,
  CreateOrderItemInput,
} from '@/lib/types/entities/order';

export type {
  LocalProduct,
} from '@/lib/types/entities/product';

export type {
  LocalCustomer,
} from '@/lib/types/entities/customer';

export type EntityType = string;
