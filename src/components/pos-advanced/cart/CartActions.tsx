import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, CreditCard, Sparkles } from 'lucide-react';

interface CartTab {
  discount?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
}

interface CartActionsProps {
  cartTotal: number;
  cartSubtotal: number;
  activeTab: CartTab | null;
  isSubmittingOrder: boolean;
  setIsPaymentDialogOpen: (open: boolean) => void;
}

const CartActions: React.FC<CartActionsProps> = ({
  cartTotal,
  cartSubtotal,
  activeTab,
  isSubmittingOrder,
  setIsPaymentDialogOpen
}) => {

  return (
    <div className="p-3 space-y-2.5">
      {/* Total Section - مبسط */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">المجموع</span>
          <span className="font-medium text-foreground">{cartSubtotal.toLocaleString()} دج</span>
        </div>
        
        {(activeTab?.discount || activeTab?.discountAmount) ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">الخصم</span>
            <span className="font-medium text-green-600">
              - {(cartSubtotal - cartTotal).toLocaleString()} دج
            </span>
          </div>
        ) : null}
        
        <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
          <span className="text-sm font-semibold text-foreground">الإجمالي</span>
          <span className="text-lg font-bold text-primary">
            {cartTotal.toLocaleString()} دج
          </span>
        </div>
      </div>

      {/* Payment Button - مبسط */}
      <Button
        onClick={() => setIsPaymentDialogOpen(true)}
        disabled={isSubmittingOrder}
        className="w-full h-10 font-medium shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <div className="flex items-center justify-center gap-1.5">
          {isSubmittingOrder ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent" />
              <span className="text-sm">معالجة...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-3.5 w-3.5" />
              <span className="text-sm">الدفع</span>
            </>
          )}
        </div>
      </Button>
    </div>
  );
};

export default React.memo(CartActions);
