import { supabase } from '@/lib/supabase';

export interface AbandonedCartData {
  organization_id: string;
  product_id?: string;
  product_color_id?: string;
  product_size_id?: string;
  quantity: number;
  customer_name?: string;
  customer_phone: string;
  customer_email?: string;
  province?: string;
  municipality?: string;
  address?: string;
  delivery_option?: string;
  payment_method?: string;
  notes?: string;
  custom_fields_data?: Record<string, any>;
  calculated_delivery_fee?: number;
  subtotal: number;
  discount_amount?: number;
  total_amount: number;
  source?: string;
  session_id?: string;
  page_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface AbandonedCartProcessorOptions {
  enableDeduplication?: boolean;
  deduplicationWindow?: number; // بالدقائق
  enableSegmentation?: boolean;
  enableAutomatedRecovery?: boolean;
  recoveryDelayMinutes?: number;
  maxRecoveryAttempts?: number;
}

export interface AbandonedCartSegment {
  id: string;
  name: string;
  description: string;
  conditions: {
    minValue?: number;
    maxValue?: number;
    abandonmentHours?: { min?: number; max?: number };
    sources?: string[];
    hasEmail?: boolean;
    isReturningCustomer?: boolean;
  };
  recoveryStrategy: {
    type: 'email' | 'sms' | 'whatsapp' | 'push';
    template: string;
    discountPercentage?: number;
    urgencyLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * التحقق من كون النص UUID صالح
 */
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * تحويل slug إلى UUID إذا لزم الأمر
 */
const resolveProductId = async (productIdentifier: string, organizationId: string): Promise<string | null> => {
  // إذا كان UUID صالح، أرجعه كما هو
  if (isValidUUID(productIdentifier)) {
    return productIdentifier;
  }

  // إذا لم يكن UUID، ابحث عن المنتج بالـ slug
  try {
    const { data, error } = await supabase.rpc('get_product_id_by_slug' as any, {
      p_slug: productIdentifier,
      p_organization_id: organizationId
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('خطأ في تحويل slug إلى UUID:', error);
    return null;
  }
};

/**
 * معالج مبسط للطلبات المتروكة
 */
export class AbandonedCartProcessor {
  // كاش للـ product IDs لتجنب استدعاءات متكررة
  private productIdCache = new Map<string, string>();
  
  /**
   * حفظ أو تحديث طلب متروك
   */
  async saveAbandonedCart(data: AbandonedCartData): Promise<{ success: boolean; cartId?: string; error?: string }> {
    try {
      // التحقق من البيانات المطلوبة
      if (!data.organization_id || !data.customer_phone) {
        return { success: false, error: 'بيانات المؤسسة أو رقم الهاتف مفقودة' };
      }

      // تحويل product_id إذا كان slug مع استخدام الكاش
      let resolvedProductId = data.product_id;
      if (data.product_id && !isValidUUID(data.product_id)) {
        // التحقق من الكاش أولاً
        const cacheKey = `${data.organization_id}:${data.product_id}`;
        if (this.productIdCache.has(cacheKey)) {
          resolvedProductId = this.productIdCache.get(cacheKey)!;
        } else {
          // إذا لم يوجد في الكاش، ابحث في قاعدة البيانات
          resolvedProductId = await resolveProductId(data.product_id, data.organization_id);
          if (resolvedProductId) {
            // حفظ في الكاش للمرات القادمة
            this.productIdCache.set(cacheKey, resolvedProductId);
          } else {
            console.warn(`تعذر العثور على المنتج بالـ slug: ${data.product_id}`);
            resolvedProductId = null;
          }
        }
      }

      // إعداد البيانات مع product_id المحول
      const processedData = {
        ...data,
        product_id: resolvedProductId
      };

      // حل محسّن: استخدام stored procedure أو منطق مبسط
      const currentTime = new Date().toISOString();
      
      // أولاً: محاولة تحديث طلب موجود
      const { data: updatedCart, error: updateError } = await supabase
        .from('abandoned_carts')
        .update({
          ...processedData,
          last_activity_at: currentTime,
          updated_at: currentTime
        })
        .eq('organization_id', processedData.organization_id)
        .eq('customer_phone', processedData.customer_phone)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      // إذا تم التحديث بنجاح، أرجع النتيجة
      if (!updateError && updatedCart) {
        return { success: true, cartId: updatedCart.id };
      }

      // إذا لم يوجد طلب للتحديث، أنشئ طلب جديد
      const { data: newCart, error: insertError } = await supabase
        .from('abandoned_carts')
        .insert({
          ...processedData,
          status: 'pending',
          last_activity_at: currentTime,
          created_at: currentTime
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return { success: true, cartId: newCart?.id };

    } catch (error) {
      console.error('خطأ في حفظ الطلب المتروك:', error);
      return { success: false, error: 'حدث خطأ في حفظ البيانات' };
    }
  }

  /**
   * تحويل الطلب المتروك إلى طلب مكتمل
   */
  async markAsConverted(cartId: string, orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          status: 'recovered',
          recovered_at: new Date().toISOString(),
          recovered_order_id: orderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', cartId);

      if (error) throw error;
      console.log(`✅ تم تحويل الطلب المتروك ${cartId} إلى طلب مكتمل ${orderId}`);
      return { success: true };

    } catch (error) {
      console.error('خطأ في تحويل الطلب المتروك:', error);
      return { success: false, error: 'حدث خطأ في تحديث الحالة' };
    }
  }

  /**
   * حذف الطلب المتروك
   */
  async deleteCart(cartId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('abandoned_carts')
        .delete()
        .eq('id', cartId);

      if (error) throw error;
      return { success: true };

    } catch (error) {
      console.error('خطأ في حذف الطلب المتروك:', error);
      return { success: false, error: 'حدث خطأ في الحذف' };
    }
  }

  /**
   * الحصول على إحصائيات الطلبات المتروكة
   */
  async getStats(organizationId: string, timeRange: 'day' | 'week' | 'month' = 'week') {
    try {
      const now = new Date();
      const start = new Date();
      
      switch (timeRange) {
        case 'day':
          start.setDate(now.getDate() - 1);
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
      }

      const { data: abandonedCarts, error } = await supabase
        .from('abandoned_carts')
        .select('id, total_amount, status, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', start.toISOString());

      if (error) throw error;

      const totalCarts = abandonedCarts?.length || 0;
      const pendingCarts = abandonedCarts?.filter(cart => cart.status === 'pending').length || 0;
      const recoveredCarts = abandonedCarts?.filter(cart => cart.status === 'recovered').length || 0;
      const totalValue = abandonedCarts?.reduce((sum, cart) => sum + (cart.total_amount || 0), 0) || 0;
      const recoveryRate = totalCarts > 0 ? (recoveredCarts / totalCarts) * 100 : 0;

      return {
        success: true,
        stats: {
          totalCarts,
          pendingCarts,
          recoveredCarts,
          totalValue,
          averageValue: totalCarts > 0 ? totalValue / totalCarts : 0,
          recoveryRate,
          timeRange
        }
      };

    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
      return { success: false, error: 'حدث خطأ في جلب البيانات' };
    }
  }

  /**
   * إرسال تذكير استرداد يدوي
   */
  async sendRecoveryReminder(
    cartId: string, 
    type: 'email' | 'sms' | 'whatsapp', 
    message: string, 
    operatorId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // تسجيل التذكير
      const { error } = await supabase
        .from('abandoned_cart_reminders')
        .insert({
          abandoned_cart_id: cartId,
          sent_by: operatorId || null,
          channel: type,
          message,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

      // تحديث آخر نشاط للطلب
      await supabase
        .from('abandoned_carts')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', cartId);

      return { success: true };

    } catch (error) {
      console.error('خطأ في إرسال التذكير:', error);
      return { success: false, error: 'حدث خطأ في إرسال التذكير' };
    }
  }
}

// إنشاء instance افتراضي
export const abandonedCartProcessor = new AbandonedCartProcessor(); 