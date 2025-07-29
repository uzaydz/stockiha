import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ShoppingBag, Calendar, Hash, Tag, Truck, CheckCircle } from "lucide-react";
import { DisplayOrderInfo } from "@/api/orders";

interface OrderSummaryProps {
  orderInfo: DisplayOrderInfo;
}

export default function OrderSummary({ orderInfo }: OrderSummaryProps) {
  // تاريخ اليوم إذا لم يتم توفيره
  const orderDate = orderInfo.created_at ? new Date(orderInfo.created_at).toLocaleDateString("ar-DZ") : new Date().toLocaleDateString("ar-DZ");
  
  // استخلاص تفاصيل العرض المطبق إن وجد
  let appliedOffer = null;
  if (orderInfo.metadata && typeof orderInfo.metadata === 'object' && 'applied_quantity_offer' in orderInfo.metadata) {
    appliedOffer = (orderInfo.metadata as any).applied_quantity_offer;
  }
  const discountAmount = appliedOffer?.appliedDiscountAmount;
  const freeShipping = appliedOffer?.appliedFreeShipping;
  
  // استخلاص الكمية وسعر الوحدة من أول عنصر
  const firstItem = orderInfo.items?.[0];
  const quantity = firstItem?.quantity || 0;
  // استخدام المجموع الفرعي كسعر للمنتجات قبل الخصم والشحن
  const productsSubtotal = orderInfo.subtotal ? parseFloat(orderInfo.subtotal as any) : 0;
  const shippingCost = orderInfo.shipping_cost ? parseFloat(orderInfo.shipping_cost as any) : 0;
  const finalTotal = orderInfo.total ? parseFloat(orderInfo.total as any) : 0;

  return (
    <Card className="border-2 border-primary/10 shadow-md rounded-lg overflow-hidden bg-card">
      <CardHeader className="border-b border-primary/10 bg-primary/5 dark:bg-primary/10">
        <CardTitle className="text-primary flex items-center text-2xl">
          <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full ml-3">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          تفاصيل الطلب
        </CardTitle>
        <CardDescription className="text-primary/80 dark:text-primary/90 font-medium">
          تم استلام طلبك بنجاح | رقم الطلب: #{orderInfo.orderNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-5">
          {/* معلومات الطلب */}
          <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-foreground">
                <ShoppingBag className="h-4 w-4 ml-2 text-primary" />
                <span className="font-medium">رقم الطلب:</span>
              </div>
              <span className="font-bold text-foreground">#{orderInfo.orderNumber}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-foreground">
                <Calendar className="h-4 w-4 ml-2 text-primary" />
                <span className="font-medium">تاريخ الطلب:</span>
              </div>
              <span className="font-medium text-foreground">{orderDate}</span>
            </div>
          </div>
          
          {/* تفاصيل المنتج والسعر */}
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-foreground">
                <Hash className="h-4 w-4 ml-2 text-primary" />
                <span className="font-medium">الكمية:</span>
              </div>
              <span className="font-medium text-foreground">{quantity} قطعة</span>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-foreground">
                <Tag className="h-4 w-4 ml-2 text-primary" />
                <span className="font-medium">سعر المنتجات:</span>
              </div>
              <span className="font-medium text-foreground">{productsSubtotal.toLocaleString()} د.ج</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex items-center justify-between mb-3 text-red-600 dark:text-red-400">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 ml-2" />
                  <span className="font-medium">الخصم المطبق:</span>
                </div>
                <span className="font-medium">- {discountAmount.toLocaleString()} د.ج</span>
              </div>
            )}
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center text-foreground">
                <Truck className="h-4 w-4 ml-2 text-primary" />
                <span className="font-medium">رسوم التوصيل:</span>
              </div>
              <span className={`font-medium ${freeShipping ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                {freeShipping ? "مجاني (عرض)" : `${shippingCost.toLocaleString()} د.ج`}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-3">
              <span className="font-bold text-lg text-primary">الإجمالي:</span>
              <span className="font-bold text-lg text-primary">{finalTotal.toLocaleString()} د.ج</span>
            </div>
          </div>
          
          {/* رسالة تأكيد */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
            <div className="text-sm text-green-800 dark:text-green-300">
              <div className="flex items-center mb-2">
                <div className="h-2 w-2 bg-green-500 rounded-full ml-2"></div>
                <p>سيتم التواصل معك قريبًا لتأكيد طلبك</p>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full ml-2"></div>
                <p>الدفع يكون عند استلام المنتج</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
