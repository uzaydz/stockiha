import { Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { OrderSuccessProps } from "./OrderFormTypes";

const OrderSuccess = ({ 
  orderNumber, 
  quantity, 
  price, 
  deliveryFee, 
  totalPrice 
}: OrderSuccessProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-background/95 shadow-lg overflow-hidden">
        <CardHeader className="border-b border-green-100 dark:border-green-800/30 bg-green-50/80 dark:bg-green-900/10">
          <CardTitle className="text-green-700 dark:text-green-300 flex items-center text-2xl">
            <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-full ml-3">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            تم إرسال طلبك بنجاح!
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-400">
            سيتم التواصل معك قريباً لتأكيد الطلب
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4 text-lg">شكراً لطلبك، سنعمل على معالجته في أقرب وقت.</p>
          
          <div className="bg-white dark:bg-background p-6 rounded-xl border mb-6 shadow-sm">
            <div className="flex items-center mb-3">
              <div className="bg-primary/10 p-2 rounded-full ml-3">
                <span className="text-lg">🔖</span>
              </div>
              <h3 className="font-bold text-xl">معلومات الطلب</h3>
            </div>
            <div className="flex flex-col space-y-3 text-muted-foreground">
              <div className="flex justify-between py-2 border-b">
                <span>رقم الطلب:</span>
                <span className="font-bold text-foreground">#{orderNumber}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b">
                <span>الكمية:</span>
                <span className="font-medium text-foreground">{quantity} قطعة</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>سعر المنتج:</span>
                <span className="font-medium text-foreground">{(price * quantity).toLocaleString()} د.ج</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>رسوم التوصيل:</span>
                <span className="font-medium text-foreground">{deliveryFee.toLocaleString()} د.ج</span>
              </div>
              <div className="flex justify-between pt-3 text-lg">
                <span className="font-semibold text-foreground">الإجمالي:</span>
                <span className="font-bold text-primary">{totalPrice.toLocaleString()} د.ج</span>
              </div>
            </div>
          </div>
          
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>تم استلام طلبك</AlertTitle>
            <AlertDescription>
              سنتواصل معك قريباً على رقم الهاتف الذي قدمته لتأكيد التفاصيل والشحن.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-4 pt-2 pb-6 border-t">
          <Button 
            className="w-full gap-2 bg-primary/90 hover:bg-primary hover:shadow-md transition-all"
            onClick={() => window.location.href = '/'}
          >
            <span>العودة للتسوق</span>
            <span className="text-lg">🛍️</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default OrderSuccess; 