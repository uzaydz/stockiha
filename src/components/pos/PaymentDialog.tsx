import { useState, useEffect } from 'react';
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
  Receipt, AlertCircle, CreditCard, Banknote, UserPlus, Wallet, Receipt as ReceiptIcon, RotateCcw 
} from 'lucide-react';

interface PaymentDialogProps {
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
  filteredCustomers: () => User[];
  // معلومات حساب الاشتراك
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
  // إضافة خاصية وضع الإرجاع
  isReturnMode?: boolean;
}

export default function PaymentDialog({
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
  filteredCustomers,
  hasSubscriptionServices,
  subscriptionAccountInfo,
  setSubscriptionAccountInfo,
  isReturnMode = false
}: PaymentDialogProps) {
  // حالة تركيز حقل المبلغ المدفوع
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  
  // الطرق المتاحة للدفع
  const paymentMethods = [
    { id: 'cash', name: 'نقدي', icon: <Banknote className="h-4 w-4" /> },
    { id: 'card', name: 'بطاقة', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'wallet', name: 'محفظة إلكترونية', icon: <Wallet className="h-4 w-4" /> }
  ];

  // أزرار اختصارات المبلغ المدفوع عند الدفع النقدي
  const quickAmounts = [
    { label: "المبلغ بالضبط", value: total },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
    { label: "200", value: 200 },
    { label: "500", value: 500 }
  ];
  
  // حالة حاسبة المبلغ السريع
  const [quickCalcValue, setQuickCalcValue] = useState('');
  
  // حساب المبلغ النهائي عند استخدام الحاسبة السريعة
  const handleQuickCalc = () => {
    try {
      // عملية حسابية بسيطة: إذا كان المبلغ المدفوع + رقم
      const currentAmount = parseFloat(amountPaid) || 0;
      const calcValue = parseFloat(quickCalcValue);
      
      if (!isNaN(calcValue)) {
        setAmountPaid((currentAmount + calcValue).toString());
        setQuickCalcValue('');
      }
    } catch (error) {
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
      <DialogContent className="max-w-md overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReturnMode ? (
              <>
                <RotateCcw className="h-5 w-5 text-orange-500" />
                <span>إتمام الإرجاع</span>
              </>
            ) : (
              <>
                <ReceiptIcon className="h-5 w-5 text-primary" />
                <span>إتمام الطلب</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isReturnMode 
              ? "تحديد المبلغ المُسترد وإتمام عملية الإرجاع"
              : "تحديد طريقة الدفع وإتمام الطلب"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 pt-2">
          {/* اختيار العميل */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              العميل
              {isReturnMode && (
                <span className="text-xs text-orange-600 dark:text-orange-400 font-normal mr-2">
                  (اختياري في وضع الإرجاع)
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedCustomer?.id || 'guest'}
                onValueChange={(value) => {
                  if (value === 'guest') {
                    setSelectedCustomer(null);
                  } else if (value === 'new') {
                    openNewCustomerDialog();
                  } else {
                    const customer = customers.find(c => c.id === value);
                    setSelectedCustomer(customer || null);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest">زائر</SelectItem>
                  <SelectItem value="new" className="text-primary flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    إضافة عميل جديد
                  </SelectItem>
                  
                  <Separator className="my-1" />
                  
                  <div className="relative">
                    <Input
                      placeholder="بحث عن عميل..."
                      className="mb-2"
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                    />
                    <div className="max-h-40 overflow-y-auto">
                      {filteredCustomers().length > 0 ? (
                        filteredCustomers().map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                            {customer.phone && (
                              <span className="text-xs text-muted-foreground mr-1">
                                 ({customer.phone})
                              </span>
                            )}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                          لا توجد نتائج للبحث
                        </div>
                      )}
                    </div>
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* اختيار طريقة الدفع */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">طريقة الدفع</Label>
            <Tabs 
              defaultValue="cash" 
              value={paymentMethod} 
              onValueChange={setPaymentMethod} 
              className="mt-1"
            >
              <TabsList className="grid grid-cols-3 w-full">
                {paymentMethods.map(method => (
                  <TabsTrigger 
                    key={method.id} 
                    value={method.id}
                    className="flex items-center gap-2"
                  >
                    {method.icon}
                    {method.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {/* محتوى طريقة الدفع النقدي */}
              <TabsContent value="cash" className="pt-3 space-y-4">
                <div className="space-y-2">
                  {/* المبلغ المدفوع */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>
                        {isReturnMode ? 'المبلغ المُسترد للعميل' : 'المبلغ المدفوع'}
                      </Label>
                      <Input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        onFocus={() => setIsAmountFocused(true)}
                        onBlur={() => setIsAmountFocused(false)}
                        className={cn(
                          "text-left font-medium",
                          isAmountFocused && "border-primary ring-1 ring-primary"
                        )}
                        dir="ltr"
                        placeholder={isReturnMode ? "المبلغ الذي دفعه العميل فعلياً" : ""}
                      />
                    </div>
                    <div>
                      <Label>
                        {isReturnMode ? 'الفرق' : 'الباقي'}
                      </Label>
                      <Input
                        value={isPartialPayment ? `${formatPrice(remainingAmount)} (متبقي)` : formatPrice(change)}
                        readOnly
                        className={cn(
                          "bg-muted/50 font-medium",
                          isPartialPayment ? "text-amber-600" : "text-green-600"
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* أزرار اختصارات المبلغ */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {quickAmounts.map((amount, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAmountPaid(amount.value.toString())}
                        className="flex-grow basis-[calc(33.333%-0.5rem)]"
                      >
                        {amount.label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* حاسبة سريعة */}
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      type="number"
                      placeholder="إضافة مبلغ"
                      value={quickCalcValue}
                      onChange={(e) => setQuickCalcValue(e.target.value)}
                      className="text-left"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleQuickCalc}
                      disabled={!quickCalcValue}
                      className="shrink-0"
                    >
                      إضافة
                    </Button>
                  </div>
                  
                  {/* رسالة خاصة بوضع الإرجاع */}
                  {isReturnMode && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200 text-sm mt-3">
                      <div className="flex items-start gap-2">
                        <RotateCcw className="h-5 w-5 flex-shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
                        <div>
                          <p className="font-medium">إرجاع مباشر من نقطة البيع</p>
                          <p className="mt-1">
                            إجمالي المنتجات: {formatPrice(total)} - أدخل المبلغ الذي دفعه العميل فعلياً
                          </p>
                          <p className="mt-1 text-xs opacity-80">
                            💡 إذا كان العميل دفع مبلغاً أقل، سيتم اعتبار الفرق تخفيضاً كان حصل عليه
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* رسالة الدفع الجزئي */}
                  {isPartialPayment && !isReturnMode && (
                    <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-800 text-sm mt-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">المبلغ المدفوع أقل من إجمالي الطلب</p>
                          <p className="mt-1">
                            الفرق: {formatPrice(remainingAmount)} - اختر كيفية التعامل معه:
                          </p>
                          
                          {/* خيارات التعامل مع المبلغ المتبقي */}
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                id="treatAsDiscount"
                                name="remainingTreatment"
                                checked={!considerRemainingAsPartial}
                                onChange={() => setConsiderRemainingAsPartial(false)}
                                className="ml-2"
                              />
                              <label htmlFor="treatAsDiscount" className="text-sm cursor-pointer">
                                <strong>تخفيض على العميل</strong> - (لا يحتاج اسم عميل)
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                type="radio"
                                id="treatAsPartial"
                                name="remainingTreatment"
                                checked={considerRemainingAsPartial}
                                onChange={() => setConsiderRemainingAsPartial(true)}
                                className="ml-2"
                              />
                              <label htmlFor="treatAsPartial" className="text-sm cursor-pointer">
                                <strong>دفعة جزئية</strong> - (يحتاج اسم عميل لتحصيل الباقي لاحقاً)
                              </label>
                            </div>
                          </div>
                          
                          {considerRemainingAsPartial && (
                            <p className="mt-2 text-xs bg-amber-100 p-2 rounded">
                              ⚠️ يجب اختيار عميل لتسجيل المبلغ المتبقي
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* محتوى طريقة الدفع ببطاقة */}
              <TabsContent value="card" className="pt-3">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">الدفع بالبطاقة</p>
                    <p>سيتم اعتبار المبلغ مدفوعاً بالكامل ({formatPrice(total)}).</p>
                  </div>
                </div>
              </TabsContent>
              
              {/* محتوى طريقة الدفع بالمحفظة الإلكترونية */}
              <TabsContent value="wallet" className="pt-3">
                <div className="bg-purple-50 p-3 rounded-md border border-purple-100 flex items-start gap-2">
                  <Wallet className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div className="text-sm text-purple-700">
                    <p className="font-medium">الدفع بالمحفظة الإلكترونية</p>
                    <p>سيتم اعتبار المبلغ مدفوعاً بالكامل ({formatPrice(total)}).</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* نموذج معلومات حساب الاشتراك - يظهر فقط عند وجود خدمات اشتراك */}
          {hasSubscriptionServices && (
            <div className="space-y-3 bg-blue-50/80 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  🔐
                </div>
                <div>
                  <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    معلومات حساب الاشتراك
                  </Label>
                  <p className="text-xs text-blue-700 dark:text-blue-300">(اختياري - لتسليم المعلومات للعميل)</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1 block">
                    اسم المستخدم / البريد الإلكتروني
                  </Label>
                  <Input
                    type="text"
                    placeholder="username أو email@example.com"
                    value={subscriptionAccountInfo.username}
                    onChange={(e) => setSubscriptionAccountInfo({
                      ...subscriptionAccountInfo,
                      username: e.target.value
                    })}
                    className="text-sm bg-white/80 dark:bg-gray-800/80 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1 block">
                    البريد الإلكتروني (إن كان مختلف)
                  </Label>
                  <Input
                    type="email"
                    placeholder="email@example.com (اختياري)"
                    value={subscriptionAccountInfo.email}
                    onChange={(e) => setSubscriptionAccountInfo({
                      ...subscriptionAccountInfo,
                      email: e.target.value
                    })}
                    className="text-sm bg-white/80 dark:bg-gray-800/80 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1 block">
                    كلمة المرور
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={subscriptionAccountInfo.password}
                    onChange={(e) => setSubscriptionAccountInfo({
                      ...subscriptionAccountInfo,
                      password: e.target.value
                    })}
                    className="text-sm bg-white/80 dark:bg-gray-800/80 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1 block">
                    ملاحظات إضافية
                  </Label>
                  <Input
                    type="text"
                    placeholder="معلومات إضافية مهمة للعميل"
                    value={subscriptionAccountInfo.notes}
                    onChange={(e) => setSubscriptionAccountInfo({
                      ...subscriptionAccountInfo,
                      notes: e.target.value
                    })}
                    className="text-sm bg-white/80 dark:bg-gray-800/80 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="bg-blue-100/50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200/30 dark:border-blue-800/30">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <span>هذه المعلومات ستظهر في تفاصيل الطلبية وعلى وصل الطباعة لتسهيل تسليم الاشتراك للعميل</span>
                </p>
              </div>
            </div>
          )}
          
          {/* خصم وملاحظات */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>خصم (%)</Label>
              <div className="flex items-center mt-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className="text-left"
                  dir="ltr"
                />
                <div className="mr-3 text-xs text-muted-foreground">
                  {formatPrice(discountAmount)}
                </div>
              </div>
            </div>
            
            <div>
              <Label>ملاحظات</Label>
              <Input 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="إضافة ملاحظات للطلب (اختياري)"
              />
            </div>
          </div>
          
          {/* ملخص الطلب */}
          <div className="bg-muted/30 p-3 rounded-md border space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الخصم ({discount}%):</span>
                <span className="text-destructive">- {formatPrice(discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الضريبة:</span>
              <span>{formatPrice(tax)}</span>
            </div>
            
            <Separator className="my-2" />
            
            <div className="flex justify-between font-semibold">
              <span>الإجمالي:</span>
              <span>{formatPrice(total)}</span>
            </div>
            
            {isPartialPayment && (
              <>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>المبلغ المدفوع:</span>
                  <span>{formatPrice(parseFloat(amountPaid) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-amber-600">
                  <span>المبلغ المتبقي:</span>
                  <span>{formatPrice(remainingAmount)}</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-end mt-3">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            إلغاء
          </Button>
          <Button 
            type="button"
            onClick={handlePaymentComplete}
            disabled={isProcessing || (isPartialPayment && considerRemainingAsPartial && !selectedCustomer && !isReturnMode)}
            className={cn(
              "w-full sm:w-auto min-w-32",
              isReturnMode 
                ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" 
                : "bg-gradient-to-r from-primary to-primary/90"
            )}
          >
            {isProcessing ? (
              <>
                <span className="animate-spin ml-2">⏳</span>
                {isReturnMode ? 'جاري معالجة الإرجاع...' : 'جاري المعالجة...'}
              </>
            ) : (
              <>
                {isReturnMode ? (
                  <RotateCcw className="h-4 w-4 ml-2" />
                ) : (
                  <Receipt className="h-4 w-4 ml-2" />
                )}
                {isReturnMode ? 'إتمام الإرجاع' : 'إتمام الطلب'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
