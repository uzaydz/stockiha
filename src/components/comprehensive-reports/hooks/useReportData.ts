/**
 * Hook لجلب بيانات التقارير الشاملة
 * يدعم الوضع Online (Supabase) و Offline (SQLite/Tauri)
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { getDateRangeFromPreset } from '../utils';
import type {
  DateRange,
  ComprehensiveReportData,
  RevenueData,
  RevenueBreakdown,
  COGSData,
  CostsData,
  ExpensesByCategory,
  PurchasesSummary,
  ServicesData,
  InventoryValuation,
  LossesSummary,
  ReturnsSummary,
  ProfitData,
  ProfitBreakdown,
  ProfitTrend,
  ZakatData,
  DailySalesData,
  MonthlySalesData,
  TopSellingProduct,
  KPIData,
} from '../types';
import {
  formatDateForSQL,
  calculatePercentage,
  calculateProfitMargin,
  calculateZakat,
  calculateTrend,
  groupByDate,
  groupByMonth,
  sumBy,
  safeNumber,
  getApproximateHijriYear,
} from '../utils';
import { ZAKAT_CONSTANTS, EXPENSE_CATEGORIES } from '../constants';

// ==================== Types ====================

interface UseReportDataOptions {
  dateRange?: DateRange;
  enabled?: boolean;
}

interface RawOrderItem {
  quantity: number;
  unit_price: number;
  total_price?: number;
  product_id?: string;
  color_id?: string;
  size_id?: string;
  purchase_price?: number;
}

interface RawOrder {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  payment_method?: string;
  items?: RawOrderItem[];
  order_items?: RawOrderItem[];
}

// ==================== Helper Functions ====================

function isElectronApp(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    return Boolean(w.electronAPI || w.__ELECTRON__ || w.electron?.isElectron);
  } catch {
    return false;
  }
}

// ==================== Data Fetchers ====================

/**
 * جلب بيانات الطلبات (POS)
 */
async function fetchPOSOrders(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<RawOrder[]> {
  const fromDate = formatDateForSQL(dateRange.from);
  const toDate = formatDateForSQL(dateRange.to);

  if (isOffline) {
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
      sql: `SELECT o.*,
        (SELECT json_group_array(json_object(
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'product_id', oi.product_id,
          'color_id', oi.color_id,
          'size_id', oi.size_id
        )) FROM order_items oi WHERE oi.order_id = o.id) as items
       FROM orders o
       WHERE o.organization_id = ?
         AND o.created_at >= ?
         AND o.created_at <= ?
         AND o.status IN ('completed', 'paid')`,
      params: [organizationId, fromDate, toDate]
    });

    return (result || []).map((row: any) => ({
      ...row,
      items: row.items ? JSON.parse(row.items) : [],
    }));
  }

  // Online: Supabase
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        quantity,
        unit_price,
        total_price,
        product_id,
        color_id,
        size_id
      )
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .in('status', ['completed', 'paid']);

  if (error) throw error;

  return (data || []).map((order: any) => ({
    ...order,
    items: order.order_items || [],
  }));
}

/**
 * جلب بيانات الطلبات الأونلاين
 */
