// =================================================================
// 🎯 POS Orders API - دوال جلب البيانات المحسنة
// =================================================================

import { deduplicateRequest } from '@/lib/cache/deduplication';
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import type { 
  OrderStats,
  OrderFilters,
  OrderWithItems
} from '@/services/UnifiedOrderService';
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
      // ⚡ استخدام الخدمة الموحدة Offline-First
      unifiedOrderService.setOrganizationId(orgId);
      const stats = await unifiedOrderService.getOrderStats();

      // تحويل إلى POSOrderStats format
      return {
        total_orders: stats.total_orders,
        total_revenue: stats.total_revenue,
        total_paid: stats.total_paid,
        total_pending: stats.total_pending,
        orders_by_status: stats.orders_by_status as any,
        orders_by_payment_method: stats.orders_by_payment_method as any,
        fully_returned_orders: 0, // TODO: إضافة من order_returns
        partially_returned_orders: 0,
        total_returned_amount: 0,
        effective_revenue: stats.total_revenue,
        return_rate: 0
      } as POSOrderStats;
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
      // ⚡ استخدام الخدمة الموحدة Offline-First
      unifiedOrderService.setOrganizationId(orgId);
      
      const orderFilters: OrderFilters = {
        status: filters.status as any,
        payment_status: filters.payment_status as any,
        customer_id: filters.customer_id,
        is_online: false, // طلبات POS فقط
        from_date: filters.date_from,
        to_date: filters.date_to,
        search: filters.search
      };

      const result = await unifiedOrderService.getOrders(orderFilters, page, limit);

      // تحويل إلى POSOrderWithDetails format
      // ⚡ v2.0: إضافة معلومات الموظف والعميل من البيانات المحلية
      // ✅ De-dupe stocktake-generated "unrecorded sale" orders (older runs created duplicates per session).
      const dedupedData = (() => {
        const byStocktakeSession = new Map<string, any>();
        const others: any[] = [];

        for (const order of result.data) {
          const metaRaw = (order as any).metadata;
          let stocktakeSessionId: string | null = null;
          try {
            const metaObj = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
            stocktakeSessionId = (metaObj && typeof metaObj.stocktake_session_id === 'string') ? metaObj.stocktake_session_id : null;
          } catch {
            stocktakeSessionId = null;
          }

          if (stocktakeSessionId) {
            const prev = byStocktakeSession.get(stocktakeSessionId);
            if (!prev) {
              byStocktakeSession.set(stocktakeSessionId, order);
              continue;
            }
            const prevTs = Date.parse(prev.created_at ?? '') || 0;
            const nextTs = Date.parse(order.created_at ?? '') || 0;
            if (nextTs >= prevTs) byStocktakeSession.set(stocktakeSessionId, order);
          } else {
            others.push(order);
          }
        }

        return [...Array.from(byStocktakeSession.values()), ...others];
      })();

      const orders: POSOrderWithDetails[] = dedupedData.map(order => ({
        ...order,
        order_items: order.items || [],
        items_count: order.items?.length || 0,
        // ⚡ معلومات العميل - من البيانات المحلية
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          email: '',
          phone: order.customer.phone || ''
        } : undefined,
        // ⚡ معلومات الموظف - من created_by_staff_name (Offline-First)
        employee: (order as any).created_by_staff_name ? {
          id: (order as any).created_by_staff_id || (order as any).employee_id || '',
          name: (order as any).created_by_staff_name,
          email: ''
        } : undefined,
        // ⚡ حقول إضافية للموظف (للتوافقية)
        created_by_staff_id: (order as any).created_by_staff_id,
        created_by_staff_name: (order as any).created_by_staff_name,
        employee_id: (order as any).employee_id || (order as any).created_by_staff_id,
        effective_status: order.status,
        effective_total: order.total,
        original_total: order.total,
        has_returns: false,
        is_fully_returned: false,
        total_returned_amount: 0,
        has_wholesale: order.pos_order_type === 'wholesale',
        has_partial_wholesale: order.pos_order_type === 'partial_wholesale',
        wholesale_items_count: 0,
        partial_wholesale_items_count: 0
      } as POSOrderWithDetails));

      return {
        orders,
        total: result.total,
        hasMore: result.hasMore
      };

    } catch (error) {
      throw error;
    }
  });
};

