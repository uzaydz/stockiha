import { useState, useCallback } from 'react';
import { toast } from "sonner";
import { Product } from '@/types';
import { supabase } from '@/lib/supabase';

export const usePOSAdvancedDialogs = () => {
  // حالة النوافذ الحوارية
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [isPOSSettingsOpen, setIsPOSSettingsOpen] = useState(false);
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [isRepairPrintDialogOpen, setIsRepairPrintDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // بيانات النوافذ الحوارية
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState<any>(null);
  const [repairQueuePosition, setRepairQueuePosition] = useState(1);

  // بيانات الطباعة
  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const [completedServices, setCompletedServices] = useState<any[]>([]);
  const [completedSubscriptions, setCompletedSubscriptions] = useState<any[]>([]);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedSubtotal, setCompletedSubtotal] = useState(0);
  const [completedDiscount, setCompletedDiscount] = useState(0);
  const [completedDiscountAmount, setCompletedDiscountAmount] = useState(0);
  const [completedCustomerName, setCompletedCustomerName] = useState<string | undefined>();
  const [completedOrderNumber, setCompletedOrderNumber] = useState('');
  const [completedOrderDate, setCompletedOrderDate] = useState(new Date());
  const [completedPaidAmount, setCompletedPaidAmount] = useState(0);
  const [completedRemainingAmount, setCompletedRemainingAmount] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [considerRemainingAsPartial, setConsiderRemainingAsPartial] = useState(false);
  const [subscriptionAccountInfo, setSubscriptionAccountInfo] = useState<any>();

  // دالة معالجة نجاح إضافة خدمة التصليح
  const handleRepairServiceSuccess = useCallback(async (orderId: string, trackingCode: string) => {
    try {
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          images:repair_images(*),
          history:repair_status_history(*, users(name)),
          repair_location:repair_locations(id, name, description, address, phone),
          staff:users(id, name, email, phone)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedRepairOrder(data);
        setRepairQueuePosition(1);
        setIsRepairPrintDialogOpen(true);
      }

      setIsRepairDialogOpen(false);
      toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
    } catch (error) {
      setIsRepairDialogOpen(false);
      toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
    }
  }, []);

  // دالة مسح بيانات الطباعة
  const clearPrintData = useCallback(() => {
    setCompletedItems([]);
    setCompletedServices([]);
    setCompletedSubscriptions([]);
    setCompletedTotal(0);
    setCompletedSubtotal(0);
    setCompletedDiscount(0);
    setCompletedDiscountAmount(0);
    setCompletedCustomerName(undefined);
    setCompletedOrderNumber('');
    setCompletedPaidAmount(0);
    setCompletedRemainingAmount(0);
    setIsPartialPayment(false);
    setConsiderRemainingAsPartial(false);
    setSubscriptionAccountInfo(undefined);
  }, []);

  // دالة حفظ بيانات الطباعة
  const savePrintData = useCallback((data: {
    items: any[];
    services: any[];
    subscriptions: any[];
    subtotal: number;
    total: number;
    discount: number;
    discountAmount: number;
    customerName?: string;
    orderNumber: string;
    paidAmount: number;
    remainingAmount: number;
    isPartial: boolean;
    considerRemaining: boolean;
    subscriptionInfo?: any;
  }) => {
    setCompletedItems(data.items);
    setCompletedServices(data.services);
    setCompletedSubscriptions(data.subscriptions);
    setCompletedSubtotal(data.subtotal);
    setCompletedTotal(data.total);
    setCompletedDiscount(data.discount);
    setCompletedDiscountAmount(data.discountAmount);
    setCompletedCustomerName(data.customerName);
    setCompletedOrderNumber(data.orderNumber);
    setCompletedOrderDate(new Date());
    setCompletedPaidAmount(data.paidAmount);
    setCompletedRemainingAmount(data.remainingAmount);
    setIsPartialPayment(data.isPartial);
    setConsiderRemainingAsPartial(data.considerRemaining);
    setSubscriptionAccountInfo(data.subscriptionInfo);
  }, []);

  return {
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
    handleRepairServiceSuccess,
    clearPrintData,
    savePrintData
  };
};
