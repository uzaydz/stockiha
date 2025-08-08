import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DebtOrder } from '@/lib/api/debts';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtOrder;
  onSubmit: (data: { orderId: string; amountPaid: number; isFullPayment: boolean }) => void;
}

const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({ isOpen, onClose, debt, onSubmit }) => {
  const { theme } = useTheme();
  const [amount, setAmount] = useState<string>('');
  const [isFullPayment, setIsFullPayment] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // تعيين المبلغ المتبقي كقيمة افتراضية عند فتح النافذة
  useEffect(() => {
    if (isOpen && debt) {
      setAmount(debt.remainingAmount.toString());
      setIsFullPayment(true);
      setError(null);
    }
  }, [isOpen, debt]);
  
  // التحقق من صحة المبلغ المدخل
  const validateAmount = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return 'يجب إدخال قيمة موجبة';
    }
    
    if (numValue > debt.remainingAmount) {
      return 'المبلغ المدخل أكبر من المبلغ المتبقي';
    }
    
    return null;
  };
  
  // معالج تغيير قيمة المبلغ
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    setError(validateAmount(value));
    
    // تحديث حالة الدفع الكامل بناءً على المبلغ المدخل
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue === debt.remainingAmount) {
      setIsFullPayment(true);
    }
  };
  
  // معالج تغيير حالة الدفع الكامل
  const handleFullPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsFullPayment(checked);
    
    // تحديث المبلغ بناءً على حالة الدفع الكامل
    if (checked) {
      setAmount(debt.remainingAmount.toString());
      setError(null);
    }
  };
  
  // معالج تقديم النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const amountPaid = parseFloat(amount);
      onSubmit({
        orderId: debt.orderId,
        amountPaid,
        isFullPayment
      });
    } catch (err) {
      setError('حدث خطأ أثناء معالجة الطلب');
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={`w-full max-w-md rounded-lg shadow-lg ${theme === 'dark' ? 'bg-card' : 'bg-white'}`}>
        {/* رأس النافذة */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">تسجيل دفع</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* محتوى النافذة */}
        <div className="p-6">
          {/* معلومات الطلب */}
          <div className="mb-6 p-4 rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">رقم الطلب:</p>
                <p className="font-medium text-foreground">{debt.orderNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">تاريخ الطلب:</p>
                <p className="font-medium text-foreground">{debt.date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">المبلغ الكلي:</p>
                <p className="font-medium text-foreground">{debt.total.toFixed(2)} دج</p>
              </div>
              <div>
                <p className="text-muted-foreground">المبلغ المدفوع:</p>
                <p className="font-medium text-foreground">{debt.amountPaid.toFixed(2)} دج</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">المبلغ المتبقي:</p>
                <p className="font-medium text-xl text-red-600 dark:text-red-400">{debt.remainingAmount.toFixed(2)} دج</p>
              </div>
            </div>
          </div>
          
          {/* نموذج تسجيل الدفع */}
          <form onSubmit={handleSubmit}>
            {/* مبلغ الدفع */}
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">
                مبلغ الدفع
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                step="0.01"
                min="0.01"
                max={debt.remainingAmount}
                className="w-full p-2 border border-border rounded-md bg-background focus:ring-primary focus:border-primary"
                required
                disabled={isSubmitting}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
            
            {/* خيار الدفع الكامل */}
            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFullPayment}
                  onChange={handleFullPaymentChange}
                  className="rounded border-border text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <span className="mr-2 rtl:ml-2 rtl:mr-0 text-sm text-foreground">
                  تسديد كامل المبلغ المتبقي
                </span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                عند تفعيل هذا الخيار، سيتم تحديث حالة الطلب إلى "مدفوع بالكامل".
              </p>
            </div>
            
            {/* أزرار الإجراءات */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Boolean(error)}
                className="px-4 py-2 bg-primary hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-md"
              >
                {isSubmitting ? 'جاري التنفيذ...' : 'تسجيل الدفع'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DebtPaymentModal;
