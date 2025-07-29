// =================================================================
// 🎯 POS Orders API - دوال جلب البيانات المحسنة
// =================================================================

import { supabase } from '@/lib/supabase';
import { deduplicateRequest } from '@/lib/cache/deduplication';
import { 
  POSOrderWithDetails, 
  POSOrderStats, 
  POSOrderFilters, 
  Employee 
} from './types';

// =================================================================
// 🔧 دوال جلب البيانات المحسنة مع منع التكرار
// =================================================================

export const fetchPOSOrderStats = async (orgId: string): Promise<POSOrderStats> => {
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
        const { data: returnsDetails } = await supabase
          .from('order_returns')
          .select('order_id, total_returned_amount, is_full_return')
          .in('order_id', orderIds);

        if (returnsDetails) {
          returnsDetails.forEach(ret => {
            totalReturnedAmount += ret.total_returned_amount || 0;
            if (ret.is_full_return) {
              fullyReturnedCount++;
            } else {
              partiallyReturnedCount++;
            }
          });
        }
      }

      // حساب الإحصائيات النهائية
      const effectiveRevenue = (stats?.total_revenue || 0) - totalReturnedAmount;
      const returnRate = stats?.total_orders > 0 ? 
        ((fullyReturnedCount + partiallyReturnedCount) / stats.total_orders) * 100 : 0;

      return {
        ...stats,
        fully_returned_orders: fullyReturnedCount,
        partially_returned_orders: partiallyReturnedCount,
        total_returned_amount: totalReturnedAmount,
        effective_revenue: effectiveRevenue,
        return_rate: returnRate
      };

    } catch (error) {
      throw error;
    }
  });
};

export const fetchPOSOrders = async (
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
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customer_id(id, name, email, phone),
          employee:employee_id(id, name, email),
          order_items:order_items(
            id, product_id, product_name, name, quantity, 
            unit_price, total_price, is_wholesale, variant_info,
            color_id, size_id, color_name, size_name
          )
        `, { count: 'exact' })
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
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`slug.ilike.%${filters.search}%,customer_order_number.eq.${filters.search}`);
      }

      // تطبيق pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // معالجة البيانات
      const processedOrders: POSOrderWithDetails[] = (data || []).map(order => ({
        ...order,
        items_count: order.order_items?.length || 0,
        // حساب الحقول المحسوبة الأخرى...
      }));

      return {
        orders: processedOrders,
        total: count || 0,
        hasMore: (count || 0) > page * limit
      };

    } catch (error) {
      throw error;
    }
  });
};

export const fetchEmployees = async (orgId: string): Promise<Employee[]> => {
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
      throw error;
    }
  });
};

export const fetchOrganizationSettings = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`org-settings-${orgId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  });
};

export const fetchOrganizationSubscriptions = async (orgId: string): Promise<any[]> => {
  return deduplicateRequest(`org-subscriptions-${orgId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  });
};

export const fetchPOSSettings = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`pos-settings-${orgId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  });
};

export const fetchOrderDetails = async (orderId: string): Promise<any[]> => {
  return deduplicateRequest(`order-details-${orderId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          product:product_id(id, name, price, thumbnail_image)
        `)
        .eq('order_id', orderId);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  });
};

// =================================================================
// 🔧 دوال العمليات (Update/Delete)
// =================================================================

export const updateOrderStatus = async (
  orderId: string, 
  status: string, 
  notes?: string
): Promise<boolean> => {
  try {
    const updateData: any = { status };
    if (notes) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const updatePaymentStatus = async (
  orderId: string, 
  paymentStatus: string, 
  amountPaid?: number
): Promise<boolean> => {
  try {
    const updateData: any = { payment_status: paymentStatus };
    if (amountPaid !== undefined) {
      updateData.amount_paid = amountPaid;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const deleteOrder = async (orderId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    return false;
  }
};
