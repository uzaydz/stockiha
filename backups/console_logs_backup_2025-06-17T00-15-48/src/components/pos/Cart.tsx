import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Order, User, Service } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShop } from '@/context/ShopContext';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import { ShoppingCart, Search, Save, Clock, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// مكونات السلة الفرعية
import CartItem, { CartItemType } from './CartItem';
import CartService from './CartService';
import CartSubscription from './CartSubscription';
import CartSummary from './CartSummary';
import PaymentDialog from './PaymentDialog';
import NewCustomerDialog from './NewCustomerDialog';
import PrintReceiptDialog from './PrintReceiptDialog';
import EmptyCart from './EmptyCart';

interface CartProps {
  cartItems: CartItemType[];
  customers: User[];
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  clearCart: () => void;
  submitOrder: (order: Partial<Order>) => Promise<{orderId: string, customerOrderNumber: number}>;
  currentUser: User | null;
  selectedServices?: (Service & { 
    scheduledDate?: Date; 
    notes?: string; 
    customerId?: string;
    public_tracking_code?: string; 
  })[];
  removeService?: (serviceId: string) => void;
  updateServicePrice?: (serviceId: string, price: number) => void;
  selectedSubscriptions?: any[];
  removeSubscription?: (subscriptionId: string) => void;
  updateSubscriptionPrice?: (subscriptionId: string, price: number) => void;
}

export default function Cart({
  cartItems,
  customers,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  submitOrder,
  currentUser,
  selectedServices = [],
  removeService = () => {},
  updateServicePrice = () => {},
  selectedSubscriptions = [],
  removeSubscription = () => {},
  updateSubscriptionPrice = () => {}
}: CartProps) {
  const { createCustomer } = useShop();
  
  // حالة العميل والدفع
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [change, setChange] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [considerRemainingAsPartial, setConsiderRemainingAsPartial] = useState(true);
  
  // حالة النوافذ الحوارية
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isOrderProcessed, setIsOrderProcessed] = useState(false);
  
  // حالة العميل الجديد
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  
  // حالة الطلب المكتمل
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string>('');
  const [completedOrderDate, setCompletedOrderDate] = useState<Date>(new Date());
  const [completedItems, setCompletedItems] = useState<CartItemType[]>([]);
  const [completedServices, setCompletedServices] = useState<(Service & { 
    scheduledDate?: Date; 
    notes?: string;
    service_booking_id?: string;
    public_tracking_code?: string;
  })[]>([]);
  const [completedTotal, setCompletedTotal] = useState<number>(0);
  const [completedSubtotal, setCompletedSubtotal] = useState<number>(0);
  const [completedDiscount, setCompletedDiscount] = useState<number>(0);
  const [completedCustomerName, setCompletedCustomerName] = useState<string | undefined>();
  const [completedPaidAmount, setCompletedPaidAmount] = useState<number>(0);
  const [completedRemainingAmount, setCompletedRemainingAmount] = useState<number>(0);
  
  // ميزات جديدة
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [savedCarts, setSavedCarts] = useState<{id: string, name: string, items: CartItemType[]}[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Record<string, Product[]>>({});
  const [showRelatedProducts, setShowRelatedProducts] = useState(false);
  
  // وظائف الحساب
  const calculateSubtotal = useCallback(() => {
    // حساب المجموع الفرعي للمنتجات
    const productsSubtotal = cartItems.reduce((sum, item) => {
      const price = item.variantPrice !== undefined ? item.variantPrice : item.product.price;
      return sum + (price * item.quantity);
    }, 0);
    
    // حساب المجموع الفرعي للخدمات
    const servicesSubtotal = selectedServices.reduce((sum, service) => 
      sum + service.price, 0
    );
    
    // حساب المجموع الفرعي للاشتراكات
    const subscriptionsSubtotal = selectedSubscriptions.reduce((sum, subscription) => 
      sum + (subscription.final_price || subscription.selling_price || 0), 0
    );
    
    return productsSubtotal + servicesSubtotal + subscriptionsSubtotal;
  }, [cartItems, selectedServices, selectedSubscriptions]);
  
  const subtotal = calculateSubtotal();
  const discountAmount = (discount / 100) * subtotal;
  const tax = 0; // الضريبة صفر
  const total = subtotal - discountAmount + tax;
  
  // حساب التخفيض الفعلي بناءً على المبلغ المدفوع
  const actualDiscountAmount = useMemo(() => {
    if (amountPaid && !isNaN(parseFloat(amountPaid))) {
      const paidAmount = parseFloat(amountPaid);
      if (paidAmount < total && !considerRemainingAsPartial) {
        // إذا كان المبلغ المدفوع أقل ولم يتم اعتباره دفعة جزئية، فهو تخفيض
        return total - paidAmount;
      }
    }
    return discountAmount;
  }, [amountPaid, total, considerRemainingAsPartial, discountAmount]);
  
  // المجموع النهائي بعد التخفيض الفعلي
  const finalTotal = useMemo(() => {
    if (amountPaid && !isNaN(parseFloat(amountPaid))) {
      const paidAmount = parseFloat(amountPaid);
      if (paidAmount < total && !considerRemainingAsPartial) {
        // إذا كان تخفيض، المجموع النهائي هو المبلغ المدفوع
        return paidAmount;
      }
    }
    return total;
  }, [amountPaid, total, considerRemainingAsPartial]);
  
  const hasItems = cartItems.length > 0;
  const hasServices = selectedServices.length > 0;
  const hasSubscriptions = selectedSubscriptions.length > 0;
  const isCartEmpty = !hasItems && !hasServices && !hasSubscriptions;
  
  // البحث عن عناصر السلة
  const filteredCartItems = useCallback(() => {
    if (!searchQuery || !hasItems) return cartItems;
    
    const query = searchQuery.toLowerCase();
    return cartItems.filter(item => 
      item.product.name.toLowerCase().includes(query) || 
      (item.product.barcode && item.product.barcode.includes(query)) ||
      (item.colorName && item.colorName.toLowerCase().includes(query)) ||
      (item.sizeName && item.sizeName.toLowerCase().includes(query))
    );
  }, [cartItems, searchQuery, hasItems]);
  
  // الحصول على منتجات متعلقة (يمكن استبدالها بطلب API حقيقي)
  useEffect(() => {
    if (hasItems && showRelatedProducts) {
      // محاكاة طلب المنتجات المتعلقة
      const mockRelatedProducts: Record<string, Product[]> = {};
      
      cartItems.forEach(item => {
        if (!relatedProducts[item.product.id]) {
          // استخدام نفس منتجات السلة للمحاكاة
          mockRelatedProducts[item.product.id] = cartItems
            .filter(otherItem => otherItem.product.id !== item.product.id)
            .map(item => item.product)
            .slice(0, 3);
        }
      });
      
      setRelatedProducts(prev => ({...prev, ...mockRelatedProducts}));
    }
  }, [cartItems, hasItems, showRelatedProducts]);
  
  // معالجة النقر على منتج مشابه
  const handleRelatedProductClick = (product: Product) => {
    // يمكن هنا إضافة المنتج للسلة أو عرض تفاصيله
    toast.success(`تم اختيار المنتج: ${product.name}`, {
      description: "يمكنك إضافته للسلة الآن"
    });
  };
  
  // حفظ السلة للاستخدام لاحقًا
  const handleSaveCart = () => {
    if (isCartEmpty) return;
    
    const cartName = `سلة مؤقتة - ${new Date().toLocaleDateString('ar-EG')}`;
    const newSavedCart = {
      id: Date.now().toString(),
      name: cartName,
      items: [...cartItems]
    };
    
    setSavedCarts(prev => [newSavedCart, ...prev]);
    toast.success("تم حفظ السلة بنجاح", {
      description: "يمكنك استعادتها لاحقًا"
    });
  };
  
  // تطبيق كوبون خصم
  const handleApplyCoupon = (code: string) => {
    // يمكن هنا عمل طلب API للتحقق من الكوبون
    const randomDiscount = Math.floor(Math.random() * 15) + 5; // نسبة خصم عشوائية من 5 إلى 20%
    setDiscount(randomDiscount);
    
    toast.success(`تم تطبيق الكوبون: ${code}`, {
      description: `خصم ${randomDiscount}% على طلبك`
    });
  };
  
  // الدفع السريع
  const handleQuickCheckout = (method: string) => {
    setPaymentMethod(method);
    handleOpenPaymentDialog();
  };
  
  // معالجة حدث مسح البحث
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
  };
  
  // الخاصية المضافة للتأثيرات الحركية
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      } 
    }
  };
  
  // تصفية العملاء حسب البحث
  const filteredCustomers = useCallback(() => {
    if (!searchCustomer.trim()) return customers;
    
    const searchTermLower = searchCustomer.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTermLower) ||
      (customer.email && customer.email.toLowerCase().includes(searchTermLower)) ||
      (customer.phone && customer.phone.includes(searchTermLower))
    );
  }, [customers, searchCustomer]);
  
  // تحديث حالة الدفع الجزئي
  useEffect(() => {
    if (amountPaid && total > 0) {
      const numAmountPaid = parseFloat(amountPaid);
      
      if (!isNaN(numAmountPaid)) {
        if (numAmountPaid < total) {
          setIsPartialPayment(true);
          setRemainingAmount(total - numAmountPaid);
          setChange(0);
        } else {
          setIsPartialPayment(false);
          setRemainingAmount(0);
          setChange(numAmountPaid - total);
        }
      }
    } else {
      setIsPartialPayment(false);
      setRemainingAmount(0);
      setChange(0);
    }
  }, [amountPaid, total]);
  
  // إعادة تعيين المبلغ المدفوع عند تغيير طريقة الدفع
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setAmountPaid(total.toString());
    } else {
      // اعتبر أن الدفع الإلكتروني يتم بالكامل
      setAmountPaid(total.toString());
      setIsPartialPayment(false);
    }
  }, [paymentMethod, total]);
  
  // معالجة تغيير قيمة الخصم
  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setDiscount(0);
    } else if (numValue >= 0 && numValue <= 100) {
      setDiscount(numValue);
    }
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
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone
      });
      
      setSelectedCustomer(customer);
      setNewCustomer({ name: '', email: '', phone: '' });
      setIsNewCustomerDialogOpen(false);
      
      toast.success("تم إضافة العميل بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة العميل");
    } finally {
      setIsAddingCustomer(false);
    }
  };
  
  // معالجة إتمام الدفع
  const handlePaymentComplete = async () => {
    try {
      setIsProcessing(true);
      
      if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
        return;
      }

      // التحقق من أن الدفع الجزئي يتطلب اختيار عميل (فقط إذا تم اعتباره دفعة جزئية)
      if (isPartialPayment && considerRemainingAsPartial && !selectedCustomer) {
        toast.error("يجب اختيار عميل لتسجيل المبلغ المتبقي عند اختيار الدفعة الجزئية");
        setIsProcessing(false);
        return;
      }
      
      const numAmountPaid = parseFloat(amountPaid);
      // تحديد حالة الدفع بناءً على المبلغ المدفوع والمجموع الكلي
      // إذا كان الفرق تخفيض وليس دفعة جزئية، اعتبر الطلب مدفوع
      const paymentStatus = (numAmountPaid >= total || (isPartialPayment && !considerRemainingAsPartial)) ? 'paid' : 'pending';

      // تخزين القيم الحالية للمتغيرات المالية قبل إرسال الطلب
      const currentTotal = finalTotal;
      const currentSubtotal = subtotal;
      const currentDiscount = actualDiscountAmount;
      
      // تسجيل البيانات للتحقق
      
      // إرسال الطلب إلى الخادم
      const orderResult = await submitOrder({
        customerId: selectedCustomer?.id || 'guest',
        paymentMethod,
        subtotal: currentSubtotal,
        discount: currentDiscount,
        total: currentTotal, // المجموع النهائي بعد الخصم
        status: 'completed',
        paymentStatus: paymentStatus,
        notes: isPartialPayment 
          ? (considerRemainingAsPartial 
            ? `${notes} | دفع جزئي: ${numAmountPaid.toFixed(2)} - متبقي: ${remainingAmount.toFixed(2)}` 
            : `${notes} | تخفيض: ${remainingAmount.toFixed(2)} دج`)
          : notes,
        isOnline: false,
        employeeId: currentUser?.id || "",
        partialPayment: (isPartialPayment && considerRemainingAsPartial) ? {
          amountPaid: numAmountPaid,
          remainingAmount: remainingAmount
        } : undefined,
        considerRemainingAsPartial: isPartialPayment ? considerRemainingAsPartial : undefined
      });

      // تعيين مؤشر أن الطلب قد تمت معالجته لتجنب تكرار التنفيذ
      setIsOrderProcessed(true);
      
      // حفظ البيانات المطلوبة للطباعة
      setCompletedItems([...cartItems]);
      setCompletedServices([...selectedServices]);
      setCompletedTotal(currentTotal);
      setCompletedSubtotal(currentSubtotal);
      setCompletedDiscount(currentDiscount);
      setCompletedCustomerName(selectedCustomer?.name);
      // استخدام معرف الطلبية الفعلي المُرجع من الخادم
      setCompletedOrderNumber(orderResult.customerOrderNumber.toString());
      setCompletedOrderDate(new Date());
      setCompletedPaidAmount(numAmountPaid);
      setCompletedRemainingAmount(remainingAmount);
      
      // فتح نافذة الطباعة
      setIsPaymentDialogOpen(false);
      setIsPrintDialogOpen(true);
      setIsProcessing(false);
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء الطلب");
      setIsProcessing(false);
    }
  };
  
  const handlePrintCompleted = () => {
    // إغلاق نافذة الطباعة ومسح السلة
    setIsPrintDialogOpen(false);
    clearCart();
    setIsOrderProcessed(false);
    
    // إعادة تعيين المتغيرات
    setSelectedCustomer(null);
    setDiscount(0);
    setNotes('');
    setAmountPaid('');
    setIsPartialPayment(false);
    setRemainingAmount(0);
    
    // إعادة تعيين بيانات الطلب المكتمل
    setCompletedPaidAmount(0);
    setCompletedRemainingAmount(0);
    
    // عرض رسالة نجاح
    toast.success("تم إنشاء الطلب بنجاح");
  };
  
  const handleOpenPaymentDialog = () => {
    if (isCartEmpty) {
      toast.error("لا يمكن إتمام طلب فارغ");
      return;
    }
    
    setAmountPaid(total.toString());
    setIsPaymentDialogOpen(true);
  };

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-lg border",
      "border-border dark:border-zinc-800",
      "bg-background dark:bg-zinc-950",
      "shadow-sm",
      // التكيف مع حجم المحتوى
      "h-full flex flex-col"
    )}>
      {/* عنوان السلة - تحسين التصميم مع إضافة ظل خفيف */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="px-4 py-3.5 border-b border-border dark:border-zinc-800 bg-background dark:bg-zinc-900/50 sticky top-0 z-10 shadow-sm flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 dark:bg-primary/5 p-1.5 rounded-md">
              <ShoppingCart className="h-4 w-4 text-primary dark:text-primary/90" />
            </div>
            <h2 className="text-base font-medium text-foreground dark:text-zinc-200">
              سلة المشتريات
            </h2>
          </div>
          
          {!isCartEmpty ? (
            <div className="bg-primary/10 dark:bg-primary/5 text-primary dark:text-primary/90 text-xs font-medium px-2.5 py-1 rounded-full">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0) + selectedServices.length + selectedSubscriptions.length} عنصر
            </div>
          ) : (
            <div className="text-xs text-muted-foreground dark:text-zinc-500">
              إضافة منتجات للسلة
            </div>
          )}
        </div>
        
        {/* شريط البحث - يظهر فقط عندما تكون السلة تحتوي على منتجات */}
        {hasItems && (
          <div className="relative px-0 py-2.5 mt-2.5 border-t dark:border-zinc-800/70">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="البحث في السلة..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchActive(e.target.value.length > 0);
              }}
              className="text-xs pl-3 pr-8 h-8 bg-muted/50 dark:bg-zinc-800/50 border border-border/30 focus:border-primary/30 dark:border-zinc-700/30 rounded-md"
            />
          </div>
        )}
      </motion.div>
      
      {/* محتوى السلة - محسن مع مساحات أفضل ورسائل واضحة */}
      {isCartEmpty ? (
        <EmptyCart onAddProduct={() => {}} />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ScrollArea className="flex-1 h-full overflow-y-auto">
            <div className="px-3 py-4">
              <motion.div 
                className="space-y-3"
              >
                {/* عناصر المنتجات - تمت إضافة تأثيرات لتحسين التجربة */}
                {filteredCartItems().map((item, index) => (
                  <CartItem
                    key={`${item.product.id}-${item.colorId || ''}-${item.sizeId || ''}`}
                    item={item}
                    index={index}
                    updateItemQuantity={updateItemQuantity}
                    removeItemFromCart={removeItemFromCart}
                    relatedProducts={[]}
                    onRelatedProductClick={handleRelatedProductClick}
                  />
                ))}
                
                {/* رسالة عدم وجود نتائج بحث محسنة */}
                {filteredCartItems().length === 0 && searchQuery && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-accent/30 dark:bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <Search className="h-7 w-7 text-muted-foreground dark:text-zinc-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground dark:text-zinc-300 mb-1">
                      لا توجد منتجات تطابق البحث
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-zinc-400 mb-3">
                      لم نتمكن من العثور على أي منتجات تطابق "{searchQuery}"
                    </p>
                    <button
                      className="text-xs text-primary dark:text-primary/90 bg-primary/10 dark:bg-primary/5 px-3 py-1.5 rounded-full font-medium"
                      onClick={handleClearSearch}
                    >
                      مسح البحث
                    </button>
                  </div>
                )}
                
                {/* فاصل بين المنتجات والخدمات إذا كان هناك كلا النوعين */}
                {hasItems && hasServices && (
                  <div className="py-2 my-1">
                    <Separator className="w-full opacity-30" />
                  </div>
                )}
                
                {/* خدمات - تحسين تنسيق الخدمات */}
                {selectedServices.map((service) => (
                  <CartService
                    key={service.id}
                    service={service}
                    customers={customers}
                    removeService={removeService}
                  />
                ))}
                
                {/* فاصل بين الخدمات والاشتراكات إذا كان هناك كلا النوعين */}
                {hasServices && hasSubscriptions && (
                  <div className="py-2 my-1">
                    <Separator className="w-full opacity-30" />
                  </div>
                )}
                
                {/* اشتراكات - عرض خدمات الاشتراك */}
                {selectedSubscriptions.map((subscription) => (
                  <CartSubscription
                    key={subscription.id}
                    subscription={subscription}
                    onRemove={removeSubscription}
                    onUpdatePrice={updateSubscriptionPrice}
                  />
                ))}
              </motion.div>
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* ملخص السلة - تم تحسين العرض */}
      <CartSummary 
        subtotal={subtotal}
        discountAmount={actualDiscountAmount}
        tax={tax}
        total={finalTotal}
        isCartEmpty={isCartEmpty}
        clearCart={clearCart}
        handleOpenPaymentDialog={handleOpenPaymentDialog}
        isProcessing={isProcessing}
        onApplyCoupon={handleApplyCoupon}
        onSaveCart={handleSaveCart}
        onQuickCheckout={handleQuickCheckout}
      />
      
      {/* نوافذ حوارية */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        customers={customers}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        searchCustomer={searchCustomer}
        setSearchCustomer={setSearchCustomer}
        notes={notes}
        setNotes={setNotes}
        discount={discount}
        handleDiscountChange={handleDiscountChange}
        amountPaid={amountPaid}
        setAmountPaid={setAmountPaid}
        change={change}
        remainingAmount={remainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        setConsiderRemainingAsPartial={setConsiderRemainingAsPartial}
        subtotal={subtotal}
        discountAmount={actualDiscountAmount}
        tax={tax}
        total={finalTotal}
        handlePaymentComplete={handlePaymentComplete}
        openNewCustomerDialog={() => setIsNewCustomerDialogOpen(true)}
        isProcessing={isProcessing}
        filteredCustomers={filteredCustomers}
      />
      
      <NewCustomerDialog
        isOpen={isNewCustomerDialogOpen}
        onOpenChange={setIsNewCustomerDialogOpen}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        handleAddCustomer={handleAddCustomer}
        isAddingCustomer={isAddingCustomer}
      />
      
      <PrintReceiptDialog
        isOpen={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        orderNumber={completedOrderNumber}
        orderDate={completedOrderDate}
        completedItems={completedItems}
        completedServices={completedServices}
        completedTotal={completedTotal}
        completedSubtotal={completedSubtotal}
        completedDiscount={completedDiscount}
        completedDiscountAmount={actualDiscountAmount}
        completedCustomerName={completedCustomerName}
        completedPaidAmount={completedPaidAmount}
        completedRemainingAmount={completedRemainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        onPrintCompleted={handlePrintCompleted}
      />
    </div>
  );
}
