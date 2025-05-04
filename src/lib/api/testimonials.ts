import { supabase } from '@/lib/supabase-client';
import { Testimonial } from '@/components/store/TestimonialCard';

/**
 * الحصول على آراء العملاء لمنظمة محددة
 * @param organizationId معرف المنظمة
 * @param activeOnly جلب الآراء النشطة فقط
 * @returns قائمة بآراء العملاء
 */
export async function getTestimonials(organizationId: string, activeOnly: boolean = true): Promise<Testimonial[]> {
  try {
    const { data, error } = await supabase.rpc(
      'get_organization_testimonials',
      {
        p_organization_id: organizationId,
        p_active_only: activeOnly
      }
    );

    if (error) {
      console.error('خطأ في جلب آراء العملاء:', error);
      return [];
    }

    // تحويل البيانات من قاعدة البيانات إلى تنسيق الواجهة
    return data.map((item: any): Testimonial => ({
      id: item.id,
      customerName: item.customer_name,
      customerAvatar: item.customer_avatar || undefined,
      rating: item.rating,
      comment: item.comment,
      verified: item.verified,
      purchaseDate: item.purchase_date,
      productName: item.product_name || undefined,
      productImage: item.product_image || undefined
    }));
  } catch (error) {
    console.error('خطأ غير متوقع في جلب آراء العملاء:', error);
    return [];
  }
}

/**
 * إضافة رأي جديد
 * @param organizationId معرف المنظمة
 * @param testimonial بيانات الرأي
 * @returns معرف الرأي المضاف
 */
export async function addTestimonial(organizationId: string, testimonial: Partial<Testimonial>): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc(
      'add_customer_testimonial',
      {
        p_organization_id: organizationId,
        p_customer_name: testimonial.customerName,
        p_customer_avatar: testimonial.customerAvatar || null,
        p_rating: testimonial.rating,
        p_comment: testimonial.comment,
        p_verified: testimonial.verified || false,
        p_purchase_date: testimonial.purchaseDate || null,
        p_product_name: testimonial.productName || null,
        p_product_image: testimonial.productImage || null
      }
    );

    if (error) {
      console.error('خطأ في إضافة رأي العميل:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في إضافة رأي العميل:', error);
    return null;
  }
}

/**
 * تحديث رأي موجود
 * @param testimonialId معرف الرأي
 * @param testimonial بيانات الرأي المحدثة
 * @returns نجاح العملية
 */
export async function updateTestimonial(testimonialId: string, testimonial: Partial<Testimonial>): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(
      'update_customer_testimonial',
      {
        p_testimonial_id: testimonialId,
        p_customer_name: testimonial.customerName,
        p_customer_avatar: testimonial.customerAvatar || null,
        p_rating: testimonial.rating,
        p_comment: testimonial.comment,
        p_verified: testimonial.verified || false,
        p_purchase_date: testimonial.purchaseDate || null,
        p_product_name: testimonial.productName || null,
        p_product_image: testimonial.productImage || null,
        p_is_active: true
      }
    );

    if (error) {
      console.error('خطأ في تحديث رأي العميل:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في تحديث رأي العميل:', error);
    return false;
  }
}

/**
 * حذف رأي
 * @param testimonialId معرف الرأي
 * @returns نجاح العملية
 */
export async function deleteTestimonial(testimonialId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(
      'delete_customer_testimonial',
      {
        p_testimonial_id: testimonialId
      }
    );

    if (error) {
      console.error('خطأ في حذف رأي العميل:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في حذف رأي العميل:', error);
    return false;
  }
}

/**
 * تغيير حالة تنشيط الرأي
 * @param testimonialId معرف الرأي
 * @param isActive حالة التنشيط الجديدة
 * @returns نجاح العملية
 */
export async function toggleTestimonialStatus(testimonialId: string, isActive: boolean): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(
      'toggle_testimonial_status',
      {
        p_testimonial_id: testimonialId,
        p_is_active: isActive
      }
    );

    if (error) {
      console.error('خطأ في تغيير حالة رأي العميل:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في تغيير حالة رأي العميل:', error);
    return false;
  }
} 