import { Button } from '@/components/ui/button';
import { ShoppingBag, CreditCard, Loader2, ArrowRight, Receipt, Percent, Calculator, RotateCcw } from 'lucide-react';
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
  isReturnMode?: boolean;
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
  onQuickCheckout,
  isReturnMode
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
      "border-t border-border/50 flex-shrink-0 bg-card/30 backdrop-blur-sm",
      isCartEmpty ? "mt-auto" : ""
    )}>
      <div className="p-3 space-y-2.5">
        {/* الملخص - مبسط */}
        {!isCartEmpty && (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">المجموع</span>
                <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الخصم</span>
                  <span className="font-medium text-green-600">- {formatPrice(discountAmount)}</span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الضريبة</span>
                  <span className="font-medium text-foreground">{formatPrice(tax)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
              <span className="text-sm font-semibold text-foreground">الإجمالي</span>
              <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
            </div>
          </>
        )}

        {/* الأزرار - مبسطة */}
        <div className="grid gap-2">
          <Button
            onClick={handleOpenPaymentDialog}
            disabled={isProcessing || total === 0}
            className={cn(
              "h-10 font-medium shadow-sm",
              isReturnMode ? 
              "bg-orange-500 hover:bg-orange-600 text-white" :
              "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-sm">{isReturnMode ? 'معالجة...' : 'معالجة...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                {isReturnMode ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                <span className="text-sm">
                  {isCartEmpty 
                    ? (isReturnMode ? "إرجاع" : "طلب جديد")
                    : (isReturnMode ? "تأكيد الإرجاع" : "الدفع")
                  }
                </span>
              </div>
            )}
          </Button>

          {!isCartEmpty && (
            <Button
              variant="ghost"
              onClick={clearCart}
              size="sm"
              className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 h-8 text-xs font-medium"
            >
              {isReturnMode ? 'إفراغ' : 'إفراغ السلة'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
