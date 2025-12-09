import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { deduplicateRequest } from '../lib/cache/deduplication';
import { addAppEventListener } from '@/lib/events/eventManager';
import { supabase } from '@/lib/supabase-unified';
import type { Database } from '@/types/database.types';
import type { OrderItemWithDetails } from '@/types/database-overrides';
import type { LocalPOSOrder, LocalPOSOrderItem } from '@/database/localDb';
import {
  getOrdersByOrganization,
  getLocalPOSOrderItems as getOfflineOrderItems,
  queueOrderUpdate,
  queueOrderDeletion,
  findLocalOrderByRemoteId,
  saveRemoteOrders,
  saveRemoteOrderItems
} from '@/api/localPosOrderService';
import { localPosSettingsService } from '@/api/localPosSettingsService';
import { inventoryDB } from '@/database/localDb';
import { isAppOnline } from '@/utils/networkStatus';

// =================================================================
// 🎯 POSOrdersDataContext - الحل الشامل للطلبات المكررة
// =================================================================

// واجهات البيانات المحسنة بناءً على تحليل قاعدة البيانات
interface POSOrderWithDetails {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  slug?: string;
  customer_order_number?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  is_online: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  order_items: OrderItemWithDetails[];
  
  // حقول محسوبة للمرتجعات
  items_count: number;
  effective_status?: string;
  effective_total?: number;
  original_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
  
  // حقول جديدة لنوع البيع
  sale_type?: 'product' | 'subscription';
  product_items_count?: number;
  subscription_items_count?: number;
  metadata?: any;
}

interface POSOrderStats {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  pending_payment_orders: number;
  cancelled_orders: number;
  cash_orders: number;
  card_orders: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
  // إحصائيات المرتجعات
  fully_returned_orders?: number;
  partially_returned_orders?: number;
  total_returned_amount?: number;
  effective_revenue?: number;
  return_rate?: number;
}

export interface POSOrderFilters {
  status?: string;
  payment_method?: string;
  payment_status?: string;
  employee_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const EMPLOYEE_CACHE_KEY = 'pos_orders_employees_cache_v1';
const SUBSCRIPTIONS_CACHE_KEY = 'pos_orders_subscriptions_cache_v1';
const CARD_PAYMENT_METHODS = ['card', 'visa', 'mastercard', 'bank', 'cib', 'edahabia', 'online', 'credit_card', 'pos'];

const createDefaultStats = (): POSOrderStats => ({
  total_orders: 0,
  total_revenue: 0,
  completed_orders: 0,
  pending_orders: 0,
  pending_payment_orders: 0,
  cancelled_orders: 0,
  cash_orders: 0,
  card_orders: 0,
  avg_order_value: 0,
  today_orders: 0,
  today_revenue: 0,
  fully_returned_orders: 0,
  partially_returned_orders: 0,
  total_returned_amount: 0,
  effective_revenue: 0,
  return_rate: 0
});

const computeOfflineStats = async (orgId: string): Promise<POSOrderStats> => {
  const fallback = createDefaultStats();
  if (!orgId) {
    return fallback;
  }

  try {
    const localOrders = await inventoryDB.posOrders
      .where('organization_id')
      .equals(orgId)
      .toArray();

    if (!localOrders.length) {
      return fallback;
    }

    const totalOrders = localOrders.length;
    const totalRevenue = localOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    const completedOrders = localOrders.filter(
      (order) => order.synced || order.status === 'synced'
    ).length;
    const pendingOrders = localOrders.filter(
      (order) => !order.synced && order.status !== 'failed'
    ).length;
    const cancelledOrders = localOrders.filter(
      (order) => (order.status || '').toLowerCase() === 'cancelled'
    ).length;

    const pendingPaymentOrders = localOrders.filter((order) => {
      const status = (order.payment_status || '').toLowerCase();
      return status && status !== 'paid' && status !== 'completed';
    }).length;

    const cashOrders = localOrders.filter(
      (order) => (order.payment_method || '').toLowerCase() === 'cash'
    ).length;
    const cardOrders = localOrders.filter((order) =>
      CARD_PAYMENT_METHODS.includes((order.payment_method || '').toLowerCase())
    ).length;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrdersList = localOrders.filter((order) => {
      if (!order.created_at) return false;
      const createdAt = new Date(order.created_at);
      return createdAt >= startOfDay;
    });
    const todayOrders = todayOrdersList.length;
    const todayRevenue = todayOrdersList.reduce((sum, order) => sum + (order.total || 0), 0);

    let totalReturnedAmount = 0;
    let fullyReturnedOrders = 0;
    let partiallyReturnedOrders = 0;

    localOrders.forEach((order) => {
      const extra = order.extra_fields || {};
      const returnedAmount = Number(extra?.total_returned_amount ?? extra?.returned_amount ?? 0);
      if (Number.isFinite(returnedAmount)) {
        totalReturnedAmount += returnedAmount;
      }

      if (extra?.is_fully_returned) {
        fullyReturnedOrders += 1;
      } else if (extra?.has_returns || (Number.isFinite(returnedAmount) && returnedAmount > 0)) {
        partiallyReturnedOrders += 1;
      }
    });

    const effectiveRevenue = Math.max(0, totalRevenue - totalReturnedAmount);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const returnRate =
      totalOrders > 0 ? (fullyReturnedOrders + partiallyReturnedOrders) / totalOrders : 0;

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      completed_orders: completedOrders,
      pending_orders: pendingOrders,
      pending_payment_orders: pendingPaymentOrders,
      cancelled_orders: cancelledOrders,
      cash_orders: cashOrders,
      card_orders: cardOrders,
      avg_order_value: avgOrderValue,
      today_orders: todayOrders,
      today_revenue: todayRevenue,
      fully_returned_orders: fullyReturnedOrders,
      partially_returned_orders: partiallyReturnedOrders,
      total_returned_amount: totalReturnedAmount,
      effective_revenue: effectiveRevenue,
      return_rate: returnRate
    };
  } catch {
    return fallback;
  }
};

interface POSOrdersData {
  // البيانات الأساسية
  stats: POSOrderStats | null;
  orders: POSOrderWithDetails[];
  employees: Employee[];
  
  // بيانات pagination
  totalOrders: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  
  // بيانات إضافية
  organizationSettings: any;
  organizationSubscriptions: any[];
  posSettings: any;
  
  // حالات التحميل
  isLoading: boolean;
  isStatsLoading: boolean;
  isOrdersLoading: boolean;
  isEmployeesLoading: boolean;
  
  // الأخطاء
  errors: {
    stats?: string;
    orders?: string;
    employees?: string;
  };
  
  // دوال التحديث
  refreshAll: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshOrders: (page?: number, filters?: POSOrderFilters) => Promise<void>;
  
  // دوال الفلترة والصفحات
  setFilters: (filters: POSOrderFilters) => void;
  setPage: (page: number) => void;
  
