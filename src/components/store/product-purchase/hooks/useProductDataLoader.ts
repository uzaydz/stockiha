import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductPageData } from '@/api/product-page';
import type { ProductDataLoaderProps } from '../types/ProductDataLoader.types';
import { RETRY_CONFIG, calculateRetryDelay, delay } from '@/utils/retryUtils';

/**
 * هوك لتحميل بيانات المنتج مع إعادة المحاولة
 */
export const useProductDataLoader = ({
  slug,
  organizationId,
  isOrganizationLoading,
  setIsLoading,
  setError,
  setProduct,
  setEffectiveProduct,
  setSelectedColor,
  setSizes,
  setSelectedSize,
  setFormSettings,
  setCustomFormFields,
  setMarketingSettings,
  dataFetchedRef
}: ProductDataLoaderProps) => {
  const navigate = useNavigate();
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // إلغاء أي طلب سابق عند تغيير المعاملات
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // إنشاء AbortController جديد
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    if (dataFetchedRef.current && !slug) return;

    const loadProductWithRetry = async () => {
      // إلغاء أي طلب سابق عند تغيير المعاملات
      if (currentAbortController.signal.aborted) {
        return;
      }

      // إذا كان organizationId غير متاح ولا يزال يتم تحميله، انتظر قليلاً
      if (!organizationId && isOrganizationLoading) {
        setIsLoading(true);
        return;
      }

      // إذا لم يكن لدينا slug أو organizationId بعد انتهاء التحميل
      if (!slug || !organizationId) {
        if (!isOrganizationLoading && !organizationId) {
          setError('لم يتم تحديد المتجر');
        }
        setIsLoading(false);
        return;
      }

      let lastError: any = null;

      // حلقة إعادة المحاولة
      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
          // التحقق من إلغاء الطلب
          if (currentAbortController.signal.aborted) {
            return;
          }

          setIsLoading(true);
          setError(null);

          // جلب بيانات المنتج
          const responseData = await getProductPageData(organizationId, slug);

          if (responseData && responseData.product) {
            // تحديث حالة المنتج
            setProduct(responseData.product);
            setEffectiveProduct(responseData.product);
            setError(null);

            // تحديث الألوان
            if (responseData.colors && responseData.colors.length > 0) {
              setSelectedColor(responseData.colors[0]);
              setSizes(responseData.colors[0].sizes || []);
            }

            // تحديث إعدادات النموذج
            if (responseData.form_settings) {
              setFormSettings(responseData.form_settings);
              setCustomFormFields(responseData.form_settings.custom_fields || []);
            }

            // تحديث إعدادات التسويق
            if (responseData.marketing_settings && typeof responseData.marketing_settings === 'object' && !Array.isArray(responseData.marketing_settings)) {
              const ms = responseData.marketing_settings as any;
              setMarketingSettings(ms);
            } else {
              setMarketingSettings(null);
            }

            dataFetchedRef.current = true;
            retryCountRef.current = 0; // إعادة تعيين عداد المحاولات عند النجاح

            setIsLoading(false);
            return; // نجح التحميل، الخروج من الحلقة

          } else {
            // المنتج غير موجود
            setError('المنتج غير موجود أو غير متاح حالياً');
            setProduct(null);
            setEffectiveProduct(null);
            setSelectedColor(null);
            setSizes([]);
            setSelectedSize(null);
            setFormSettings(null);
            setCustomFormFields([]);
            setMarketingSettings(null);
            setIsLoading(false);
            return;
          }

        } catch (error: any) {
          lastError = error;

          // التحقق من إلغاء الطلب
          if (currentAbortController.signal.aborted) {
            return;
          }

          // إذا كان خطأ 404 أو منتج غير موجود، لا نعيد المحاولة
          if (error.message?.includes('404') ||
              error.message?.includes('Product not found') ||
              error.message?.includes('المنتج غير موجود') ||
              error.message?.includes('PRODUCT_NOT_FOUND')) {
            setError(error.message || 'المنتج غير موجود');
            setProduct(null);
            setEffectiveProduct(null);
            setSelectedColor(null);
            setSizes([]);
            setSelectedSize(null);
            setFormSettings(null);
            setCustomFormFields([]);
            setMarketingSettings(null);
            setIsLoading(false);
            return;
          }

          // إذا كانت هذه المحاولة الأخيرة، اعرض الخطأ
          if (attempt === RETRY_CONFIG.maxRetries) {
            setError(lastError.message || 'فشل في تحميل بيانات المنتج بعد عدة محاولات');
            setProduct(null);
            setEffectiveProduct(null);
            setIsLoading(false);
            return;
          }

          // انتظار قبل إعادة المحاولة
          const delayMs = calculateRetryDelay(attempt);
          await delay(delayMs);
        }
      }
    };

    loadProductWithRetry();

    // تنظيف عند إلغاء تركيب المكون أو تغيير المعاملات
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      dataFetchedRef.current = false;
    };
  }, [
    slug,
    organizationId,
    isOrganizationLoading,
    navigate,
    setIsLoading,
    setError,
    setProduct,
    setEffectiveProduct,
    setSelectedColor,
    setSizes,
    setSelectedSize,
    setFormSettings,
    setCustomFormFields,
    setMarketingSettings,
    dataFetchedRef
  ]);
};
