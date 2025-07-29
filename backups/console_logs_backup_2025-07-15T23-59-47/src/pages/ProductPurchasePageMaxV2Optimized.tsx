import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import useProductPurchase from '@/hooks/useProductPurchase';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Separator } from '@/components/ui/separator';

// المكونات المحسنة المنفصلة
import ProductNavigationBar from '@/components/product/ProductNavigationBar';
import ProductHeaderInfo from '@/components/product/ProductHeaderInfo';
import ProductPurchaseActions from '@/components/product/ProductPurchaseActions';
import ProductStockInfo from '@/components/product/ProductStockInfo';
import OfferTimerSection from '@/components/product/OfferTimerSection';
import ProductFormSection from '@/components/product/ProductFormSection';
import ProductLoadingSkeleton from '@/components/product/ProductLoadingSkeleton';
import ProductErrorState from '@/components/product/ProductErrorState';

// المكونات الموجودة مسبقاً
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductQuantitySelector from '@/components/product/ProductQuantitySelector';
import ProductFeatures from '@/components/product/ProductFeatures';
import ProductShippingInfo from '@/components/product/ProductShippingInfo';

// Hook مخصص للتوصيل
import { useDeliveryCalculation } from '@/hooks/useDeliveryCalculation';

// استيراد دالة الاختبار
import { testDeliveryData } from '@/lib/delivery-calculator';

const ProductPurchasePageMaxV2Optimized: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { currentOrganization: organization } = useTenant();
  
  // حالة لبيانات النموذج المدخلة
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, any>>({});

  // استخدام hook المخصص لإدارة حالة المنتج
  const [state, actions] = useProductPurchase({
    productId,
    organizationId: organization?.id || undefined,
    dataScope: 'ultra'
  });

  const {
    product,
    loading,
    error,
    selectedColor,
    selectedSize,
    quantity,
    addingToCart,
    buyingNow,
    isInWishlist,
    availableStock,
    canPurchase,
    priceInfo,
    totalPrice,
    formData,
    hasCustomForm,
    formStrategy
  } = state;

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
    addToCart,
    buyNow,
    toggleWishlist,
    shareProduct
  } = actions;

  // الحصول على organizationId مع تثبيت القيمة
  const organizationId = useMemo(() => {
    const id = (organization as any)?.id || (product?.organization as any)?.id || null;
    return id;
  }, [(organization as any)?.id, (product?.organization as any)?.id]);

  // استخدام hook التوصيل المخصص
  const { deliveryCalculation, isCalculatingDelivery, summaryData } = useDeliveryCalculation({
    organizationId,
    submittedFormData,
    product,
    quantity
  });

  // مراقبة بيانات المنظمة مع المنتج
  useEffect(() => {
  }, [organization, organizationId, product]);

  // معالجة الشراء المباشر مع التنقل
  const handleBuyNow = async () => {
    const result = await buyNow();
    if (result.success) {
      navigate('/checkout', {
        state: {
          orderData: result.data,
          fromProductPage: true
        }
      });
    }
  };

  // معالجة تغيير بيانات النموذج
  const handleFormSubmit = (data: any) => {
    setSubmittedFormData(data);
  };

  const handleFormChange = (data: any) => {
    setSubmittedFormData(data);
  };

  // اختبار البيانات عند التحميل
  useEffect(() => {
    const testResults = testDeliveryData();
  }, []);

  // حالة التحميل
  if (loading) {
    return <ProductLoadingSkeleton />;
  }

  // حالة الخطأ
  if (error || !product) {
    return <ProductErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط التنقل العلوي */}
      <ProductNavigationBar
        isInWishlist={isInWishlist}
        onToggleWishlist={toggleWishlist}
        onShareProduct={shareProduct}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* قسم الصور */}
          <div className="lg:sticky lg:top-24">
            <ProductImageGalleryV2 
              product={product} 
              selectedColor={selectedColor}
            />
          </div>

          {/* قسم المعلومات والشراء */}
          <div className="space-y-6">
            {/* العنوان والمعلومات الأساسية */}
            <ProductHeaderInfo
              product={product}
              availableStock={availableStock}
            />

            <Separator />

            {/* عرض السعر */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <ProductPriceDisplay
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                quantity={quantity}
                priceInfo={priceInfo}
                totalPrice={totalPrice}
              />
            </motion.div>

            {/* مؤقت العرض المحسن */}
            <OfferTimerSection product={product} />

            <Separator />

            {/* اختيار المتغيرات والكمية */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <ProductVariantSelector
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorSelect={setSelectedColor}
                onSizeSelect={setSelectedSize}
              />

              <ProductQuantitySelector
                quantity={quantity}
                onQuantityChange={setQuantity}
                maxQuantity={Math.min(availableStock, 100)}
                availableStock={availableStock}
                disabled={!canPurchase}
              />
            </motion.div>

            <Separator />

            {/* أزرار الشراء */}
            <ProductPurchaseActions
              canPurchase={canPurchase}
              buyingNow={buyingNow}
              addingToCart={addingToCart}
              totalPrice={totalPrice}
              onBuyNow={handleBuyNow}
              onAddToCart={addToCart}
            />

            {/* معلومات المخزون */}
            <ProductStockInfo availableStock={availableStock} />

            <Separator />

            {/* ميزات المنتج */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <ProductFeatures product={product} />
            </motion.div>

            <Separator />

            {/* معلومات الشحن */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <ProductShippingInfo product={product} />
            </motion.div>

            {/* النماذج وملخص الطلب */}
            <ProductFormSection
              formData={formData}
              formStrategy={formStrategy}
              hasCustomForm={hasCustomForm}
              buyingNow={buyingNow}
              product={product}
              quantity={quantity}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              priceInfo={priceInfo}
              totalPrice={totalPrice}
              summaryData={summaryData}
              onFormSubmit={handleFormSubmit}
              onFormChange={handleFormChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPurchasePageMaxV2Optimized;
