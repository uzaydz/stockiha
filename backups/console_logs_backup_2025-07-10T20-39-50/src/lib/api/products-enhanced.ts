import { supabase } from '@/lib/supabase';

/**
 * دالة محسنة لحذف المنتج مع تشخيص أفضل للأخطاء
 */
export const deleteProductEnhanced = async (productId: string): Promise<{
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}> => {
  try {
    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'يجب تسجيل الدخول لحذف المنتج'
        }
      };
    }
    
    // التحقق من الصلاحيات قبل محاولة الحذف
    const { data: permissionCheck, error: permissionError } = await supabase
      .rpc('check_product_delete_permission', {
        p_product_id: productId,
        p_user_id: user.id
      });
    
    if (permissionError) {
      
      // تسجيل محاولة فاشلة
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'failed',
          p_error_message: 'فشل التحقق من الصلاحيات',
          p_error_code: 'PERMISSION_CHECK_FAILED'
        });
      } catch (err) {
      }
      
      return {
        success: false,
        error: {
          code: 'PERMISSION_CHECK_FAILED',
          message: 'فشل التحقق من الصلاحيات',
          details: permissionError
        }
      };
    }
    
    if (!permissionCheck?.can_delete) {
      
      // تسجيل محاولة مرفوضة
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'permission_denied',
          p_error_message: permissionCheck?.reason || 'لا توجد صلاحيات كافية',
          p_error_code: 'PERMISSION_DENIED'
        });
      } catch (err) {
      }
      
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: permissionCheck?.reason || 'ليس لديك صلاحية لحذف هذا المنتج',
          details: permissionCheck
        }
      };
    }
    
    // التحقق من وجود طلبات مرتبطة
    const { data: orderItems, error: orderCheckError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', productId)
      .limit(1);
    
    if (orderCheckError) {
      
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'failed',
          p_error_message: 'فشل التحقق من الطلبات المرتبطة',
          p_error_code: 'ORDER_CHECK_FAILED'
        });
      } catch (err) {
      }
      
      return {
        success: false,
        error: {
          code: 'ORDER_CHECK_FAILED',
          message: 'فشل التحقق من الطلبات المرتبطة',
          details: orderCheckError
        }
      };
    }
    
    if (orderItems && orderItems.length > 0) {
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'failed',
          p_error_message: 'المنتج مرتبط بطلبات سابقة',
          p_error_code: 'PRODUCT_IN_USE'
        });
      } catch (err) {
      }
      
      return {
        success: false,
        error: {
          code: 'PRODUCT_IN_USE',
          message: 'لا يمكن حذف المنتج لأنه مستخدم في طلبات سابقة. يمكنك تعطيل المنتج بدلاً من حذفه.'
        }
      };
    }
    
    // محاولة حذف المنتج
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (deleteError) {
      
      // تسجيل الخطأ
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'failed',
          p_error_message: deleteError.message,
          p_error_code: deleteError.code
        });
      } catch (err) {
      }
      
      // معالجة أخطاء محددة
      if (deleteError.code === '42501') {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'ليس لديك صلاحية لحذف هذا المنتج. تحقق من صلاحياتك مع مدير النظام.',
            details: deleteError
          }
        };
      }
      
      if (deleteError.code === '23503') {
        return {
          success: false,
          error: {
            code: 'FOREIGN_KEY_VIOLATION',
            message: 'لا يمكن حذف المنتج لأنه مرتبط ببيانات أخرى في النظام.',
            details: deleteError
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: deleteError.code || 'UNKNOWN_ERROR',
          message: deleteError.message || 'حدث خطأ غير متوقع أثناء حذف المنتج',
          details: deleteError
        }
      };
    }
    
    // تسجيل النجاح
    try {
      await supabase.rpc('log_product_deletion_attempt', {
        p_product_id: productId,
        p_user_id: user.id,
        p_status: 'success',
        p_error_message: null,
        p_error_code: null
      });
    } catch (err) {
    }
    
    return {
      success: true
    };
    
  } catch (error: any) {
    
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'حدث خطأ غير متوقع',
        details: error
      }
    };
  }
};

/**
 * دالة لجلب سجل محاولات حذف المنتج (للمديرين فقط)
 */
export const getProductDeletionAttempts = async (productId?: string): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> => {
  try {
    let query = supabase
      .from('product_deletion_attempts')
      .select(`
        *,
        product:products(name),
        user:users(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      data: data || []
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
};
