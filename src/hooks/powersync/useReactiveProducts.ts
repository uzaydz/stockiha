/**
 * ⚡ useReactiveProducts - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook يستخدم useQuery من @powersync/react
 *    - تحديث تلقائي عند تغير البيانات
 *    - لا يستخدم getAll() أبداً
 *    - أداء ممتاز مع caching
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * - https://powersync-ja.github.io/powersync-js/react-sdk
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ReactiveProductColor {
  id: string;
  name: string;
  colorCode: string;
}

export interface ReactiveProductSize {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ReactiveProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  cost_price: number | null;
  purchase_price: number | null;
  quantity: number;
  stock_quantity: number;
  min_quantity: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  thumbnail_image: string | null;
  // ⚡ إعدادات الوحدات
  sell_by_box: boolean;
  units_per_box: number | null;
  sell_by_meter: boolean;
  roll_length_meters: number | null; // اسم الحقل في قاعدة البيانات
  roll_length: number | null; // للتوافق
  sell_by_weight: boolean;
  // ⚡ المتغيرات
  has_variants: boolean;
  colors?: ReactiveProductColor[];
  sizes?: ReactiveProductSize[];
}

export interface UseReactiveProductsOptions {
  categoryId?: string;
  isActive?: boolean;
  limit?: number;
  searchTerm?: string;
}

export interface UseReactiveProductsResult {
  products: ReactiveProduct[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveProducts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للمنتجات مع تحديث تلقائي (Reactive)
 *
 * @example
 * ```tsx
 * const { products, isLoading } = useReactiveProducts();
 * // products يتحدث تلقائياً عند أي تغيير في جدول products!
 * ```
 */
