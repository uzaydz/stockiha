import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type User = Database['public']['Tables']['users']['Row'];

export interface POSOrderWithDetails extends Order {
  customer?: Customer;
  employee?: User;
  order_items: OrderItem[];
  items_count: number;
}

export interface POSOrderFilters {
  status?: string;
  payment_method?: string;
  employee_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  payment_status?: string;
}

export interface POSOrderStats {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  cash_orders: number;
  card_orders: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
}

export class POSOrdersService {
  private static instance: POSOrdersService;
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): POSOrdersService {
    if (!POSOrdersService.instance) {
      POSOrdersService.instance = new POSOrdersService();
    }
    return POSOrdersService.instance;
  }

  private getCacheKey(key: string, params?: unknown): string {
    return `${key}_${JSON.stringify(params || {})}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * مسح جميع البيانات المُخزنة مؤقتاً
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * جلب إحصائيات طلبيات نقطة البيع
   */
  async getPOSOrderStats(organizationId: string): Promise<POSOrderStats> {
    const cacheKey = this.getCacheKey('pos_stats', { organizationId });
    const cached = this.getFromCache<POSOrderStats>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_pos_order_stats', {
        p_organization_id: organizationId
      });

      if (error) throw error;

      // البيانات تأتي كمصفوفة، نأخذ العنصر الأول
      const statsData = Array.isArray(data) ? data[0] : data;

      const stats: POSOrderStats = {
        total_orders: statsData?.total_orders || 0,
        total_revenue: parseFloat(statsData?.total_revenue || '0'),
        completed_orders: statsData?.completed_orders || 0,
        pending_orders: statsData?.pending_orders || 0,
        cancelled_orders: statsData?.cancelled_orders || 0,
        cash_orders: statsData?.cash_orders || 0,
        card_orders: statsData?.card_orders || 0,
        avg_order_value: parseFloat(statsData?.avg_order_value || '0'),
        today_orders: statsData?.today_orders || 0,
        today_revenue: parseFloat(statsData?.today_revenue || '0')
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error fetching POS order stats:', error);
      return {
        total_orders: 0,
        total_revenue: 0,
        completed_orders: 0,
        pending_orders: 0,
        cancelled_orders: 0,
        cash_orders: 0,
        card_orders: 0,
        avg_order_value: 0,
        today_orders: 0,
        today_revenue: 0
      };
    }
  }

  /**
   * جلب طلبيات نقطة البيع مع فلترة وترقيم الصفحات
   */
  async getPOSOrders(
    organizationId: string,
    filters: POSOrderFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    orders: POSOrderWithDetails[];
    total: number;
    hasMore: boolean;
  }> {
    const cacheKey = this.getCacheKey('pos_orders', { organizationId, filters, page, limit });
    const cached = this.getFromCache<{ orders: POSOrderWithDetails[]; total: number; hasMore: boolean }>(cacheKey);
    if (cached) return cached;

    try {
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
            quantity,
            unit_price,
            total_price,
            is_wholesale,
            slug,
            name
          )
        `)
        .eq('organization_id', organizationId)
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

      // البحث النصي
      if (filters.search) {
        query = query.or(
          `slug.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`
        );
      }

      // حساب العدد الكلي
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_online', false);

      // جلب البيانات مع الترقيم
      const { data: orders, error } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      const ordersWithDetails: POSOrderWithDetails[] = (orders || []).map(order => ({
        ...order,
        items_count: order.order_items?.length || 0
      }));

      const result = {
        orders: ordersWithDetails,
        total: count || 0,
        hasMore: (count || 0) > page * limit
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching POS orders:', error);
      return {
        orders: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * جلب تفاصيل طلبية واحدة
   */
  async getPOSOrderById(orderId: string): Promise<POSOrderWithDetails | null> {
    const cacheKey = this.getCacheKey('pos_order_detail', { orderId });
    const cached = this.getFromCache<POSOrderWithDetails>(cacheKey);
    if (cached) return cached;

    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers!orders_customer_id_fkey(*),
          employee:users!orders_employee_id_fkey(*),
          order_items(
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            is_wholesale,
            slug,
            name,
            original_price
          )
        `)
        .eq('id', orderId)
        .eq('is_online', false)
        .single();

      if (error) throw error;
      if (!order) return null;

      const orderWithDetails: POSOrderWithDetails = {
        ...order,
        items_count: order.order_items?.length || 0
      };

      this.setCache(cacheKey, orderWithDetails);
      return orderWithDetails;
    } catch (error) {
      console.error('Error fetching POS order details:', error);
      return null;
    }
  }

  /**
   * تحديث حالة الطلبية
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('is_online', false);

      if (error) throw error;

      // مسح الكاش المتعلق بهذه الطلبية
      this.clearCacheForOrder(orderId);
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }

  /**
   * تحديث حالة الدفع
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: string,
    amountPaid?: number,
    paymentMethod?: string
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = { 
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      };
      
      if (amountPaid !== undefined) {
        updateData.amount_paid = amountPaid;
        
        // حساب المبلغ المتبقي
        const { data: order } = await supabase
          .from('orders')
          .select('total')
          .eq('id', orderId)
          .single();
          
        if (order) {
          updateData.remaining_amount = parseFloat(order.total) - amountPaid;
        }
      }
      
      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('is_online', false);

      if (error) throw error;

      this.clearCacheForOrder(orderId);
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
  }

  /**
   * حذف طلبية (للمديرين فقط)
   */
  async deleteOrder(orderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('is_online', false);

      if (error) throw error;

      this.clearCacheForOrder(orderId);
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }

  /**
   * جلب قائمة الموظفين لفلترة الطلبيات
   */
  async getEmployeesForFilter(organizationId: string): Promise<Array<{ id: string; name: string; email: string }>> {
    const cacheKey = this.getCacheKey('employees_filter', { organizationId });
    const cached = this.getFromCache<Array<{ id: string; name: string; email: string }>>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .neq('role', 'customer')
        .order('name');

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching employees for filter:', error);
      return [];
    }
  }

  /**
   * مسح الكاش المتعلق بطلبية معينة
   */
  private clearCacheForOrder(orderId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (key.includes('pos_orders') || key.includes('pos_stats') || key.includes(orderId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * مسح كامل للكاش
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * جلب ملخص المبيعات اليومية
   */
  async getDailySalesSummary(
    organizationId: string,
    date?: string
  ): Promise<{
    orders_count: number;
    total_revenue: number;
    cash_sales: number;
    card_sales: number;
    completed_orders: number;
    pending_orders: number;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const cacheKey = this.getCacheKey('daily_summary', { organizationId, date: targetDate });
    const cached = this.getFromCache<{
      orders_count: number;
      total_revenue: number;
      cash_sales: number;
      card_sales: number;
      completed_orders: number;
      pending_orders: number;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_daily_pos_summary', {
        p_organization_id: organizationId,
        p_date: targetDate
      });

      if (error) throw error;

      // البيانات تأتي كمصفوفة، نأخذ العنصر الأول
      const summaryData = Array.isArray(data) ? data[0] : data;

      const summary = {
        orders_count: summaryData?.orders_count || 0,
        total_revenue: parseFloat(summaryData?.total_revenue || '0'),
        cash_sales: parseFloat(summaryData?.cash_sales || '0'),
        card_sales: parseFloat(summaryData?.card_sales || '0'),
        completed_orders: summaryData?.completed_orders || 0,
        pending_orders: summaryData?.pending_orders || 0
      };

      this.setCache(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('Error fetching daily sales summary:', error);
      return {
        orders_count: 0,
        total_revenue: 0,
        cash_sales: 0,
        card_sales: 0,
        completed_orders: 0,
        pending_orders: 0
      };
    }
  }
}