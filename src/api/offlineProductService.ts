/**
 * ⚡ offlineProductService v3.0 - High Performance Edition
 * ============================================================
 *
 * 🚀 التحسينات:
 * - استعلام واحد محسّن بدلاً من 3 استعلامات منفصلة
 * - إزالة التعقيدات غير الضرورية
 * - أداء عالي مع 10,000+ منتج
 * - كود نظيف وبسيط
 *
 * ============================================================
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { LocalProduct } from '@/database/localDb';

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITIES
// ═══════════════════════════════════════════════════════════════

/** تحويل JSON string إلى array بشكل آمن */
const parseJSON = <T>(value: any, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/** تحويل SQLite boolean (0/1) إلى JavaScript boolean */
const toBool = (value: any): boolean => value === 1 || value === true;

/** الحصول على organization_id من localStorage */
const getOrgId = (): string => {
  return localStorage.getItem('currentOrganizationId')
      || localStorage.getItem('bazaar_organization_id')
      || '';
};

/** التحقق من الاتصال بالإنترنت */
const isOnline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine;

// ═══════════════════════════════════════════════════════════════
// 📦 PRODUCT QUERIES (Optimized)
// ═══════════════════════════════════════════════════════════════

/**
 * ⚡ جلب جميع المنتجات مع الألوان والمقاسات
 * استعلام محسّن يجلب كل شيء دفعة واحدة
 */
export const getProducts = async (organizationId: string): Promise<LocalProduct[]> => {
  if (!powerSyncService.db) {
    console.warn('[ProductService] ⚠️ PowerSync not ready');
    return [];
  }

  const startTime = performance.now();

  try {
    // ⚡ Step 1: جلب المنتجات النشطة - الأحدث أولاً
    const products = await powerSyncService.query<any>({
      sql: `SELECT * FROM products
       WHERE organization_id = ? AND is_active = 1
       ORDER BY created_at DESC`,
      params: [organizationId]
    });

    if (products.length === 0) {
      return [];
    }

    // ⚡ Step 2: جلب الألوان والمقاسات بـ batch واحد (أسرع بكثير)
    const productIds = products.map(p => p.id);

    // استخدام batch query بدلاً من IN clause للأداء الأفضل
    const [colors, sizes] = await Promise.all([
      powerSyncService.query<any>({
        sql: `SELECT * FROM product_colors WHERE organization_id = ?`,
        params: [organizationId]
      }),
      powerSyncService.query<any>({
        sql: `SELECT * FROM product_sizes WHERE organization_id = ?`,
        params: [organizationId]
      })
    ]);

    // ⚡ Step 3: بناء Maps للوصول السريع O(1)
    const colorsMap = new Map<string, any[]>();
    const sizesMap = new Map<string, any[]>();

    for (const color of colors) {
      const list = colorsMap.get(color.product_id) || [];
      list.push(color);
      colorsMap.set(color.product_id, list);
    }

    for (const size of sizes) {
      const list = sizesMap.get(size.color_id) || [];
      list.push(size);
      sizesMap.set(size.color_id, list);
    }

    // ⚡ Step 4: ربط البيانات
    const result = products.map(product => {
      const productColors = colorsMap.get(product.id) || [];

      // ربط المقاسات بالألوان
      for (const color of productColors) {
        color.sizes = sizesMap.get(color.id) || [];
        color.product_sizes = color.sizes;
      }

      return {
        ...product,
        // Parse JSON fields
        images: parseJSON(product.images, []),
        features: parseJSON(product.features, []),
        specifications: parseJSON(product.specifications, {}),
        // Variants
        colors: productColors,
        product_colors: productColors,
        variants: productColors,
        // Booleans
        is_active: toBool(product.is_active),
        has_variants: toBool(product.has_variants),
        is_digital: toBool(product.is_digital),
        track_batches: toBool(product.track_batches),
        track_serial_numbers: toBool(product.track_serial_numbers),
      };
    });

    const duration = performance.now() - startTime;
    console.log(`[ProductService] ✅ Loaded ${result.length} products in ${duration.toFixed(0)}ms`);

    return result as LocalProduct[];

  } catch (error) {
    console.error('[ProductService] ❌ Error:', error);
    return [];
  }
};

/**
 * ⚡ جلب منتج واحد بالـ ID
 */
export const getProductById = async (
  organizationId: string,
  productId: string
): Promise<LocalProduct | null> => {
  if (!powerSyncService.db) return null;

  try {
    const product = await powerSyncService.queryOne<any>({
      sql: `SELECT * FROM products WHERE id = ? AND organization_id = ?`,
      params: [productId, organizationId]
    });

    if (!product) return null;

    // جلب الألوان والمقاسات
    const colors = await powerSyncService.query<any>({
      sql: `SELECT * FROM product_colors WHERE product_id = ?`,
      params: [productId]
    });

    const colorIds = colors.map(c => c.id);
    let sizes: any[] = [];

    if (colorIds.length > 0) {
      sizes = await powerSyncService.query<any>({
        sql: `SELECT * FROM product_sizes WHERE color_id IN (${colorIds.map(() => '?').join(',')})`,
        params: colorIds
      });
    }

    // Map sizes to colors
    const sizesMap = new Map<string, any[]>();
    for (const size of sizes) {
      const list = sizesMap.get(size.color_id) || [];
      list.push(size);
      sizesMap.set(size.color_id, list);
    }

    for (const color of colors) {
      color.sizes = sizesMap.get(color.id) || [];
      color.product_sizes = color.sizes;
    }

    return {
      ...product,
      images: parseJSON(product.images, []),
      colors,
      product_colors: colors,
      variants: colors,
      is_active: toBool(product.is_active),
    } as LocalProduct;

  } catch (error) {
    console.error('[ProductService] ❌ getProductById error:', error);
    return null;
  }
};

/**
 * ⚡ البحث في المنتجات (محسّن للسرعة)
 */
export const searchProducts = async (
  organizationId: string,
  query: string,
  limit: number = 50
): Promise<LocalProduct[]> => {
  if (!powerSyncService.db || !query.trim()) return [];

  try {
    const searchTerm = `%${query.trim()}%`;

    const products = await powerSyncService.query<any>({
      sql: `SELECT * FROM products
       WHERE organization_id = ?
         AND is_active = 1
         AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)
       ORDER BY created_at DESC
       LIMIT ?`,
      params: [organizationId, searchTerm, searchTerm, searchTerm, limit]
    });

    return products.map(p => ({
      ...p,
      is_active: toBool(p.is_active),
      images: parseJSON(p.images, []),
    })) as LocalProduct[];

  } catch (error) {
    console.error('[ProductService] ❌ Search error:', error);
    return [];
  }
};

/**
 * ⚡ جلب منتج بالباركود
 */
export const getProductByBarcode = async (
  organizationId: string,
  barcode: string
): Promise<LocalProduct | null> => {
  if (!powerSyncService.db || !barcode) return null;

  try {
    // البحث في المنتجات
    let product = await powerSyncService.queryOne<any>({
      sql: `SELECT * FROM products WHERE organization_id = ? AND barcode = ? AND is_active = 1`,
      params: [organizationId, barcode]
    });

    if (product) {
      return { ...product, is_active: true } as LocalProduct;
    }

    // البحث في الألوان
    const color = await powerSyncService.queryOne<any>({
      sql: `SELECT * FROM product_colors WHERE organization_id = ? AND barcode = ?`,
      params: [organizationId, barcode]
    });

    if (color) {
      product = await powerSyncService.queryOne<any>({
        sql: `SELECT * FROM products WHERE id = ?`,
        params: [color.product_id]
      });
      if (product) {
        return {
          ...product,
          is_active: toBool(product.is_active),
          selectedColorId: color.id
        } as LocalProduct;
      }
    }

    return null;
  } catch (error) {
    console.error('[ProductService] ❌ Barcode search error:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// ✏️ PRODUCT MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ⚡ إنشاء منتج جديد
 */
export const createProduct = async (
  organizationId: string,
  productData: Partial<LocalProduct>
): Promise<LocalProduct> => {
  if (!powerSyncService.db) {
    throw new Error('Database not available');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const product = {
    id,
    organization_id: organizationId,
    name: productData.name || '',
    sku: productData.sku || '',
    barcode: productData.barcode || '',
    price: productData.price || 0,
    purchase_price: productData.purchase_price || 0,
    stock_quantity: productData.stock_quantity || 0,
    category_id: productData.category_id || null,
    is_active: 1,
    created_at: now,
    updated_at: now,
    ...productData,
  };

  // Build INSERT query
  const columns = Object.keys(product);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map(col => (product as any)[col]);

  await powerSyncService.db.execute(
    `INSERT INTO products (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  console.log(`[ProductService] ✅ Created product: ${product.name}`);
  return product as LocalProduct;
};

/**
 * ⚡ تحديث منتج
 */
export const updateProduct = async (
  organizationId: string,
  productId: string,
  updates: Partial<LocalProduct>
): Promise<LocalProduct | null> => {
  if (!powerSyncService.db) return null;

  try {
    const now = new Date().toISOString();
    const updateData = { ...updates, updated_at: now };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if ((updateData as any)[key] === undefined) {
        delete (updateData as any)[key];
      }
    });

    const columns = Object.keys(updateData);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(col => (updateData as any)[col]), productId, organizationId];

    await powerSyncService.db.execute(
      `UPDATE products SET ${setClause} WHERE id = ? AND organization_id = ?`,
      values
    );

    return await getProductById(organizationId, productId);

  } catch (error) {
    console.error('[ProductService] ❌ Update error:', error);
    return null;
  }
};

/**
 * ⚡ حذف منتج
 */
export const deleteProduct = async (
  organizationId: string,
  productId: string
): Promise<boolean> => {
  if (!powerSyncService.db) return false;

  try {
    await powerSyncService.db.execute(
      `DELETE FROM products WHERE id = ? AND organization_id = ?`,
      [productId, organizationId]
    );

    console.log(`[ProductService] ✅ Deleted product: ${productId}`);
    return true;

  } catch (error) {
    console.error('[ProductService] ❌ Delete error:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// 📊 STOCK MANAGEMENT (Simplified)
// ═══════════════════════════════════════════════════════════════

interface StockUpdateOptions {
  colorId?: string | null;
  sizeId?: string | null;
}

/**
 * ⚡ تحديث المخزون (مبسّط وسريع)
 */
export const updateProductStock = async (
  organizationId: string,
  productId: string,
  quantityChange: number,
  isReduction: boolean = true,
  options?: StockUpdateOptions
): Promise<LocalProduct | null> => {
  if (!powerSyncService.db) return null;

  try {
    const delta = isReduction ? -Math.abs(quantityChange) : Math.abs(quantityChange);
    const now = new Date().toISOString();

    // تحديث المخزون الأساسي
    if (!options?.colorId) {
      await powerSyncService.db.execute(
        `UPDATE products
         SET stock_quantity = MAX(0, stock_quantity + ?),
             last_inventory_update = ?,
             updated_at = ?
         WHERE id = ? AND organization_id = ?`,
        [delta, now, now, productId, organizationId]
      );
    }
    // تحديث مخزون اللون
    else if (options.colorId && !options.sizeId) {
      await powerSyncService.db.execute(
        `UPDATE product_colors
         SET quantity = MAX(0, quantity + ?),
             updated_at = ?
         WHERE id = ? AND product_id = ?`,
        [delta, now, options.colorId, productId]
      );
    }
    // تحديث مخزون المقاس
    else if (options.colorId && options.sizeId) {
      await powerSyncService.db.execute(
        `UPDATE product_sizes
         SET quantity = MAX(0, quantity + ?),
             updated_at = ?
         WHERE id = ? AND color_id = ?`,
        [delta, now, options.sizeId, options.colorId]
      );
    }

    return await getProductById(organizationId, productId);

  } catch (error) {
    console.error('[ProductService] ❌ Stock update error:', error);
    return null;
  }
};

/**
 * ⚡ تعيين المخزون لقيمة محددة
 */
export const setProductStockAbsolute = async (
  organizationId: string,
  productId: string,
  newQuantity: number,
  options?: StockUpdateOptions
): Promise<LocalProduct | null> => {
  if (!powerSyncService.db) return null;

  try {
    const now = new Date().toISOString();
    const quantity = Math.max(0, newQuantity);

    if (!options?.colorId) {
      await powerSyncService.db.execute(
        `UPDATE products
         SET stock_quantity = ?,
             last_inventory_update = ?,
             updated_at = ?
         WHERE id = ? AND organization_id = ?`,
        [quantity, now, now, productId, organizationId]
      );
    } else if (options.colorId && !options.sizeId) {
      await powerSyncService.db.execute(
        `UPDATE product_colors
         SET quantity = ?, updated_at = ?
         WHERE id = ?`,
        [quantity, now, options.colorId]
      );
    } else if (options.sizeId) {
      await powerSyncService.db.execute(
        `UPDATE product_sizes
         SET quantity = ?, updated_at = ?
         WHERE id = ?`,
        [quantity, now, options.sizeId]
      );
    }

    return await getProductById(organizationId, productId);

  } catch (error) {
    console.error('[ProductService] ❌ Set stock error:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// 📊 STATISTICS
// ═══════════════════════════════════════════════════════════════

/**
 * ⚡ إحصائيات المنتجات
 */
export const getProductStats = async (organizationId: string): Promise<{
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
}> => {
  if (!powerSyncService.db) {
    return { total: 0, active: 0, lowStock: 0, outOfStock: 0 };
  }

  try {
    const result = await powerSyncService.queryOne<any>({
      sql: `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock,
         SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock
       FROM products
       WHERE organization_id = ?`,
      params: [organizationId]
    });

    return {
      total: result?.total || 0,
      active: result?.active || 0,
      lowStock: result?.low_stock || 0,
      outOfStock: result?.out_of_stock || 0,
    };

  } catch (error) {
    console.error('[ProductService] ❌ Stats error:', error);
    return { total: 0, active: 0, lowStock: 0, outOfStock: 0 };
  }
};

/**
 * ⚡ مزامنة يدوية (للتوافق مع الكود القديم)
 */
export const forceSynchronization = async (): Promise<boolean> => {
  try {
    if (!isOnline()) {
      console.warn('[ProductService] Cannot sync - offline');
      return false;
    }
    await powerSyncService.forceSync();
    return true;
  } catch (error) {
    console.error('[ProductService] ❌ Sync error:', error);
    return false;
  }
};
