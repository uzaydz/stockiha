import { useCallback, useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
import { createProduct, updateProduct } from '@/lib/api/products';
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

  console.log('🔍 [useProductFormSubmission] Hook initialized with:', {
    additionalImages,
    additionalImagesCount: additionalImages.length,
    isEditMode,
    productId
  });

  // مراقبة تغييرات additionalImages
  useEffect(() => {
    console.log('🔍 [useProductFormSubmission] additionalImages changed:', {
      additionalImages,
      additionalImagesCount: additionalImages.length
    });
  }, [additionalImages]);

  // Enhanced submit handler
  const submitForm = useCallback(async (data: ProductFormValues) => {
    // Debug: فحص البيانات الحالية للصور
    console.log('🔍 [submitForm] Current additionalImages state:', {
      additionalImages,
      additionalImagesCount: additionalImages.length
    });

    // Debug: فحص بيانات slug
    console.log('🔍 [submitForm] Form data received:', {
      slug: data.slug,
      hasSlug: !!data.slug,
      slugType: typeof data.slug,
      slugLength: data.slug?.length,
      productName: data.name
    });

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

      // Add CSRF protection
      const protectedSubmissionData = addCSRFTokenToFormData(submissionData as any);

      // Submit to API
      let result;
      if (isEditMode && productId) {
        result = await updateProduct(productId, protectedSubmissionData);
      } else {
        result = await createProduct(protectedSubmissionData);
      }

      if (result) {
        toast.dismiss(loadingToast);
        toast.success(
          isEditMode ? 'تم تحديث المنتج بنجاح' : 'تم إنشاء المنتج بنجاح'
        );

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
          console.warn('Failed to trigger refresh event:', refreshError);
        }

        // Navigate based on mode
        if (!isEditMode && result.id) {
          navigate('/dashboard/products');
        } else if (isEditMode) {
          navigate('/dashboard/products', {
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