  // دوال العمليات
  updateOrderStatus: (orderId: string, status: string, notes?: string) => Promise<boolean>;
  updatePaymentStatus: (orderId: string, paymentStatus: string, amountPaid?: number) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  updateOrderInCache: (updatedOrder: POSOrderWithDetails) => void;
  
  // دوال تحديث المخزون
  refreshProductsCache: () => void;
  
  // دوال lazy loading
  fetchOrderDetails: (orderId: string) => Promise<any[]>;
}

const POSOrdersDataContext = createContext<POSOrdersData | undefined>(undefined);

// =================================================================
// 🔧 دوال جلب البيانات المحسنة مع منع التكرار
// =================================================================

// ⚡ دالة موحدة SQLite-First تستخدم get_pos_orders_page_data_fixed
const fetchPOSOrdersPageDataUnified = async (
  orgId: string,
  userId: string,
  page: number = 1,
  limit: number = 10,
  filters: POSOrderFilters = {}
): Promise<{
  orders: POSOrderWithDetails[];
  stats: POSOrderStats;
  total: number;
  hasMore: boolean;
  settings: any;
  subscription: any;
}> => {
  return deduplicateRequest(`pos-orders-page-unified-${orgId}-${page}-${limit}-${JSON.stringify(filters)}`, async () => {
    // ⚡ SQLite-First: البدء من SQLite دائماً
    const sqliteSnapshot = await getOrdersByOrganization(orgId, page, limit);
    const sqliteStats = await computeOfflineStats(orgId);
    const sqliteResult = {
      orders: sqliteSnapshot.orders.map(mapLocalOrderToPOSOrder) as POSOrderWithDetails[],
      stats: sqliteStats,
      total: sqliteSnapshot.total,
      hasMore: sqliteSnapshot.total > page * limit,
      settings: null,
      subscription: null
    };

    const isOnline = isAppOnline();
    if (!isOnline) {
      return sqliteResult;
    }

    try {
      // ⚡ محاولة تحديث البيانات من Supabase
      const { data, error } = await (supabase as any).rpc('get_pos_orders_page_data_fixed', {
        p_org_id: orgId,
        p_user_id: userId,
        p_page: page,
        p_page_size: limit,
        p_filters: filters || {},
        p_sort: { field: 'created_at', direction: 'desc' },
        p_include: {
          stats: true,
          settings: true,
          subscription: true,
          returns: true
        }
      });

      if (error) throw error;

      const result = (data || {}) as any;
      const orders = result.orders || [];
      
      // ⚡ حفظ البيانات من Supabase في SQLite
      if (orders.length > 0) {
        await saveRemoteOrders(orders);
        for (const order of orders) {
          if (order.order_items && order.order_items.length > 0) {
            await saveRemoteOrderItems(order.id, order.order_items);
          }
        }
      }
      
      // ⚡ إرجاع البيانات المحدثة من SQLite
      const updatedSnapshot = await getOrdersByOrganization(orgId, page, limit);
      const updatedStats = await computeOfflineStats(orgId);
      
      return {
        orders: updatedSnapshot.orders.map(mapLocalOrderToPOSOrder) as POSOrderWithDetails[],
        stats: result.stats || updatedStats || createDefaultStats(),
        total: result.pagination?.total_count || updatedSnapshot.total,
        hasMore: result.pagination?.has_next_page || (updatedSnapshot.total > page * limit),
        settings: result.settings,
        subscription: result.subscription
      };
    } catch (error) {
      // ⚡ Fallback واضح إلى SQLite
      console.warn('[fetchPOSOrdersPageDataUnified] ⚠️ فشل جلب البيانات من Supabase، استخدام SQLite:', error);
      return sqliteResult;
    }
  });
};

// ⚡ دالة SQLite-First لجلب إحصائيات الطلبات
const fetchPOSOrderStats = async (orgId: string): Promise<POSOrderStats> => {
  return deduplicateRequest(`pos-order-stats-${orgId}`, async () => {
    if (!orgId) {
      return createDefaultStats();
    }

    // ⚡ SQLite-First: البدء من SQLite دائماً
    const sqliteStats = await computeOfflineStats(orgId);
    const isOnline = isAppOnline();
    
    if (!isOnline) {
      return sqliteStats;
    }

    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_pos_order_stats', {
        p_organization_id: orgId
      });

      if (statsError) {
        throw statsError;
      }

      const stats = Array.isArray(statsData) ? statsData[0] : statsData;

      const { data: returnsData } = await supabase
        .from('orders')
        .select('id, total')
        .eq('organization_id', orgId)
        .eq('is_online', false);

      const orderIds = (returnsData || []).map((order) => order.id);
      let totalReturnedAmount = 0;
      let fullyReturnedCount = 0;
      let partiallyReturnedCount = 0;

      if (orderIds.length > 0) {
        const { data: returns } = await (supabase as any)
          .from('returns')
          .select('original_order_id, status, refund_amount')
          .in('original_order_id', orderIds)
          .eq('status', 'approved');

        if (returns && returns.length > 0) {
          const orderReturnsMap = new Map<string, number>();
          returns.forEach((returnItem: any) => {
            const orderId = returnItem.original_order_id;
            const currentTotal = orderReturnsMap.get(orderId) || 0;
            orderReturnsMap.set(orderId, currentTotal + parseFloat(returnItem.refund_amount || '0'));
          });

          for (const [orderId, returnedAmount] of orderReturnsMap) {
            const order = returnsData?.find((o) => o.id === orderId);
            if (order) {
              const originalTotal = parseFloat(String(order.total || 0));
              totalReturnedAmount += returnedAmount;

              if (returnedAmount >= originalTotal) {
                fullyReturnedCount += 1;
              } else if (returnedAmount > 0) {
                partiallyReturnedCount += 1;
              }
            }
          }
        }
      }

      const totalRevenue = parseFloat(String(stats?.total_revenue || 0));
      const effectiveRevenue = totalRevenue - totalReturnedAmount;
      const returnRate = totalRevenue > 0 ? (totalReturnedAmount / totalRevenue) * 100 : 0;

      const finalStats: POSOrderStats = {
        total_orders: stats?.total_orders || 0,
        total_revenue: totalRevenue,
        completed_orders: stats?.completed_orders || 0,
        pending_orders: stats?.pending_orders || 0,
        pending_payment_orders: stats?.pending_payment_orders || 0,
        cancelled_orders: stats?.cancelled_orders || 0,
        cash_orders: stats?.cash_orders || 0,
        card_orders: stats?.card_orders || 0,
        avg_order_value:
          typeof stats?.avg_order_value === 'number'
            ? stats.avg_order_value
            : parseFloat(String(stats?.avg_order_value || 0)),
        today_orders: stats?.today_orders || 0,
        today_revenue: parseFloat(String(stats?.today_revenue || 0)),
        fully_returned_orders: fullyReturnedCount,
        partially_returned_orders: partiallyReturnedCount,
        total_returned_amount: totalReturnedAmount,
        effective_revenue: effectiveRevenue,
        return_rate: returnRate
      };

      // ⚡ إرجاع الإحصائيات من Supabase (يمكن حفظها في SQLite لاحقاً إذا لزم الأمر)
      return finalStats;
    } catch (error) {
      // ⚡ Fallback واضح إلى SQLite
      console.warn('[fetchPOSOrderStats] ⚠️ فشل جلب الإحصائيات من Supabase، استخدام SQLite:', error);
      return sqliteStats;
    }
  });
};

