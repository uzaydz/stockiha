/**
 * ⚡ useReactivePurchases - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للمشتريات مع تحديث تلقائي فوري
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير (لا polling!)
 *    - أداء عالي جداً
 *    - دعم كامل للـ offline
 *
 * ============================================================
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';
import type { PurchaseStatus, PaymentStatus } from '../types/smart-purchase.types';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ReactivePurchase {
  id: string;
  organization_id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: PurchaseStatus;
  payment_status: PaymentStatus;
  payment_terms: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // حقول المزامنة
  synced: boolean;
  sync_status: string | null;
  pending_operation: string | null;
}

export interface ReactivePurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  color_id: string | null;
  size_id: string | null;
  variant_type: string | null;
  variant_display_name: string | null;
  batch_id: string | null;
}

export interface UseReactivePurchasesOptions {
  supplierId?: string;
  status?: PurchaseStatus;
  paymentStatus?: PaymentStatus;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  overdueOnly?: boolean;
  limit?: number;
}

export interface UseReactivePurchasesResult {
  purchases: ReactivePurchase[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactivePurchases
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للمشتريات (Reactive) - تحديث فوري!
 *
 * @example
 * ```tsx
 * const { purchases, isLoading } = useReactivePurchases({ status: 'confirmed' });
 * // purchases يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactivePurchases(options: UseReactivePurchasesOptions = {}): UseReactivePurchasesResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const {
    supplierId,
    status,
    paymentStatus,
    searchTerm,
    fromDate,
    toDate,
    overdueOnly,
    limit = 100
  } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT
        sp.*,
        s.name as supplier_name
      FROM supplier_purchases sp
      LEFT JOIN suppliers s ON sp.supplier_id = s.id
      WHERE sp.organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر المورد
    if (supplierId) {
      query += ` AND sp.supplier_id = ?`;
      queryParams.push(supplierId);
    }

    // فلتر الحالة
    if (status) {
      query += ` AND sp.status = ?`;
      queryParams.push(status);
    }

    // فلتر حالة الدفع
    if (paymentStatus) {
      query += ` AND sp.payment_status = ?`;
      queryParams.push(paymentStatus);
    }

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ` AND (
        LOWER(sp.purchase_number) LIKE LOWER(?) OR
        LOWER(s.name) LIKE LOWER(?)
      )`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    // فلتر التاريخ
    if (fromDate) {
      query += ` AND sp.purchase_date >= ?`;
      queryParams.push(fromDate);
    }
    if (toDate) {
      query += ` AND sp.purchase_date <= ?`;
      queryParams.push(toDate);
    }

    // فلتر المتأخرة
    if (overdueOnly) {
      query += ` AND sp.due_date < date('now') AND sp.status NOT IN ('paid', 'cancelled')`;
    }

    query += ` ORDER BY sp.created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, supplierId, status, paymentStatus, searchTerm, fromDate, toDate, overdueOnly, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactivePurchase>(sql, params);

  const purchases = useMemo(() => {
    if (!data) return [];
    return data.map(p => ({
      ...p,
      total_amount: Number(p.total_amount) || 0,
      paid_amount: Number(p.paid_amount) || 0,
      balance_due: Number(p.balance_due) || 0,
      synced: Boolean(p.synced),
    }));
  }, [data]);

  return {
    purchases,
    isLoading,
    isFetching,
    error: error || null,
    total: purchases.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Purchase Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لمشتريات واحدة مع العناصر (Reactive)
 */
