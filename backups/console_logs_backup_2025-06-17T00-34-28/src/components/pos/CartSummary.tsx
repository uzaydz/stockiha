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
      "border-t border-border dark:border-zinc-800 flex-shrink-0",
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground dark:text-zinc-400">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>المجموع الفرعي</span>
                </div>
                <motion.span 
                  className="font-medium text-foreground dark:text-zinc-300"
                  animate={animate ? { scale: [1, 1.05, 1] } : {}}
                >
                  {formatPrice(subtotal)}
                </motion.span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground dark:text-zinc-400">
                    <Percent className="h-3.5 w-3.5" />
                    <span>الخصم</span>
                  </div>
                  <span className="font-medium text-emerald-600 dark:text-emerald-500">
                    - {formatPrice(discountAmount)}
                  </span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground dark:text-zinc-400">
                    <span>الضريبة</span>
                  </div>
                  <span className="font-medium text-foreground dark:text-zinc-300">
                    {formatPrice(tax)}
                  </span>
                </div>
              )}
            </div>

            <Separator className="bg-border dark:bg-zinc-800" />
          </>
        )}

        {/* الإجمالي - إظهاره فقط إذا كانت السلة غير فارغة */}
        {!isCartEmpty && (
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground dark:text-zinc-200">الإجمالي</span>
            <motion.span 
              className="text-lg font-semibold text-foreground dark:text-white"
              animate={animate ? { scale: [1, 1.05, 1] } : {}}
            >
              {formatPrice(total)}
            </motion.span>
          </div>
        )}

        {/* أزرار العمليات */}
        <div className={cn("grid gap-2", isCartEmpty ? "pt-0" : "pt-1.5")}>
          <Button
            onClick={handleOpenPaymentDialog}
            disabled={isProcessing || total === 0}
            className={cn(
              "transition-all shadow-sm",
              isCartEmpty ? "h-10" : "h-10", // جعل الارتفاع موحد في كل الحالات
              "bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary/80 text-primary-foreground"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الدفع...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                <span>{isCartEmpty ? "طلب جديد" : "الدفع"}</span>
                <ArrowRight className="h-3.5 w-3.5 mr-0.5" />
              </div>
            )}
          </Button>

          {!isCartEmpty && (
            <Button
              variant="outline"
              onClick={clearCart}
              size="sm"
              className="text-muted-foreground dark:text-zinc-400 border-border dark:border-zinc-800 hover:bg-accent dark:hover:bg-zinc-800/50 h-9"
            >
              إفراغ السلة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