// ⚡ الدالة الأصلية SQLite-First للحفاظ على التوافق مع الكود الموجود
const fetchPOSOrders = async (
  orgId: string,
  page: number = 1,
  limit: number = 20,
  filters: POSOrderFilters = {}
): Promise<{
  orders: POSOrderWithDetails[];
  total: number;
  hasMore: boolean;
}> => {
  return deduplicateRequest(`pos-orders-${orgId}-${page}-${JSON.stringify(filters)}`, async () => {
    // ⚡ SQLite-First: البدء من SQLite دائماً
    const sqliteSnapshot = await getOrdersByOrganization(orgId, page, limit);
    const sqliteResult = {
      orders: sqliteSnapshot.orders.map(mapLocalOrderToPOSOrder) as POSOrderWithDetails[],
      total: sqliteSnapshot.total,
      hasMore: sqliteSnapshot.total > page * limit
    };

    const isOnline = isAppOnline();
    if (!isOnline) {
      return sqliteResult;
    }
    
    try {
      // الحصول على العدد الإجمالي أولاً
      const { count: totalCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_online', false);

      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers!orders_customer_id_fkey(*),
          employee:users!orders_employee_id_fkey(*),
          order_items(
            id,
            product_id,
            product_name,
            name,
            quantity,
            unit_price,
            total_price,
            is_wholesale,
            variant_info,
            color_id,
            color_name,
            size_id,
            size_name
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_online', false)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.payment_method) {
        query = query.eq('payment_method', filters.payment_method);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters.date_from) {
        query = query.filter('created_at', 'gte', filters.date_from);
      }
      if (filters.date_to) {
        query = query.filter('created_at', 'lte', filters.date_to);
      }

      // تطبيق pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: orders, error: ordersError } = await query;

      if (ordersError) {
        throw ordersError;
      }

      // إضافة logging للتشخيص

      // جلب بيانات المرتجعات للطلبيات المُحمّلة
      const orderIds = (orders || []).map(order => order.id);
      let returnsData: any[] = [];

      if (orderIds.length > 0) {
        const { data: returns } = await (supabase as any)
          .from('returns')
          .select('original_order_id, status, refund_amount, return_items!inner(return_quantity)')
          .in('original_order_id', orderIds)
          .eq('status', 'approved');

        returnsData = returns || [];
      }

      // معالجة البيانات وحساب الإحصائيات
      const processedOrders = (orders || []).map(order => {
        const orderReturns = returnsData.filter(ret => ret.original_order_id === order.id);
        const totalReturnedAmount = orderReturns.reduce((sum, ret) => sum + parseFloat(ret.refund_amount || '0'), 0);
        const originalTotal = parseFloat(String(order.total || 0));
        const effectiveTotal = originalTotal - totalReturnedAmount;
        
        // حساب عدد العناصر
        const itemsCount = (order.order_items || []).reduce((sum: number, item: any) => {
          return sum + (parseInt(item.quantity?.toString() || '0') || 0);
        }, 0);

        // إضافة logging للتشخيص

        return {
          ...order,
          items_count: itemsCount,
          effective_status: totalReturnedAmount >= originalTotal ? 'fully_returned' : 
                           totalReturnedAmount > 0 ? 'partially_returned' : order.status,
          effective_total: effectiveTotal,
          original_total: originalTotal,
          has_returns: totalReturnedAmount > 0,
          is_fully_returned: totalReturnedAmount >= originalTotal,
          total_returned_amount: totalReturnedAmount
        };
      }) as any[];

      // ⚡ حفظ البيانات من Supabase في SQLite
      await saveRemoteOrders(processedOrders);
      
      // حفظ عناصر الطلبات
      for (const order of processedOrders) {
        if (order.order_items && order.order_items.length > 0) {
          await saveRemoteOrderItems(order.id, order.order_items);
        }
      }

      // ⚡ إرجاع البيانات المحدثة من SQLite
      const updatedSnapshot = await getOrdersByOrganization(orgId, page, limit);
      return {
        orders: updatedSnapshot.orders.map(mapLocalOrderToPOSOrder) as POSOrderWithDetails[],
        total: Math.max(updatedSnapshot.total, totalCount || 0),
        hasMore: Math.max(updatedSnapshot.total, totalCount || 0) > page * limit
      };
    } catch (error) {
      // ⚡ Fallback واضح إلى SQLite
      console.warn('[fetchPOSOrders] ⚠️ فشل جلب البيانات من Supabase، استخدام SQLite:', error);
      return sqliteResult;
    }
  });
};

const fetchEmployees = async (orgId: string): Promise<Employee[]> => {
  return deduplicateRequest(`pos-employees-${orgId}`, async () => {
    if (!isAppOnline()) {
      if (typeof window !== 'undefined') {
        try {
          const cached = window.localStorage.getItem(EMPLOYEE_CACHE_KEY);
          if (cached) {
            return JSON.parse(cached) as Employee[];
          }
        } catch {
          // ignore parse errors
        }
      }
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      const employees = data || [];

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(EMPLOYEE_CACHE_KEY, JSON.stringify(employees));
        } catch {
          // ignore storage errors
        }
      }

      return employees;
    } catch (error) {
      if (typeof window !== 'undefined') {
        try {
          const cached = window.localStorage.getItem(EMPLOYEE_CACHE_KEY);
          if (cached) {
            return JSON.parse(cached) as Employee[];
          }
        } catch {
        }
      }
      return [];
    }
  });
};

// استخدام UnifiedDataContext بدلاً من الاستدعاءات المنفصلة
const fetchOrganizationSettings = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`org-settings-unified-${orgId}`, async () => {
    
    try {
      // محاولة الحصول على البيانات من UnifiedDataContext أولاً
      // إذا لم تكن متوفرة، نستدعي RPC function مباشرة
      const { data, error } = await (supabase as any)
        .rpc('get_organization_settings_direct', { org_id: orgId });

      if (!error && data && data.length > 0) {
        return data[0];
      }

      // fallback للاستعلام المباشر
      const { data: directData, error: directError } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (directError) {
        throw directError;
      }

      return directData;
    } catch (error) {
      return null;
    }
  });
};