export function useReactiveProducts(options: UseReactiveProductsOptions = {}): UseReactiveProductsResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const {
    categoryId,
    isActive = true,
    limit = 500,
    searchTerm
  } = options;

  // بناء الاستعلام ديناميكياً
  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM products
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر النشط
    if (isActive !== undefined) {
      query += ` AND (is_active = ? OR is_active IS NULL)`;
      queryParams.push(isActive ? 1 : 0);
    }

    // فلتر التصنيف
    if (categoryId) {
      query += ` AND category_id = ?`;
      queryParams.push(categoryId);
    }

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ` AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // ⚡ ترتيب المنتجات الجديدة أولاً
    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, categoryId, isActive, searchTerm, limit]);

  // ⚡ Reactive Query - يتحدث تلقائياً عند أي تغيير!
  const { data, isLoading, isFetching, error } = useQuery<ReactiveProduct>(sql, params);

  // ⚡ استعلامات لجلب الألوان والمقاسات
  const productIds = useMemo(() => {
    if (!data) return [];
    return data.filter(p => p.has_variants).map(p => p.id);
  }, [data]);

  const colorsQuery = useMemo(() => {
    if (productIds.length === 0) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    const placeholders = productIds.map(() => '?').join(',');
    return {
      sql: `SELECT id, product_id, name, hex_code FROM product_colors WHERE product_id IN (${placeholders}) ORDER BY is_default DESC, id`,
      params: productIds
    };
  }, [productIds]);

  const sizesQuery = useMemo(() => {
    if (productIds.length === 0) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    const placeholders = productIds.map(() => '?').join(',');
    return {
      sql: `
        SELECT ps.id, ps.color_id, ps.name, ps.product_id
        FROM product_sizes ps
        WHERE ps.product_id IN (${placeholders})
        ORDER BY ps.id
      `,
      params: productIds
    };
  }, [productIds]);

  const { data: colorsData, isLoading: colorsLoading } = useQuery<{ id: string; product_id: string; name: string; hex_code: string }>(
    colorsQuery.sql, colorsQuery.params
  );

  const { data: sizesData, isLoading: sizesLoading } = useQuery<{ id: string; color_id: string; name: string; product_id: string }>(
    sizesQuery.sql, sizesQuery.params
  );

  // ⚡ حالة التحميل الشاملة (المنتجات + الألوان + المقاسات)
  const isFullyLoaded = !isLoading && (productIds.length === 0 || (!colorsLoading && !sizesLoading));

  // تحويل البيانات مع دمج الألوان والمقاسات
  const products = useMemo(() => {
    if (!data) return [];

    // تجميع الألوان حسب المنتج
    const colorsByProduct = new Map<string, ReactiveProductColor[]>();
    if (colorsData) {
      for (const color of colorsData) {
        if (!colorsByProduct.has(color.product_id)) {
          colorsByProduct.set(color.product_id, []);
        }
        colorsByProduct.get(color.product_id)!.push({
          id: color.id,
          name: color.name,
          colorCode: color.hex_code || '#000000'
        });
      }
    }

    // تجميع المقاسات حسب المنتج
    const sizesByProduct = new Map<string, ReactiveProductSize[]>();
    if (sizesData) {
      for (const size of sizesData) {
        if (!sizesByProduct.has(size.product_id)) {
          sizesByProduct.set(size.product_id, []);
        }
        // تجنب التكرار
        const existing = sizesByProduct.get(size.product_id)!;
        if (!existing.find(s => s.name === size.name)) {
          existing.push({
            id: size.id,
            name: size.name,
            sortOrder: existing.length
          });
        }
      }
    }

    return data.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      cost_price: p.cost_price ? Number(p.cost_price) : null,
      purchase_price: p.purchase_price ? Number(p.purchase_price) : null,
      quantity: Number(p.quantity) || 0,
      stock_quantity: Number(p.stock_quantity) || Number(p.quantity) || 0,
      min_quantity: p.min_quantity ? Number(p.min_quantity) : null,
      is_active: Boolean(p.is_active),
      has_variants: Boolean(p.has_variants),
      sell_by_box: Boolean(p.sell_by_box),
      units_per_box: p.units_per_box ? Number(p.units_per_box) : null,
      sell_by_meter: Boolean(p.sell_by_meter),
      roll_length_meters: p.roll_length_meters ? Number(p.roll_length_meters) : null,
      roll_length: p.roll_length_meters ? Number(p.roll_length_meters) : null, // للتوافق
      sell_by_weight: Boolean(p.sell_by_weight),
      colors: colorsByProduct.get(p.id),
      sizes: sizesByProduct.get(p.id),
    }));
  }, [data, colorsData, sizesData]);

  return {
    products,
    isLoading: !isFullyLoaded, // ⚡ نستخدم الحالة الشاملة
    isFetching,
    error: error || null,
    total: products.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Product Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لمنتج واحد (Reactive)
 */
export function useReactiveProduct(productId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !productId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM products WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [productId, orgId]
    };
  }, [productId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveProduct>(sql, params);

  const product = useMemo(() => {
    if (!data || data.length === 0) return null;
    const p = data[0];
    return {
      ...p,
      price: Number(p.price) || 0,
      cost_price: p.cost_price ? Number(p.cost_price) : null,
      quantity: Number(p.quantity) || 0,
      min_quantity: p.min_quantity ? Number(p.min_quantity) : null,
      is_active: Boolean(p.is_active),
    };
  }, [data]);

  return { product, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Product by Barcode Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للبحث بالباركود (Reactive)
 */
export function useReactiveProductByBarcode(barcode: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !barcode) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM products WHERE barcode = ? AND organization_id = ? LIMIT 1',
      params: [barcode, orgId]
    };
  }, [barcode, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveProduct>(sql, params);

  const product = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0];
  }, [data]);

  return { product, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Product Count Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد المنتجات (Reactive)
 */
export function useReactiveProductCount() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN quantity <= COALESCE(min_quantity, 5) AND quantity > 0 THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock
        FROM products
        WHERE organization_id = ?
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data, isLoading } = useQuery<{ total: number; active: number; low_stock: number; out_of_stock: number }>(sql, params);

  const counts = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, active: 0, lowStock: 0, outOfStock: 0 };
    }
    const row = data[0];
    return {
      total: Number(row.total) || 0,
      active: Number(row.active) || 0,
      lowStock: Number(row.low_stock) || 0,
      outOfStock: Number(row.out_of_stock) || 0
    };
  }, [data]);

  return { counts, isLoading };
}

export default useReactiveProducts;
