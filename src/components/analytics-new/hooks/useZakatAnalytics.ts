/**
 * ============================================
 * STOCKIHA ANALYTICS - ZAKAT CALCULATION HOOK
 * حساب الزكاة على المخزون ورأس المال
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { ZakatData, CategoryBreakdown } from '../types';

// ==================== Types ====================

export interface UseZakatAnalyticsReturn {
  data: ZakatData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== Constants ====================

// نصاب الزكاة بالذهب (85 جرام)
const GOLD_NISAB_GRAMS = 85;
// سعر تقريبي للجرام (يجب تحديثه)
const GOLD_PRICE_PER_GRAM_DZD = 12000; // ~12000 دج للجرام
// الحد الأدنى للنصاب
const NISAB_THRESHOLD_DZD = GOLD_NISAB_GRAMS * GOLD_PRICE_PER_GRAM_DZD; // ~1,020,000 دج

// نسبة الزكاة
const ZAKAT_RATE = 0.025; // 2.5%

// ==================== SQL Queries ====================

const buildInventoryValueQuery = (orgId: string) => {
  const sql = `
    SELECT
      p.id,
      p.name,
      p.stock_quantity,
      p.purchase_price,
      p.price as retail_price,
      p.category_id,
      p.has_variants,
      pc.name as category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.organization_id = ?
      AND (p.is_active = 1 OR p.is_active IS NULL)
      AND p.stock_quantity > 0
  `;

  return { sql, params: [orgId] };
};

const buildVariantsValueQuery = (orgId: string) => {
  const sql = `
    SELECT
      ps.stock_quantity,
      ps.purchase_price as size_purchase_price,
      pco.product_id,
      p.purchase_price as product_purchase_price
    FROM product_sizes ps
    INNER JOIN product_colors pco ON ps.color_id = pco.id
    INNER JOIN products p ON pco.product_id = p.id
    WHERE p.organization_id = ?
      AND (p.is_active = 1 OR p.is_active IS NULL)
      AND ps.stock_quantity > 0
  `;

  return { sql, params: [orgId] };
};

const buildCashQuery = (orgId: string) => {
  // Get latest work session closing cash as reference
  const sql = `
    SELECT
      closing_cash,
      end_time
    FROM staff_work_sessions
    WHERE organization_id = ?
      AND status = 'closed'
    ORDER BY end_time DESC
    LIMIT 1
  `;

  return { sql, params: [orgId] };
};

const buildReceivablesQuery = (orgId: string) => {
  // Customer debts that are expected to be collected
  const sql = `
    SELECT
      SUM(remaining_amount) as total_receivables
    FROM customer_debts
    WHERE organization_id = ?
      AND status != 'paid'
      AND remaining_amount > 0
  `;

  return { sql, params: [orgId] };
};

// ==================== Data Processing ====================

const processZakatData = (
  products: any[],
  variants: any[],
  cashData: any,
  receivables: number
): ZakatData => {
  // Calculate inventory value
  let inventoryPurchaseValue = 0;
  let inventoryRetailValue = 0;

  const categoryValues = new Map<string, {
    name: string;
    purchaseValue: number;
    retailValue: number
  }>();

  // Regular products
  products.forEach((p) => {
    if (p.has_variants) return; // Skip products with variants

    const stock = p.stock_quantity || 0;
    const purchasePrice = p.purchase_price || 0;
    const retailPrice = p.retail_price || 0;

    inventoryPurchaseValue += purchasePrice * stock;
    inventoryRetailValue += retailPrice * stock;

    // By category
    const catId = p.category_id || 'uncategorized';
    const catName = p.category_name || 'بدون تصنيف';

    if (!categoryValues.has(catId)) {
      categoryValues.set(catId, { name: catName, purchaseValue: 0, retailValue: 0 });
    }
    const cat = categoryValues.get(catId)!;
    cat.purchaseValue += purchasePrice * stock;
    cat.retailValue += retailPrice * stock;
  });

  // Variants
  variants.forEach((v) => {
    const stock = v.stock_quantity || 0;
    const purchasePrice = v.size_purchase_price || v.product_purchase_price || 0;

    inventoryPurchaseValue += purchasePrice * stock;
  });

  // Cash on hand
  const cashOnHand = cashData?.closing_cash || 0;

  // Total zakatables assets
  const totalZakatableAssets = inventoryPurchaseValue + cashOnHand + receivables;

  // Check if above Nisab
  const isAboveNisab = totalZakatableAssets >= NISAB_THRESHOLD_DZD;

  // Calculate Zakat
  const zakatOnInventory = inventoryPurchaseValue * ZAKAT_RATE;
  const zakatOnCash = cashOnHand * ZAKAT_RATE;
  const zakatOnReceivables = receivables * ZAKAT_RATE;
  const totalZakat = isAboveNisab ? totalZakatableAssets * ZAKAT_RATE : 0;

  // Category breakdown
  const zakatByCategory: CategoryBreakdown[] = Array.from(categoryValues.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.purchaseValue * ZAKAT_RATE,
      count: 0,
      percentage: inventoryPurchaseValue > 0
        ? (data.purchaseValue / inventoryPurchaseValue) * 100
        : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    // ⚡ تم تصحيح الأسماء لتتوافق مع ZakatData interface في types/index.ts
    inventoryValue: inventoryPurchaseValue,
    cashBalance: cashOnHand,               // السيولة النقدية
    bankBalance: 0,                        // الرصيد البنكي
    receivables,                           // الديون المستحقة (للمحل)
    subscriptionStock: 0,                  // مخزون الاشتراكات
    otherAssets: 0,                        // أصول أخرى
    totalAssets: totalZakatableAssets,     // إجمالي الأصول

    // الخصوم
    supplierDebts: 0,                      // ديون الموردين
    pendingExpenses: 0,                    // المصاريف المعلقة
    otherLiabilities: 0,                   // التزامات أخرى
    totalLiabilities: 0,                   // إجمالي الخصوم

    // حساب الزكاة
    netZakatableAssets: totalZakatableAssets,  // صافي الأصول الزكوية
    nisab: NISAB_THRESHOLD_DZD,                // حد النصاب الشرعي
    goldPricePerGram: GOLD_PRICE_PER_GRAM_DZD, // سعر جرام الذهب
    isNisabReached: isAboveNisab,              // هل بلغ النصاب
    zakatRate: ZAKAT_RATE,                     // نسبة الزكاة
    zakatAmount: totalZakat,                   // مبلغ الزكاة المستحقة

    // معلومات إضافية
    hijriYear: '1446',                         // السنة الهجرية
    calculationDate: new Date().toISOString(), // تاريخ الحساب
  };
};

// ==================== Main Hook ====================

export function useZakatAnalytics(): UseZakatAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // Build queries
  const inventoryQuery = useMemo(() => buildInventoryValueQuery(orgId), [orgId]);
  const variantsQuery = useMemo(() => buildVariantsValueQuery(orgId), [orgId]);
  const cashQuery = useMemo(() => buildCashQuery(orgId), [orgId]);
  const receivablesQuery = useMemo(() => buildReceivablesQuery(orgId), [orgId]);

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

  const {
    data: cashData,
    isLoading: cashLoading,
    error: cashError
  } = useQuery(cashQuery.sql, cashQuery.params);

  const {
    data: receivablesData,
    isLoading: receivablesLoading,
    error: receivablesError
  } = useQuery(receivablesQuery.sql, receivablesQuery.params);

  // Process data
  const zakatData = useMemo((): ZakatData | null => {
    if (!productsData) return null;

    const products = productsData as any[];
    const variants = (variantsData as any[]) || [];
    const cash = (cashData as any[])?.[0] || null;
    const receivables = ((receivablesData as any[])?.[0]?.total_receivables) || 0;

    return processZakatData(products, variants, cash, receivables);
  }, [productsData, variantsData, cashData, receivablesData]);

  return {
    data: zakatData,
    isLoading: productsLoading || variantsLoading || cashLoading || receivablesLoading,
    error: productsError || variantsError || cashError || receivablesError,
  };
}

export default useZakatAnalytics;
