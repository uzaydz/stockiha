import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SmartNavbar } from '@/components/navbar/SmartNavbar';
import { ProductPageSkeleton } from '@/components/product/ProductPageSkeleton';
import { ProductErrorPage } from '@/components/product/ProductErrorPage';
import { ProductPageProvider } from '@/context/ProductPageContext';

// المكونات المستخرجة الجديدة
import { ProductSEOHead } from '@/components/product-page/ProductSEOHead';
import { ProductTrackingContainer } from '@/components/product-page/ProductTrackingContainer';
import { ProductMainSection } from '@/components/product-page/ProductMainSection';
import { ProductDebugTools } from '@/components/product-page/ProductDebugTools';
import { useDeliveryCalculation } from '@/components/product-page/useDeliveryCalculation';
import { useOrderHandler } from '@/components/product-page/useOrderHandler';
import { useSpecialOffers } from '@/components/product-page/useSpecialOffers';

// الـ Hooks والسياق
import useProductPurchase from '@/hooks/useProductPurchase';
import { useTenant } from '@/context/TenantContext';
import { useSharedOrgSettingsOnly } from '@/context/SharedStoreDataContext';
import { useUnifiedProductPageData } from '@/hooks/useUnifiedProductPageData';
import { useAbandonedCartTracking } from '@/hooks/useAbandonedCartTracking';
import { useProductTracking } from '@/hooks/useProductTracking';

