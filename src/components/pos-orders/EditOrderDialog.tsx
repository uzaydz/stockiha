import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { 
  Receipt, AlertCircle, CreditCard, Banknote, UserPlus, Wallet, 
  Receipt as ReceiptIcon, Edit3, Save, X, Calculator, DollarSign 
} from 'lucide-react';

interface POSOrderWithDetails {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  slug?: string;
  customer_order_number?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  is_online: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  order_items: any[];
  items_count: number;
  effective_status?: string;
  effective_total?: number;
  original_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
}

interface EditOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: POSOrderWithDetails | null;
  onOrderUpdated: (updatedOrder: POSOrderWithDetails) => void;
}

export default function EditOrderDialog({
  isOpen,
  onOpenChange,
  order,
  onOrderUpdated
}: EditOrderDialogProps) {
  // حالة التحميل والمعالجة
  const [isProcessing, setIsProcessing] = useState(false);
  
  // بيانات العملاء
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  
  // بيانات الدفع
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [considerRemainingAsPartial, setConsiderRemainingAsPartial] = useState(false);
  
  // بيانات الطلبية الأساسية
  const [orderStatus, setOrderStatus] = useState('pending');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  
  // حالة تركيز حقل المبلغ المدفوع
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  
  // حالة حاسبة المبلغ السريع
  const [quickCalcValue, setQuickCalcValue] = useState('');

  // الطرق المتاحة للدفع
  const paymentMethods = [
    { id: 'cash', name: 'نقدي', icon: <Banknote className="h-4 w-4" /> },
    { id: 'card', name: 'بطاقة', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'wallet', name: 'محفظة إلكترونية', icon: <Wallet className="h-4 w-4" /> }
  ];

  // حالات الطلبية المتاحة
  const orderStatuses = [
    { id: 'pending', name: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'processing', name: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800' },
    { id: 'completed', name: 'مكتمل', color: 'bg-green-100 text-green-800' },
    { id: 'cancelled', name: 'ملغي', color: 'bg-red-100 text-red-800' }
  ];

  // حالات الدفع المتاحة
  const paymentStatuses = [
    { id: 'pending', name: 'لم يتم الدفع', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'partial', name: 'دفع جزئي', color: 'bg-orange-100 text-orange-800' },
    { id: 'paid', name: 'مدفوع بالكامل', color: 'bg-green-100 text-green-800' },
    { id: 'refunded', name: 'مسترد', color: 'bg-gray-100 text-gray-800' }
  ];

  // حساب القيم المالية
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount + tax;
  const paidAmount = parseFloat(amountPaid) || 0;
  const remainingAmount = total - paidAmount;
  const change = paidAmount > total ? paidAmount - total : 0;
  const isPartialPayment = paidAmount > 0 && paidAmount < total;

  // أزرار اختصارات المبلغ المدفوع
  const quickAmounts = [
    { label: "المبلغ بالضبط", value: total },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
    { label: "200", value: 200 },
    { label: "500", value: 500 }
  ];

  // جلب العملاء
  const fetchCustomers = useCallback(async () => {
    if (!order?.organization_id) return;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('organization_id', order.organization_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('خطأ في جلب العملاء:', error);
    }
  }, [order?.organization_id]);

  // تحديث البيانات عند فتح النافذة أو تغيير الطلبية
  useEffect(() => {
    if (isOpen && order) {
      console.log('🔄 [EditOrderDialog] تحميل بيانات الطلبية:', order);
      console.log('📋 البيانات المستلمة:', {
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        amount_paid: order.amount_paid,
        remaining_amount: order.remaining_amount,
        customer: order.customer,
        notes: order.notes
      });
      
      console.log('🔍 فحص القيم الفردية:');
      console.log('  - subtotal:', order.subtotal, typeof order.subtotal);
      console.log('  - tax:', order.tax, typeof order.tax);
      console.log('  - discount:', order.discount, typeof order.discount);
      console.log('  - amount_paid:', order.amount_paid, typeof order.amount_paid);
      
      // تحديث البيانات من الطلبية مع معالجة القيم المفقودة
      setOrderStatus(order.status || 'pending');
      setPaymentStatus(order.payment_status || 'pending');
      setPaymentMethod(order.payment_method || 'cash');
      setNotes(order.notes || '');
      
      // معالجة البيانات المالية - إذا كانت فارغة، نحسبها من total
      const orderTotal = order.total || 0;
      const orderSubtotal = order.subtotal !== undefined ? order.subtotal : orderTotal;
      const orderTax = order.tax !== undefined ? order.tax : 0;
      const orderDiscount = order.discount !== undefined ? order.discount : 0;
      const orderAmountPaid = order.amount_paid !== undefined ? order.amount_paid : orderTotal;
      
      console.log('💰 القيم المالية المحسوبة:');
      console.log('  - total:', orderTotal);
      console.log('  - subtotal:', orderSubtotal);
      console.log('  - tax:', orderTax);
      console.log('  - discount:', orderDiscount);
      console.log('  - amount_paid:', orderAmountPaid);
      
      setDiscount(orderDiscount);
      setSubtotal(orderSubtotal);
      setTax(orderTax);
      setAmountPaid(orderAmountPaid.toString());
      
      // تحديد العميل المحدد
      if (order.customer) {
        console.log('👤 تحديد العميل:', order.customer);
        setSelectedCustomer(order.customer as User);
      } else {
        console.log('👤 لا يوجد عميل محدد');
        setSelectedCustomer(null);
      }
      
      // جلب العملاء
      fetchCustomers();
    } else {
      console.log('⚠️ [EditOrderDialog] لا توجد بيانات طلبية أو النافذة مغلقة');
    }
  }, [isOpen, order, fetchCustomers]);

  // إعادة تعيين النموذج عند الإغلاق
  useEffect(() => {
    if (!isOpen) {
      setSearchCustomer('');
      setQuickCalcValue('');
    }
  }, [isOpen]);

  // معالج تغيير الخصم
  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= 100) {
      setDiscount(numValue);
    }
  };

  // حساب المبلغ النهائي عند استخدام الحاسبة السريعة
  const handleQuickCalc = () => {
    try {
      const currentAmount = parseFloat(amountPaid) || 0;
      const calcValue = parseFloat(quickCalcValue);
      
      if (!isNaN(calcValue)) {
        setAmountPaid((currentAmount + calcValue).toString());
        setQuickCalcValue('');
      }
    } catch (error) {
      console.error('خطأ في الحساب:', error);
    }
  };

  // فلترة العملاء
  const filteredCustomers = useCallback(() => {
    if (!searchCustomer.trim()) return customers;
    
    const query = searchCustomer.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchCustomer]);

  // حفظ التعديلات
  const handleSaveChanges = async () => {
    if (!order) return;
    
    setIsProcessing(true);
    
    try {
      // إعداد البيانات المحدثة
      const updatedData = {
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
        discount: discount,
        amount_paid: paidAmount,
        remaining_amount: paymentStatus === 'paid' ? 0 : remainingAmount,
        customer_id: selectedCustomer?.id || null,
        updated_at: new Date().toISOString()
      };

      console.log('🔄 [EditOrderDialog] تحديث الطلبية:', order.id);
      console.log('📋 البيانات المحدثة:', updatedData);

      // تحديث الطلبية في قاعدة البيانات
      const { data, error } = await supabase
        .from('orders')
        .update(updatedData)
        .eq('id', order.id)
        .select(`
          *,
          customer:customers(id, name, email, phone),
          employee:users(id, name, email),
          order_items(*)
        `)
        .single();

      if (error) {
        console.error('❌ خطأ في تحديث الطلبية:', error);
        throw error;
      }

      console.log('✅ تم تحديث الطلبية بنجاح:', data);
      
      // إشعار بالنجاح
      toast.success('تم تحديث الطلبية بنجاح');
      
      // إرسال البيانات المحدثة للمكون الأب
      onOrderUpdated(data as unknown as POSOrderWithDetails);
      
      // إغلاق النافذة
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('❌ خطأ في حفظ التعديلات:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث الطلبية');
    } finally {
      setIsProcessing(false);
    }
  };

  // فتح نافذة إضافة عميل جديد
  const openNewCustomerDialog = () => {
    // TODO: تطبيق نافذة إضافة عميل جديد
    toast.info('ميزة إضافة عميل جديد قيد التطوير');
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            <span>تعديل الطلبية #{order.customer_order_number || order.slug?.slice(-8) || order.id.slice(-8)}</span>
          </DialogTitle>
          <DialogDescription>
            تعديل تفاصيل الطلبية ومعلومات الدفع
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 pt-2">
          {/* معلومات الطلبية الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
            <div className="space-y-2">
              <Label className="text-sm font-medium">حالة الطلبية</Label>
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">حالة الدفع</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* اختيار العميل */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">العميل</Label>
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
                      <Label>المبلغ المدفوع</Label>
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
                      />
                    </div>
                    <div>
                      <Label>الباقي</Label>
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
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* رسالة الدفع الجزئي */}
                  {isPartialPayment && (
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
          
          {/* خصم وملاحظات */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="إضافة ملاحظات للطلب (اختياري)"
                className="min-h-[40px]"
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
            <X className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
          <Button 
            type="button"
            onClick={handleSaveChanges}
            disabled={isProcessing || (isPartialPayment && considerRemainingAsPartial && !selectedCustomer)}
            className="w-full sm:w-auto min-w-32 bg-gradient-to-r from-primary to-primary/90"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin ml-2">⏳</span>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 ml-2" />
                حفظ التعديلات
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 