async function fetchOnlineOrders(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<RawOrder[]> {
  const fromDate = formatDateForSQL(dateRange.from);
  const toDate = formatDateForSQL(dateRange.to);

  if (isOffline) {
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
      sql: `SELECT oo.*,
        (SELECT json_group_array(json_object(
          'quantity', ooi.quantity,
          'unit_price', ooi.unit_price,
          'total_price', ooi.total_price,
          'product_id', ooi.product_id,
          'color_id', ooi.color_id,
          'size_id', ooi.size_id
        )) FROM online_order_items ooi WHERE ooi.order_id = oo.id) as items
       FROM online_orders oo
       WHERE oo.organization_id = ?
         AND oo.created_at >= ?
         AND oo.created_at <= ?
         AND oo.status IN ('completed', 'delivered')`,
      params: [organizationId, fromDate, toDate]
    });

    return (result || []).map((row: any) => ({
      ...row,
      items: row.items ? JSON.parse(row.items) : [],
    }));
  }

  const { data, error } = await supabase
    .from('online_orders')
    .select(`
      *,
      online_order_items (
        quantity,
        unit_price,
        total_price,
        product_id,
        color_id,
        size_id
      )
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .in('status', ['completed', 'delivered']);

  if (error) throw error;

  return (data || []).map((order: any) => ({
    ...order,
    items: order.online_order_items || [],
  }));
}

/**
 * جلب بيانات المنتجات مع الألوان والمقاسات
 */
async function fetchProducts(
  organizationId: string,
  isOffline: boolean
): Promise<Map<string, { purchasePrice: number; colorPrices: Map<string, number>; sizePrices: Map<string, number> }>> {
  const productMap = new Map();

  try {
    if (isOffline) {
      // ⚡ استخدام PowerSync مباشرة
      // جلب المنتجات
      const products = await powerSyncService.query<{ id: string; purchase_price: number }>({
        sql: `SELECT id, purchase_price FROM products WHERE organization_id = ?`,
        params: [organizationId]
      });

      // جلب ألوان المنتجات عبر product_id
      const colors = await powerSyncService.query<{ id: string; product_id: string; purchase_price: number }>({
        sql: `SELECT pc.id, pc.product_id, pc.purchase_price
         FROM product_colors pc
         INNER JOIN products p ON pc.product_id = p.id
         WHERE p.organization_id = ?`,
        params: [organizationId]
      });

      // جلب مقاسات المنتجات عبر product_id
      const sizes = await powerSyncService.query<{ id: string; product_id: string; purchase_price: number }>({
        sql: `SELECT ps.id, ps.product_id, ps.purchase_price
         FROM product_sizes ps
         INNER JOIN products p ON ps.product_id = p.id
         WHERE p.organization_id = ?`,
        params: [organizationId]
      });

      // بناء الخريطة
      for (const product of products || []) {
        productMap.set(product.id, {
          purchasePrice: safeNumber(product.purchase_price),
          colorPrices: new Map(),
          sizePrices: new Map(),
        });
      }

      for (const color of colors || []) {
        const product = productMap.get(color.product_id);
        if (product && color.purchase_price) {
          product.colorPrices.set(color.id, safeNumber(color.purchase_price));
        }
      }

      for (const size of sizes || []) {
        const product = productMap.get(size.product_id);
        if (product && size.purchase_price) {
          product.sizePrices.set(size.id, safeNumber(size.purchase_price));
        }
      }
    } else {
      // Online - جلب المنتجات مع الألوان والمقاسات في استعلام واحد
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          purchase_price,
          product_colors (id, purchase_price),
          product_sizes (id, purchase_price)
        `)
        .eq('organization_id', organizationId);

      if (productsError) {
        console.warn('[ReportData] Error fetching products:', productsError.message);
        return productMap;
      }

      for (const product of products || []) {
        const productData = {
          purchasePrice: safeNumber(product.purchase_price),
          colorPrices: new Map<string, number>(),
          sizePrices: new Map<string, number>(),
        };

        // إضافة أسعار الألوان
        for (const color of (product as any).product_colors || []) {
          if (color.purchase_price) {
            productData.colorPrices.set(color.id, safeNumber(color.purchase_price));
          }
        }

        // إضافة أسعار المقاسات
        for (const size of (product as any).product_sizes || []) {
          if (size.purchase_price) {
            productData.sizePrices.set(size.id, safeNumber(size.purchase_price));
          }
        }

        productMap.set(product.id, productData);
      }
    }
  } catch (err) {
    console.warn('[ReportData] Error fetching products:', err);
  }

  return productMap;
}

/**
 * جلب المصاريف
 */
async function fetchExpenses(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<any[]> {
  const fromDate = formatDateForSQL(dateRange.from);
  const toDate = formatDateForSQL(dateRange.to);

  if (isOffline) {
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
      sql: `SELECT * FROM expenses
       WHERE organization_id = ?
         AND expense_date >= ?
         AND expense_date <= ?`,
      params: [organizationId, fromDate, toDate]
    });
    return result || [];
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('expense_date', fromDate)
    .lte('expense_date', toDate);

  if (error) throw error;
  return data || [];
}

/**
 * جلب المشتريات
 */
async function fetchPurchases(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<any[]> {
  const fromDate = formatDateForSQL(dateRange.from);
  const toDate = formatDateForSQL(dateRange.to);

  if (isOffline) {
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
      sql: `SELECT sp.*, s.name as supplier_name
       FROM supplier_purchases sp
       LEFT JOIN suppliers s ON sp.supplier_id = s.id
       WHERE sp.organization_id = ?
         AND sp.purchase_date >= ?
         AND sp.purchase_date <= ?`,
      params: [organizationId, fromDate, toDate]
    });
    return result || [];
  }

  const { data, error } = await supabase
    .from('supplier_purchases')
    .select(`
      *,
      suppliers (name)
    `)
    .eq('organization_id', organizationId)
    .gte('purchase_date', fromDate)
    .lte('purchase_date', toDate);

  if (error) throw error;

  return (data || []).map((p: any) => ({
    ...p,
    supplier_name: p.suppliers?.name || 'غير محدد',
  }));
}

/**
 * جلب خدمات الإصلاح
 */
async function fetchRepairServices(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<any[]> {
  const fromDate = formatDateForSQL(dateRange.from);
  const toDate = formatDateForSQL(dateRange.to);

  if (isOffline) {
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
      sql: `SELECT * FROM repair_orders
       WHERE organization_id = ?
         AND created_at >= ?
         AND created_at <= ?`,
      params: [organizationId, fromDate, toDate]
    });
    return result || [];
  }

  const { data, error } = await supabase
    .from('repair_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  if (error) throw error;
  return data || [];
}

/**
 * جلب خدمات الاشتراكات
 * البيانات الكمية (total_quantity, sold_quantity, available_quantity) موجودة مباشرة في subscription_services
 */
async function fetchSubscriptionServices(
  organizationId: string,
  isOffline: boolean
): Promise<any[]> {
  try {
    if (isOffline) {
      // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
        sql: `SELECT * FROM subscription_services WHERE organization_id = ?`,
        params: [organizationId]
      });
      return result || [];
    }

    const { data, error } = await supabase
      .from('subscription_services')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      console.warn('[ReportData] subscription_services not available:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('[ReportData] Error fetching subscription_services:', err);
    return [];
  }
}

