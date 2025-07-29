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
  console.log('🚀 [getProductCompleteDataOptimized] بدء استدعاء الدالة المحسنة:', {
    productIdentifier,
    options,
    timestamp: new Date().toISOString(),
    version: '2.0'
  });

  try {
    console.log('⚡ [getProductCompleteDataOptimized] استدعاء RPC get_product_complete_data_optimized...');

    const rpcParams = {
      p_product_identifier: productIdentifier,
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'full'
    };

    console.log('📝 [getProductCompleteDataOptimized] معاملات RPC المحسنة:', rpcParams);
    console.log('🔍 [DEBUG] استدعاء get_product_complete_data_optimized مع:', {
      productIdentifier,
      organizationId: options.organizationId,
      dataScope: options.dataScope
    });

    // استدعاء الدالة المحسنة مع timeout أقصر (10 ثواني بدلاً من 15)
    const startTime = performance.now();
    
    const rpcCall = supabase.rpc('get_product_complete_data_optimized' as any, rpcParams);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Optimized RPC timeout after 10 seconds')), 10000)
    );

    console.log('⚡ [getProductCompleteDataOptimized] بدء RPC call المحسن مع timeout 10 ثواني...');

    const { data, error } = await Promise.race([rpcCall, timeoutPromise]) as any;
    
    const executionTime = performance.now() - startTime;
    console.log(`🎯 [getProductCompleteDataOptimized] تم الانتهاء في ${executionTime.toFixed(2)}ms`, {
      hasData: !!data,
      dataType: typeof data,
      error: error,
      performanceImprovement: '3-5x faster expected',
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [getProductCompleteDataOptimized] خطأ من RPC المحسن:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        executionTime: `${executionTime.toFixed(2)}ms`
      });
      
      // إذا فشلت الدالة المحسنة، fallback للدالة العادية
      console.log('🔄 [getProductCompleteDataOptimized] التراجع للدالة العادية...');
      return await fallbackToOriginalFunction(productIdentifier, options);
    }

    if (!data) {
      console.warn('⚠️ [getProductCompleteDataOptimized] لا توجد بيانات من RPC المحسن');
      return null;
    }

    // التحقق من بنية البيانات المُستلمة
    if (data.success === false) {
      console.error('❌ [getProductCompleteDataOptimized] فشل في الحصول على البيانات:', {
        error: data.error,
        executionTime: `${executionTime.toFixed(2)}ms`
      });
      throw new Error(data.error?.message || 'فشل في جلب بيانات المنتج');
    }

    console.log('✅ [getProductCompleteDataOptimized] تم جلب البيانات بنجاح:', {
      productId: data.product?.id,
      productName: data.product?.name,
      dataScope: data.data_scope,
      optimized: data.performance_info?.optimized,
      version: data.performance_info?.version,
      executionTime: `${executionTime.toFixed(2)}ms`,
      formStrategy: data.meta?.form_strategy,
      hasShippingAndTemplates: !!data.product?.shipping_and_templates,
      shippingInfo: data.product?.shipping_and_templates?.shipping_info,
      shippingProviderId: data.product?.shipping_and_templates?.shipping_provider_id
    });
    
    console.log('🔍 [DEBUG] Full product data from RPC:', data.product);

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
    console.error('💥 [getProductCompleteDataOptimized] خطأ عام:', {
      error: errorMessage,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });

    // إذا فشلت الدالة المحسنة، التراجع للدالة العادية
    console.log('🔄 [getProductCompleteDataOptimized] التراجع للدالة العادية بسبب خطأ...');
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
    console.log('⚠️ [fallbackToOriginalFunction] استخدام الدالة العادية...');
    
    const rpcParams = {
      p_product_identifier: productIdentifier,
      p_organization_id: options.organizationId || null,
      p_include_inactive: options.includeInactive || false,
      p_data_scope: options.dataScope || 'full'
    };

    const { data, error } = await supabase.rpc('get_product_complete_data' as any, rpcParams);

    if (error) {
      console.error('❌ [fallbackToOriginalFunction] فشل في الدالة العادية أيضاً:', error);
      throw error;
    }

    console.log('✅ [fallbackToOriginalFunction] نجحت الدالة العادية');
    return data;
    
  } catch (error) {
    console.error('💥 [fallbackToOriginalFunction] فشل نهائي:', error);
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