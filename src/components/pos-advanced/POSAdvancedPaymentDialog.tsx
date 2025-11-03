import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User as AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Receipt, X } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { useToast } from '@/hooks/use-toast';

// استيراد المكونات الفرعية الجديدة
import {
  CustomerSelector,
  CustomerCreateForm,
  PaymentMethodTabs,
  NotesSection
} from './payment-dialog';

interface POSAdvancedPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  
  // بيانات الطلب
  subtotal: number;
  currentDiscount: number;
  currentDiscountType: 'percentage' | 'fixed';
  total: number;
  
  // العملاء
  customers: AppUser[];
  selectedCustomerId?: string;
  
  // دوال المعالجة
  onPaymentComplete: (data: {
    customerId?: string;
    notes?: string;
    discount: number;
    discountType: 'percentage' | 'fixed';
    amountPaid: number;
    paymentMethod: string;
    isPartialPayment: boolean;
    considerRemainingAsPartial: boolean;
  }) => void;
  
  onCustomerAdded?: (customer: AppUser) => void;
  isProcessing?: boolean;
}

const POSAdvancedPaymentDialog: React.FC<POSAdvancedPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  subtotal,
  currentDiscount,
  currentDiscountType,
  total,
  customers,
  selectedCustomerId,
  onPaymentComplete,
  onCustomerAdded,
  isProcessing = false
}) => {
  // Hooks
  const { createCustomer } = useShop();
  const { toast } = useToast();

  // حالة الدفع
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerId, setCustomerId] = useState(selectedCustomerId || 'anonymous');
  const [notes, setNotes] = useState('');
  
  // حالة الدفع الجزئي
  const [considerRemainingAsPartial, setConsiderRemainingAsPartial] = useState(true);

  // حالة إدارة العملاء
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<AppUser[]>(customers);

  // تحديث العملاء المحليين
  useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);

  // حساب المبالغ
  const finalTotal = total;
  const paidAmount = parseFloat(amountPaid) || 0;
  const remainingAmount = Math.max(0, finalTotal - paidAmount);
  const change = Math.max(0, paidAmount - finalTotal);
  const isPartialPayment = paidAmount < finalTotal;

  // تحديث المبلغ المدفوع عند تغيير طريقة الدفع
  useEffect(() => {
    if (paymentMethod === 'card') {
      setAmountPaid(finalTotal.toString());
    }
  }, [paymentMethod, finalTotal]);
  
  // إعادة تعيين القيم عند فتح الـ dialog
  useEffect(() => {
    if (isOpen) {
      setAmountPaid(finalTotal.toString());
      setCustomerId(selectedCustomerId || 'anonymous');
      setNotes('');
      setPaymentMethod('cash');
      setCustomerSearchQuery('');
      setShowCreateCustomer(false);
      setShowCustomerList(false);
      setLocalCustomers(customers);
    }
  }, [isOpen, finalTotal, selectedCustomerId, customers]);

  // دالة إنشاء عميل جديد
  const handleCreateCustomer = useCallback(async (data: { name: string; phone: string; email: string }) => {
    if (!data.name.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال اسم العميل",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const newCustomer = await createCustomer({
        name: data.name.trim(),
        phone: data.phone.trim() || undefined,
        email: data.email.trim() || undefined
      });

      setLocalCustomers(prev => [newCustomer, ...prev]);
      
      if (onCustomerAdded) {
        onCustomerAdded(newCustomer);
      }

      setCustomerId(newCustomer.id);
      setShowCreateCustomer(false);
      setShowCustomerList(false);
      setCustomerSearchQuery('');

      toast({
        title: "نجح إنشاء العميل",
        description: `تم إنشاء العميل ${newCustomer.name} بنجاح`
      });
    } catch (error: any) {
      toast({
        title: "خطأ في إنشاء العميل",
        description: error instanceof Error ? error.message : (typeof error === 'string' ? error : "فشل في إنشاء العميل"),
        variant: "destructive"
      });
    } finally {
      setIsCreatingCustomer(false);
    }
  }, [createCustomer, onCustomerAdded, toast]);

  // دالة البحث السريع عن العميل وإنشاؤه تلقائياً
  const handleOpenCreateForm = useCallback(() => {
    const isPhoneNumber = /^\d+$/.test(customerSearchQuery.trim());
    
    if (customerSearchQuery.trim()) {
      setShowCreateCustomer(true);
      setShowCustomerList(false);
    } else {
      setShowCreateCustomer(true);
      setShowCustomerList(false);
    }
  }, [customerSearchQuery]);
  
  const handlePaymentComplete = useCallback(() => {
    if (isPartialPayment && considerRemainingAsPartial && customerId === 'anonymous') {
      toast({
        title: "يجب اختيار عميل",
        description: "يجب اختيار عميل للدفع الجزئي",
        variant: "destructive"
      });
      return;
    }

    onPaymentComplete({
      customerId: customerId === 'anonymous' ? undefined : customerId,
      notes,
      discount: currentDiscount,
      discountType: currentDiscountType,
      amountPaid: paidAmount,
      paymentMethod,
      isPartialPayment,
      considerRemainingAsPartial
    });
  }, [isPartialPayment, considerRemainingAsPartial, customerId, notes, currentDiscount, currentDiscountType, paidAmount, paymentMethod, onPaymentComplete, toast]);
  
  const formatPrice = (price: number) => price.toLocaleString() + ' دج';
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            إتمام الطلب - دفع متقدم
          </DialogTitle>
          <DialogDescription>
            قم بتحديد التخفيضات وطريقة الدفع لإتمام الطلب
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* قسم اختيار العميل */}
          {showCreateCustomer ? (
            <CustomerCreateForm
              onClose={() => setShowCreateCustomer(false)}
              onSubmit={handleCreateCustomer}
              initialData={{
                name: /^\d+$/.test(customerSearchQuery.trim()) ? '' : customerSearchQuery.trim(),
                phone: /^\d+$/.test(customerSearchQuery.trim()) ? customerSearchQuery.trim() : '',
                email: ''
              }}
              isCreating={isCreatingCustomer}
            />
          ) : (
            <CustomerSelector
              customers={localCustomers}
              selectedCustomerId={customerId}
              onSelectCustomer={(id) => {
                setCustomerId(id);
                setCustomerSearchQuery('');
              }}
              onOpenCreateForm={handleOpenCreateForm}
              searchQuery={customerSearchQuery}
              onSearchChange={setCustomerSearchQuery}
              showList={showCustomerList}
              onToggleList={setShowCustomerList}
              isPartialPayment={isPartialPayment}
              considerRemainingAsPartial={considerRemainingAsPartial}
            />
          )}
          
          <Separator />
          
          {/* قسم طريقة الدفع */}
          <PaymentMethodTabs
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            amountPaid={amountPaid}
            onAmountPaidChange={setAmountPaid}
            finalTotal={finalTotal}
            paidAmount={paidAmount}
            remainingAmount={remainingAmount}
            change={change}
            isPartialPayment={isPartialPayment}
            considerRemainingAsPartial={considerRemainingAsPartial}
            onConsiderRemainingChange={setConsiderRemainingAsPartial}
            formatPrice={formatPrice}
          />
          
          <Separator />
          
          {/* ملاحظات */}
          <NotesSection
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            إلغاء
          </Button>
          <Button
            onClick={handlePaymentComplete}
            disabled={isProcessing || (isPartialPayment && considerRemainingAsPartial && customerId === 'anonymous')}
            className="min-w-[120px]"
            size="sm"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                إتمام الطلب ({formatPrice(finalTotal)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default POSAdvancedPaymentDialog;
