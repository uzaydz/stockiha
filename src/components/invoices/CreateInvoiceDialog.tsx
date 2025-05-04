import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useTenant } from "@/context/TenantContext";
import { getCustomers } from "@/lib/api/customers";
import { getOrders } from "@/lib/api/orders";
import { getProducts } from '@/lib/api/products';
import { getServices } from '@/lib/api/services';
import type { Customer } from "@/types/customer";
import type { Order } from "@/lib/api/orders";
import type { Product } from '@/lib/api/products';
import type { Service } from '@/lib/api/services';
import type { Invoice } from "@/lib/api/invoices";
import { supabase } from "@/lib/supabase";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated: (invoice: Invoice) => void;
  type: "new" | "order" | "online" | "service" | "combined";
}

// نموذج إنشاء الفاتورة الجديدة
const formSchema = z.object({
  customerId: z.string().optional(),
  dueDate: z.date().optional(),
  paymentMethod: z.string(),
  notes: z.string().optional(),
  status: z.string(),
  orderId: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1, "اسم المنتج/الخدمة مطلوب"),
      quantity: z.number().min(1, "الكمية يجب أن تكون 1 على الأقل"),
      unitPrice: z.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
      description: z.string().optional(),
      type: z.string(),
    })
  ).optional(),
});

