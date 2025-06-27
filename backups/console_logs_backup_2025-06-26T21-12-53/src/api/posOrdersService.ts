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
  // حقول المرتجعات
  effective_status?: string;
  effective_total?: number;
  original_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
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
   * مسح كاش الطلبيات لضمان جلب البيانات المحدثة بعد المرتجعات
   */
  clearOrdersCache(): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (key.includes('pos_orders') || key.includes('pos_stats')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * جلب إحصائيات طلبيات نقطة البيع مع المرتجعات
   */
  async getPOSOrderStats(organizationId: string): Promise<POSOrderStats> {
    const cacheKey = this.getCacheKey('pos_stats_with_returns', { organizationId });
    const cached = this.getFromCache<POSOrderStats>(cacheKey);
    if (cached) return cached;

    try {
      // جلب الإحصائيات الأساسية
      const { data, error } = await supabase.rpc('get_pos_order_stats', {
        p_organization_id: organizationId
      });

      if (error) throw error;

      // البيانات تأتي كمصفوفة، نأخذ العنصر الأول
      const statsData = Array.isArray(data) ? data[0] : data;

      // حساب إحصائيات المرتجعات
      const { data: returnsStats } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          created_at
        `)
        .eq('organization_id', organizationId)
        .eq('is_online', false);

      const orderIds = (returnsStats || []).map(order => order.id);
      let returnsData: any[] = [];
      let totalReturnedAmount = 0;
      let fullyReturnedCount = 0;
      let partiallyReturnedCount = 0;

      if (orderIds.length > 0) {
        const { data: returns } = await supabase
          .from('returns' as any)
          .select(`
            original_order_id,
            status,
            refund_amount
          `)
          .in('original_order_id', orderIds)
          .eq('status', 'approved');

        returnsData = returns || [];

        // حساب المرتجعات لكل طلبية
        const orderReturnsMap = new Map<string, number>();
        returnsData.forEach(returnItem => {
          const orderId = returnItem.original_order_id;
          const currentTotal = orderReturnsMap.get(orderId) || 0;
          orderReturnsMap.set(orderId, currentTotal + parseFloat(returnItem.refund_amount || '0'));
        });

        // حساب الإحصائيات
        for (const [orderId, returnedAmount] of orderReturnsMap) {
          const order = returnsStats?.find(o => o.id === orderId);
          if (order) {
            const originalTotal = parseFloat(String(order.total));
            totalReturnedAmount += returnedAmount;
            
            if (returnedAmount >= originalTotal) {
              fullyReturnedCount++;
            } else if (returnedAmount > 0) {
              partiallyReturnedCount++;
            }
          }
        }
      }

      const totalRevenue = parseFloat(String(statsData?.total_revenue || '0'));
      const effectiveRevenue = totalRevenue - totalReturnedAmount;
      const returnRate = totalRevenue > 0 ? (totalReturnedAmount / totalRevenue) * 100 : 0;

      const stats: POSOrderStats = {
        total_orders: statsData?.total_orders || 0,
        total_revenue: totalRevenue,
        completed_orders: statsData?.completed_orders || 0,
        pending_orders: statsData?.pending_orders || 0,
        pending_payment_orders: statsData?.pending_payment_orders || 0,
        cancelled_orders: statsData?.cancelled_orders || 0,
        cash_orders: statsData?.cash_orders || 0,
        card_orders: statsData?.card_orders || 0,
        avg_order_value: parseFloat(String(statsData?.avg_order_value || '0')),
        today_orders: statsData?.today_orders || 0,
        today_revenue: parseFloat(String(statsData?.today_revenue || '0')),
        // إحصائيات المرتجعات
        fully_returned_orders: fullyReturnedCount,
        partially_returned_orders: partiallyReturnedCount,
        total_returned_amount: totalReturnedAmount,
        effective_revenue: effectiveRevenue,
        return_rate: returnRate
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
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
    // تعطيل الكاش مؤقتاً للاختبار
    // if (cached) return cached;

    try {
      console.log('🔍 Debug getPOSOrders - organizationId:', organizationId);
      console.log('🔍 Debug getPOSOrders - About to execute query...');
      
      let query = supabase
        .from('orders')
        .select(`
          id,
          slug,
          customer_order_number,
          status,
          payment_status,
          payment_method,
          subtotal,
          tax,
          discount,
          total,
          notes,
          is_online,
          organization_id,
          customer_id,
          employee_id,
          pos_order_type,
          amount_paid,
          remaining_amount,
          consider_remaining_as_partial,
          completed_at,
          created_at,
          updated_at,
          metadata,
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
            variant_info
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_online', false)
        .order('created_at', { ascending: false });

      console.log('🔍 Debug getPOSOrders - Query created, applying filters...');

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

      console.log('🔍 Debug getPOSOrders - Query executed');
      console.log('🔍 Debug getPOSOrders - Error:', error);
      console.log('🔍 Debug getPOSOrders - Raw orders count:', orders?.length);
      console.log('🔍 Debug getPOSOrders - Sample order:', orders?.[0]);
      console.log('🔍 Debug getPOSOrders - Sample metadata:', orders?.[0]?.metadata);

      if (error) throw error;

      // حساب حالة المرتجعات لكل طلبية
      const orderIds = (orders || []).map(order => order.id);
      let returnsData: any[] = [];
      // تعطيل subscription_transactions مؤقتاً للتركيز على metadata
      let subscriptionData: any[] = [];
      
      if (orderIds.length > 0) {
        // جلب بيانات المرتجعات
        const { data: returns } = await supabase
          .from('returns' as any)
          .select(`
            original_order_id,
            status,
            refund_amount,
            return_items!inner(return_quantity)
          `)
          .in('original_order_id', orderIds)
          .eq('status', 'approved');
        
        returnsData = returns || [];

        // تعطيل مؤقتاً
        // // جلب بيانات معاملات الاشتراك وربطها بالطلبيات حسب التاريخ والعميل
        // const { data: subscriptionTransactions } = await supabase
        //   .from('subscription_transactions')
        //   .select(`
        //     id,
        //     service_id,
        //     amount,
        //     quantity,
        //     description,
        //     transaction_date,
        //     customer_name,
        //     processed_by
        //   `)
        //   .eq('transaction_type', 'sale');
        
        // subscriptionData = subscriptionTransactions || [];
        // console.log('🔍 Debug - Subscription transactions:', subscriptionData);
      }

      // إضافة debugging للتحقق من البيانات
      console.log('🔍 Debug posOrdersService - Raw orders data:', orders?.slice(0, 1));
      console.log('🔍 Debug posOrdersService - First order metadata:', orders?.[0]?.metadata);

      // معالجة البيانات وحساب الإحصائيات
      const processedOrders = (orders || []).map(order => {
        const orderReturns = returnsData.filter(ret => ret.original_order_id === order.id);
        const totalReturnedAmount = orderReturns.reduce((sum, ret) => sum + parseFloat(ret.refund_amount || '0'), 0);
        const originalTotal = parseFloat(String(order.total));
        const effectiveTotal = originalTotal - totalReturnedAmount;
        
        // البحث عن معاملات الاشتراك المرتبطة بهذه الطلبية
        // نربط بناءً على employee_id وتاريخ قريب (نفس الدقيقة)
        const orderDate = new Date(order.created_at);
        const relatedSubscriptions = subscriptionData.filter(sub => {
          const subDate = new Date(sub.transaction_date);
          const timeDiff = Math.abs(orderDate.getTime() - subDate.getTime());
          return sub.processed_by === order.employee_id && 
                 timeDiff < 60000 && // أقل من دقيقة
                 sub.customer_name === (order.customer?.name || 'زائر');
        });

        console.log(`🔍 Debug - Order ${order.id} related subscriptions:`, relatedSubscriptions);

        // إضافة عناصر الاشتراك إلى order_items
        const subscriptionItems = relatedSubscriptions.map(sub => ({
          id: sub.id,
          product_id: sub.service_id,
          product_name: sub.description,
          quantity: sub.quantity,
          unit_price: sub.amount,
          total_price: sub.amount * sub.quantity,
          is_wholesale: false,
          slug: `SUB-${sub.id.slice(-8)}`,
          name: sub.description,
          original_price: sub.amount,
          variant_info: null,
          color_id: null,
          color_name: null,
          size_id: null,
          size_name: null
        }));

        // دمج العناصر الموجودة مع عناصر الاشتراك
        const allItems = [...(order.order_items || []), ...subscriptionItems];
        
        // حساب عدد العناصر
        const itemsCount = allItems.reduce((sum: number, item: any) => {
          return sum + (parseInt(item.quantity?.toString() || '0') || 0);
        }, 0);

        const processedOrder = {
          ...order,
          order_items: allItems,
          items_count: itemsCount,
          effective_status: totalReturnedAmount >= originalTotal ? 'fully_returned' : 
                           totalReturnedAmount > 0 ? 'partially_returned' : order.status,
          effective_total: effectiveTotal,
          original_total: originalTotal,
          has_returns: totalReturnedAmount > 0,
          is_fully_returned: totalReturnedAmount >= originalTotal,
          total_returned_amount: totalReturnedAmount
        };

        console.log(`🔍 Debug posOrdersService - Order ${order.id} metadata:`, order.metadata);
        
        return processedOrder;
      }) as any;

      const result = {
        orders: processedOrders,
        total: count || 0,
        hasMore: (count || 0) > page * limit
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
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
    // تعطيل الكاش مؤقتاً للاختبار
    // if (cached) return cached;

    try {
      console.log('🔍 Debug getPOSOrderById - Starting query for:', orderId);
      
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          slug,
          customer_order_number,
          status,
          payment_status,
          payment_method,
          subtotal,
          tax,
          discount,
          total,
          notes,
          is_online,
          organization_id,
          customer_id,
          employee_id,
          pos_order_type,
          amount_paid,
          remaining_amount,
          consider_remaining_as_partial,
          completed_at,
          created_at,
          updated_at,
          metadata,
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
            original_price,
            variant_info,
            color_id,
            color_name,
            size_id,
            size_name
          )
        `)
        .eq('id', orderId)
        .eq('is_online', false)
        .single();

      console.log('🔍 Debug getPOSOrderById - Raw response:', { data: order, error });
      console.log('🔍 Debug getPOSOrderById - Order metadata:', order?.metadata);
      console.log('🔍 Debug getPOSOrderById - Order items:', order?.order_items);

      if (error) throw error;
      if (!order) return null;

      const orderWithDetails = {
        ...order,
        items_count: (order.order_items || []).reduce((total: number, item: any) => {
          return total + (parseInt(item.quantity?.toString() || '0') || 0);
        }, 0)
      } as any;

      this.setCache(cacheKey, orderWithDetails);
      return orderWithDetails;
    } catch (error) {
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
          updateData.remaining_amount = parseFloat(String(order.total)) - amountPaid;
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
      return false;
    }
  }

  /**
   * حذف طلبية (للمديرين فقط) مع إعادة المخزون
   */
  async deleteOrder(orderId: string): Promise<boolean> {
    try {
      console.log('🗑️ [POSOrdersService] بدء حذف الطلبية:', orderId);

      // 1. جلب عناصر الطلبية قبل الحذف لإعادة المخزون (مع معلومات المنتج)
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          product_id, 
          quantity,
          product_name,
          unit_price,
          total_price
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('❌ خطأ في جلب عناصر الطلبية:', itemsError);
        throw itemsError;
      }

      console.log('📦 عناصر الطلبية المراد إعادة مخزونها:', orderItems);

      // التحقق من وجود عناصر
      if (!orderItems || orderItems.length === 0) {
        console.warn('⚠️ لا توجد عناصر في هذه الطلبية لإعادة مخزونها');
        
        // جلب معلومات الطلبية للتحقق
        const { data: orderInfo } = await supabase
          .from('orders')
          .select('id, slug, total, status, metadata')
          .eq('id', orderId)
          .single();
          
        console.log('📋 معلومات الطلبية:', orderInfo);
        
        // إذا كانت طلبية اشتراك، فقد لا تحتوي على عناصر منتجات
        // نتابع عملية الحذف
      }

      // 2. إعادة الكميات إلى المخزون باستخدام الدالة الجديدة
      if (orderItems && orderItems.length > 0) {
        console.log(`🔄 بدء إعادة المخزون لـ ${orderItems.length} منتج`);
        
        for (const item of orderItems) {
          console.log(`📈 محاولة إعادة ${item.quantity} من المنتج ${item.product_id} إلى المخزون`);
          
          try {
            // جلب المخزون الحالي قبل التحديث
            const { data: productBefore, error: fetchError } = await supabase
              .from('products')
              .select('stock_quantity, name')
              .eq('id', item.product_id)
              .single();

            if (fetchError) {
              console.error(`❌ خطأ في جلب بيانات المنتج ${item.product_id}:`, fetchError);
              continue;
            }

            console.log(`📊 المخزون الحالي للمنتج ${productBefore?.name}: ${productBefore?.stock_quantity}`);

            // استدعاء دالة إعادة المخزون
            const { data: restoreResult, error: stockError } = await supabase.rpc('restore_product_stock_safe' as any, {
              p_product_id: item.product_id,
              p_quantity_to_restore: item.quantity, // كمية موجبة للإعادة
            });

            console.log(`🔍 نتيجة استدعاء دالة الإعادة:`, { restoreResult, stockError });

            if (stockError) {
              console.error(`❌ خطأ في استدعاء دالة إعادة المخزون للمنتج ${item.product_id}:`, stockError);
              
              // محاولة بديلة: تحديث المخزون يدوياً
              console.log(`🔄 محاولة تحديث المخزون يدوياً للمنتج ${item.product_id}`);
              const { error: manualUpdateError } = await supabase
                .from('products')
                .update({ 
                  stock_quantity: (productBefore?.stock_quantity || 0) + item.quantity,
                  updated_at: new Date().toISOString(),
                  last_inventory_update: new Date().toISOString()
                })
                .eq('id', item.product_id);

              if (manualUpdateError) {
                console.error(`❌ فشل التحديث اليدوي للمنتج ${item.product_id}:`, manualUpdateError);
              } else {
                console.log(`✅ تم التحديث اليدوي للمنتج ${item.product_id} بنجاح`);
              }
            } else if (!restoreResult) {
              console.warn(`⚠️ دالة إعادة المخزون أرجعت false للمنتج ${item.product_id}`);
              
              // محاولة بديلة: تحديث المخزون يدوياً
              console.log(`🔄 محاولة تحديث المخزون يدوياً للمنتج ${item.product_id}`);
              const { error: manualUpdateError } = await supabase
                .from('products')
                .update({ 
                  stock_quantity: (productBefore?.stock_quantity || 0) + item.quantity,
                  updated_at: new Date().toISOString(),
                  last_inventory_update: new Date().toISOString()
                })
                .eq('id', item.product_id);

              if (manualUpdateError) {
                console.error(`❌ فشل التحديث اليدوي للمنتج ${item.product_id}:`, manualUpdateError);
              } else {
                console.log(`✅ تم التحديث اليدوي للمنتج ${item.product_id} بنجاح`);
              }
            } else {
              console.log(`✅ تم إعادة مخزون المنتج ${item.product_id} بنجاح عبر الدالة`);
            }

            // التحقق من النتيجة النهائية
            const { data: productAfter } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();

            console.log(`📊 المخزون بعد التحديث للمنتج ${item.product_id}: ${productAfter?.stock_quantity}`);

          } catch (error) {
            console.error(`❌ خطأ عام في إعادة مخزون المنتج ${item.product_id}:`, error);
          }
        }
        
        console.log(`✅ انتهت عملية إعادة المخزون لجميع المنتجات`);
      }

      // 3. حذف عناصر الطلبية
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteItemsError) {
        console.error('❌ خطأ في حذف عناصر الطلبية:', deleteItemsError);
        // نتابع الحذف حتى لو فشل حذف العناصر
      } else {
        console.log('✅ تم حذف عناصر الطلبية بنجاح');
      }

      // 4. حذف المعاملات المالية المرتبطة
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('order_id', orderId);

      if (transactionsError) {
        console.error('❌ خطأ في حذف المعاملات المالية:', transactionsError);
        // نتابع الحذف
      }

      // 5. حذف أي سجلات مرتبطة أخرى (يمكن إضافة المزيد حسب الحاجة)
      // ملاحظة: جدول المرتجعات قد لا يكون موجود في هذا المشروع

      // 6. حذف الطلبية نفسها
      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('is_online', false);

      if (deleteOrderError) {
        console.error('❌ خطأ في حذف الطلبية:', deleteOrderError);
        throw deleteOrderError;
      }

      console.log('✅ تم حذف الطلبية بنجاح مع إعادة المخزون');
      this.clearCacheForOrder(orderId);
      return true;
    } catch (error) {
      console.error('❌ فشل في حذف الطلبية:', error);
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
   * إلغاء طلبية نقطة البيع
   */
  async cancelOrder(
    orderId: string,
    itemsToCancel: string[] | null = null,
    cancellationReason: string = 'تم الإلغاء',
    restoreInventory: boolean = true,
    cancelledBy?: string
  ): Promise<{
    success: boolean;
    error?: string;
    data?: {
      cancellation_id: string;
      is_partial_cancellation: boolean;
      cancelled_amount: number;
      cancelled_items_count: number;
      total_items_count: number;
      new_total?: number;
      message: string;
    };
  }> {
    try {
      const { data, error } = await supabase.rpc('cancel_pos_order', {
        p_order_id: orderId,
        p_items_to_cancel: itemsToCancel,
        p_cancellation_reason: cancellationReason,
        p_restore_inventory: restoreInventory,
        p_cancelled_by: cancelledBy || null
      });

      if (error) throw error;

      // مسح الكاش المتعلق بهذه الطلبية
      this.clearCacheForOrder(orderId);

              return {
        success: (data as any).success,
        error: (data as any).error,
        data: (data as any).success ? {
          cancellation_id: (data as any).cancellation_id,
          is_partial_cancellation: (data as any).is_partial_cancellation,
          cancelled_amount: parseFloat(String((data as any).cancelled_amount || '0')),
          cancelled_items_count: (data as any).cancelled_items_count,
          total_items_count: (data as any).total_items_count,
          new_total: (data as any).new_total ? parseFloat(String((data as any).new_total)) : undefined,
          message: (data as any).message
        } : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء الطلبية'
      };
    }
  }

  /**
   * جلب سجل إلغاءات طلبية
   */
  async getOrderCancellations(orderId: string): Promise<Array<{
    id: string;
    cancellation_reason: string;
    cancelled_amount: number;
    cancelled_items_count: number;
    total_items_count: number;
    is_partial_cancellation: boolean;
    inventory_restored: boolean;
    created_at: string;
    cancelled_by?: { name: string; email: string; };
  }>> {
    const cacheKey = this.getCacheKey('order_cancellations', { orderId });
    const cached = this.getFromCache<Array<any>>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('order_cancellations')
        .select(`
          id,
          cancellation_reason,
          cancelled_amount,
          cancelled_items_count,
          total_items_count,
          is_partial_cancellation,
          inventory_restored,
          created_at,
          cancelled_by:users!order_cancellations_cancelled_by_fkey(name, email)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      return [];
    }
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
        total_revenue: parseFloat(String(summaryData?.total_revenue || '0')),
        cash_sales: parseFloat(String(summaryData?.cash_sales || '0')),
        card_sales: parseFloat(String(summaryData?.card_sales || '0')),
        completed_orders: summaryData?.completed_orders || 0,
        pending_orders: summaryData?.pending_orders || 0
      };

      this.setCache(cacheKey, summary);
      return summary;
    } catch (error) {
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

  /**
   * تحديث عناصر الطلبية
   */
  async updateOrderItems(
    orderId: string,
    items: Array<{
      id?: string;
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      is_wholesale: boolean;
      color_id?: string;
      size_id?: string;
      color_name?: string;
      size_name?: string;
    }>
  ): Promise<boolean> {
    try {
      // جلب معلومات الطلبية الحالية
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('tax, discount, organization_id')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      // حذف العناصر الموجودة
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) throw deleteError;

      // إضافة العناصر الجديدة
      const newItems = items.map((item, index) => ({
        order_id: orderId,
        organization_id: orderData.organization_id,
        product_id: item.product_id,
        product_name: item.product_name,
        name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_wholesale: item.is_wholesale,
        slug: `ITEM-${Date.now()}-${index}`,
        color_id: item.color_id || null,
        size_id: item.size_id || null,
        color_name: item.color_name || null,
        size_name: item.size_name || null,
        variant_info: item.color_name || item.size_name ? {
          color: item.color_name,
          size: item.size_name
        } : null
      }));

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(newItems);

      if (insertError) throw insertError;

      // حساب المجموع الجديد
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      
      const tax = parseFloat(String(orderData?.tax || '0'));
      const discount = parseFloat(String(orderData?.discount || '0'));
      const total = subtotal + tax - discount;

      // تحديث مجموع الطلبية
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          subtotal,
          total,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // مسح الكاش
      this.clearCacheForOrder(orderId);
      
      return true;
    } catch (error) {
      console.error('Error updating order items:', error);
      return false;
    }
  }

}

// تصدير instance واحد للاستخدام في التطبيق
export const posOrdersService = POSOrdersService.getInstance();
