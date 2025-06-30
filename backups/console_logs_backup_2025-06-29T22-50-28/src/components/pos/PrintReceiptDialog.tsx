import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Printer, X, Check } from 'lucide-react';
import PrintReceipt from './PrintReceipt';
import { CartItemType } from './CartItem';
import { Service } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface PrintReceiptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  completedItems: CartItemType[];
  completedServices: (Service & { 
    scheduledDate?: Date; 
    notes?: string;
    service_booking_id?: string;
    public_tracking_code?: string;
  })[];
  completedTotal: number;
  completedSubtotal: number;
  completedDiscount: number;
  completedDiscountAmount?: number;
  completedCustomerName?: string;
  completedPaidAmount: number;
  completedRemainingAmount: number;
  isPartialPayment?: boolean;
  considerRemainingAsPartial?: boolean;
  orderDate: Date;
  orderNumber: string;
  subscriptionAccountInfo?: {
    username?: string;
    email?: string;
    password?: string;
    notes?: string;
  };
  onPrintCompleted: () => void;
}

export default function PrintReceiptDialog({
  isOpen,
  onOpenChange,
  completedItems,
  completedServices,
  completedTotal,
  completedSubtotal,
  completedDiscount,
  completedDiscountAmount = 0,
  completedCustomerName,
  completedPaidAmount,
  completedRemainingAmount,
  isPartialPayment = false,
  considerRemainingAsPartial = false,
  orderDate,
  orderNumber,
  subscriptionAccountInfo,
  onPrintCompleted
}: PrintReceiptDialogProps) {
  const { user } = useAuth();

  // تحديد طريقة الدفع بناءً على البيانات
  const paymentMethod = completedRemainingAmount > 0 ? 'دفع جزئي' : 'مكتمل';

  return (
    <PrintReceipt
      isOpen={isOpen}
      onClose={() => {
        onPrintCompleted();
        onOpenChange(false);
      }}
      orderId={orderNumber}
      items={completedItems}
      services={completedServices}
      subtotal={completedSubtotal}
      tax={0} // الضريبة صفر حسب النظام
      total={completedTotal}
      customerName={completedCustomerName}
      employeeName={user?.user_metadata?.name || user?.email}
      paymentMethod={paymentMethod}
      discount={completedDiscount}
      discountAmount={completedDiscountAmount}
      amountPaid={completedPaidAmount}
      remainingAmount={completedRemainingAmount}
      isPartialPayment={isPartialPayment}
      considerRemainingAsPartial={considerRemainingAsPartial}
      subscriptionAccountInfo={subscriptionAccountInfo}
    />
  );
}
