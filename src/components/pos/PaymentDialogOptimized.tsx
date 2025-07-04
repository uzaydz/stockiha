import { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@/types';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Receipt, AlertCircle, CreditCard, Banknote, UserPlus, Wallet, Receipt as ReceiptIcon, RotateCcw,
  Zap, Clock
} from 'lucide-react';

interface PaymentDialogOptimizedProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isProcessing: boolean;
  customers: User[];
  selectedCustomer: User | null;
  setSelectedCustomer: (customer: User | null) => void;
  searchCustomer: string;
  setSearchCustomer: (search: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  discount: number;
  handleDiscountChange: (value: string) => void;
  amountPaid: string;
  setAmountPaid: (amount: string) => void;
  isPartialPayment: boolean;
  remainingAmount: number;
  change: number;
  considerRemainingAsPartial: boolean;
  setConsiderRemainingAsPartial: (consider: boolean) => void;
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
  handlePaymentComplete: () => void;
  openNewCustomerDialog: () => void;
  hasSubscriptionServices: boolean;
  subscriptionAccountInfo: {
    username: string;
    email: string;
    password: string;
    notes: string;
  };
  setSubscriptionAccountInfo: (info: {
    username: string;
    email: string;
    password: string;
    notes: string;
  }) => void;
  isReturnMode?: boolean;
}

