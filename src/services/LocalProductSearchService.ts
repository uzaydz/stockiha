/**
 * ⚡ LocalProductSearchService - v3.0 (PowerSync Best Practices 2025)
 * ====================================================================
 *
 * خدمة البحث المحلي عن المنتجات - محسّنة بالكامل:
 * - البحث بالباركود Offline-First
 * - Pagination محلية سريعة
 * - إثراء المنتجات بالألوان والمقاسات
 *
 * ✅ يستخدم powerSyncService.query() بدل db.getAll()
 * ✅ يستخدم powerSyncService.queryOne() بدل db.get()
 * ✅ كود نظيف وبسيط بدون تعقيدات
 */

import { powerSyncService } from '@/lib/powersync';
import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

import type {
  LocalProduct,
  LocalProductColor,
  LocalProductSize,
  BarcodeSearchResult,
  PaginatedProductsResult
} from '@/types/localProduct';

export type {
  LocalProduct,
  LocalProductColor,
  LocalProductSize,
  BarcodeSearchResult,
  PaginatedProductsResult
};

// =====================================================
// LocalProductSearchService
// =====================================================

class LocalProductSearchServiceClass {

  // ========================================
  // 🔍 البحث بالباركود
  // ========================================

  /**
   * ⚡ البحث بالباركود - Offline-First
   */
  async searchByBarcode(
    organizationId: string,
    barcode: string
  ): Promise<BarcodeSearchResult | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    console.log(`[LocalSearch] 🔍 بحث باركود: ${cleanBarcode}`);

    // 1. البحث في المنتجات الرئيسية
    const product = await powerSyncService.queryOne<LocalProduct>({
      sql: `SELECT * FROM products WHERE organization_id = ? AND barcode = ? LIMIT 1`,
      params: [organizationId, cleanBarcode]
    });

    if (product) {
      console.log(`[LocalSearch] ✅ وُجد (منتج): ${product.name}`);
      return this.formatBarcodeResult(product, 'main_product', cleanBarcode);
    }

    // 2. البحث في الألوان
    const color = await powerSyncService.queryOne<any>({
      sql: `SELECT pc.*, p.name as product_name, p.price, p.category_id, p.id as main_product_id
            FROM product_colors pc
            JOIN products p ON pc.product_id = p.id
            WHERE p.organization_id = ? AND pc.barcode = ?
            LIMIT 1`,
      params: [organizationId, cleanBarcode]
    });

    if (color) {
      console.log(`[LocalSearch] ✅ وُجد (لون): ${color.product_name} - ${color.name}`);
      return {
        id: color.main_product_id,
        name: `${color.product_name} - ${color.name}`,
        price: color.price,
        barcode: cleanBarcode,
        stock_quantity: color.quantity || 0,
        actual_stock_quantity: color.quantity || 0,
        type: 'color_variant',
        found_in: 'local',
        category_id: color.category_id,
        variant_info: {
          color_id: color.id,
          color_name: color.name,
          color_code: color.color_code
        }
      };
    }

    // 3. البحث في المقاسات
    const size = await powerSyncService.queryOne<any>({
      sql: `SELECT ps.*, pc.name as color_name, pc.color_code, pc.id as color_id,
                   p.name as product_name, p.price, p.category_id, p.id as main_product_id
            FROM product_sizes ps
            JOIN product_colors pc ON ps.color_id = pc.id
            JOIN products p ON ps.product_id = p.id
            WHERE p.organization_id = ? AND ps.barcode = ?
            LIMIT 1`,
      params: [organizationId, cleanBarcode]
    });

    if (size) {
      console.log(`[LocalSearch] ✅ وُجد (مقاس): ${size.product_name} - ${size.color_name} - ${size.size_name}`);
      return {
        id: size.main_product_id,
        name: `${size.product_name} - ${size.color_name} - ${size.size_name}`,
        price: size.price,
        barcode: cleanBarcode,
        stock_quantity: size.quantity || 0,
        actual_stock_quantity: size.quantity || 0,
        type: 'size_variant',
        found_in: 'local',
        category_id: size.category_id,
        variant_info: {
          color_id: size.color_id,
          color_name: size.color_name,
          color_code: size.color_code,
          size_id: size.id,
          size_name: size.size_name
        }
      };
    }

