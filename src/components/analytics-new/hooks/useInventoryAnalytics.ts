/**
 * ============================================
 * STOCKIHA ANALYTICS - INVENTORY DATA HOOK
 * جلب وتحليل بيانات المخزون ورأس المال
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { FilterState, InventoryData, CapitalData, CategoryBreakdown } from '../types';

// ==================== Types ====================

export interface UseInventoryAnalyticsReturn {
  inventoryData: InventoryData | null;
  capitalData: CapitalData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== SQL Queries ====================

const buildInventoryQuery = (orgId: string, filters: FilterState) => {
  const { categories, productTypes } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  // partial_wholesale_price بدلاً من half_wholesale_price
  // لا يوجد max_stock_level أو track_inventory في Schema
  let sql = `
    SELECT
      p.id,
      p.name,
      p.sku,
      p.barcode,
      p.stock_quantity,
      p.min_stock_level,
      p.purchase_price,
      p.price as retail_price,
      p.wholesale_price,
      p.partial_wholesale_price,
      p.unit_type as product_type,
      p.category_id,
      p.is_active,
      p.has_variants,
      pc.name as category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.organization_id = ?
      AND (p.is_active = 1 OR p.is_active IS NULL)
  `;

  const params: any[] = [orgId];

  if (categories.length > 0) {
    sql += ` AND p.category_id IN (${categories.map(() => '?').join(',')})`;
    params.push(...categories);
  }

  if (productTypes.length > 0) {
    sql += ` AND p.unit_type IN (${productTypes.map(() => '?').join(',')})`;
    params.push(...productTypes);
  }

  sql += ' ORDER BY p.stock_quantity ASC';

  return { sql, params };
};

const buildVariantsQuery = (orgId: string) => {
  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  // product_colors: quantity بدلاً من stock_quantity
  // product_sizes: quantity بدلاً من stock_quantity
  const sql = `
    SELECT
      pco.id as color_id,
      pco.product_id,
      pco.name as color_name,
      pco.quantity as color_stock,
      ps.id as size_id,
      ps.size_name,
      ps.quantity as size_stock,
      ps.purchase_price as size_purchase_price,
      p.name as product_name,
      p.purchase_price as product_purchase_price
    FROM product_colors pco
    LEFT JOIN product_sizes ps ON pco.id = ps.color_id
    LEFT JOIN products p ON pco.product_id = p.id
    WHERE p.organization_id = ?
      AND p.has_variants = 1
      AND (p.is_active = 1 OR p.is_active IS NULL)
  `;

  return { sql, params: [orgId] };
};

// ==================== Data Processing ====================

const processInventoryData = (products: any[], variants: any[]): InventoryData => {
  // Calculate totals for regular products
  let totalProducts = products.length;
  let totalStock = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let overstockCount = 0;

  const lowStockProducts: InventoryData['lowStockProducts'] = [];
  const stockByCategory = new Map<string, { name: string; stock: number; count: number }>();
  const stockByType = new Map<string, { stock: number; count: number }>();

  const typeLabels: Record<string, string> = {
    piece: 'قطعة',
    weight: 'وزن',
    meter: 'متر',
    box: 'صندوق',
  };

  products.forEach((product) => {
    const stock = product.stock_quantity || 0;
    const minStock = product.min_stock_level || 0;
    // ⚡ max_stock_level غير موجود في Schema، نستخدم قيمة افتراضية
    const maxStock = minStock * 10 || 999999;
    const hasVariants = product.has_variants;

    // Skip stock calculation for products with variants (calculated separately)
    if (!hasVariants) {
      totalStock += stock;

      // Low stock
      if (stock > 0 && minStock > 0 && stock <= minStock) {
        lowStockCount++;
        lowStockProducts.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: stock,
          minStock,
          daysUntilOutOfStock: 0, // Would need sales velocity data
        });
      }

      // Out of stock
      if (stock <= 0) {
        outOfStockCount++;
      }

      // Overstock (تقريبي)
      if (minStock > 0 && stock > maxStock) {
        overstockCount++;
      }
    }

    // Stock by category
    const categoryId = product.category_id || 'uncategorized';
    const categoryName = product.category_name || 'بدون تصنيف';

    if (!stockByCategory.has(categoryId)) {
      stockByCategory.set(categoryId, { name: categoryName, stock: 0, count: 0 });
    }
    const cat = stockByCategory.get(categoryId)!;
    cat.stock += hasVariants ? 0 : stock;
    cat.count += 1;

    // Stock by type
    const productType = product.product_type || 'piece';
    if (!stockByType.has(productType)) {
      stockByType.set(productType, { stock: 0, count: 0 });
    }
    const t = stockByType.get(productType)!;
    t.stock += hasVariants ? 0 : stock;
    t.count += 1;
  });

  // Process variants
  const variantStock = new Map<string, number>();
  variants.forEach((v) => {
    const stock = v.size_stock || v.color_stock || 0;
    const productId = v.product_id;

    if (!variantStock.has(productId)) {
      variantStock.set(productId, 0);
    }
    variantStock.set(productId, variantStock.get(productId)! + stock);
    totalStock += stock;
  });

  // Convert category breakdown
  const categoryBreakdown: CategoryBreakdown[] = Array.from(stockByCategory.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.stock,
      count: data.count,
      percentage: totalStock > 0 ? (data.stock / totalStock) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Convert type breakdown
  const typeBreakdown: CategoryBreakdown[] = Array.from(stockByType.entries())
    .map(([type, data]) => ({
      id: type,
      name: typeLabels[type] || type,
      value: data.stock,
      count: data.count,
      percentage: totalStock > 0 ? (data.stock / totalStock) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalProducts,
    totalStock,
    totalValue: 0, // Calculated in capital data
    lowStockCount,
    outOfStockCount,
    overstockCount,
    stockByCategory: categoryBreakdown,
    stockByType: typeBreakdown,
    lowStockProducts: lowStockProducts.slice(0, 20), // Top 20
    stockMovement: [],
    turnoverRate: 0,
  };
};

const processCapitalData = (products: any[], variants: any[]): CapitalData => {
  let totalPurchaseValue = 0;
  let totalRetailValue = 0;
  let totalWholesaleValue = 0;
  let totalHalfWholesaleValue = 0;

  const capitalByCategory = new Map<string, {
    name: string;
    purchaseValue: number;
    retailValue: number;
    count: number
  }>();

  // Process regular products
  products.forEach((product) => {
    const stock = product.stock_quantity || 0;
    const purchasePrice = product.purchase_price || 0;
    const retailPrice = product.retail_price || 0;
    const wholesalePrice = product.wholesale_price || 0;
    // ⚡ تم التصحيح: partial_wholesale_price بدلاً من half_wholesale_price
    const halfWholesalePrice = product.partial_wholesale_price || 0;
    const hasVariants = product.has_variants;

    if (!hasVariants) {
      totalPurchaseValue += purchasePrice * stock;
      totalRetailValue += retailPrice * stock;
      totalWholesaleValue += wholesalePrice * stock;
      totalHalfWholesaleValue += halfWholesalePrice * stock;
    }

    // Capital by category
    const categoryId = product.category_id || 'uncategorized';
    const categoryName = product.category_name || 'بدون تصنيف';

    if (!capitalByCategory.has(categoryId)) {
      capitalByCategory.set(categoryId, { name: categoryName, purchaseValue: 0, retailValue: 0, count: 0 });
    }
    const cat = capitalByCategory.get(categoryId)!;
    if (!hasVariants) {
      cat.purchaseValue += purchasePrice * stock;
      cat.retailValue += retailPrice * stock;
    }
    cat.count += 1;
  });

  // Process variants
  variants.forEach((v) => {
    const stock = v.size_stock || v.color_stock || 0;
    const purchasePrice = v.size_purchase_price || v.product_purchase_price || 0;

    totalPurchaseValue += purchasePrice * stock;
  });

  // Calculate potential profit
  const potentialProfit = totalRetailValue - totalPurchaseValue;
  const potentialMargin = totalPurchaseValue > 0
    ? ((totalRetailValue - totalPurchaseValue) / totalPurchaseValue) * 100
    : 0;

  // Convert category breakdown
  const capitalBreakdown: CategoryBreakdown[] = Array.from(capitalByCategory.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.purchaseValue,
      count: data.count,
      percentage: totalPurchaseValue > 0 ? (data.purchaseValue / totalPurchaseValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalPurchaseValue,
    totalRetailValue,
    totalWholesaleValue,
    totalHalfWholesaleValue,
    potentialProfit,
    potentialMargin,
    capitalByCategory: capitalBreakdown,
    capitalByType: [], // Can be calculated similarly
    capitalGrowth: 0,
    investedCapital: totalPurchaseValue,
    zakatableCapital: totalPurchaseValue, // Simplified - actual Zakat calculation is more complex
  };
};

// ==================== Main Hook ====================

export function useInventoryAnalytics(filters: FilterState): UseInventoryAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // Build queries
  const inventoryQuery = useMemo(() => buildInventoryQuery(orgId, filters), [orgId, filters]);
  const variantsQuery = useMemo(() => buildVariantsQuery(orgId), [orgId]);

  // Execute queries
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError
  } = useQuery(inventoryQuery.sql, inventoryQuery.params);

  const {
    data: variantsData,
    isLoading: variantsLoading,
    error: variantsError
  } = useQuery(variantsQuery.sql, variantsQuery.params);

  // Process data
  const { inventoryData, capitalData } = useMemo(() => {
    if (!productsData) return { inventoryData: null, capitalData: null };

    const products = productsData as any[];
    const variants = (variantsData as any[]) || [];

    return {
      inventoryData: processInventoryData(products, variants),
      capitalData: processCapitalData(products, variants),
    };
  }, [productsData, variantsData]);

  return {
    inventoryData,
    capitalData,
    isLoading: productsLoading || variantsLoading,
    error: productsError || variantsError,
  };
}

export default useInventoryAnalytics;
