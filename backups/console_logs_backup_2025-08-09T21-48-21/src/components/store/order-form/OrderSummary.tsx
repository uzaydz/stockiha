import { useEffect, useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderSummaryProps } from "./OrderFormTypes";
import { ShoppingBag, Truck, CreditCard, Palette, Ruler, Tag } from "lucide-react";
import { getProductNameById } from "@/api/store";
import { motion } from "framer-motion";
import { cn } from '@/lib/utils';

export function OrderSummary({ 
  productId,
  quantity, 
  basePrice,
  subtotal,
  discount,
  deliveryFee,
  hasFreeShipping,
  total,
  isLoadingDeliveryFee,
  productColorName,
  productSizeName,
  deliveryType,
  shippingProviderSettings,
}: OrderSummaryProps) {
  const [productName, setProductName] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchProductName = async () => {
      try {
        const name = await getProductNameById(productId);
        setProductName(name || "المنتج");
      } catch (error) {
        setProductName("المنتج");
      }
    };
    
    if (productId) {
      fetchProductName();
    }
  }, [productId]);

  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  const hasExtraDetails = productColorName || productSizeName;
  
  // تحديد ما إذا كان التوصيل مجانياً
  const isFreeDelivery = hasFreeShipping || 
    (deliveryType === 'home' && shippingProviderSettings?.is_free_delivery_home) || 
    (deliveryType === 'desk' && shippingProviderSettings?.is_free_delivery_desk);

  // الحصول على رسالة التوصيل المجاني المناسبة
  const getFreeShippingMessage = () => {
    if (deliveryType === 'home' && shippingProviderSettings?.is_free_delivery_home) {
      return "توصيل مجاني للمنزل!";
    } else if (deliveryType === 'desk' && shippingProviderSettings?.is_free_delivery_desk) {
      return "استلام مجاني من المكتب!";
    } else if (hasFreeShipping) {
      return "شحن مجاني! (عرض خاص)";
    }
    return "مجاني!";
  };

  // استخراج اسم مزود الشحن للعرض
  const getShippingProviderName = () => {
    if (!shippingProviderSettings) return "";
    
    // إذا كان لدينا اسم مخصص للمزود، نستخدمه
    if (shippingProviderSettings.name) {
      return shippingProviderSettings.name;
    }
    
    // اسم افتراضي بناءً على رمز المزود
    switch (shippingProviderSettings.provider_code) {
      case "zrexpress":
        return "ZR Express";
      case "yalidine":
        return "ياليدين";
      default:
        return "";
    }
  };

  const shippingProviderName = getShippingProviderName();
  const isZRExpress = shippingProviderSettings?.provider_code === 'zrexpress';

  return (
    <motion.div
      ref={summaryRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-lg border border-border p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">ملخص الطلب</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <p className="text-muted-foreground">المنتج ({quantity})</p>
          </div>
          <p className="font-medium">{subtotal.toLocaleString()} د.ج</p>
        </div>
        
        {discount > 0 && (
          <>
            <Separator className="my-2 bg-border dark:bg-border" />
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                <Tag className="h-4 w-4" />
                <p>الخصم (عرض الكمية)</p>
              </div>
              <p className="font-medium text-green-600 dark:text-green-500">- {discount.toLocaleString()} د.ج</p>
            </div>
          </>
        )}
        
        <Separator className="my-2 bg-border dark:bg-border" />
        
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <p className="text-muted-foreground">رسوم التوصيل</p>
              <div className="text-xs text-muted-foreground">
                {deliveryType && (
                  <span>
                    {deliveryType === 'home' ? 'للمنزل' : 'من المكتب'}
                    {shippingProviderName && (
                      <span className="text-primary mr-1">
                        {" "} - {shippingProviderName}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isLoadingDeliveryFee && !isFreeDelivery ? (
            <div className="h-5 w-20 bg-muted dark:bg-muted animate-pulse rounded"></div>
          ) : (
            <p className={cn( 
                "font-medium",
                isFreeDelivery ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
              )}>
              {isFreeDelivery ? getFreeShippingMessage() : `${deliveryFee.toLocaleString()} د.ج`}
            </p>
          )}
        </div>

        <Separator className="my-2 bg-border dark:bg-border" />
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-primary" />
            <p className="font-semibold">المجموع النهائي</p>
          </div>
          <p className="font-bold text-lg">{total.toLocaleString()} د.ج</p>
        </div>

        {hasExtraDetails && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {productColorName && (
              <div className="flex items-center gap-1.5 text-sm">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">اللون: </span>
                <span className="font-medium">{productColorName}</span>
              </div>
            )}
            {productSizeName && (
              <div className="flex items-center gap-1.5 text-sm">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">المقاس: </span>
                <span className="font-medium">{productSizeName}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default OrderSummary;
