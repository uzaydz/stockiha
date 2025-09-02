import React, { memo } from 'react';
import { Separator } from '@/components/ui/separator';
import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import { ProductDescription } from '@/components/product/ProductDescription';

interface ProductFormSectionProps {
  formData: any;
  formStrategy: any;
  product: any;
  selectedColor?: any;
  selectedSize?: any;
  finalPriceCalculation: any;
  summaryData: any;
  quantity: number;
  buyingNow: boolean;
  isSavingCart: boolean;
  onFormSubmit: (data: any) => void;
  onFormChange: (data: any) => void;
  onColorSelect: (color: any) => void;
  onSizeSelect: (size: any) => void;
  updateCurrentFormData: (data: Record<string, any>) => void;
  className?: string;
}

/**
 * مكون قسم النماذج والوصف المحسن للأداء
 * - يحتوي على نموذج الطلب ووصف المنتج
 * - يستخدم memo لمنع re-renders غير الضرورية
 */
export const ProductFormSection = memo<ProductFormSectionProps>(({
  formData,
  formStrategy,
  product,
  selectedColor,
  selectedSize,
  finalPriceCalculation,
  summaryData,
  quantity,
  buyingNow,
  isSavingCart,
  onFormSubmit,
  onFormChange,
  onColorSelect,
  onSizeSelect,
  updateCurrentFormData,
  className = "space-y-4"
}) => {
  // لا تظهر إذا لم تكن هناك بيانات نموذج
  if (!formData) {
    return null;
  }

  return (
    <div className={className}>
      <Separator className="mb-6 bg-border/50 dark:bg-border/30" />
      
      <ProductFormRenderer
        formData={formData}
        formStrategy={formStrategy}
        onFormSubmit={onFormSubmit}
        onFormChange={onFormChange}
        isLoading={buyingNow}
        isSubmitting={buyingNow}
        isLoadingDeliveryFee={summaryData?.isCalculating || false}
        isCalculatingDelivery={summaryData?.isCalculating || false}
        deliveryFee={summaryData?.deliveryFee}
        className="mb-4"
        // تمرير بيانات المنتج والمزامنة
        product={{
          has_variants: product.variants?.has_variants,
          colors: product.variants?.colors,
          stock_quantity: product.inventory?.stock_quantity || product.stock_quantity
        }}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        onColorSelect={onColorSelect}
        onSizeSelect={onSizeSelect}
        // إضافة البيانات المالية
        subtotal={finalPriceCalculation.price}
        total={finalPriceCalculation.price + (summaryData?.deliveryFee || 0)}
        quantity={quantity}
        // إضافة معلومات الموقع للتحقق من التوصيل المجاني
        selectedProvince={summaryData?.selectedProvince ? {
          id: summaryData.selectedProvince.id.toString(),
          name: summaryData.selectedProvince.name
        } : undefined}
        selectedMunicipality={summaryData?.selectedMunicipality ? {
          id: summaryData.selectedMunicipality.id.toString(),
          name: summaryData.selectedMunicipality.name
        } : undefined}
      />

      {/* مؤشر حفظ الطلب المتروك */}
      {isSavingCart && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>جاري حفظ بياناتك...</span>
        </div>
      )}

      {/* الوصف - تحت ملخص الطلب */}
      {product.description && (
        <div className="mt-6">
          <ProductDescription 
            description={product.description}
            advancedDescription={(product as any).advanced_description}
            product={product}
          />
        </div>
      )}
    </div>
  );
});

ProductFormSection.displayName = 'ProductFormSection';
