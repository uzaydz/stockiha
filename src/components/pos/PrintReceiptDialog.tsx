import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Printer, X, Check } from 'lucide-react';
import PrintReceipt from './PrintReceipt';
import { CartItemType } from './CartItem';
import { Service } from '@/types';

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
  completedCustomerName?: string;
  orderDate: Date;
  orderNumber: string;
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
  completedCustomerName,
  orderDate,
  orderNumber,
  onPrintCompleted
}: PrintReceiptDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <span>طباعة الإيصال</span>
          </DialogTitle>
          <DialogDescription>
            يمكنك طباعة إيصال للطلب الذي تم إنشاؤه
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <PrintReceipt
            cartItems={completedItems}
            selectedServices={completedServices}
            discount={completedDiscount}
            total={completedTotal}
            subtotal={completedSubtotal}
            customerName={completedCustomerName}
            orderDate={orderDate}
            orderNumber={orderNumber}
            onPrintCompleted={onPrintCompleted}
          />
        </div>
        
        <div className="mt-6 flex justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 ml-2" />
            إغلاق
          </Button>
          <Button 
            variant="default"
            onClick={onPrintCompleted}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90"
          >
            <Check className="h-4 w-4 ml-2" />
            تم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 