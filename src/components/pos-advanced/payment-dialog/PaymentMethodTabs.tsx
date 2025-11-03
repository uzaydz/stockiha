import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { AlertCircle, CreditCard } from 'lucide-react';

interface PaymentMethodTabsProps {
  paymentMethod: 'cash' | 'card' | 'mixed';
  onPaymentMethodChange: (method: 'cash' | 'card' | 'mixed') => void;
  amountPaid: string;
  onAmountPaidChange: (amount: string) => void;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
  change: number;
  isPartialPayment: boolean;
  considerRemainingAsPartial: boolean;
  onConsiderRemainingChange: (value: boolean) => void;
  formatPrice: (price: number) => string;
}

export const PaymentMethodTabs: React.FC<PaymentMethodTabsProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
  finalTotal,
  paidAmount,
  remainingAmount,
  change,
  isPartialPayment,
  considerRemainingAsPartial,
  onConsiderRemainingChange,
  formatPrice
}) => {
  return (
    <div className="space-y-3">
      <h3 className="font-medium flex items-center gap-2 text-sm">
        <CreditCard className="h-4 w-4" />
        تفاصيل الدفع
      </h3>
      
      <Tabs value={paymentMethod} onValueChange={(value: any) => onPaymentMethodChange(value)}>
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="cash" className="text-sm">نقدي</TabsTrigger>
          <TabsTrigger value="card" className="text-sm">بطاقة</TabsTrigger>
          <TabsTrigger value="mixed" className="text-sm">مختلط</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cash" className="space-y-3 mt-3">
          <div className="space-y-2">
            <Label className="text-sm">المبلغ المدفوع (دج)</Label>
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => onAmountPaidChange(e.target.value)}
              placeholder={finalTotal.toString()}
              min="0"
              step="0.01"
              className="h-9"
            />
          </div>
          
          {/* عرض الفكة أو المتبقي */}
          {(paidAmount > 0 || isPartialPayment) && (
            <div className={cn(
              "p-3 rounded-lg border text-sm",
              isPartialPayment 
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" 
                : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
            )}>
              <div className="flex justify-between">
                <span>المبلغ المدفوع:</span>
                <span>{formatPrice(paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>الإجمالي المطلوب:</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
              <Separator className="my-2" />
              {isPartialPayment ? (
                <div className="flex justify-between font-medium text-amber-600 dark:text-amber-400">
                  <span>{paidAmount === 0 ? 'المبلغ الكامل:' : 'المبلغ المتبقي:'}</span>
                  <span>{formatPrice(remainingAmount)}</span>
                </div>
              ) : (
                <div className="flex justify-between font-medium text-blue-600 dark:text-blue-400">
                  <span>الفكة:</span>
                  <span>{formatPrice(change)}</span>
                </div>
              )}
            </div>
          )}
          
          {/* خيارات الدفع الجزئي */}
          {isPartialPayment && (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                  {paidAmount === 0 ? 'عدم دفع أي مبلغ' : 'دفع جزئي'}
                </span>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={!considerRemainingAsPartial}
                    onChange={() => onConsiderRemainingChange(false)}
                    className="ml-2"
                  />
                  تخفيض إضافي (لا يحتاج متابعة)
                </label>
                
                <label className="flex items-center text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={considerRemainingAsPartial}
                    onChange={() => onConsiderRemainingChange(true)}
                    className="ml-2"
                  />
                  دفعة جزئية (يحتاج عميل لمتابعة التحصيل)
                </label>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="card" className="space-y-3 mt-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">الدفع بالبطاقة</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              سيتم اعتبار المبلغ مدفوعاً بالكامل ({formatPrice(finalTotal)})
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="mixed" className="space-y-3 mt-3">
          <div className="space-y-2">
            <Label className="text-sm">المبلغ النقدي (دج)</Label>
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => onAmountPaidChange(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="h-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            الباقي سيتم دفعه بالبطاقة: {formatPrice(Math.max(0, finalTotal - paidAmount))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
