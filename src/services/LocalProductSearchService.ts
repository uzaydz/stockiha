/**
 * LocalProductSearchService - خدمة البحث المحلي عن المنتجات
 * 
 * ⚡ تحسينات الأداء:
 * - البحث في SQLite مباشرة (O(1) للباركود مع index)
 * - لا حاجة لتحميل كل المنتجات في الذاكرة
 * - Pagination محلية بدون استدعاء السيرفر
 * - Fallback للسيرفر فقط عند عدم وجود البيانات محلياً
 */

import { sqliteWriteQueue } from '@/lib/sync/delta/SQLiteWriteQueue';
import { isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  sku?: string;
  stock_quantity: number;
  actual_stock_quantity?: number;
  has_variants: boolean;
  category_id?: string;
  category_name?: string;
  thumbnail_image?: string;
  thumbnail_base64?: string;
  wholesale_price?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  organization_id: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LocalProductColor {
  id: string;
  product_id: string;
  name: string;
  color_code?: string;
  quantity: number;
  barcode?: string;
}

export interface LocalProductSize {
  id: string;
  product_id: string;
  color_id: string;
  size_name: string;
  quantity: number;
  barcode?: string;
}

export interface BarcodeSearchResult {
  id: string;
  name: string;
  price: number;
  barcode: string;
  stock_quantity: number;
  actual_stock_quantity: number;
  type: 'main_product' | 'color_variant' | 'size_variant';
  found_in: 'local' | 'server';
  variant_info?: {
    color_id?: string;
    color_name?: string;
    color_code?: string;
    size_id?: string;
    size_name?: string;
  };
  thumbnail_image?: string;
  category_id?: string;
  wholesale_price?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  // المنتج الكامل للإضافة للسلة
  fullProduct?: any;
}

export interface PaginatedProductsResult {
  products: LocalProduct[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  source: 'local' | 'server';
}

// =====================================================
// LocalProductSearchService
// =====================================================

class LocalProductSearchServiceClass {
  private initialized = false;
  private barcodeIndexBuilt = false;

  /**
   * ⚡ البحث بالباركود - محلي أولاً
   */
  async searchByBarcode(
    organizationId: string,
    barcode: string
  ): Promise<BarcodeSearchResult | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    console.log(`[LocalSearch] 🔍 البحث عن باركود: ${cleanBarcode}`);

    // ⚡ تعيين organizationId في sqliteWriteQueue لضمان تهيئة DB في Tauri
    if (organizationId) {
      sqliteWriteQueue.setOrganizationId(organizationId);
    }

    // 1. البحث في SQLite أولاً
    if (isSQLiteAvailable()) {
      const localResult = await this.searchBarcodeInSQLite(organizationId, cleanBarcode);
      if (localResult) {
        console.log(`[LocalSearch] ✅ وُجد محلياً: ${localResult.name}`);
        return localResult;
      }
    }

    // 2. Fallback للسيرفر
    console.log(`[LocalSearch] 🌐 لم يُوجد محلياً، البحث في السيرفر...`);
    return this.searchBarcodeOnServer(organizationId, cleanBarcode);
  }

  /**
   * ⚡ البحث في SQLite
   */
  private async searchBarcodeInSQLite(
    organizationId: string,
    barcode: string
  ): Promise<BarcodeSearchResult | null> {
    try {
      // 1. البحث في المنتجات الرئيسية
      const productSql = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.organization_id = ? 
          AND p.barcode = ?
          AND (p.is_active = 1 OR p.is_active IS NULL)
        LIMIT 1
      `;
      
      const products = await sqliteWriteQueue.read<LocalProduct[]>(productSql, [organizationId, barcode]);
      
      if (products.length > 0) {
        const product = products[0];
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          barcode: barcode,
          stock_quantity: product.stock_quantity || 0,
          actual_stock_quantity: product.actual_stock_quantity || product.stock_quantity || 0,
          type: 'main_product',
          found_in: 'local',
          thumbnail_image: product.thumbnail_image || product.thumbnail_base64,
          category_id: product.category_id,
          wholesale_price: product.wholesale_price,
          allow_retail: product.allow_retail !== false,
          allow_wholesale: product.allow_wholesale !== false,
          fullProduct: await this.getFullProductWithVariants(product.id)
        };
      }

      // 2. البحث في الألوان
      const colorSql = `
        SELECT pc.*, p.name as product_name, p.price, p.thumbnail_image, p.thumbnail_base64,
               p.category_id, p.wholesale_price, p.allow_retail, p.allow_wholesale, p.id as main_product_id
        FROM product_colors pc
        JOIN products p ON pc.product_id = p.id
        WHERE p.organization_id = ?
          AND pc.barcode = ?
          AND (p.is_active = 1 OR p.is_active IS NULL)
        LIMIT 1
      `;
      
      const colors = await sqliteWriteQueue.read<any[]>(colorSql, [organizationId, barcode]);
      
      if (colors.length > 0) {
        const color = colors[0];
        return {
          id: color.main_product_id,
          name: `${color.product_name} - ${color.name}`,
          price: color.price,
          barcode: barcode,
          stock_quantity: color.quantity || 0,
          actual_stock_quantity: color.quantity || 0,
          type: 'color_variant',
          found_in: 'local',
          variant_info: {
            color_id: color.id,
            color_name: color.name,
            color_code: color.color_code
          },
          thumbnail_image: color.thumbnail_image || color.thumbnail_base64,
          category_id: color.category_id,
          wholesale_price: color.wholesale_price,
          allow_retail: color.allow_retail !== false,
          allow_wholesale: color.allow_wholesale !== false,
          fullProduct: await this.getFullProductWithVariants(color.main_product_id)
        };
      }

      // 3. البحث في المقاسات
      const sizeSql = `
        SELECT ps.*, pc.name as color_name, pc.color_code, pc.id as color_id,
               p.name as product_name, p.price, p.thumbnail_image, p.thumbnail_base64,
               p.category_id, p.wholesale_price, p.allow_retail, p.allow_wholesale, p.id as main_product_id
        FROM product_sizes ps
        JOIN product_colors pc ON ps.color_id = pc.id
        JOIN products p ON ps.product_id = p.id
        WHERE p.organization_id = ?
          AND ps.barcode = ?
          AND (p.is_active = 1 OR p.is_active IS NULL)
        LIMIT 1
      `;
      
      const sizes = await sqliteWriteQueue.read<any[]>(sizeSql, [organizationId, barcode]);
      
      if (sizes.length > 0) {
        const size = sizes[0];
        return {
          id: size.main_product_id,
          name: `${size.product_name} - ${size.color_name} - ${size.size_name}`,
          price: size.price,
          barcode: barcode,
          stock_quantity: size.quantity || 0,
          actual_stock_quantity: size.quantity || 0,
          type: 'size_variant',
          found_in: 'local',
          variant_info: {
            color_id: size.color_id,
            color_name: size.color_name,
            color_code: size.color_code,
            size_id: size.id,
            size_name: size.size_name
          },
          thumbnail_image: size.thumbnail_image || size.thumbnail_base64,
          category_id: size.category_id,
          wholesale_price: size.wholesale_price,
          allow_retail: size.allow_retail !== false,
          allow_wholesale: size.allow_wholesale !== false,
          fullProduct: await this.getFullProductWithVariants(size.main_product_id)
        };
      }

      return null;
    } catch (error) {
      console.error('[LocalSearch] خطأ في البحث المحلي:', error);
      return null;
    }
  }

  /**
   * ⚡ جلب المنتج الكامل مع الألوان والمقاسات
   */
  async getFullProductWithVariants(productId: string): Promise<any | null> {
    try {
      // جلب المنتج
      const productSql = `SELECT * FROM products WHERE id = ? LIMIT 1`;
      const products = await sqliteWriteQueue.read<any[]>(productSql, [productId]);
      
      if (products.length === 0) return null;
      
      const product = products[0];

      // جلب الألوان
      const colorsSql = `SELECT * FROM product_colors WHERE product_id = ? ORDER BY name`;
      const colors = await sqliteWriteQueue.read<any[]>(colorsSql, [productId]);

      // جلب المقاسات لكل لون
      if (colors.length > 0) {
        const colorIds = colors.map(c => c.id);
        const sizesSql = `
          SELECT * FROM product_sizes 
          WHERE color_id IN (${colorIds.map(() => '?').join(',')})
          ORDER BY size_name
        `;
        const sizes = await sqliteWriteQueue.read<any[]>(sizesSql, colorIds);

        // ربط المقاسات بالألوان
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

        product.colors = colors.map(color => ({
          id: color.id,
          name: color.name,
          color_code: color.color_code,
          quantity: color.quantity,
          barcode: color.barcode,
          has_sizes: sizesMap.has(color.id) && sizesMap.get(color.id)!.length > 0,
          sizes: sizesMap.get(color.id) || []
        }));
      } else {
        product.colors = [];
      }

      return product;
    } catch (error) {
      console.error('[LocalSearch] خطأ في جلب المنتج الكامل:', error);
      return null;
    }
  }

  /**
   * 🌐 البحث في السيرفر (Fallback)
   */
  private async searchBarcodeOnServer(
    organizationId: string,
    barcode: string
  ): Promise<BarcodeSearchResult | null> {
    try {
      const { data, error } = await supabase.rpc('search_product_by_barcode' as any, {
        p_organization_id: organizationId,
        p_barcode: barcode
      });

      if (error) {
        console.error('[LocalSearch] خطأ في البحث على السيرفر:', error);
        return null;
      }

      if (data?.success && data.data) {
        const result = data.data;
        return {
          ...result,
          found_in: 'server'
        };
      }

      return null;
    } catch (error) {
      console.error('[LocalSearch] خطأ في الاتصال بالسيرفر:', error);
      return null;
    }
  }

  /**
   * ⚡ جلب المنتجات مع Pagination محلية
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
    const {
      page = 1,
      limit = 30,
      search = '',
      categoryId = '',
      stockFilter = 'all'
    } = options;

    console.log(`[LocalSearch] 📦 جلب المنتجات - صفحة ${page}, حد ${limit}`);

    if (!isSQLiteAvailable()) {
      console.warn('[LocalSearch] SQLite غير متاح');
      return this.getEmptyPaginatedResult(page, limit);
    }

    // ⚡ تعيين organizationId في sqliteWriteQueue لضمان تهيئة DB في Tauri
    if (organizationId) {
      sqliteWriteQueue.setOrganizationId(organizationId);
    }

    try {
      // بناء الاستعلام
      let whereClauses = ['p.organization_id = ?'];
      let params: any[] = [organizationId];

      // فلتر البحث
      if (search.trim()) {
        whereClauses.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)');
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // فلتر الفئة
      if (categoryId && categoryId !== 'all') {
        whereClauses.push('p.category_id = ?');
        params.push(categoryId);
      }

      // فلتر المخزون
      if (stockFilter === 'in_stock') {
        whereClauses.push('(p.stock_quantity > 0 OR p.actual_stock_quantity > 0)');
      } else if (stockFilter === 'out_of_stock') {
        whereClauses.push('(p.stock_quantity <= 0 AND (p.actual_stock_quantity IS NULL OR p.actual_stock_quantity <= 0))');
      }

      // فلتر المنتجات النشطة
      whereClauses.push('(p.is_active = 1 OR p.is_active IS NULL)');

      const whereClause = whereClauses.join(' AND ');

      // عد الإجمالي
      const countSql = `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`;
      const countResult = await sqliteWriteQueue.read<{ total: number }[]>(countSql, params);
      const totalCount = countResult[0]?.total || 0;

      // جلب المنتجات
      const offset = (page - 1) * limit;
      const productsSql = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereClause}
        ORDER BY p.name ASC
        LIMIT ? OFFSET ?
      `;
      
      const products = await sqliteWriteQueue.read<LocalProduct[]>(
        productsSql, 
        [...params, limit, offset]
      );

      // جلب الألوان والمقاسات للمنتجات
      const productsWithVariants = await this.enrichProductsWithVariants(products);

      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      console.log(`[LocalSearch] ✅ تم جلب ${products.length} منتج من ${totalCount} إجمالي`);

      return {
        products: productsWithVariants,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: limit,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        },
        source: 'local'
      };
    } catch (error) {
      console.error('[LocalSearch] خطأ في جلب المنتجات:', error);
      return this.getEmptyPaginatedResult(page, limit);
    }
  }

  /**
   * ⚡ إثراء المنتجات بالألوان والمقاسات
   */
  private async enrichProductsWithVariants(products: LocalProduct[]): Promise<any[]> {
    if (products.length === 0) return [];

    try {
      const productIds = products.map(p => p.id);
      
      // جلب كل الألوان
      const colorsSql = `
        SELECT * FROM product_colors 
        WHERE product_id IN (${productIds.map(() => '?').join(',')})
        ORDER BY name
      `;
      const allColors = await sqliteWriteQueue.read<LocalProductColor[]>(colorsSql, productIds);

      // جلب كل المقاسات
      const colorIds = allColors.map(c => c.id);
      let allSizes: LocalProductSize[] = [];
      
      if (colorIds.length > 0) {
        const sizesSql = `
          SELECT * FROM product_sizes 
          WHERE color_id IN (${colorIds.map(() => '?').join(',')})
          ORDER BY size_name
        `;
        allSizes = await sqliteWriteQueue.read<LocalProductSize[]>(sizesSql, colorIds);
      }

      // تجميع المقاسات حسب اللون
      const sizesMap = new Map<string, any[]>();
      for (const size of allSizes) {
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

      // تجميع الألوان حسب المنتج
      const colorsMap = new Map<string, any[]>();
      for (const color of allColors) {
        if (!colorsMap.has(color.product_id)) {
          colorsMap.set(color.product_id, []);
        }
        const colorSizes = sizesMap.get(color.id) || [];
        colorsMap.get(color.product_id)!.push({
          id: color.id,
          name: color.name,
          color_code: color.color_code,
          quantity: color.quantity,
          barcode: color.barcode,
          has_sizes: colorSizes.length > 0,
          sizes: colorSizes
        });
      }

      // إضافة الألوان للمنتجات
      return products.map(product => ({
        ...product,
        colors: colorsMap.get(product.id) || [],
        has_variants: (colorsMap.get(product.id)?.length || 0) > 0
      }));
    } catch (error) {
      console.error('[LocalSearch] خطأ في إثراء المنتجات:', error);
      return products;
    }
  }

  /**
   * ⚡ البحث السريع بالاسم أو الباركود
   */
  async quickSearch(
    organizationId: string,
    searchTerm: string,
    limit: number = 10
  ): Promise<LocalProduct[]> {
    if (!searchTerm.trim() || !isSQLiteAvailable()) return [];

    // ⚡ تعيين organizationId في sqliteWriteQueue لضمان تهيئة DB في Tauri
    if (organizationId) {
      sqliteWriteQueue.setOrganizationId(organizationId);
    }

    try {
      const term = `%${searchTerm.trim()}%`;
      const sql = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.organization_id = ?
          AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)
          AND (p.is_active = 1 OR p.is_active IS NULL)
        ORDER BY 
          CASE 
            WHEN p.barcode = ? THEN 1
            WHEN p.name LIKE ? THEN 2
            ELSE 3
          END,
          p.name ASC
        LIMIT ?
      `;

      const exactTerm = searchTerm.trim();
      const startsWith = `${exactTerm}%`;
      
      return await sqliteWriteQueue.read<LocalProduct[]>(
        sql, 
        [organizationId, term, term, term, exactTerm, startsWith, limit]
      );
    } catch (error) {
      console.error('[LocalSearch] خطأ في البحث السريع:', error);
      return [];
    }
  }

  /**
   * ⚡ الحصول على عدد المنتجات المحلية
   */
  async getLocalProductsCount(organizationId: string): Promise<number> {
    if (!isSQLiteAvailable()) return 0;

    // ⚡ تعيين organizationId في sqliteWriteQueue لضمان تهيئة DB في Tauri
    if (organizationId) {
      sqliteWriteQueue.setOrganizationId(organizationId);
    }

    try {
      const sql = `
        SELECT COUNT(*) as count FROM products 
        WHERE organization_id = ? 
          AND (is_active = 1 OR is_active IS NULL)
      `;
      const result = await sqliteWriteQueue.read<{ count: number }[]>(sql, [organizationId]);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('[LocalSearch] خطأ في عد المنتجات:', error);
      return 0;
    }
  }

  /**
   * ⚡ التحقق من وجود بيانات محلية
   */
  async hasLocalData(organizationId: string): Promise<boolean> {
    const count = await this.getLocalProductsCount(organizationId);
    return count > 0;
  }

  /**
   * نتيجة فارغة
   */
  private getEmptyPaginatedResult(page: number, limit: number): PaginatedProductsResult {
    return {
      products: [],
      pagination: {
        current_page: page,
        total_pages: 1,
        total_count: 0,
        per_page: limit,
        has_next_page: false,
        has_prev_page: false
      },
      source: 'local'
    };
  }
}

// Singleton instance
export const localProductSearchService = new LocalProductSearchServiceClass();
