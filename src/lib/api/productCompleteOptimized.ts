import { supabase } from '@/lib/supabase';
import type { 
  ProductCompleteResponse, 
  DataScope,
  CompleteProduct 
} from './productComplete';

// دالة محسنة لجلب بيانات المنتج باستخدام الدالة الجديدة المحسنة
export const getProductCompleteDataOptimized = async (
  productIdentifier: string, // يمكن أن يكون ID أو slug
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
): Promise<ProductCompleteResponse | null> => {

  try {

    const rpcParams = {
      p_product_identifier: productIdentifier,
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'full'
    };

    // استدعاء الدالة المحسنة مع timeout أقصر (10 ثواني بدلاً من 15)
    const startTime = performance.now();
    
    const rpcCall = supabase.rpc('get_product_complete_data_optimized' as any, rpcParams);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Optimized RPC timeout after 10 seconds')), 10000)
    );

    const { data, error } = await Promise.race([rpcCall, timeoutPromise]) as any;
    
    const executionTime = performance.now() - startTime;

    if (error) {
      
      // إذا فشلت الدالة المحسنة، fallback للدالة العادية
      return await fallbackToOriginalFunction(productIdentifier, options);
    }

    if (!data) {
      return null;
    }

    // التحقق من بنية البيانات المُستلمة
    if (data.success === false) {
      throw new Error(data.error?.message || 'فشل في جلب بيانات المنتج');
    }

    // تحويل البيانات لتتوافق مع النوع المتوقع
    const optimizedResponse: ProductCompleteResponse = {
      success: true,
      data_scope: data.data_scope as DataScope,
      product: data.product as CompleteProduct,
      stats: data.stats,
      meta: {
        ...data.meta,
        performance_info: data.performance_info,
        execution_time: executionTime,
        optimized_version: true
      }
    };

    return optimizedResponse;

  } catch (error: any) {
    const errorMessage = error?.message || 'خطأ غير معروف';

    // إذا فشلت الدالة المحسنة، التراجع للدالة العادية
    return await fallbackToOriginalFunction(productIdentifier, options);
  }
};

// دالة التراجع للدالة العادية في حالة فشل المحسنة
const fallbackToOriginalFunction = async (
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  }
): Promise<ProductCompleteResponse | null> => {
  try {
    
    const rpcParams = {
      p_product_identifier: productIdentifier,
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'full'
    };

    const { data, error } = await supabase.rpc('get_product_complete_data' as any, rpcParams);

    if (error) {
      throw error;
    }

    return data;
    
  } catch (error) {
    return null;
  }
};

// hook محسن لاستخدام الدالة الجديدة
export const useProductCompleteOptimized = (
  productIdentifier?: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: DataScope;
  } = {}
) => {
  // يمكن إضافة React Query أو SWR هنا لاحقاً
  // حالياً نقوم بإرجاع الدالة المحسنة للاستخدام المباشر
  return {
    getProductData: () => getProductCompleteDataOptimized(productIdentifier || '', options)
  };
};

export default getProductCompleteDataOptimized;
