import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, Save, Package } from 'lucide-react';
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

// Types & API
import { productSchema, ProductFormValues, ProductColor, WholesaleTier, productAdvancedSettingsSchema } from '@/types/product';
import { createProduct, updateProduct, InsertProduct, UpdateProduct } from '@/lib/api/products';
import { Category, Subcategory } from '@/lib/api/categories';

export default function ProductForm() {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const organizationIdFromTenant = currentOrganization?.id;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
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
      organization_id: undefined, // Will be set by useProductFormInitialization
      has_variants: false,
      show_price_on_landing: true,
      is_featured: false,
      is_new: true,
      advancedSettings: productAdvancedSettingsSchema.parse({}), // Initialize with default advanced settings
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

  // The useEffect that was setting organization_id directly in ProductForm has been REMOVED.
  // Its logic is now handled within useProductFormInitialization.

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTier[]>([]);
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [useSizes, setUseSizes] = useState(false);
  const [hasVariantsState, setHasVariantsState] = useState(false);

  const { isLoading: isLoadingProduct, productNameForTitle, isEditMode, initialDataSet } = useProductFormInitialization({
    id: productId,
    form,
    organizationId: organizationIdFromTenant, // Pass organizationId here
    setAdditionalImages,
    setProductColors,
    setWholesaleTiers,
    setUseVariantPrices,
    setUseSizes,
    setHasVariantsState,
  });

  const { hasPermission, isCheckingPermission } = useProductPermissions({ isEditMode });

  const watchCategoryId = form.watch('category_id');
  const { categories, subcategories, handleCategoryCreated, handleSubcategoryCreated } = useCategoryData({
    organizationId: organizationIdFromTenant,
    watchCategoryId,
  });

  const watchHasVariants = form.watch('has_variants', hasVariantsState);
  const watchPrice = form.watch('price');
  const watchPurchasePrice = form.watch('purchase_price');
  const watchThumbnailImage = form.watch('thumbnail_image');

  const onSubmit = async (data: ProductFormValues) => {
    console.log('💾 [ProductForm] بدء حفظ المنتج:', {
      productName: data.name,
      shipping_provider_id: data.shipping_provider_id,
      shipping_method_type: data.shipping_method_type,
      use_shipping_clone: data.use_shipping_clone,
      shipping_clone_id: data.shipping_clone_id,
      isEditMode
    });
    
    setIsSubmitting(true);

    if (!organizationIdFromTenant && !data.organization_id) {
      toast.error("خطأ حرج: معرّف المؤسسة مفقود. لا يمكن إنشاء/تحديد المنتج.");
      setIsSubmitting(false);
      return;
    }

    const currentOrganizationId = data.organization_id || organizationIdFromTenant;
    if (!currentOrganizationId) { // Double check, should be caught by above
        toast.error("خطأ: لم يتم تحديد معرّف المؤسسة.");
        setIsSubmitting(false);
        return;
    }

    try {
      const imagesToSubmit = additionalImages.filter(url => typeof url === 'string' && url.length > 0);
      const colorsToSubmit = productColors.map(color => ({
        ...color,
        // Ensure numeric fields are numbers, not strings from input
        quantity: Number(color.quantity),
        price: color.price !== undefined ? Number(color.price) : undefined,
        purchase_price: color.purchase_price !== undefined ? Number(color.purchase_price) : undefined,
      }));
      const wholesaleTiersToSubmit = wholesaleTiers.map(tier => ({
        ...tier,
        min_quantity: Number(tier.min_quantity),
        price_per_unit: Number(tier.price_per_unit),
      })); 

      // Ensure organization_id is correctly populated in the data to be submitted
      const submissionDataPrep = {
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
      };
      
      console.log('📦 [ProductForm] البيانات المحضرة للحفظ:', {
        productName: submissionDataPrep.name,
        shipping_provider_id: submissionDataPrep.shipping_provider_id,
        shipping_method_type: submissionDataPrep.shipping_method_type,
        use_shipping_clone: submissionDataPrep.use_shipping_clone,
        shipping_clone_id: submissionDataPrep.shipping_clone_id,
        organization_id: submissionDataPrep.organization_id
      });
      
      let finalSubmissionData: any;

      // Pass advancedSettings and marketingSettings as camelCase for both create and update
      finalSubmissionData = {
        ...submissionDataPrep,
        advancedSettings: data.advancedSettings || undefined,
        marketingSettings: data.marketingSettings || undefined,
      };

      if (!(isEditMode && productId)) {
        delete finalSubmissionData.id; // Ensure no ID is sent for insert
      }
      
      // Clean up fields not part of InsertProduct or UpdateProduct (fields used for form state but not direct DB columns for product table)
      delete finalSubmissionData.additional_images; // `images` is the correct field for submissionDataPrep
      delete finalSubmissionData.is_sold_by_unit; 
      delete finalSubmissionData.use_variant_prices;
      // No longer need to delete advancedSettings based on mode as it's always passed as camelCase

      // DEBUGGING ADVANCED SETTINGS & MARKETING SETTINGS
      // END DEBUGGING

      let result;
      try {
        console.log('🚀 [ProductForm] إرسال البيانات للخادم:', {
          isEditMode,
          productId,
          finalSubmissionData: {
            name: finalSubmissionData.name,
            shipping_provider_id: finalSubmissionData.shipping_provider_id,
            shipping_method_type: finalSubmissionData.shipping_method_type,
            use_shipping_clone: finalSubmissionData.use_shipping_clone,
            shipping_clone_id: finalSubmissionData.shipping_clone_id,
            organization_id: finalSubmissionData.organization_id
          }
        });
        
        if (isEditMode && productId) {
          result = await updateProduct(productId, finalSubmissionData as UpdateProduct);
        } else {
          result = await createProduct(finalSubmissionData as InsertProduct);
        }
        
        console.log('✅ [ProductForm] استجابة الخادم:', {
          result,
          productCreated: result?.id,
          success: !!result
        });
      } catch (apiError: any) {
        const message = apiError.message || 'فشل الاتصال بالخادم.';
        toast.error(`فشل ${isEditMode ? 'تحديث' : 'إنشاء'} المنتج: ${message}`);
        throw apiError; 
      }

      if (result) {
        toast.success(isEditMode ? 'تم تحديث المنتج بنجاح' : 'تم إنشاء المنتج بنجاح');
        if (!isEditMode && result.id) {
          navigate('/dashboard/products'); // Navigate to dashboard products instead of store products
        } else if (isEditMode) {
          // Optionally, re-fetch data or handle UI update
        }
      } else {
        // This case might be rare if API call throws error on failure
        toast.error(isEditMode ? 'فشل تحديث المنتج (لم يتم إرجاع نتيجة)' : 'فشل إنشاء المنتج (لم يتم إرجاع نتيجة)');
      }
    } catch (error: any) {
      // Catch errors from API call or other logic
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: any) => {
    // Log organization_id specific error if present
    if (errors.organization_id) {
    }
    toast.error('يرجى التحقق من الحقول المطلوبة أو إصلاح الأخطاء في النموذج.');
  };

  const handleMainImageChange = useCallback((url: string) => {
    form.setValue('thumbnail_image', url, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleAdditionalImagesChange = useCallback((urls: string[]) => {
    setAdditionalImages(urls);
    // form.setValue('additional_images', urls, { shouldValidate: true, shouldDirty: true }); // This form field is not directly part of productSchema for submission
  }, []); // Removed form from deps as additional_images is not a direct form field in productSchema

  const handleProductColorsChange = useCallback((colors: ProductColor[]) => {
    setProductColors(colors);
    // form.setValue('colors', colors, { shouldValidate: true, shouldDirty: true }); // This form field is not directly part of productSchema for submission
  }, []); // Removed form from deps

  const handleWholesaleTiersChange = useCallback((tiers: WholesaleTier[]) => {
    setWholesaleTiers(tiers);
    // form.setValue('wholesale_tiers', tiers, { shouldValidate: true, shouldDirty: true });// This form field is not directly part of productSchema for submission
  }, []); // Removed form from deps

  const handleHasVariantsChange = useCallback((hasVariantsValue: boolean) => {
    form.setValue('has_variants', hasVariantsValue, { shouldValidate: true, shouldDirty: true });
    setHasVariantsState(hasVariantsValue);
    if (!hasVariantsValue) {
      setProductColors([]);
      // form.setValue('colors', [], { shouldValidate: true, shouldDirty: true });
      setUseVariantPrices(false);
      // form.setValue('use_variant_prices', false, { shouldValidate: true, shouldDirty: true });
    }
  }, [form]);

  const handleUseVariantPricesChange = useCallback((use: boolean) => {
    setUseVariantPrices(use);
    // form.setValue('use_variant_prices', use, { shouldValidate: true, shouldDirty: true });
  }, []); // Removed form from deps

  const handleUseSizesChange = useCallback((use: boolean) => {
    setUseSizes(use);
    form.setValue('use_sizes', use, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  // Enhanced Loading State Logic
  if (isCheckingPermission) {
    return (
      <Layout><div className="flex items-center justify-center h-[80vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">جاري التحقق من الصلاحيات...</p></div></Layout>
    );
  }
  if (!isEditMode && isLoadingProduct && !initialDataSet) { // For new product, initial data might not be "loading" but form hook is initializing
     return (
      <Layout><div className="flex items-center justify-center h-[80vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">جاري تهيئة النموذج...</p></div></Layout>
    );
  }
  if (isEditMode && isLoadingProduct) { // For edit mode, explicitly loading product data
     return (
      <Layout><div className="flex items-center justify-center h-[80vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">جاري تحميل بيانات المنتج...</p></div></Layout>
    );
  }

  if (!hasPermission && !isCheckingPermission) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <p className="text-xl text-red-600">ليس لديك الصلاحية لعرض هذه الصفحة.</p>
          <Button onClick={() => navigate('/dashboard/products')} className="mt-4">العودة إلى المنتجات</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{isEditMode ? `تعديل: ${productNameForTitle || form.watch('name') || 'منتج'}` : 'إنشاء منتج جديد'} - سوق</title>
      </Helmet>
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const currentOrgIdInFormState = form.getValues('organization_id');
          
          // If organization_id is somehow not set in form state by this point,
          // but we have it from tenant, try to set it one last time.
          // This is a fallback, ideally it should be set by useProductFormInitialization.
          if (!currentOrgIdInFormState && organizationIdFromTenant) {
              form.setValue('organization_id', organizationIdFromTenant, { shouldValidate: false, shouldDirty: false });
          }
          form.handleSubmit(onSubmit, onInvalid)(e);
        }}
        className="container mx-auto px-6 py-6 max-w-7xl"
      >
        {/* Simplified Header */}
        <div className="flex items-center justify-between mb-6 p-4 bg-card rounded-xl border">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? `تعديل: ${productNameForTitle || form.watch('name') || 'منتج'}` : 'إضافة منتج جديد'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditMode ? 'قم بتعديل تفاصيل المنتج' : 'أضف منتج جديد إلى متجرك'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/products')}
            disabled={isSubmitting}
          >
            العودة
          </Button>
        </div>

        {/* Welcome Message for New Products */}
        {!isEditMode && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary" />
              <div>
                <h2 className="font-semibold text-lg">إنشاء منتج جديد</h2>
                <p className="text-muted-foreground text-sm">
                  املأ جميع المعلومات المطلوبة لإنشاء منتج احترافي
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ProductQuickInfoPanel
                form={form}
                isEditMode={isEditMode}
                productId={productId}
                thumbnailImage={watchThumbnailImage}
              />
            </div>
          </div>

          {/* Main Form Content */}
          <div className="lg:col-span-3">
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

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-card rounded-xl border">
          <div className="text-center sm:text-right">
            <p className="text-sm text-muted-foreground">
              {isEditMode ? 'تعديل المنتج' : 'إنشاء منتج جديد'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/products')}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !hasPermission || (!form.getValues('organization_id') && !organizationIdFromTenant)}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Save className="ml-2 h-4 w-4" />
                  {isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
