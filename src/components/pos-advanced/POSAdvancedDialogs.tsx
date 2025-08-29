import React, { useState, useCallback } from 'react';
import { toast } from "sonner";
import { Product } from '@/types';
import { supabase } from '@/lib/supabase';

// استيراد النوافذ الحوارية
import ProductVariantSelector from '@/components/pos/ProductVariantSelector';
import POSSettings from '@/components/pos/settings/POSSettings';
import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
import RepairOrderPrint from '@/components/repair/RepairOrderPrint';
import PrintReceiptDialog from '@/components/pos/PrintReceiptDialog';
import QuickExpenseDialog from '@/components/pos/QuickExpenseDialog';
import CalculatorComponent from '@/components/pos/Calculator';

// استيراد مكونات UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package } from 'lucide-react';

interface POSAdvancedDialogsProps {
  // حالة النوافذ الحوارية
  isVariantDialogOpen: boolean;
  isPOSSettingsOpen: boolean;
  isRepairDialogOpen: boolean;
  isRepairPrintDialogOpen: boolean;
  isPrintDialogOpen: boolean;
  isCalculatorOpen: boolean;
  isQuickExpenseOpen: boolean;
  
  // دوال إدارة النوافذ الحوارية
  setIsVariantDialogOpen: (open: boolean) => void;
  setIsPOSSettingsOpen: (open: boolean) => void;
  setIsRepairDialogOpen: (open: boolean) => void;
  setIsRepairPrintDialogOpen: (open: boolean) => void;
  setIsPrintDialogOpen: (open: boolean) => void;
  setIsCalculatorOpen: (open: boolean) => void;
  setIsQuickExpenseOpen: (open: boolean) => void;
  
  // بيانات النوافذ الحوارية
  selectedProductForVariant: Product | null;
  setSelectedProductForVariant: (product: Product | null) => void;
  selectedRepairOrder: any;
  setSelectedRepairOrder: (order: any) => void;
  repairQueuePosition: number;
  setRepairQueuePosition: (position: number) => void;
  
  // بيانات الطباعة
  completedItems: any[];
  completedServices: any[];
  completedSubscriptions: any[];
  completedTotal: number;
  completedSubtotal: number;
  completedDiscount: number;
  completedDiscountAmount: number;
  completedCustomerName: string | undefined;
  completedOrderNumber: string;
  completedOrderDate: Date;
  completedPaidAmount: number;
  completedRemainingAmount: number;
  isPartialPayment: boolean;
  considerRemainingAsPartial: boolean;
  subscriptionAccountInfo: any;
  
  // دوال معالجة الأحداث
  handleAddVariantToCart: (
    product: Product, 
    colorId?: string, 
    sizeId?: string, 
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => void;
  handleRepairServiceSuccess: (orderId: string, trackingCode: string) => Promise<void>;
  
  // دوال مسح البيانات
  clearPrintData: () => void;
}

export const POSAdvancedDialogs: React.FC<POSAdvancedDialogsProps> = ({
  // حالة النوافذ الحوارية
  isVariantDialogOpen,
  isPOSSettingsOpen,
  isRepairDialogOpen,
  isRepairPrintDialogOpen,
  isPrintDialogOpen,
  isCalculatorOpen,
  isQuickExpenseOpen,
  
  // دوال إدارة النوافذ الحوارية
  setIsVariantDialogOpen,
  setIsPOSSettingsOpen,
  setIsRepairDialogOpen,
  setIsRepairPrintDialogOpen,
  setIsPrintDialogOpen,
  setIsCalculatorOpen,
  setIsQuickExpenseOpen,
  
  // بيانات النوافذ الحوارية
  selectedProductForVariant,
  setSelectedProductForVariant,
  selectedRepairOrder,
  setSelectedRepairOrder,
  repairQueuePosition,
  setRepairQueuePosition,
  
  // بيانات الطباعة
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
  
  // دوال معالجة الأحداث
  handleAddVariantToCart,
  handleRepairServiceSuccess,
  
  // دوال مسح البيانات
  clearPrintData
}) => {
  return (
    <>
      {/* نافذة اختيار المتغيرات */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent 
          className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
        >
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              اختيار متغيرات المنتج
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              اختر اللون والمقاس المناسب لإضافة المنتج إلى السلة
            </DialogDescription>
          </DialogHeader>
          
          {selectedProductForVariant && (
            <ProductVariantSelector
              product={selectedProductForVariant}
              onAddToCart={handleAddVariantToCart}
              onCancel={() => {
                setIsVariantDialogOpen(false);
                setSelectedProductForVariant(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة إعدادات POS */}
      <POSSettings
        isOpen={isPOSSettingsOpen}
        onOpenChange={setIsPOSSettingsOpen}
      />

      {/* نافذة الآلة الحاسبة */}
      <CalculatorComponent
        isOpen={isCalculatorOpen}
        onOpenChange={setIsCalculatorOpen}
      />

      {/* نافذة المصروف السريع */}
      <QuickExpenseDialog
        isOpen={isQuickExpenseOpen}
        onOpenChange={setIsQuickExpenseOpen}
      />

      {/* نافذة خدمة التصليح */}
      <RepairServiceDialog
        isOpen={isRepairDialogOpen}
        onClose={() => setIsRepairDialogOpen(false)}
        onSuccess={handleRepairServiceSuccess}
      />

      {/* نافذة طباعة وصل التصليح */}
      <Dialog open={isRepairPrintDialogOpen} onOpenChange={setIsRepairPrintDialogOpen}>
        <DialogContent 
          className="max-w-2xl max-h-[85vh] overflow-y-auto p-0"
        >
          <div className="bg-white">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">طباعة وصل التصليح</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsRepairPrintDialogOpen(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedRepairOrder && (
                <RepairOrderPrint 
                  order={selectedRepairOrder} 
                  queuePosition={repairQueuePosition} 
                />
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsRepairPrintDialogOpen(false)}
              >
                إغلاق
              </Button>
              <Button onClick={() => window.print()}>
                طباعة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة طباعة الطلبات العادية */}
      <PrintReceiptDialog
        isOpen={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        completedItems={completedItems}
        completedServices={completedServices}
        completedTotal={completedTotal}
        completedSubtotal={completedSubtotal}
        completedDiscount={completedDiscount}
        completedDiscountAmount={completedDiscountAmount}
        completedCustomerName={completedCustomerName}
        completedPaidAmount={completedPaidAmount}
        completedRemainingAmount={completedRemainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        orderDate={completedOrderDate}
        orderNumber={completedOrderNumber}
        subscriptionAccountInfo={subscriptionAccountInfo}
        onPrintCompleted={() => {
          setIsPrintDialogOpen(false);
          clearPrintData();
        }}
      />
    </>
  );
};
