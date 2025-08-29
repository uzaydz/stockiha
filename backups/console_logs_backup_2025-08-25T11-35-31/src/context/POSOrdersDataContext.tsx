import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { deduplicateRequest } from '../lib/cache/deduplication';
import { supabase } from '@/lib/supabase-unified';
import type { Database } from '@/types/database.types';
import type { OrderItemWithDetails } from '@/types/database-overrides';

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

const fetchPOSOrderStats = async (orgId: string): Promise<POSOrderStats> => {
  return deduplicateRequest(`pos-order-stats-${orgId}`, async () => {
    
    try {
      // جلب الإحصائيات الأساسية باستخدام RPC function
      const { data: statsData, error: statsError } = await supabase.rpc('get_pos_order_stats', {
        p_organization_id: orgId
      });

      if (statsError) {
        throw statsError;
      }

      // البيانات تأتي كمصفوفة، نأخذ العنصر الأول
      const stats = Array.isArray(statsData) ? statsData[0] : statsData;

      // جلب إحصائيات المرتجعات إذا لزم الأمر
      const { data: returnsData } = await supabase
        .from('orders')
        .select('id, total')
        .eq('organization_id', orgId)
        .eq('is_online', false);

      const orderIds = (returnsData || []).map(order => order.id);
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
          returns.forEach(returnItem => {
            const orderId = returnItem.original_order_id;
            const currentTotal = orderReturnsMap.get(orderId) || 0;
            orderReturnsMap.set(orderId, currentTotal + parseFloat(returnItem.refund_amount || '0'));
          });

          for (const [orderId, returnedAmount] of orderReturnsMap) {
            const order = returnsData?.find(o => o.id === orderId);
            if (order) {
              const originalTotal = parseFloat(order.total);
              totalReturnedAmount += returnedAmount;
              
              if (returnedAmount >= originalTotal) {
                fullyReturnedCount++;
              } else if (returnedAmount > 0) {
                partiallyReturnedCount++;
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
        avg_order_value: typeof stats?.avg_order_value === 'number' ? stats.avg_order_value : parseFloat(String(stats?.avg_order_value || 0)),
        today_orders: stats?.today_orders || 0,
        today_revenue: parseFloat(String(stats?.today_revenue || 0)),
        fully_returned_orders: fullyReturnedCount,
        partially_returned_orders: partiallyReturnedCount,
        total_returned_amount: totalReturnedAmount,
        effective_revenue: effectiveRevenue,
        return_rate: returnRate
      };

      return finalStats;
    } catch (error) {
      // إرجاع قيم افتراضية في حالة الخطأ
      return {
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
      };
    }
  });
};

// الدالة الأصلية للحفاظ على التوافق مع الكود الموجود
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
      console.log('🔍 [POSOrdersDataContext] البيانات المستلمة من قاعدة البيانات:', {
        ordersCount: orders?.length || 0,
        firstOrder: orders?.[0] ? {
          id: orders[0].id,
          orderNumber: orders[0].customer_order_number,
          orderItemsCount: orders[0].order_items?.length || 0,
          orderItems: orders[0].order_items
        } : null
      });

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
        const originalTotal = parseFloat(order.total);
        const effectiveTotal = originalTotal - totalReturnedAmount;
        
        // حساب عدد العناصر
        const itemsCount = (order.order_items || []).reduce((sum: number, item: any) => {
          return sum + (parseInt(item.quantity?.toString() || '0') || 0);
        }, 0);

        // إضافة logging للتشخيص
        console.log('🔍 [POSOrdersDataContext] حساب عدد العناصر:', {
          orderId: order.id,
          orderNumber: order.customer_order_number,
          orderItems: order.order_items,
          itemsCount,
          total: order.total,
          subtotal: order.subtotal
        });

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
      }) as POSOrderWithDetails[];

      const result = {
        orders: processedOrders,
        total: totalCount || 0,
        hasMore: (totalCount || 0) > page * limit
      };

      return result;
    } catch (error) {
      return {
        orders: [],
        total: 0,
        hasMore: false
      };
    }
  });
};

const fetchEmployees = async (orgId: string): Promise<Employee[]> => {
  return deduplicateRequest(`pos-employees-${orgId}`, async () => {
    
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

      return data || [];
    } catch (error) {
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

        return fallbackData || [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  });
};

const fetchPOSSettings = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`pos-settings-enhanced-${orgId}`, async () => {
    
    try {
      // استخدام RPC function المحسنة أولاً
      const { data: enhancedData, error: enhancedError } = await (supabase as any)
        .rpc('get_pos_settings_enhanced', { p_org_id: orgId });

      if (!enhancedError && enhancedData && typeof enhancedData === 'object' && 'success' in enhancedData && enhancedData.success) {
        return (enhancedData as any).data?.pos_settings;
      }

      // fallback للـ RPC function القديمة
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc('get_pos_settings', { p_org_id: orgId });

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData[0];
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

      return directData;
    } catch (error) {
      return null;
    }
  });
};

// دالة محسنة لجلب الطلبيات مع حقول أساسية فقط
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
          const originalTotal = parseFloat(order.total);
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
        }) as POSOrderWithDetails[];

      const result = {
        orders: processedOrders,
        total: totalCount || 0,
        hasMore: (totalCount || 0) > page * limit
      };

      return result;
    } catch (error) {
      return {
        orders: [],
        total: 0,
        hasMore: false
      };
    }
  });
};