const ProductPurchasePageV3: React.FC = React.memo(() => {
  const { productId, productIdentifier } = useParams<{ productId?: string; productIdentifier?: string }>();
  const actualProductId = productIdentifier || productId;
  const { currentOrganization: organization } = useTenant();
  
  // استخدام Hook موحد لجلب جميع البيانات
  const unifiedData = useUnifiedProductPageData({
    productId: actualProductId,
    organizationId: organization?.id,
    enabled: !!actualProductId && !!organization?.id
  });

  // إعدادات المؤسسة
  const { organizationSettings: sharedOrgSettings } = useSharedOrgSettingsOnly();
  const organizationSettings = useMemo(() => 
    unifiedData.organizationSettings || sharedOrgSettings, 
    [unifiedData.organizationSettings, sharedOrgSettings]
  );
  
  // مرجع لمتتبع التحويل
  const conversionTrackerRef = useRef<any>(null);
  
  // حالات المكون
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, any>>({});
  const [isOrganizationReady, setIsOrganizationReady] = useState(!!organization?.id);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [hasTriedToSubmit, setHasTriedToSubmit] = useState(false);

  const organizationId = organization?.id || null;

  // مراقبة تحميل المؤسسة
  useEffect(() => {
    if (organizationId && !isOrganizationReady) {
      setIsOrganizationReady(true);
    } else if (!organizationId && isOrganizationReady) {
      setIsOrganizationReady(false);
    }
  }, [organizationId]);

  // تطبيق ثيم المؤسسة
  useEffect(() => {
    if (!organizationSettings || !organization?.id) {
      return;
    }
    
    const applyTheme = async () => {
      try {
        const { forceApplyOrganizationTheme } = await import('@/lib/themeManager');
        
        await forceApplyOrganizationTheme(organization.id, {
          theme_primary_color: organizationSettings.theme_primary_color,
          theme_secondary_color: organizationSettings.theme_secondary_color,
          theme_mode: (organizationSettings as any).theme_mode || 'light',
          custom_css: (organizationSettings as any).custom_css
        });
        
      } catch (error) {
        // خطأ في تطبيق الثيم
      }
    };
    
    applyTheme();
  }, [
    organizationSettings?.theme_primary_color, 
    organizationSettings?.theme_secondary_color, 
    organization?.id
  ]);

  // استخدام hook المنتج
  const stableParams = useMemo(() => {
    const hasRequiredData = !!organizationId && !!actualProductId;
    
    return {
      productId: hasRequiredData ? actualProductId : undefined,
      organizationId: hasRequiredData ? organizationId : undefined,
      dataScope: 'ultra' as const,
      enabled: hasRequiredData
    };
  }, [organizationId, actualProductId]);
  
  const [state, actions] = useProductPurchase({
    ...stableParams,
    preloadedProduct: unifiedData.product
  });

  const {
    product,
    loading,
    error,
    selectedColor,
    selectedSize,
    quantity,
    buyingNow,
    availableStock,
    canPurchase,
    priceInfo,
    formData,
    formStrategy
  } = state;

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
  } = actions;

  // إعادة تعيين حالة التحقق من الصحة عند تغيير الاختيارات
  useEffect(() => {
    if (hasTriedToSubmit && (selectedColor || selectedSize)) {
      setShowValidationErrors(false);
      setHasTriedToSubmit(false);
    }
  }, [selectedColor?.id, selectedSize?.id, hasTriedToSubmit]);

  // إعادة تعيين التمرير إلى الأعلى عند تحميل الصفحة
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // تنظيف preload links القديمة
    const cleanupPreloadLinks = () => {
      const oldLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      oldLinks.forEach(link => {
        if (link.parentNode) {
          link.remove();
        }
      });
    };
    
    cleanupPreloadLinks();
  }, [actualProductId]);

  // استخدام hook حساب التوصيل
  const { deliveryCalculation, isCalculatingDelivery, summaryData } = useDeliveryCalculation({
    organizationId,
    product,
    formData: submittedFormData,
    quantity
  });

  // استخدام hook العروض الخاصة
  const {
    selectedOffer,
    setSelectedOffer,
    isQuantityUpdatedByOffer,
    setIsQuantityUpdatedByOffer,
    finalPriceCalculation
  } = useSpecialOffers({
    product,
    quantity,
    priceInfo
  });

  // hook الطلبات المتروكة
  const [isSavingCart, abandonedCartActions] = useAbandonedCartTracking({
    productId: actualProductId,
    productColorId: selectedColor?.id,
    productSizeId: selectedSize?.id,
    quantity,
    subtotal: priceInfo?.price || 0,
    deliveryFee: deliveryCalculation?.deliveryFee || 0,
    discountAmount: priceInfo?.discount || 0,
    organizationId: organizationId,
    enabled: true,
    saveInterval: 3,
    minPhoneLength: 8
  });

  // Hook التتبع
  const productTracking = useProductTracking({
    productId: actualProductId!,
    organizationId: organizationId,
    autoLoadSettings: false,
    enableDebugMode: process.env.NODE_ENV === 'development'
  });

  // تحميل إعدادات التتبع يدوياً
  useEffect(() => {
    if (product && !productTracking.isReady && !productTracking.isLoading) {
      productTracking.setSettingsFromProduct(product as any);
    }
  }, [product, productTracking.isReady, productTracking.isLoading, productTracking.setSettingsFromProduct]);

  // دالة تحديث الكمية مع التتبع
  const handleQuantityChange = useCallback((newQuantity: number) => {
    const oldQuantity = quantity;
    setQuantity(newQuantity);
    
    // تتبع إضافة إلى السلة عند زيادة الكمية
    if (newQuantity > oldQuantity && product && productTracking?.isReady) {
      const quantityDiff = newQuantity - oldQuantity;
      productTracking.trackAddToCart({
        name: product.name,
        price: priceInfo?.price || 0,
        quantity: quantityDiff,
        image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
        selectedColor: selectedColor?.name,
        selectedSize: selectedSize?.size_name
      });
    }
  }, [quantity, setQuantity, product, productTracking, priceInfo, selectedColor, selectedSize]);

  // تتبع عرض المحتوى
  useEffect(() => {
    if (product && productTracking?.isReady) {
      productTracking.trackViewContent({
        name: product.name,
        price: product.pricing?.price,
        image: product.images?.thumbnail_image || product.images?.additional_images?.[0]?.url,
        selectedColor: selectedColor?.name,
        selectedSize: selectedSize?.size_name,
        quantity
      });
    }
  }, [product, productTracking?.isReady, selectedColor, selectedSize, quantity]);

  const handleFormChange = useCallback((data: Record<string, any>) => {
    setSubmittedFormData(data);
    
    // حفظ مؤجل للطلب المتروك
    if (data.phone && data.phone.length >= 8) {
      abandonedCartActions.debouncedSave(data);
    }
  }, [abandonedCartActions]);

  // استخدام hook معالجة الطلبيات
  const { handleFormSubmit, handleBuyNow: handleBuyNowBase } = useOrderHandler({
    product,
    organizationId,
    quantity,
    priceInfo,
    deliveryCalculation,
    selectedColor,
    selectedSize,
    selectedOffer,
    productTracking,
    abandonedCartActions,
    conversionTrackerRef
  });

  const handleBuyNow = useCallback(() => {
    handleBuyNowBase(
      canPurchase,
      submittedFormData,
      setHasTriedToSubmit,
      setShowValidationErrors
    );
  }, [handleBuyNowBase, canPurchase, submittedFormData]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // حالة التحميل
  if (loading || !isOrganizationReady) {
    return <ProductPageSkeleton />;
  }

  // التحقق من إعدادات المؤسسة
  if (!organizationSettings || !organization?.id) {
    return (
      <>
        <ProductSEOHead 
          productId={actualProductId}
          organizationSettings={organizationSettings}
          organization={organization}
        />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل المنتج...</p>
          </div>
        </div>
      </>
    );
  }

  // حالة الخطأ
  if (error || !product) {
    return (
      <>
        <ProductSEOHead 
          productId={actualProductId}
          organizationSettings={organizationSettings}
          organization={organization}
        />
        <ProductErrorPage 
          error={error}
          onRetry={handleRetry}
        />
      </>
    );
  }

  return (
    <>
      {/* SEO Head للمنتج */}
      <ProductSEOHead 
        product={product}
        organization={organization}
        organizationSettings={organizationSettings}
        productId={actualProductId}
        priceInfo={priceInfo}
        availableStock={availableStock}
      />
      
      <ProductPageProvider>
        <div className="min-h-screen bg-background transition-colors duration-300">
          {/* مكونات التتبع */}
          {actualProductId && organizationId && (
            <ProductTrackingContainer
              ref={conversionTrackerRef}
              productId={actualProductId}
              organizationId={organizationId}
              product={product}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              quantity={quantity}
              productTracking={productTracking}
            />
          )}

          {/* النافبار الرئيسي */}
          <SmartNavbar 
            className="bg-background/95 backdrop-blur-md border-b border-border/20"
            hideCategories={true}
          />

          {/* المحتوى الرئيسي */}
          <ProductMainSection
            product={product}
            state={state}
            actions={actions}
            formData={formData}
            formStrategy={formStrategy}
            summaryData={summaryData}
            finalPriceCalculation={finalPriceCalculation}
            selectedOffer={selectedOffer}
            isQuantityUpdatedByOffer={isQuantityUpdatedByOffer}
            showValidationErrors={showValidationErrors}
            hasTriedToSubmit={hasTriedToSubmit}
            submittedFormData={submittedFormData}
            isSavingCart={isSavingCart}
            onFormChange={handleFormChange}
            onFormSubmit={handleFormSubmit}
            onBuyNow={handleBuyNow}
            onQuantityChange={handleQuantityChange}
            setSelectedOffer={setSelectedOffer}
            setIsQuantityUpdatedByOffer={setIsQuantityUpdatedByOffer}
            setShowValidationErrors={setShowValidationErrors}
            setHasTriedToSubmit={setHasTriedToSubmit}
          />
        </div>

        {/* أدوات التشخيص */}
        <ProductDebugTools
          productId={actualProductId!}
          organizationId={organizationId!}
          productTracking={productTracking}
        />
      </ProductPageProvider>
    </>
  );
});

ProductPurchasePageV3.displayName = 'ProductPurchasePageV3';

export default ProductPurchasePageV3;
