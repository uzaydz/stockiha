import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet';

// Custom Hooks
import { useTenant } from '@/context/TenantContext';
import { useProductFormInitialization } from '@/hooks/useProductFormInitialization';
import { useCategoryData } from '@/hooks/useCategoryData';
import { useProductPermissions } from '@/hooks/useProductPermissions';
import { useProductFormState } from '@/hooks/product/useProductFormState';
import { useProductFormValidation } from '@/hooks/product/useProductFormValidation';
import { useProductFormAutoSave } from '@/hooks/product/useProductFormAutoSave';
import { useProductFormSubmission } from '@/hooks/product/useProductFormSubmission';
import { useProductFormEventHandlers } from '@/hooks/product/useProductFormEventHandlers';

// UI Components
import Layout from '@/components/Layout';
import ProductFormTabs from '@/components/product/form/ProductFormTabs';
import ProductFormHeader from '@/components/product/form/ProductFormHeader';
import ProductFormSidebar from '@/components/product/form/ProductFormSidebar';
import ProductFormActions from '@/components/product/form/ProductFormActions';
import ProductFormMobileActions from '@/components/product/form/ProductFormMobileActions';
import ProductFormMobileStatus from '@/components/product/form/ProductFormMobileStatus';
import ProductFormWelcome from '@/components/product/form/ProductFormWelcome';
import ProductFormPermissionWarning from '@/components/product/form/ProductFormPermissionWarning';
import ProductFormValidationErrors from '@/components/product/form/ProductFormValidationErrors';
import ProductFormLoadingState from '@/components/product/form/ProductFormLoadingState';
import ProductFormPermissionDenied from '@/components/product/form/ProductFormPermissionDenied';

// Types & API
import { 
  productSchema, 
  ProductFormValues, 
  productAdvancedSettingsSchema 
} from '@/types/product';

