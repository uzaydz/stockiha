import React, { useMemo, useState, useCallback, Suspense } from 'react';
const POSAdvancedPaymentDialog = React.lazy(() => import('./POSAdvancedPaymentDialog'));
import { Product, User as AppUser } from '@/types';
import ReturnModeCart from './cart/ReturnModeCart';
import NormalModeCart from './cart/NormalModeCart';


interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number; // السعر المخصص المعدل
}

interface CartTab {
  id: string;
  name: string;
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  customerId?: string;
  customerName?: string;
  discount?: number; // نسبة التخفيض
  discountAmount?: number; // مبلغ التخفيض الثابت
  discountType?: 'percentage' | 'fixed'; // نوع التخفيض
}

interface POSAdvancedCartProps {
  isReturnMode: boolean;
  
  // بيانات السلة العادية
  tabs: CartTab[];
  activeTab: CartTab | null;
  activeTabId: string;
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  
  // بيانات سلة الإرجاع
  returnItems: CartItem[];
  returnReason: string;
  returnNotes: string;
  
  // العملاء والمستخدمين
  customers: AppUser[];
  currentUser: AppUser | null;
  
  // دوال إدارة التبويبات
  setActiveTabId: (tabId: string) => void;
  addTab: () => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: any) => void;
  
  // دوال إدارة السلة
  updateItemQuantity: (index: number, quantity: number) => void;
  updateItemPrice: (index: number, price: number) => void; // دالة تعديل السعر
  removeItemFromCart: (index: number) => void;
  clearCart: () => void;
  submitOrder: (customerId?: string, notes?: string, discount?: number, discountType?: 'percentage' | 'fixed', amountPaid?: number, paymentMethod?: string, isPartialPayment?: boolean, considerRemainingAsPartial?: boolean) => Promise<void>;
  
  // دوال إدارة الإرجاع
  updateReturnItemQuantity: (index: number, quantity: number) => void;
  removeReturnItem: (index: number) => void;
  clearReturnCart: () => void;
  processReturn: (customerId?: string, reason?: string, notes?: string) => Promise<void>;
  setReturnReason: (reason: string) => void;
  setReturnNotes: (notes: string) => void;
  updateReturnItemPrice?: (index: number, price: number) => void; // إضافة دالة تعديل سعر الإرجاع
  
  // دوال الخدمات والاشتراكات
  removeService: (index: number) => void;
  updateServicePrice: (index: number, price: number) => void;
  removeSubscription: (index: number) => void;
  updateSubscriptionPrice: (index: number, price: number) => void;
  
  // callback لتحديث قائمة العملاء
  onCustomerAdded?: (customer: AppUser) => void;
  
  // حالة التحميل
  isSubmittingOrder: boolean;
}

