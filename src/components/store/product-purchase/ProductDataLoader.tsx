import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductPageData, ProductPageData, ProductMarketingSettings, ProductReview } from '@/api/product-page';
import type { Product, ProductColor, ProductSize } from '@/lib/api/products';
import { ExtendedFormSettings, ProductMarketingSettings as LocalProductMarketingSettings } from './ProductStateHooks';
import type { CustomFormField } from '@/components/store/order-form/OrderFormTypes';

interface ProductDataLoaderProps {
  slug: string | undefined;
  organizationId: string | undefined;
  isOrganizationLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setProduct: (product: Product | null) => void;
  setEffectiveProduct: (product: Product | null) => void;
  setSelectedColor: (color: ProductColor | null) => void;
  setSizes: (sizes: ProductSize[]) => void;
  setSelectedSize: (size: ProductSize | null) => void;
  setFormSettings: (settings: ExtendedFormSettings | null) => void;
  setCustomFormFields: (fields: CustomFormField[]) => void;
  setMarketingSettings: (settings: LocalProductMarketingSettings | null) => void;
  dataFetchedRef: React.MutableRefObject<boolean>;
}

// إعدادات إعادة المحاولة
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 ثانية
  maxDelay: 5000,  // 5 ثواني
  backoffMultiplier: 2
};

// دالة مساعدة للانتظار
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// دالة مساعدة لحساب تأخير إعادة المحاولة
const calculateRetryDelay = (attempt: number): number => {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelay
  );
  // إضافة عشوائية بسيطة لتجنب thundering herd
  return delay + Math.random() * 1000;
};

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

  // تتبع معاملات الدخل للتصحيح

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

      // التحقق من إلغاء الطلب
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
        }
        setIsLoading(false);
        return;
      }

      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        // التحقق من إلغاء الطلب قبل كل محاولة
        if (currentAbortController.signal.aborted) return;

        try {
          console.log('🔍 loadProductWithRetry - محاولة #' + (attempt + 1) + ' من ' + (RETRY_CONFIG.maxRetries + 1));
          setIsLoading(true);
          setError(null);
          
          const responseData: ProductPageData | null = await getProductPageData(organizationId, slug);
          console.log('🔍 loadProductWithRetry - استلام النتيجة:', {
            hasData: !!responseData,
            hasProduct: !!responseData?.product,
            productName: responseData?.product?.name
          });
          
          // التحقق من إلغاء الطلب بعد الحصول على الاستجابة
          if (currentAbortController.signal.aborted) return;
          
          if (!responseData || !responseData.product || !responseData.product.id) {
            throw new Error('المنتج غير موجود أو تعذر تحميل تفاصيله.');
          }
          
          const actualProduct = responseData.product as Product;
          
          // تحديث البيانات فقط إذا لم يتم إلغاء الطلب
          if (!currentAbortController.signal.aborted) {
            console.log('✅ loadProductWithRetry - بدء معالجة البيانات');
            
            // إضافة الألوان والمقاسات إلى المنتج
            const productWithColors = {
              ...actualProduct,
              colors: responseData.colors || [],
              sizes: responseData.sizes || []
            };

            console.log('✅ loadProductWithRetry - تحديث المنتج:', {
              productId: productWithColors.id,
              productName: productWithColors.name,
              colorsCount: productWithColors.colors.length,
              sizesCount: productWithColors.sizes.length
            });

            setProduct(productWithColors);
            setEffectiveProduct(productWithColors);
            
            // تحديث الألوان والأحجام
            if (responseData.colors && Array.isArray(responseData.colors) && responseData.colors.length > 0) {
              const defaultColor = responseData.colors.find(c => c.is_default) || responseData.colors[0];
              if (defaultColor) {
                setSelectedColor(defaultColor as ProductColor);
                if (actualProduct.use_sizes) {
                  const filteredSizes = (responseData.sizes || []).filter(
                    (size: ProductSize) => size.color_id === defaultColor.id && size.product_id === actualProduct.id
                  );
                  if (filteredSizes.length > 0) {
                    setSizes(filteredSizes);
                    const defaultSize = filteredSizes.find(s => s.is_default) || filteredSizes[0];
                    setSelectedSize(defaultSize);
                  }
                }
              }
            } else {
              setSelectedColor(null);
              setSizes([]);
              setSelectedSize(null);
            }
            
            // تحديث إعدادات النموذج
            if (responseData.form_settings && typeof responseData.form_settings === 'object' && !Array.isArray(responseData.form_settings)) {
              const fs = responseData.form_settings as ExtendedFormSettings;
              setFormSettings(fs);
              if (fs.fields && Array.isArray(fs.fields)) {
                const processedFields = fs.fields.map(field => ({ 
                  ...field, 
                  isVisible: field.isVisible !== undefined ? field.isVisible : true 
                })) as CustomFormField[];
                setCustomFormFields(processedFields);
              }
            } else {
              setFormSettings(null);
              setCustomFormFields([]);
            }

            // تحديث إعدادات التسويق
            if (responseData.marketing_settings && typeof responseData.marketing_settings === 'object' && !Array.isArray(responseData.marketing_settings)) {
              const ms = responseData.marketing_settings as LocalProductMarketingSettings;
              setMarketingSettings(ms);
            } else {
              setMarketingSettings(null);
            }

            dataFetchedRef.current = true;
            retryCountRef.current = 0; // إعادة تعيين عداد المحاولات عند النجاح
            
            console.log('✅ loadProductWithRetry - اكتمل التحميل بنجاح!');
          }
          
          setIsLoading(false);
          return; // نجح التحميل، الخروج من الحلقة
          
        } catch (error: any) {
          console.log('❌ loadProductWithRetry - خطأ في المحاولة #' + (attempt + 1) + ':', error);
          lastError = error;
          
          // التحقق من إلغاء الطلب
          if (currentAbortController.signal.aborted) {
            console.log('❌ loadProductWithRetry - تم إلغاء الطلب أثناء معالجة الخطأ');
            return;
          }
          
          // إذا كان خطأ 404 أو منتج غير موجود، لا نعيد المحاولة
          if (error.message?.includes('404') || 
              error.message?.includes('Product not found') ||
              error.message?.includes('المنتج غير موجود')) {
            console.log('❌ loadProductWithRetry - المنتج غير موجود، إيقاف المحاولات');
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
            // خطأ في تحميل المنتج
            setProduct(null);
            setEffectiveProduct(null);
            setIsLoading(false);
            return;
          }
          
          // انتظار قبل إعادة المحاولة
          const retryDelay = calculateRetryDelay(attempt);
          console.log(`⏳ loadProductWithRetry - إعادة المحاولة بعد ${retryDelay}ms`);
          await delay(retryDelay);
          
          retryCountRef.current = attempt + 1;
        }
      }
      
      // إذا وصلنا هنا، فقد فشلت جميع المحاولات
      if (lastError) {
        console.log('❌ loadProductWithRetry - فشلت جميع المحاولات، آخر خطأ:', lastError);
        setError(lastError.message || 'فشل في تحميل المنتج بعد عدة محاولات');
        setIsLoading(false);
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