const ProductForm = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const organizationIdFromTenant = currentOrganization?.id;

  // Form configuration
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
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
      organization_id: organizationIdFromTenant || '', // ✅ إصلاح: تعيين organization_id من البداية
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

  // ✅ إضافة useEffect لتحديث organization_id عند تغيير المؤسسة
  useEffect(() => {
    if (organizationIdFromTenant && organizationIdFromTenant !== form.getValues('organization_id')) {
      form.setValue('organization_id', organizationIdFromTenant);
    }
  }, [organizationIdFromTenant, form]);

  // Watch form values
  const watchedValues = form.watch();
  const formErrors = form.formState.errors;
  const isDirty = form.formState.isDirty;

  // Form state management
  const {
    additionalImages,
    productColors,
    wholesaleTiers,
    useVariantPrices,
    useSizes,
    hasVariantsState,
    autoSaveDrafts,
    isSavingDraft,
    isManualSubmit,
    setAdditionalImages,
    setProductColors,
    setWholesaleTiers,
    setUseVariantPrices,
    setUseSizes,
    setHasVariantsState,
    setAutoSaveDrafts,
    setIsSavingDraft,
    setIsManualSubmit,
  } = useProductFormState();

  // Custom hooks
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

  // Debug logging moved to useEffect to prevent running on every render
  useEffect(() => {
  }, [productId, organizationIdFromTenant]);

  useEffect(() => {
  }, [productColors, hasVariantsState]);

  useEffect(() => {
  }, [isLoadingProduct, isEditMode, initialDataSet]);

  // Form validation
  const {
    progress,
    isValid,
    errorCount,
    hasRequiredFields,
  } = useProductFormValidation(form);

  // Auto-save functionality
  const { clearDraft } = useProductFormAutoSave({
    form,
    autoSaveDrafts,
    isEditMode,
    organizationId: organizationIdFromTenant,
    additionalImages,
    productColors,
    wholesaleTiers,
    isSavingDraft,
    setIsSavingDraft,
  });

  // Form submission
  const { isSubmitting, submitForm, handleFormError } = useProductFormSubmission({
    form,
    isEditMode,
    productId,
    organizationId: organizationIdFromTenant,
    additionalImages,
    productColors,
    wholesaleTiers,
    onSuccess: (result) => {
      // Clear draft after successful submission
      if (!isEditMode && autoSaveDrafts) {
        clearDraft();
      }
    },
  });

  // Event handlers
  const {
    handleMainImageChange,
    handleAdditionalImagesChange,
    handleProductColorsChange,
    handleWholesaleTiersChange,
    handleHasVariantsChange,
    handleUseVariantPricesChange,
    handleUseSizesChange,
  } = useProductFormEventHandlers({
    form,
    setProductColors,
    setAdditionalImages,
    setWholesaleTiers,
    setUseVariantPrices,
    setUseSizes,
    setHasVariantsState,
  });

  // Watched values for real-time updates
  const watchHasVariants = form.watch('has_variants', hasVariantsState);
  const watchPrice = form.watch('price');
  const watchPurchasePrice = form.watch('purchase_price');
  const watchThumbnailImage = form.watch('thumbnail_image');
  const watchName = form.watch('name');

  // Debug logging for variants
  useEffect(() => {
  }, [watchHasVariants, hasVariantsState, productColors]);

  // Debug logging for data passed to ProductFormTabs
  useEffect(() => {
  }, [productColors, watchHasVariants, useVariantPrices, useSizes]);

  // Sync form with productColors state
  useEffect(() => {
    if (initialDataSet) {
      form.setValue('colors', productColors, { shouldValidate: false, shouldDirty: false });
    }
  }, [productColors, initialDataSet, form]);

  // Enhanced submit handler
  const onSubmit = async (data: ProductFormValues) => {
    if (!isManualSubmit) {
      return;
    }
    setIsManualSubmit(false);
    await submitForm(data);
  };

  // Loading states
  if (isCheckingPermission) {
    return <ProductFormLoadingState message="جاري التحقق من الصلاحيات..." />;
  }

  if (!isEditMode && isLoadingProduct && !initialDataSet) {
    return <ProductFormLoadingState message="جاري تهيئة النموذج..." />;
  }

  if (isEditMode && isLoadingProduct) {
    return <ProductFormLoadingState message="جاري تحميل بيانات المنتج..." />;
  }

  // Permission check
  
  if (!hasPermission && !isCheckingPermission) {
    return <ProductFormPermissionDenied />;
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
            // Set manual submit flag for both desktop and mobile versions
            setIsManualSubmit(true);
            form.handleSubmit(onSubmit, handleFormError)(e);
          }}
          className="min-h-screen bg-muted/30"
        >
          {/* Header */}
          <ProductFormHeader
            isEditMode={isEditMode}
            productName={productNameForTitle || watchName}
            progress={progress}
            isSubmitting={isSubmitting}
            isDirty={isDirty}
            isValid={isValid}
            errorCount={errorCount}
            autoSaveDrafts={autoSaveDrafts}
            isSavingDraft={isSavingDraft}
          />

          {/* Main Content */}
          <div className="container mx-auto px-4 sm:px-6 py-6">
            {/* Welcome Message for New Products */}
            <ProductFormWelcome isEditMode={isEditMode} />

            {/* Permission warning */}
            <ProductFormPermissionWarning permissionWarning={permissionWarning} />

            {/* Form validation errors */}
            <ProductFormValidationErrors errors={formErrors} />

            {/* Mobile Status Indicator */}
            <ProductFormMobileStatus
              isValid={isValid}
              errorCount={errorCount}
              isDirty={isDirty}
              progress={progress}
            />

            {/* Responsive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Quick Info Sidebar - Hidden on mobile */}
              <ProductFormSidebar
                form={form}
                isEditMode={isEditMode}
                productId={productId}
                thumbnailImage={watchThumbnailImage}
                progress={progress}
                isDirty={isDirty}
                isValid={isValid}
                autoSaveDrafts={autoSaveDrafts}
                onAutoSaveChange={setAutoSaveDrafts}
              />

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
          <ProductFormActions
            isSubmitting={isSubmitting}
            isDirty={isDirty}
            isValid={isValid}
            errorCount={errorCount}
            permissionWarning={permissionWarning}
            isEditMode={isEditMode}
            onSubmit={() => {
              // Trigger form submission programmatically for desktop
              const formElement = document.getElementById('product-form') as HTMLFormElement;
              if (formElement) {
                const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                formElement.dispatchEvent(submitEvent);
              }
            }}
            onCancel={() => navigate('/dashboard/products')}
            disabled={!form.getValues('organization_id') && !organizationIdFromTenant}
          />
        </form>
      </Layout>

      {/* Mobile Floating Action Buttons */}
      <ProductFormMobileActions
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        isDirty={isDirty}
        disabled={!form.getValues('organization_id') && !organizationIdFromTenant}
        permissionWarning={permissionWarning}
        onSubmit={() => {
          // Trigger form submission programmatically
          const formElement = document.getElementById('product-form') as HTMLFormElement;
          if (formElement) {
            const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
            formElement.dispatchEvent(submitEvent);
          }
        }}
        onCancel={() => navigate('/dashboard/products')}
      />
    </>
  );
};

export default ProductForm;
