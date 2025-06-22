import { Button } from '@/components/ui/button';
import { ShoppingBag, CreditCard, Loader2, ArrowRight, Receipt, Percent, Calculator } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CartSummaryProps {
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
  isCartEmpty: boolean;
  clearCart: () => void;
  handleOpenPaymentDialog: () => void;
  isProcessing?: boolean;
  onApplyCoupon?: (code: string) => void;
  onSaveCart?: () => void;
  onQuickCheckout?: (method: string) => void;
}

export default function CartSummary({ 
  subtotal, 
  discountAmount, 
  tax, 
  total, 
  isCartEmpty, 
  clearCart, 
  handleOpenPaymentDialog, 
  isProcessing = false,
  onApplyCoupon,
  onSaveCart,
  onQuickCheckout
}: CartSummaryProps) {
  const [animate, setAnimate] = useState(false);
  const [previousTotals, setPreviousTotals] = useState({
    subtotal: 0,
    total: 0
  });

  // معالجة التحريك عند تغير المجاميع
  useEffect(() => {
    if (
      previousTotals.subtotal !== subtotal ||
      previousTotals.total !== total
    ) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 600);
      setPreviousTotals({ subtotal, total });
    }
  }, [subtotal, total, previousTotals]);

  // تأثيرات حركية للأرقام
  const numberVariants = {
    animate: {
      scale: [1, 1.1, 1],
      color: ['#000', '#7c3aed', '#000'],
      transition: { duration: 0.6 }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.3
      }
    }
  };

  return (
    <div className={cn(
      "border-t border-border dark:border-border flex-shrink-0 bg-card dark:bg-card backdrop-blur-sm",
      isCartEmpty ? "mt-auto" : "" // إضافة mt-auto عندما تكون السلة فارغة لضمان ظهور الملخص في أسفل المكون
    )}>
      {/* محتوى ملخص السلة */}
      <div className={cn(
        "p-4 space-y-3",
        isCartEmpty ? "py-3" : "" // تقليل المساحة الداخلية عندما تكون السلة فارغة
      )}>
        {/* المجموع الفرعي والخصم والضريبة - إظهاره فقط إذا كانت السلة غير فارغة */}
        {!isCartEmpty && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                  <span className="font-medium">المجموع الفرعي</span>
                </div>
                <motion.span 
                  className="font-semibold text-foreground dark:text-foreground"
                  animate={animate ? { scale: [1, 1.05, 1] } : {}}
                >
                  {formatPrice(subtotal)}
                </motion.span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    <span className="font-medium">الخصم</span>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    - {formatPrice(discountAmount)}
                  </span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
                    <Calculator className="h-4 w-4" />
                    <span className="font-medium">الضريبة</span>
                  </div>
                  <span className="font-semibold text-foreground dark:text-foreground">
                    {formatPrice(tax)}
                  </span>
                </div>
              )}
            </div>

            <Separator className="bg-border dark:bg-border" />
          </>
        )}

        {/* الإجمالي - إظهاره فقط إذا كانت السلة غير فارغة */}
        {!isCartEmpty && (
          <div className="flex items-center justify-between bg-muted dark:bg-muted p-3 rounded-lg border border-border dark:border-border">
            <span className="font-semibold text-foreground dark:text-foreground">الإجمالي</span>
            <motion.span 
              className="text-xl font-bold text-primary dark:text-primary"
              animate={animate ? { scale: [1, 1.05, 1] } : {}}
            >
              {formatPrice(total)}
            </motion.span>
          </div>
        )}

        {/* أزرار العمليات */}
        <div className={cn("grid gap-2.5", isCartEmpty ? "pt-0" : "pt-2")}>
          <Button
            onClick={handleOpenPaymentDialog}
            disabled={isProcessing || total === 0}
            className={cn(
              "transition-all shadow-md hover:shadow-lg",
              isCartEmpty ? "h-11" : "h-11", // جعل الارتفاع موحد في كل الحالات
              "bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-primary-foreground dark:text-primary-foreground font-semibold"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الدفع...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>{isCartEmpty ? "طلب جديد" : "الدفع"}</span>
                <ArrowRight className="h-4 w-4 mr-0.5" />
              </div>
            )}
          </Button>

          {!isCartEmpty && (
            <Button
              variant="outline"
              onClick={clearCart}
              size="sm"
              className="text-muted-foreground dark:text-muted-foreground border-border dark:border-border hover:bg-accent dark:hover:bg-accent hover:text-red-500 dark:hover:text-red-400 h-9 font-medium"
            >
              إفراغ السلة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
