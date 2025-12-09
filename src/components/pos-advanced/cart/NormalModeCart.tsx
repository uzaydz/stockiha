import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import CartTabs from './CartTabs';
import CompactUnifiedCartItem from './CompactUnifiedCartItem';
import SellingUnitSelectorModal, { SellingUnitConfig } from './SellingUnitSelectorModal';
import ServicesList from './ServicesList';
import SubscriptionsList from './SubscriptionsList';
import CartActions from './CartActions';
import type { SaleType, SellingUnit } from '@/lib/pricing/wholesalePricing';

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
  updateItemSaleType?: (index: number, saleType: SaleType) => void;
  removeItemFromCart: (index: number) => void;
  removeService: (index: number) => void;
  removeSubscription: (index: number) => void;
  clearCart: () => void;
  setIsPaymentDialogOpen: (open: boolean) => void;
  // ⚡ دوال أنواع البيع المتقدمة
  updateItemSellingUnit?: (index: number, unit: SellingUnit) => void;
  updateItemWeight?: (index: number, weight: number) => void;
  updateItemBoxCount?: (index: number, count: number) => void;
  updateItemLength?: (index: number, length: number) => void;
  updateItemFullConfig?: (index: number, config: {
    sellingUnit: SellingUnit;
    quantity?: number;
    weight?: number;
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
    boxCount?: number;
    length?: number;
  }) => void;
  // ⚡ دوال الدفعات والأرقام التسلسلية
  updateItemBatch?: (index: number, batchId: string, batchNumber: string, expiryDate?: string) => void;
  updateItemSerialNumbers?: (index: number, serials: string[]) => void;
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
  updateItemSaleType,
  removeItemFromCart,
  removeService,
  removeSubscription,
  clearCart,
  setIsPaymentDialogOpen,
  // ⚡ دوال أنواع البيع المتقدمة
  updateItemSellingUnit,
  updateItemWeight,
  updateItemBoxCount,
  updateItemLength,
  updateItemFullConfig,
  updateItemBatch,
  updateItemSerialNumbers
}) => {
  // حالة Modal التعديل
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const editingItem = editingItemIndex !== null ? cartItems[editingItemIndex] : null;

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const hasItems = cartItems.length > 0 || selectedServices.length > 0 || selectedSubscriptions.length > 0;

  // فتح Modal التعديل
  const handleEditItem = useCallback((index: number) => {
    setEditingItemIndex(index);
  }, []);

  // إغلاق Modal التعديل
  const handleCloseEditModal = useCallback(() => {
    setEditingItemIndex(null);
  }, []);

  // تأكيد التعديل من Modal
  const handleConfirmEdit = useCallback((config: SellingUnitConfig) => {
    if (editingItemIndex === null) return;

    // استخدام الدالة الموحدة لتحديث كل الإعدادات مرة واحدة
    if (updateItemFullConfig) {
      updateItemFullConfig(editingItemIndex, {
        sellingUnit: config.sellingUnit,
        quantity: config.quantity,
        weight: config.weight,
        weightUnit: config.weightUnit,
        boxCount: config.boxCount,
        length: config.length
      });
    } else {
      // Fallback للدوال الفردية (في حالة عدم توفر الدالة الجديدة)
      if (updateItemSellingUnit) {
        updateItemSellingUnit(editingItemIndex, config.sellingUnit);
      }

      switch (config.sellingUnit) {
        case 'weight':
          if (updateItemWeight && config.weight) {
            updateItemWeight(editingItemIndex, config.weight);
          }
          break;
        case 'box':
          if (updateItemBoxCount && config.boxCount) {
            updateItemBoxCount(editingItemIndex, config.boxCount);
          }
          break;
        case 'meter':
          if (updateItemLength && config.length) {
            updateItemLength(editingItemIndex, config.length);
          }
          break;
        case 'piece':
        default:
          updateItemQuantity(editingItemIndex, config.quantity);
          break;
      }
    }

    setEditingItemIndex(null);
  }, [editingItemIndex, updateItemFullConfig, updateItemSellingUnit, updateItemWeight, updateItemBoxCount, updateItemLength, updateItemQuantity]);

  // تغيير سريع للكمية (للقطع فقط)
  const handleQuickQuantityChange = useCallback((index: number, delta: number) => {
    const item = cartItems[index];
    if (!item) return;

    const currentQuantity = item.quantity || 1;
    const newQuantity = Math.max(1, currentQuantity + delta);
    updateItemQuantity(index, newQuantity);
  }, [cartItems, updateItemQuantity]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-900/95">
      {/* Header - مبسط ومتناسق */}
      <div className="bg-zinc-50/80 dark:bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700/50">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* أيقونة مبسطة */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 shadow-sm">
                <ShoppingCart className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">السلة</h3>
              </div>
              {totalItemsCount > 0 && (
                <Badge className="inline-flex items-center rounded-full bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary border-0 px-2 py-0.5 text-[10px] font-bold shadow-sm">
                  {totalItemsCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasItems && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="h-7 w-7 p-0 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                  title="مسح"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={addTab}
                className="h-7 w-7 p-0 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 hover:bg-zinc-200 dark:hover:bg-zinc-600/50 text-zinc-600 dark:text-zinc-300 transition-colors"
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
      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900/95">
        {!hasItems ? (
          <div className="flex items-center justify-center h-full min-h-[250px] text-center p-4">
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50">
                <ShoppingCart className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">السلة فارغة</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">أضف منتجات للبدء</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900/50">
            {/* Products - عناصر موحدة مضغوطة */}
            {cartItems.map((item, index) => (
              <CompactUnifiedCartItem
                key={`product-${item.product.id}-${item.colorId || 'no-color'}-${item.sizeId || 'no-size'}-${index}`}
                item={item}
                index={index}
                onRemove={removeItemFromCart}
                onEdit={handleEditItem}
                onQuickQuantityChange={handleQuickQuantityChange}
              />
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
        <div className="border-t border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 backdrop-blur-sm">
          <CartActions
            cartTotal={cartTotal}
            cartSubtotal={cartSubtotal}
            activeTab={activeTab}
            isSubmittingOrder={isSubmittingOrder}
            setIsPaymentDialogOpen={setIsPaymentDialogOpen}
          />
        </div>
      )}

      {/* Modal تعديل عنصر السلة */}
      {editingItem && (
        <SellingUnitSelectorModal
          isOpen={editingItemIndex !== null}
          onClose={handleCloseEditModal}
          product={editingItem.product}
          onConfirm={handleConfirmEdit}
          currentConfig={{
            sellingUnit: (editingItem as any).sellingUnit || 'piece',
            value: (editingItem as any).weight || (editingItem as any).boxCount || (editingItem as any).length || editingItem.quantity || 1,
            quantity: editingItem.quantity || 1,
            weight: (editingItem as any).weight,
            weightUnit: (editingItem as any).weightUnit,
            boxCount: (editingItem as any).boxCount,
            length: (editingItem as any).length
          }}
          mode="edit"
        />
      )}
    </div>
  );
};

export default React.memo(NormalModeCart);
