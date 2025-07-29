import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { Loader2, Save, Package, ArrowLeft, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet';

// Custom Hooks
import { useTenant } from '@/context/TenantContext';
import { useProductFormInitialization } from '@/hooks/useProductFormInitialization';
import { useCategoryData } from '@/hooks/useCategoryData';
import { useProductPermissions } from '@/hooks/useProductPermissions';

// UI Components
import Layout from '@/components/Layout';
import ProductQuickInfoPanel from '@/components/product/form/ProductQuickInfoPanel';
import ProductFormTabs from '@/components/product/form/ProductFormTabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

// Types & API
import { 
  productSchema, 
  ProductFormValues, 
  ProductColor, 
  WholesaleTier, 
  productAdvancedSettingsSchema 
} from '@/types/product';
import { createProduct, updateProduct, InsertProduct, UpdateProduct } from '@/lib/api/products';
import { Category, Subcategory } from '@/lib/api/categories';
import { cn } from '@/lib/utils';
import { cacheManager } from '@/lib/cache/CentralCacheManager';
import { refreshAfterProductOperation } from '@/lib/data-refresh-helpers';

const ProductForm = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization, refreshOrganizationData } = useTenant();
  const organizationIdFromTenant = currentOrganization?.id;

  // Enhanced state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveDrafts, setAutoSaveDrafts] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isManualSubmit, setIsManualSubmit] = useState(false);

  // Form state
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTier[]>([]);
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [useSizes, setUseSizes] = useState(false);
  const [hasVariantsState, setHasVariantsState] = useState(false);

  // Enhanced form configuration
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      purchase_price: 0,
      allow_retail: true,
      sku: '',
      category_id: '',
      stock_quantity: 0,
      thumbnail_image: '',
      organization_id: undefined,
      has_variants: false,
      show_price_on_landing: true,
      is_featured: false,
      is_new: true,
      advancedSettings: productAdvancedSettingsSchema.parse({}),
      additional_images: [],
      colors: [],
      wholesale_tiers: [],
      use_sizes: false,
      is_sold_by_unit: true,
      unit_type: '',
      use_variant_prices: false,
      unit_purchase_price: undefined,
      unit_sale_price: undefined,
      form_template_id: null,
      shipping_provider_id: null,
      use_shipping_clone: false,
      shipping_clone_id: null,
      created_by_user_id: undefined,
      updated_by_user_id: undefined,
      slug: '',
      is_digital: false,
      features: [],
      specifications: {},
      compare_at_price: undefined,
      brand: '',
      barcode: '',
      name_for_shipping: '',
      allow_wholesale: false,
      allow_partial_wholesale: false,
      wholesale_price: undefined,
      partial_wholesale_price: undefined,
      min_wholesale_quantity: undefined,
      min_partial_wholesale_quantity: undefined,
      subcategory_id: undefined,
    },
  });

  // Watch form values
  const watchedValues = form.watch();
  const formErrors = form.formState.errors;
  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;

  // Hooks
  const { 
    isLoading: isLoadingProduct, 
    productNameForTitle, 
    isEditMode, 
    initialDataSet 
  } = useProductFormInitialization({
    id: productId,
    form,
    organizationId: organizationIdFromTenant,
    setAdditionalImages,
    setProductColors,
    setWholesaleTiers,
    setUseVariantPrices,
    setUseSizes,
    setHasVariantsState,
  });

  const { hasPermission, isCheckingPermission, permissionWarning } = useProductPermissions({ isEditMode });

  const watchCategoryId = form.watch('category_id');
  const { 
    categories, 
    subcategories, 
    handleCategoryCreated, 
    handleSubcategoryCreated 
  } = useCategoryData({
    organizationId: organizationIdFromTenant,
    watchCategoryId,
  });

  // Watched values for real-time updates
  const watchHasVariants = form.watch('has_variants', hasVariantsState);
  const watchPrice = form.watch('price');
  const watchPurchasePrice = form.watch('purchase_price');
  const watchThumbnailImage = form.watch('thumbnail_image');
  const watchName = form.watch('name');

  // Calculate form progress
  const calculateProgress = () => {
    const requiredFields = ['name', 'description', 'price', 'category_id', 'thumbnail_image'];
    const completedFields = requiredFields.filter(field => {
      const value = form.getValues(field as keyof ProductFormValues);
      return value !== undefined && value !== null && value !== '';
    });
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const progress = calculateProgress();

  // Auto-save draft functionality
  const saveDraft = useCallback(async () => {
    if (!autoSaveDrafts || isEditMode || !organizationIdFromTenant) return;
    
    setIsSavingDraft(true);
    try {
      const draftData = {
        formData: watchedValues,
        timestamp: Date.now(),
        additionalImages,
        productColors,
        wholesaleTiers
      };
      
      localStorage.setItem(`product-draft-${organizationIdFromTenant}`, JSON.stringify(draftData));
      setTimeout(() => setIsSavingDraft(false), 800);
    } catch (error) {
      setIsSavingDraft(false);
    }
  }, [autoSaveDrafts, isEditMode, organizationIdFromTenant, watchedValues, additionalImages, productColors, wholesaleTiers]);

  // Auto-save effect
  useEffect(() => {
    if (isDirty && !isEditMode && autoSaveDrafts) {
      const timeoutId = setTimeout(saveDraft, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [watchedValues, isDirty, isEditMode, autoSaveDrafts, saveDraft]);

  // Load draft on component mount
  useEffect(() => {
    if (!isEditMode && autoSaveDrafts && organizationIdFromTenant) {
      try {
        const savedDraft = localStorage.getItem(`product-draft-${organizationIdFromTenant}`);
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft);
          const timeDiff = Date.now() - draftData.timestamp;
          
          if (timeDiff < 24 * 60 * 60 * 1000) {
            Object.entries(draftData.formData).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
                form.setValue(key as keyof ProductFormValues, value, { shouldDirty: false });
              }
            });
            
            setAdditionalImages(draftData.additionalImages || []);
            setProductColors(draftData.productColors || []);
            setWholesaleTiers(draftData.wholesaleTiers || []);
            
            toast.info('تم استرجاع المسودة المحفوظة');
          }
        }
      } catch (error) {
      }
    }
  }, [isEditMode, autoSaveDrafts, organizationIdFromTenant, form]);

  // مزامنة النموذج مع productColors state
  useEffect(() => {
    if (initialDataSet) {
      form.setValue('colors', productColors, { shouldValidate: false, shouldDirty: false });
    }
  }, [productColors, initialDataSet, form]);

  // Enhanced submit handler
  const onSubmit = async (data: ProductFormValues) => {
    // منع الحفظ إذا لم يكن الإرسال يدوياً (مثل تحديث العروض الخاصة)
    if (!isManualSubmit) {
      return;
    }

    // إعادة تعيين بعد التحقق
    setIsManualSubmit(false);

    if (!organizationIdFromTenant && !data.organization_id) {
      toast.error("خطأ حرج: معرّف المؤسسة مفقود. لا يمكن إنشاء/تحديل المنتج.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(isEditMode ? 'جاري تحديث المنتج...' : 'جاري إنشاء المنتج...');

    try {
      const currentOrganizationId = data.organization_id || organizationIdFromTenant;
      
      const imagesToSubmit = additionalImages.filter(url => typeof url === 'string' && url.length > 0);

      const colorsToSubmit = productColors.map(color => {
        // تنظيف بيانات اللون لضمان التوافق مع schema
        const cleanedColor: any = {
          id: color.id,
          name: color.name?.trim() || '',
          color_code: color.color_code || '#000000',
          image_url: color.image_url === null || color.image_url === undefined ? undefined : String(color.image_url),
          quantity: Number(color.quantity) || 0,
          is_default: Boolean(color.is_default),
          product_id: color.product_id,
          has_sizes: Boolean(color.has_sizes),
        };

        // تنظيف وإضافة الحقول الاختيارية فقط إذا كانت صحيحة
        if (color.price !== undefined && color.price !== null) {
          cleanedColor.price = Number(color.price);
        }
        if (color.purchase_price !== undefined && color.purchase_price !== null) {
          cleanedColor.purchase_price = Number(color.purchase_price);
        }
        if (color.barcode && typeof color.barcode === 'string' && color.barcode.trim() && color.barcode !== 'null') {
          cleanedColor.barcode = color.barcode.trim();
        }
        if (color.variant_number !== undefined && color.variant_number !== null) {
          cleanedColor.variant_number = Number(color.variant_number);
        }

        // معالجة المقاسات إذا كانت موجودة
        if (color.sizes && color.sizes.length > 0) {
          cleanedColor.sizes = color.sizes.map(size => {
            const cleanedSize: any = {
              id: size.id,
              color_id: size.color_id,
              product_id: size.product_id,
              size_name: size.size_name?.trim() || '',
              quantity: Number(size.quantity) || 0,
              is_default: Boolean(size.is_default),
            };

            // تنظيف وإضافة الحقول الاختيارية للمقاسات
            if (size.price !== undefined && size.price !== null) {
              cleanedSize.price = Number(size.price);
            }
            if (size.purchase_price !== undefined && size.purchase_price !== null) {
              cleanedSize.purchase_price = Number(size.purchase_price);
            }
            if (size.barcode && typeof size.barcode === 'string' && size.barcode.trim() && size.barcode !== 'null') {
              cleanedSize.barcode = size.barcode.trim();
            }

            return cleanedSize;
          });
        }
        
        return cleanedColor;
      });

      const wholesaleTiersToSubmit = wholesaleTiers.map(tier => ({
        ...tier,
        min_quantity: Number(tier.min_quantity),
        price_per_unit: Number(tier.price_per_unit),
      }));

      // تحقق من صحة الألوان قبل الإرسال إذا كان المنتج يستخدم المتغيرات
      if (data.has_variants && productColors.length > 0) {
        const invalidColors = productColors.filter(color => 
          !color.name?.trim() || 
          !color.color_code ||
          color.quantity === undefined || 
          color.quantity < 0
        );
        
        if (invalidColors.length > 0) {
          toast.error('يرجى التأكد من أن جميع الألوان لها اسم وكود لون وكمية صحيحة');
          setIsSubmitting(false);
          return;
        }
      }

      // تحديث النموذج بالألوان المنظفة
      form.setValue('colors', colorsToSubmit, { shouldValidate: false });

      const submissionData = {
        ...data,
        organization_id: currentOrganizationId,
        images: imagesToSubmit,
        colors: colorsToSubmit,
        wholesale_tiers: wholesaleTiersToSubmit,
        price: Number(data.price),
        purchase_price: Number(data.purchase_price),
        stock_quantity: Number(data.stock_quantity),
        is_digital: data.is_digital || false,
        is_featured: data.is_featured || false,
        is_new: data.is_new === undefined ? true : data.is_new,
        has_variants: data.has_variants || false,
        show_price_on_landing: data.show_price_on_landing === undefined ? true : data.show_price_on_landing,
        allow_retail: data.allow_retail === undefined ? true : data.allow_retail,
        allow_wholesale: data.allow_wholesale || false,
        allow_partial_wholesale: data.allow_partial_wholesale || false,
        use_sizes: data.use_sizes || false,
        use_shipping_clone: data.use_shipping_clone || false,
        compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : null,
        wholesale_price: data.wholesale_price ? Number(data.wholesale_price) : null,
        partial_wholesale_price: data.partial_wholesale_price ? Number(data.partial_wholesale_price) : null,
        min_wholesale_quantity: data.min_wholesale_quantity ? Number(data.min_wholesale_quantity) : null,
        min_partial_wholesale_quantity: data.min_partial_wholesale_quantity ? Number(data.min_partial_wholesale_quantity) : null,
        subcategory_id: data.subcategory_id || null,
        brand: data.brand || null,
        barcode: data.barcode || null,
        name_for_shipping: data.name_for_shipping || null,
        unit_type: data.unit_type || null,
        unit_purchase_price: data.unit_purchase_price ? Number(data.unit_purchase_price) : null,
        unit_sale_price: data.unit_sale_price ? Number(data.unit_sale_price) : null,
        form_template_id: data.form_template_id || null,
        shipping_provider_id: data.shipping_provider_id || null,
        shipping_clone_id: data.shipping_clone_id || null,
        features: data.features || [],
        specifications: data.specifications || {},
        slug: data.slug || `${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        advancedSettings: data.advancedSettings || undefined,
        marketingSettings: data.marketingSettings || undefined,
        special_offers_config: data.special_offers_config || undefined,
        additional_images: imagesToSubmit,
      };
      
      let result;

      if (isEditMode && productId) {
        result = await updateProduct(productId, submissionData as any);
      } else {
        result = await createProduct(submissionData as any);
      }

      if (result) {
        toast.dismiss(loadingToast);
        toast.success(isEditMode ? 'تم تحديث المنتج بنجاح' : 'تم إنشاء المنتج بنجاح');

        // Clear draft after successful submission
        if (!isEditMode && autoSaveDrafts) {
          localStorage.removeItem(`product-draft-${organizationIdFromTenant}`);
        }

        // 🚀 تحديث محسن: تجنب التكرار
        try {
          const operation = isEditMode ? 'update' : 'create';
          const customEvent = new CustomEvent('product-operation-completed', { 
            detail: { operation, organizationId: currentOrganizationId, productId: result?.id } 
          });
          window.dispatchEvent(customEvent);
        } catch (refreshError) {
        }

        // التوجه السلس لصفحة المنتجات (بدون إعادة تحميل)
        if (!isEditMode && result.id) {
          navigate('/dashboard/products');
        } else if (isEditMode) {
          // في حالة التعديل، توجه سلس مع إشارة للتحديث
          navigate('/dashboard/products', { 
            state: { 
              refreshData: true, 
              updatedProductId: productId,
              timestamp: Date.now() 
            }
          });
        }
      } else {
        toast.error(isEditMode ? 'فشل تحديث المنتج' : 'فشل إنشاء المنتج');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      
      const message = error.message || 'فشل الاتصال بالخادم.';
      
      // Enhanced error handling for different error types
      if (message.includes('permission') || message.includes('صلاحية') || message.includes('unauthorized') || message.includes('403')) {
        toast.error(`ليس لديك صلاحية ${isEditMode ? 'تعديل' : 'إضافة'} المنتجات - يرجى المحاولة مرة أخرى`);
        // Don't navigate away, let user try again or contact admin
      } else if (message.includes('JWT') || message.includes('auth') || message.includes('session')) {
        toast.error('انتهت جلسة المصادقة - يرجى تسجيل الدخول مرة أخرى');
      } else if (message.includes('organization_id') || message.includes('معرّف المؤسسة')) {
        toast.error('خطأ في معرّف المؤسسة - يرجى تحديث الصفحة والمحاولة مرة أخرى');
      } else {
        toast.error(`فشل ${isEditMode ? 'تحديث' : 'إنشاء'} المنتج: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced error handler
  const onInvalid = useCallback((errors: any) => {
    const errorCount = Object.keys(errors).length;

    // تحقق خاص من أخطاء الألوان
    if (errors.colors) {
    }
    
    toast.error(`يرجى إصلاح ${errorCount} خطأ في النموذج`);
    
    // Focus on first error field
    const firstError = Object.keys(errors)[0];
    const element = document.querySelector(`[name="${firstError}"]`) as HTMLElement;
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Optimized handlers
  const handleMainImageChange = useCallback((url: string) => {
    form.setValue('thumbnail_image', url, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleAdditionalImagesChange = useCallback((urls: string[]) => {
    setAdditionalImages(urls);
  }, []);

  const handleProductColorsChange = useCallback((colors: ProductColor[]) => {
    
    // تنظيف الألوان من قيم null قبل تعيينها
    const cleanedColors = colors.map(color => ({
      ...color,
      barcode: color.barcode === null || color.barcode === 'null' ? undefined : color.barcode,
      price: color.price === null ? undefined : color.price,
      purchase_price: color.purchase_price === null ? undefined : color.purchase_price,
      variant_number: color.variant_number === null ? undefined : color.variant_number,
      image_url: color.image_url === null ? undefined : color.image_url,
      sizes: color.sizes ? color.sizes.map(size => ({
        ...size,
        barcode: size.barcode === null || size.barcode === 'null' ? undefined : size.barcode,
        price: size.price === null ? undefined : size.price,
        purchase_price: size.purchase_price === null ? undefined : size.purchase_price,
      })) : undefined
    }));
    
    setProductColors(cleanedColors);
    // تحديث النموذج أيضاً
    form.setValue('colors', cleanedColors, { shouldValidate: true, shouldDirty: true });
    
  }, [form]);

  const handleWholesaleTiersChange = useCallback((tiers: WholesaleTier[]) => {
    setWholesaleTiers(tiers);
  }, []);

  const handleHasVariantsChange = useCallback((hasVariantsValue: boolean) => {
    form.setValue('has_variants', hasVariantsValue, { shouldValidate: true, shouldDirty: true });
    setHasVariantsState(hasVariantsValue);
    if (!hasVariantsValue) {
      setProductColors([]);
      setUseVariantPrices(false);
    }
  }, [form]);

  const handleUseVariantPricesChange = useCallback((use: boolean) => {
    setUseVariantPrices(use);
  }, []);

  const handleUseSizesChange = useCallback((use: boolean) => {
    setUseSizes(use);
    form.setValue('use_sizes', use, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  // تحديث النموذج عند تحميل الألوان من الخادم (محسن لتجنب التكرار)
  useEffect(() => {
    if (productColors.length > 0) {
      form.setValue('colors', productColors, { shouldValidate: false, shouldDirty: false });
    }
  }, [productColors, form]);

  // Enhanced loading states
  const renderLoadingState = (message: string) => (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{message}</h3>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );

  // Loading states
  if (isCheckingPermission) {
    return renderLoadingState('جاري التحقق من الصلاحيات...');
  }

  if (!isEditMode && isLoadingProduct && !initialDataSet) {
    return renderLoadingState('جاري تهيئة النموذج...');
  }

  if (isEditMode && isLoadingProduct) {
    return renderLoadingState('جاري تحميل بيانات المنتج...');
  }

  // Permission check
  if (!hasPermission && !isCheckingPermission) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-destructive">عدم وجود صلاحية</h3>
            <p className="text-muted-foreground">ليس لديك الصلاحية لعرض هذه الصفحة</p>
          </div>
          <Button onClick={() => navigate('/dashboard/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة إلى المنتجات
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <Helmet>
          <title>
            {isEditMode 
              ? `تعديل: ${productNameForTitle || watchName || 'منتج'}` 
              : 'إنشاء منتج جديد'
            } - سوق
          </title>
        </Helmet>
        
        <form
          id="product-form"
          onSubmit={(e) => {
            e.preventDefault();
            const currentOrgIdInFormState = form.getValues('organization_id');
            
            if (!currentOrgIdInFormState && organizationIdFromTenant) {
              form.setValue('organization_id', organizationIdFromTenant, { 
                shouldValidate: false, 
                shouldDirty: false 
              });
            }
            form.handleSubmit(onSubmit, onInvalid)(e);
          }}
          className="min-h-screen bg-muted/30"
        >
          {/* Enhanced Header */}
          <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 sm:px-6 py-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard/products')}
                    disabled={isSubmitting}
                    className="shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-semibold truncate">
                      {isEditMode 
                        ? `تعديل: ${productNameForTitle || watchName || 'منتج'}` 
                        : 'إضافة منتج جديد'
                      }
                    </h1>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      {isEditMode ? 'قم بتعديل تفاصيل المنتج' : 'أضف منتج جديد إلى متجرك'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Auto-save indicator */}
                  {autoSaveDrafts && !isEditMode && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isSavingDraft ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="hidden sm:inline">جاري الحفظ...</span>
                        </>
                      ) : isDirty ? (
                        <>
                          <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                          <span className="hidden sm:inline">غير محفوظ</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="hidden sm:inline">محفوظ</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {progress}% مكتمل
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="container mx-auto px-4 sm:px-6 py-6">
            {/* Welcome Message for New Products */}
            {!isEditMode && (
              <Alert className="mb-6 border-primary/20 bg-primary/5">
                <Package className="h-4 w-4" />
                <AlertTitle>إنشاء منتج جديد</AlertTitle>
                <AlertDescription>
                  املأ جميع المعلومات المطلوبة لإنشاء منتج احترافي. سيتم حفظ مسودة تلقائياً أثناء الكتابة.
                </AlertDescription>
              </Alert>
            )}

            {/* Permission warning */}
            {permissionWarning && (
              <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">تحذير الصلاحيات</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  {permissionWarning}
                </AlertDescription>
              </Alert>
            )}

            {/* Form validation errors */}
            {Object.keys(formErrors).length > 0 && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>يرجى إصلاح الأخطاء التالية:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {Object.entries(formErrors).map(([field, error]) => (
                      <li key={field} className="text-sm">
                        {typeof error === 'object' && error && 'message' in error && error.message 
                          ? String(error.message)
                          : `خطأ في حقل ${field}`
                        }
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Mobile Status Indicator */}
            <div className="lg:hidden mb-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">النموذج صحيح</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        يحتوي على أخطاء ({Object.keys(formErrors).length})
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">معدل</span>
                    </div>
                  )}
                  <div className="text-xs font-medium text-primary">
                    {progress}% مكتمل
                  </div>
                </div>
              </div>
            </div>

            {/* Responsive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Quick Info Sidebar - Hidden on mobile */}
              <div className="hidden lg:block lg:col-span-1 space-y-6">
                <div className="sticky top-24">
                  <ProductQuickInfoPanel
                    form={form}
                    isEditMode={isEditMode}
                    productId={productId}
                    thumbnailImage={watchThumbnailImage}
                  />
                  
                  {/* Enhanced Settings Panel - Hidden on mobile */}
                  <Card className="hidden lg:block mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        تقدم النموذج
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">مكتمل</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="autosave" className="text-sm">
                          الحفظ التلقائي
                        </Label>
                        <Switch
                          id="autosave"
                          checked={autoSaveDrafts}
                          onCheckedChange={setAutoSaveDrafts}
                          disabled={isEditMode}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">حالة النموذج</Label>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={isValid ? 'default' : 'secondary'} className="text-xs">
                            {isValid ? 'صحيح' : 'غير مكتمل'}
                          </Badge>
                          {isDirty && (
                            <Badge variant="outline" className="text-xs">
                              معدل
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Main Form Content - Full width on mobile, 3/4 on desktop */}
              <div className="col-span-1 lg:col-span-3 space-y-6 pb-24 lg:pb-6">
                <ProductFormTabs
                  form={form}
                  organizationId={organizationIdFromTenant}
                  productId={productId}
                  additionalImages={additionalImages}
                  productColors={productColors}
                  wholesaleTiers={wholesaleTiers}
                  categories={categories}
                  subcategories={subcategories}
                  useVariantPrices={useVariantPrices}
                  useSizes={useSizes}
                  watchHasVariants={watchHasVariants}
                  watchPrice={watchPrice}
                  watchPurchasePrice={watchPurchasePrice}
                  watchThumbnailImage={watchThumbnailImage}
                  onMainImageChange={handleMainImageChange}
                  onAdditionalImagesChange={handleAdditionalImagesChange}
                  onProductColorsChange={handleProductColorsChange}
                  onWholesaleTiersChange={handleWholesaleTiersChange}
                  onCategoryCreated={handleCategoryCreated}
                  onSubcategoryCreated={handleSubcategoryCreated}
                  onHasVariantsChange={handleHasVariantsChange}
                  onUseVariantPricesChange={handleUseVariantPricesChange}
                  onUseSizesChange={handleUseSizesChange}
                />
              </div>
            </div>
          </div>

          {/* Enhanced Sticky Action Bar - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {isDirty && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                      <span>لديك تغييرات غير محفوظة</span>
                    </div>
                  )}
                  {isValid ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>النموذج صحيح</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span>النموذج يحتوي على أخطاء ({Object.keys(formErrors).length})</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/products')}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    إلغاء
                  </Button>
                  
                  <Button
                    type="submit"
                    form="product-form"
                    disabled={
                      isSubmitting || 
                      (!form.getValues('organization_id') && !organizationIdFromTenant)
                    }
                    onClick={() => {
                      console.log('🔄 زر الحفظ العادي تم النقر عليه');
                      // تحديد أن هذا إرسال يدوي
                      setIsManualSubmit(true);
                    }}
                    className={cn(
                      "flex-1 sm:flex-none",
                      permissionWarning 
                        ? "bg-amber-600 hover:bg-amber-700 border-amber-600" 
                        : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {permissionWarning 
                          ? `محاولة ${isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}`
                          : `${isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}`
                        }
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Layout>

      {/* Mobile Floating Action Buttons - Using Portal to ensure proper positioning */}
      {typeof window !== 'undefined' && document.body && createPortal(
        <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999]" 
             style={{ 
               position: 'fixed',
               bottom: '24px',
               left: '50%',
               transform: 'translateX(-50%)',
               zIndex: 9999
             }}>
          <div className="flex items-center gap-4">
            {/* Cancel Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/products')}
              disabled={isSubmitting}
              className="h-12 w-12 rounded-full shadow-xl bg-background/95 backdrop-blur-sm border-2 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {/* Main Action Button */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              
              <Button
                type="submit"
                form="product-form"
                disabled={
                  isSubmitting || 
                  (!form.getValues('organization_id') && !organizationIdFromTenant)
                }
                onClick={() => {
                  console.log('🔄 زر الحفظ العائم تم النقر عليه');
                  setIsManualSubmit(true);
                }}
                className={cn(
                  "relative h-16 px-8 rounded-full shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-105 active:scale-95 font-semibold text-base",
                  "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80",
                  "border-2 border-primary-foreground/20",
                  permissionWarning && "from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    <span className="text-sm sm:text-base">جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    <span className="text-sm sm:text-base">
                      {isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}
                    </span>
                  </>
                )}
              </Button>
              
              {/* Progress indicator for mobile */}
              {isDirty && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-bounce">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ProductForm;