const POSAdvancedCart: React.FC<POSAdvancedCartProps> = ({
  isReturnMode,
  tabs,
  activeTab,
  activeTabId,
  cartItems,
  selectedServices,
  selectedSubscriptions,
  returnItems,
  returnReason,
  returnNotes,
  customers,
  currentUser,
  setActiveTabId,
  addTab,
  removeTab,
  updateTab,
  updateItemQuantity,
  updateItemPrice, // Add updateItemPrice to props
  removeItemFromCart,
  clearCart,
  submitOrder,
  updateReturnItemQuantity,
  removeReturnItem,
  clearReturnCart,
  processReturn,
  setReturnReason,
  setReturnNotes,
  removeService,
  updateServicePrice,
  removeSubscription,
  updateSubscriptionPrice,
  onCustomerAdded,
  isSubmittingOrder,
  updateReturnItemPrice
}) => {
  // حالة dialog الدفع المتقدم
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // حساب إجمالي السلة العادية - محسن
  const cartSubtotal = useMemo(() => {
    const itemsTotal = cartItems.reduce((total, item) => {
      const price = item.customPrice || item.variantPrice || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
    
    const servicesTotal = selectedServices.reduce((total, service) => {
      return total + (service.price || 0);
    }, 0);
    
    const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
      // دعم حقول مختلفة للسعر
      const price = subscription.price || subscription.selling_price || subscription.purchase_price || 0;
      return total + price;
    }, 0);
    
    return itemsTotal + servicesTotal + subscriptionsTotal;
  }, [cartItems, selectedServices, selectedSubscriptions]);

  // حساب التخفيض والإجمالي النهائي - محسن
  const cartTotal = useMemo(() => {
    const discount = activeTab?.discount || 0;
    const discountAmount = activeTab?.discountAmount || 0;
    const discountType = activeTab?.discountType || 'percentage';
    
    let finalDiscount = 0;
    if (discountType === 'percentage') {
      finalDiscount = (cartSubtotal * discount) / 100;
    } else {
      finalDiscount = discountAmount;
    }
    
    return Math.max(0, cartSubtotal - finalDiscount);
  }, [cartSubtotal, activeTab?.discount, activeTab?.discountAmount, activeTab?.discountType]);

  // حساب إجمالي سلة الإرجاع - محسن
  const returnTotal = useMemo(() => {
    return returnItems.reduce((total, item) => {
      const price = item.variantPrice || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [returnItems]);

  // حساب عدد العناصر - محسن
  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const totalReturnItemsCount = useMemo(() => {
    return returnItems.reduce((total, item) => total + item.quantity, 0);
  }, [returnItems]);

  // Optimized callback functions
  const handleUpdateQuantity = useCallback((index: number, quantity: number) => {
    updateItemQuantity(index, quantity);
  }, [updateItemQuantity]);

  const handleRemoveItem = useCallback((index: number) => {
    removeItemFromCart(index);
  }, [removeItemFromCart]);

  const handleUpdatePrice = useCallback((index: number, price: number) => {
    updateItemPrice(index, price);
  }, [updateItemPrice]);

  if (isReturnMode) {
    return (
      <ReturnModeCart
        returnItems={returnItems}
        returnReason={returnReason}
        returnNotes={returnNotes}
        customers={customers}
        currentUser={currentUser}
        isSubmittingOrder={isSubmittingOrder}
        updateReturnItemQuantity={updateReturnItemQuantity}
        removeReturnItem={removeReturnItem}
        clearReturnCart={clearReturnCart}
        processReturn={processReturn}
        setReturnReason={setReturnReason}
        setReturnNotes={setReturnNotes}
        updateReturnItemPrice={updateReturnItemPrice}
      />
    );
  }

  return (
    <>
      <NormalModeCart
        tabs={tabs}
        activeTab={activeTab}
        activeTabId={activeTabId}
        cartItems={cartItems}
        selectedServices={selectedServices}
        selectedSubscriptions={selectedSubscriptions}
        cartSubtotal={cartSubtotal}
        cartTotal={cartTotal}
        isSubmittingOrder={isSubmittingOrder}
        setActiveTabId={setActiveTabId}
        addTab={addTab}
        removeTab={removeTab}
        updateTab={updateTab}
        updateItemQuantity={handleUpdateQuantity}
        updateItemPrice={handleUpdatePrice}
        removeItemFromCart={handleRemoveItem}
        removeService={removeService}
        removeSubscription={removeSubscription}
        clearCart={clearCart}
        setIsPaymentDialogOpen={setIsPaymentDialogOpen}
      />

      {/* Payment Dialog */}
      {isPaymentDialogOpen && (
        <Suspense fallback={null}>
          <POSAdvancedPaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            subtotal={cartSubtotal}
            currentDiscount={activeTab?.discount || 0}
            currentDiscountType={activeTab?.discountType || 'fixed'}
            total={cartTotal}
            customers={customers}
            selectedCustomerId={activeTab?.customerId}
            onPaymentComplete={(data) => {
              submitOrder(
                data.customerId,
                data.notes,
                activeTab?.discount || 0,
                activeTab?.discountType || 'fixed',
                data.amountPaid,
                data.paymentMethod,
                data.isPartialPayment,
                data.considerRemainingAsPartial
              );
              setIsPaymentDialogOpen(false);
            }}
            isProcessing={isSubmittingOrder}
            onCustomerAdded={onCustomerAdded}
          />
        </Suspense>
      )}
    </>
  );
};

export default React.memo(POSAdvancedCart);
