/**
 * ⚡ UnifiedProductService - v3.0 (PowerSync Best Practices 2025)
 * ============================================================
 *
 * نظام Offline-First كامل للمنتجات:
 * - يستخدم powerSyncService.query() و mutate() الجديد
 * - قراءة من PowerSync محلياً (سريع جداً)
 * - كتابة محلية فورية مع مزامنة تلقائية
 * - دعم الألوان والمقاسات والمخزون
 * - بحث وتصفية محلي فائق السرعة
 * ============================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ========================================
// 📦 Types
// ========================================

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  slug?: string;
  category_id?: string;
  subcategory_id?: string;
  supplier_id?: string;

  // Pricing
  price: number;
  purchase_price?: number;
  compare_at_price?: number;
  wholesale_price?: number;
  partial_wholesale_price?: number;

  // Stock
  stock_quantity: number;
  min_stock_level?: number;

  // Media
  thumbnail_image?: string;

  // Variants
  has_variants?: boolean;
  use_sizes?: boolean;
  is_active?: boolean;

  // Advanced selling
  sell_by_weight?: boolean;
  sell_by_meter?: boolean;
  sell_by_box?: boolean;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface ProductColor {
  id: string;
  organization_id: string;
  product_id: string;
  name: string;
  color_code?: string;
  image_url?: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  is_default?: boolean;
  barcode?: string;
  has_sizes?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductSize {
  id: string;
  organization_id: string;
  product_id: string;
  color_id?: string;
  size_name: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  barcode?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  slug?: string;
  icon?: string;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductSubcategory {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  description?: string;
  slug?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductWithDetails extends Product {
  colors?: ProductColor[];
  sizes?: ProductSize[];
  category?: ProductCategory;
  subcategory?: ProductSubcategory;
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  subcategory_id?: string;
  is_active?: boolean;
  has_stock?: boolean;
  min_price?: number;
  max_price?: number;
  supplier_id?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ========================================
// 🔧 UnifiedProductService Class
// ========================================

class UnifiedProductServiceClass {
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
   * ⚡ جلب جميع المنتجات مع Pagination + دعم الصور المحلية Offline
   */
  async getProducts(
    filters: ProductFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<Product>> {
    const orgId = this.getOrgId();
    const offset = (page - 1) * limit;

    // بناء شروط البحث (للعد)
    let whereClause = 'organization_id = ?';
    // بناء شروط البحث مع البادئة p. (للاستعلام مع JOIN)
    let whereClauseWithPrefix = 'p.organization_id = ?';
    const params: any[] = [orgId];

    if (filters.search) {
      whereClause += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
      whereClauseWithPrefix += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.category_id) {
      whereClause += ' AND category_id = ?';
      whereClauseWithPrefix += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.subcategory_id) {
      whereClause += ' AND subcategory_id = ?';
      whereClauseWithPrefix += ' AND p.subcategory_id = ?';
      params.push(filters.subcategory_id);
    }

    if (filters.is_active !== undefined) {
      whereClause += ' AND is_active = ?';
      whereClauseWithPrefix += ' AND p.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.has_stock) {
      whereClause += ' AND stock_quantity > 0';
      whereClauseWithPrefix += ' AND p.stock_quantity > 0';
    }

    if (filters.min_price !== undefined) {
      whereClause += ' AND price >= ?';
      whereClauseWithPrefix += ' AND p.price >= ?';
      params.push(filters.min_price);
    }

    if (filters.max_price !== undefined) {
      whereClause += ' AND price <= ?';
      whereClauseWithPrefix += ' AND p.price <= ?';
      params.push(filters.max_price);
    }

    if (filters.supplier_id) {
      whereClause += ' AND supplier_id = ?';
      whereClauseWithPrefix += ' AND p.supplier_id = ?';
      params.push(filters.supplier_id);
    }

    // جلب العدد الإجمالي
    const total = await powerSyncService.count('products', whereClause, params);

    // ⚡ جلب المنتجات مع الصور المحلية (للعمل Offline) - الأحدث أولاً
    const products = await powerSyncService.query<Product>({
      sql: `
        SELECT p.*, lic.base64_data as thumbnail_base64
        FROM products p
        LEFT JOIN local_image_cache lic ON lic.product_id = p.id
        WHERE ${whereClauseWithPrefix}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `,
      params: [...params, limit, offset]
    });

    return {
      data: products,
      total,
      page,
      limit,
      hasMore: offset + products.length < total
    };
  }

  /**
   * ⚡ جلب منتج واحد مع التفاصيل
   */
  async getProduct(productId: string): Promise<ProductWithDetails | null> {
    const product = await powerSyncService.queryOne<Product>({
      sql: 'SELECT * FROM products WHERE id = ?',
      params: [productId]
    });

    if (!product) return null;

    // جلب الألوان والمقاسات بالتوازي
    const [colors, sizes, category, subcategory] = await Promise.all([
      powerSyncService.query<ProductColor>({
        sql: 'SELECT * FROM product_colors WHERE product_id = ? ORDER BY is_default DESC, name ASC',
        params: [productId]
      }),
      powerSyncService.query<ProductSize>({
        sql: 'SELECT * FROM product_sizes WHERE product_id = ? ORDER BY size_name ASC',
        params: [productId]
      }),
      product.category_id
        ? powerSyncService.queryOne<ProductCategory>({
            sql: 'SELECT * FROM product_categories WHERE id = ?',
            params: [product.category_id]
          })
        : null,
      product.subcategory_id
        ? powerSyncService.queryOne<ProductSubcategory>({
            sql: 'SELECT * FROM product_subcategories WHERE id = ?',
            params: [product.subcategory_id]
          })
        : null
    ]);

    return {
      ...product,
      colors,
      sizes,
      category: category || undefined,
      subcategory: subcategory || undefined
    };
  }

  /**
   * ⚡ جلب منتج بالباركود
   */
  async getProductByBarcode(barcode: string): Promise<ProductWithDetails | null> {
    const orgId = this.getOrgId();

    // بحث في المنتجات
    let product = await powerSyncService.queryOne<Product>({
      sql: 'SELECT * FROM products WHERE organization_id = ? AND barcode = ?',
      params: [orgId, barcode]
    });

    // بحث في الألوان إذا لم يوجد
    if (!product) {
      const color = await powerSyncService.queryOne<ProductColor>({
        sql: 'SELECT * FROM product_colors WHERE organization_id = ? AND barcode = ?',
        params: [orgId, barcode]
      });
      if (color) {
        product = await powerSyncService.queryOne<Product>({
          sql: 'SELECT * FROM products WHERE id = ?',
          params: [color.product_id]
        });
      }
    }

    // بحث في المقاسات إذا لم يوجد
    if (!product) {
      const size = await powerSyncService.queryOne<ProductSize>({
        sql: 'SELECT * FROM product_sizes WHERE organization_id = ? AND barcode = ?',
        params: [orgId, barcode]
      });
      if (size) {
        product = await powerSyncService.queryOne<Product>({
          sql: 'SELECT * FROM products WHERE id = ?',
          params: [size.product_id]
        });
      }
    }

    if (!product) return null;

    return this.getProduct(product.id);
  }

  /**
   * ⚡ بحث سريع في المنتجات
   */
  async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    if (!query || query.trim().length < 2) return [];

    const orgId = this.getOrgId();
    const searchPattern = `%${query.trim()}%`;

    return powerSyncService.query<Product>({
      sql: `SELECT * FROM products
       WHERE organization_id = ?
       AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR description LIKE ?)
       AND is_active = 1
       ORDER BY name ASC
       LIMIT ?`,
      params: [orgId, searchPattern, searchPattern, searchPattern, searchPattern, limit]
    });
  }

  /**
   * ⚡ البحث عن منتج بالباركود
   */
  async searchProductsByBarcode(barcode: string): Promise<ProductWithDetails | null> {
    return this.getProductByBarcode(barcode);
  }

  /**
   * ⚡ جلب التصنيفات
   */
  async getCategories(): Promise<ProductCategory[]> {
    const orgId = this.getOrgId();
    return powerSyncService.query<ProductCategory>({
      sql: 'SELECT * FROM product_categories WHERE organization_id = ? AND is_active = 1 ORDER BY name ASC',
      params: [orgId]
    });
  }

  /**
   * ⚡ جلب التصنيفات الفرعية
   */
  async getSubcategories(categoryId?: string): Promise<ProductSubcategory[]> {
    const orgId = this.getOrgId();

    if (categoryId) {
      return powerSyncService.query<ProductSubcategory>({
        sql: 'SELECT * FROM product_subcategories WHERE organization_id = ? AND category_id = ? AND is_active = 1 ORDER BY name ASC',
        params: [orgId, categoryId]
      });
    }

    return powerSyncService.query<ProductSubcategory>({
      sql: 'SELECT * FROM product_subcategories WHERE organization_id = ? AND is_active = 1 ORDER BY name ASC',
      params: [orgId]
    });
  }

  // ========================================
  // ✏️ CREATE Operations
  // ========================================

  /**
   * ⚡ إنشاء منتج جديد
   */
  async createProduct(
    data: Omit<Product, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Product> {
    const orgId = this.getOrgId();
    const now = new Date().toISOString();
    const productId = uuidv4();

    const product: Product = {
      ...data,
      id: productId,
      organization_id: orgId,
      stock_quantity: data.stock_quantity || 0,
      price: data.price || 0,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now
    };

    await powerSyncService.mutate({
      table: 'products',
      operation: 'INSERT',
      data: product
    });

    console.log(`[UnifiedProduct] ✅ Created product: ${productId}`);
    return product;
  }

  /**
   * ⚡ إنشاء منتج مع الألوان والمقاسات
   */
  async createProductWithVariants(
    productData: Omit<Product, 'id' | 'organization_id' | 'created_at' | 'updated_at'>,
    colors?: Array<Omit<ProductColor, 'id' | 'organization_id' | 'product_id' | 'created_at' | 'updated_at'>>,
    sizes?: Array<Omit<ProductSize, 'id' | 'organization_id' | 'product_id' | 'created_at' | 'updated_at'>>
  ): Promise<ProductWithDetails> {
    const orgId = this.getOrgId();
    const now = new Date().toISOString();
    const productId = uuidv4();

    const product: Product = {
      ...productData,
      id: productId,
      organization_id: orgId,
      has_variants: (colors && colors.length > 0) || (sizes && sizes.length > 0),
      stock_quantity: productData.stock_quantity || 0,
      price: productData.price || 0,
      is_active: productData.is_active ?? true,
      created_at: now,
      updated_at: now
    };

    const createdColors: ProductColor[] = [];
    const createdSizes: ProductSize[] = [];

    await powerSyncService.transaction(async (tx) => {
      // إنشاء المنتج
      const productColumns = Object.keys(product);
      const productPlaceholders = productColumns.map(() => '?').join(', ');
      const productValues = productColumns.map(col => (product as any)[col]);

      await tx.execute(
        `INSERT INTO products (${productColumns.join(', ')}) VALUES (${productPlaceholders})`,
        productValues
      );

      // إنشاء الألوان
      if (colors) {
        for (const colorData of colors) {
          const colorId = uuidv4();
          const color: ProductColor = {
            ...colorData,
            id: colorId,
            organization_id: orgId,
            product_id: productId,
            quantity: colorData.quantity || 0,
            created_at: now,
            updated_at: now
          };

          const colorColumns = Object.keys(color);
          const colorPlaceholders = colorColumns.map(() => '?').join(', ');
          const colorValues = colorColumns.map(col => (color as any)[col]);

          await tx.execute(
            `INSERT INTO product_colors (${colorColumns.join(', ')}) VALUES (${colorPlaceholders})`,
            colorValues
          );

          createdColors.push(color);
        }
      }

      // إنشاء المقاسات
      if (sizes) {
        for (const sizeData of sizes) {
          const sizeId = uuidv4();
          const size: ProductSize = {
            ...sizeData,
            id: sizeId,
            organization_id: orgId,
            product_id: productId,
            quantity: sizeData.quantity || 0,
            created_at: now,
            updated_at: now
          };

          const sizeColumns = Object.keys(size);
          const sizePlaceholders = sizeColumns.map(() => '?').join(', ');
          const sizeValues = sizeColumns.map(col => (size as any)[col]);

          await tx.execute(
            `INSERT INTO product_sizes (${sizeColumns.join(', ')}) VALUES (${sizePlaceholders})`,
            sizeValues
          );

          createdSizes.push(size);
        }
      }
    });

    console.log(`[UnifiedProduct] ✅ Created product with variants: ${productId}`);

    return {
      ...product,
      colors: createdColors,
      sizes: createdSizes
    };
  }

  // ========================================
  // 📝 UPDATE Operations
  // ========================================

  /**
   * ⚡ تحديث منتج
   */
  async updateProduct(
    productId: string,
    updates: Partial<Omit<Product, 'id' | 'organization_id' | 'created_at'>>
  ): Promise<Product | null> {
    const existing = await powerSyncService.queryOne<Product>({
      sql: 'SELECT * FROM products WHERE id = ?',
      params: [productId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedProduct = {
      ...existing,
      ...updates,
      updated_at: now
    };

    const updateData = { ...updates, updated_at: now };

    await powerSyncService.mutate({
      table: 'products',
      operation: 'UPDATE',
      data: updateData,
      where: [{ column: 'id', value: productId }]
    });

    console.log(`[UnifiedProduct] ✅ Updated product: ${productId}`);
    return updatedProduct;
  }

  /**
   * ⚡ تحديث المخزون
   */
  async updateStock(
    productId: string,
    delta: number,
    options?: { colorId?: string; sizeId?: string }
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      await powerSyncService.transaction(async (tx) => {
        if (options?.sizeId) {
          await tx.execute(
            'UPDATE product_sizes SET quantity = quantity + ?, updated_at = ? WHERE id = ?',
            [delta, now, options.sizeId]
          );
        } else if (options?.colorId) {
          await tx.execute(
            'UPDATE product_colors SET quantity = quantity + ?, updated_at = ? WHERE id = ?',
            [delta, now, options.colorId]
          );
        } else {
          await tx.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?',
            [delta, now, productId]
          );
        }
      });

      console.log(`[UnifiedProduct] ✅ Updated stock for ${productId}: ${delta > 0 ? '+' : ''}${delta}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedProduct] ❌ Failed to update stock:`, error);
      return false;
    }
  }

  /**
   * ⚡ تحديث المخزون المتقدم (وزن/طول/صندوق)
   * يدعم أنواع البيع المتقدمة: weight, meter, box
   */
  async updateAdvancedStock(
    productId: string,
    options: {
      type: 'weight' | 'meter' | 'box' | 'piece';
      delta?: number;           // للقطع
      weightDelta?: number;     // للوزن
      lengthDelta?: number;     // للمتر
      boxDelta?: number;        // للصناديق
      colorId?: string;
      sizeId?: string;
    }
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const { type, delta = 0, weightDelta = 0, lengthDelta = 0, boxDelta = 0, colorId, sizeId } = options;

      console.log(`[UnifiedProduct] 📦 تحديث مخزون متقدم:`, {
        productId,
        type,
        delta,
        weightDelta,
        lengthDelta,
        boxDelta
      });

      await powerSyncService.transaction(async (tx) => {
        switch (type) {
          case 'weight':
            // تحديث الوزن المتاح
            await tx.execute(
              'UPDATE products SET available_weight = COALESCE(available_weight, 0) + ?, updated_at = ? WHERE id = ?',
              [weightDelta, now, productId]
            );
            console.log(`[UnifiedProduct] ⚖️ تحديث الوزن: ${weightDelta > 0 ? '+' : ''}${weightDelta} كغ`);
            break;

          case 'meter':
            // تحديث الطول المتاح
            await tx.execute(
              'UPDATE products SET available_length = COALESCE(available_length, 0) + ?, updated_at = ? WHERE id = ?',
              [lengthDelta, now, productId]
            );
            console.log(`[UnifiedProduct] 📏 تحديث الطول: ${lengthDelta > 0 ? '+' : ''}${lengthDelta} م`);
            break;

          case 'box':
            // تحديث عدد الصناديق + المخزون بالقطع
            await tx.execute(
              'UPDATE products SET available_boxes = COALESCE(available_boxes, 0) + ?, stock_quantity = COALESCE(stock_quantity, 0) + ?, updated_at = ? WHERE id = ?',
              [boxDelta, delta, now, productId]
            );
            console.log(`[UnifiedProduct] 📦 تحديث الصناديق: ${boxDelta > 0 ? '+' : ''}${boxDelta} صندوق, ${delta > 0 ? '+' : ''}${delta} قطعة`);
            break;

          case 'piece':
          default:
            // تحديث المخزون العادي (بالقطعة)
            if (sizeId) {
              await tx.execute(
                'UPDATE product_sizes SET quantity = quantity + ?, updated_at = ? WHERE id = ?',
                [delta, now, sizeId]
              );
            } else if (colorId) {
              await tx.execute(
                'UPDATE product_colors SET quantity = quantity + ?, updated_at = ? WHERE id = ?',
                [delta, now, colorId]
              );
            } else {
              await tx.execute(
                'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?',
                [delta, now, productId]
              );
            }
            console.log(`[UnifiedProduct] 🔢 تحديث القطع: ${delta > 0 ? '+' : ''}${delta}`);
            break;
        }
      });

      console.log(`[UnifiedProduct] ✅ تم تحديث المخزون المتقدم بنجاح`);
      return true;
    } catch (error) {
      console.error(`[UnifiedProduct] ❌ فشل تحديث المخزون المتقدم:`, error);
      return false;
    }
  }

  /**
   * ⚡ تحديث لون
   */
  async updateColor(
    colorId: string,
    updates: Partial<Omit<ProductColor, 'id' | 'organization_id' | 'product_id' | 'created_at'>>
  ): Promise<ProductColor | null> {
    const existing = await powerSyncService.queryOne<ProductColor>({
      sql: 'SELECT * FROM product_colors WHERE id = ?',
      params: [colorId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const updateData = { ...updates, updated_at: now };

    await powerSyncService.mutate({
      table: 'product_colors',
      operation: 'UPDATE',
      data: updateData,
      where: [{ column: 'id', value: colorId }]
    });

    return { ...existing, ...updates, updated_at: now };
  }

  /**
   * ⚡ تحديث مقاس
   */
  async updateSize(
    sizeId: string,
    updates: Partial<Omit<ProductSize, 'id' | 'organization_id' | 'product_id' | 'created_at'>>
  ): Promise<ProductSize | null> {
    const existing = await powerSyncService.queryOne<ProductSize>({
      sql: 'SELECT * FROM product_sizes WHERE id = ?',
      params: [sizeId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const updateData = { ...updates, updated_at: now };

    await powerSyncService.mutate({
      table: 'product_sizes',
      operation: 'UPDATE',
      data: updateData,
      where: [{ column: 'id', value: sizeId }]
    });

    return { ...existing, ...updates, updated_at: now };
  }

  // ========================================
  // 🗑️ DELETE Operations
  // ========================================

  /**
   * ⚡ حذف منتج
   */
  async deleteProduct(productId: string): Promise<boolean> {
    try {
      await powerSyncService.transaction(async (tx) => {
        // حذف المقاسات
        await tx.execute('DELETE FROM product_sizes WHERE product_id = ?', [productId]);
        // حذف الألوان
        await tx.execute('DELETE FROM product_colors WHERE product_id = ?', [productId]);
        // حذف المنتج
        await tx.execute('DELETE FROM products WHERE id = ?', [productId]);
      });

      console.log(`[UnifiedProduct] ✅ Deleted product: ${productId}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedProduct] ❌ Failed to delete product:`, error);
      return false;
    }
  }

  /**
   * ⚡ حذف لون
   */
  async deleteColor(colorId: string): Promise<boolean> {
    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute('DELETE FROM product_sizes WHERE color_id = ?', [colorId]);
        await tx.execute('DELETE FROM product_colors WHERE id = ?', [colorId]);
      });
      return true;
    } catch (error) {
      console.error(`[UnifiedProduct] ❌ Failed to delete color:`, error);
      return false;
    }
  }

  /**
   * ⚡ حذف مقاس
   */
  async deleteSize(sizeId: string): Promise<boolean> {
    try {
      await powerSyncService.mutate({
        table: 'product_sizes',
        operation: 'DELETE',
        where: [{ column: 'id', value: sizeId }]
      });
      return true;
    } catch (error) {
      console.error(`[UnifiedProduct] ❌ Failed to delete size:`, error);
      return false;
    }
  }

  // ========================================
  // 📊 Statistics
  // ========================================

  /**
   * ⚡ إحصائيات المنتجات
   */
  async getProductStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  }> {
    const orgId = this.getOrgId();

    const result = await powerSyncService.queryOne<{
      total: number;
      active: number;
      inactive: number;
      low_stock: number;
      out_of_stock: number;
      total_value: number;
    }>({
      sql: `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= COALESCE(min_stock_level, 5) THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock,
        COALESCE(SUM(stock_quantity * price), 0) as total_value
      FROM products
      WHERE organization_id = ?`,
      params: [orgId]
    });

    return {
      total: result?.total || 0,
      active: result?.active || 0,
      inactive: result?.inactive || 0,
      lowStock: result?.low_stock || 0,
      outOfStock: result?.out_of_stock || 0,
      totalValue: result?.total_value || 0
    };
  }

  /**
   * ⚡ المنتجات الأكثر مبيعاً
   */
  async getTopSellingProducts(limit: number = 10): Promise<Array<{ product: Product; totalSold: number }>> {
    const orgId = this.getOrgId();

    const results = await powerSyncService.query<{ product_id: string; total_sold: number }>({
      sql: `SELECT product_id, SUM(quantity) as total_sold
       FROM order_items
       WHERE organization_id = ?
       GROUP BY product_id
       ORDER BY total_sold DESC
       LIMIT ?`,
      params: [orgId, limit]
    });

    const products: Array<{ product: Product; totalSold: number }> = [];

    for (const result of results) {
      const product = await powerSyncService.queryOne<Product>({
        sql: 'SELECT * FROM products WHERE id = ?',
        params: [result.product_id]
      });
      if (product) {
        products.push({ product, totalSold: result.total_sold });
      }
    }

    return products;
  }

  /**
   * ⚡ المنتجات منخفضة المخزون
   */
  async getLowStockProducts(limit: number = 20): Promise<Product[]> {
    const orgId = this.getOrgId();

    return powerSyncService.query<Product>({
      sql: `SELECT * FROM products
       WHERE organization_id = ?
       AND is_active = 1
       AND stock_quantity <= COALESCE(min_stock_level, 5)
       ORDER BY stock_quantity ASC
       LIMIT ?`,
      params: [orgId, limit]
    });
  }

  /**
   * ⚡ البحث بالباركود (Offline-First)
   */
  async searchByBarcode(barcode: string): Promise<{
    product?: Product;
    color?: ProductColor;
    size?: ProductSize;
    foundIn: 'product' | 'color' | 'size';
  } | null> {
    const orgId = this.getOrgId();
    if (!barcode || !barcode.trim()) return null;

    const barcodeTrimmed = barcode.trim();

    // 1. البحث في المنتجات الرئيسية
    const product = await powerSyncService.queryOne<Product>({
      sql: `SELECT * FROM products
       WHERE organization_id = ?
       AND barcode = ?
       AND is_active = 1
       LIMIT 1`,
      params: [orgId, barcodeTrimmed]
    });

    if (product) {
      return { product, foundIn: 'product' };
    }

    // 2. البحث في الألوان
    const color = await powerSyncService.queryOne<ProductColor>({
      sql: `SELECT * FROM product_colors
       WHERE organization_id = ?
       AND barcode = ?
       LIMIT 1`,
      params: [orgId, barcodeTrimmed]
    });

    if (color) {
      const productData = await powerSyncService.queryOne<Product>({
        sql: 'SELECT * FROM products WHERE id = ?',
        params: [color.product_id]
      });
      return { product: productData || undefined, color, foundIn: 'color' };
    }

    // 3. البحث في المقاسات
    const size = await powerSyncService.queryOne<ProductSize>({
      sql: `SELECT * FROM product_sizes
       WHERE organization_id = ?
       AND barcode = ?
       LIMIT 1`,
      params: [orgId, barcodeTrimmed]
    });

    if (size) {
      const productData = await powerSyncService.queryOne<Product>({
        sql: 'SELECT * FROM products WHERE id = ?',
        params: [size.product_id]
      });
      const colorData = size.color_id
        ? await powerSyncService.queryOne<ProductColor>({
            sql: 'SELECT * FROM product_colors WHERE id = ?',
            params: [size.color_id]
          })
        : undefined;
      return { product: productData || undefined, color: colorData || undefined, size, foundIn: 'size' };
    }

    return null;
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const unifiedProductService = new UnifiedProductServiceClass();
export default unifiedProductService;
