import { supabase } from '@/lib/supabase';

/**
 * دالة اختبار مباشرة لـ safe_delete_product
 */
export const testSafeDeleteProduct = async (productId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('المستخدم غير مسجل الدخول');
      return;
    }

    const organizationId = user.user_metadata?.organization_id;
    
    if (!organizationId) {
      console.error('معرف المؤسسة غير متوفر');
      return;
    }

    console.log('🧪 اختبار safe_delete_product للمنتج:', productId);
    console.log('🏢 معرف المؤسسة:', organizationId);
    console.log('👤 معرف المستخدم:', user.id);

    // اختبار دالة can_delete_product أولاً
    const { data: checkResult, error: checkError } = await supabase
      .rpc('can_delete_product', {
        p_product_id: productId,
        p_organization_id: organizationId
      });

    if (checkError) {
      console.error('❌ خطأ في can_delete_product:', checkError);
      return { success: false, error: checkError };
    }

    console.log('📋 نتيجة فحص إمكانية الحذف:', checkResult);

    // اختبار الحذف الآمن
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('safe_delete_product', {
        p_product_id: productId,
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_force_delete: false
      });

    if (deleteError) {
      console.error('❌ خطأ في safe_delete_product:', deleteError);
      return { success: false, error: deleteError };
    }

    console.log('✅ نتيجة safe_delete_product:', deleteResult);
    return { success: true, result: deleteResult };

  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error);
    return { success: false, error };
  }
}; 