// ✅ تم تعطيل الاستدعاء المباشر - البيانات متوفرة من AppInitializationContext
export const fetchEmployees = async (orgId: string): Promise<Employee[]> => {
  console.log('⚠️ [pos-orders/api] fetchEmployees - البيانات متوفرة من AppInitializationContext');
  
  // البيانات متوفرة من AppInitializationContext.employees
  // return deduplicateRequest(`pos-employees-${orgId}`, async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('users')
  //       .select('id, name, email')
  //       .eq('organization_id', orgId)
  //       .eq('is_active', true)
  //       .order('name');

  //     if (error) {
  //       throw error;
  //     }

  //     return data || [];
  //   } catch (error) {
  //     throw error;
  //   }
  // });
  
  return []; // سيتم استخدام البيانات من AppInitializationContext
};

// ✅ تم تعطيل الاستدعاء المباشر - البيانات متوفرة من AppInitializationContext
export const fetchOrganizationSettings = async (orgId: string): Promise<any> => {
  console.log('⚠️ [pos-orders/api] fetchOrganizationSettings - البيانات متوفرة من AppInitializationContext');
  
  // البيانات متوفرة من AppInitializationContext.organizationSettings
  // return deduplicateRequest(`org-settings-${orgId}`, async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('organization_settings')
  //       .select('*')
  //       .eq('organization_id', orgId)
  //       .single();

  //     if (error && error.code !== 'PGRST116') {
  //       throw error;
  //     }

  //     return data;
  //   } catch (error) {
  //     throw error;
  //   }
  // });
  
  return null; // سيتم استخدام البيانات من AppInitializationContext
};

export const fetchOrganizationSubscriptions = async (orgId: string): Promise<any[]> => {
  return deduplicateRequest(`org-subscriptions-${orgId}`, async () => {
    const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
    if (!powerSyncService.db) {
      console.warn('[pos-orders/api] PowerSync DB not initialized');
      return [];
    }
    const rows = await powerSyncService.query<any>({
      sql: `SELECT * FROM organization_subscriptions WHERE organization_id = ? AND is_active = 1 ORDER BY created_at DESC`,
      params: [orgId]
    });
    return rows || [];
  });
};

export const fetchPOSSettings = async (orgId: string): Promise<any> => {
  return deduplicateRequest(`pos-settings-${orgId}`, async () => {
    try {
      // ⚡ استخدام PowerSync مباشرة Offline-First
      const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
      if (!powerSyncService.db) {
        console.warn('[pos-orders/api] PowerSync DB not initialized');
        return null;
      }
      // ⚠️ تحديد الأعمدة الموجودة فقط (بدون printer_type, etc)
      const settings = await powerSyncService.queryOne<any>({
        sql: `SELECT
          id, organization_id,
          store_name, store_phone, store_email, store_address, store_website, store_logo_url,
          receipt_header_text, receipt_footer_text, welcome_message,
          show_qr_code, show_tracking_code, show_customer_info, show_store_logo,
          show_store_info, show_date_time, show_employee_name,
          paper_width, font_size, line_spacing, print_density, auto_cut,
          currency_symbol, currency_position, tax_label
        FROM pos_settings WHERE organization_id = ? LIMIT 1`,
        params: [orgId]
      });
      return settings;
    } catch (error) {
      throw error;
    }
  });
};

export const fetchOrderDetails = async (orderId: string): Promise<any[]> => {
  return deduplicateRequest(`order-details-${orderId}`, async () => {
    try {
      // ⚡ استخدام الخدمة الموحدة Offline-First
      const order = await unifiedOrderService.getOrder(orderId);
      return order?.items || [];
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
    // ⚡ استخدام الخدمة الموحدة Offline-First
    const order = await unifiedOrderService.updateOrderStatus(orderId, status as any);
    if (notes && order) {
      await unifiedOrderService.updateOrder(orderId, { notes });
    }
    return !!order;
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
    const order = await unifiedOrderService.updatePayment(orderId, amountPaid ?? 0, paymentStatus as any);
    return !!order;
  } catch (error) {
    return false;
  }
};

export const deleteOrder = async (orderId: string): Promise<boolean> => {
  try {
    const success = await unifiedOrderService.deleteOrder(orderId, true);
    return success;
  } catch (error) {
    return false;
  }
};
