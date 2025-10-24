import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShoppingCart, Plus, DollarSign, ShoppingBag, Package, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import CartTabs from './CartTabs';
import CartItemComponent from './CartItemComponent';
import CompactCartItem from './CompactCartItem';
import ServicesList from './ServicesList';
import SubscriptionsList from './SubscriptionsList';
import CartActions from './CartActions';

interface CartTab {
  id: string;
  name: string;
  cartItems: any[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  customerId?: string;
  customerName?: string;
  discount?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
}

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

interface NormalModeCartProps {
  tabs: CartTab[];
  activeTab: CartTab | null;
  activeTabId: string;
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  cartSubtotal: number;
  cartTotal: number;
  isSubmittingOrder: boolean;
  setActiveTabId: (tabId: string) => void;
  addTab: () => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: any) => void;
  updateItemQuantity: (index: number, quantity: number) => void;
  updateItemPrice: (index: number, price: number) => void;
  removeItemFromCart: (index: number) => void;
  removeService: (index: number) => void;
  removeSubscription: (index: number) => void;
  clearCart: () => void;
  setIsPaymentDialogOpen: (open: boolean) => void;
}

const NormalModeCart: React.FC<NormalModeCartProps> = ({
  tabs,
  activeTab,
  activeTabId,
  cartItems,
  selectedServices,
  selectedSubscriptions,
  cartSubtotal,
  cartTotal,
  isSubmittingOrder,
  setActiveTabId,
  addTab,
  removeTab,
  updateTab,
  updateItemQuantity,
  updateItemPrice,
  removeItemFromCart,
  removeService,
  removeSubscription,
  clearCart,
  setIsPaymentDialogOpen
}) => {
  const [isCompactView, setIsCompactView] = useState(false);

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const hasItems = cartItems.length > 0 || selectedServices.length > 0 || selectedSubscriptions.length > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background dark:bg-slate-950">
      {/* Header - مبسط */}
      <div className="bg-card/30 backdrop-blur-sm border-b border-border/50">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* أيقونة مبسطة */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <ShoppingCart className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">السلة</h3>
              </div>
              {totalItemsCount > 0 && (
                <Badge className="inline-flex items-center rounded-full bg-primary/10 text-primary border-0 px-2 py-0.5 text-[10px] font-medium">
                  {totalItemsCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasItems && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCompactView(!isCompactView)}
                    className={cn(
                      "h-7 w-7 p-0 rounded-md",
                      isCompactView
                        ? "bg-primary/10 text-primary"
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    title="مسح"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={addTab}
                className="h-7 w-7 p-0 rounded-md bg-muted/50 hover:bg-muted"
                title="تبويب"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <CartTabs
        tabs={tabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        removeTab={removeTab}
      />

      {/* Content - مبسط */}
      <div className="flex-1 overflow-y-auto">
        {!hasItems ? (
          <div className="flex items-center justify-center h-full min-h-[250px] text-center p-4">
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-muted/30">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-muted-foreground">السلة فارغة</p>
                <p className="text-xs text-muted-foreground/60">أضف منتجات للبدء</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={cn(
            "p-2.5",
            isCompactView ? "space-y-1.5" : "space-y-2"
          )}>
            {/* Products */}
            {cartItems.map((item, index) => (
              isCompactView ? (
                <CompactCartItem
                  key={`product-${item.product.id}-${item.colorId || 'no-color'}-${item.sizeId || 'no-size'}-${index}`}
                  item={item}
                  index={index}
                  onUpdateQuantity={updateItemQuantity}
                  onRemove={removeItemFromCart}
                  onUpdatePrice={updateItemPrice}
                />
              ) : (
                <CartItemComponent
                  key={`product-${item.product.id}-${item.colorId || 'no-color'}-${item.sizeId || 'no-size'}-${index}`}
                  item={item}
                  index={index}
                  onUpdateQuantity={updateItemQuantity}
                  onRemove={removeItemFromCart}
                  onUpdatePrice={updateItemPrice}
                />
              )
            ))}

            {/* Services */}
            <ServicesList
              selectedServices={selectedServices}
              removeService={removeService}
            />

            {/* Subscriptions */}
            <SubscriptionsList
              selectedSubscriptions={selectedSubscriptions}
              removeSubscription={removeSubscription}
            />
          </div>
        )}
      </div>

      {/* Actions - مبسط */}
      {hasItems && (
        <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
          <CartActions
            cartTotal={cartTotal}
            cartSubtotal={cartSubtotal}
            activeTab={activeTab}
            isSubmittingOrder={isSubmittingOrder}
            setIsPaymentDialogOpen={setIsPaymentDialogOpen}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(NormalModeCart);