// دالة lazy loading لجلب تفاصيل الطلبية عند الحاجة
const fetchOrderDetails = async (orderId: string): Promise<any[]> => {
  return deduplicateRequest(`order-details-${orderId}`, async () => {
    
    try {
      
      // أولاً: جلب بيانات الطلبية الأساسية للتحقق من النوع
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

      // ثانياً: جلب عناصر المنتجات من order_items
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

      // ثالثاً: التحقق من وجود اشتراكات مرتبطة بالطلبية
      let subscriptionItems: any[] = [];
      
      if (orderInfo?.metadata && typeof orderInfo.metadata === 'object') {
        // التحقق من وجود معلومات اشتراك في metadata
        const metadata = orderInfo.metadata as any;
        if (metadata.subscriptionAccountInfo) {
          
          // البحث عن معاملات الاشتراك المرتبطة بهذه الطلبية
          const orderDate = new Date(orderInfo.created_at);
          const startTime = new Date(orderDate.getTime() - 2 * 60 * 1000); // قبل دقيقتين
          const endTime = new Date(orderDate.getTime() + 2 * 60 * 1000); // بعد دقيقتين

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
            subscriptionItems = subscriptions.map(sub => ({
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
              item_type: 'subscription' // إضافة نوع العنصر
            }));
            
          } else if (subsError) {
          }
        }
      }

      // رابعاً: دمج جميع العناصر
      const productItems = (orderItems || []).map(item => ({
        ...item,
        item_type: 'product' // إضافة نوع العنصر
      }));

      const allItems = [...productItems, ...subscriptionItems];

      // خامساً: إذا لم نجد أي عناصر، نحقق من حالات خاصة
      if (allItems.length === 0) {
        
        // التحقق من إعدادات الطلبية
        if (orderInfo?.metadata) {
        }
        
        // قد تكون طلبية خدمة رقمية أو نوع خاص آخر
        if (orderInfo?.total && parseFloat(orderInfo.total) > 0) {
          
          // إنشاء عنصر وهمي للخدمة الرقمية
          return [{
            id: `digital_service_${orderId}`,
            product_id: 'digital_service',
            product_name: 'خدمة رقمية',
            name: 'خدمة رقمية',
            quantity: 1,
            unit_price: typeof orderInfo.total === 'number' ? orderInfo.total : parseFloat(String(orderInfo.total)),
            total_price: typeof orderInfo.total === 'number' ? orderInfo.total : parseFloat(String(orderInfo.total)),
            is_wholesale: false,
            slug: 'DIGITAL-SERVICE',
            original_price: typeof orderInfo.total === 'number' ? orderInfo.total : parseFloat(String(orderInfo.total)),
            variant_info: null,
            color_id: null,
            color_name: null,
            size_id: null,
            size_name: null,
            item_type: 'digital_service'
          }];
        }
      }

      return allItems;
    } catch (error) {
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

  // React Query لإحصائيات الطلبات
  const {
    data: orderStats,
    isLoading: isOrderStatsLoading,
    error: orderStatsError
  } = useQuery({
    queryKey: ['pos-order-stats', orgId],
    queryFn: () => fetchPOSOrderStats(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 دقائق (زيادة من دقيقتين)
    gcTime: 30 * 60 * 1000, // 30 دقيقة (زيادة من 15)
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false, // إيقاف التحديث التلقائي
  });

  // React Query لطلبيات الطلبات
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    error: ordersError,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['pos-orders', orgId, currentPage, filters],
    queryFn: () => fetchPOSOrdersOptimized(orgId!, currentPage, 10, filters),
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000, // دقيقة واحدة للطلبيات (بيانات ديناميكية)
    gcTime: 5 * 60 * 1000, // 5 دقائق
    placeholderData: (previousData) => previousData,
    retry: 2,
    retryDelay: 1500,
  });

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

  // React Query لإعدادات المؤسسة
  const {
    data: organizationSettings
  } = useQuery({
    queryKey: ['organization-settings', orgId],
    queryFn: () => fetchOrganizationSettings(orgId!),
    enabled: !!orgId,
    staleTime: 2 * 60 * 60 * 1000, // ساعتان (زيادة من 30 دقيقة)
    gcTime: 4 * 60 * 60 * 1000, // 4 ساعات
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // React Query لاشتراكات المؤسسة
  const {
    data: organizationSubscriptions = []
  } = useQuery({
    queryKey: ['organization-subscriptions', orgId],
    queryFn: () => fetchOrganizationSubscriptions(orgId!),
    enabled: !!orgId,
    staleTime: 60 * 60 * 1000, // ساعة (زيادة من 15 دقيقة)
    gcTime: 4 * 60 * 60 * 1000, // 4 ساعات
    retry: 1,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

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
          order.id === updatedOrder.id ? updatedOrder : order
        );

        return {
          ...oldData,
          orders: updatedOrders
        };
      }
    );
    
    // تحديث الإحصائيات أيضاً إذا لزم الأمر
    if (updatedOrder.payment_status || updatedOrder.status) {
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
