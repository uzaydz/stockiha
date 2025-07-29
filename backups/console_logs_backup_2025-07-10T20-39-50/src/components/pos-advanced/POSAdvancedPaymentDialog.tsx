import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { User as AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertCircle,
  CreditCard,
  DollarSign,
  Percent,
  Calculator,
  Receipt,
  X
} from 'lucide-react';

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
  isProcessing = false
}) => {
  // حالة التخفيض
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(currentDiscountType);
  const [discount, setDiscount] = useState(currentDiscount);
  
  // حالة الدفع
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerId, setCustomerId] = useState(selectedCustomerId || 'anonymous');
  const [notes, setNotes] = useState('');
  
  // حالة الدفع الجزئي
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [considerRemainingAsPartial, setConsiderRemainingAsPartial] = useState(true);
  
  // حساب الإجمالي بعد التخفيض
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discount) / 100 
    : discount;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  
  // حساب الباقي والفكة
  const paidAmount = parseFloat(amountPaid) || 0;
  const remainingAmount = Math.max(0, finalTotal - paidAmount);
  const change = Math.max(0, paidAmount - finalTotal);
  
  // تحديث حالة الدفع الجزئي
  useEffect(() => {
    setIsPartialPayment(paidAmount > 0 && paidAmount < finalTotal);
  }, [paidAmount, finalTotal]);
  
  // تحديث المبلغ المدفوع عند تغيير طريقة الدفع
  useEffect(() => {
    if (paymentMethod === 'card') {
      setAmountPaid(finalTotal.toString());
    } else if (paymentMethod === 'cash' && !amountPaid) {
      setAmountPaid(finalTotal.toString());
    }
  }, [paymentMethod, finalTotal]);
  
  // إعادة تعيين القيم عند فتح الـ dialog
  useEffect(() => {
    if (isOpen) {
      setDiscount(currentDiscount);
      setDiscountType(currentDiscountType);
      setAmountPaid(finalTotal.toString());
      setCustomerId(selectedCustomerId || 'anonymous');
      setNotes('');
      setPaymentMethod('cash');
    }
  }, [isOpen, currentDiscount, currentDiscountType, finalTotal, selectedCustomerId]);
  
  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (discountType === 'percentage') {
      setDiscount(Math.min(100, Math.max(0, numValue)));
    } else {
      setDiscount(Math.max(0, numValue));
    }
  };
  
  const handlePaymentComplete = () => {
    if (isPartialPayment && considerRemainingAsPartial && customerId === 'anonymous') {
      alert('يجب اختيار عميل للدفع الجزئي');
      return;
    }
    
    onPaymentComplete({
      customerId: customerId === 'anonymous' ? undefined : customerId,
      notes,
      discount,
      discountType,
      amountPaid: paidAmount,
      paymentMethod,
      isPartialPayment,
      considerRemainingAsPartial
    });
  };
  
  const formatPrice = (price: number) => price.toLocaleString() + ' دج';
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            إتمام الطلب - دفع متقدم
          </DialogTitle>
          <DialogDescription>
            قم بتحديد التخفيضات وطريقة الدفع لإتمام الطلب
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* قسم التخفيض */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              التخفيضات
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع التخفيض</Label>
                <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (دج)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>
                  قيمة التخفيض {discountType === 'percentage' ? '(%)' : '(دج)'}
                </Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={discountType === 'percentage' ? "100" : undefined}
                  step={discountType === 'percentage' ? "1" : "0.01"}
                />
              </div>
            </div>
            
            {/* ملخص التخفيض */}
            {discount > 0 && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="flex justify-between text-sm">
                  <span>المجموع الفرعي:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>التخفيض:</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>الإجمالي بعد التخفيض:</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* قسم الدفع */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              تفاصيل الدفع
            </h3>
            
            <Tabs value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cash">نقدي</TabsTrigger>
                <TabsTrigger value="card">بطاقة</TabsTrigger>
                <TabsTrigger value="mixed">مختلط</TabsTrigger>
              </TabsList>
              
              <TabsContent value="cash" className="space-y-4">
                <div className="space-y-2">
                  <Label>المبلغ المدفوع (دج)</Label>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={finalTotal.toString()}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                {/* عرض الفكة أو المتبقي */}
                {paidAmount > 0 && (
                  <div className={cn(
                    "p-3 rounded-lg border",
                    isPartialPayment ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
                  )}>
                    <div className="flex justify-between text-sm">
                      <span>المبلغ المدفوع:</span>
                      <span>{formatPrice(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الإجمالي المطلوب:</span>
                      <span>{formatPrice(finalTotal)}</span>
                    </div>
                    <Separator className="my-2" />
                    {isPartialPayment ? (
                      <div className="flex justify-between font-medium text-amber-600">
                        <span>المبلغ المتبقي:</span>
                        <span>{formatPrice(remainingAmount)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between font-medium text-blue-600">
                        <span>الفكة:</span>
                        <span>{formatPrice(change)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* خيارات الدفع الجزئي */}
                {isPartialPayment && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">دفع جزئي</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={!considerRemainingAsPartial}
                          onChange={() => setConsiderRemainingAsPartial(false)}
                          className="ml-2"
                        />
                        تخفيض إضافي (لا يحتاج متابعة)
                      </label>
                      
                      <label className="flex items-center text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={considerRemainingAsPartial}
                          onChange={() => setConsiderRemainingAsPartial(true)}
                          className="ml-2"
                        />
                        دفعة جزئية (يحتاج عميل لمتابعة التحصيل)
                      </label>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="card" className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">الدفع بالبطاقة</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    سيتم اعتبار المبلغ مدفوعاً بالكامل ({formatPrice(finalTotal)})
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="mixed" className="space-y-4">
                <div className="space-y-2">
                  <Label>المبلغ النقدي (دج)</Label>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  الباقي سيتم دفعه بالبطاقة: {formatPrice(Math.max(0, finalTotal - paidAmount))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <Separator />
          
          {/* اختيار العميل */}
          <div className="space-y-2">
            <Label>العميل {isPartialPayment && considerRemainingAsPartial && <span className="text-red-500">*</span>}</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر العميل (اختياري)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anonymous">عميل مجهول</SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone && `(${customer.phone})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* ملاحظات */}
          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف أي ملاحظات حول الطلب..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-2" />
            إلغاء
          </Button>
          <Button
            onClick={handlePaymentComplete}
            disabled={isProcessing || (isPartialPayment && considerRemainingAsPartial && customerId === 'anonymous')}
            className="min-w-[120px]"
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
