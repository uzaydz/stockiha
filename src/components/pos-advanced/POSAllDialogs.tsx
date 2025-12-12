/**
 * ⚡ مكون حاوية جميع النوافذ الحوارية
 * يفصل جميع النوافذ عن المكون الرئيسي لتحسين القراءة والأداء
 */

import React, { Suspense, lazy, memo } from 'react';
import { POSAdvancedDialogs } from '@/components/pos-advanced/POSAdvancedDialogs';
import POSAdvancedHoldOrders from '@/components/pos-advanced/POSAdvancedHoldOrders';
import KeyboardShortcutsDialog from '@/components/pos-advanced/KeyboardShortcutsDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StartSessionDialog from '@/components/pos/StartSessionDialog';
import { AdvancedItemEditDialog, CustomerSaleDialog } from '@/components/pos-infinity';
import MobileBarcodeScanner from "@/components/pos-advanced/components/MobileBarcodeScanner";
import type { POSMode } from '@/components/pos-infinity/CommandIsland';
import type { SaleMode } from '@/components/pos-infinity/CustomerSaleDialog';
import type { HeldOrder } from '@/lib/hold-orders';

// ⚡ نافذة الدفع - Lazy loaded
const POSAdvancedPaymentDialog = lazy(() => import('@/components/pos-advanced/POSAdvancedPaymentDialog'));

interface POSAllDialogsProps {
  // نوافذ POSAdvancedDialogs
  isVariantDialogOpen: boolean;
  isPOSSettingsOpen: boolean;
  isRepairDialogOpen: boolean;
  isRepairPrintDialogOpen: boolean;
  isPrintDialogOpen: boolean;
  isCalculatorOpen: boolean;
  isQuickExpenseOpen: boolean;
  setIsVariantDialogOpen: (open: boolean) => void;
  setIsPOSSettingsOpen: (open: boolean) => void;
  setIsRepairDialogOpen: (open: boolean) => void;
  setIsRepairPrintDialogOpen: (open: boolean) => void;
  setIsPrintDialogOpen: (open: boolean) => void;
  setIsCalculatorOpen: (open: boolean) => void;
  setIsQuickExpenseOpen: (open: boolean) => void;
  selectedProductForVariant: any;
  setSelectedProductForVariant: (product: any) => void;
  selectedRepairOrder: any;
  setSelectedRepairOrder: (order: any) => void;
  repairQueuePosition: number;
  setRepairQueuePosition: (position: number) => void;
  completedItems: any[];
  completedServices: any[];
  completedSubscriptions: any[];
  completedTotal: number;
  completedSubtotal: number;
  completedDiscount: number;
  completedDiscountAmount: number;
  completedCustomerName?: string;
  completedOrderNumber?: string;
  completedOrderDate?: string;
  completedPaidAmount?: number;
  completedRemainingAmount?: number;
  isPartialPayment?: boolean;
  considerRemainingAsPartial?: boolean;
  subscriptionAccountInfo?: any;
  handleAddVariantToCart: (product: any, colorId: string, sizeId: string, price: number, colorName: string, colorCode: string, sizeName: string, image: string) => void;
  handleRepairServiceSuccess: (data: any) => void;
  clearPrintData: () => void;

  // نافذة الطلبات المعلقة
  isHoldOrdersOpen: boolean;
  setIsHoldOrdersOpen: (open: boolean) => void;
  onRestoreHeldOrder: (order: HeldOrder) => void;

  // نافذة التأكيد
  confirmDialogOpen: boolean;
  setConfirmDialogOpen: (open: boolean) => void;
  confirmDialogConfig: {
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    type: 'warning' | 'danger' | 'info';
    requireDoubleConfirm?: boolean;
  };
  onConfirmDialogConfirm: () => void;
  onConfirmDialogCancel: () => void;
  confirmDialogLoading: boolean;

  // نافذة بدء الجلسة
  showSessionDialog: boolean;
  setShowSessionDialog: (open: boolean) => void;
  isAdminMode: boolean;

  // نافذة اختصارات لوحة المفاتيح
  isKeyboardHelpOpen: boolean;
  setIsKeyboardHelpOpen: (open: boolean) => void;
  keyboardShortcuts: any[];

  // نافذة تعديل العنصر المتقدمة
  isAdvancedEditOpen: boolean;
  setIsAdvancedEditOpen: (open: boolean) => void;
  editingItemIndex: number;
  currentCartItems: any[];
  onAdvancedEditSave: (index: number, updates: any) => void;
  currentPOSMode: POSMode;
  // ⚡ Offline Props للـ Serial Numbers
  organizationId?: string;
  orderDraftId?: string;
  onSerialConflict?: (serialNumber: string, conflictType: 'reserved' | 'sold') => void;