const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  onInvoiceCreated,
  type,
}: CreateInvoiceDialogProps) => {
  const { currentOrganization } = useTenant();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<boolean[]>([]);
  const [serviceSearchOpen, setServiceSearchOpen] = useState<boolean[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentMethod: "cash",
      status: "pending",
      notes: "",
      items: type === "new" ? [{ name: "", quantity: 1, unitPrice: 0, description: "", type: "product" }] : undefined,
    },
  });

  // جلب بيانات العملاء والطلبات والمنتجات والخدمات
  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization) return;

      try {
        // جلب العملاء
        const customersData = await getCustomers();
        setCustomers(customersData);

        // جلب المنتجات
        const productsData = await getProducts(currentOrganization.id);
        setProducts(productsData);

        // جلب الخدمات
        const servicesData = await getServices(currentOrganization.id);
        setServices(servicesData);

        // جلب الطلبات إذا كان النوع هو "order"
        if (type === "order" || type === "combined") {
          const ordersData = await getOrders(currentOrganization.id);
          // تصفية الطلبات حسب الحالة
          const filteredOrders = ordersData.filter(order => 
            order.status === "completed" || 
            order.status === "delivered" || 
            order.payment_status === "paid"
          );
          setOrders(filteredOrders);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("حدث خطأ أثناء جلب البيانات");
      }
    };

    if (open) {
      fetchData();
    }
  }, [open, currentOrganization, type]);

  // تغيير عنوان النافذة حسب نوع الفاتورة
  const getDialogTitle = () => {
    switch (type) {
      case "new":
        return "إنشاء فاتورة جديدة";
      case "order":
        return "إنشاء فاتورة من طلب نقاط البيع";
      case "online":
        return "إنشاء فاتورة من طلب المتجر الإلكتروني";
      case "service":
        return "إنشاء فاتورة من خدمة";
      case "combined":
        return "إنشاء فاتورة مجمعة";
      default:
        return "إنشاء فاتورة";
    }
  };

  // إضافة عنصر جديد للفاتورة
  const addItem = () => {
    const currentItems = form.getValues("items") || [];
    
    // إضافة حالة للبحث في المنتجات والخدمات
    setProductSearchOpen([...productSearchOpen, false]);
    setServiceSearchOpen([...serviceSearchOpen, false]);
    
    form.setValue("items", [
      ...currentItems,
      { name: "", quantity: 1, unitPrice: 0, description: "", type: "product" },
    ]);
  };

  // حذف عنصر من الفاتورة
  const removeItem = (index: number) => {
    const currentItems = form.getValues("items") || [];
    if (currentItems.length <= 1) return;

    const newItems = [...currentItems];
    newItems.splice(index, 1);
    form.setValue("items", newItems);
    
    // تحديث حالة البحث
    const newProductSearchOpen = [...productSearchOpen];
    const newServiceSearchOpen = [...serviceSearchOpen];
    newProductSearchOpen.splice(index, 1);
    newServiceSearchOpen.splice(index, 1);
    setProductSearchOpen(newProductSearchOpen);
    setServiceSearchOpen(newServiceSearchOpen);
  };

  // إغلاق النافذة وإعادة تعيين النموذج
  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  // معالجة إنشاء الفاتورة
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentOrganization) {
      toast.error("لم يتم العثور على معلومات المؤسسة");
      return;
    }

    setLoading(true);
    try {
      // تحقق من وجود العميل إذا تم تحديده
      let customerId = null;
      if (values.customerId) {
        // التحقق مباشرة من وجود العميل في قاعدة البيانات
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', values.customerId)
          .single();
          
        if (customerError || !customerData) {
          toast.warning("العميل المحدد غير موجود في قاعدة البيانات، سيتم إنشاء الفاتورة كعميل نقدي");
        } else {
          customerId = customerData.id;
        }
      }

      // إنشاء بيانات الفاتورة لإرسالها إلى قاعدة البيانات
      const totalAmount = (values.items || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      const invoiceData = {
        invoice_number: `INV-${Date.now().toString().substring(8, 13)}`,
        customer_name: customerId ? customers.find(c => c.id === customerId)?.name || "عميل نقدي" : "عميل نقدي",
        customer_id: customerId, // استخدام المتغير المتحقق منه
        total_amount: totalAmount,
        invoice_date: new Date().toISOString(),
        due_date: values.dueDate ? values.dueDate.toISOString() : null,
        status: values.status,
        organization_id: currentOrganization.id,
        source_type: type === "new" ? "pos" : type,
        source_id: values.orderId || null,
        payment_method: values.paymentMethod,
        payment_status: values.status === "paid" ? "paid" : "pending",
        notes: values.notes || null,
        tax_amount: 0, // يمكن حسابها بناءً على النسبة المحددة
        discount_amount: 0,
        subtotal_amount: totalAmount,
        shipping_amount: 0,
        customer_info: {
          id: customerId, // استخدام المتغير المتحقق منه
          name: customerId ? customers.find(c => c.id === customerId)?.name || null : "عميل نقدي",
          email: customerId ? customers.find(c => c.id === customerId)?.email || null : null,
          phone: customerId ? customers.find(c => c.id === customerId)?.phone || null : null,
          address: null
        },
        organization_info: {
          name: currentOrganization.name,
          logo: null,
          address: null,
          phone: null,
          email: null,
          website: null,
          taxNumber: null,
          registrationNumber: null,
          additionalInfo: null
        }
      };
      
      // إرسال البيانات إلى قاعدة البيانات باستخدام Supabase
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // إضافة عناصر الفاتورة
      if (values.items && values.items.length > 0) {
        const invoiceItems = values.items.map(item => {
          const unitPrice = Number(item.unitPrice) || 0;
          const quantity = Number(item.quantity) || 0;
          const totalPrice = unitPrice * quantity;
          
          return {
            invoice_id: invoice.id,
            name: item.name,
            description: item.description || null,
            quantity: quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            product_id: item.type === 'product' ? products.find(p => p.name === item.name)?.id || null : null,
            service_id: item.type === 'service' ? services.find(s => s.name === item.name)?.id || null : null,
            type: item.type
          };
        });
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
          
        if (itemsError) {
          console.error('Error adding invoice items:', itemsError);
          toast.error(`تم إنشاء الفاتورة لكن حدث خطأ في إضافة بعض العناصر: ${itemsError.message}`);
        }
      }
      
      // تحويل البيانات من قاعدة البيانات إلى كائن Invoice لإرجاعه
      const createdInvoice: Invoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customerName: invoice.customer_name,
        totalAmount: Number(invoice.total_amount) || 0,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        status: invoice.status as any,
        items: values.items?.map(item => {
          const unitPrice = Number(item.unitPrice) || 0;
          const quantity = Number(item.quantity) || 0;
          const totalPrice = unitPrice * quantity;
          
          return {
            id: Math.random().toString(36).substring(2, 11), // سيتم استبداله بالمعرف الفعلي عند جلب البيانات
            invoiceId: invoice.id,
            name: item.name,
            description: item.description || null,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            type: item.type as any
          };
        }) || [],
        organizationId: invoice.organization_id,
        sourceType: invoice.source_type as any,
        sourceId: invoice.source_id || '',
        paymentMethod: invoice.payment_method,
        paymentStatus: invoice.payment_status,
        notes: invoice.notes,
        customFields: null,
        taxAmount: Number(invoice.tax_amount) || 0,
        discountAmount: Number(invoice.discount_amount) || 0,
        subtotalAmount: Number(invoice.subtotal_amount) || 0,
        shippingAmount: Number(invoice.shipping_amount) || 0,
        customerInfo: invoice.customer_info,
        organizationInfo: invoice.organization_info,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      };

      toast.success("تم إنشاء الفاتورة بنجاح");
      onInvoiceCreated(createdInvoice);
      handleClose();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error(`حدث خطأ أثناء إنشاء الفاتورة: ${(error as any).message || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            قم بإدخال بيانات الفاتورة والمنتجات أو الخدمات المتضمنة فيها.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* اختيار العميل */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>العميل</FormLabel>
                    <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={customerSearchOpen}
                            className="justify-between"
                          >
                            {field.value
                              ? customers.find((customer) => customer.id === field.value)?.name
                              : "اختر العميل..."}
                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
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
                                  form.setValue("customerId", customer.id);
                                  setCustomerSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "ms-2 h-4 w-4",
                                    field.value === customer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {customer.phone || customer.email}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      اختر العميل المرتبط بالفاتورة أو اتركه فارغاً للعملاء النقديين
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* تاريخ الاستحقاق */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الاستحقاق</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "justify-between text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ar })
                            ) : (
                              <span>اختر تاريخ...</span>
                            )}
                            <CalendarIcon className="ms-2 h-4 w-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ar}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      تاريخ استحقاق الدفع (اختياري)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* طريقة الدفع */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طريقة الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="card">بطاقة ائتمان</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* حالة الفاتورة */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الفاتورة</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة الفاتورة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">معلقة</SelectItem>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="overdue">متأخرة</SelectItem>
                        <SelectItem value="canceled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* اختيار الطلب في حالة إنشاء فاتورة من طلب */}
              {(type === "order" || type === "combined") && (
                <FormField
                  control={form.control}
                  name="orderId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>الطلب</FormLabel>
                      <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={orderSearchOpen}
                              className="justify-between"
                            >
                              {field.value
                                ? orders.find((order) => order.id === field.value)?.id.substring(0, 8) + "..."
                                : "اختر الطلب..."}
                              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-full min-w-[300px]">
                          <Command>
                            <CommandInput placeholder="ابحث عن طلب..." />
                            <CommandEmpty>لم يتم العثور على طلب</CommandEmpty>
                            <CommandGroup>
                              {orders.map((order) => (
                                <CommandItem
                                  key={order.id}
                                  value={order.id}
                                  onSelect={() => {
                                    form.setValue("orderId", order.id);
                                    setOrderSearchOpen(false);
                                    
                                    // Populate invoice items from the selected order
                                    if (type === "order" || type === "online") {
                                      // Get order items
                                      const fetchOrderItems = async () => {
                                        try {
                                          toast.loading("جاري جلب عناصر الطلب...");
                                          
                                          let orderItems;
                                          if (type === "order") {
                                            const { data: items } = await supabase
                                              .from('order_items')
                                              .select('*')
                                              .eq('order_id', order.id);
                                            orderItems = items;
                                          } else if (type === "online") {
                                            const { data: items } = await supabase
                                              .from('online_order_items')
                                              .select('*')
                                              .eq('order_id', order.id);
                                            orderItems = items;
                                          }
                                          
                                          toast.dismiss();
                                          
                                          if (orderItems && orderItems.length > 0) {
                                            // Convert order items to invoice items format
                                            const invoiceItems = orderItems.map(item => ({
                                              name: item.product_name || item.name || 'منتج',
                                              quantity: Number(item.quantity) || 1,
                                              unitPrice: Number(item.unit_price) || 0,
                                              description: '',
                                              type: 'product'
                                            }));
                                            
                                            // Set the invoice items in the form
                                            form.setValue("items", invoiceItems);
                                            
                                            // Update product and service search arrays
                                            setProductSearchOpen(Array(invoiceItems.length).fill(false));
                                            setServiceSearchOpen(Array(invoiceItems.length).fill(false));
                                            
                                            toast.success("تم جلب عناصر الطلب بنجاح");
                                          } else {
                                            toast.warning("لم يتم العثور على عناصر للطلب");
                                          }
                                        } catch (error) {
                                          console.error("Error fetching order items:", error);
                                          toast.error("حدث خطأ أثناء جلب عناصر الطلب");
                                        }
                                      };
                                      
                                      fetchOrderItems();
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "ms-2 h-4 w-4",
                                      field.value === order.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>
                                      طلب #{order.id.substring(0, 8)}...
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      المبلغ: {order.total} | التاريخ:{" "}
                                      {order.created_at
                                        ? format(
                                            new Date(order.created_at),
                                            "dd/MM/yyyy",
                                            { locale: ar }
                                          )
                                        : "غير معروف"}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        اختر الطلب الذي تريد إنشاء فاتورة له
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* إضافة عناصر الفاتورة - يظهر فقط في حالة الفاتورة الجديدة */}
            {type === "new" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">عناصر الفاتورة</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addItem}
                  >
                    إضافة عنصر
                  </Button>
                </div>

                {/* عناصر الفاتورة */}
                <div className="space-y-4">
                  {form.watch("items")?.map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-md relative"
                    >
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المنتج/الخدمة</FormLabel>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <FormControl>
                                  <Select
                                    value={form.getValues(`items.${index}.type`)}
                                    onValueChange={(value) => {
                                      form.setValue(`items.${index}.type`, value);
                                      // إعادة تعيين اسم المنتج عند تغيير النوع
                                      form.setValue(`items.${index}.name`, "");
                                      form.setValue(`items.${index}.unitPrice`, 0);
                                    }}
                                  >
                                    <SelectTrigger className="w-[100px]">
                                      <SelectValue placeholder="النوع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="product">منتج</SelectItem>
                                      <SelectItem value="service">خدمة</SelectItem>
                                      <SelectItem value="fee">رسوم</SelectItem>
                                      <SelectItem value="discount">خصم</SelectItem>
                                      <SelectItem value="other">أخرى</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>

                                {form.getValues(`items.${index}.type`) === "product" ? (
                                  <div className="flex-1">
                                    <Popover 
                                      open={productSearchOpen[index]} 
                                      onOpenChange={(open) => {
                                        const newState = [...productSearchOpen];
                                        newState[index] = open;
                                        setProductSearchOpen(newState);
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                          >
                                            {field.value
                                              ? products.find((product) => product.name === field.value)?.name || field.value
                                              : "اختر منتج..."}
                                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-0 w-full min-w-[300px]">
                                        <Command>
                                          <CommandInput placeholder="ابحث عن منتج..." />
                                          <CommandEmpty>لم يتم العثور على منتج</CommandEmpty>
                                          <CommandGroup>
                                            {products.map((product) => (
                                              <CommandItem
                                                key={product.id}
                                                value={product.name}
                                                onSelect={() => {
                                                  form.setValue(`items.${index}.name`, product.name);
                                                  form.setValue(`items.${index}.unitPrice`, Number(product.price));
                                                  const newState = [...productSearchOpen];
                                                  newState[index] = false;
                                                  setProductSearchOpen(newState);
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "ms-2 h-4 w-4",
                                                    field.value === product.name ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                <div className="flex flex-col">
                                                  <span>{product.name}</span>
                                                  <span className="text-xs text-muted-foreground">
                                                    السعر: {product.price} | المخزون: {product.stock_quantity}
                                                  </span>
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                ) : form.getValues(`items.${index}.type`) === "service" ? (
                                  <div className="flex-1">
                                    <Popover 
                                      open={serviceSearchOpen[index]} 
                                      onOpenChange={(open) => {
                                        const newState = [...serviceSearchOpen];
                                        newState[index] = open;
                                        setServiceSearchOpen(newState);
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                          >
                                            {field.value
                                              ? services.find((service) => service.name === field.value)?.name || field.value
                                              : "اختر خدمة..."}
                                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-0 w-full min-w-[300px]">
                                        <Command>
                                          <CommandInput placeholder="ابحث عن خدمة..." />
                                          <CommandEmpty>لم يتم العثور على خدمة</CommandEmpty>
                                          <CommandGroup>
                                            {services.map((service) => (
                                              <CommandItem
                                                key={service.id}
                                                value={service.name}
                                                onSelect={() => {
                                                  form.setValue(`items.${index}.name`, service.name);
                                                  form.setValue(`items.${index}.unitPrice`, Number(service.price));
                                                  const newState = [...serviceSearchOpen];
                                                  newState[index] = false;
                                                  setServiceSearchOpen(newState);
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "ms-2 h-4 w-4",
                                                    field.value === service.name ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                <div className="flex flex-col">
                                                  <span>{service.name}</span>
                                                  <span className="text-xs text-muted-foreground">
                                                    السعر: {service.price}
                                                  </span>
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                ) : (
                                  <FormControl>
                                    <Input 
                                      placeholder={
                                        form.getValues(`items.${index}.type`) === "fee" ? "اسم الرسوم" :
                                        form.getValues(`items.${index}.type`) === "discount" ? "اسم الخصم" :
                                        "اسم العنصر"
                                      } 
                                      {...field} 
                                    />
                                  </FormControl>
                                )}
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الكمية</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value, 10))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>السعر</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>الوصف</FormLabel>
                            <FormControl>
                              <Input placeholder="وصف إضافي (اختياري)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="mb-2"
                          disabled={form.watch("items")?.length <= 1}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أي ملاحظات إضافية للفاتورة (اختياري)"
                      className="h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-between items-center">
              <Button type="button" variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                {type === "new" ? "إنشاء الفاتورة" : "إنشاء فاتورة من المصدر"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceDialog; 