/**
 * DebtPaymentModal - Simplified Apple-Inspired Design
 * ============================================================
 * Clean and minimal payment recording dialog
 * Matches the table and details design style
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wallet, Check } from 'lucide-react';
import { DebtOrder } from '@/lib/api/debts';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';

// ===============================================================================
// Types
// ===============================================================================

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtOrder;
  onSubmit: (data: { orderId: string; amountPaid: number; isFullPayment: boolean }) => void;
}

// ===============================================================================
// Info Row Component
// ===============================================================================

interface InfoRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: 'default' | 'red' | 'green';
}

const InfoRow = ({ label, value, highlight, valueColor = 'default' }: InfoRowProps) => (
  <div className={cn(
    "flex items-center justify-between py-2.5",
    "border-b border-zinc-100 dark:border-zinc-800 last:border-0"
  )}>
    <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
    <span className={cn(
      "text-sm font-numeric",
      highlight ? "text-lg font-bold" : "font-medium",
      valueColor === 'red' && "text-red-600 dark:text-red-400",
      valueColor === 'green' && "text-emerald-600 dark:text-emerald-400",
      valueColor === 'default' && "text-zinc-900 dark:text-zinc-100"
    )}>
      {value}
    </span>
  </div>
);

// ===============================================================================
// Main Component
// ===============================================================================

const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  onSubmit
}) => {
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
    } else {
      setIsFullPayment(false);
    }
  };

  // معالج تغيير حالة الدفع الكامل
  const handleFullPaymentToggle = () => {
    const newValue = !isFullPayment;
    setIsFullPayment(newValue);

    // تحديث المبلغ بناءً على حالة الدفع الكامل
    if (newValue) {
      setAmount(debt.remainingAmount.toString());
      setError(null);
    }
  };

  // معالج تقديم النموذج
  const handleSubmit = () => {
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

  if (!debt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                تسجيل دفع
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                طلب رقم {debt.orderNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-3">
          {/* Order Info */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              معلومات الطلب
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3">
              <InfoRow label="تاريخ الطلب" value={new Date(debt.date).toLocaleDateString('ar-DZ')} />
              <InfoRow label="المبلغ الكلي" value={formatPrice(debt.total)} />
              <InfoRow label="المدفوع سابقاً" value={formatPrice(debt.amountPaid)} valueColor="green" />
              <InfoRow label="المتبقي" value={formatPrice(debt.remainingAmount)} valueColor="red" highlight />
            </div>
          </div>

          {/* Payment Form */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              مبلغ الدفع
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-3">
              {/* Amount Input */}
              <div>
                <Input
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  step="0.01"
                  min="0.01"
                  max={debt.remainingAmount}
                  disabled={isSubmitting}
                  dir="ltr"
                  className={cn(
                    "h-12 text-lg font-bold text-center rounded-xl",
                    "border-zinc-200 dark:border-zinc-700",
                    "focus:border-orange-500 focus:ring-orange-500",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                  )}
                  placeholder="0.00"
                />
                {error && (
                  <p className="text-xs text-red-500 mt-1.5 text-center">{error}</p>
                )}
              </div>

              {/* Full Payment Toggle */}
              <button
                type="button"
                onClick={handleFullPaymentToggle}
                disabled={isSubmitting}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                  isFullPayment
                    ? "bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-500"
                    : "bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isFullPayment
                      ? "border-orange-500 bg-orange-500"
                      : "border-zinc-300 dark:border-zinc-600"
                  )}>
                    {isFullPayment && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    isFullPayment
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-zinc-600 dark:text-zinc-400"
                  )}>
                    تسديد كامل المبلغ المتبقي
                  </span>
                </div>
                <span className="text-sm font-bold font-numeric text-zinc-900 dark:text-zinc-100">
                  {formatPrice(debt.remainingAmount)}
                </span>
              </button>

              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
                عند تسديد كامل المبلغ، سيتم تحديث حالة الطلب إلى "مدفوع بالكامل"
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Boolean(error)}
            className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري التسجيل...
              </>
            ) : (
              'تسجيل الدفع'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebtPaymentModal;