const fetchOrganizationSubscriptions = async (orgId: string): Promise<any[]> => {
  return deduplicateRequest(`org-subscriptions-optimized-${orgId}`, async () => {
    if (!isAppOnline()) {
      if (typeof window !== 'undefined') {
        try {
          const cached = window.localStorage.getItem(SUBSCRIPTIONS_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              return parsed;
            }
          }
        } catch {
          // ignore parse errors
        }
      }
      return [];
    }

    try {
      // استعلام مُحسن مع تقليل الحقول المطلوبة
      const { data, error } = await supabase
        .from('organization_subscriptions')  // استخدام الجدول الأصلي
        .select(`
          id,
          organization_id,
          plan_id,
          status,
          start_date,
          end_date,
          trial_ends_at,
          created_at
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5); // تحديد عدد النتائج للأداء

      if (error) {
        // fallback للاستعلام التقليدي
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('organization_subscriptions')
          .select('*, plan:plan_id(id, name, code)')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5);

        if (fallbackError) {
          throw fallbackError;
        }

        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(SUBSCRIPTIONS_CACHE_KEY, JSON.stringify(fallbackData || []));
          } catch {
            // ignore storage errors
          }
        }

        return fallbackData || [];
      }

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(SUBSCRIPTIONS_CACHE_KEY, JSON.stringify(data || []));
        } catch {
          // ignore storage errors
        }
      }

      return data || [];
    } catch (error) {
      if (typeof window !== 'undefined') {
        try {
          const cached = window.localStorage.getItem(SUBSCRIPTIONS_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              return parsed;
            }
          }
        } catch {
        }
      }
      return [];
    }
  });
};

const fetchPOSSettings = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`pos-settings-enhanced-${orgId}`, async () => {
    const isOnline = isAppOnline();

    if (!isOnline) {
      const offline = await localPosSettingsService.get(orgId);
      if (offline) {
        return offline;
      }
    }

    try {
      // استخدام RPC function المحسنة أولاً
      const { data: enhancedData, error: enhancedError } = await (supabase as any)
        .rpc('get_pos_settings_enhanced', { p_org_id: orgId });

      if (!enhancedError && enhancedData && typeof enhancedData === 'object' && 'success' in enhancedData && enhancedData.success) {
        const remote = (enhancedData as any).data?.pos_settings;
        if (remote) {
          await localPosSettingsService.save({
            ...remote,
            pending_sync: false,
            updated_at: remote?.updated_at || new Date().toISOString()
          });
        }
        return remote;
      }

      // fallback للـ RPC function القديمة (اسم المعامل الصحيح)
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc('get_pos_settings', { p_organization_id: orgId });

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const remote = rpcData[0];
        await localPosSettingsService.save({
          ...remote,
          pending_sync: false,
          updated_at: remote?.updated_at || new Date().toISOString()
        });
        return remote;
      }

      // fallback للاستعلام المباشر
      const { data: directData, error: directError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (directError) {
        throw directError;
      }

      if (directData) {
        // ⚡ إصلاح أنواع البيانات للتوافق مع LocalPOSSettings
        const printDensity = directData.print_density;
        const validPrintDensity = (printDensity === 'light' || printDensity === 'normal' || printDensity === 'dark') 
          ? printDensity 
          : 'normal';
        
        const receiptTemplate = directData.receipt_template;
        const validReceiptTemplate = (receiptTemplate === 'classic' || receiptTemplate === 'modern' || receiptTemplate === 'minimal' || receiptTemplate === 'custom')
          ? receiptTemplate
          : 'classic';
        
        await localPosSettingsService.save({
          ...directData,
          print_density: validPrintDensity,
          receipt_template: validReceiptTemplate,
          pending_sync: false,
          updated_at: directData?.updated_at || new Date().toISOString()
        } as any);
      }

      return directData;
    } catch (error) {
      const offline = await localPosSettingsService.get(orgId);
      if (offline) {
        return offline;
      }
      return null;
    }
  });
};

// دالة محسنة لجلب الطلبيات مع حقول أساسية فقط
const mapLocalOrderToPOSOrder = (order: LocalPOSOrder): POSOrderWithDetails => {
  const extra = order.extra_fields || {};
  const localOrderNumber = (order as any)._local_order_number || (order as any).local_order_number;
  const globalOrderNumber = (order as any).global_order_number;
  
  // ⚡ حساب items_count من مصادر متعددة
  // الأولوية: order.items_count (محسوب) > order_items.length > extra.items_count
  const orderItems = (order as any).order_items || [];
  const computedItemsCount = orderItems.length > 0 
    ? orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
    : 0;
  const itemsCount = (order as any).items_count ?? computedItemsCount ?? extra.items_count ?? 0;
  
  // ⚡ تحويل status من pending_sync إلى حالة مناسبة للعرض
  // pending_sync/synced هي حالات مزامنة، نحافظ عليها لكن نضيف effective_status للعرض
  const displayStatus = order.status === 'pending_sync' ? 'pending' : 
                        order.status === 'synced' ? 'completed' : 
                        order.status;
  
  return {
    id: order.id,
    local_order_id: order.id,
    organization_id: order.organization_id,
    customer_id: order.customer_id ?? null,
    employee_id: order.employee_id ?? null,
    slug: (order as any).slug,
    customer_order_number: globalOrderNumber ? Number(globalOrderNumber) : (localOrderNumber ? Number(localOrderNumber) : undefined),
    status: order.status, // الحالة الأصلية للمزامنة
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    total: order.total,
    subtotal: order.subtotal,
    tax: (order as any).tax ?? 0,
    discount: order.discount,
    amount_paid: order.amount_paid,
    remaining_amount: order.remaining_amount,
    consider_remaining_as_partial: order.consider_remaining_as_partial,
    is_online: order.synced === 1,
    notes: order.notes ?? '',
    created_at: order.created_at,
    updated_at: order.updated_at,
    order_items: orderItems,
    customer: order.customer_id ? {
      id: order.customer_id,
      name: order.customer_name ?? 'عميل'
    } : null,
    items_count: itemsCount,
    sale_type: extra.sale_type ?? 'product',
    product_items_count: extra.product_items_count ?? 0,
    subscription_items_count: extra.subscription_items_count ?? 0,
    effective_status: extra.effective_status ?? displayStatus,
    effective_total: extra.effective_total ?? order.total,
    original_total: extra.original_total ?? order.total,
    has_returns: extra.has_returns ?? false,
    is_fully_returned: extra.is_fully_returned ?? false,
    total_returned_amount: extra.total_returned_amount ?? 0,
    metadata: order.metadata,
    // ⚡ CRITICAL FIX: قراءة sync_status من كلا العمودين (sync_status و _sync_status)
    // الأولوية: sync_status (بدون underscore) > _sync_status (مع underscore) > 'pending'
    sync_status: (order as any).sync_status ?? (order as any)._sync_status ?? 'pending',
    // ⚡ CRITICAL FIX: قراءة pending_operation من كلا العمودين
    pending_operation: (order as any).pending_operation ?? (order as any)._pending_operation ?? null,
    is_offline_only: order.synced === 0 || (order as any)._synced === 0
  } as any;
};

const mapLocalItemToDetail = (item: LocalPOSOrderItem): any => ({
  id: item.id,
  product_id: item.product_id,
  product_name: item.name, // ⚡ استخدام name بدلاً من product_name
  name: item.name,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total_price: item.total_price,
  is_wholesale: item.is_wholesale ?? false,
  original_price: item.original_price ?? item.unit_price,
  color_id: item.color_id ?? null,
  color_name: item.color_name ?? null,
  size_id: item.size_id ?? null,
  size_name: item.size_name ?? null,
  variant_info: item.variant_info ?? null,
  item_type: 'product'
});

const fetchPOSOrdersOptimized = async (
  orgId: string,
  page: number = 1,
  limit: number = 10,
  filters: POSOrderFilters = {}
): Promise<{
  orders: POSOrderWithDetails[];
  total: number;
  hasMore: boolean;
}> => {
  return deduplicateRequest(`pos-orders-optimized-${orgId}-${page}-${limit}-${JSON.stringify(filters)}`, async () => {
    // ⚡ SQLite-First: البدء من SQLite دائماً
    const sqliteSnapshot = await getOrdersByOrganization(orgId, page, limit);
    const buildResultFromSnapshot = (snapshot: { orders: LocalPOSOrder[]; total: number }) => {
      const mapped = snapshot.orders.map(mapLocalOrderToPOSOrder) as POSOrderWithDetails[];
      return {
        orders: mapped,
        total: snapshot.total,
        hasMore: snapshot.total > page * limit
      };
    };

    // ⚡ إرجاع البيانات من SQLite فوراً (Local-First)
    const sqliteResult = buildResultFromSnapshot(sqliteSnapshot);

    const isOnline = isAppOnline();

    if (!isOnline) {
      return sqliteResult;
    }

    // ⚡ محاولة تحديث البيانات من Supabase في الخلفية
    // (لا ننتظر - نرجع البيانات المحلية فوراً)

    try {
      // استخدام RPC function محسنة للحصول على عدد أسرع
      const { data: countData, error: countError } = await (supabase as any)
        .rpc('get_pos_orders_count_with_returns', {
          p_organization_id: orgId
        });

      if (countError) {
      }

      const totalCount = countData || 0;

      // جلب الطلبيات مع جميع الحقول المالية المطلوبة
      let query = supabase
        .from('orders')
        .select(`
          id,
          organization_id,
          slug,
          customer_order_number,
          status,
          payment_status,
          payment_method,
          total,
          subtotal,
          tax,
          discount,
          amount_paid,
          remaining_amount,
          consider_remaining_as_partial,
          notes,
          created_at,
          updated_at,
          customer_id,
          employee_id,
          metadata,
          customer:customers!orders_customer_id_fkey(
            id,
            name,
            phone,
            email
          ),
          employee:users!orders_employee_id_fkey(
            id,
            name,
            email
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_online', false)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.payment_method) {
        query = query.eq('payment_method', filters.payment_method);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters.date_from) {
        query = query.filter('created_at', 'gte', filters.date_from);
      }
      if (filters.date_to) {
        query = query.filter('created_at', 'lte', filters.date_to);
      }

      // تطبيق pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: orders, error: ordersError } = await query;

      if (ordersError) {
        throw ordersError;
      }

      // جلب عدد العناصر لكل طلبية بشكل منفصل ومحسن
      const orderIds = (orders || []).map(order => order.id);
      let itemsCounts: { [key: string]: number } = {};
      let subscriptionCounts: { [key: string]: number } = {};

      if (orderIds.length > 0) {
        // جلب عناصر المنتجات العادية
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('order_id, quantity')
          .in('order_id', orderIds);

        // حساب عدد العناصر لكل طلبية
        (itemsData || []).forEach(item => {
          if (!itemsCounts[item.order_id]) {
            itemsCounts[item.order_id] = 0;
          }
          itemsCounts[item.order_id] += item.quantity || 0;
        });

        // جلب معاملات الاشتراك للطلبيات (ربط بناءً على التاريخ والموظف)
        const orderEmployeeMap = (orders || []).reduce((map, order) => {
          if (order.employee_id) {
            map[order.employee_id] = map[order.employee_id] || [];
            map[order.employee_id].push({
              id: order.id,
              created_at: order.created_at,
              customer_name: order.customer?.name || 'زائر'
            });
          }
          return map;
        }, {} as any);

        // جلب معاملات الاشتراك
        const { data: subscriptionTransactions } = await (supabase as any)
          .from('subscription_transactions')
          .select('id, quantity, transaction_date, processed_by, customer_name')
          .eq('transaction_type', 'sale')
          .in('processed_by', Object.keys(orderEmployeeMap));

        // ربط معاملات الاشتراك بالطلبيات
        (subscriptionTransactions || []).forEach(transaction => {
          const relatedOrders = orderEmployeeMap[transaction.processed_by] || [];
          
          relatedOrders.forEach((orderInfo: any) => {
            const orderDate = new Date(orderInfo.created_at);
            const transactionDate = new Date(transaction.transaction_date);
            const timeDiff = Math.abs(orderDate.getTime() - transactionDate.getTime());
            
            // ربط إذا كان التوقيت قريب (أقل من دقيقتين) ونفس العميل
            if (timeDiff < 2 * 60 * 1000 && transaction.customer_name === orderInfo.customer_name) {
              if (!subscriptionCounts[orderInfo.id]) {
                subscriptionCounts[orderInfo.id] = 0;
              }
              subscriptionCounts[orderInfo.id] += transaction.quantity || 1;
            }
          });
        });
      }

      // جلب بيانات المرتجعات للطلبيات المُحمّلة (مبسطة)
      let returnsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: returns } = await (supabase as any)
          .from('returns')
          .select('original_order_id, refund_amount')
          .in('original_order_id', orderIds)
          .eq('status', 'approved');

        returnsData = returns || [];
      }

              // معالجة البيانات المحسنة
        const processedOrders = (orders || []).map(order => {
          const orderReturns = returnsData.filter(ret => ret.original_order_id === order.id);
          const totalReturnedAmount = orderReturns.reduce((sum, ret) => sum + parseFloat(ret.refund_amount || '0'), 0);
          const originalTotal = parseFloat(String(order.total || 0));
          const effectiveTotal = originalTotal - totalReturnedAmount;
          
          // عدد العناصر من الحساب المنفصل (منتجات + اشتراكات)
          const productItemsCount = itemsCounts[order.id] || 0;
          const subscriptionItemsCount = subscriptionCounts[order.id] || 0;
          const totalItemsCount = productItemsCount + subscriptionItemsCount;

          // تحديد نوع البيع بناءً على وجود معلومات حساب الاشتراك أو عناصر الاشتراك
          const hasSubscriptionAccount = order.metadata && 
                                       typeof order.metadata === 'object' &&
                                       order.metadata !== null &&
                                       'subscriptionAccountInfo' in order.metadata &&
                                       order.metadata.subscriptionAccountInfo;
          
          const saleType = (hasSubscriptionAccount || subscriptionItemsCount > 0) ? 'subscription' : 'product';

          return {
            ...order,
            order_items: [], // سيتم جلبها عند الحاجة فقط
            items_count: totalItemsCount,
            sale_type: saleType, // إضافة نوع البيع
            product_items_count: productItemsCount, // عدد المنتجات
            subscription_items_count: subscriptionItemsCount, // عدد الاشتراكات
            effective_status: totalReturnedAmount >= originalTotal ? 'fully_returned' : 
                             totalReturnedAmount > 0 ? 'partially_returned' : order.status,
            effective_total: effectiveTotal,
            original_total: originalTotal,
            has_returns: totalReturnedAmount > 0,
            is_fully_returned: totalReturnedAmount >= originalTotal,
            total_returned_amount: totalReturnedAmount
          };
        }) as any[];

      // ⚡ حفظ البيانات من Supabase في SQLite
      await saveRemoteOrders(processedOrders);
      
      // حفظ عناصر الطلبات
      for (const order of processedOrders) {
        if (order.order_items && order.order_items.length > 0) {
          await saveRemoteOrderItems(order.id, order.order_items);
        }
      }

      // ⚡ إرجاع البيانات المحدثة من SQLite
      const updatedSnapshot = await getOrdersByOrganization(orgId, page, limit);
      return buildResultFromSnapshot({
        orders: updatedSnapshot.orders,
        total: Math.max(updatedSnapshot.total, totalCount || 0)
      });
    } catch (error) {
      // ⚡ Fallback واضح إلى SQLite
      console.warn('[fetchPOSOrdersOptimized] ⚠️ فشل جلب البيانات من Supabase، استخدام SQLite:', error);
      return sqliteResult;
    }
  });
};

