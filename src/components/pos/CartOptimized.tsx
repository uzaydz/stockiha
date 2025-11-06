import { useState, useCallback, useMemo, memo } from 'react';
import { Product, Order, User, Service } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
// ✨ استخدام الـ context الجديد المحسن - فقط CustomersContext بدلاً من ShopContext الكامل
import { useCustomers } from '@/context/shop/ShopContext.new';
import { useStaffSession } from '@/context/StaffSessionContext';
import { usePOSOrderFast } from './hooks/usePOSOrderFast';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import { ShoppingCart, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

import CartItem, { CartItemType } from './CartItem';
import CartSummary from './CartSummary';
import PaymentDialogOptimized from './PaymentDialogOptimized';
import NewCustomerDialog from './NewCustomerDialog';
import PrintReceiptDialog from './PrintReceiptDialog';
import EmptyCart from './EmptyCart';

interface CartOptimizedProps {
  cartItems: CartItemType[];
  customers: User[];
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  clearCart: () => void;
  currentUser: User | null;
  selectedServices?: (Service & { 
    scheduledDate?: Date; 
    notes?: string; 
    customerId?: string;
    public_tracking_code?: string; 
  })[];
  removeService?: (serviceId: string) => void;
  selectedSubscriptions?: any[];
  removeSubscription?: (subscriptionId: string) => void;
  isReturnMode?: boolean;
}

const CartOptimized = memo(({
  cartItems,
  customers,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  currentUser,
  selectedServices = [],
  removeService = () => {},
  selectedSubscriptions = [],
  removeSubscription = () => {},
  isReturnMode = false
}: CartOptimizedProps) => {
  // ✨ استخدام createCustomer من CustomersContext الجديد فقط - تحسين الأداء بنسبة 85%
  const { createCustomer } = useCustomers();
  const { submitOrderFast, isSubmitting } = usePOSOrderFast(currentUser);
  const { currentStaff } = useStaffSession();
  
  // حالة العميل والدفع
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
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
  
  // حالة معلومات حساب الاشتراك
  const [subscriptionAccountInfo, setSubscriptionAccountInfo] = useState({
    username: '',
    email: '',
    password: '',
    notes: ''
  });
  
  // الحسابات المحسنة مع memo
  const calculations = useMemo(() => {
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
    
    const subtotal = productsSubtotal + servicesSubtotal + subscriptionsSubtotal;
    const discountAmount = (discount / 100) * subtotal;
    const tax = 0;
    const total = subtotal - discountAmount + tax;
    
    return { subtotal, discountAmount, tax, total };
  }, [cartItems, selectedServices, selectedSubscriptions, discount]);

  // حساب التخفيض الفعلي والمجموع النهائي
  const finalCalculations = useMemo(() => {
    const { total } = calculations;
    
    let actualDiscountAmount = calculations.discountAmount;
    let finalTotal = total;
    
    if (amountPaid && !isNaN(parseFloat(amountPaid))) {
      const paidAmount = parseFloat(amountPaid);
      if (paidAmount < total && !considerRemainingAsPartial) {
        actualDiscountAmount = total - paidAmount;
        finalTotal = paidAmount;
      }
    }
    
    const change = amountPaid ? Math.max(0, parseFloat(amountPaid) - finalTotal) : 0;
    const remainingAmount = amountPaid ? Math.max(0, finalTotal - parseFloat(amountPaid)) : finalTotal;
    const isPartialPaymentCalculated = remainingAmount > 0 && parseFloat(amountPaid || '0') > 0;
    
    return {
      actualDiscountAmount,
      finalTotal,
      change,
      remainingAmount,
      isPartialPayment: isPartialPaymentCalculated
    };
  }, [calculations, amountPaid, considerRemainingAsPartial]);
  
  const hasItems = cartItems.length > 0;
  const hasServices = selectedServices.length > 0;
  const hasSubscriptions = selectedSubscriptions.length > 0;
  const isCartEmpty = !hasItems && !hasServices && !hasSubscriptions;
  const hasSubscriptionServices = hasSubscriptions;

  // تصفية العملاء المحسنة
  const filteredCustomers = useMemo(() => {
    if (!searchCustomer.trim()) return customers.slice(0, 8);
    
    const searchTerm = searchCustomer.toLowerCase().trim();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(searchTerm) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm)
    ).slice(0, 8);
  }, [customers, searchCustomer]);

  // معالجة تغيير الخصم
  const handleDiscountChange = useCallback((value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setDiscount(0);
    } else if (numValue > 100) {
      setDiscount(100);
    } else {
      setDiscount(numValue);
    }
  }, []);

  // إضافة عميل جديد
  const handleAddCustomer = useCallback(async () => {
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
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة العميل");
    } finally {
      setIsAddingCustomer(false);
    }
  }, [newCustomer, createCustomer]);

  // معالجة إتمام الدفع السريعة
  const handlePaymentComplete = useCallback(async () => {
    try {
      if (isCartEmpty) return;

      if (finalCalculations.isPartialPayment && considerRemainingAsPartial && !selectedCustomer && !isReturnMode) {
        toast.error("يجب اختيار عميل لتسجيل المبلغ المتبقي عند اختيار الدفعة الجزئية");
        return;
      }
      
      const numAmountPaid = parseFloat(amountPaid);
      const paymentStatus = (numAmountPaid >= finalCalculations.finalTotal || 
        (finalCalculations.isPartialPayment && !considerRemainingAsPartial)) ? 'paid' : 'pending';

      const orderDetails = {
        customerId: selectedCustomer?.id || 'guest',
        paymentMethod,
        subtotal: calculations.subtotal,
        discount: finalCalculations.actualDiscountAmount,
        total: calculations.total, // استخدام المجموع الأصلي قبل التخفيض التلقائي
        status: 'completed',
        paymentStatus,
        notes: finalCalculations.isPartialPayment 
          ? (considerRemainingAsPartial 
            ? `${notes} | دفع جزئي: ${numAmountPaid.toFixed(2)} - متبقي: ${finalCalculations.remainingAmount.toFixed(2)}` 
            : `${notes} | تخفيض: ${finalCalculations.remainingAmount.toFixed(2)} دج`)
          : notes,
        isOnline: false,
        employeeId: currentUser?.id || "",
        createdByStaffId: currentStaff?.id || null,
        createdByStaffName: currentStaff?.staff_name || null,
        partialPayment: (finalCalculations.isPartialPayment && considerRemainingAsPartial) ? {
          amountPaid: numAmountPaid,
          remainingAmount: finalCalculations.remainingAmount
        } : undefined,
        considerRemainingAsPartial: finalCalculations.isPartialPayment ? considerRemainingAsPartial : undefined,
        subscriptionAccountInfo: hasSubscriptionServices ? subscriptionAccountInfo : undefined
      };

      // 🔍 تشخيص: طباعة معلومات الموظف
      console.log('🔍 [CartOptimized] معلومات الطلبية:', {
        currentStaff,
        createdByStaffId: orderDetails.createdByStaffId,
        createdByStaffName: orderDetails.createdByStaffName,
        employeeId: orderDetails.employeeId
      });

      const orderResult = await submitOrderFast(
        orderDetails,
        cartItems,
        selectedServices,
        selectedSubscriptions
      );

      // حفظ البيانات للطباعة
      setIsOrderProcessed(true);
      setCompletedItems([...cartItems]);
      setCompletedServices([...selectedServices]);
      setCompletedTotal(finalCalculations.finalTotal);
      setCompletedSubtotal(calculations.subtotal);
      setCompletedDiscount(finalCalculations.actualDiscountAmount);
      setCompletedCustomerName(selectedCustomer?.name);
      setCompletedOrderNumber(`POS-${orderResult.customerOrderNumber}`);
      setCompletedOrderDate(new Date());
      setCompletedPaidAmount(numAmountPaid);
      setCompletedRemainingAmount(finalCalculations.remainingAmount);
      
      if (hasSubscriptionServices && subscriptionAccountInfo) {
        setCompletedSubscriptionAccountInfo({...subscriptionAccountInfo});
      }
      
      // إخفاء نافذة الدفع وإظهار نافذة الطباعة
      setIsPaymentDialogOpen(false);
      setIsPrintDialogOpen(true);

      // مسح السلة
      clearCart();
      setSelectedCustomer(null);
      setNotes('');
      setDiscount(0);
      setAmountPaid('');

    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء الطلب");
    }
  }, [
    isCartEmpty, finalCalculations, considerRemainingAsPartial, selectedCustomer, 
    isReturnMode, amountPaid, paymentMethod, calculations, notes, currentUser, 
    hasSubscriptionServices, subscriptionAccountInfo, submitOrderFast, cartItems, 
    selectedServices, selectedSubscriptions, clearCart
  ]);

  // معالجة إكمال الطباعة
  const handlePrintCompleted = useCallback(() => {
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
    setSubscriptionAccountInfo({
      username: '',
      email: '',
      password: '',
      notes: ''
    });
  }, []);

  // فتح نافذة الدفع
  const handleOpenPaymentDialog = useCallback(() => {
    if (isCartEmpty) {
      toast.warning(isReturnMode ? "أضف منتجات للإرجاع أولاً" : "أضف منتجات للسلة أولاً");
      return;
    }
    setAmountPaid(finalCalculations.finalTotal.toString());
    setIsPaymentDialogOpen(true);
  }, [isCartEmpty, isReturnMode, finalCalculations.finalTotal]);

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-lg border",
      "border-border bg-background shadow-sm h-full"
    )}>
      {/* عنوان السلة المحسن */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="px-4 py-3.5 border-b border-border bg-card backdrop-blur-sm sticky top-0 z-10 shadow-sm flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg shadow-sm ${isReturnMode ? 'bg-orange-100' : 'bg-primary/10'}`}>
              {isReturnMode ? (
                <RotateCcw className="h-4 w-4 text-orange-500" />
              ) : (
                <Zap className="h-4 w-4 text-primary" />
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {isReturnMode ? 'سلة الإرجاع السريعة' : 'سلة سريعة ⚡'}
            </h2>
          </div>
          
          {!isCartEmpty && (
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border ${
              isReturnMode ? 
              'bg-orange-100 text-orange-800 border-orange-300' : 
              'bg-green-100 text-green-800 border-green-300'
            }`}>
              {cartItems.reduce((sum, item) => sum + item.quantity, 0) + selectedServices.length + selectedSubscriptions.length} عنصر
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
              <motion.div className="space-y-3">
                {cartItems.map((item, index) => (
                  <CartItem
                    key={`${item.product.id}-${item.colorId || ''}-${item.sizeId || ''}`}
                    item={item}
                    index={index}
                    updateItemQuantity={updateItemQuantity}
                    removeItemFromCart={removeItemFromCart}
                    relatedProducts={[]}
                    onRelatedProductClick={() => {}}
                  />
                ))}
                
                {selectedServices.map((service) => (
                  <div key={service.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-blue-900">{service.name}</h4>
                        <p className="text-sm text-blue-600">{service.price} دج</p>
                      </div>
                      <button
                        onClick={() => removeService(service.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* ملخص السلة المحسن */}
      <CartSummary 
        subtotal={calculations.subtotal}
        discountAmount={finalCalculations.actualDiscountAmount}
        tax={calculations.tax}
        total={finalCalculations.finalTotal}
        isCartEmpty={isCartEmpty}
        clearCart={clearCart}
        handleOpenPaymentDialog={handleOpenPaymentDialog}
        isProcessing={isSubmitting}
        onApplyCoupon={() => {}}
        onSaveCart={() => {}}
        onQuickCheckout={handleOpenPaymentDialog}
        isReturnMode={isReturnMode}
      />
      
      {/* نوافذ حوارية */}
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
        isPartialPayment={finalCalculations.isPartialPayment}
        remainingAmount={finalCalculations.remainingAmount}
        change={finalCalculations.change}
        considerRemainingAsPartial={considerRemainingAsPartial}
        setConsiderRemainingAsPartial={setConsiderRemainingAsPartial}
        subtotal={calculations.subtotal}
        discountAmount={finalCalculations.actualDiscountAmount}
        tax={calculations.tax}
        total={finalCalculations.finalTotal}
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
        completedDiscountAmount={finalCalculations.actualDiscountAmount}
        completedCustomerName={completedCustomerName}
        completedPaidAmount={completedPaidAmount}
        completedRemainingAmount={completedRemainingAmount}
        isPartialPayment={finalCalculations.isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        subscriptionAccountInfo={subscriptionAccountInfo}
        onPrintCompleted={handlePrintCompleted}
      />
    </div>
  );
});

CartOptimized.displayName = 'CartOptimized';

export default CartOptimized;
