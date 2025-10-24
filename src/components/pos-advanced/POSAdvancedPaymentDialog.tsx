import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Search,
  UserPlus,
  Phone,
  User,
  Check
} from 'lucide-react';
// استيراد hook إنشاء العملاء والتوست
import { useShop } from '@/context/ShopContext';
import { useToast } from '@/hooks/use-toast';

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
  
  // إضافة callback لتحديث قائمة العملاء
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
  // استخدام hook إنشاء العملاء
  const { createCustomer } = useShop();
  const { toast } = useToast();

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

  // حالة البحث عن العملاء وإنشاء عميل جديد
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<AppUser[]>(customers);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // تحديث العملاء المحليين عند تغيير العملاء الخارجيين
  useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);

  // فلترة العملاء بناءً على البحث
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return localCustomers;
    
    const query = customerSearchQuery.toLowerCase().trim();
    return localCustomers.filter(customer => 
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [localCustomers, customerSearchQuery]);

  // البحث عن العميل المحدد
  const selectedCustomer = localCustomers.find(c => c.id === customerId);
  
  // حساب المبالغ - استخدام total بدلاً من subtotal
  const finalTotal = total;
  const paidAmount = parseFloat(amountPaid) || 0;
  const remainingAmount = Math.max(0, finalTotal - paidAmount);
  const change = Math.max(0, paidAmount - finalTotal);
  
  // تحديث التخفيضات المحلية عند تغيير التخفيضات الخارجية
  useEffect(() => {
    setDiscount(currentDiscount);
    setDiscountType(currentDiscountType);
  }, [currentDiscount, currentDiscountType]);

  // إعادة تعيين التخفيضات عند فتح الـ dialog
  useEffect(() => {
    if (isOpen) {
      setDiscount(currentDiscount);
      setDiscountType(currentDiscountType);
    }
  }, [isOpen, currentDiscount, currentDiscountType]);

  // تحديث حالة الدفع الجزئي
  useEffect(() => {
    setIsPartialPayment(paidAmount < finalTotal);
  }, [paidAmount, finalTotal]);
  
  // تحديث المبلغ المدفوع عند تغيير طريقة الدفع
  useEffect(() => {
    if (paymentMethod === 'card') {
      setAmountPaid(finalTotal.toString());
    }
    // إزالة إعادة تعيين المبلغ للنقد لتسمح بإدخال 0 أو أي مبلغ
  }, [paymentMethod, finalTotal]);
  
  // إعادة تعيين القيم عند فتح الـ dialog
  useEffect(() => {
    if (isOpen) {
      setAmountPaid(finalTotal.toString()); // تعيين المبلغ الكامل افتراضياً
      setCustomerId(selectedCustomerId || 'anonymous');
      setNotes('');
      setPaymentMethod('cash');
      setCustomerSearchQuery('');
      setShowCreateCustomer(false);
      setShowCustomerList(false);
      setNewCustomerData({ name: '', phone: '', email: '' });
      setLocalCustomers(customers);
    }
  }, [isOpen, finalTotal, selectedCustomerId, customers]);

  // دالة إنشاء عميل جديد
  const handleCreateCustomer = async () => {
    if (!newCustomerData.name.trim()) {
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
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim() || undefined,
        email: newCustomerData.email.trim() || undefined
      });

      // تحديث القائمة المحلية فوراً
      setLocalCustomers(prev => [newCustomer, ...prev]);
      
      // إشعار المكون الأب
      if (onCustomerAdded) {
        onCustomerAdded(newCustomer);
      }

      // تحديد العميل الجديد كعميل محدد
      setCustomerId(newCustomer.id);
      setShowCreateCustomer(false);
      setShowCustomerList(false);
      setNewCustomerData({ name: '', phone: '', email: '' });
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
  };

  // دالة البحث السريع عن العميل وإنشاؤه تلقائياً
  const handleQuickCustomerCreate = () => {
    if (customerSearchQuery.trim()) {
      // إذا كان البحث يحتوي على رقم هاتف (أرقام فقط)
      const isPhoneNumber = /^\d+$/.test(customerSearchQuery.trim());
      
      setNewCustomerData({
        name: isPhoneNumber ? '' : customerSearchQuery.trim(),
        phone: isPhoneNumber ? customerSearchQuery.trim() : '',
        email: ''
      });
      setShowCreateCustomer(true);
      setShowCustomerList(false);
    }
  };

  // دالة اختيار العميل
  const handleSelectCustomer = (customer: AppUser) => {
    setCustomerId(customer.id);
    setShowCustomerList(false);
    setCustomerSearchQuery('');
  };

  // دالة فتح قائمة العملاء
  const handleOpenCustomerList = () => {
    setShowCustomerList(true);
    setShowCreateCustomer(false);
  };
  
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
      discount: currentDiscount, // تمرير التخفيض الحالي
      discountType: currentDiscountType, // تمرير نوع التخفيض
      amountPaid: paidAmount,
      paymentMethod,
      isPartialPayment,
      considerRemainingAsPartial
    });
  };
  
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
          {/* قسم اختيار العميل المحسن */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                العميل {isPartialPayment && considerRemainingAsPartial && <span className="text-red-500">*</span>}
            </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateCustomer(true)}
                className="h-8 px-2 text-xs"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                جديد
              </Button>
            </div>

            {showCreateCustomer ? (
              /* نموذج إنشاء عميل جديد */
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30 dark:bg-muted/10">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">إنشاء عميل جديد</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateCustomer(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
              </div>
              
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">الاسم *</Label>
                    <Input
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="اسم العميل"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الهاتف</Label>
                <Input
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="رقم الهاتف"
                      className="h-8 text-sm"
                      dir="rtl"
                />
              </div>
            </div>
            
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateCustomer}
                    disabled={!newCustomerData.name.trim() || isCreatingCustomer}
                    size="sm"
                    className="flex-1 h-8"
                  >
                    {isCreatingCustomer ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
                        إنشاء...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" />
                        إنشاء
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateCustomer(false)}
                    disabled={isCreatingCustomer}
                    size="sm"
                    className="h-8"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* العميل المحدد حالياً */}
                <div 
                  className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20"
                  onClick={handleOpenCustomerList}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">
                        {customerId === 'anonymous' ? 'عميل مجهول' : selectedCustomer?.name || 'اختر عميل'}
                      </div>
                      {selectedCustomer?.phone && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {selectedCustomer.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {customerId !== 'anonymous' && selectedCustomer && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* قائمة البحث والاختيار */}
                {showCustomerList && (
                  <div className="border rounded-lg bg-background dark:bg-muted/5 max-h-60 overflow-hidden">
                    {/* شريط البحث */}
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                        <Input
                          placeholder="ابحث بالاسم أو الهاتف..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="pr-8 h-8 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* قائمة العملاء */}
                    <div className="max-h-48 overflow-y-auto">
                      <div className="p-1">
                        {/* عميل مجهول */}
                        <div
                          className={cn(
                            "flex items-center p-2 rounded cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20",
                            customerId === 'anonymous' && "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                          )}
                          onClick={() => {
                            setCustomerId('anonymous');
                            setShowCustomerList(false);
                            setCustomerSearchQuery('');
                          }}
                        >
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">عميل مجهول</span>
                          {customerId === 'anonymous' && (
                            <Check className="h-3 w-3 mr-auto text-green-600" />
                          )}
                        </div>

                        {/* العملاء المفلترين */}
                        {filteredCustomers.map(customer => (
                          <div
                            key={customer.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20",
                              customerId === customer.id && "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                            )}
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-sm">{customer.name}</div>
                                {customer.phone && (
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <Phone className="h-3 w-3 mr-1" />
                                    {customer.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            {customerId === customer.id && (
                              <Check className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        ))}

                        {/* لا توجد نتائج */}
                        {customerSearchQuery && filteredCustomers.length === 0 && (
                          <div className="p-2 text-center">
                            <p className="text-muted-foreground text-sm mb-2">
                              لم يتم العثور على عميل
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleQuickCustomerCreate}
                              className="w-full h-8"
                            >
                              <UserPlus className="h-3 w-3 mr-2" />
                              إنشاء "{customerSearchQuery}"
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* زر إغلاق */}
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCustomerList(false);
                          setCustomerSearchQuery('');
                        }}
                        className="w-full h-8"
                      >
                        إغلاق
                      </Button>
                    </div>
                </div>
                )}
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* قسم الدفع */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              تفاصيل الدفع
            </h3>
            
            <Tabs value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
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
                    onChange={(e) => setAmountPaid(e.target.value)}
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
                    onChange={(e) => setAmountPaid(e.target.value)}
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
          
          <Separator />
          
          {/* ملاحظات */}
          <div className="space-y-2">
            <Label className="text-sm">ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف أي ملاحظات حول الطلب..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>
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