/**
 * جلب مبيعات الاشتراكات
 * ملاحظة: جدول subscription_sales غير موجود حالياً، نستخدم البيانات من subscription_services
 */
async function fetchSubscriptionSales(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<any[]> {
  // جدول subscription_sales غير موجود، نرجع مصفوفة فارغة
  // يمكن حساب المبيعات من subscription_services.sold_quantity
  console.info('[ReportData] subscription_sales table not available, using subscription_services data');
  return [];
}

/**
 * جلب الخسائر
 */
async function fetchLosses(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<any[]> {
  const fromDate = formatDateForSQL(dateRange.from);
  const toDate = formatDateForSQL(dateRange.to);

  try {
    if (isOffline) {
      // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
        sql: `SELECT l.*,
          (SELECT SUM(li.total_cost_value) FROM loss_items li WHERE li.loss_id = l.id) as calc_cost_value,
          (SELECT SUM(li.total_selling_value) FROM loss_items li WHERE li.loss_id = l.id) as calc_selling_value,
          (SELECT COUNT(*) FROM loss_items li WHERE li.loss_id = l.id) as items_count
         FROM losses l
         WHERE l.organization_id = ?
           AND l.incident_date >= ?
           AND l.incident_date <= ?`,
        params: [organizationId, fromDate, toDate]
      });
      return (result.data || []).map((loss: any) => ({
        ...loss,
        total_cost_value: loss.calc_cost_value || loss.total_cost_value || 0,
        total_selling_value: loss.calc_selling_value || loss.total_selling_value || 0,
      }));
    }

    // Online: جلب الخسائر مع عناصرها
    const { data, error } = await supabase
      .from('losses')
      .select(`
        *,
        loss_items (
          total_cost_value,
          total_selling_value
        )
      `)
      .eq('organization_id', organizationId)
      .gte('incident_date', fromDate)
      .lte('incident_date', toDate);

    if (error) {
      console.warn('[ReportData] Error fetching losses:', error.message);
      return [];
    }

    return (data || []).map((loss: any) => ({
      ...loss,
      // استخدام القيم من loss_items أو من الجدول الرئيسي
      total_cost_value: (loss.loss_items || []).reduce(
        (sum: number, item: any) => sum + safeNumber(item.total_cost_value), 0
      ) || loss.total_cost_value || 0,
      total_selling_value: (loss.loss_items || []).reduce(
        (sum: number, item: any) => sum + safeNumber(item.total_selling_value), 0
      ) || loss.total_selling_value || 0,
      items_count: loss.total_items_count || (loss.loss_items || []).length,
    }));
  } catch (err) {
    console.warn('[ReportData] Error fetching losses:', err);
    return [];
  }
}

/**
 * جلب المرتجعات
 */
async function fetchReturns(
  organizationId: string,
  dateRange: DateRange,
  isOffline: boolean
): Promise<any[]> {
  const fromDate = formatDateForSQL(dateRange.from);
  const toDate = formatDateForSQL(dateRange.to);

  try {
    if (isOffline) {
      // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
        sql: `SELECT * FROM returns
         WHERE organization_id = ?
           AND created_at >= ?
           AND created_at <= ?`,
        params: [organizationId, fromDate, toDate]
      });
      return result || [];
    }

    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (error) {
      console.warn('[ReportData] Error fetching returns:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[ReportData] Error fetching returns:', err);
    return [];
  }
}

/**
 * جلب المخزون الكامل
 */
async function fetchInventory(
  organizationId: string,
  isOffline: boolean
): Promise<any[]> {
  try {
    if (isOffline) {
      // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
        sql: `SELECT p.id, p.name, p.sku, p.barcode, p.stock_quantity, p.purchase_price, p.price,
          (SELECT json_group_array(json_object('id', pc.id, 'color_name', pc.name, 'quantity', pc.quantity, 'purchase_price', pc.purchase_price, 'price', pc.price))
           FROM product_colors pc WHERE pc.product_id = p.id) as colors,
          (SELECT json_group_array(json_object('id', ps.id, 'size_name', ps.size_name, 'quantity', ps.quantity, 'purchase_price', ps.purchase_price, 'price', ps.price))
           FROM product_sizes ps WHERE ps.product_id = p.id) as sizes
         FROM products p
         WHERE p.organization_id = ? AND p.is_active = 1`,
        params: [organizationId]
      });

      return (result || []).map((row: any) => ({
        ...row,
        colors: row.colors ? JSON.parse(row.colors).filter((c: any) => c.id) : [],
        sizes: row.sizes ? JSON.parse(row.sizes).filter((s: any) => s.id) : [],
      }));
    }

    // Online: جلب المنتجات مع الألوان والمقاسات
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, sku, barcode, stock_quantity, purchase_price, price,
        product_colors (id, name, quantity, purchase_price, price),
        product_sizes (id, size_name, quantity, purchase_price, price)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      console.warn('[ReportData] Error fetching inventory:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      colors: (p.product_colors || []).map((c: any) => ({
        ...c,
        color_name: c.name,
      })),
      sizes: p.product_sizes || [],
    }));
  } catch (err) {
    console.warn('[ReportData] Error fetching inventory:', err);
    return [];
  }
}

