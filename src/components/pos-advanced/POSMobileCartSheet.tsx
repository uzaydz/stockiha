/**
 * ⚡ مكون سلة الموبايل - Sheet
 * يفصل واجهة سلة الموبايل عن المكون الرئيسي
 */

import React, { Suspense, memo } from 'react';
import { createPortal } from 'react-dom';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, ChevronUp, RotateCcw, ShoppingCart, AlertTriangle } from "lucide-react";
import { TitaniumCart } from '@/components/pos-infinity';
import type { POSMode } from '@/components/pos-infinity/CommandIsland';
import type { CartItem } from '@/types';
import type { CartTransferItem } from '@/services/P2PCartService';
import { formatCurrency } from "@/lib/utils";

interface POSMobileCartSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLossMode: boolean;
  isReturnMode: boolean;
  currentPOSMode: POSMode;
  currentCartItems: CartItem[] | any[];
  cartSummaryLabel: string;
  cartSummarySubLabel: string;
  // دوال السلة
  onUpdateQuantity: (index: number, value: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onQuickCheckout: () => void;
  onUpdatePrice: (index: number, price: number) => void;
  onEditItem: (index: number) => void;
  onSelectCustomer: () => void;
  // حالة
  customerName?: string;
  isSubmitting: boolean;
  subtotal: number;
  discount: number;
  total: number;
  saleMode: string;
  lossDescription?: string;
  onLossDescriptionChange?: (value: string) => void;
  // الكاميرا
  onOpenCameraScanner: () => void;
  isCameraScannerSupported: boolean;
  hasNativeBarcodeDetector: boolean;
  // ⚡ Offline Props
  organizationId?: string;
  orderDraftId?: string;
  onSerialConflict?: (serialNumber: string, conflictType: 'reserved' | 'sold') => void;
  // 📲 نقل السلة
  onReceiveCart?: (items: CartTransferItem[], mode: 'add' | 'replace') => void;
}

const POSMobileCartSheet = memo<POSMobileCartSheetProps>(({
  isOpen,
  onOpenChange,
  isLossMode,
  isReturnMode,
  currentPOSMode,
  currentCartItems,
  cartSummaryLabel,
  cartSummarySubLabel,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onQuickCheckout,
  onUpdatePrice,
  onEditItem,
  onSelectCustomer,
  customerName,
  isSubmitting,
  subtotal,
  discount,
  total,
  saleMode,
  lossDescription,
  onLossDescriptionChange,
  onOpenCameraScanner,
  isCameraScannerSupported,
  hasNativeBarcodeDetector,
  // ⚡ Offline Props
  organizationId,
  orderDraftId,
  onSerialConflict,
  // 📲 نقل السلة
  onReceiveCart
}) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    (
      <div
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="flex items-end gap-2">
          {/* زر الكاميرا */}
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 w-14 rounded-2xl border-border/50 text-primary"
            onClick={onOpenCameraScanner}
            disabled={!isCameraScannerSupported && !hasNativeBarcodeDetector}
          >
            <Camera className="h-6 w-6" />
          </Button>

          {/* Sheet السلة */}
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card px-4 py-3 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isLossMode ? 'bg-amber-500/10 text-amber-600' :
                    isReturnMode ? 'bg-primary/10 text-primary' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {isLossMode ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : isReturnMode ? (
                      <RotateCcw className="h-5 w-5" />
                    ) : (
                      <ShoppingCart className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{cartSummaryLabel}</p>
                    <p className="text-xs text-muted-foreground">{cartSummarySubLabel}</p>
                  </div>
                </div>
                <ChevronUp
                  className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="h-[82vh] max-h-[90vh] w-full overflow-hidden border-t border-border/40 bg-card p-0"
              dir="rtl"
            >
              {/* الهيدر */}
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-card/80 backdrop-blur-sm">
                <div>
                  <p className="text-base font-semibold text-foreground">{cartSummaryLabel}</p>
                  <p className="text-xs text-muted-foreground">{cartSummarySubLabel}</p>
                </div>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    إغلاق
                  </button>
                </SheetClose>
              </div>

              {/* محتوى السلة */}
              <div className="h-[calc(100%-64px)] overflow-hidden">
                <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
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
                    lossDescription={lossDescription}
                    onLossDescriptionChange={onLossDescriptionChange}
                    // ⚡ Offline Props
                    organizationId={organizationId}
                    orderDraftId={orderDraftId}
                    onSerialConflict={onSerialConflict}
                    // 📲 نقل السلة
                    onReceiveCart={onReceiveCart}
                  />
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    ),
    document.body
  );
});

POSMobileCartSheet.displayName = 'POSMobileCartSheet';

export default POSMobileCartSheet;
