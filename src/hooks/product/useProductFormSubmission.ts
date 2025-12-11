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
import { limitChecker } from '@/lib/subscription/limitChecker';

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
    const locationState = location.state as any;

    // أولوية 1: استخدام returnTo من location.state إذا كان موجوداً
    if (locationState?.returnTo) {
      return locationState.returnTo;
    }

    // أولوية 2: استخدام from من location.state
    const referrer = locationState?.from || document.referrer;

    // أولوية 3: التحقق من المسار الحالي
    const currentPath = location.pathname;

    // ⚡ التحقق المحسّن: إذا كان المستخدم في أي صفحة من product-operations (بما في ذلك /new و /edit)
    // أو في أي صفحة POS، يتم العودة لصفحة المنتجات في product-operations
    const isPOSContext =
      currentPath.includes('/product-operations') ||
      currentPath.includes('/pos-') ||
      currentPath.includes('/pos-advanced') ||
      referrer.includes('/product-operations') ||
      referrer.includes('/pos-') ||
      referrer.includes('/pos-advanced');

    if (isPOSContext) {
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
    // 🔍 DEBUG COMPREHENSIVE: فحص شامل للبيانات
    console.log('='.repeat(80));
    console.log('[ProductFormSubmission] 🚀 SUBMIT STARTED');
    console.log('='.repeat(80));

    console.log('[ProductFormSubmission] 📋 Form data received:', {
      name: data.name,
      price: data.price,
      purchase_price: data.purchase_price,
      stock_quantity: data.stock_quantity,
      category_id: data.category_id,
      organization_id: data.organization_id,
      has_variants: data.has_variants,
      use_sizes: data.use_sizes,
    });

    // 🔍 DEBUG: فحص wholesale_tiers من الـ form مباشرة
    console.log('[ProductFormSubmission] 🔍 DEBUG - data.wholesale_tiers (from form):', (data as any).wholesale_tiers);
    console.log('[ProductFormSubmission] 🔍 DEBUG - wholesaleTiers (from state):', wholesaleTiers);

    // 🔍 DEBUG: أنواع البيع المتقدمة
    console.log('[ProductFormSubmission] 📦 Advanced Selling Types:', {
      sell_by_weight: (data as any).sell_by_weight,
      sell_by_box: (data as any).sell_by_box,
      sell_by_meter: (data as any).sell_by_meter,
      track_expiry: (data as any).track_expiry,
      track_serial_numbers: (data as any).track_serial_numbers,
      track_batches: (data as any).track_batches,
      has_warranty: (data as any).has_warranty,
    });

    // 🔍 DEBUG: الألوان والمقاسات
    console.log('[ProductFormSubmission] 🎨 Colors:', {
      count: productColors?.length || 0,
      colors: productColors?.map(c => ({
        id: c.id,
        name: c.name,
        quantity: c.quantity,
        has_sizes: c.has_sizes,
        sizes_count: c.sizes?.length || 0
      }))
    });

    // 🔍 DEBUG: الصور
    console.log('[ProductFormSubmission] 🖼️ Images:', {
      thumbnail: data.thumbnail_image ? `exists (${Math.round(String(data.thumbnail_image).length/1024)}KB)` : 'MISSING',
      additionalCount: additionalImages?.length || 0,
    });

    console.log('[ProductFormSubmission] 🔍 isEditMode:', isEditMode, 'productId:', productId);

    if (!organizationId && !data.organization_id) {
      toast.error("خطأ حرج: معرّف المؤسسة مفقود. لا يمكن إنشاء/تحديث المنتج.");
      return;
    }

    const currentOrganizationId = data.organization_id || organizationId;

    // ⚡ التحقق من حد المنتجات قبل الإنشاء (فقط عند إنشاء منتج جديد)
    if (!isEditMode && currentOrganizationId) {
      console.log('[ProductFormSubmission] 🔒 Checking product limit...');
      const limitCheck = await limitChecker.canAddProduct(currentOrganizationId);

      if (!limitCheck.allowed) {
        console.log('[ProductFormSubmission] ❌ Product limit reached:', limitCheck);
        toast.error(limitCheck.message, {
          duration: 5000,
          action: {
            label: 'ترقية الخطة',
            onClick: () => {
              // التوجيه لصفحة الاشتراكات
              window.location.href = '/dashboard/subscription';
            }
          }
        });
        return;
      }

      console.log('[ProductFormSubmission] ✅ Product limit check passed:', {
        current: limitCheck.currentCount,
        max: limitCheck.maxLimit,
        remaining: limitCheck.remaining
      });
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(
      isEditMode ? 'جاري تحديث المنتج...' : 'جاري إنشاء المنتج...'
    );

    try {
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
      console.log('[ProductFormSubmission] 📤 Calling prepareFormSubmissionData...');

      let submissionData;
      try {
        // ✅ استخدام wholesale_tiers من الـ form مباشرة إذا كانت موجودة
        // هذا يضمن أن البيانات المدخلة في useFieldArray يتم إرسالها بشكل صحيح
        const effectiveWholesaleTiers = (data as any).wholesale_tiers?.length > 0
          ? (data as any).wholesale_tiers
          : wholesaleTiers;

        console.log('[ProductFormSubmission] 🔍 Using effectiveWholesaleTiers:', effectiveWholesaleTiers);

        submissionData = prepareFormSubmissionData(
          data,
          currentOrganizationId!,
          additionalImages,
          productColors,
          effectiveWholesaleTiers
        );
        console.log('[ProductFormSubmission] ✅ prepareFormSubmissionData SUCCESS');
      } catch (prepareError: any) {
        console.error('[ProductFormSubmission] ❌ prepareFormSubmissionData FAILED:', prepareError);
        console.error('[ProductFormSubmission] ❌ Error message:', prepareError.message);
        console.error('[ProductFormSubmission] ❌ Error stack:', prepareError.stack);
        toast.error(`خطأ في تحضير البيانات: ${prepareError.message}`);
        setIsSubmitting(false);
        return;
      }

      // 🔍 DEBUG: فحص البيانات بعد التحضير
      console.log('[ProductFormSubmission] 📋 After prepareFormSubmissionData:', {
        name: (submissionData as any).name,
        price: (submissionData as any).price,
        organization_id: (submissionData as any).organization_id,
        thumbnail: (submissionData as any).thumbnail_image ? 'exists' : 'MISSING',
        colors_count: (submissionData as any).colors?.length || 0,
        // أنواع البيع المتقدمة
        sell_by_weight: (submissionData as any).sell_by_weight,
        sell_by_box: (submissionData as any).sell_by_box,
        sell_by_meter: (submissionData as any).sell_by_meter,
        track_expiry: (submissionData as any).track_expiry,
        track_serial_numbers: (submissionData as any).track_serial_numbers,
      });

      // Add CSRF protection
      const protectedSubmissionData = addCSRFTokenToFormData(submissionData as any);

      // 🔍 DEBUG: فحص البيانات بعد CSRF
      console.log('[ProductFormSubmission] 🔍 DEBUG - After CSRF:');
      console.log('[ProductFormSubmission] 🔍 protectedSubmissionData.thumbnail_image:', (protectedSubmissionData as any).thumbnail_image ? `exists (${Math.round(String((protectedSubmissionData as any).thumbnail_image).length/1024)}KB)` : 'NOT EXISTS');

      // Submit to API
      let result;

      // تحديد المسار بحسب حالة الاتصال
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      console.log('[ProductFormSubmission] 🌐 Online status:', isOnline);

      if (!isOnline) {
        console.log('[ProductFormSubmission] 📴 OFFLINE MODE - Using local storage');
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
        console.log('[ProductFormSubmission] 🌐 ONLINE MODE - Using server API');
        try {
          if (isEditMode && productId) {
            console.log('[ProductFormSubmission] 📝 Calling updateProductOnline with productId:', productId);
            result = await updateProductOnline(productId, protectedSubmissionData);
            console.log('[ProductFormSubmission] ✅ updateProductOnline result:', result ? 'success' : 'null/undefined');
          } else {
            console.log('[ProductFormSubmission] ➕ Calling createProductOnline...');
            result = await createProductOnline(protectedSubmissionData);
            console.log('[ProductFormSubmission] ✅ createProductOnline result:', result ? `success (id: ${result.id})` : 'null/undefined');
          }
        } catch (apiError: any) {
          console.error('[ProductFormSubmission] ❌ API call FAILED:', apiError);
          console.error('[ProductFormSubmission] ❌ Error details:', {
            message: apiError.message,
            code: apiError.code,
            details: apiError.details,
            hint: apiError.hint,
          });
          throw apiError; // Re-throw to be caught by outer catch
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
