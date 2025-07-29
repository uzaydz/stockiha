import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import ProductPurchaseSummary from '@/components/product/ProductPurchaseSummary';

interface ProductFormSectionProps {
  formData: any;
  formStrategy: string;
  hasCustomForm: boolean;
  buyingNow: boolean;
  product: any;
  quantity: number;
  selectedColor: any;
  selectedSize: any;
  priceInfo: any;
  totalPrice: number;
  summaryData: any;
  onFormSubmit: (data: any) => void;
  onFormChange: (data: any) => void;
}

const ProductFormSection: React.FC<ProductFormSectionProps> = React.memo(({
  formData,
  formStrategy,
  hasCustomForm,
  buyingNow,
  product,
  quantity,
  selectedColor,
  selectedSize,
  priceInfo,
  totalPrice,
  summaryData,
  onFormSubmit,
  onFormChange
}) => {
  const developmentInfo = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
        <div className="font-medium text-gray-700 mb-1">
          🔧 معلومات النموذج (وضع التطوير):
        </div>
        <div className="text-gray-600">
          <span className="font-medium">النوع:</span> {formStrategy} <br />
          <span className="font-medium">الاسم:</span> {formData?.name} <br />
          <span className="font-medium">عدد الحقول:</span> {formData?.fields?.length || 0} <br />
          <span className="font-medium">نموذج مخصص:</span> {hasCustomForm ? 'نعم' : 'لا'}
        </div>
      </div>
    );
  }, [formStrategy, formData, hasCustomForm]);

  const summaryProps = useMemo(() => ({
    productName: product.name,
    productImage: product.images?.additional_images?.[0]?.url || product.images?.thumbnail_image,
    basePrice: product.pricing?.price || 0,
    quantity,
    selectedColor: selectedColor ? {
      name: selectedColor.name,
      value: selectedColor.color_code || '#000000',
      price_modifier: selectedColor.price ? selectedColor.price - product.pricing?.price : 0
    } : undefined,
    selectedSize: selectedSize ? {
      name: selectedSize.size_name,
      value: selectedSize.size_name,
      price_modifier: selectedSize.price ? selectedSize.price - product.pricing?.price : 0
    } : undefined,
    subtotal: priceInfo.price * quantity,
    discount: priceInfo.discount,
    deliveryFee: summaryData?.deliveryFee || 0,
    total: totalPrice + (summaryData?.deliveryFee || 0),
    isLoadingDeliveryFee: summaryData?.isCalculating || false,
    deliveryType: summaryData?.deliveryType || 'home',
    selectedProvince: summaryData?.selectedProvince,
    selectedMunicipality: summaryData?.selectedMunicipality ? {
      id: summaryData.selectedMunicipality.id,
      name: summaryData.selectedMunicipality.name
    } : undefined,
    shippingProvider: summaryData?.shippingProvider ? {
      name: summaryData.shippingProvider.name,
      logo: summaryData.shippingProvider.logo
    } : undefined,
    currency: "دج"
  }), [
    product, 
    quantity, 
    selectedColor, 
    selectedSize, 
    priceInfo, 
    totalPrice, 
    summaryData
  ]);

  if (!formData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.7 }}
    >
      <Separator className="mb-6" />
      
      <ProductFormRenderer
        formData={formData}
        formStrategy={formStrategy}
        onFormSubmit={onFormSubmit}
        onFormChange={onFormChange}
        loading={buyingNow}
        className="mb-4"
      />
      
      {/* إظهار معلومات النموذج للتطوير */}
      {developmentInfo}

      {/* ملخص الطلب */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        className="mt-6"
      >
        <ProductPurchaseSummary {...summaryProps} />
      </motion.div>
    </motion.div>
  );
});

ProductFormSection.displayName = 'ProductFormSection';

export default ProductFormSection; 