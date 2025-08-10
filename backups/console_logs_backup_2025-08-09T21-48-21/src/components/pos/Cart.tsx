import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Order, User, Service } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShop } from '@/context/ShopContext';
import { usePOSOrderFast } from './hooks/usePOSOrderFast';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import { ShoppingCart, Save, Clock, X, Filter, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Separator } from '@/components/ui/separator';

// مكونات السلة الفرعية
import CartItem, { CartItemType } from './CartItem';
import CartService from './CartService';
import CartSubscription from './CartSubscription';
import CartSummary from './CartSummary';
import PaymentDialogOptimized from './PaymentDialogOptimized';
import NewCustomerDialog from './NewCustomerDialog';
import PrintReceiptDialog from './PrintReceiptDialog';
import EmptyCart from './EmptyCart';

interface CartProps {
  cartItems: CartItemType[];
  customers: User[];
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  updateItemPrice?: (index: number, price: number) => void;
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
  selectedSubscriptions?: {
    id: string;
    name?: string;
    final_price?: number;
    selling_price?: number;
    [key: string]: unknown;
  }[];
  removeSubscription?: (subscriptionId: string) => void;
  updateSubscriptionPrice?: (subscriptionId: string, price: number) => void;
  isReturnMode?: boolean;
  returnReason?: string;
  setReturnReason?: (reason: string) => void;
  returnNotes?: string;
  setReturnNotes?: (notes: string) => void;
}

