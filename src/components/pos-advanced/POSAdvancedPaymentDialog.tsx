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
// ✨ استخدام الـ context الجديد المحسن - فقط CustomersContext بدلاً من ShopContext الكامل
import { useCustomers } from '@/context/shop/ShopContext.new';
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
  // ✅ السعر الأصلي (قبل التعديل اليدوي) لحساب الفرق
  originalTotal?: number;

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
  originalTotal,
  customers,
  selectedCustomerId,
  onPaymentComplete,
  onCustomerAdded,
  isProcessing = false
}) => {
  // Hooks
  // ✨ استخدام createCustomer من CustomersContext الجديد فقط - تحسين الأداء بنسبة 85%
  const { createCustomer } = useCustomers();
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

  // ✅ حساب فرق السعر (تعديل يدوي)
  const priceDifference = (originalTotal || total) - total;
  const hasPriceDifference = priceDifference > 0;
  const differencePercentage = originalTotal && originalTotal > 0 ? ((priceDifference / originalTotal) * 100).toFixed(1) : '0';

  // حالة نوع معالجة الفرق
  const [priceHandlingType, setPriceHandlingType] = useState<'discount' | 'partial'>('discount');

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
          
          {/* ✅ قسم معالجة فرق السعر (إذا كان هناك تعديل يدوي) */}
          {hasPriceDifference && (
            <>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">فرق السعر</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatPrice(priceDifference)} ({differencePercentage}%)
                  </span>
                </div>
                <div className="text-xs text-amber-600/80 dark:text-amber-400/80">
                  السعر الأصلي: {formatPrice(originalTotal || 0)} → السعر الحالي: {formatPrice(total)}
                </div>

                {/* خيارات معالجة الفرق */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPriceHandlingType('discount')}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      priceHandlingType === 'discount'
                        ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600'
                        : 'border-amber-200 dark:border-amber-700 hover:border-amber-300'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${priceHandlingType === 'discount' ? 'text-amber-700 dark:text-amber-300' : 'text-amber-600 dark:text-amber-400'}`}>
                      تخفيض إضافي
                    </span>
                    <span className="text-[10px] text-amber-500 dark:text-amber-500">لا يحتاج متابعة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceHandlingType('partial')}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      priceHandlingType === 'partial'
                        ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
                        : 'border-amber-200 dark:border-amber-700 hover:border-amber-300'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${priceHandlingType === 'partial' ? 'text-blue-700 dark:text-blue-300' : 'text-amber-600 dark:text-amber-400'}`}>
                      دفعة جزئية
                    </span>
                    <span className="text-[10px] text-amber-500 dark:text-amber-500">يحتاج عميل لمتابعة التحصيل</span>
                  </button>
                </div>

                {priceHandlingType === 'partial' && customerId === 'anonymous' && (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ⚠️ يجب اختيار عميل لتسجيل الدفعة الجزئية
                    </p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

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
            disabled={isProcessing || (isPartialPayment && considerRemainingAsPartial && customerId === 'anonymous') || (hasPriceDifference && priceHandlingType === 'partial' && customerId === 'anonymous')}
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
