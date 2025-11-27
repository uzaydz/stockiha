import { useCallback, useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
// افتراضيًا نستخدم الواجهة المتصلة
import { createProduct as createProductOnline, updateProduct as updateProductOnline } from '@/lib/api/products';
import { addCSRFTokenToFormData } from '@/utils/csrf';
import { 
  prepareFormSubmissionData, 
  validateProductColors 
} from '@/utils/product/productFormHelpers';

interface UseProductFormSubmissionProps {
  form: UseFormReturn<ProductFormValues>;
  isEditMode: boolean;
  productId?: string;
  organizationId?: string;
  additionalImages: string[];
  productColors: ProductColor[];
  wholesaleTiers: WholesaleTier[];
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

interface UseProductFormSubmissionReturn {
  isSubmitting: boolean;
  submitForm: (data: ProductFormValues) => Promise<void>;
  handleFormError: (errors: any) => void;
}

export const useProductFormSubmission = ({
  form,
  isEditMode,
  productId,
  organizationId,
  additionalImages,
  productColors,
  wholesaleTiers,
  onSuccess,
  onError,
}: UseProductFormSubmissionProps): UseProductFormSubmissionReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * ⚡ تحديد مسار العودة الذكي
   * - إذا جاء المستخدم من POS layout، يعود لصفحة المنتجات في POS
   * - إذا جاء من Dashboard layout، يعود لصفحة المنتجات في Dashboard
   */
  const getReturnPath = useCallback(() => {
    const currentPath = location.pathname;
    const referrer = (location.state as any)?.from || document.referrer;

    // ⚡ التحقق من المسار الحالي أو المرجع
    // إذا كان المستخدم في POS layout أو جاء منه
    if (
      currentPath.includes('/pos-') ||
      currentPath.includes('/pos-advanced') ||
      currentPath.includes('/product-operations') ||
      referrer.includes('/pos-') ||
      referrer.includes('/product-operations')
    ) {
      return '/dashboard/product-operations/products';
    }

    // المسار الافتراضي للـ Dashboard
    return '/dashboard/products';
  }, [location]);

  // مراقبة تغييرات additionalImages
  useEffect(() => {
  }, [additionalImages]);

  // Enhanced submit handler
  const submitForm = useCallback(async (data: ProductFormValues) => {
    // 🔍 DEBUG: فحص البيانات الحالية للصور
    console.log('[ProductFormSubmission] 🔍 DEBUG - Form data received:');
    console.log('[ProductFormSubmission] 🔍 thumbnail_image:', data.thumbnail_image ? `exists (${Math.round(String(data.thumbnail_image).length/1024)}KB, starts with: ${String(data.thumbnail_image).substring(0, 50)}...)` : 'NOT EXISTS or empty');
    console.log('[ProductFormSubmission] 🔍 additionalImages:', additionalImages?.length || 0, 'images');

    if (!organizationId && !data.organization_id) {
      toast.error("خطأ حرج: معرّف المؤسسة مفقود. لا يمكن إنشاء/تحديث المنتج.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(
      isEditMode ? 'جاري تحديث المنتج...' : 'جاري إنشاء المنتج...'
    );

    try {
      const currentOrganizationId = data.organization_id || organizationId;

      // Validate product colors if using variants
      if (data.has_variants && productColors.length > 0) {
        const colorValidation = validateProductColors(productColors, data.has_variants);
        if (!colorValidation.isValid) {
          toast.error('يرجى التأكد من أن جميع الألوان لها اسم وكود لون وكمية صحيحة');
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare submission data
      const submissionData = prepareFormSubmissionData(
        data,
        currentOrganizationId!,
        additionalImages,
        productColors,
        wholesaleTiers
      );

      // 🔍 DEBUG: فحص البيانات بعد التحضير
      console.log('[ProductFormSubmission] 🔍 DEBUG - After prepareFormSubmissionData:');
      console.log('[ProductFormSubmission] 🔍 submissionData.thumbnail_image:', (submissionData as any).thumbnail_image ? `exists (${Math.round(String((submissionData as any).thumbnail_image).length/1024)}KB)` : 'NOT EXISTS');

      // Add CSRF protection
      const protectedSubmissionData = addCSRFTokenToFormData(submissionData as any);

      // 🔍 DEBUG: فحص البيانات بعد CSRF
      console.log('[ProductFormSubmission] 🔍 DEBUG - After CSRF:');
      console.log('[ProductFormSubmission] 🔍 protectedSubmissionData.thumbnail_image:', (protectedSubmissionData as any).thumbnail_image ? `exists (${Math.round(String((protectedSubmissionData as any).thumbnail_image).length/1024)}KB)` : 'NOT EXISTS');

      // Submit to API
      let result;

      // تحديد المسار بحسب حالة الاتصال
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        // أوفلاين: استخدم المحول الأوفلاين الذي يكتب إلى SQLite + Outbox
        const offline = await import('@/lib/api/offlineProductsAdapter');
        const { imageBase64Service } = await import('@/api/imageBase64Service');

        // ⚡ تحضير الصور المضغوطة قبل إنشاء المنتج
        let processedThumbnail: string | null = null;
        let processedAdditionalImages: string[] = [];

        // ضغط الصورة الرئيسية
        if (data.thumbnail_image) {
          console.log('[ProductFormSubmission] 🖼️ Compressing thumbnail for offline storage...');
          const thumbResult = await imageBase64Service.compressThumbnail(data.thumbnail_image);
          if (thumbResult.success && thumbResult.base64) {
            processedThumbnail = `data:${thumbResult.mimeType};base64,${thumbResult.base64}`;
            console.log(`[ProductFormSubmission] ✅ Thumbnail compressed: ${thumbResult.compressionRatio}% reduction`);
          }
        }

        // ضغط الصور الإضافية
        if (additionalImages && additionalImages.length > 0) {
          console.log(`[ProductFormSubmission] 🖼️ Compressing ${additionalImages.length} additional images...`);
          for (const img of additionalImages) {
            const imgResult = await imageBase64Service.compressAdditionalImage(img);
            if (imgResult.success && imgResult.base64) {
              processedAdditionalImages.push(`data:${imgResult.mimeType};base64,${imgResult.base64}`);
            } else {
              // إذا فشل الضغط، نحتفظ بالأصل
              processedAdditionalImages.push(img);
            }
          }
        }

        // ⚡ إنشاء البيانات المحضرة مع الصور المضغوطة مدمجة
        const offlineProductData = {
          ...protectedSubmissionData,
          // ⚡ الصور المضغوطة تُخزن في الحقول المحلية
          thumbnail_base64: processedThumbnail,
          images_base64: processedAdditionalImages.length > 0 ? JSON.stringify(processedAdditionalImages) : null,
          // ⚡ thumbnail_image يبقى null محلياً - سيتم تحديثه بعد الرفع للخادم
          thumbnail_image: null,
          images: null
        };

        if (isEditMode && productId) {
          result = await offline.updateProduct(productId, offlineProductData as any);
        } else {
          result = await offline.createProduct(offlineProductData as any);
        }

        if (result && result.id) {
          console.log(`[ProductForm] ⚡ Product ${result.id} created with embedded images (thumbnail: ${processedThumbnail ? 'yes' : 'no'}, additional: ${processedAdditionalImages.length})`);
        }
      } else {
        // أونلاين: المسار المتصل المعتاد
        if (isEditMode && productId) {
          result = await updateProductOnline(productId, protectedSubmissionData);
        } else {
          result = await createProductOnline(protectedSubmissionData);
        }
      }

      if (result) {
        toast.dismiss(loadingToast);
        if (!isOnline) {
          toast.success(isEditMode ? 'تم تحديث المنتج محليًا وسيتم المزامنة عند الاتصال' : 'تم حفظ المنتج محليًا وسيتم المزامنة عند الاتصال');
        } else {
          toast.success(isEditMode ? 'تم تحديث المنتج بنجاح' : 'تم إنشاء المنتج بنجاح');
        }

        // ⚡ مسح الـ cache لإجبار إعادة تحميل المنتجات مع الصور المحلية
        try {
          const { clearCache } = await import('@/lib/api/products-simple-cache');
          clearCache();
          console.log('[ProductFormSubmission] ✅ Products cache cleared for refresh');
        } catch (cacheError) {
          console.warn('[ProductFormSubmission] ⚠️ Failed to clear cache:', cacheError);
        }

        // Trigger custom event for data refresh
        try {
          const operation = isEditMode ? 'update' : 'create';
          const customEvent = new CustomEvent('product-operation-completed', {
            detail: {
              operation,
              organizationId: currentOrganizationId,
              productId: result?.id
            }
          });
          window.dispatchEvent(customEvent);
        } catch (refreshError) {
        }

        // Navigate based on mode
        // ⚡ استخدام المسار الذكي للعودة
        const returnPath = getReturnPath();

        if (!isEditMode && result.id) {
          navigate(returnPath);
        } else if (isEditMode) {
          navigate(returnPath, {
            state: {
              refreshData: true,
              updatedProductId: productId,
              timestamp: Date.now()
            }
          });
        }

        // Call success callback
        onSuccess?.(result);
      } else {
        toast.error(
          isEditMode ? 'فشل تحديث المنتج' : 'فشل إنشاء المنتج'
        );
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      
      const message = error.message || 'فشل الاتصال بالخادم.';
      
      // Enhanced error handling for different error types
      if (message.includes('permission') || message.includes('صلاحية') || message.includes('unauthorized') || message.includes('403')) {
        toast.error(`ليس لديك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات - يرجى المحاولة مرة أخرى`);
      } else if (message.includes('JWT') || message.includes('auth') || message.includes('session')) {
        toast.error('انتهت جلسة المصادقة - يرجى تسجيل الدخول مرة أخرى');
      } else if (message.includes('organization_id') || message.includes('معرّف المؤسسة')) {
        toast.error('خطأ في معرّف المؤسسة - يرجى تحديث الصفحة والمحاولة مرة أخرى');
      } else {
        toast.error(`فشل ${isEditMode ? 'تحديث' : 'إنشاء'} المنتج: ${message}`);
      }

      // Call error callback
      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form,
    isEditMode,
    productId,
    organizationId,
    additionalImages,
    productColors,
    wholesaleTiers,
    navigate,
    onSuccess,
    onError,
  ]);

  // Enhanced error handler
  const handleFormError = useCallback((errors: any) => {
    const errorCount = Object.keys(errors).length;
    
    toast.error(`يرجى إصلاح ${errorCount} خطأ في النموذج`);
    
    // Focus on first error field
    const firstError = Object.keys(errors)[0];
    const element = document.querySelector(`[name="${firstError}"]`) as HTMLElement;
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return {
    isSubmitting,
    submitForm,
    handleFormError,
  };
};