export function useReactivePurchase(purchaseId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // جلب المشتريات
  const purchaseQuery = useMemo(() => {
    if (!orgId || !purchaseId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          sp.*,
          s.name as supplier_name,
          s.phone as supplier_phone
        FROM supplier_purchases sp
        LEFT JOIN suppliers s ON sp.supplier_id = s.id
        WHERE sp.id = ? AND sp.organization_id = ?
        LIMIT 1
      `,
      params: [purchaseId, orgId]
    };
  }, [purchaseId, orgId]);

  const { data: purchaseData, isLoading: purchaseLoading, error: purchaseError } =
    useQuery<ReactivePurchase>(purchaseQuery.sql, purchaseQuery.params);

  // جلب العناصر مع إعدادات الوحدات من المنتج
  const itemsQuery = useMemo(() => {
    if (!purchaseId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          spi.*,
          p.name as product_name,
          p.thumbnail_image as product_image,
          p.sku as product_sku,
          p.barcode as product_barcode,
          p.stock_quantity as current_stock,
          p.sell_by_box as sell_by_box,
          p.units_per_box as units_per_box,
          p.sell_by_meter as sell_by_meter,
          p.roll_length as roll_length,
          p.sell_by_weight as sell_by_weight
        FROM supplier_purchase_items spi
        LEFT JOIN products p ON spi.product_id = p.id
        WHERE spi.purchase_id = ?
        ORDER BY spi.id
      `,
      params: [purchaseId]
    };
  }, [purchaseId]);

  const { data: itemsData, isLoading: itemsLoading, error: itemsError } =
    useQuery<ReactivePurchaseItem & {
      product_name?: string;
      product_image?: string;
      product_sku?: string;
      product_barcode?: string;
      current_stock?: number;
      sell_by_box?: boolean;
      units_per_box?: number;
      sell_by_meter?: boolean;
      roll_length?: number;
      sell_by_weight?: boolean;
    }>(itemsQuery.sql, itemsQuery.params);

  const purchase = useMemo(() => {
    if (!purchaseData || purchaseData.length === 0) return null;
    const p = purchaseData[0];
    return {
      ...p,
      total_amount: Number(p.total_amount) || 0,
      paid_amount: Number(p.paid_amount) || 0,
      balance_due: Number(p.balance_due) || 0,
    };
  }, [purchaseData]);

  const items = useMemo(() => {
    if (!itemsData) return [];
    return itemsData.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      tax_amount: Number(item.tax_amount) || 0,
      current_stock: Number(item.current_stock) || 0,
    }));
  }, [itemsData]);

  return {
    purchase,
    items,
    isLoading: purchaseLoading || itemsLoading,
    error: purchaseError || itemsError || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Purchase Stats Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لإحصائيات المشتريات (Reactive)
 */
export function useReactivePurchaseStats() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // إحصائيات حسب الحالة
  const statusQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          status,
          COUNT(*) as count,
          SUM(total_amount) as total_amount,
          SUM(paid_amount) as paid_amount,
          SUM(balance_due) as balance_due
        FROM supplier_purchases
        WHERE organization_id = ?
        GROUP BY status
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    status: PurchaseStatus;
    count: number;
    total_amount: number;
    paid_amount: number;
    balance_due: number;
  }>(statusQuery.sql, statusQuery.params);

  // إحصائيات اليوم
  const todayQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total
        FROM supplier_purchases
        WHERE organization_id = ?
          AND date(created_at) = date('now')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: todayData, isLoading: todayLoading } = useQuery<{
    count: number;
    total: number;
  }>(todayQuery.sql, todayQuery.params);

  // المشتريات المتأخرة
  const overdueQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(balance_due), 0) as total
        FROM supplier_purchases
        WHERE organization_id = ?
          AND due_date < date('now')
          AND status NOT IN ('paid', 'cancelled')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: overdueData, isLoading: overdueLoading } = useQuery<{
    count: number;
    total: number;
  }>(overdueQuery.sql, overdueQuery.params);

  // الشهر الحالي
  const monthQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total
        FROM supplier_purchases
        WHERE organization_id = ?
          AND strftime('%Y-%m', purchase_date) = strftime('%Y-%m', 'now')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: monthData, isLoading: monthLoading } = useQuery<{
    count: number;
    total: number;
  }>(monthQuery.sql, monthQuery.params);

  const stats = useMemo(() => {
    const byStatus: Record<PurchaseStatus, { count: number; amount: number; paid: number; due: number }> = {
      draft: { count: 0, amount: 0, paid: 0, due: 0 },
      confirmed: { count: 0, amount: 0, paid: 0, due: 0 },
      partially_paid: { count: 0, amount: 0, paid: 0, due: 0 },
      paid: { count: 0, amount: 0, paid: 0, due: 0 },
      overdue: { count: 0, amount: 0, paid: 0, due: 0 },
      cancelled: { count: 0, amount: 0, paid: 0, due: 0 },
    };

    let totalPurchases = 0;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    if (statusData) {
      for (const row of statusData) {
        if (byStatus[row.status]) {
          byStatus[row.status] = {
            count: Number(row.count) || 0,
            amount: Number(row.total_amount) || 0,
            paid: Number(row.paid_amount) || 0,
            due: Number(row.balance_due) || 0
          };
        }
        totalPurchases += Number(row.count) || 0;
        totalAmount += Number(row.total_amount) || 0;
        totalPaid += Number(row.paid_amount) || 0;
        totalDue += Number(row.balance_due) || 0;
      }
    }

    return {
      byStatus,
      totalPurchases,
      totalAmount,
      totalPaid,
      totalDue,
      todayPurchases: todayData?.[0]?.count ? Number(todayData[0].count) : 0,
      todayAmount: todayData?.[0]?.total ? Number(todayData[0].total) : 0,
      overduePurchases: overdueData?.[0]?.count ? Number(overdueData[0].count) : 0,
      overdueAmount: overdueData?.[0]?.total ? Number(overdueData[0].total) : 0,
      monthPurchases: monthData?.[0]?.count ? Number(monthData[0].count) : 0,
      monthAmount: monthData?.[0]?.total ? Number(monthData[0].total) : 0,
    };
  }, [statusData, todayData, overdueData, monthData]);

  return {
    stats,
    isLoading: statusLoading || todayLoading || overdueLoading || monthLoading
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Supplier Purchases Summary Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لملخص مشتريات المورد (Reactive)
 */
export function useSupplierPurchasesSummary(supplierId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !supplierId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as total_purchases,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(balance_due), 0) as total_due,
          MAX(purchase_date) as last_purchase_date
        FROM supplier_purchases
        WHERE organization_id = ? AND supplier_id = ?
      `,
      params: [orgId, supplierId]
    };
  }, [orgId, supplierId]);

  const { data, isLoading, error } = useQuery<{
    total_purchases: number;
    total_amount: number;
    total_paid: number;
    total_due: number;
    last_purchase_date: string | null;
  }>(sql, params);

  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalPurchases: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        lastPurchaseDate: null
      };
    }
    const row = data[0];
    return {
      totalPurchases: Number(row.total_purchases) || 0,
      totalAmount: Number(row.total_amount) || 0,
      totalPaid: Number(row.total_paid) || 0,
      totalDue: Number(row.total_due) || 0,
      lastPurchaseDate: row.last_purchase_date
    };
  }, [data]);

  return { summary, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Purchase Count Hook (Lightweight)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد المشتريات فقط (خفيف جداً)
 */
export function useReactivePurchaseCount(status?: PurchaseStatus) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    if (status) {
      return {
        sql: 'SELECT COUNT(*) as count FROM supplier_purchases WHERE organization_id = ? AND status = ?',
        params: [orgId, status]
      };
    }

    return {
      sql: 'SELECT COUNT(*) as count FROM supplier_purchases WHERE organization_id = ?',
      params: [orgId]
    };
  }, [orgId, status]);

  const { data, isLoading } = useQuery<{ count: number }>(sql, params);

  return {
    count: data?.[0]?.count ? Number(data[0].count) : 0,
    isLoading
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Recent Purchases Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لآخر المشتريات (Reactive)
 */
export function useReactiveRecentPurchases(limit: number = 10) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          sp.*,
          s.name as supplier_name
        FROM supplier_purchases sp
        LEFT JOIN suppliers s ON sp.supplier_id = s.id
        WHERE sp.organization_id = ?
        ORDER BY sp.created_at DESC
        LIMIT ?
      `,
      params: [orgId, limit]
    };
  }, [orgId, limit]);

  const { data, isLoading, error } = useQuery<ReactivePurchase>(sql, params);

  const purchases = useMemo(() => {
    if (!data) return [];
    return data.map(p => ({
      ...p,
      total_amount: Number(p.total_amount) || 0,
      paid_amount: Number(p.paid_amount) || 0,
      balance_due: Number(p.balance_due) || 0,
    }));
  }, [data]);

  return {
    purchases,
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Overdue Purchases Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للمشتريات المتأخرة (Reactive)
 */
export function useReactiveOverduePurchases() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          sp.*,
          s.name as supplier_name,
          julianday('now') - julianday(sp.due_date) as days_overdue
        FROM supplier_purchases sp
        LEFT JOIN suppliers s ON sp.supplier_id = s.id
        WHERE sp.organization_id = ?
          AND sp.due_date < date('now')
          AND sp.status NOT IN ('paid', 'cancelled')
        ORDER BY sp.due_date ASC
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data, isLoading, error } = useQuery<ReactivePurchase & { days_overdue: number }>(sql, params);

  const purchases = useMemo(() => {
    if (!data) return [];
    return data.map(p => ({
      ...p,
      total_amount: Number(p.total_amount) || 0,
      paid_amount: Number(p.paid_amount) || 0,
      balance_due: Number(p.balance_due) || 0,
      days_overdue: Math.floor(Number(p.days_overdue) || 0),
    }));
  }, [data]);

  return {
    purchases,
    isLoading,
    error: error || null
  };
}

export default useReactivePurchases;
