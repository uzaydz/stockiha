import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { User as AppUser } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Package, Check, X, Minimize2, Maximize2 } from 'lucide-react';
import { RETURN_REASONS_WITH_ICONS_ARRAY } from '@/constants/returnReasons';
import CartItemComponent from './CartItemComponent';
import CompactCartItem from './CompactCartItem';

interface CartItem {
  product: any;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
}

interface ReturnModeCartProps {
  returnItems: CartItem[];
  returnReason: string;
  returnNotes: string;
  customers: AppUser[];
  currentUser: AppUser | null;
  isSubmittingOrder: boolean;
  updateReturnItemQuantity: (index: number, quantity: number) => void;
  removeReturnItem: (index: number) => void;
  clearReturnCart: () => void;
  processReturn: (customerId?: string, reason?: string, notes?: string) => Promise<void>;
  setReturnReason: (reason: string) => void;
  setReturnNotes: (notes: string) => void;
  updateReturnItemPrice?: (index: number, price: number) => void;
}

const ReturnModeCart: React.FC<ReturnModeCartProps> = ({
  returnItems,
  returnReason,
  returnNotes,
  customers,
  currentUser,
  isSubmittingOrder,
  updateReturnItemQuantity,
  removeReturnItem,
  clearReturnCart,
  processReturn,
  setReturnReason,
  setReturnNotes,
  updateReturnItemPrice
}) => {
  const [isCompactView, setIsCompactView] = useState(false);

  const returnTotal = useMemo(() => {
    return returnItems.reduce((total, item) => {
      const price = item.variantPrice || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [returnItems]);

  const totalReturnItemsCount = useMemo(() => {
    return returnItems.reduce((total, item) => total + item.quantity, 0);
  }, [returnItems]);

  return (
    <Card className="h-full flex flex-col border-l-4 border-l-orange-500 bg-card shadow-none">
      <CardHeader className="p-0 bg-card/30 backdrop-blur-sm border-b border-border/50">
        <CardTitle className="px-3 py-2.5 flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-100/80">
            <RotateCcw className="h-3.5 w-3.5 text-orange-600" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">الإرجاع</h3>
          </div>

          {totalReturnItemsCount > 0 && (
            <Badge className="inline-flex items-center rounded-full bg-orange-100/80 text-orange-700 border-0 px-2 py-0.5 text-[10px] font-medium">
              {totalReturnItemsCount}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCompactView(!isCompactView)}
            className={cn(
              "h-7 w-7 p-0 rounded-md",
              isCompactView
                ? "bg-orange-100/80 text-orange-700"
                : "bg-muted/50 hover:bg-muted"
            )}
            title={isCompactView ? "تفصيلي" : "مضغوط"}
          >
            {isCompactView ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {returnItems.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[250px] text-center p-4">
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-orange-100/30">
                  <RotateCcw className="h-8 w-8 text-orange-500/40" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">لا توجد عناصر</p>
                  <p className="text-xs text-muted-foreground/60">امسح للإضافة</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "p-2.5",
              isCompactView ? "space-y-1.5" : "space-y-2"
            )}>
              {returnItems.map((item, index) => (
                isCompactView ? (
                  <CompactCartItem
                    key={`return-${item.product.id}-${index}`}
                    item={item}
                    index={index}
                    onUpdateQuantity={updateReturnItemQuantity}
                    onRemove={removeReturnItem}
                    onUpdatePrice={updateReturnItemPrice}
                    isReturn={true}
                  />
                ) : (
                  <CartItemComponent
                    key={`return-${item.product.id}-${index}`}
                    item={item}
                    index={index}
                    onUpdateQuantity={updateReturnItemQuantity}
                    onRemove={removeReturnItem}
                    onUpdatePrice={updateReturnItemPrice}
                    isReturn={true}
                  />
                )
              ))}
            </div>
          )}
        </div>

        {returnItems.length > 0 && (
          <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-3 space-y-2.5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                سبب الإرجاع *
              </label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="اختر السبب" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS_WITH_ICONS_ARRAY.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">عدد العناصر</span>
                <span className="font-medium text-foreground">{totalReturnItemsCount}</span>
              </div>
              <div className="flex items-center justify-between bg-orange-50/50 dark:bg-orange-950/20 p-2 rounded-lg">
                <span className="text-sm font-semibold text-foreground">الإجمالي</span>
                <span className="text-lg font-bold text-orange-600">
                  {returnTotal.toLocaleString()} دج
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => processReturn(undefined, returnReason, returnNotes)}
                disabled={!returnReason || isSubmittingOrder}
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm"
              >
                <div className="flex items-center justify-center gap-1.5">
                  {isSubmittingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent" />
                      <span className="text-sm">معالجة...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-sm">تأكيد الإرجاع</span>
                    </>
                  )}
                </div>
              </Button>
              <Button
                variant="ghost"
                onClick={clearReturnCart}
                className="w-full h-8 text-xs font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                disabled={isSubmittingOrder}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                مسح السلة
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(ReturnModeCart);
