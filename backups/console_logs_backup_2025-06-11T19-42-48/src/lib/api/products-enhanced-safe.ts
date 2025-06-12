import { supabase } from '@/lib/supabase';

/**
 * دالة محسنة وآمنة لحذف المنتج مع تشخيص أفضل للأخطاء
 * تستخدم دالة safe_delete_product في قاعدة البيانات
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
    
    // التحقق من وجود طلبات مرتبطة أولاً
    const { data: orderItems, error: orderCheckError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', productId)
      .limit(1);
    
    if (orderCheckError) {
      console.error('Error checking orders:', orderCheckError);
      
      // تسجيل المحاولة الفاشلة
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'failed',
          p_error_message: 'فشل التحقق من الطلبات المرتبطة',
          p_error_code: 'ORDER_CHECK_FAILED'
        });
      } catch (err) {
        console.error('Failed to log attempt:', err);
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
    
    // إذا كان المنتج مستخدم في طلبات
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
        console.error('Failed to log attempt:', err);
      }
      
      return {
        success: false,
        error: {
          code: 'PRODUCT_IN_USE',
          message: 'لا يمكن حذف المنتج لأنه مستخدم في طلبات سابقة. يمكنك تعطيل المنتج بدلاً من حذفه.'
        }
      };
    }
    
    // استخدام الدالة الآمنة لحذف المنتج
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('safe_delete_product', {
        p_product_id: productId,
        p_user_id: user.id
      });
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      
      // تسجيل المحاولة الفاشلة
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'failed',
          p_error_message: deleteError.message,
          p_error_code: deleteError.code
        });
      } catch (err) {
        console.error('Failed to log attempt:', err);
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
    
    // التحقق من نتيجة الحذف
    if (!deleteResult?.success) {
      const errorMessage = deleteResult?.error || 'فشل حذف المنتج';
      
      // تسجيل المحاولة الفاشلة
      try {
        await supabase.rpc('log_product_deletion_attempt', {
          p_product_id: productId,
          p_user_id: user.id,
          p_status: 'failed',
          p_error_message: errorMessage,
          p_error_code: deleteResult?.code || 'DELETE_FAILED'
        });
      } catch (err) {
        console.error('Failed to log attempt:', err);
      }
      
      // معالجة أخطاء محددة
      if (errorMessage.includes('ليس لديك صلاحية')) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: errorMessage,
            details: deleteResult
          }
        };
      }
      
      if (errorMessage.includes('المنتج لا ينتمي لمؤسستك')) {
        return {
          success: false,
          error: {
            code: 'WRONG_ORGANIZATION',
            message: errorMessage,
            details: deleteResult
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: errorMessage,
          details: deleteResult
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
      console.error('Failed to log success:', err);
    }
    
    return {
      success: true
    };
    
  } catch (error: any) {
    console.error('Unexpected error in deleteProductEnhanced:', error);
    
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
      console.error('Error fetching deletion attempts:', error);
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
    console.error('Unexpected error in getProductDeletionAttempts:', error);
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
};