// دالة lazy loading لجلب تفاصيل الطلبية عند الحاجة
const fetchOrderDetails = async (orderId: string): Promise<any[]> => {
  return deduplicateRequest(`order-details-${orderId}`, async () => {
    if (!isAppOnline()) {
      let localItems = await getOfflineOrderItems(orderId);

      if (!localItems.length) {
        const localOrder = await findLocalOrderByRemoteId(orderId);
        if (localOrder) {
          localItems = await getOfflineOrderItems(localOrder.id);
        }
      }

      return (localItems || []).map(mapLocalItemToDetail);
    }

    try {
      const { data: orderInfo, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          metadata,
          is_online,
          employee_id,
          customer_id,
          created_at,
          total,
          status,
          payment_status
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        return [];
      }

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          product_name,
          name,
          quantity,
          unit_price,
          total_price,
          is_wholesale,
          variant_info,
          color_id,
          color_name,
          size_id,
          size_name,
          slug,
          original_price
        `)
        .eq('order_id', orderId)
        .order('created_at');

      if (itemsError) {
      }

      let subscriptionItems: any[] = [];

      if (orderInfo?.metadata && typeof orderInfo.metadata === 'object') {
        const metadata = orderInfo.metadata as any;
        if (metadata.subscriptionAccountInfo) {
          const orderDate = new Date(orderInfo.created_at);
          const startTime = new Date(orderDate.getTime() - 2 * 60 * 1000);
          const endTime = new Date(orderDate.getTime() + 2 * 60 * 1000);

          const { data: subscriptions, error: subsError } = await (supabase as any)
            .from('subscription_transactions')
            .select(`
              id,
              service_id,
              amount,
              quantity,
              description,
              transaction_date,
              customer_name,
              processed_by,
              service:services(name, description)
            `)
            .eq('transaction_type', 'sale')
            .eq('processed_by', orderInfo.employee_id)
            .filter('transaction_date', 'gte', startTime.toISOString())
            .filter('transaction_date', 'lte', endTime.toISOString())
            .order('transaction_date');

          if (!subsError && subscriptions) {
            subscriptionItems = subscriptions.map((sub: any) => ({
              id: `sub_${sub.id}`,
              product_id: sub.service_id,
              product_name: (sub.service as any)?.name || sub.description || 'خدمة اشتراك',
              name: (sub.service as any)?.name || sub.description || 'خدمة اشتراك',
              quantity: sub.quantity || 1,
              unit_price: parseFloat(String(sub.amount || 0)),
              total_price: parseFloat(String(sub.amount || 0)) * (sub.quantity || 1),
              is_wholesale: false,
              slug: `SUB-${sub.id.toString().slice(-8)}`,
              original_price: parseFloat(String(sub.amount || 0)),
              variant_info: null,
              color_id: null,
              color_name: null,
              size_id: null,
              size_name: null,
              item_type: 'subscription'
            }));
          }
        }
      }

      const productItems = (orderItems || []).map((item) => ({
        ...(item as any),
        item_type: 'product'
      }));

      const allItems = [...productItems, ...subscriptionItems];

      if (allItems.length === 0 && orderInfo?.total && parseFloat(String(orderInfo.total || 0)) > 0) {
        const numericTotal = typeof orderInfo.total === 'number'
          ? orderInfo.total
          : parseFloat(String(orderInfo.total));

        allItems.push({
          id: `digital_service_${orderId}`,
          product_id: 'digital_service',
          product_name: 'خدمة رقمية',
          name: 'خدمة رقمية',
          quantity: 1,
          unit_price: numericTotal,
          total_price: numericTotal,
          is_wholesale: false,
          slug: 'DIGITAL-SERVICE',
          original_price: numericTotal,
          variant_info: null,
          color_id: null,
          color_name: null,
          size_id: null,
          size_name: null,
          item_type: 'digital_service'
        });
      }

      await saveRemoteOrderItems(orderId, allItems);

      return allItems;
    } catch (error) {
      if (!isAppOnline()) {
        let localItems = await getOfflineOrderItems(orderId);

        if (!localItems.length) {
          const localOrder = await findLocalOrderByRemoteId(orderId);
          if (localOrder) {
            localItems = await getOfflineOrderItems(localOrder.id);
          }
        }

        return (localItems || []).map(mapLocalItemToDetail);
      }

      return [];
    }
  });
};

// =================================================================
// 🎯 POSOrdersDataProvider Component
// =================================================================

interface POSOrdersDataProviderProps {
  children: React.ReactNode;
}

export const POSOrdersDataProvider: React.FC<POSOrdersDataProviderProps> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  // حالة للفلاتر والصفحة
  const [filters, setFilters] = React.useState<POSOrderFilters>({});
  const [currentPage, setCurrentPage] = React.useState(1);

  // ✅ تم تعطيل استدعاء stats المنفصل - سيتم جلبه مع البيانات الموحدة
  // const orderStats = null;
  // const isOrderStatsLoading = false;
  // const orderStatsError = null;

  // ✅ استدعاء موحد واحد لكل البيانات باستخدام get_pos_orders_page_data_fixed
  const {
    data: unifiedData,
    isLoading: isOrdersLoading,
    error: ordersError,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['pos-orders-unified', orgId, user?.id, currentPage, filters],
    queryFn: () => fetchPOSOrdersPageDataUnified(orgId!, user?.id!, currentPage, 10, filters),
    enabled: !!orgId && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    placeholderData: (previousData) => previousData,
    retry: 1,
    retryDelay: 1500,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // استخراج البيانات من الاستجابة الموحدة
  const ordersData = unifiedData ? {
    orders: unifiedData.orders,
    total: unifiedData.total,
    hasMore: unifiedData.hasMore
  } : undefined;
  
  const orderStats = unifiedData?.stats || null;
  const isOrderStatsLoading = isOrdersLoading;
  const orderStatsError = ordersError;

  // React Query للموظفين
  const {
    data: employees = [],
    isLoading: isEmployeesLoading,
    error: employeesError
  } = useQuery({
    queryKey: ['pos-employees', orgId],
    queryFn: () => fetchEmployees(orgId!),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 دقائق (بيانات ثابتة نسبياً)
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 2,
    retryDelay: 1000,
  });

  // ✅ تم تعطيل استدعاء settings المنفصل - سيتم جلبه مع البيانات الموحدة
  const organizationSettings = unifiedData?.settings || null;

  // ✅ تم تعطيل استدعاء subscriptions المنفصل - سيتم جلبه مع البيانات الموحدة
  const organizationSubscriptions = unifiedData?.subscription ? [unifiedData.subscription] : [];

  // React Query لإعدادات نقطة البيع
  const {
    data: posSettings,
    isLoading: isPOSSettingsLoading,
    error: posSettingsError
  } = useQuery({
    queryKey: ['pos-settings', orgId],
    queryFn: () => fetchPOSSettings(orgId!),
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000, // 30 دقيقة (زيادة من 10)
    gcTime: 2 * 60 * 60 * 1000, // ساعتان (زيادة من 30 دقيقة)
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // دوال التحديث
  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
  }, [queryClient]);

  const refreshStats = useCallback(async () => {
    await refetchOrders();
  }, [refetchOrders]);

  const refreshOrders = useCallback(async (page?: number, newFilters?: POSOrderFilters) => {
    if (page) setCurrentPage(page);
    if (newFilters) setFilters(newFilters);
    await refetchOrders();
  }, [refetchOrders]);

  // دوال العمليات
  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: string, 
    notes?: string
  ): Promise<boolean> => {
    const isOnline = isAppOnline();

    if (!isOnline) {
      await queueOrderUpdate(orderId, {
        status,
        notes: notes || undefined,
        extra_fields: {
          effective_status: status
        }
      });

      updateOrderInCache({
        id: orderId,
        status,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
        effective_status: status
      } as any);

      return true;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status, 
          notes: notes || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        return false;
      }

      // إعادة تحميل البيانات
      await Promise.all([refetchOrders()]);
      
      return true;
    } catch (error) {
      return false;
    }
  }, [refetchOrders]);

  const updatePaymentStatus = useCallback(async (
    orderId: string, 
    paymentStatus: string, 
    amountPaid?: number
  ): Promise<boolean> => {
    const isOnline = isAppOnline();

    if (!isOnline) {
      await queueOrderUpdate(orderId, {
        payment_status: paymentStatus,
        amount_paid: amountPaid
      });

      updateOrderInCache({
        id: orderId,
        payment_status: paymentStatus,
        amount_paid: amountPaid,
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
      } as any);

      return true;
    }

    try {
      const updateData: any = { 
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      };

      if (amountPaid !== undefined) {
        updateData.amount_paid = amountPaid;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        return false;
      }

      // إعادة تحميل البيانات
      await Promise.all([refetchOrders()]);
      
      return true;
    } catch (error) {
      return false;
    }
  }, [refetchOrders]);

  const deleteOrder = useCallback(async (orderId: string): Promise<boolean> => {
    const isOnline = isAppOnline();

    if (!isOnline) {
      await queueOrderDeletion(orderId);
      updateOrderInCache({
        id: orderId,
        pending_operation: 'delete',
        sync_status: 'pending'
      } as any);
      return true;
    }

    try {

      // 1. جلب عناصر الطلبية قبل الحذف لإعادة المخزون
      const { data: orderItems, error: fetchItemsError } = await supabase
        .from('order_items')
        .select(`
          product_id, 
          quantity,
          product_name,
          unit_price,
          total_price
        `)
        .eq('order_id', orderId);

      if (fetchItemsError) {
      } else {

        // 2. إعادة الكميات إلى المخزون قبل الحذف
        if (orderItems && orderItems.length > 0) {
          
          for (const item of orderItems) {
            
            try {
              // جلب المخزون الحالي قبل التحديث
              const { data: productBefore, error: fetchError } = await supabase
                .from('products')
                .select('stock_quantity, name')
                .eq('id', item.product_id)
                .single();

              if (fetchError) {
                continue;
              }

              // استدعاء دالة إعادة المخزون
              const { data: restoreResult, error: stockError } = await supabase.rpc('restore_product_stock_safe' as any, {
                p_product_id: item.product_id,
                p_quantity_to_restore: item.quantity,
              });

              if (stockError) {
                
                // محاولة بديلة: تحديث المخزون يدوياً
                const { error: manualUpdateError } = await supabase
                  .from('products')
                  .update({ 
                    stock_quantity: (productBefore?.stock_quantity || 0) + item.quantity,
                    updated_at: new Date().toISOString(),
                    last_inventory_update: new Date().toISOString()
                  })
                  .eq('id', item.product_id);

                if (manualUpdateError) {
                } else {
                }
              } else if (!restoreResult) {
                
                // محاولة بديلة: تحديث المخزون يدوياً
                const { error: manualUpdateError } = await supabase
                  .from('products')
                  .update({ 
                    stock_quantity: (productBefore?.stock_quantity || 0) + item.quantity,
                    updated_at: new Date().toISOString(),
                    last_inventory_update: new Date().toISOString()
                  })
                  .eq('id', item.product_id);

                if (manualUpdateError) {
                } else {
                }
              } else {
              }

              // التحقق من النتيجة النهائية
              const { data: productAfter } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();

            } catch (error) {
            }
          }
          
        } else {
        }
      }

      // 3. حذف عناصر الطلبية بعد إعادة المخزون
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) {
        // لا نرجع false هنا لأن العناصر قد تكون فارغة أصلاً
      } else {
      }

      // 2. حذف المعاملات المالية المرتبطة
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('order_id', orderId);

      if (transactionsError) {
        // نتابع حتى لو فشل حذف المعاملات
      }

      // 3. حذف حجوزات الخدمات المرتبطة
      const { error: bookingsError } = await supabase
        .from('service_bookings')
        .delete()
        .eq('order_id', orderId);

      if (bookingsError) {
        // نتابع حتى لو فشل حذف الحجوزات
      }

      // 4. حذف المرتجعات المرتبطة (إن وجدت)
              const { error: returnsError } = await (supabase as any)
          .from('returns')
          .delete()
          .eq('original_order_id', orderId);

      if (returnsError) {
        // نتابع حتى لو فشل حذف المرتجعات
      }

      // 5. حذف معاملات الاشتراك المرتبطة (إن وجدت)
      // نحتاج لجلب معلومات الطلبية أولاً للربط بالتوقيت والموظف
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('employee_id, created_at, customer_id')
          .eq('id', orderId)
          .single();

        if (orderData?.employee_id) {
          // حذف معاملات الاشتراك القريبة من تاريخ الطلبية (±5 دقائق)
          const orderDate = new Date(orderData.created_at);
          const startTime = new Date(orderDate.getTime() - 5 * 60 * 1000);
          const endTime = new Date(orderDate.getTime() + 5 * 60 * 1000);

          const { error: subscriptionError } = await (supabase as any)
            .from('subscription_transactions')
            .delete()
            .eq('processed_by', orderData.employee_id)
            .filter('transaction_date', 'gte', startTime.toISOString())
            .filter('transaction_date', 'lte', endTime.toISOString());

          if (subscriptionError) {
            // نتابع حتى لو فشل حذف معاملات الاشتراك
          }
        }
      } catch (subscriptionDeleteError) {
        // نتابع حتى لو فشل منطق حذف الاشتراكات
      }

      // 6. أخيراً، حذف الطلبية نفسها
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) {
        return false;
      }

      // إعادة تحميل البيانات
      await Promise.all([refetchOrders()]);
      
      return true;
    } catch (error) {
      return false;
    }
  }, [refetchOrders]);

  // تحديث طلبية في الكاش بدلاً من إعادة تحميل كل البيانات
  const updateOrderInCache = useCallback((updatedOrder: POSOrderWithDetails) => {
    
    // تحديث البيانات محلياً في React Query cache
    queryClient.setQueryData(
      ['pos-orders', orgId, currentPage, filters],
      (oldData: any) => {
        if (!oldData) {
          return oldData;
        }

        const updatedOrders = oldData.orders.map((order: POSOrderWithDetails) => 
          order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
        );

        return {
          ...oldData,
          orders: updatedOrders
        };
      }
    );
    
    // تحديث الإحصائيات أيضاً إذا لزم الأمر
    const canRefetch = isAppOnline();
    if (canRefetch && (updatedOrder.payment_status || updatedOrder.status)) {
      refetchOrders();
    }
  }, [queryClient, orgId, currentPage, filters, refetchOrders]);

  // دوال الفلترة والصفحات
  const handleSetFilters = useCallback((newFilters: POSOrderFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // إعادة تعيين الصفحة للأولى عند تغيير الفلاتر
  }, []);

  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // ✅ الاستماع لحدث إنشاء طلبية جديدة
  useEffect(() => {
    const unsubscribe = addAppEventListener('pos-order-created', () => {
      console.log('🔄 [POSOrdersDataContext] تم إنشاء طلبية جديدة - تحديث القائمة...');
      refetchOrders();
    });

    return unsubscribe;
  }, [refetchOrders]);

  // ⚡ CRITICAL FIX: الاستماع لحدث مزامنة الطلبيات
  // يتم إطلاق هذا الحدث من OutboxManager بعد نجاح المزامنة
  // هذا يضمن تحديث الواجهة لإظهار الحالة الصحيحة "مُزامَن" بدلاً من "قيد المزامنة"
  useEffect(() => {
    const unsubscribe = addAppEventListener('pos-orders-synced', (detail: { orderIds: string[], count: number }) => {
      console.log(`🔄 [POSOrdersDataContext] تمت مزامنة ${detail.count} طلبية - تحديث القائمة...`);
      refetchOrders();
    });

    return unsubscribe;
  }, [refetchOrders]);

  // حساب حالة التحميل الإجمالية
  const isLoading = isOrderStatsLoading || isOrdersLoading || isEmployeesLoading;

  // جمع الأخطاء
  const errors = useMemo(() => ({
    stats: orderStatsError?.message,
    orders: ordersError?.message,
    employees: employeesError?.message,
  }), [orderStatsError, ordersError, employeesError]);

  // قيمة Context
  const contextValue = useMemo<POSOrdersData>(() => ({
    // البيانات
    stats: orderStats || null,
    orders: ordersData?.orders || [],
    employees,
    
    // pagination
    totalOrders: ordersData?.total || 0,
    currentPage,
    totalPages: Math.ceil((ordersData?.total || 0) / 10),
    hasMore: ordersData?.hasMore || false,
    
    // بيانات إضافية
    organizationSettings,
    organizationSubscriptions,
    posSettings,
    
    // حالات التحميل
    isLoading,
    isStatsLoading: isOrderStatsLoading,
    isOrdersLoading,
    isEmployeesLoading,
    
    // الأخطاء
    errors,
    
    // دوال التحديث
    refreshAll,
    refreshStats,
    refreshOrders,
    
    // دوال الفلترة والصفحات
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    
    // دوال العمليات
    updateOrderStatus,
    updatePaymentStatus,
    deleteOrder,
    updateOrderInCache,
    
    // دوال تحديث المخزون
    refreshProductsCache: () => {}, // placeholder
    
    // دوال lazy loading
    fetchOrderDetails,
  }), [
    orderStats, ordersData, employees, currentPage, organizationSettings, 
    organizationSubscriptions, posSettings, isLoading, isOrderStatsLoading, 
    isOrdersLoading, isEmployeesLoading, errors, refreshAll, refreshStats, 
    refreshOrders, handleSetFilters, handleSetPage, updateOrderStatus, 
    updatePaymentStatus, deleteOrder, updateOrderInCache, fetchOrderDetails
  ]);

  return (
    <POSOrdersDataContext.Provider value={contextValue}>
      {children}
    </POSOrdersDataContext.Provider>
  );
};

// =================================================================
// 🎯 Custom Hook لاستخدام POSOrdersData
// =================================================================

export const usePOSOrdersData = (): POSOrdersData => {
  const context = useContext(POSOrdersDataContext);
  if (!context) {
    throw new Error('usePOSOrdersData must be used within a POSOrdersDataProvider');
  }
  return context;
};

export default POSOrdersDataProvider;
