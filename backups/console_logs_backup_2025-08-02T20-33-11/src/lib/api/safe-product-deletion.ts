import { supabase } from '@/lib/supabase';

/**
 * دالة اختبار مباشرة لـ safe_delete_product
 */
export const testSafeDeleteProduct = async (productId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return;
    }

    const organizationId = user.user_metadata?.organization_id;
    
    if (!organizationId) {
      return;
    }

    // اختبار دالة can_delete_product أولاً
    const { data: checkResult, error: checkError } = await supabase
      .rpc('can_delete_product', {
        p_product_id: productId,
        p_organization_id: organizationId
      });

    if (checkError) {
      return { success: false, error: checkError };
    }

    // اختبار الحذف الآمن
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('safe_delete_product', {
        p_product_id: productId,
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_force_delete: false
      });

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    return { success: true, result: deleteResult };

  } catch (error) {
    return { success: false, error };
  }
};
