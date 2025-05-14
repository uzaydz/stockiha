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
        console.error("Error fetching product name:", error);
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
  
  const isFreeDelivery = hasFreeShipping || (deliveryType === 'home' && shippingProviderSettings?.is_free_delivery_home) || 
                         (deliveryType === 'desk' && shippingProviderSettings?.is_free_delivery_desk);

  const getFreeShippingMessage = () => {
    if (deliveryType === 'home' && shippingProviderSettings?.is_free_delivery_home) {
      return "توصيل مجاني للمنزل!";
    } else if (deliveryType === 'desk' && shippingProviderSettings?.is_free_delivery_desk) {
      return "استلام مجاني من المكتب!";
    }
    return "مجاني!";
  };
  
  return (
    <motion.div
      ref={summaryRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-card text-card-foreground border shadow-sm rounded-xl overflow-hidden dark:border-border">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">ملخص الطلب</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-foreground">{productName}</p>
                <p className="text-sm text-muted-foreground">الكمية: {quantity}</p>
                
                {hasExtraDetails && (
                  <div className="mt-2 space-y-1">
                    {productColorName && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">اللون: </span>
                        <span className="text-foreground font-medium">{productColorName}</span>
                      </div>
                    )}
                    
                    {productSizeName && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">المقاس: </span>
                        <span className="text-foreground font-medium">{productSizeName}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="font-medium text-foreground">{subtotal.toLocaleString()} د.ج</p>
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
                <p className="text-muted-foreground">رسوم التوصيل</p>
                {deliveryType && shippingProviderSettings && (
                  <span className="text-xs text-muted-foreground mr-1">
                    ({deliveryType === 'home' ? 'للمنزل' : 'من المكتب'})
                  </span>
                )}
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
              <p className="text-base font-semibold">المجموع الإجمالي</p>
              <p className="text-xl font-bold text-primary">
                {isLoadingDeliveryFee && !isFreeDelivery ? (
                  <span className="h-7 w-24 bg-muted dark:bg-muted animate-pulse rounded inline-block"></span>
                ) : (
                  `${total.toLocaleString()} د.ج`
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 mt-4 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <p>الدفع عند الاستلام</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default OrderSummary;