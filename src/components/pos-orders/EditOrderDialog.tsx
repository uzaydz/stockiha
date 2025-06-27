import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { createCustomer } from '@/context/shop/userService';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
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
  consider_remaining_as_partial?: boolean;
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
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  
  // حالة نافذة إضافة عميل جديد
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
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
    try {
      
      // الحصول على معرف المؤسسة من localStorage كما هو مستخدم في customers.ts
      const organizationId = localStorage.getItem('bazaar_organization_id');
      
      if (!organizationId) {
        return;
      }

      // جلب العملاء من جدول customers
      const { data: orgCustomers, error: orgError } = await supabase
        .from('customers')
        .select('id, name, email, phone, organization_id, created_at, updated_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (orgError) {
        throw orgError;
      }
      
      // جلب العملاء من جدول users مع role 'customer'
      const { data: userCustomers, error: userError } = await supabase
        .from('users')
        .select('id, name, email, phone, organization_id, created_at, updated_at')
        .eq('role', 'customer')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (userError) {
        // لا نرمي الخطأ هنا، نكمل مع عملاء المؤسسة فقط
      }
      
      // تصفية العملاء الذين لديهم معرف مشكوك فيه
      const filteredOrgCustomers = (orgCustomers || []).filter(customer => 
        customer.id !== '00000000-0000-0000-0000-000000000000'
      );
      
      const filteredUserCustomers = (userCustomers || []).filter(user => 
        user.id !== '00000000-0000-0000-0000-000000000000'
      );
      
      // تحويل عملاء المستخدمين إلى تنسيق العملاء ودمجهم
      const mappedUserCustomers = filteredUserCustomers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization_id: user.organization_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

      // دمج جميع العملاء
      const allCustomers = [
        ...filteredOrgCustomers,
        ...mappedUserCustomers
      ];
      
      // إزالة التكرار بناءً على معرف العميل
      const uniqueCustomers = allCustomers.filter((customer, index, self) =>
        index === self.findIndex(c => c.id === customer.id)
      );
      
      // ترتيب العملاء حسب الاسم
      uniqueCustomers.sort((a, b) => a.name.localeCompare(b.name));

      setCustomers(uniqueCustomers);
    } catch (error) {
      setCustomers([]);
    }
  }, []);

  // تحديث قائمة العملاء عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen, fetchCustomers]);

  // تحديث العميل المختار بعد جلب العملاء
  useEffect(() => {
    if (order?.customer && customers.length > 0) {
      // البحث عن العميل في قائمة العملاء المجلبة
      const foundCustomer = customers.find(c => c.id === order.customer?.id);
      if (foundCustomer) {
        setSelectedCustomer(foundCustomer);
      } else {
        setSelectedCustomer(order.customer as User);
      }
    }
  }, [order?.customer, customers]);

  // تحديث البيانات عند فتح النافذة أو تغيير الطلبية
  useEffect(() => {
    if (isOpen && order) {

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

      setDiscount(orderDiscount);
      setSubtotal(orderSubtotal);
      setTax(orderTax);
      setAmountPaid(orderAmountPaid.toString());
      
      // تحديد العميل المحدد (سيتم تحديثه بعد جلب العملاء)
      if (order.customer) {
        setSelectedCustomer(order.customer as User);
      } else {
        setSelectedCustomer(null);
      }
    } else {
    }
  }, [isOpen, order]);

  // إعادة تعيين النموذج عند الإغلاق
  useEffect(() => {
    if (!isOpen) {
      setSearchCustomer('');
      setQuickCalcValue('');
      setIsCustomerPopoverOpen(false);
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
    }
  };

  // فلترة العملاء
  const filteredCustomers = useCallback(() => {
    
    if (!searchCustomer.trim()) {
      return customers;
    }
    
    const query = searchCustomer.toLowerCase();
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
    
    return filtered;
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
        subtotal: subtotal,
        tax: tax,
        notes: notes.trim() || null,
        discount: discount,
        amount_paid: paidAmount,
        remaining_amount: paymentStatus === 'paid' ? 0 : remainingAmount,
        consider_remaining_as_partial: isPartialPayment ? considerRemainingAsPartial : false,
        customer_id: selectedCustomer && selectedCustomer.id !== 'guest' ? selectedCustomer.id : null,
        updated_at: new Date().toISOString()
      };

      // تحديث الطلبية في قاعدة البيانات
      const { data, error } = await supabase
        .from('orders')
        .update(updatedData)
        .eq('id', order.id)
        .select(`
          *,
          customer:customers!orders_customer_id_fkey(id, name, email, phone),
          employee:users!orders_employee_id_fkey(id, name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      // إنشاء الطلبية المحدثة مع البيانات الكاملة
      const updatedOrder: POSOrderWithDetails = {
        ...order,
        ...data,
        customer: data.customer || null,
        employee: data.employee || order.employee,
        // الحفاظ على البيانات المحسوبة
        items_count: order.items_count,
        effective_status: order.effective_status,
        effective_total: data.total - (order.total_returned_amount || 0),
        original_total: data.total,
        has_returns: order.has_returns,
        is_fully_returned: order.is_fully_returned,
        total_returned_amount: order.total_returned_amount,
        order_items: order.order_items
      };

      // إشعار بالنجاح
      toast.success('تم تحديث الطلبية بنجاح');
      
      // إرسال البيانات المحدثة للمكون الأب
      onOrderUpdated(updatedOrder);
      
      // إغلاق النافذة
      onOpenChange(false);
      
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الطلبية');
    } finally {
      setIsProcessing(false);
    }
  };

  // فتح نافذة إضافة عميل جديد
  const openNewCustomerDialog = () => {
    setNewCustomer({ name: '', email: '', phone: '' });
    setIsNewCustomerDialogOpen(true);
  };

  // إضافة عميل جديد
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("اسم العميل مطلوب");
      return;
    }
    
    try {
      setIsAddingCustomer(true);
      
      const customer = await createCustomer({
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim() || undefined,
        phone: newCustomer.phone.trim() || undefined
      });
      
      if (customer) {
        
        // إضافة العميل الجديد إلى قائمة العملاء
        setCustomers(prev => {
          const updatedCustomers = [customer, ...prev];
          return updatedCustomers;
        });
        
        // اختيار العميل الجديد
        setSelectedCustomer(customer);
        
        // إغلاق النافذة وإعادة تعيين البيانات
        setIsNewCustomerDialogOpen(false);
        setNewCustomer({ name: '', email: '', phone: '' });
        
        toast.success(`تم إضافة العميل "${customer.name}" بنجاح`);
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إضافة العميل");
    } finally {
      setIsAddingCustomer(false);
    }
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
              <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isCustomerPopoverOpen}
                    className="flex-1 justify-between"
                  >
                    {selectedCustomer ? selectedCustomer.name : "اختر العميل أو زائر"}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="ابحث عن عميل..." 
                      value={searchCustomer}
                      onValueChange={setSearchCustomer}
                    />
                    <CommandEmpty>لا توجد نتائج للبحث</CommandEmpty>
                    <CommandGroup>
                      {/* خيار زائر */}
                      <CommandItem
                        value="guest"
                        onSelect={() => {
                          setSelectedCustomer(null);
                          setIsCustomerPopoverOpen(false);
                          setSearchCustomer('');
                        }}
                      >
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4",
                            !selectedCustomer ? "opacity-100" : "opacity-0"
                          )}
                        />
                        زائر
                      </CommandItem>
                      
                      {/* خيار إضافة عميل جديد */}
                      <CommandItem
                        value="new-customer"
                        onSelect={() => {
                          setIsCustomerPopoverOpen(false);
                          setSearchCustomer('');
                          openNewCustomerDialog();
                        }}
                        className="text-primary"
                      >
                        <UserPlus className="ml-2 h-4 w-4" />
                        إضافة عميل جديد
                      </CommandItem>
                      
                      {/* فاصل */}
                      {customers.length > 0 && (
                        <div className="border-t my-1" />
                      )}
                      
                      {/* قائمة العملاء */}
                      {filteredCustomers().map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.name}
                          onSelect={() => {
                            setSelectedCustomer(customer);
                            setIsCustomerPopoverOpen(false);
                            setSearchCustomer('');
                          }}
                        >
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{customer.name}</span>
                            {customer.phone && (
                              <span className="text-xs text-muted-foreground">
                                {customer.phone}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
                             </Popover>
            </div>
            
            {/* معلومات العميل المختار */}
            {selectedCustomer && (
              <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted/30 rounded">
                <div className="font-medium">👤 {selectedCustomer.name}</div>
                {selectedCustomer.email && (
                  <div>📧 {selectedCustomer.email}</div>
                )}
                {selectedCustomer.phone && (
                  <div>📱 {selectedCustomer.phone}</div>
                )}
              </div>
            )}
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
      
      {/* نافذة إضافة عميل جديد */}
      <Dialog open={isNewCustomerDialogOpen} onOpenChange={(open) => !isAddingCustomer && setIsNewCustomerDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>إضافة عميل جديد</span>
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات العميل الجديد وسيتم إضافته للطلبية تلقائياً
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-name" className="text-sm font-medium">
                اسم العميل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-customer-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="أدخل اسم العميل"
                className="focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={isAddingCustomer}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-email" className="text-sm font-medium">
                البريد الإلكتروني <span className="text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Input
                id="new-customer-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="أدخل البريد الإلكتروني"
                className="focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={isAddingCustomer}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-phone" className="text-sm font-medium">
                رقم الهاتف <span className="text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Input
                id="new-customer-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="أدخل رقم الهاتف"
                dir="rtl"
                inputMode="tel"
                style={{ textAlign: 'right', direction: 'rtl' }}
                className="focus:border-primary focus:ring-1 focus:ring-primary text-right [&::placeholder]:text-right [&::placeholder]:mr-0"
                disabled={isAddingCustomer}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsNewCustomerDialogOpen(false)}
              disabled={isAddingCustomer}
              className="w-full sm:w-auto"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleAddCustomer}
              disabled={isAddingCustomer || !newCustomer.name.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90"
            >
              {isAddingCustomer ? (
                <>
                  <span className="animate-spin ml-2">⏳</span>
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 ml-2" />
                  إضافة العميل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
