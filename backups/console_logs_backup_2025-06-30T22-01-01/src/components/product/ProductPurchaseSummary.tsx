import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Package, Truck, Calculator } from 'lucide-react';

interface ProductPurchaseSummaryProps {
  // بيانات المنتج
  productName?: string;
  productImage?: string;
  basePrice: number;
  quantity: number;
  
  // بيانات الألوان والأحجام
  selectedColor?: {
    name: string;
    value: string;
    price_modifier?: number;
  };
  selectedSize?: {
    name: string;
    value: string;
    price_modifier?: number;
  };
  
  // بيانات التسعير
  subtotal: number;
  discount?: number;
  deliveryFee?: number;

  total: number;
  
  // بيانات التوصيل
  isLoadingDeliveryFee?: boolean;
  deliveryType?: 'home' | 'desk';
  shippingProvider?: {
    name: string;
    logo?: string;
  };
  
  // بيانات الموقع
  selectedProvince?: {
    id: number;
    name: string;
  };
  selectedMunicipality?: {
    id: number;
    name: string;
  };
  
  // بيانات العملة
  currency?: string;
  
  className?: string;
}

export const ProductPurchaseSummary: React.FC<ProductPurchaseSummaryProps> = ({
  productName,
  productImage,
  basePrice,
  quantity,
  selectedColor,
  selectedSize,
  subtotal,
  discount = 0,
  deliveryFee = 0,
  total,
  isLoadingDeliveryFee = false,
  deliveryType,
  shippingProvider,
  selectedProvince,
  selectedMunicipality,
  currency = 'دج',
  className = ''
}) => {
  const { t } = useTranslation();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-DZ').format(price);
  };

  return (
    <div className={`bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl p-6 space-y-4 ${className}`}>
      {/* عنوان ملخص الطلب */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <ShoppingCart className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">ملخص الطلب</h3>
      </div>

      {/* صورة واسم المنتج */}
      {(productName || productImage) && (
        <div className="bg-background/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            {productImage && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img 
                  src={productImage} 
                  alt={productName || 'منتج'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {productName && (
              <div className="flex-1">
                <h4 className="font-medium text-sm line-clamp-2">{productName}</h4>
                <p className="text-xs text-muted-foreground mt-1">الكمية: {quantity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* تفاصيل المنتج (الألوان والأحجام) */}
      {(selectedColor || selectedSize) && (
        <div className="bg-background/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>تفاصيل المنتج</span>
          </div>
          
          {selectedColor && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">اللون:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: selectedColor.value }}
                  />
                  <span className="text-sm font-medium">{selectedColor.name}</span>
                </div>
              </div>
              {selectedColor.price_modifier && selectedColor.price_modifier !== 0 && (
                <span className="text-sm font-medium text-primary">
                  {selectedColor.price_modifier > 0 ? '+' : ''}{formatPrice(selectedColor.price_modifier)} {currency}
                </span>
              )}
            </div>
          )}
          
          {selectedSize && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">المقاس:</span>
                <span className="text-sm font-medium">{selectedSize.name}</span>
              </div>
              {selectedSize.price_modifier && selectedSize.price_modifier !== 0 && (
                <span className="text-sm font-medium text-primary">
                  {selectedSize.price_modifier > 0 ? '+' : ''}{formatPrice(selectedSize.price_modifier)} {currency}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* معلومات التوصيل */}
      {(selectedProvince || selectedMunicipality || deliveryType) && (
        <div className="bg-background/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Truck className="w-4 h-4" />
            <span>معلومات التوصيل</span>
          </div>
          
          {selectedProvince && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">الولاية:</span>
              <span className="font-medium">{selectedProvince.name}</span>
            </div>
          )}
          
          {selectedMunicipality && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">البلدية:</span>
              <span className="font-medium">{selectedMunicipality.name}</span>
            </div>
          )}
          
          {deliveryType && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">نوع التوصيل:</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {deliveryType === 'home' ? 'توصيل للمنزل' : 'توصيل للمكتب'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* تفاصيل الأسعار */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <Calculator className="w-4 h-4" />
          <span>تفاصيل الفاتورة</span>
        </div>

        {/* سعر المنتج */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            {quantity > 1 ? `المنتج (${quantity} قطع)` : 'سعر المنتج'}
          </span>
          <span className="font-medium">{formatPrice(basePrice * quantity)} {currency}</span>
        </div>

        {/* إضافات الألوان والأحجام */}
        {selectedColor?.price_modifier && selectedColor.price_modifier !== 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">إضافة اللون</span>
            <span className="font-medium text-sm">
              {selectedColor.price_modifier > 0 ? '+' : ''}{formatPrice(selectedColor.price_modifier * quantity)} {currency}
            </span>
          </div>
        )}

        {selectedSize?.price_modifier && selectedSize.price_modifier !== 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">إضافة المقاس</span>
            <span className="font-medium text-sm">
              {selectedSize.price_modifier > 0 ? '+' : ''}{formatPrice(selectedSize.price_modifier * quantity)} {currency}
            </span>
          </div>
        )}

        {/* الخصم */}
        {discount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الخصم</span>
            <span className="font-medium text-green-600">-{formatPrice(discount)} {currency}</span>
          </div>
        )}

        {/* المجموع الجزئي */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">المجموع الجزئي</span>
          <span className="font-medium">{formatPrice(subtotal)} {currency}</span>
        </div>

        {/* رسوم التوصيل */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            {deliveryType && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {deliveryType === 'home' ? 'للمنزل' : 'للمكتب'}
              </span>
            )}
          </div>
          {isLoadingDeliveryFee ? (
            <span className="text-sm text-muted-foreground animate-pulse">جاري الحساب...</span>
          ) : (
            <span className="font-medium">{formatPrice(deliveryFee)} {currency}</span>
          )}
        </div>

        {/* شركة التوصيل */}
        {shippingProvider?.name && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">شركة التوصيل</span>
            <div className="flex items-center gap-2">
              {shippingProvider.logo && (
                <img 
                  src={shippingProvider.logo} 
                  alt={shippingProvider.name}
                  className="w-4 h-4 rounded"
                />
              )}
              <span className="font-medium">{shippingProvider.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* خط فاصل */}
      <div className="h-px bg-border/50" />

      {/* المجموع الكلي */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">المجموع الكلي</span>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
          <span className="text-lg font-semibold text-primary mr-1">{currency}</span>
        </div>
      </div>

      {/* معلومات إضافية */}
      <div className="bg-primary/5 rounded-xl p-3 text-xs text-muted-foreground text-center">
        <p>💳 الدفع عند الاستلام متاح</p>
        <p>🚚 التوصيل خلال 2-5 أيام عمل</p>
      </div>
    </div>
  );
};

export default ProductPurchaseSummary; 