export default function Cart({
  cartItems,
  customers,
  updateItemQuantity,
  removeItemFromCart,
  updateItemPrice,
  clearCart,
  submitOrder,
  currentUser,
  selectedServices = [],
  removeService = () => {},
  updateServicePrice = () => {},
  selectedSubscriptions = [],
  removeSubscription = () => {},
  updateSubscriptionPrice = () => {},
  isReturnMode = false,
  returnReason = '',
  setReturnReason = () => {},
  returnNotes = '',
  setReturnNotes = () => {}
}: CartProps) {
  const { createCustomer } = useShop();
  const { submitOrderFast, isSubmitting } = usePOSOrderFast(currentUser);
  
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
  const [completedSubscriptionAccountInfo, setCompletedSubscriptionAccountInfo] = useState<{
    username?: string;
    email?: string;
    password?: string;
    notes?: string;
  } | undefined>();
  
  // حالة معلومات حساب الاشتراك
  const [subscriptionAccountInfo, setSubscriptionAccountInfo] = useState({
    username: '',
    email: '',
    password: '',
    notes: ''
  });
  
  // وظائف الحساب المحسنة
  const calculateSubtotal = useCallback(() => {
    const productsSubtotal = cartItems.reduce((sum, item) => {
      const price = item.variantPrice !== undefined ? item.variantPrice : item.product.price;
      return sum + (price * item.quantity);
    }, 0);
    
    const servicesSubtotal = selectedServices.reduce((sum, service) => 
      sum + service.price, 0
    );
    
    const subscriptionsSubtotal = selectedSubscriptions.reduce((sum, subscription) => 
      sum + (subscription.final_price || subscription.selling_price || 0), 0
    );
    
    return productsSubtotal + servicesSubtotal + subscriptionsSubtotal;
  }, [cartItems, selectedServices, selectedSubscriptions]);
  
  const subtotal = calculateSubtotal();
  const discountAmount = (discount / 100) * subtotal;
  const tax = 0;
  const total = subtotal - discountAmount + tax;
  
  // حساب التخفيض الفعلي بناءً على المبلغ المدفوع
  const actualDiscountAmount = useMemo(() => {
    if (amountPaid && !isNaN(parseFloat(amountPaid))) {
      const paidAmount = parseFloat(amountPaid);
      if (paidAmount < total && !considerRemainingAsPartial) {
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
        return paidAmount;
      }
    }
    return total;
  }, [amountPaid, total, considerRemainingAsPartial]);
  
  const hasItems = cartItems.length > 0;
  const hasServices = selectedServices.length > 0;
  const hasSubscriptions = selectedSubscriptions.length > 0;
  const isCartEmpty = !hasItems && !hasServices && !hasSubscriptions;
  
  const hasSubscriptionServices = hasSubscriptions;

  // تصفية العملاء المحسنة
  const filteredCustomers = useMemo(() => {
    if (!searchCustomer.trim()) return customers.slice(0, 10);
    
    const searchTerm = searchCustomer.toLowerCase().trim();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(searchTerm) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
  }, [customers, searchCustomer]);

  // تحديث المتغيرات المالية
  useEffect(() => {
    if (amountPaid) {
      const numAmountPaid = parseFloat(amountPaid);
      if (!isNaN(numAmountPaid)) {
        const calculatedChange = Math.max(0, numAmountPaid - finalTotal);
        const calculatedRemaining = Math.max(0, finalTotal - numAmountPaid);
        
        setChange(calculatedChange);
        setRemainingAmount(calculatedRemaining);
        setIsPartialPayment(calculatedRemaining > 0 && numAmountPaid > 0);
      }
    } else {
      setChange(0);
      setRemainingAmount(finalTotal);
      setIsPartialPayment(false);
    }
  }, [amountPaid, finalTotal]);

  const handleRelatedProductClick = (product: Product) => {
    // يمكن إضافة منطق إضافة المنتجات المتعلقة
  };

  // باقي الدوال...
  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setDiscount(0);
    } else if (numValue > 100) {
      setDiscount(100);
    } else {
      setDiscount(numValue);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("اسم العميل مطلوب");
      return;
    }

    setIsAddingCustomer(true);
    try {
      const createdCustomer = await createCustomer(newCustomer);
      
      if (createdCustomer) {
        setSelectedCustomer(createdCustomer);
        toast.success("تم إضافة العميل بنجاح");
        setIsNewCustomerDialogOpen(false);
        setNewCustomer({ name: '', email: '', phone: '' });
        
        // 🔄 تحديث React Query cache للعملاء
        // إشعار النظام بضرورة إعادة تحميل بيانات العملاء
        window.dispatchEvent(new CustomEvent('customers-updated', { 
          detail: { newCustomer: createdCustomer } 
        }));
        
        // إضافة تأخير قصير للتأكد من التحديث
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('customers-updated', { 
            detail: { newCustomer: createdCustomer } 
          }));
        }, 1000);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة العميل");
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // معالجة إتمام الدفع السريعة المحسنة ⚡
  const handlePaymentComplete = useCallback(async () => {
    try {
      if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
        return;
      }

      // التحقق من أن الدفع الجزئي يتطلب اختيار عميل
      if (isPartialPayment && considerRemainingAsPartial && !selectedCustomer && !isReturnMode) {
        toast.error("يجب اختيار عميل لتسجيل المبلغ المتبقي عند اختيار الدفعة الجزئية");
        return;
      }

      // منع التكرار المتعدد
      if (isSubmitting) {
        return;
      }
      
      const numAmountPaid = parseFloat(amountPaid);
      const paymentStatus: 'paid' | 'pending' | 'failed' = (numAmountPaid >= finalTotal || (isPartialPayment && !considerRemainingAsPartial)) ? 'paid' : 'pending';

      // 🚀 تحضير بيانات الطلب بشكل محسن
      const orderDetails = {
        customerId: selectedCustomer?.id || 'guest',
        customer_name: selectedCustomer?.name || 'زائر',
        paymentMethod,
        subtotal,
        discount: actualDiscountAmount,
        total: total, // استخدام المجموع الأصلي قبل التخفيض التلقائي
        status: 'completed' as const,
        paymentStatus,
        notes: isReturnMode 
          ? returnNotes || 'إرجاع مباشر'
          : (isPartialPayment 
            ? (considerRemainingAsPartial 
              ? `${notes} | دفع جزئي: ${numAmountPaid.toFixed(2)} - متبقي: ${remainingAmount.toFixed(2)}` 
              : `${notes} | تخفيض: ${remainingAmount.toFixed(2)} دج`)
            : notes),
        returnReason: isReturnMode ? returnReason : undefined,
        returnNotes: isReturnMode ? returnNotes : undefined,
        employeeId: currentUser?.id || "",
        partialPayment: (isPartialPayment && considerRemainingAsPartial) ? {
          amountPaid: numAmountPaid,
          remainingAmount: remainingAmount
        } : undefined,
        considerRemainingAsPartial: isPartialPayment ? considerRemainingAsPartial : undefined,
        subscriptionAccountInfo: hasSubscriptionServices ? subscriptionAccountInfo : undefined
      };

      // في وضع الإرجاع، استخدام دالة الإرجاع، وإلا استخدام الدالة السريعة
      
      const orderResult = isReturnMode 
        ? await submitOrder(orderDetails)
        : await submitOrderFast(
            orderDetails,
            cartItems,
            selectedServices,
            selectedSubscriptions
          );

      // التحقق من نجاح العملية
      if (!orderResult || !orderResult.orderId) {
        toast.error("فشل في إنشاء الطلب - لم يتم الحصول على معرف طلب صحيح");
        return;
      }

      // استخدام requestAnimationFrame لتحسين الأداء
      requestAnimationFrame(() => {
        // تعيين مؤشر أن الطلب قد تمت معالجته
        setIsOrderProcessed(true);
        
        // حفظ البيانات للطباعة بدون نسخ عميق
        setCompletedItems(cartItems);
        setCompletedServices(selectedServices);
        setCompletedTotal(finalTotal);
        setCompletedSubtotal(subtotal);
        setCompletedDiscount(actualDiscountAmount);
        setCompletedCustomerName(selectedCustomer?.name);
        setCompletedOrderNumber(`POS-${orderResult.customerOrderNumber}`);
        setCompletedOrderDate(new Date());
        setCompletedPaidAmount(numAmountPaid);
        setCompletedRemainingAmount(remainingAmount);
        
        if (hasSubscriptionServices && subscriptionAccountInfo) {
          setCompletedSubscriptionAccountInfo(subscriptionAccountInfo);
        }
        
        // فتح نافذة الطباعة
        setIsPaymentDialogOpen(false);
        setIsPrintDialogOpen(true);
      });

      // 🧹 تنظيف مؤجل للنموذج - فقط بعد نجاح الطلب
      if (orderResult.orderId) {
        requestIdleCallback(() => {
          clearCart();
          setSelectedCustomer(null);
          setNotes('');
          setDiscount(0);
          setAmountPaid('');
        }, { timeout: 100 });
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
      toast.error(errorMessage || "حدث خطأ أثناء إنشاء الطلب");
    }
  }, [
    cartItems,
    selectedServices,
    selectedSubscriptions,
    isPartialPayment,
    considerRemainingAsPartial,
    selectedCustomer,
    isReturnMode,
    returnReason,
    returnNotes,
    isSubmitting,
    amountPaid,

    paymentMethod,
    subtotal,
    actualDiscountAmount,
    finalTotal,
    notes,
    remainingAmount,
    currentUser?.id,
    hasSubscriptionServices,
    subscriptionAccountInfo,
    submitOrder,
    submitOrderFast,
    clearCart
  ]);

  const handlePrintCompleted = () => {
    setIsPrintDialogOpen(false);
    setIsOrderProcessed(false);
    setCompletedItems([]);
    setCompletedServices([]);
    setCompletedTotal(0);
    setCompletedSubtotal(0);
    setCompletedDiscount(0);
    setCompletedCustomerName(undefined);
    setCompletedOrderNumber('');
    setCompletedPaidAmount(0);
    setCompletedRemainingAmount(0);
    setCompletedSubscriptionAccountInfo(undefined);
    setSubscriptionAccountInfo({
      username: '',
      email: '',
      password: '',
      notes: ''
    });
  };

  const handleOpenPaymentDialog = () => {
    if (isCartEmpty) {
      toast.warning(isReturnMode ? "أضف منتجات للإرجاع أولاً" : "أضف منتجات للسلة أولاً");
      return;
    }
    setAmountPaid(total.toString());
    setIsPaymentDialogOpen(true);
  };

  // دوال مساعدة للميزات الإضافية
  const handleApplyCoupon = (code: string) => {
    toast.info(`تم تطبيق كوبون: ${code}`);
  };

  const handleSaveCart = () => {
    toast.success('تم حفظ السلة');
  };

  const handleQuickCheckout = (method: string) => {
    setPaymentMethod(method);
    handleOpenPaymentDialog();
  };

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-lg border",
      "border-border dark:border-border",
      "bg-background dark:bg-background",
      "shadow-sm",
      "h-full flex flex-col"
    )}>
      {/* عنوان السلة المحسن ⚡ */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="px-4 py-3.5 border-b border-border dark:border-border bg-card dark:bg-card backdrop-blur-sm sticky top-0 z-10 shadow-sm flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg shadow-sm ${isReturnMode ? 'bg-orange-100' : 'bg-emerald-100'}`}>
              {isReturnMode ? (
                <RotateCcw className="h-4 w-4 text-orange-500" />
              ) : (
                <Zap className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground dark:text-foreground">
              {isReturnMode ? 'سلة الإرجاع' : 'سلة سريعة ⚡'}
            </h2>
            {isSubmitting && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                معالجة...
              </div>
            )}
          </div>
          
          {!isCartEmpty ? (
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border ${
              isReturnMode ? 
              'bg-orange-100 text-orange-800 border-orange-300' : 
              'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {cartItems.reduce((sum, item) => sum + item.quantity, 0) + selectedServices.length + selectedSubscriptions.length} {isReturnMode ? 'للإرجاع' : 'عنصر'}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground dark:text-muted-foreground">
              {isReturnMode ? 'أضف منتجات للإرجاع' : 'إضافة سريعة للسلة'}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* محتوى السلة */}
      {isCartEmpty ? (
        <EmptyCart 
          onAddProduct={() => {}} 
          isReturnMode={isReturnMode}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ScrollArea className="flex-1 h-full overflow-y-auto">
            <div className="px-3 py-4">
              <motion.div 
                className="space-y-3"
              >
                {/* عناصر المنتجات */}
                {cartItems.map((item, index) => (
                  <CartItem
                    key={`${item.product.id}-${item.colorId || ''}-${item.sizeId || ''}`}
                    item={item}
                    index={index}
                    updateItemQuantity={updateItemQuantity}
                    removeItemFromCart={removeItemFromCart}
                    updateItemPrice={updateItemPrice}
                    canEditPrice={true}
                    relatedProducts={[]}
                    onRelatedProductClick={handleRelatedProductClick}
                  />
                ))}
                
                {/* فاصل بين المنتجات والخدمات */}
                {hasItems && hasServices && (
                  <div className="py-2 my-1">
                    <Separator className="w-full bg-border dark:bg-border" />
                  </div>
                )}
                
                {/* خدمات */}
                {selectedServices.map((service) => (
                  <CartService
                    key={service.id}
                    service={service}
                    customers={customers}
                    removeService={removeService}
                  />
                ))}
                
                {/* فاصل بين الخدمات والاشتراكات */}
                {hasServices && hasSubscriptions && (
                  <div className="py-2 my-1">
                    <Separator className="w-full bg-border dark:bg-border" />
                  </div>
                )}
                
                {/* اشتراكات */}
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
      
      {/* ملخص السلة المحسن */}
      <CartSummary 
        subtotal={subtotal}
        discountAmount={actualDiscountAmount}
        tax={tax}
        total={finalTotal}
        isCartEmpty={isCartEmpty}
        clearCart={clearCart}
        handleOpenPaymentDialog={handleOpenPaymentDialog}
        isProcessing={isSubmitting}
        onApplyCoupon={handleApplyCoupon}
        onSaveCart={handleSaveCart}
        onQuickCheckout={handleQuickCheckout}
        isReturnMode={isReturnMode}
      />
      
      {/* نوافذ حوارية محسنة */}
      <PaymentDialogOptimized
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        isProcessing={isSubmitting}
        customers={customers}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        searchCustomer={searchCustomer}
        setSearchCustomer={setSearchCustomer}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        notes={notes}
        setNotes={setNotes}
        discount={discount}
        handleDiscountChange={handleDiscountChange}
        amountPaid={amountPaid}
        setAmountPaid={setAmountPaid}
        isPartialPayment={isPartialPayment}
        remainingAmount={remainingAmount}
        change={change}
        considerRemainingAsPartial={considerRemainingAsPartial}
        setConsiderRemainingAsPartial={setConsiderRemainingAsPartial}
        subtotal={subtotal}
        discountAmount={actualDiscountAmount}
        tax={tax}
        total={finalTotal}
        handlePaymentComplete={handlePaymentComplete}
        openNewCustomerDialog={() => setIsNewCustomerDialogOpen(true)}
        hasSubscriptionServices={hasSubscriptionServices}
        subscriptionAccountInfo={subscriptionAccountInfo}
        setSubscriptionAccountInfo={setSubscriptionAccountInfo}
        isReturnMode={isReturnMode}
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
        subscriptionAccountInfo={completedSubscriptionAccountInfo}
        onPrintCompleted={handlePrintCompleted}
      />
    </div>
  );
}
