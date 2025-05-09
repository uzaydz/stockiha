import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

interface OrderSummaryProps {
  orderInfo: {
    orderNumber: string;
    quantity: number;
    price: number;
    deliveryFee: number;
    totalPrice: number;
    date?: string;
  };
}

export default function OrderSummary({ orderInfo }: OrderSummaryProps) {
  // تاريخ اليوم إذا لم يتم توفيره
  const orderDate = orderInfo.date || new Date().toLocaleDateString("ar-DZ");
  
  return (
    <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-background/95 shadow-lg overflow-hidden">
      <CardHeader className="border-b border-green-100 dark:border-green-800/30 bg-green-50/80 dark:bg-green-900/10">
        <CardTitle className="text-green-700 dark:text-green-300 flex items-center text-2xl">
          <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-full ml-3">
            <ShoppingBag className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          تفاصيل الطلب
        </CardTitle>
        <CardDescription className="text-green-600 dark:text-green-400">
          رقم الطلب: #{orderInfo.orderNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="bg-white dark:bg-background p-6 rounded-xl border mb-6 shadow-sm">
          <div className="flex flex-col space-y-3 text-muted-foreground">
            <div className="flex justify-between py-2 border-b">
              <span>رقم الطلب:</span>
              <span className="font-bold text-foreground">#{orderInfo.orderNumber}</span>
            </div>
            
            <div className="flex justify-between py-2 border-b">
              <span>تاريخ الطلب:</span>
              <span className="font-medium text-foreground">{orderDate}</span>
            </div>
            
            <div className="flex justify-between py-2 border-b">
              <span>الكمية:</span>
              <span className="font-medium text-foreground">{orderInfo.quantity} قطعة</span>
            </div>
            
            <div className="flex justify-between py-2 border-b">
              <span>سعر المنتج:</span>
              <span className="font-medium text-foreground">{(orderInfo.price * orderInfo.quantity).toLocaleString()} د.ج</span>
            </div>
            
            <div className="flex justify-between py-2 border-b">
              <span>رسوم التوصيل:</span>
              <span className="font-medium text-foreground">{orderInfo.deliveryFee.toLocaleString()} د.ج</span>
            </div>
            
            <div className="flex justify-between pt-3 text-lg">
              <span className="font-semibold text-foreground">الإجمالي:</span>
              <span className="font-bold text-primary">{orderInfo.totalPrice.toLocaleString()} د.ج</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 