    // 4. Fallback للسيرفر (إذا متصل)
    if (navigator.onLine) {
      console.log(`[LocalSearch] 🌐 بحث في السيرفر...`);
      return this.searchBarcodeOnServer(organizationId, cleanBarcode);
    }

    console.log(`[LocalSearch] ❌ لم يُوجد`);
    return null;
  }

  private formatBarcodeResult(product: LocalProduct, type: string, barcode: string): BarcodeSearchResult {
    return {
      id: product.id,
      name: product.name,
      price: product.price || 0,
      barcode,
      stock_quantity: product.stock_quantity || 0,
      actual_stock_quantity: product.stock_quantity || 0,
      type: type as any,
      found_in: 'local',
      category_id: product.category_id,
      thumbnail_image: product.thumbnail_image,
      wholesale_price: product.wholesale_price
    };
  }

  private async searchBarcodeOnServer(
    organizationId: string,
    barcode: string
  ): Promise<BarcodeSearchResult | null> {
    try {
      const { data, error } = await supabase.rpc('search_product_by_barcode' as any, {
        p_organization_id: organizationId,
        p_barcode: barcode
      });

      if (error || !data?.success || !data.data) return null;

      return { ...data.data, found_in: 'server' };
    } catch {
      return null;
    }
  }

  // ========================================
  // 📦 جلب المنتجات مع Pagination
  // ========================================

  /**
   * ⚡ جلب المنتجات مع Pagination
   */
  async getProductsPaginated(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      stockFilter?: 'all' | 'in_stock' | 'out_of_stock';
    } = {}
  ): Promise<PaginatedProductsResult> {
    const { page = 1, limit = 30, search = '', categoryId = '', stockFilter = 'all' } = options;
    const offset = (page - 1) * limit;

    // ✅ تحقق سريع من جاهزية PowerSync (بدون انتظار طويل)
    // فقط تحقق إذا كان جاهزاً، وإلا أكمل - لأن الاستعلامات قد تنجح حتى لو لم يكتمل الـ sync
    const isReady = powerSyncService.isReady();
    if (!isReady) {
      // انتظار قصير فقط (2 ثانية) - إذا لم يكن جاهزاً، نكمل على أي حال
      try {
        await powerSyncService.waitForInitialization(2000);
      } catch {
        console.warn('[LocalSearch] ⚠️ PowerSync not fully ready, continuing anyway...');
      }
    }

    // بناء الشروط
    let whereClause = 'organization_id = ?';
    const params: any[] = [organizationId];

    if (search.trim()) {
      whereClause += ' AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (categoryId && categoryId !== 'all') {
      whereClause += ' AND category_id = ?';
      params.push(categoryId);
    }

    if (stockFilter === 'in_stock') {
      whereClause += ' AND stock_quantity > 0';
    } else if (stockFilter === 'out_of_stock') {
      whereClause += ' AND stock_quantity <= 0';
    }

    // ✅ v3.0: استخدام count() و query()
    const total = await powerSyncService.count('products', whereClause, params);

    const products = await powerSyncService.query<LocalProduct>({
      sql: `SELECT * FROM products WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params: [...params, limit, offset]
    });

    // إثراء المنتجات بالألوان والمقاسات
    const enrichedProducts = await this.enrichProductsWithVariants(products);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    console.log(`[LocalSearch] 📦 ${products.length}/${total} منتج`);

    // ⚠️ في بعض الحالات النادرة يعود count = 0 بينما توجد بيانات محلياً (فارق توقيت/تهيئة)
    // لذلك نضيف Fallback مباشر على قاعدة البيانات لتجنب بقاء الواجهة بلا بيانات بعد التحديث.
    if (total === 0 && products.length === 0 && powerSyncService.db) {
      try {
        const directCountRow = await powerSyncService.queryOne<{ count: number }>({
          sql: 'SELECT COUNT(*) as count FROM products WHERE organization_id = ?',
          params: [organizationId]
        });
        const directCount = directCountRow?.count || 0;

        if (directCount > 0) {
          const directProducts = await powerSyncService.query<LocalProduct>({
            sql: 'SELECT * FROM products WHERE organization_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            params: [organizationId, limit, offset]
          });

          const enrichedDirect = await this.enrichProductsWithVariants(directProducts);
          const directTotalPages = Math.max(1, Math.ceil(directCount / limit));

          console.warn('[LocalSearch] ⚠️ Fallback fetch used (reactive count mismatch).');
          return {
            products: enrichedDirect,
            pagination: {
              current_page: page,
              total_pages: directTotalPages,
              total_count: directCount,
              per_page: limit,
              has_next_page: page < directTotalPages,
              has_prev_page: page > 1
            },
            source: 'local'
          };
        }
      } catch (fallbackError) {
        console.warn('[LocalSearch] Fallback query failed:', fallbackError);
      }
    }

    return {
      products: enrichedProducts,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: total,
        per_page: limit,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      },
      source: 'local'
    };
  }

  // ========================================
  // 🎨 إثراء المنتجات بالألوان والمقاسات
  // ========================================

  /**
   * ⚡ إثراء المنتجات بالألوان والمقاسات
   */
  private async enrichProductsWithVariants(products: LocalProduct[]): Promise<any[]> {
    if (products.length === 0) return [];

    const productIds = products.map(p => p.id);
    const placeholders = productIds.map(() => '?').join(',');

    // جلب الألوان
    const colors = await powerSyncService.query<LocalProductColor>({
      sql: `SELECT * FROM product_colors WHERE product_id IN (${placeholders}) ORDER BY name`,
      params: productIds
    });

    // جلب المقاسات
    let sizes: LocalProductSize[] = [];
    if (colors.length > 0) {
      const colorIds = colors.map(c => c.id);
      const colorPlaceholders = colorIds.map(() => '?').join(',');

      sizes = await powerSyncService.query<LocalProductSize>({
        sql: `SELECT * FROM product_sizes WHERE color_id IN (${colorPlaceholders}) ORDER BY size_name`,
        params: colorIds
      });
    }

    // تجميع المقاسات حسب اللون
    const sizesMap = new Map<string, any[]>();
    for (const size of sizes) {
      if (!sizesMap.has(size.color_id)) {
        sizesMap.set(size.color_id, []);
      }
      sizesMap.get(size.color_id)!.push({
        id: size.id,
        size_name: size.size_name,
        name: size.size_name,
        quantity: size.quantity || 0,
        price: size.price,
        barcode: size.barcode
      });
    }

    // تجميع الألوان حسب المنتج
    const colorsMap = new Map<string, any[]>();
    for (const color of colors) {
      if (!colorsMap.has(color.product_id)) {
        colorsMap.set(color.product_id, []);
      }
      const colorSizes = sizesMap.get(color.id) || [];
      colorsMap.get(color.product_id)!.push({
        id: color.id,
        name: color.name,
        color_code: color.color_code || '#000000',
        quantity: color.quantity || 0,
        barcode: color.barcode,
        has_sizes: colorSizes.length > 0,
        sizes: colorSizes,
        product_sizes: colorSizes
      });
    }

    // إضافة الألوان للمنتجات
    return products.map(product => ({
      ...product,
      colors: colorsMap.get(product.id) || [],
      product_colors: colorsMap.get(product.id) || [],
      has_variants: (colorsMap.get(product.id)?.length || 0) > 0
    }));
  }

  // ========================================
  // 🔎 البحث السريع
  // ========================================

  /**
   * ⚡ البحث السريع
   */
  async quickSearch(
    organizationId: string,
    searchTerm: string,
    limit: number = 10
  ): Promise<LocalProduct[]> {
    if (!searchTerm.trim()) return [];

    const term = `%${searchTerm.trim()}%`;

    return powerSyncService.query<LocalProduct>({
      sql: `SELECT * FROM products
            WHERE organization_id = ?
            AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ?)
            ORDER BY
              CASE WHEN barcode = ? THEN 1 WHEN name LIKE ? THEN 2 ELSE 3 END,
              name ASC
            LIMIT ?`,
      params: [organizationId, term, term, term, searchTerm.trim(), `${searchTerm.trim()}%`, limit]
    });
  }

  // ========================================
  // 📊 إحصائيات
  // ========================================

  /**
   * ⚡ عدد المنتجات المحلية
   */
  async getLocalProductsCount(organizationId: string): Promise<number> {
    return powerSyncService.count('products', 'organization_id = ?', [organizationId]);
  }

  /**
   * ⚡ التحقق من وجود بيانات محلية
   */
  async hasLocalData(organizationId: string): Promise<boolean> {
    const count = await this.getLocalProductsCount(organizationId);
    return count > 0;
  }

  // ========================================
  // 🛠️ إصلاح المنتجات غير النشطة بالخطأ
  // ========================================

  /**
   * ⚡ إصلاح المنتجات التي تم وضعها كـ inactive بالخطأ (مرة واحدة عند الإقلاع)
   * - يعيد تفعيل كل منتج بـ is_active = 0 أو NULL لنفس المؤسسة
   */
  async fixInactiveProducts(
    organizationId: string
  ): Promise<{ fixed: number; totalInactive: number }> {
    try {
      const inactiveProducts = await powerSyncService.query<{ id: string }>({
        sql: `SELECT id FROM products WHERE organization_id = ? AND (is_active IS NULL OR is_active = 0)`,
        params: [organizationId]
      });

      const totalInactive = inactiveProducts.length;
      if (totalInactive === 0) {
        console.log('[LocalSearch] ✅ لا توجد منتجات غير نشطة لإصلاحها');
        return { fixed: 0, totalInactive };
      }

      const placeholders = inactiveProducts.map(() => '?').join(',');
      const ids = inactiveProducts.map(p => p.id);

      await powerSyncService.execute(
        `UPDATE products SET is_active = 1 WHERE id IN (${placeholders})`,
        ids
      );

      console.log(`[LocalSearch] 🔧 تم إصلاح ${totalInactive} منتج غير نشط`);
      return { fixed: totalInactive, totalInactive };
    } catch (error) {
      console.error('[LocalSearch] ❌ فشل إصلاح المنتجات غير النشطة', error);
      return { fixed: 0, totalInactive: 0 };
    }
  }

  // ========================================
  // 📦 جلب منتج واحد مع التفاصيل
  // ========================================

  /**
   * ⚡ جلب منتج كامل مع الألوان والمقاسات
   */
  async getFullProductWithVariants(productId: string): Promise<any | null> {
    const product = await powerSyncService.queryOne<LocalProduct>({
      sql: 'SELECT * FROM products WHERE id = ?',
      params: [productId]
    });

    if (!product) return null;

    const colors = await powerSyncService.query<LocalProductColor>({
      sql: 'SELECT * FROM product_colors WHERE product_id = ? ORDER BY name',
      params: [productId]
    });

    if (colors.length > 0) {
      const colorIds = colors.map(c => c.id);
      const placeholders = colorIds.map(() => '?').join(',');

      const sizes = await powerSyncService.query<LocalProductSize>({
        sql: `SELECT * FROM product_sizes WHERE color_id IN (${placeholders}) ORDER BY size_name`,
        params: colorIds
      });

      const sizesMap = new Map<string, any[]>();
      for (const size of sizes) {
        if (!sizesMap.has(size.color_id)) {
          sizesMap.set(size.color_id, []);
        }
        sizesMap.get(size.color_id)!.push({
          id: size.id,
          name: size.size_name,
          quantity: size.quantity,
          barcode: size.barcode
        });
      }

      (product as any).colors = colors.map(color => ({
        id: color.id,
        name: color.name,
        color_code: color.color_code,
        quantity: color.quantity,
        barcode: color.barcode,
        has_sizes: sizesMap.has(color.id),
        sizes: sizesMap.get(color.id) || []
      }));
    } else {
      (product as any).colors = [];
    }

    return product;
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const localProductSearchService = new LocalProductSearchServiceClass();
export default localProductSearchService;
