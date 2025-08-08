import { supabase } from '@/lib/supabase';

/**
 * 🔄 دالة تعطيل المنتج (أفضل من الحذف النهائي)
 * تعطل المنتج ويمكن إعادة تفعيله لاحقاً
 */
export const disableProduct = async (productId: string): Promise<{
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
          message: 'يجب تسجيل الدخول لتعطيل المنتج'
        }
      };
    }
    
    // الحصول على معرف المؤسسة من جدول users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData?.organization_id) {
      return {
        success: false,
        error: {
          code: 'ORGANIZATION_REQUIRED',
          message: 'معرف المؤسسة مطلوب'
        }
      };
    }
    
    const organizationId = userData.organization_id;
    
    // تعطيل المنتج بدلاً من حذفه
    const { data, error } = await supabase
      .from('products')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('organization_id', organizationId)
      .select('name')
      .single();
    
    if (error) {
      
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'المنتج غير موجود أو لا ينتمي لمؤسستك'
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'حدث خطأ غير متوقع أثناء تعطيل المنتج',
          details: error
        }
      };
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
 * ✅ دالة إعادة تفعيل المنتج
 */
export const enableProduct = async (productId: string): Promise<{
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
          message: 'يجب تسجيل الدخول لإعادة تفعيل المنتج'
        }
      };
    }
    
    // الحصول على معرف المؤسسة من جدول users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData?.organization_id) {
      return {
        success: false,
        error: {
          code: 'ORGANIZATION_REQUIRED',
          message: 'معرف المؤسسة مطلوب'
        }
      };
    }
    
    const organizationId = userData.organization_id;
    
    // إعادة تفعيل المنتج
    const { data, error } = await supabase
      .from('products')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('organization_id', organizationId)
      .select('name')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'المنتج غير موجود'
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'حدث خطأ أثناء إعادة تفعيل المنتج',
          details: error
        }
      };
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
 * 🗑️ دالة الحذف النهائي (للاستخدام في حالات خاصة فقط)
 * ⚠️ تحذير: هذا سيحذف المنتج نهائياً!
 */
export const deleteProductPermanently = async (productId: string): Promise<{
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
      
      return {
        success: false,
        error: {
          code: 'ORDER_CHECK_FAILED',
          message: 'فشل التحقق من الطلبات المرتبطة',
          details: orderCheckError
        }
      };
    }
    
    // إذا كان المنتج مستخدم في طلبات، امنع الحذف النهائي
    if (orderItems && orderItems.length > 0) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_IN_USE',
          message: 'لا يمكن حذف المنتج نهائياً لأنه مستخدم في طلبات سابقة. استخدم خيار التعطيل بدلاً من ذلك.'
        }
      };
    }
    
    // الحصول على معرف المؤسسة من جدول users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData?.organization_id) {
      return {
        success: false,
        error: {
          code: 'ORGANIZATION_REQUIRED',
          message: 'معرف المؤسسة مطلوب'
        }
      };
    }
    
    const organizationId = userData.organization_id;
    
    // حذف البيانات المرتبطة أولاً
    await supabase.from('inventory_log').delete().eq('product_id', productId);
    await supabase.from('product_images').delete().eq('product_id', productId);
    await supabase.from('product_colors').delete().eq('product_id', productId);
    await supabase.from('product_sizes').delete().eq('product_id', productId);
    
    // حذف المنتج نفسه
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('organization_id', organizationId);
    
    if (deleteError) {
      return {
        success: false,
        error: {
          code: deleteError.code || 'DELETE_FAILED',
          message: deleteError.message || 'فشل حذف المنتج',
          details: deleteError
        }
      };
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

// الحفاظ على اسم الدالة القديمة للتوافق مع باقي الكود
export const deleteProductEnhanced = disableProduct;

/**
 * دالة لجلب المنتجات المعطلة (للمديرين فقط)
 */
export const getDisabledProducts = async (): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'يجب تسجيل الدخول'
      };
    }
    
    // الحصول على معرف المؤسسة
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (!userData?.organization_id) {
      return {
        success: false,
        error: 'معرف المؤسسة مطلوب'
      };
    }
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, sku, price, cost, stock_quantity, 
        created_at, updated_at, is_active
      `)
      .eq('organization_id', userData.organization_id)
      .eq('is_active', false)
      .order('updated_at', { ascending: false });
    
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
