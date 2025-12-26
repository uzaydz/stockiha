/**
 * ⚡ مكون سلة الديسكتوب
 * يفصل واجهة سلة الديسكتوب عن المكون الرئيسي
 */

import React, { memo } from 'react';
import { TitaniumCart } from '@/components/pos-infinity';
import type { POSMode } from '@/components/pos-infinity/CommandIsland';
import type { CartItem } from '@/types';
import type { CartTransferItem } from '@/services/P2PCartService';

interface Tab {
  id: string;
  name?: string;
  cartItems?: CartItem[];
  selectedServices?: any[];
  selectedSubscriptions?: any[];
  customerId?: string;
  customerName?: string;
}

interface POSDesktopCartProps {
  currentPOSMode: POSMode;
  currentCartItems: CartItem[] | any[];
  // دوال السلة
  onUpdateQuantity: (index: number, value: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onQuickCheckout: () => void;
  onUpdatePrice: (index: number, price: number) => void;
  onEditItem: (index: number) => void;
  onSelectCustomer: () => void;
  onHoldCart?: () => void;
  // حالة
  customerName?: string;
  isSubmitting: boolean;
  subtotal: number;
  discount: number;
  total: number;
  saleMode: string;
  lossDescription?: string;
  onLossDescriptionChange?: (value: string) => void;
  // التبويبات
  tabs?: Tab[];
  activeTabId?: string;
  onSwitchTab?: (tabId: string) => void;
  onRemoveTab?: (tabId: string) => void;
  // ⚡ Offline Props
  organizationId?: string;
  orderDraftId?: string;
  onSerialConflict?: (serialNumber: string, conflictType: 'reserved' | 'sold') => void;
  // 📲 نقل السلة
  onReceiveCart?: (items: CartTransferItem[], mode: 'add' | 'replace') => void;
}

const POSDesktopCart = memo<POSDesktopCartProps>(({
  currentPOSMode,
  currentCartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onQuickCheckout,
  onUpdatePrice,
  onEditItem,
  onSelectCustomer,
  onHoldCart,
  customerName,
  isSubmitting,
  subtotal,
  discount,
  total,
  saleMode,
  lossDescription,
  onLossDescriptionChange,
  tabs,
  activeTabId,
  onSwitchTab,
  onRemoveTab,
  // ⚡ Offline Props
  organizationId,
  orderDraftId,
  onSerialConflict,
  // 📲 نقل السلة
  onReceiveCart
}) => {
  return (
    <aside className="hidden lg:flex flex-col h-full order-2">
      <div className="h-full w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
        <TitaniumCart
          mode={currentPOSMode}
          items={currentCartItems}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onClearCart={onClearCart}
          onCheckout={onCheckout}
          onQuickCheckout={onQuickCheckout}
          onUpdatePrice={onUpdatePrice}
          onEditItem={onEditItem}
          customerName={customerName}
          onSelectCustomer={onSelectCustomer}
          isSubmitting={isSubmitting}
          subtotal={subtotal}
          discount={discount}
          total={total}
          saleMode={saleMode as any}
          onHoldCart={onHoldCart}
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={onSwitchTab}
          onRemoveTab={onRemoveTab}
          lossDescription={lossDescription}
          onLossDescriptionChange={onLossDescriptionChange}
          // ⚡ Offline Props
          organizationId={organizationId}
          orderDraftId={orderDraftId}
          onSerialConflict={onSerialConflict}
          // 📲 نقل السلة
          onReceiveCart={onReceiveCart}
        />
      </div>
    </aside>
  );
});

POSDesktopCart.displayName = 'POSDesktopCart';

export default POSDesktopCart;
