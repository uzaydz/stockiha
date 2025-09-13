import { useMemo } from 'react';
import { useUnifiedProductPageData } from '@/hooks/useUnifiedProductPageData';

export function useUnifiedData({
  productId,
  organizationId,
  initialData,
  enabled = true
}: {
  productId?: string | null;
  organizationId?: string | null;
  initialData?: any;
  enabled?: boolean;
}) {

  // لا نمرر initialData إلا إذا احتوت على product فعلي، حتى لا تمنع الجلب
  const safeInitialData = (initialData && (initialData as any).product) ? initialData : undefined;

  // 🔥 إصلاح فوري: تشخيص شامل للمشكلة
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [useUnifiedData] قبل استدعاء useUnifiedProductPageData:', {
      productId: productId || undefined,
      organizationId: organizationId || undefined,
      enabled: enabled && !!productId,
      hasInitialData: !!safeInitialData
    });
  }

  // ✅ تحسين: تمكين الطلب مع productId فقط، لا نحتاج organizationId في البداية
  const unifiedData = useUnifiedProductPageData({
    productId: productId || undefined,
    organizationId: organizationId || undefined,
    enabled: enabled && !!productId, // تمكين مع productId فقط
    dataScope: 'full',
    initialData: safeInitialData,
    initialDataUpdatedAt: safeInitialData ? Date.now() : undefined
  });

  // 🔍 إصلاح: تشخيص شامل للـ unifiedData المُستلم
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [useUnifiedData] استجابة useUnifiedProductPageData:', {
      hasUnifiedData: !!unifiedData,
      unifiedDataKeys: unifiedData ? Object.keys(unifiedData) : [],
      isLoading: unifiedData?.isLoading,
      hasError: !!unifiedData?.error,
      hasData: !!unifiedData?.data,
      hasProduct: !!unifiedData?.product,
      dataValue: unifiedData?.data,
      productValue: unifiedData?.product
    });
  }


  const effectiveData = useMemo(() => {
    // 🚫 منع التغييرات غير الجوهرية - استخدم فقط الخصائص الفعالة
    if (!unifiedData) return null;

    // إرجاع الكائن كما هو، لكن فقط إذا تغيرت المحتويات الجوهرية
    return {
      ...unifiedData,
      // تثبيت المراجع لمنع re-renders غير ضرورية
      product: unifiedData.product,
      organization: unifiedData.organization,
      organizationSettings: unifiedData.organizationSettings,
      data: unifiedData.data
    };
  }, [
    unifiedData?.product?.id,
    unifiedData?.organization?.id,
    unifiedData?.organizationSettings?.id,
    unifiedData?.data?.product?.id,
    unifiedData?.isLoading,
    unifiedData?.error
  ]); // 🔥 إصلاح: استخدام ids بدلاً من الكامل objects لتقليل التغييرات
  
  // 🔥 إصلاح: تحسين استخراج المنتج من مختلف مصادر البيانات
  const effectiveProduct = useMemo(() => {
    // البحث في مختلف الأماكن المحتملة للمنتج
    let product = null;
    
    // أولوية 1: effectiveData.product مباشرة
    if (effectiveData.product) {
      product = effectiveData.product;
    }
    // أولوية 2: effectiveData.data.product
    else if (effectiveData.data?.product) {
      product = effectiveData.data.product;
    }
    // أولوية 3: البحث في البيانات المغلفة في RPC
    else if (effectiveData.data && typeof effectiveData.data === 'object') {
      const data = effectiveData.data as any;
      
      // فحص البيانات المغلفة في RPC function
      if (data.get_product_complete_data_ultra_optimized?.product) {
        product = data.get_product_complete_data_ultra_optimized.product;
      }
      // جرب مفاتيح محتملة أخرى
      else {
        product = data.product || data.productData || data.item || null;
      }
    }
    
    return product;
  }, [effectiveData]);
  
  // 🔍 Debug: تشخيص مشكلة effectiveProduct مع تفاصيل كاملة
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [useUnifiedData] تشخيص البيانات كامل:', {
      hasUnifiedData: !!unifiedData,
      hasProduct: !!effectiveData.product,
      hasDataProduct: !!effectiveData.data?.product,
      effectiveProductId: effectiveProduct?.id,
      unifiedDataKeys: unifiedData ? Object.keys(unifiedData) : [],
      effectiveDataKeys: effectiveData ? Object.keys(effectiveData) : [],
      rawData: effectiveData.data ? Object.keys(effectiveData.data) : 'no raw data',
      // 🔍 فحص كامل للبيانات
      unifiedDataStructure: unifiedData ? {
        hasError: !!unifiedData.error,
        hasIsLoading: 'isLoading' in unifiedData,
        hasData: !!unifiedData.data,
        hasProduct: !!unifiedData.product,
        dataStructure: unifiedData.data ? Object.keys(unifiedData.data) : 'no data',
        productValue: unifiedData.product || 'no product'
      } : 'no unifiedData'
    });
  }
  
  // ✅ إصلاح: تحسين منطق التحميل ليعرض المنتج فوراً إذا كان متوفراً
  const queryLoading = unifiedData.isLoading && !effectiveProduct && !safeInitialData?.product;
  const queryError = unifiedData.error ? String(unifiedData.error) : null;


  return { unifiedData, effectiveData, effectiveProduct, queryLoading, queryError };
}
