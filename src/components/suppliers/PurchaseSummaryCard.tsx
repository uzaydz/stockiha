/**
 * مكون ملخص المشتريات المالي
 * يعرض المجموع والضرائب والمدفوع والمتبقي بتصميم حديث
 */

import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Calculator,
  Wallet,
  CreditCard,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Percent,
} from 'lucide-react';

interface PurchaseSummaryCardProps {
  form: UseFormReturn<any>;
  totalAmount: number;
}

export function PurchaseSummaryCard({ form, totalAmount }: PurchaseSummaryCardProps) {
  const paidAmount = form.watch('paid_amount') || 0;
  const items = form.watch('items') || [];

  // حسابات مفصلة
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const taxRate = Number(item.tax_rate) || 0;

      const itemSubtotal = quantity * unitPrice;
      const itemTax = itemSubtotal * (taxRate / 100);

      subtotal += itemSubtotal;
      totalTax += itemTax;
    });

    const total = subtotal + totalTax;
    const remaining = total - paidAmount;
    const paidPercentage = total > 0 ? (paidAmount / total) * 100 : 0;

    return {
      subtotal,
      totalTax,
      total,
      remaining,
      paidPercentage,
      isPaidFully: remaining <= 0,
      isPartiallyPaid: paidAmount > 0 && remaining > 0,
    };
  }, [items, paidAmount]);

  // أزرار الدفع السريع
  const quickPayOptions = [
    { label: 'كامل', value: calculations.total, icon: CheckCircle2 },
    { label: '75%', value: calculations.total * 0.75, icon: Percent },
    { label: '50%', value: calculations.total * 0.5, icon: Percent },
    { label: '25%', value: calculations.total * 0.25, icon: Percent },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* العنوان */}
      <div className="px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              ملخص الفاتورة
            </h3>
            <p className="text-xs text-slate-500">
              {items.length} عنصر في الفاتورة
            </p>
          </div>
        </div>
      </div>

      {/* تفاصيل المبالغ */}
      <div className="p-5 space-y-4">
        {/* المجموع الفرعي */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Banknote className="h-4 w-4" />
            <span>المجموع الفرعي</span>
          </div>
          <span className="font-medium text-slate-900 dark:text-white">
            {calculations.subtotal.toFixed(2)} دج
          </span>
        </div>

        {/* الضريبة */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Percent className="h-4 w-4" />
            <span>إجمالي الضرائب</span>
          </div>
          <span className="font-medium text-orange-600 dark:text-orange-400">
            +{calculations.totalTax.toFixed(2)} دج
          </span>
        </div>

        {/* خط فاصل */}
        <div className="border-t border-dashed border-slate-300 dark:border-slate-600" />

        {/* الإجمالي */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Wallet className="h-5 w-5" />
            <span className="font-semibold">الإجمالي</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            {calculations.total.toFixed(2)} دج
          </span>
        </div>

        {/* شريط التقدم */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">نسبة المدفوع</span>
            <span
              className={cn(
                'font-medium',
                calculations.isPaidFully
                  ? 'text-emerald-600'
                  : calculations.isPartiallyPaid
                  ? 'text-amber-600'
                  : 'text-slate-500'
              )}
            >
              {calculations.paidPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={Math.min(calculations.paidPercentage, 100)}
            className="h-2"
          />
        </div>

        {/* خط فاصل */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          {/* المبلغ المدفوع */}
          <FormField
            control={form.control}
            name="paid_amount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">المدفوع</span>
                  </div>
                  <FormControl>
                    <div className="relative w-36">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-9 text-left pl-8 font-medium"
                        onChange={e =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        value={field.value || ''}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        دج
                      </span>
                    </div>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* أزرار الدفع السريع */}
          {calculations.total > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {quickPayOptions.map(option => (
                <TooltipProvider key={option.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-7 px-2.5 text-xs',
                          Math.abs(paidAmount - option.value) < 0.01 &&
                            'bg-primary/10 border-primary text-primary'
                        )}
                        onClick={() => form.setValue('paid_amount', option.value)}
                      >
                        {option.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{option.value.toFixed(2)} دج</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </div>

        {/* المتبقي */}
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-lg',
            calculations.isPaidFully
              ? 'bg-emerald-50 dark:bg-emerald-900/20'
              : 'bg-red-50 dark:bg-red-900/20'
          )}
        >
          <div className="flex items-center gap-2">
            {calculations.isPaidFully ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span
              className={cn(
                'font-medium',
                calculations.isPaidFully
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              )}
            >
              {calculations.isPaidFully ? 'مدفوعة بالكامل' : 'المبلغ المتبقي'}
            </span>
          </div>
          <span
            className={cn(
              'text-lg font-bold',
              calculations.isPaidFully
                ? 'text-emerald-600'
                : 'text-red-600'
            )}
          >
            {Math.abs(calculations.remaining).toFixed(2)} دج
          </span>
        </div>

        {/* تحذير المدفوع أكثر من الإجمالي */}
        {calculations.remaining < 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700 dark:text-amber-400">
              المبلغ المدفوع يتجاوز إجمالي الفاتورة!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