export default function PaymentDialogOptimized({
  isOpen,
  onOpenChange,
  isProcessing,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  searchCustomer,
  setSearchCustomer,
  paymentMethod,
  setPaymentMethod,
  notes,
  setNotes,
  discount,
  handleDiscountChange,
  amountPaid,
  setAmountPaid,
  isPartialPayment,
  remainingAmount,
  change,
  considerRemainingAsPartial,
  setConsiderRemainingAsPartial,
  subtotal,
  discountAmount,
  tax,
  total,
  handlePaymentComplete,
  openNewCustomerDialog,
  hasSubscriptionServices,
  subscriptionAccountInfo,
  setSubscriptionAccountInfo,
  isReturnMode = false
}: PaymentDialogOptimizedProps) {
  
  // حالة محسنة لتركيز المبلغ
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [quickCalcValue, setQuickCalcValue] = useState('');
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  
  // تتبع وقت المعالجة
  useEffect(() => {
    if (isProcessing) {
      setProcessingStartTime(Date.now());
    } else {
      setProcessingStartTime(null);
    }
  }, [isProcessing]);

  // طرق الدفع مع تحسين الذاكرة
  const paymentMethods = useMemo(() => [
    { id: 'cash', name: 'نقدي', icon: <Banknote className="h-4 w-4" />, shortcut: 'F1' },
    { id: 'card', name: 'بطاقة', icon: <CreditCard className="h-4 w-4" />, shortcut: 'F2' },
    { id: 'wallet', name: 'محفظة', icon: <Wallet className="h-4 w-4" />, shortcut: 'F3' }
  ], []);

  // اختصارات المبلغ مع تحسين الحساب
  const quickAmounts = useMemo(() => [
    { label: "المبلغ بالضبط", value: total },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
    { label: "200", value: 200 },
    { label: "500", value: 500 }
  ], [total]);

  // تصفية العملاء بشكل محسن
  const filteredCustomers = useMemo(() => {
    console.log('🔍 [PaymentDialog] تشخيص العملاء:', {
      customersLength: customers.length,
      customers: customers,
      searchCustomer: searchCustomer,
      searchTerm: searchCustomer.trim()
    });
    
    if (!searchCustomer.trim()) {
      const result = customers.slice(0, 8); // عرض أول 8 فقط للأداء
      console.log('🔍 [PaymentDialog] بدون بحث - النتيجة:', result);
      return result;
    }
    
    const searchTerm = searchCustomer.toLowerCase().trim();
    const filtered = customers.filter(customer => 
      customer.name?.toLowerCase().includes(searchTerm) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // حد أقصى 8 نتائج للأداء
    
    console.log('🔍 [PaymentDialog] مع البحث - النتيجة:', filtered);
    return filtered;
  }, [customers, searchCustomer]);

  // حساب سريع محسن
  const handleQuickCalc = useCallback(() => {
    try {
      const currentAmount = parseFloat(amountPaid) || 0;
      const calcValue = parseFloat(quickCalcValue);
      
      if (!isNaN(calcValue)) {
        setAmountPaid((currentAmount + calcValue).toString());
        setQuickCalcValue('');
      }
    } catch (error) {
      // تجاهل الأخطاء
    }
  }, [amountPaid, quickCalcValue, setAmountPaid]);

  // تحسين معالجة تغيير العميل
  const handleCustomerChange = useCallback((value: string) => {
    if (value === 'guest') {
      setSelectedCustomer(null);
    } else if (value === 'new') {
      openNewCustomerDialog();
    } else {
      const customer = customers.find(c => c.id === value);
      setSelectedCustomer(customer || null);
    }
  }, [customers, setSelectedCustomer, openNewCustomerDialog]);

  // تحسين التحقق من صحة النموذج
  const isFormValid = useMemo(() => {
    return !(isPartialPayment && considerRemainingAsPartial && !selectedCustomer && !isReturnMode);
  }, [isPartialPayment, considerRemainingAsPartial, selectedCustomer, isReturnMode]);

  // تحسين معالجة اختصارات لوحة المفاتيح
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // منع التنفيذ إذا كان المعالج يعمل
      if (isProcessing) return;

      // Enter للإتمام السريع
      if (e.key === 'Enter' && isFormValid) {
        e.preventDefault();
        handlePaymentComplete();
      }
      // Escape للإغلاق
      else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
      // F1-F3 لطرق الدفع السريعة
      else if (e.key === 'F1') {
        e.preventDefault();
        setPaymentMethod('cash');
      }
      else if (e.key === 'F2') {
        e.preventDefault();
        setPaymentMethod('card');
      }
      else if (e.key === 'F3') {
        e.preventDefault();
        setPaymentMethod('wallet');
      }
      // أرقام سريعة للمبلغ
      else if (e.key >= '1' && e.key <= '5' && e.ctrlKey) {
        e.preventDefault();
        const amounts = [total, 50, 100, 200, 500];
        setAmountPaid(amounts[parseInt(e.key) - 1].toString());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, isFormValid, handlePaymentComplete, onOpenChange, setPaymentMethod, total, setAmountPaid]);

  // وقت المعالجة
  const processingTime = useMemo(() => {
    if (!processingStartTime) return '';
    const elapsed = (Date.now() - processingStartTime) / 1000;
    return `${elapsed.toFixed(1)}s`;
  }, [processingStartTime]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
      <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReturnMode ? (
              <>
                <RotateCcw className="h-5 w-5 text-orange-500" />
                <span>إتمام الإرجاع</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-primary" />
                <span>إتمام سريع</span>
                <span className="text-xs text-muted-foreground">(Enter: إتمام، F1-F3: طرق دفع)</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 animate-pulse text-amber-500" />
                <span>جاري المعالجة المحسنة... {processingTime}</span>
              </>
            ) : (
              <>
                <span>{isReturnMode ? "إرجاع سريع" : "دفع محسن بالذكاء الاصطناعي"}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 pt-2">
          {/* اختيار العميل المحسن */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">العميل</Label>
            <Select
              value={selectedCustomer?.id || 'guest'}
              onValueChange={handleCustomerChange}
              disabled={isProcessing}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guest">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    زائر
                  </div>
                </SelectItem>
                <SelectItem value="new" className="text-primary">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    إضافة عميل جديد
                  </div>
                </SelectItem>
                
                <Separator className="my-1" />
                
                <div className="p-2">
                  <Input
                    placeholder="بحث سريع..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    className="text-sm h-8"
                  />
                </div>
                
                <div className="max-h-28 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{customer.name}</span>
                          {customer.phone && (
                            <span className="text-xs text-muted-foreground">
                              {customer.phone}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-2 text-center text-sm text-muted-foreground">
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              </SelectContent>
            </Select>
          </div>
          
          {/* طرق الدفع المحسنة */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">طريقة الدفع</Label>
            <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
              <TabsList className="grid grid-cols-3 w-full h-9">
                {paymentMethods.map(method => (
                  <TabsTrigger 
                    key={method.id} 
                    value={method.id}
                    className="flex items-center gap-1 text-xs"
                    disabled={isProcessing}
                  >
                    {method.icon}
                    <span className="hidden sm:inline">{method.name}</span>
                    <span className="text-[10px] opacity-60">({method.shortcut})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {/* النقدي مع اختصارات محسنة */}
              <TabsContent value="cash" className="pt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">
                      {isReturnMode ? 'المبلغ المُسترد' : 'المبلغ المدفوع'}
                    </Label>
                    <Input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      onFocus={() => setIsAmountFocused(true)}
                      onBlur={() => setIsAmountFocused(false)}
                      className={cn(
                        "text-left font-medium text-sm h-8",
                        isAmountFocused && "border-primary ring-1 ring-primary"
                      )}
                      dir="ltr"
                      autoFocus
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      {isReturnMode ? 'الفرق' : 'الباقي'}
                    </Label>
                    <div className={cn(
                      "h-8 px-2 rounded-md border bg-muted/50 flex items-center text-sm font-medium",
                      isPartialPayment ? "text-amber-600" : "text-green-600"
                    )}>
                      {isPartialPayment ? `${formatPrice(remainingAmount)}` : formatPrice(change)}
                    </div>
                  </div>
                </div>
                
                {/* اختصارات سريعة */}
                <div className="grid grid-cols-5 gap-1">
                  {quickAmounts.map((amount, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAmountPaid(amount.value.toString())}
                      className="text-xs h-7 px-1"
                      disabled={isProcessing}
                    >
                      {amount.label === "المبلغ بالضبط" ? "=" : amount.label}
                    </Button>
                  ))}
                </div>
                
                {/* حاسبة سريعة */}
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="إضافة"
                    value={quickCalcValue}
                    onChange={(e) => setQuickCalcValue(e.target.value)}
                    className="text-left text-sm h-7"
                    dir="ltr"
                    disabled={isProcessing}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleQuickCalc}
                    disabled={!quickCalcValue || isProcessing}
                    size="sm"
                    className="h-7 px-2"
                  >
                    +
                  </Button>
                </div>
                
                {/* رسائل الدفع الجزئي */}
                {isPartialPayment && !isReturnMode && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-sm border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800 dark:text-amber-200">دفع جزئي ({formatPrice(remainingAmount)})</span>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="flex items-center text-xs cursor-pointer">
                        <input
                          type="radio"
                          checked={!considerRemainingAsPartial}
                          onChange={() => setConsiderRemainingAsPartial(false)}
                          className="ml-1"
                          disabled={isProcessing}
                        />
                        تخفيض (لا يحتاج عميل)
                      </label>
                      
                      <label className="flex items-center text-xs cursor-pointer">
                        <input
                          type="radio"
                          checked={considerRemainingAsPartial}
                          onChange={() => setConsiderRemainingAsPartial(true)}
                          className="ml-1"
                          disabled={isProcessing}
                        />
                        دفعة جزئية (يحتاج عميل)
                      </label>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* بطاقة ومحفظة إلكترونية */}
              <TabsContent value="card" className="pt-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300">دفع بالبطاقة</p>
                    <p className="text-blue-600 dark:text-blue-400">المبلغ: {formatPrice(total)}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="wallet" className="pt-2">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="font-medium text-purple-700 dark:text-purple-300">محفظة إلكترونية</p>
                    <p className="text-purple-600 dark:text-purple-400">المبلغ: {formatPrice(total)}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* معلومات الاشتراك المحسنة */}
          {hasSubscriptionServices && (
            <div className="bg-blue-50/80 dark:bg-blue-950/30 p-3 rounded-lg border space-y-2">
              <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                🔐 معلومات الاشتراك
              </Label>
              
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="اسم المستخدم"
                  value={subscriptionAccountInfo.username}
                  onChange={(e) => setSubscriptionAccountInfo({
                    ...subscriptionAccountInfo,
                    username: e.target.value
                  })}
                  className="text-sm h-8"
                  disabled={isProcessing}
                />
                <Input
                  type="password"
                  placeholder="كلمة المرور"
                  value={subscriptionAccountInfo.password}
                  onChange={(e) => setSubscriptionAccountInfo({
                    ...subscriptionAccountInfo,
                    password: e.target.value
                  })}
                  className="text-sm h-8"
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}
          
          {/* خصم وملاحظات */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">خصم (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                className="text-left text-sm h-8"
                dir="ltr"
                disabled={isProcessing}
              />
            </div>
            <div>
              <Label className="text-xs">ملاحظات</Label>
              <Input 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات سريعة"
                className="text-sm h-8"
                disabled={isProcessing}
              />
            </div>
          </div>
          
          {/* ملخص مالي محسن */}
          <div className="bg-muted/30 dark:bg-muted/20 p-3 rounded-md space-y-1 border">
            <div className="flex justify-between text-sm">
              <span>المجموع:</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>الخصم:</span>
                <span>- {formatPrice(discountAmount)}</span>
              </div>
            )}
            
            <Separator className="my-1" />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>الإجمالي:</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2 mt-3">
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            size="sm"
          >
            إلغاء (Esc)
          </Button>
          <Button 
            onClick={handlePaymentComplete}
            disabled={isProcessing || !isFormValid}
            className={cn(
              "min-w-32 relative",
              isReturnMode 
                ? "bg-orange-500 hover:bg-orange-600" 
                : "bg-primary hover:bg-primary/90"
            )}
            size="sm"
          >
            {isProcessing ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>معالجة محسنة... {processingTime}</span>
                </div>
              </>
            ) : (
              <>
                {isReturnMode ? (
                  <RotateCcw className="h-4 w-4 ml-2" />
                ) : (
                  <Zap className="h-4 w-4 ml-2" />
                )}
                {isReturnMode ? 'إتمام الإرجاع' : 'إتمام سريع (Enter)'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