/**
 * جلب ديون الموردين
 */
async function fetchSupplierDebts(
  organizationId: string,
  isOffline: boolean
): Promise<number> {
  if (isOffline) {
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query({
      sql: `SELECT SUM(balance_due) as total_debt
       FROM supplier_purchases
       WHERE organization_id = ?
         AND balance_due > 0`,
      params: [organizationId]
    });
    return safeNumber(result?.[0]?.total_debt);
  }

  const { data, error } = await supabase
    .from('supplier_purchases')
    .select('balance_due')
    .eq('organization_id', organizationId)
    .gt('balance_due', 0);

  if (error) throw error;

  return (data || []).reduce((sum, p) => sum + safeNumber(p.balance_due), 0);
}

// ==================== Data Processing ====================

/**
 * حساب تكلفة البضاعة المباعة (COGS) مع مراعاة الألوان والمقاسات
 */
function calculateCOGS(
  items: RawOrderItem[],
  productMap: Map<string, { purchasePrice: number; colorPrices: Map<string, number>; sizePrices: Map<string, number> }>
): number {
  let totalCOGS = 0;

  for (const item of items) {
    const product = productMap.get(item.product_id || '');
    if (!product) continue;

    let purchasePrice = product.purchasePrice;

    // الأولوية: سعر اللون > سعر المقاس > سعر المنتج
    if (item.color_id && product.colorPrices.has(item.color_id)) {
      purchasePrice = product.colorPrices.get(item.color_id)!;
    } else if (item.size_id && product.sizePrices.has(item.size_id)) {
      purchasePrice = product.sizePrices.get(item.size_id)!;
    }

    totalCOGS += purchasePrice * safeNumber(item.quantity);
  }

  return totalCOGS;
}

/**
 * معالجة بيانات المبيعات اليومية
 */
function processDailySales(
  posOrders: RawOrder[],
  onlineOrders: RawOrder[],
  dateRange: DateRange
): DailySalesData[] {
  const dailyData: Record<string, DailySalesData> = {};

  // إنشاء سجلات لكل يوم في النطاق
  const currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dailyData[dateStr] = {
      date: dateStr,
      posSales: 0,
      onlineSales: 0,
      totalSales: 0,
      ordersCount: 0,
      avgOrderValue: 0,
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // معالجة طلبات POS
  for (const order of posOrders) {
    const dateStr = new Date(order.created_at).toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].posSales += safeNumber(order.total_amount);
      dailyData[dateStr].ordersCount += 1;
    }
  }

  // معالجة طلبات Online
  for (const order of onlineOrders) {
    const dateStr = new Date(order.created_at).toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].onlineSales += safeNumber(order.total_amount);
      dailyData[dateStr].ordersCount += 1;
    }
  }

  // حساب الإجماليات والمتوسطات
  return Object.values(dailyData).map(day => ({
    ...day,
    totalSales: day.posSales + day.onlineSales,
    avgOrderValue: day.ordersCount > 0 ? (day.posSales + day.onlineSales) / day.ordersCount : 0,
  }));
}

/**
 * معالجة بيانات المبيعات الشهرية
 */
function processMonthlySales(
  posOrders: RawOrder[],
  onlineOrders: RawOrder[],
  expenses: any[]
): MonthlySalesData[] {
  const monthlyData: Record<string, MonthlySalesData> = {};

  // معالجة طلبات POS
  for (const order of posOrders) {
    const monthStr = new Date(order.created_at).toISOString().slice(0, 7);
    if (!monthlyData[monthStr]) {
      monthlyData[monthStr] = {
        month: monthStr,
        posSales: 0,
        onlineSales: 0,
        totalSales: 0,
        expenses: 0,
        profit: 0,
        ordersCount: 0,
      };
    }
    monthlyData[monthStr].posSales += safeNumber(order.total_amount);
    monthlyData[monthStr].ordersCount += 1;
  }

  // معالجة طلبات Online
  for (const order of onlineOrders) {
    const monthStr = new Date(order.created_at).toISOString().slice(0, 7);
    if (!monthlyData[monthStr]) {
      monthlyData[monthStr] = {
        month: monthStr,
        posSales: 0,
        onlineSales: 0,
        totalSales: 0,
        expenses: 0,
        profit: 0,
        ordersCount: 0,
      };
    }
    monthlyData[monthStr].onlineSales += safeNumber(order.total_amount);
    monthlyData[monthStr].ordersCount += 1;
  }

  // معالجة المصاريف
  for (const expense of expenses) {
    const monthStr = new Date(expense.expense_date || expense.created_at).toISOString().slice(0, 7);
    if (monthlyData[monthStr]) {
      monthlyData[monthStr].expenses += safeNumber(expense.amount);
    }
  }

  return Object.values(monthlyData).map(month => ({
    ...month,
    totalSales: month.posSales + month.onlineSales,
    profit: month.posSales + month.onlineSales - month.expenses,
  })).sort((a, b) => a.month.localeCompare(b.month));
}

