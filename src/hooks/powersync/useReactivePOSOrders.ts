/**
 * ⚡ useReactivePOSOrders - PowerSync Reactive Hook for POS Orders
 * ============================================================
 *
 * 🚀 Hook متكامل لطلبيات نقطة البيع
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير (لا polling!)
 *    - دعم pagination و filtering
 *    - إحصائيات تلقائية
 *
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export type POSOrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type POSPaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'credit' | 'other';
export type POSPaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';

export interface ReactivePOSOrder {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  employee_id: string | null;
  employee_name: string | null;
  subtotal: number;
  tax: number;
  discount: number | null;
  total: number;
  amount_paid: number;
  remaining_amount: number;
  status: POSOrderStatus;
  payment_method: POSPaymentMethod | null;
  payment_status: POSPaymentStatus;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  items_count: number;
}

export type SellingUnitType = 'piece' | 'weight' | 'meter' | 'box' | 'liter' | null;
export type SaleType = 'retail' | 'wholesale' | 'partial_wholesale' | null;

export interface ReactivePOSOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string | null;
  name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_wholesale: boolean;
  original_price: number | null;
  // ⚡ معلومات المتغيرات (اللون والمقاس)
  color_id: string | null;
  color_name: string | null;
  size_id: string | null;
  size_name: string | null;
  variant_display_name: string | null;
  variant_info: string | null;
  // ⚡ نوع البيع
  sale_type: SaleType;
  selling_unit_type: SellingUnitType;
  // ⚡ بيع الوزن
  weight_sold: number | null;
  weight_unit: string | null;
  price_per_weight_unit: number | null;
  // ⚡ بيع المتر
  meters_sold: number | null;
  price_per_meter: number | null;
  // ⚡ بيع العلبة/الصندوق
  boxes_sold: number | null;
  units_per_box: number | null;
  box_price: number | null;
  // ⚡ معلومات الدفعة
  batch_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  serial_numbers: string | null;
  created_at: string;
}

export interface UseReactivePOSOrdersOptions {
  /** حالة الطلب */
  status?: POSOrderStatus | POSOrderStatus[];
  /** حالة الدفع */
  paymentStatus?: POSPaymentStatus | POSPaymentStatus[];
  /** طريقة الدفع */
  paymentMethod?: POSPaymentMethod;
  /** معرف العميل */
  customerId?: string;
  /** معرف الموظف */
  employeeId?: string;
  /** تاريخ البداية */
  fromDate?: string;
  /** تاريخ النهاية */
  toDate?: string;
  /** بحث نصي */
  search?: string;
  /** رقم الصفحة */
  page?: number;
  /** عدد العناصر بالصفحة */
  pageSize?: number;
  /** طلبات أونلاين فقط */
  onlineOnly?: boolean;
  /** طلبات أوفلاين فقط */
  offlineOnly?: boolean;
  /** تفعيل الهوك */
  enabled?: boolean;
}

