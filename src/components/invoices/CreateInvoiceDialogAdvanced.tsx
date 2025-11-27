import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  Check, 
  ChevronsUpDown, 
  Loader2, 
  Plus, 
  FileText,
  Percent,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { getProducts } from '@/lib/api/products';
import type { Customer } from '@/types/customer';
import type { Product } from '@/lib/api/products';
import type { Invoice } from '@/lib/api/invoices';
import { supabase } from '@/lib/supabase';
import { getLocalCustomers } from '@/api/localCustomerService';
import ProductSelectorDialog from './ProductSelectorDialog';
import InvoiceItemsTable, { type InvoiceItemData } from './InvoiceItemsTable';

interface CreateInvoiceDialogAdvancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated: (invoice: Invoice) => void;
  type: 'new' | 'order' | 'online' | 'service' | 'combined' | 'proforma' | 'bon_commande';
  editingInvoice?: Invoice | null;
}

const CreateInvoiceDialogAdvanced = ({
  open,
  onOpenChange,
  onInvoiceCreated,
  type,
  editingInvoice,
}: CreateInvoiceDialogAdvancedProps) => {
  const { currentOrganization } = useTenant();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);

  // بيانات الفاتورة
  const [customerId, setCustomerId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [tvaRate, setTvaRate] = useState(19);
  
  // عناصر الفاتورة
  const [items, setItems] = useState<InvoiceItemData[]>([]);
  
  // التخفيض
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  
  // الشحن
  const [shippingAmount, setShippingAmount] = useState(0);

  // جلب البيانات
  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization || !open) return;

      try {
        const [customersData, productsData] = await Promise.all([
          getLocalCustomers({ organizationId: currentOrganization.id }),
          getProducts(currentOrganization.id),
        ]);
        
        setCustomers(customersData as unknown as Customer[]);
        setProducts(productsData);
      } catch (error) {
        toast.error('حدث خطأ أثناء جلب البيانات');
      }
    };

    fetchData();
  }, [open, currentOrganization]);

  // تحميل بيانات الفاتورة عند التعديل
  useEffect(() => {
    if (editingInvoice && open) {
      // تحميل بيانات الفاتورة
      setCustomerId(editingInvoice.customerInfo?.id || '');
      setDueDate(editingInvoice.dueDate ? new Date(editingInvoice.dueDate) : undefined);
      setPaymentMethod(editingInvoice.paymentMethod || 'cash');
      setStatus(editingInvoice.status || 'pending');
      setNotes(editingInvoice.notes || '');
      setShippingAmount(editingInvoice.shippingAmount || 0);
      setDiscountValue(editingInvoice.discountAmount || 0);
      setDiscountType(editingInvoice.discountAmount && editingInvoice.discountAmount > 0 ? 'fixed' : 'none');
      
      // تحميل عناصر الفاتورة
      if (editingInvoice.items && editingInvoice.items.length > 0) {
        const invoiceItems: InvoiceItemData[] = editingInvoice.items.map(item => {
          const itemAny = item as any;
          return {
            name: item.name,
            sku: itemAny.sku || '',
            barcode: itemAny.barcode || '',
            quantity: item.quantity,
            unitPriceHT: itemAny.unitPriceHT || item.unitPrice / 1.19,
            unitPriceTTC: itemAny.unitPriceTTC || item.unitPrice,
            tvaRate: itemAny.tvaRate || tvaRate,
            discountAmount: itemAny.discountAmount || 0,
            totalHT: itemAny.totalHT || item.totalPrice / 1.19,
            totalTVA: itemAny.totalTVA || (item.totalPrice / 1.19) * 0.19,
            totalTTC: itemAny.totalTTC || item.totalPrice,
            productId: item.productId,
            type: item.type || 'product',
          };
        });
        setItems(invoiceItems);
      }
    } else if (!open) {
      // إعادة تعيين النموذج عند الإغلاق
      setCustomerId('');
      setDueDate(undefined);
      setPaymentMethod('cash');
      setStatus('pending');
      setNotes('');
      setItems([]);
      setDiscountType('none');
      setDiscountValue(0);
      setShippingAmount(0);
    }
  }, [editingInvoice, open, tvaRate]);

  // حساب الإجماليات
  const calculateTotals = () => {
    const subtotalHT = items.reduce((sum, item) => sum + item.totalHT, 0);
    const subtotalTVA = items.reduce((sum, item) => sum + item.totalTVA, 0);
    const subtotalTTC = items.reduce((sum, item) => sum + item.totalTTC, 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = subtotalTTC * (discountValue / 100);
    } else if (discountType === 'fixed') {
      discountAmount = discountValue;
    }

    const totalTTC = subtotalTTC + shippingAmount - discountAmount;

    return {
      subtotalHT,
      subtotalTVA,
      subtotalTTC,
      discountAmount,
      shippingAmount,
      totalTTC,
    };
  };

  const totals = calculateTotals();

  // إضافة منتجات من نافذة الاختيار
  const handleSelectProduct = (selectedProducts: Array<{ product: Product; quantity: number }>) => {
    const newItems: InvoiceItemData[] = selectedProducts.map(({ product, quantity }) => {
      const unitPriceTTC = product.price || 0;
      const unitPriceHT = unitPriceTTC / (1 + tvaRate / 100);
      const totalHT = unitPriceHT * quantity;
      const totalTVA = totalHT * (tvaRate / 100);
      const totalTTC = totalHT + totalTVA;

      return {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity,
        unitPriceHT,
        unitPriceTTC,
        tvaRate,
        discountAmount: 0,
        totalHT,
        totalTVA,
        totalTTC,
        productId: product.id,
        type: 'product' as const,
      };
    });

    setItems([...items, ...newItems]);
    toast.success(`تمت إضافة ${selectedProducts.length} منتج`);
  };

  // تحديث عنصر
  const handleUpdateItem = (index: number, item: InvoiceItemData) => {
    const newItems = [...items];
    newItems[index] = item;
    setItems(newItems);
  };

  // حذف عنصر
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // إنشاء أو تعديل الفاتورة
  const handleSubmit = async () => {
    if (!currentOrganization) {
      toast.error('لم يتم العثور على معلومات المؤسسة');
      return;
    }

    if (items.length === 0) {
      toast.error('الرجاء إضافة منتج واحد على الأقل');
      return;
    }

    setLoading(true);
    try {
      // التحقق من العميل
      let validCustomerId = null;
      if (customerId) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('id', customerId)
          .single();
          
        if (customerData) {
          validCustomerId = customerData.id;
        }
      }

      const customer = customers.find((c) => c.id === validCustomerId);

      // إنشاء رقم الفاتورة (فقط للفواتير الجديدة)
      const prefix = type === 'proforma' ? 'PRO' : type === 'bon_commande' ? 'BC' : 'INV';
      const invoiceNumber = editingInvoice ? editingInvoice.invoiceNumber : `${prefix}-${Date.now().toString().substring(8, 13)}`;

      // بيانات الفاتورة
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_name: customer?.name || 'عميل نقدي',
        customer_id: validCustomerId,
        total_amount: totals.totalTTC,
        invoice_date: new Date().toISOString(),
        due_date: dueDate ? dueDate.toISOString() : null,
        status,
        organization_id: currentOrganization.id,
        source_type: type === 'new' || type === 'proforma' || type === 'bon_commande' ? 'pos' : type,
        payment_method: paymentMethod,
        payment_status: status === 'paid' ? 'paid' : 'pending',
        notes: notes || null,
        
        // الحقول الجديدة
        discount_type: discountType,
        discount_percentage: discountType === 'percentage' ? discountValue : 0,
        discount_amount: totals.discountAmount,
        tva_rate: tvaRate,
        amount_ht: totals.subtotalHT,
        amount_tva: totals.subtotalTVA,
        amount_ttc: totals.totalTTC,
        subtotal_amount: totals.subtotalHT,
        tax_amount: totals.subtotalTVA,
        shipping_amount: shippingAmount,
        
        customer_info: JSON.stringify({
          id: validCustomerId,
          name: customer?.name || 'عميل نقدي',
          email: customer?.email || null,
          phone: customer?.phone || null,
          address: null,
        }),
        organization_info: JSON.stringify({
          name: currentOrganization.name,
          logo: null,
          address: null,
          phone: null,
          email: null,
          website: null,
          taxNumber: null,
          registrationNumber: null,
          additionalInfo: null,
        }),
      };

      // إدراج أو تحديث الفاتورة
      let invoice;
      let error;
      
      if (editingInvoice) {
        // تحديث الفاتورة الموجودة
        const { data, error: updateError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id)
          .select()
          .single();
        invoice = data;
        error = updateError;
        
        // حذف العناصر القديمة
        if (!error) {
          await supabase
            .from('invoice_items')
            .delete()
            .eq('invoice_id', editingInvoice.id);
        }
      } else {
        // إدراج فاتورة جديدة
        const { data, error: insertError } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();
        invoice = data;
        error = insertError;
      }

      if (error) throw error;

      // إدراج العناصر
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        name: item.name,
        description: null,
        quantity: item.quantity,
        unit_price: item.unitPriceTTC,
        total_price: item.totalTTC,
        product_id: item.productId || null,
        type: item.type,
        
        // الحقول الجديدة
        sku: item.sku || null,
        barcode: item.barcode || null,
        tva_rate: item.tvaRate,
        unit_price_ht: item.unitPriceHT,
        unit_price_ttc: item.unitPriceTTC,
        total_ht: item.totalHT,
        total_tva: item.totalTVA,
        total_ttc: item.totalTTC,
        discount_amount: item.discountAmount,
        is_editable_price: true,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        toast.error(`تم إنشاء الفاتورة لكن حدث خطأ في إضافة بعض العناصر`);
      }

      // إنشاء كائن الفاتورة للإرجاع
      const createdInvoice: Invoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customerName: invoice.customer_name,
        totalAmount: totals.totalTTC,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        status: invoice.status as any,
        items: items.map((item, idx) => ({
          id: `temp-${idx}`,
          invoiceId: invoice.id,
          name: item.name,
          description: null,
          quantity: item.quantity,
          unitPrice: item.unitPriceTTC,
          totalPrice: item.totalTTC,
          productId: item.productId,
          type: item.type as any,
        })),
        organizationId: invoice.organization_id,
        sourceType: invoice.source_type as any,
        sourceId: '',
        paymentMethod: invoice.payment_method,
        paymentStatus: invoice.payment_status,
        notes: invoice.notes,
        customFields: null,
        taxAmount: totals.subtotalTVA,
        discountAmount: totals.discountAmount,
        subtotalAmount: totals.subtotalHT,
        shippingAmount: shippingAmount,
        customerInfo: (typeof invoice.customer_info === 'string' ? JSON.parse(invoice.customer_info) : invoice.customer_info) as any,
        organizationInfo: (typeof invoice.organization_info === 'string' ? JSON.parse(invoice.organization_info) : invoice.organization_info) as any,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
      };

      toast.success(editingInvoice ? 'تم تحديث الفاتورة بنجاح' : 'تم إنشاء الفاتورة بنجاح');
      onInvoiceCreated(createdInvoice);
      handleClose();
    } catch (error) {
      toast.error(`حدث خطأ أثناء ${editingInvoice ? 'تحديث' : 'إنشاء'} الفاتورة: ${(error as any).message}`);
    } finally {
      setLoading(false);
    }
  };

  // إغلاق النافذة
  const handleClose = () => {
    setCustomerId('');
    setDueDate(undefined);
    setPaymentMethod('cash');
    setStatus('pending');
    setNotes('');
    setItems([]);
    setDiscountType('none');
    setDiscountValue(0);
    setShippingAmount(0);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingInvoice ? `تعديل الفاتورة ${editingInvoice.invoiceNumber}` : 'إنشاء فاتورة جديدة'}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice ? 'قم بتعديل المنتجات وتفاصيل الفاتورة' : 'أضف المنتجات وحدد تفاصيل الفاتورة'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="items" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="items">المنتجات والتفاصيل</TabsTrigger>
                <TabsTrigger value="info">معلومات الفاتورة</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4 mt-4">
                {/* زر إضافة منتجات */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">عناصر الفاتورة</h3>
                  <Button onClick={() => setProductSelectorOpen(true)}>
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة منتجات
                  </Button>
                </div>

                {/* جدول المنتجات */}
                <InvoiceItemsTable
                  items={items}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  tvaRate={tvaRate}
                />

                <Separator />

                {/* التخفيض والشحن */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* التخفيض */}
                  <div className="space-y-3 border rounded-lg p-4">
                    <Label>التخفيض</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون تخفيض</SelectItem>
                          <SelectItem value="percentage">نسبة مئوية</SelectItem>
                          <SelectItem value="fixed">قيمة ثابتة</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {discountType !== 'none' && (
                        <>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                            placeholder={discountType === 'percentage' ? '%' : 'دج'}
                            className="col-span-2"
                          />
                        </>
                      )}
                    </div>
                    {discountType !== 'none' && (
                      <p className="text-sm text-muted-foreground">
                        قيمة التخفيض: {totals.discountAmount.toFixed(2)} دج
                      </p>
                    )}
                  </div>

                  {/* الشحن */}
                  <div className="space-y-3 border rounded-lg p-4">
                    <Label>تكلفة الشحن</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingAmount}
                      onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00 دج"
                    />
                  </div>
                </div>

                {/* ملخص الإجماليات */}
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <h3 className="font-medium">ملخص الفاتورة</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الإجمالي قبل الضريبة (HT):</span>
                      <span className="font-medium">{totals.subtotalHT.toFixed(2)} دج</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الضريبة (TVA {tvaRate}%):</span>
                      <span className="font-medium">{totals.subtotalTVA.toFixed(2)} دج</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الإجمالي شامل الضريبة:</span>
                      <span className="font-medium">{totals.subtotalTTC.toFixed(2)} دج</span>
                    </div>
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>التخفيض:</span>
                        <span>- {totals.discountAmount.toFixed(2)} دج</span>
                      </div>
                    )}
                    {shippingAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>الشحن:</span>
                        <span>+ {shippingAmount.toFixed(2)} دج</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>الإجمالي النهائي (TTC):</span>
                      <span className="text-primary">{totals.totalTTC.toFixed(2)} دج</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* العميل */}
                  <div className="space-y-2">
                    <Label>العميل</Label>
                    <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                          {customerId
                            ? customers.find((c) => c.id === customerId)?.name
                            : 'اختر العميل...'}
                          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-full min-w-[300px]">
                        <Command>
                          <CommandInput placeholder="ابحث عن عميل..." />
                          <CommandEmpty>لم يتم العثور على عميل</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.id}
                                onSelect={() => {
                                  setCustomerId(customer.id);
                                  setCustomerSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'ms-2 h-4 w-4',
                                    customerId === customer.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div>
                                  <p>{customer.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {customer.phone || customer.email}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* تاريخ الاستحقاق */}
                  <div className="space-y-2">
                    <Label>تاريخ الاستحقاق</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-between', !dueDate && 'text-muted-foreground')}
                        >
                          {dueDate ? format(dueDate, 'PPP', { locale: ar }) : 'اختر تاريخ...'}
                          <CalendarIcon className="ms-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ar} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* طريقة الدفع */}
                  <div className="space-y-2">
                    <Label>طريقة الدفع</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="card">بطاقة ائتمان</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* حالة الفاتورة */}
                  <div className="space-y-2">
                    <Label>حالة الفاتورة</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">معلقة</SelectItem>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="overdue">متأخرة</SelectItem>
                        <SelectItem value="canceled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* معدل TVA */}
                  <div className="space-y-2">
                    <Label>معدل الضريبة (TVA %)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={tvaRate}
                      onChange={(e) => setTvaRate(parseFloat(e.target.value) || 19)}
                    />
                  </div>
                </div>

                {/* ملاحظات */}
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    placeholder="أي ملاحظات إضافية للفاتورة (اختياري)"
                    className="h-24"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex justify-between items-center border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={loading || items.length === 0}>
              {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              {editingInvoice ? 'تحديث الفاتورة' : 'إنشاء الفاتورة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة اختيار المنتجات */}
      <ProductSelectorDialog
        open={productSelectorOpen}
        onOpenChange={setProductSelectorOpen}
        products={products}
        onSelectProduct={handleSelectProduct}
      />
    </>
  );
};

export default CreateInvoiceDialogAdvanced;
