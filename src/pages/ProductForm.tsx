import React, { useEffect, useState, useCallback, useRef } from 'react';
//
import { useParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet-async';

// Performance CSS
import '@/components/product/form/product-form-performance.css';

// Custom Hooks
import { useTenant } from '@/context/TenantContext';
import { useProductFormInitialization } from '@/hooks/useProductFormInitialization';
import { useCategoryData } from '@/hooks/useCategoryData';
import { useProductPermissions } from '@/hooks/useProductPermissions';
import { useProductFormState } from '@/hooks/product/useProductFormState';
import { useProductFormValidation } from '@/hooks/product/useProductFormValidation';
import { useProductFormSubmission } from '@/hooks/product/useProductFormSubmission';
import { useProductFormEventHandlers } from '@/hooks/product/useProductFormEventHandlers';

// UI Components
import Layout from '@/components/Layout';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';
import ProductFormTabs from '@/components/product/form/ProductFormTabs';
import ProductFormHeader from '@/components/product/form/ProductFormHeader';
import { useTitlebar } from '@/context/TitlebarContext';
import { Package } from 'lucide-react';
import { Check, Save, CalendarClock } from 'lucide-react';

import ProductFormActions from '@/components/product/form/ProductFormActions';
import ProductFormMobileActions from '@/components/product/form/ProductFormMobileActions';
import ProductFormMobileStatus from '@/components/product/form/ProductFormMobileStatus';
import ProductFormWelcome from '@/components/product/form/ProductFormWelcome';
import ProductFormPermissionWarning from '@/components/product/form/ProductFormPermissionWarning';
import ProductFormValidationErrors from '@/components/product/form/ProductFormValidationErrors';
import ProductFormLoadingState from '@/components/product/form/ProductFormLoadingState';
import ProductFormPermissionDenied from '@/components/product/form/ProductFormPermissionDenied';
import SchedulePublishDialog from '@/components/product/form/SchedulePublishDialog';

// Types & API
import { 
  productSchema, 
  ProductFormValues, 
  productAdvancedSettingsSchema 
} from '@/types/product';

interface ProductFormProps extends POSSharedLayoutControls {}

const ProductForm: React.FC<ProductFormProps> = ({
  useStandaloneLayout = false,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const organizationIdFromTenant = currentOrganization?.id;

  // حالة نافذة جدولة النشر
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // مرجع للنموذج لتجنب إعادة البحث
  const formElementRef = useRef<HTMLFormElement | null>(null);

  // Form configuration
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
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
      publication_mode: 'publish_now' as const,
      publish_at: undefined,
    },
  });

  // ✅ إضافة useEffect لتحديث organization_id عند تغيير المؤسسة
  useEffect(() => {
    if (organizationIdFromTenant && organizationIdFromTenant !== form.getValues('organization_id')) {
      form.setValue('organization_id', organizationIdFromTenant);
    }
  }, [organizationIdFromTenant, form]);

  // Avoid global watch() that re-renders on every field change
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

  // Titlebar integration
  const { setTabs, setActiveTab: setTitlebarActiveTab, setShowTabs, clearTabs, setActions, clearActions } = useTitlebar();

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

  // POS Layout state
  const [layoutState, setLayoutState] = useState<POSLayoutState>({
    connectionStatus: 'connected',
    isRefreshing: false,
  });

  // Configure Titlebar tabs (single dynamic tab for ProductForm)
  // (moved below to ensure debouncedName is declared)

  // Render with layout function for POS compatibility
  const renderWithLayout = (node: React.ReactElement) => {
    if (useStandaloneLayout) {
      return <Layout>{node}</Layout>;
    } else {
      return (
        <POSPureLayout
          onRefresh={() => {
            if (refreshProduct) {
              refreshProduct();
            }
          }}
          isRefreshing={layoutState.isRefreshing}
          connectionStatus={layoutState.connectionStatus}
          executionTime={layoutState.executionTime}
        >
          {node}
        </POSPureLayout>
      );
    }
  };

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

  // Auto-save disabled: no draft persistence

  // Form submission
  const { isSubmitting, submitForm, handleFormError } = useProductFormSubmission({
    form,
    isEditMode,
    productId,
    organizationId: organizationIdFromTenant,
    additionalImages,
    productColors,
    wholesaleTiers,
    onSuccess: () => {},
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

  // Debounce title updates to avoid frequent Helmet updates while typing
  const [debouncedName, setDebouncedName] = useState<string>('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(watchName || ''), 300);
    return () => clearTimeout(t);
  }, [watchName]);

  // Titlebar: hide tabs entirely for this page (no tab UI)
  useEffect(() => {
    setShowTabs(false);
    clearTabs();
  }, [setShowTabs, clearTabs]);

  // تحذير عند محاولة مغادرة الصفحة مع تغييرات غير محفوظة
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty, isSubmitting]);

  // Debug logging for variants
  useEffect(() => {
  }, [watchHasVariants, hasVariantsState, productColors]);

  // Debug logging for data passed to ProductFormTabs
  useEffect(() => {
  }, [productColors, watchHasVariants, useVariantPrices, useSizes]);

  // Connect refresh logic with onRegisterRefresh
  const refreshProduct = useCallback(async () => {
    if (isEditMode && productId) {
      // Re-fetch product data
      window.location.reload();
    }
  }, [isEditMode, productId]);

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(refreshProduct);
    return () => {
      onRegisterRefresh(null);
    };
  }, [onRegisterRefresh, refreshProduct]);

  // Connect layout state changes
  useEffect(() => {
    const newLayoutState = {
      isRefreshing: isLoadingProduct || isSubmitting,
      connectionStatus: hasPermission ? 'connected' as const : 'disconnected' as const,
      executionTime: undefined // يمكن إضافة قياس زمن التنفيذ هنا إذا أردت
    };

    setLayoutState(newLayoutState);
    
    if (onLayoutStateChange) {
      onLayoutStateChange(newLayoutState);
    }
  }, [onLayoutStateChange, isLoadingProduct, isSubmitting, hasPermission]);

  // معالجات محسنة للأحداث لتجنب إعادة الإنشاء
  const triggerFormSubmit = useCallback(() => {
    if (formElementRef.current) {
      // التحقق من عدم وجود نوافذ منبثقة مفتوحة
      const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
      if (openDialogs.length > 0) {
        return; // منع إرسال النموذج إذا كانت هناك نوافذ منبثقة مفتوحة
      }
      
      // تعيين isManualSubmit قبل إرسال الحدث
      setIsManualSubmit(true);
      
      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      formElementRef.current.dispatchEvent(submitEvent);
    }
  }, [setIsManualSubmit]);

  // اختصارات لوحة المفاتيح: حفظ مسودة (Ctrl/Cmd+S) ونشر الآن (Ctrl/Cmd+Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;
      if (!isMeta) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.closest('[role="dialog"]') || active.closest('[data-radix-dialog-content]'))) return;
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        form.setValue('publication_mode', 'draft');
        triggerFormSubmit();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        form.setValue('publication_mode', 'publish_now');
        triggerFormSubmit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [form, triggerFormSubmit]);

  const handlePublishNow = useCallback(() => {
    form.setValue('publication_mode', 'publish_now');
    triggerFormSubmit();
  }, [form, triggerFormSubmit]);

  const handleSaveDraft = useCallback(() => {
    form.setValue('publication_mode', 'draft');
    triggerFormSubmit();
  }, [form, triggerFormSubmit]);

  const handleScheduleDialog = useCallback(() => {
    setShowScheduleDialog(true);
  }, []);

  const handleScheduleSubmit = useCallback((options: any) => {
    form.setValue('publication_mode', 'scheduled');
    form.setValue('publish_at', options.dateTime.toISOString() as any);
    
    // TODO: حفظ إعدادات الجدولة المتقدمة في المستقبل
    
    triggerFormSubmit();
  }, [form, triggerFormSubmit]);

  // Wire titlebar actions after handlers exist
  useEffect(() => {
    setActions([
      { id: 'save-draft', label: 'حفظ كمسودة', icon: <Save className="h-3.5 w-3.5" />, onClick: () => handleSaveDraft() },
      { id: 'publish-now', label: 'نشر الآن', icon: <Check className="h-3.5 w-3.5" />, onClick: () => handlePublishNow(), disabled: isSubmitting },
      { id: 'schedule', label: 'جدولة النشر', icon: <CalendarClock className="h-3.5 w-3.5" />, onClick: () => handleScheduleDialog() },
    ]);
    return () => {
      clearActions();
    };
  }, [setActions, clearActions, isSubmitting, handlePublishNow, handleSaveDraft, handleScheduleDialog]);

  // Sync form with productColors state
  useEffect(() => {
    if (initialDataSet) {
      form.setValue('colors', productColors, { shouldValidate: false, shouldDirty: false });
    }
  }, [productColors, initialDataSet, form]);

  // Enhanced submit handler
  const onSubmit = async (data: ProductFormValues) => {
    // إذا لم يكن isManualSubmit صحيحاً، نتحقق من أن الحدث جاء من زر إرسال مباشر
    if (!isManualSubmit) {
      // التحقق من أن الحدث جاء من زر إرسال مباشر وليس من triggerFormSubmit
      const event = (window as any).lastSubmitEvent;
      if (!event || event.type !== 'submit') {
        console.log('Form submission blocked: isManualSubmit is false and no valid event found');
        return;
      }
      console.log('Form submission allowed: valid event found');
    }
    
    console.log('Form submission proceeding with isManualSubmit:', isManualSubmit);
    setIsManualSubmit(false);
    await submitForm(data);
  };

  // Handler for adding colors (opens dialog instead of creating directly)
  const handleAddColor = (e?: React.MouseEvent) => {
    // منع إرسال النموذج إذا تم استدعاء الدالة من زر
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // لا نحتاج لإنشاء اللون هنا - سيتم إنشاؤه في ColorFormDialog
    // فقط نحتاج لفتح النافذة من خلال ProductColorManager
    // هذا سيتم التعامل معه في ProductColorManager
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

  const pageContent = (
    <>
      <Helmet>
        <title>
          {isEditMode 
            ? `تعديل: ${productNameForTitle || debouncedName || 'منتج'}` 
            : 'إنشاء منتج جديد'
          } - سوق
        </title>
      </Helmet>
        
        <form
          id="product-form"
          ref={formElementRef}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // حفظ الحدث للتحقق منه لاحقاً
            (window as any).lastSubmitEvent = e;
            
            // التحقق من أن الحدث لم يأت من نافذة منبثقة
            const target = e.target as HTMLElement;
            if (target.closest('[role="dialog"]') || 
                target.closest('.dialog-content') || 
                target.closest('[data-radix-dialog-content]') ||
                target.closest('.max-w-lg') ||
                target.closest('.max-w-4xl')) {
              return; // منع إرسال النموذج إذا كان الحدث من نافذة منبثقة
            }
            
            const currentOrgIdInFormState = form.getValues('organization_id');

            if (!currentOrgIdInFormState && organizationIdFromTenant) {
              form.setValue('organization_id', organizationIdFromTenant, {
                shouldValidate: false,
                shouldDirty: false
              });
            }
            
            // إذا لم يكن isManualSubmit صحيحاً، نعينه هنا كبديل آمن
            if (!isManualSubmit) {
              console.log('Setting isManualSubmit to true as fallback');
              setIsManualSubmit(true);
            }
            
            form.handleSubmit(onSubmit, handleFormError)(e);
          }}
          className="min-h-screen bg-muted/30 product-form"
          style={{
            contain: 'layout style',
            willChange: 'auto',
          }}
        >
          {/* Header */}
          <ProductFormHeader
            isEditMode={isEditMode}
            productName={productNameForTitle || debouncedName}
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
            <div className="grid grid-cols-1 gap-6">
              {/* Main Form Content - Full width */}
              <div className="col-span-1 space-y-6 pb-24 lg:pb-6">
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
                  onAddColor={handleAddColor}
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
            onSubmit={triggerFormSubmit}
            onCancel={() => navigate('/dashboard/products')}
            disabled={!form.getValues('organization_id') && !organizationIdFromTenant}
            onPublishNow={handlePublishNow}
            onSaveDraft={handleSaveDraft}
            onSchedule={handleScheduleDialog}
          />
        </form>

      {/* Mobile Floating Action Buttons */}
      <ProductFormMobileActions
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        isDirty={isDirty}
        disabled={!form.getValues('organization_id') && !organizationIdFromTenant}
        permissionWarning={permissionWarning}
        onSubmit={triggerFormSubmit}
        onCancel={() => navigate('/dashboard/products')}
        onPublishNow={handlePublishNow}
        onSaveDraft={handleSaveDraft}
        onSchedule={handleScheduleDialog}
      />

      {/* نافذة جدولة النشر */}
      <SchedulePublishDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        productTitle={form.watch('name') || 'المنتج الجديد'}
        onSchedule={handleScheduleSubmit}
      />
    </>
  );

  return renderWithLayout(pageContent);
};

export default ProductForm;
