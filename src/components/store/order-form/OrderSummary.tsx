import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardFooter
} from "@/components/ui/card";
import { OrderSummaryProps } from "./OrderFormTypes";
import { motion } from "framer-motion";

const OrderSummary = ({ 
  quantity, 
  price, 
  deliveryFee, 
  total, 
  isSubmitting 
}: OrderSummaryProps) => {
  // زر تأكيد الطلب - تم تبسيط المنطق
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("تم النقر على زر تأكيد الطلب في OrderSummary");
    
    // لا نحتاج لمعالجة خاصة هنا، السلوك الافتراضي لزر التقديم سيعمل
    if (isSubmitting) {
      e.preventDefault(); // منع التقديم المتكرر أثناء المعالجة
    }
  };

  return (
    <>
      <div className="px-6 pt-3 pb-4 bg-muted/20 border-t">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">سعر المنتج ({quantity})</span>
            <span className="font-medium">{price.toLocaleString()} د.ج</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            <span className="font-medium">{deliveryFee.toLocaleString()} د.ج</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-medium">الإجمالي:</span>
            <span className="font-bold text-primary text-lg">
              {total.toLocaleString()} د.ج
            </span>
          </div>
        </div>
      </div>

      {/* زر الإرسال - تم تحسين التصميم */}
      <CardFooter className="flex justify-center pt-6 pb-6 border-t">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full md:w-3/4 lg:w-1/2"
        >
          <Button 
            type="submit"
            onClick={handleClick}
            className="gap-2 bg-primary hover:bg-primary/90 hover:shadow-lg transition-all duration-300 w-full text-lg py-6 rounded-xl shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>جاري تأكيد الطلب...</span>
              </>
            ) : (
              <>
                <span>تأكيد الطلب الآن</span>
                <CheckCircle className="h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </CardFooter>
    </>
  );
};

export default OrderSummary; 