// ==================== Main Data Fetcher ====================

async function fetchComprehensiveReportData(
  organizationId: string,
  dateRange: DateRange
): Promise<ComprehensiveReportData> {
  const isOffline = isElectronApp() && !navigator.onLine;

  // جلب كل البيانات بالتوازي
  const [
    posOrders,
    onlineOrders,
    productMap,
    expenses,
    purchases,
    repairServices,
    subscriptionServices,
    subscriptionSales,
    losses,
    returns,
    inventory,
    supplierDebts,
  ] = await Promise.all([
    fetchPOSOrders(organizationId, dateRange, isOffline),
    fetchOnlineOrders(organizationId, dateRange, isOffline),
    fetchProducts(organizationId, isOffline),
    fetchExpenses(organizationId, dateRange, isOffline),
    fetchPurchases(organizationId, dateRange, isOffline),
    fetchRepairServices(organizationId, dateRange, isOffline),
    fetchSubscriptionServices(organizationId, isOffline),
    fetchSubscriptionSales(organizationId, dateRange, isOffline),
    fetchLosses(organizationId, dateRange, isOffline),
    fetchReturns(organizationId, dateRange, isOffline),
    fetchInventory(organizationId, isOffline),
    fetchSupplierDebts(organizationId, isOffline),
  ]);

  // ==================== حساب الإيرادات ====================
  const posSalesTotal = posOrders.reduce((sum, o) => sum + safeNumber(o.total_amount), 0);
  const onlineSalesTotal = onlineOrders.reduce((sum, o) => sum + safeNumber(o.total_amount), 0);
  const repairServicesTotal = repairServices.reduce((sum, r) => sum + safeNumber(r.total_price || r.estimated_cost), 0);
  // حساب مبيعات الاشتراكات من subscription_services (sold_quantity * selling_price)
  const subscriptionSalesTotal = subscriptionServices.reduce(
    (sum, s) => sum + safeNumber(s.sold_quantity) * safeNumber(s.selling_price), 0
  );

  const revenue: RevenueData = {
    posSales: posSalesTotal,
    onlineSales: onlineSalesTotal,
    repairServices: repairServicesTotal,
    subscriptionSales: subscriptionSalesTotal,
    totalRevenue: posSalesTotal + onlineSalesTotal + repairServicesTotal + subscriptionSalesTotal,
  };

  const revenueBreakdown: RevenueBreakdown[] = [
    {
      source: 'pos',
      sourceName: 'مبيعات نقطة البيع',
      amount: posSalesTotal,
      percentage: calculatePercentage(posSalesTotal, revenue.totalRevenue),
      ordersCount: posOrders.length,
    },
    {
      source: 'online',
      sourceName: 'مبيعات أونلاين',
      amount: onlineSalesTotal,
      percentage: calculatePercentage(onlineSalesTotal, revenue.totalRevenue),
      ordersCount: onlineOrders.length,
    },
    {
      source: 'repair',
      sourceName: 'خدمات الإصلاح',
      amount: repairServicesTotal,
      percentage: calculatePercentage(repairServicesTotal, revenue.totalRevenue),
      ordersCount: repairServices.length,
    },
    {
      source: 'subscription',
      sourceName: 'خدمات الاشتراكات',
      amount: subscriptionSalesTotal,
      percentage: calculatePercentage(subscriptionSalesTotal, revenue.totalRevenue),
      ordersCount: subscriptionServices.reduce((sum, s) => sum + safeNumber(s.sold_quantity), 0),
    },
  ];

  // ==================== حساب التكاليف ====================
  const posItemsCOGS = calculateCOGS(
    posOrders.flatMap(o => o.items || []),
    productMap
  );
  const onlineItemsCOGS = calculateCOGS(
    onlineOrders.flatMap(o => o.items || []),
    productMap
  );
  // حساب COGS للاشتراكات من subscription_services
  const subscriptionCOGS = subscriptionServices.reduce(
    (sum, s) => sum + safeNumber(s.sold_quantity) * safeNumber(s.purchase_price),
    0
  );

  const cogs: COGSData = {
    posItemsCost: posItemsCOGS,
    onlineItemsCost: onlineItemsCOGS,
    subscriptionCost: subscriptionCOGS,
    totalCOGS: posItemsCOGS + onlineItemsCOGS + subscriptionCOGS,
  };

  // معالجة المصاريف حسب الفئة
  const expensesByCategory: ExpensesByCategory[] = Object.values(
    expenses.reduce((acc: Record<string, ExpensesByCategory>, exp) => {
      const category = exp.category || 'other';
      const categoryInfo = EXPENSE_CATEGORIES[category as keyof typeof EXPENSE_CATEGORIES] || EXPENSE_CATEGORIES.other;

      if (!acc[category]) {
        acc[category] = {
          category,
          categoryName: categoryInfo.label,
          categoryColor: categoryInfo.color,
          amount: 0,
          count: 0,
          percentage: 0,
        };
      }
      acc[category].amount += safeNumber(exp.amount);
      acc[category].count += 1;
      return acc;
    }, {})
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + safeNumber(e.amount), 0);

  // حساب النسب المئوية للمصاريف
  expensesByCategory.forEach(cat => {
    cat.percentage = calculatePercentage(cat.amount, totalExpenses);
  });

  const costs: CostsData = {
    cogs,
    operatingExpenses: totalExpenses,
    expensesByCategory,
    totalCosts: cogs.totalCOGS + totalExpenses,
  };

  // ==================== حساب المشتريات ====================
  const purchasesSummary: PurchasesSummary = {
    totalPurchases: purchases.reduce((sum, p) => sum + safeNumber(p.total_amount), 0),
    totalPaid: purchases.reduce((sum, p) => sum + safeNumber(p.paid_amount), 0),
    totalBalance: purchases.reduce((sum, p) => sum + safeNumber(p.balance_due), 0),
    purchasesCount: purchases.length,
    bySupplier: Object.values(
      purchases.reduce((acc: Record<string, any>, p) => {
        const supplierId = p.supplier_id || 'unknown';
        if (!acc[supplierId]) {
          acc[supplierId] = {
            supplierId,
            supplierName: p.supplier_name || 'غير محدد',
            totalAmount: 0,
            purchasesCount: 0,
          };
        }
        acc[supplierId].totalAmount += safeNumber(p.total_amount);
        acc[supplierId].purchasesCount += 1;
        return acc;
      }, {})
    ),
  };

  // ==================== حساب الخدمات ====================
  const repairsPaid = repairServices
    .filter(r => r.status === 'completed' || r.payment_status === 'paid')
    .reduce((sum, r) => sum + safeNumber(r.total_price || r.estimated_cost), 0);

  const services: ServicesData = {
    repairs: {
      totalRevenue: repairServicesTotal,
      paidAmount: repairsPaid,
      pendingAmount: repairServicesTotal - repairsPaid,
      completedCount: repairServices.filter(r => r.status === 'completed').length,
      pendingCount: repairServices.filter(r => r.status !== 'completed').length,
      byDeviceType: Object.values(
        repairServices.reduce((acc: Record<string, any>, r) => {
          const deviceType = r.device_type || 'other';
          if (!acc[deviceType]) {
            acc[deviceType] = { deviceType, count: 0, revenue: 0 };
          }
          acc[deviceType].count += 1;
          acc[deviceType].revenue += safeNumber(r.total_price || r.estimated_cost);
          return acc;
        }, {})
      ),
    },
    subscriptions: {
      services: subscriptionServices.map(s => ({
        serviceName: s.name,
        provider: s.provider || '',
        purchasePrice: safeNumber(s.purchase_price),
        sellingPrice: safeNumber(s.selling_price),
        profitAmount: safeNumber(s.selling_price) - safeNumber(s.purchase_price),
        profitMargin: calculateProfitMargin(
          safeNumber(s.selling_price) - safeNumber(s.purchase_price),
          safeNumber(s.selling_price)
        ),
        totalQuantity: safeNumber(s.total_quantity),
        soldQuantity: safeNumber(s.sold_quantity),
        availableQuantity: safeNumber(s.available_quantity),
        totalRevenue: safeNumber(s.sold_quantity) * safeNumber(s.selling_price),
        totalProfit: safeNumber(s.sold_quantity) * (safeNumber(s.selling_price) - safeNumber(s.purchase_price)),
      })),
      totalRevenue: subscriptionSalesTotal,
      totalProfit: subscriptionSalesTotal - subscriptionCOGS,
      totalSold: subscriptionServices.reduce((sum, s) => sum + safeNumber(s.sold_quantity), 0),
    },
  };

  // ==================== حساب المخزون ====================
  let inventoryTotalCost = 0;
  let inventoryTotalSelling = 0;
  let totalItems = 0;

  for (const product of inventory) {
    const baseQuantity = safeNumber(product.stock_quantity);
    const basePurchasePrice = safeNumber(product.purchase_price || product.cost);
    const baseSellingPrice = safeNumber(product.price);

    // منتج بسيط
    if ((!product.colors || product.colors.length === 0) && (!product.sizes || product.sizes.length === 0)) {
      inventoryTotalCost += basePurchasePrice * baseQuantity;
      inventoryTotalSelling += baseSellingPrice * baseQuantity;
      totalItems += baseQuantity;
    }

    // منتج مع ألوان
    for (const color of product.colors || []) {
      const qty = safeNumber(color.quantity);
      const purchasePrice = safeNumber(color.purchase_price) || basePurchasePrice;
      const sellingPrice = safeNumber(color.price) || baseSellingPrice;
      inventoryTotalCost += purchasePrice * qty;
      inventoryTotalSelling += sellingPrice * qty;
      totalItems += qty;
    }

    // منتج مع مقاسات
    for (const size of product.sizes || []) {
      const qty = safeNumber(size.quantity);
      const purchasePrice = safeNumber(size.purchase_price) || basePurchasePrice;
      const sellingPrice = safeNumber(size.price) || baseSellingPrice;
      inventoryTotalCost += purchasePrice * qty;
      inventoryTotalSelling += sellingPrice * qty;
      totalItems += qty;
    }
  }

  const inventoryValuation: InventoryValuation = {
    simpleProductsValue: inventoryTotalCost * 0.6, // تقدير تقريبي
    colorVariantsValue: inventoryTotalCost * 0.25,
    sizeVariantsValue: inventoryTotalCost * 0.15,
    totalCostValue: inventoryTotalCost,
    totalSellingValue: inventoryTotalSelling,
    potentialProfit: inventoryTotalSelling - inventoryTotalCost,
    itemsCount: totalItems,
  };

  // ==================== حساب الخسائر ====================
  const lossesSummary: LossesSummary = {
    totalCostValue: losses.reduce((sum, l) => sum + safeNumber(l.total_cost_value), 0),
    totalSellingValue: losses.reduce((sum, l) => sum + safeNumber(l.total_selling_value), 0),
    totalItemsLost: losses.reduce((sum, l) => sum + safeNumber(l.items_count), 0),
    incidentsCount: losses.length,
    byType: Object.values(
      losses.reduce((acc: Record<string, any>, l) => {
        const type = l.loss_type || 'other';
        if (!acc[type]) {
          acc[type] = { lossType: type, count: 0, costValue: 0 };
        }
        acc[type].count += 1;
        acc[type].costValue += safeNumber(l.total_cost_value);
        return acc;
      }, {})
    ),
    byCategory: [],
  };

  // ==================== حساب المرتجعات ====================
  const returnsSummary: ReturnsSummary = {
    totalReturnValue: returns.reduce((sum, r) => sum + safeNumber(r.return_amount), 0),
    totalRefunded: returns.reduce((sum, r) => sum + safeNumber(r.refund_amount), 0),
    totalRestockingFees: returns.reduce((sum, r) => sum + safeNumber(r.restocking_fee), 0),
    returnsCount: returns.length,
    byReason: Object.values(
      returns.reduce((acc: Record<string, any>, r) => {
        const reason = r.return_reason || 'other';
        if (!acc[reason]) {
          acc[reason] = { reason, count: 0, amount: 0 };
        }
        acc[reason].count += 1;
        acc[reason].amount += safeNumber(r.return_amount);
        return acc;
      }, {})
    ),
    byType: [],
  };

  // ==================== حساب الأرباح ====================
  const grossProfit = revenue.totalRevenue - cogs.totalCOGS;
  const netProfit = grossProfit - totalExpenses - lossesSummary.totalCostValue - returnsSummary.totalRefunded;

  const profit: ProfitData = {
    grossRevenue: revenue.totalRevenue,
    cogs: cogs.totalCOGS,
    grossProfit,
    grossProfitMargin: calculateProfitMargin(grossProfit, revenue.totalRevenue),
    operatingExpenses: totalExpenses,
    losses: lossesSummary.totalCostValue,
    returns: returnsSummary.totalRefunded,
    netProfit,
    netProfitMargin: calculateProfitMargin(netProfit, revenue.totalRevenue),
  };

  const profitBreakdown: ProfitBreakdown[] = [
    {
      source: 'pos',
      sourceName: 'مبيعات نقطة البيع',
      revenue: posSalesTotal,
      cost: posItemsCOGS,
      profit: posSalesTotal - posItemsCOGS,
      margin: calculateProfitMargin(posSalesTotal - posItemsCOGS, posSalesTotal),
    },
    {
      source: 'online',
      sourceName: 'مبيعات أونلاين',
      revenue: onlineSalesTotal,
      cost: onlineItemsCOGS,
      profit: onlineSalesTotal - onlineItemsCOGS,
      margin: calculateProfitMargin(onlineSalesTotal - onlineItemsCOGS, onlineSalesTotal),
    },
    {
      source: 'repair',
      sourceName: 'خدمات الإصلاح',
      revenue: repairServicesTotal,
      cost: 0,
      profit: repairServicesTotal,
      margin: 100,
    },
    {
      source: 'subscription',
      sourceName: 'خدمات الاشتراكات',
      revenue: subscriptionSalesTotal,
      cost: subscriptionCOGS,
      profit: subscriptionSalesTotal - subscriptionCOGS,
      margin: calculateProfitMargin(subscriptionSalesTotal - subscriptionCOGS, subscriptionSalesTotal),
    },
  ];

  // ==================== حساب الزكاة ====================
  const totalAssets = inventoryTotalCost + revenue.totalRevenue * 0.1; // تقدير النقدية
  const subscriptionStockValue = subscriptionServices.reduce(
    (sum, s) => sum + safeNumber(s.available_quantity) * safeNumber(s.purchase_price),
    0
  );

  const zakatAssets = {
    cashInHand: revenue.totalRevenue * 0.05,
    bankBalance: revenue.totalRevenue * 0.05,
    inventoryValue: inventoryTotalCost,
    receivables: 0,
    subscriptionStock: subscriptionStockValue,
    otherAssets: 0,
    totalAssets: inventoryTotalCost + subscriptionStockValue + revenue.totalRevenue * 0.1,
  };

  const zakatLiabilities = {
    supplierDebts,
    pendingExpenses: totalExpenses * 0.1,
    otherLiabilities: 0,
    totalLiabilities: supplierDebts + totalExpenses * 0.1,
  };

  const zakatableBase = zakatAssets.totalAssets - zakatLiabilities.totalLiabilities;
  const zakatCalc = calculateZakat(zakatableBase);

  const zakat: ZakatData = {
    assets: zakatAssets,
    liabilities: zakatLiabilities,
    zakatableBase,
    nisab: zakatCalc.nisab,
    goldPricePerGram: ZAKAT_CONSTANTS.defaultGoldPricePerGram,
    isNisabReached: zakatCalc.isNisabReached,
    zakatRate: ZAKAT_CONSTANTS.rate * 100,
    zakatAmount: zakatCalc.zakatAmount,
    hijriYear: getApproximateHijriYear(),
    calculationDate: new Date().toISOString(),
  };

  // ==================== حساب KPIs ====================
  const kpi: KPIData = {
    revenue: calculateTrend(revenue.totalRevenue, 0),
    costs: calculateTrend(costs.totalCosts, 0),
    profit: {
      ...calculateTrend(profit.netProfit, 0),
      margin: profit.netProfitMargin,
    },
    zakat: {
      value: zakat.zakatAmount,
      isEligible: zakat.isNisabReached,
      rate: zakat.zakatRate,
    },
  };

  // ==================== المبيعات اليومية والشهرية ====================
  const dailySales = processDailySales(posOrders, onlineOrders, dateRange);
  const monthlySales = processMonthlySales(posOrders, onlineOrders, expenses);

  // ==================== أفضل المنتجات ====================
  const productSales: Record<string, { productId: string; productName: string; sku?: string; quantity: number; revenue: number; cost: number }> = {};

  for (const order of [...posOrders, ...onlineOrders]) {
    for (const item of order.items || []) {
      const productId = item.product_id || 'unknown';
      if (!productSales[productId]) {
        productSales[productId] = {
          productId,
          productName: '',
          quantity: 0,
          revenue: 0,
          cost: 0,
        };
      }
      productSales[productId].quantity += safeNumber(item.quantity);
      productSales[productId].revenue += safeNumber(item.total_price || item.unit_price * item.quantity);

      const product = productMap.get(productId);
      if (product) {
        let purchasePrice = product.purchasePrice;
        if (item.color_id && product.colorPrices.has(item.color_id)) {
          purchasePrice = product.colorPrices.get(item.color_id)!;
        } else if (item.size_id && product.sizePrices.has(item.size_id)) {
          purchasePrice = product.sizePrices.get(item.size_id)!;
        }
        productSales[productId].cost += purchasePrice * safeNumber(item.quantity);
      }
    }
  }

  // إضافة أسماء المنتجات
  for (const product of inventory) {
    if (productSales[product.id]) {
      productSales[product.id].productName = product.name;
      productSales[product.id].sku = product.sku;
    }
  }

  const topProducts: TopSellingProduct[] = Object.values(productSales)
    .map(p => ({
      productId: p.productId,
      productName: p.productName || 'منتج غير معروف',
      sku: p.sku,
      quantitySold: p.quantity,
      revenue: p.revenue,
      profit: p.revenue - p.cost,
      profitMargin: calculateProfitMargin(p.revenue - p.cost, p.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ==================== النتيجة النهائية ====================
  return {
    dateRange,
    kpi,
    revenue,
    revenueBreakdown,
    costs,
    purchases: purchasesSummary,
    services,
    inventory: inventoryValuation,
    losses: lossesSummary,
    returns: returnsSummary,
    profit,
    profitBreakdown,
    profitTrend: monthlySales.map(m => ({
      date: m.month,
      revenue: m.totalSales,
      costs: m.expenses,
      profit: m.profit,
      margin: calculateProfitMargin(m.profit, m.totalSales),
    })),
    zakat,
    dailySales,
    monthlySales,
    salesByVariant: { byColor: [], bySize: [] },
    topProducts,
    lastUpdated: new Date(),
    isOffline,
  };
}

// ==================== Hook ====================

export function useReportData(options?: UseReportDataOptions) {
  // إدارة dateRange داخلياً إذا لم يتم تمريره
  const [internalDateRange, setInternalDateRange] = useState<DateRange>(
    options?.dateRange || getDateRangeFromPreset('month')
  );
  
  const dateRange = options?.dateRange || internalDateRange;
  const enabled = options?.enabled ?? true;
  
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['comprehensive-report', organizationId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () => fetchComprehensiveReportData(organizationId!, dateRange),
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    refetchOnWindowFocus: false,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['comprehensive-report', organizationId],
    });
  };

  // دالة setDateRange - تحديث dateRange الداخلي دائماً
  const setDateRange = (newDateRange: DateRange | ((prev: DateRange) => DateRange)) => {
    if (!options?.dateRange) {
      if (typeof newDateRange === 'function') {
        setInternalDateRange(newDateRange(internalDateRange));
      } else {
        setInternalDateRange(newDateRange);
      }
    }
    // إذا كان dateRange من الخارج، لا نفعل شيئاً (يجب على المستخدم إدارته)
  };

  return {
    dateRange,
    setDateRange,
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refresh,
  };
}
