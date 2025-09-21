import { useMemo, useRef } from 'react';
import { useUnifiedProductPageData } from '@/hooks/useUnifiedProductPageData';

export function useUnifiedData({
  productId,
  organizationId,
  initialData,
  enabled = true,
  queryKey
}: {
  productId?: string | null;
  organizationId?: string | null;
  initialData?: any;
  enabled?: boolean;
  queryKey?: string[];
}) {
  // PERF: علّم بداية استخدام hook (بدون await داخل الدالة)
  try { void import('@/utils/perfDebug').then(m => m.default.log('useUnifiedData.start', { productId, hasInitial: !!(initialData as any)?.product })); } catch {}
  // لا نمرر initialData إلا إذا احتوت على product فعلي، حتى لا تمنع الجلب
  const safeInitialData = useMemo(() =>
    (initialData && (initialData as any).product) ? initialData : undefined,
    [initialData?.product?.id] // فقط عندما يتغير المنتج
  );

  // ✅ تحسين: تمكين الطلب مع productId فقط، لا نحتاج organizationId في البداية
  const unifiedData = useUnifiedProductPageData({
    productId: productId || undefined,
    organizationId: organizationId || undefined,
    enabled: enabled && !!productId, // تمكين مع productId فقط
    dataScope: 'full',
    initialData: safeInitialData,
    queryKey
    // إزالة initialDataUpdatedAt لأنه يسبب re-renders
  });

  const effectiveData = useMemo(() => {
    // 🚫 منع التغييرات غير الجوهرية - استخدم فقط الخصائص الفعالة
    if (!unifiedData) return null;

    // 🔥 إصلاح: منع إعادة الإنشاء إلا عند التغيير الفعلي
    // تقليل اللوجات لتجنب إعادة التصيير المتكررة
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) { // 5% فقط من المرات
      console.log('🔍 [effectiveData] unifiedData:', {
        hasData: !!unifiedData,
        hasProduct: !!unifiedData?.product,
        productId: unifiedData?.product?.id,
        isLoading: unifiedData?.isLoading,
        error: unifiedData?.error
      });
    }

    return unifiedData; // إرجاع unifiedData مباشرة بدون نسخ
  }, [
    // إضافة dependencies أكثر لضمان التحديث
    unifiedData?.product?.id,
    unifiedData?.product,
    unifiedData?.isLoading,
    unifiedData?.error
  ]);

  // 🔥 تحسين: استخدم useRef لمنع إعادة الحساب المفرط
  const effectiveProductRef = useRef<any>(null);
  const lastProductIdRef = useRef<string | null>(null);
  
  const effectiveProduct = useMemo(() => {
    // إذا لم يتغير productId، استخدم المنتج المحفوظ
    if (lastProductIdRef.current === productId && effectiveProductRef.current) {
      return effectiveProductRef.current;
    }

    // البحث في مختلف الأماكن المحتملة للمنتج
    let product = null;

    // أولوية 1: effectiveData.product مباشرة (المنتج المدمج من API الجديد)
    if (effectiveData?.product) {
      product = effectiveData.product;
    }
    // أولوية 2: effectiveData.data.product
    else if (effectiveData?.data?.product) {
      product = effectiveData.data.product;
    }
    // أولوية 3: البحث في البيانات المغلفة في API الجديد أو القديم
    else if (effectiveData?.data && typeof effectiveData.data === 'object') {
      const data = effectiveData.data as any;

      // ✅ تحديث: فحص البيانات الجديدة المنفصلة أولاً
      if (data.basic?.product) {
        product = data.basic.product;
      }
      // فحص البيانات المغلفة في RPC function القديم (للتوافق)
      else if (data.get_product_complete_data_ultra_optimized?.product) {
        product = data.get_product_complete_data_ultra_optimized.product;
      }
      // جرب مفاتيح محتملة أخرى
      else {
        product = data.product || data.productData || data.item || null;
      }
    }

    // حفظ النتيجة في ref
    effectiveProductRef.current = product;
    lastProductIdRef.current = productId;

    return product;
  }, [
    // تقليل dependencies للحد الأدنى لمنع re-computation
    effectiveData?.product?.id,
    effectiveData?.data?.product?.id,
    productId
  ]);

  // ✅ إصلاح: تحسين منطق التحميل ليعرض المنتج فوراً إذا كان متوفراً
  const queryLoading = unifiedData?.isLoading && !effectiveProduct && !safeInitialData?.product;
  const queryError = unifiedData?.error ? String(unifiedData.error) : null;

  // PERF: علّم نهاية استخدام hook
  try { void import('@/utils/perfDebug').then(m => m.default.log('useUnifiedData.end', { queryLoading, hasProduct: !!effectiveProduct })); } catch {}

  return { unifiedData, effectiveData, effectiveProduct, queryLoading, queryError };
}