export interface POSOrdersStats {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  paidOrders: number;
  partialOrders: number;
  unpaidOrders: number;
  cashOrders: number;
  cardOrders: number;
  avgOrderValue: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface UseReactivePOSOrdersResult {
  orders: ReactivePOSOrder[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
  pagination: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: POSOrdersStats;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactivePOSOrders
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لطلبيات POS (Reactive) - تحديث فوري!
 *
 * @example
 * ```tsx
 * const { orders, stats, isLoading, pagination } = useReactivePOSOrders({
 *   status: 'completed',
 *   page: 1,
 *   pageSize: 20
 * });
 * // orders يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactivePOSOrders(options: UseReactivePOSOrdersOptions = {}): UseReactivePOSOrdersResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const {
    status,
    paymentStatus,
    paymentMethod,
    customerId,
    employeeId,
    fromDate,
    toDate,
    search,
    page = 1,
    pageSize = 20,
    onlineOnly,
    offlineOnly,
    enabled = true
  } = options;

  // ⚡ استعلام الطلبات الرئيسي مع JOIN لجلب أسماء العميل والموظف
  const { sql: ordersSql, params: ordersParams } = useMemo(() => {
    if (!orgId || !enabled) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT
        o.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        o.created_by_staff_name as employee_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.organization_id = ?
        AND o.is_online = 0
    `;
    const queryParams: any[] = [orgId];

    // فلتر الحالة
    if (status) {
      if (Array.isArray(status)) {
        const placeholders = status.map(() => '?').join(',');
        query += ` AND o.status IN (${placeholders})`;
        queryParams.push(...status);
      } else {
        query += ` AND o.status = ?`;
        queryParams.push(status);
      }
    }

    // فلتر حالة الدفع
    if (paymentStatus) {
      if (Array.isArray(paymentStatus)) {
        const placeholders = paymentStatus.map(() => '?').join(',');
        query += ` AND o.payment_status IN (${placeholders})`;
        queryParams.push(...paymentStatus);
      } else {
        query += ` AND o.payment_status = ?`;
        queryParams.push(paymentStatus);
      }
    }

    // فلتر طريقة الدفع
    if (paymentMethod) {
      query += ` AND o.payment_method = ?`;
      queryParams.push(paymentMethod);
    }

    // فلتر العميل
    if (customerId) {
      query += ` AND o.customer_id = ?`;
      queryParams.push(customerId);
    }

    // فلتر الموظف
    if (employeeId) {
      query += ` AND o.employee_id = ?`;
      queryParams.push(employeeId);
    }

    // فلتر أونلاين/أوفلاين
    if (onlineOnly) {
      query += ` AND o.is_online = 1`;
    } else if (offlineOnly) {
      query += ` AND o.is_online = 0`;
    }

    // فلتر التاريخ - استخدام date() للمقارنة الصحيحة
    if (fromDate) {
      query += ` AND date(o.created_at) >= date(?)`;
      queryParams.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(o.created_at) <= date(?)`;
      queryParams.push(toDate);
    }

    // فلتر البحث (البحث في اسم العميل من الجدول المرتبط)
    if (search && search.length >= 2) {
      query += ` AND (
        LOWER(o.slug) LIKE LOWER(?) OR
        LOWER(c.name) LIKE LOWER(?) OR
        LOWER(c.phone) LIKE LOWER(?) OR
        LOWER(o.notes) LIKE LOWER(?)
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // ترتيب + pagination
    const offset = (page - 1) * pageSize;
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);

    return { sql: query, params: queryParams };
  }, [orgId, enabled, status, paymentStatus, paymentMethod, customerId, employeeId, onlineOnly, offlineOnly, fromDate, toDate, search, page, pageSize]);

  const { data: ordersData, isLoading: ordersLoading, isFetching: ordersFetching, error: ordersError } = useQuery<ReactivePOSOrder>(ordersSql, ordersParams);

  // ⚡ استعلام العدد الكلي للـ pagination
  const { sql: countSql, params: countParams } = useMemo(() => {
    if (!orgId || !enabled) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    let query = `
      SELECT COUNT(*) as count FROM orders
      WHERE organization_id = ?
        AND is_online = 0
    `;
    const queryParams: any[] = [orgId];

    // نفس الفلاتر
    if (status) {
      if (Array.isArray(status)) {
        const placeholders = status.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        queryParams.push(...status);
      } else {
        query += ` AND status = ?`;
        queryParams.push(status);
      }
    }

    if (paymentStatus) {
      if (Array.isArray(paymentStatus)) {
        const placeholders = paymentStatus.map(() => '?').join(',');
        query += ` AND payment_status IN (${placeholders})`;
        queryParams.push(...paymentStatus);
      } else {
        query += ` AND payment_status = ?`;
        queryParams.push(paymentStatus);
      }
    }

    if (paymentMethod) {
      query += ` AND payment_method = ?`;
      queryParams.push(paymentMethod);
    }

    if (customerId) {
      query += ` AND customer_id = ?`;
      queryParams.push(customerId);
    }

    if (employeeId) {
      query += ` AND employee_id = ?`;
      queryParams.push(employeeId);
    }

    if (onlineOnly) {
      query += ` AND is_online = 1`;
    } else if (offlineOnly) {
      query += ` AND is_online = 0`;
    }

    if (fromDate) {
      query += ` AND date(created_at) >= date(?)`;
      queryParams.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(created_at) <= date(?)`;
      queryParams.push(toDate);
    }

    if (search && search.length >= 2) {
      query += ` AND (
        LOWER(order_number) LIKE LOWER(?) OR
        LOWER(customer_name) LIKE LOWER(?) OR
        LOWER(notes) LIKE LOWER(?)
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    return { sql: query, params: queryParams };
  }, [orgId, enabled, status, paymentStatus, paymentMethod, customerId, employeeId, onlineOnly, offlineOnly, fromDate, toDate, search]);

  const { data: countData } = useQuery<{ count: number }>(countSql, countParams);

  // ⚡ استعلام الإحصائيات
  const { sql: statsSql, params: statsParams } = useMemo(() => {
    if (!orgId || !enabled) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    return {
      sql: `
        SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_revenue,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
          SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_orders,
          SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as unpaid_orders,
          SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cash_orders,
          SUM(CASE WHEN payment_method = 'card' THEN 1 ELSE 0 END) as card_orders
        FROM orders
        WHERE organization_id = ?
          AND is_online = 0
      `,
      params: [orgId]
    };
  }, [orgId, enabled]);

  const { data: statsData, isLoading: statsLoading } = useQuery<{
    total_orders: number;
    total_revenue: number;
    completed_orders: number;
    pending_orders: number;
    cancelled_orders: number;
    paid_orders: number;
    partial_orders: number;
    unpaid_orders: number;
    cash_orders: number;
    card_orders: number;
  }>(statsSql, statsParams);

  // ⚡ استعلام إحصائيات اليوم
  const { sql: todaySql, params: todayParams } = useMemo(() => {
    if (!orgId || !enabled) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }

    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as total
        FROM orders
        WHERE organization_id = ?
          AND is_online = 0
          AND date(created_at) = date('now')
      `,
      params: [orgId]
    };
  }, [orgId, enabled]);

  const { data: todayData } = useQuery<{ count: number; total: number }>(todaySql, todayParams);

  // ⚡ تحويل البيانات
  const orders = useMemo(() => {
    if (!ordersData) return [];
    return ordersData.map(o => ({
      ...o,
      subtotal: Number(o.subtotal) || 0,
      tax: Number(o.tax) || 0,
      discount: o.discount ? Number(o.discount) : null,
      total: Number(o.total) || 0,
      amount_paid: Number(o.amount_paid) || 0,
      remaining_amount: Number(o.remaining_amount) || 0,
      is_online: Boolean(o.is_online),
      items_count: Number(o.items_count) || 0,
    }));
  }, [ordersData]);

  // ⚡ حساب pagination
  const totalCount = countData?.[0]?.count ? Number(countData[0].count) : 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const pagination = useMemo(() => ({
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  }), [page, totalPages]);

  // ⚡ تحويل الإحصائيات
  const stats: POSOrdersStats = useMemo(() => {
    const rawStats = statsData?.[0];
    const todayStats = todayData?.[0];

    const totalOrders = Number(rawStats?.total_orders) || 0;
    const totalRevenue = Number(rawStats?.total_revenue) || 0;

    return {
      totalOrders,
      totalRevenue,
      completedOrders: Number(rawStats?.completed_orders) || 0,
      pendingOrders: Number(rawStats?.pending_orders) || 0,
      cancelledOrders: Number(rawStats?.cancelled_orders) || 0,
      paidOrders: Number(rawStats?.paid_orders) || 0,
      partialOrders: Number(rawStats?.partial_orders) || 0,
      unpaidOrders: Number(rawStats?.unpaid_orders) || 0,
      cashOrders: Number(rawStats?.cash_orders) || 0,
      cardOrders: Number(rawStats?.card_orders) || 0,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      todayOrders: Number(todayStats?.count) || 0,
      todayRevenue: Number(todayStats?.total) || 0,
    };
  }, [statsData, todayData]);

  return {
    orders,
    isLoading: ordersLoading || statsLoading,
    isFetching: ordersFetching,
    error: ordersError || null,
    total: totalCount,
    pagination,
    stats
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 POS Order Items Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعناصر طلب POS (Reactive)
 */
export function useReactivePOSOrderItems(orderId: string | null) {
  const { sql, params } = useMemo(() => {
    if (!orderId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at',
      params: [orderId]
    };
  }, [orderId]);

  const { data, isLoading, error } = useQuery<ReactivePOSOrderItem>(sql, params);

  const items = useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
      original_price: item.original_price ? Number(item.original_price) : null,
      is_wholesale: Boolean(item.is_wholesale),
      // ⚡ حقول نوع البيع
      sale_type: item.sale_type as SaleType,
      selling_unit_type: item.selling_unit_type as SellingUnitType,
      // ⚡ بيع الوزن
      weight_sold: item.weight_sold ? Number(item.weight_sold) : null,
      price_per_weight_unit: item.price_per_weight_unit ? Number(item.price_per_weight_unit) : null,
      // ⚡ بيع المتر
      meters_sold: item.meters_sold ? Number(item.meters_sold) : null,
      price_per_meter: item.price_per_meter ? Number(item.price_per_meter) : null,
      // ⚡ بيع العلبة
      boxes_sold: item.boxes_sold ? Number(item.boxes_sold) : null,
      units_per_box: item.units_per_box ? Number(item.units_per_box) : null,
      box_price: item.box_price ? Number(item.box_price) : null,
    }));
  }, [data]);

  return { items, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 POS Order with Items Hook
// ═══════════════════════════════════════════════════════════════════════════

export interface ReactivePOSOrderWithItems extends ReactivePOSOrder {
  order_items: ReactivePOSOrderItem[];
}

/**
 * 🚀 Hook لطلب POS مع عناصره (Reactive)
 */
export function useReactivePOSOrderWithItems(orderId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // جلب الطلب مع JOIN لأسماء العميل والموظف
  const { sql: orderSql, params: orderParams } = useMemo(() => {
    if (!orgId || !orderId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          o.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          o.created_by_staff_name as employee_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ? AND o.organization_id = ?
        LIMIT 1
      `,
      params: [orderId, orgId]
    };
  }, [orderId, orgId]);

  const { data: orderData, isLoading: orderLoading, error: orderError } = useQuery<ReactivePOSOrder>(orderSql, orderParams);

  // جلب العناصر
  const { items, isLoading: itemsLoading, error: itemsError } = useReactivePOSOrderItems(orderId);

  const order = useMemo(() => {
    if (!orderData || orderData.length === 0) return null;
    const o = orderData[0];
    return {
      ...o,
      subtotal: Number(o.subtotal) || 0,
      tax: Number(o.tax) || 0,
      discount: o.discount ? Number(o.discount) : null,
      total: Number(o.total) || 0,
      amount_paid: Number(o.amount_paid) || 0,
      remaining_amount: Number(o.remaining_amount) || 0,
      is_online: Boolean(o.is_online),
      items_count: Number(o.items_count) || items.length,
      order_items: items
    } as ReactivePOSOrderWithItems;
  }, [orderData, items]);

  return {
    order,
    isLoading: orderLoading || itemsLoading,
    error: orderError || itemsError || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 POS Orders with Items (Batch) Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لجلب عناصر عدة طلبات دفعة واحدة (Reactive)
 */
export function useReactivePOSOrdersItems(orderIds: string[]) {
  const { sql, params } = useMemo(() => {
    if (!orderIds.length) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    const placeholders = orderIds.map(() => '?').join(',');
    return {
      sql: `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY order_id, created_at`,
      params: orderIds
    };
  }, [orderIds]);

  const { data, isLoading, error } = useQuery<ReactivePOSOrderItem>(sql, params);

  const itemsByOrder = useMemo(() => {
    const map = new Map<string, ReactivePOSOrderItem[]>();
    if (!data) return map;

    for (const item of data) {
      const bucket = map.get(item.order_id) || [];
      bucket.push({
        ...item,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || 0,
        original_price: item.original_price ? Number(item.original_price) : null,
        is_wholesale: Boolean(item.is_wholesale),
        // ⚡ حقول نوع البيع
        sale_type: item.sale_type as SaleType,
        selling_unit_type: item.selling_unit_type as SellingUnitType,
        // ⚡ بيع الوزن
        weight_sold: item.weight_sold ? Number(item.weight_sold) : null,
        price_per_weight_unit: item.price_per_weight_unit ? Number(item.price_per_weight_unit) : null,
        // ⚡ بيع المتر
        meters_sold: item.meters_sold ? Number(item.meters_sold) : null,
        price_per_meter: item.price_per_meter ? Number(item.price_per_meter) : null,
        // ⚡ بيع العلبة
        boxes_sold: item.boxes_sold ? Number(item.boxes_sold) : null,
        units_per_box: item.units_per_box ? Number(item.units_per_box) : null,
        box_price: item.box_price ? Number(item.box_price) : null,
      });
      map.set(item.order_id, bucket);
    }

    return map;
  }, [data]);

  return { itemsByOrder, isLoading, error: error || null };
}

export default useReactivePOSOrders;