  // نافذة الدفع
  isPaymentDialogOpen: boolean;
  setIsPaymentDialogOpen: (open: boolean) => void;
  cartTotal: number;
  cartOriginalTotal: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  customers: any[];
  selectedCustomerId?: string;
  onPaymentComplete: (data: any) => void;
  isSubmittingOrder: boolean;
  // ⚡ عناصر السلة للأرقام التسلسلية
  paymentCartItems?: any[];

  // نافذة العميل ونوع البيع
  isCustomerDialogOpen: boolean;
  setIsCustomerDialogOpen: (open: boolean) => void;
  selectedCustomerName?: string;
  saleMode: SaleMode;
  onSelectCustomer: (customerId?: string, customerName?: string) => void;
  onChangeSaleMode: (mode: SaleMode) => void;

  // ماسح الباركود المحمول
  isCameraScannerOpen: boolean;
  setIsCameraScannerOpen: (open: boolean) => void;
  onBarcodeDetected: (code: string) => void;
  isCameraScannerSupported: boolean;
  hasNativeBarcodeDetector: boolean;
  isCameraBusy: boolean;
  isScannerLoading: boolean;
}

const POSAllDialogs = memo<POSAllDialogsProps>(({
  // POSAdvancedDialogs
  isVariantDialogOpen,
  isPOSSettingsOpen,
  isRepairDialogOpen,
  isRepairPrintDialogOpen,
  isPrintDialogOpen,
  isCalculatorOpen,
  isQuickExpenseOpen,
  setIsVariantDialogOpen,
  setIsPOSSettingsOpen,
  setIsRepairDialogOpen,
  setIsRepairPrintDialogOpen,
  setIsPrintDialogOpen,
  setIsCalculatorOpen,
  setIsQuickExpenseOpen,
  selectedProductForVariant,
  setSelectedProductForVariant,
  selectedRepairOrder,
  setSelectedRepairOrder,
  repairQueuePosition,
  setRepairQueuePosition,
  completedItems,
  completedServices,
  completedSubscriptions,
  completedTotal,
  completedSubtotal,
  completedDiscount,
  completedDiscountAmount,
  completedCustomerName,
  completedOrderNumber,
  completedOrderDate,
  completedPaidAmount,
  completedRemainingAmount,
  isPartialPayment,
  considerRemainingAsPartial,
  subscriptionAccountInfo,
  handleAddVariantToCart,
  handleRepairServiceSuccess,
  clearPrintData,

  // Hold Orders
  isHoldOrdersOpen,
  setIsHoldOrdersOpen,
  onRestoreHeldOrder,

  // Confirm Dialog
  confirmDialogOpen,
  setConfirmDialogOpen,
  confirmDialogConfig,
  onConfirmDialogConfirm,
  onConfirmDialogCancel,
  confirmDialogLoading,

  // Session Dialog
  showSessionDialog,
  setShowSessionDialog,
  isAdminMode,

  // Keyboard Shortcuts
  isKeyboardHelpOpen,
  setIsKeyboardHelpOpen,
  keyboardShortcuts,

  // Advanced Edit
  isAdvancedEditOpen,
  setIsAdvancedEditOpen,
  editingItemIndex,
  currentCartItems,
  onAdvancedEditSave,
  currentPOSMode,
  // ⚡ Offline Props
  organizationId,
  orderDraftId,
  onSerialConflict,

  // Payment Dialog
  isPaymentDialogOpen,
  setIsPaymentDialogOpen,
  cartTotal,
  cartOriginalTotal,
  discountValue,
  discountType,
  customers,
  selectedCustomerId,
  onPaymentComplete,
  isSubmittingOrder,
  paymentCartItems,

  // Customer Dialog
  isCustomerDialogOpen,
  setIsCustomerDialogOpen,
  selectedCustomerName,
  saleMode,
  onSelectCustomer,
  onChangeSaleMode,

  // Camera Scanner
  isCameraScannerOpen,
  setIsCameraScannerOpen,
  onBarcodeDetected,
  isCameraScannerSupported,
  hasNativeBarcodeDetector,
  isCameraBusy,
  isScannerLoading
}) => {
  return (
    <>
      {/* النوافذ الحوارية الأساسية */}
      <POSAdvancedDialogs
        isVariantDialogOpen={isVariantDialogOpen}
        isPOSSettingsOpen={isPOSSettingsOpen}
        isRepairDialogOpen={isRepairDialogOpen}
        isRepairPrintDialogOpen={isRepairPrintDialogOpen}
        isPrintDialogOpen={isPrintDialogOpen}
        isCalculatorOpen={isCalculatorOpen}
        isQuickExpenseOpen={isQuickExpenseOpen}
        setIsVariantDialogOpen={setIsVariantDialogOpen}
        setIsPOSSettingsOpen={setIsPOSSettingsOpen}
        setIsRepairDialogOpen={setIsRepairDialogOpen}
        setIsRepairPrintDialogOpen={setIsRepairPrintDialogOpen}
        setIsPrintDialogOpen={setIsPrintDialogOpen}
        setIsCalculatorOpen={setIsCalculatorOpen}
        setIsQuickExpenseOpen={setIsQuickExpenseOpen}
        selectedProductForVariant={selectedProductForVariant}
        setSelectedProductForVariant={setSelectedProductForVariant}
        selectedRepairOrder={selectedRepairOrder}
        setSelectedRepairOrder={setSelectedRepairOrder}
        repairQueuePosition={repairQueuePosition}
        setRepairQueuePosition={setRepairQueuePosition}
        completedItems={completedItems}
        completedServices={completedServices}
        completedSubscriptions={completedSubscriptions}
        completedTotal={completedTotal}
        completedSubtotal={completedSubtotal}
        completedDiscount={completedDiscount}
        completedDiscountAmount={completedDiscountAmount}
        completedCustomerName={completedCustomerName}
        completedOrderNumber={completedOrderNumber}
        completedOrderDate={completedOrderDate}
        completedPaidAmount={completedPaidAmount}
        completedRemainingAmount={completedRemainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        subscriptionAccountInfo={subscriptionAccountInfo}
        handleAddVariantToCart={handleAddVariantToCart}
        handleRepairServiceSuccess={handleRepairServiceSuccess}
        clearPrintData={clearPrintData}
      />

      {/* ماسح الباركود المحمول */}
      <MobileBarcodeScanner
        open={isCameraScannerOpen}
        onOpenChange={setIsCameraScannerOpen}
        onBarcodeDetected={onBarcodeDetected}
        hasCameraAccess={isCameraScannerSupported}
        hasNativeDetector={hasNativeBarcodeDetector}
        isProcessing={isCameraBusy || isScannerLoading}
      />

      {/* نافذة الطلبات المعلقة */}
      <POSAdvancedHoldOrders
        open={isHoldOrdersOpen}
        onOpenChange={setIsHoldOrdersOpen}
        onRestoreOrder={onRestoreHeldOrder}
      />

      {/* نافذة التأكيد */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        confirmText={confirmDialogConfig.confirmText}
        cancelText={confirmDialogConfig.cancelText}
        type={confirmDialogConfig.type}
        onConfirm={onConfirmDialogConfirm}
        onCancel={onConfirmDialogCancel}
        loading={confirmDialogLoading}
        requireDoubleConfirm={confirmDialogConfig.requireDoubleConfirm}
      />

      {/* نافذة بدء جلسة العمل */}
      <StartSessionDialog
        open={showSessionDialog}
        onOpenChange={setShowSessionDialog}
        allowClose={isAdminMode}
      />

      {/* نافذة اختصارات لوحة المفاتيح */}
      <KeyboardShortcutsDialog
        open={isKeyboardHelpOpen}
        onOpenChange={setIsKeyboardHelpOpen}
        shortcuts={keyboardShortcuts}
      />

      {/* ⚡ نافذة تعديل العنصر المتقدمة */}
      <AdvancedItemEditDialog
        open={isAdvancedEditOpen}
        onOpenChange={setIsAdvancedEditOpen}
        item={editingItemIndex >= 0 ? currentCartItems[editingItemIndex] : null}
        index={editingItemIndex}
        onSave={onAdvancedEditSave}
        mode={currentPOSMode}
        // ⚡ Offline Props للـ Serial Numbers
        organizationId={organizationId}
        orderDraftId={orderDraftId}
        onSerialConflict={onSerialConflict}
      />

      {/* ⚡ نافذة الدفع */}
      <Suspense fallback={null}>
        <POSAdvancedPaymentDialog
          isOpen={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          subtotal={cartTotal}
          currentDiscount={discountValue}
          currentDiscountType={discountType}
          total={cartTotal}
          originalTotal={cartOriginalTotal}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onPaymentComplete={onPaymentComplete}
          isProcessing={isSubmittingOrder}
          cartItems={paymentCartItems}
        />
      </Suspense>

      {/* ⚡ نافذة العميل ونوع البيع */}
      <CustomerSaleDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        selectedCustomerName={selectedCustomerName}
        originalTotal={cartOriginalTotal}
        currentTotal={cartTotal}
        saleMode={saleMode}
        onSelectCustomer={onSelectCustomer}
        onChangeSaleMode={onChangeSaleMode}
        onConfirmAndProceed={() => setIsPaymentDialogOpen(true)}
      />
    </>
  );
});

POSAllDialogs.displayName = 'POSAllDialogs';

export default POSAllDialogs;
