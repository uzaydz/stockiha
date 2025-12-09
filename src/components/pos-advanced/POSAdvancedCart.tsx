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
  // === حقول أنواع البيع المتقدمة ===
  sellingUnit?: 'piece' | 'weight' | 'box' | 'meter';
  weight?: number;
  pricePerWeightUnit?: number;
  boxCount?: number;
  boxPrice?: number;
  length?: number;
  pricePerMeter?: number;
}

// دالة مساعدة لحساب إجمالي عنصر في السلة بناءً على نوع البيع
const calculateCartItemTotal = (item: CartItem): number => {
  const sellingUnit = item.sellingUnit || 'piece';
  const product = item.product;
  const customPrice = item.customPrice;

  switch (sellingUnit) {
    case 'weight':
      if (item.weight && (item.pricePerWeightUnit || (product as any).price_per_weight_unit)) {
        return item.weight * (item.pricePerWeightUnit || (product as any).price_per_weight_unit || 0);
      }
      break;
    case 'box':
      if (item.boxCount && (item.boxPrice || (product as any).box_price)) {
        return item.boxCount * (item.boxPrice || (product as any).box_price || 0);
      }
      break;
    case 'meter':
      if (item.length && (item.pricePerMeter || (product as any).price_per_meter)) {
        return item.length * (item.pricePerMeter || (product as any).price_per_meter || 0);
      }
      break;
    default:
      // piece - السعر العادي
      const price = customPrice || item.variantPrice || product.price || 0;
      return price * item.quantity;
  }

  // الافتراضي
  const price = customPrice || item.variantPrice || product.price || 0;
  return price * item.quantity;
};

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

import type { SaleType, SellingUnit } from '@/lib/pricing/wholesalePricing';

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
  updateItemSaleType?: (index: number, saleType: SaleType) => void; // دالة تغيير نوع البيع
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
  updateReturnItemPrice?: (index: number, price: number) => void;
  // ⚡ دوال أنواع البيع المتقدمة للإرجاع
  updateReturnItemWeight?: (index: number, weight: number) => void;
  updateReturnItemBoxCount?: (index: number, count: number) => void;
  updateReturnItemLength?: (index: number, length: number) => void;
  updateReturnItemSellingUnit?: (index: number, unit: SellingUnit) => void;
  updateReturnItemFullConfig?: (index: number, config: {
    sellingUnit: SellingUnit;
    quantity?: number;
    weight?: number;
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
    boxCount?: number;
    length?: number;
  }) => void;
  calculateReturnItemTotal?: (item: CartItem) => number;
  
  // دوال الخدمات والاشتراكات
  removeService: (index: number) => void;
  updateServicePrice: (index: number, price: number) => void;
  removeSubscription: (index: number) => void;
  updateSubscriptionPrice: (index: number, price: number) => void;
  
  // callback لتحديث قائمة العملاء
  onCustomerAdded?: (customer: AppUser) => void;

  // حالة التحميل
  isSubmittingOrder: boolean;

  // ⚡ دوال أنواع البيع المتقدمة
  updateItemSellingUnit?: (index: number, unit: SellingUnit) => void;
  updateItemWeight?: (index: number, weight: number) => void;
  updateItemBoxCount?: (index: number, count: number) => void;
  updateItemLength?: (index: number, length: number) => void;
  updateItemFullConfig?: (index: number, config: {
    sellingUnit: SellingUnit;
    quantity?: number;
    weight?: number;
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
    boxCount?: number;
    length?: number;
  }) => void;

  // ⚡ دوال الدفعات والأرقام التسلسلية
  updateItemBatch?: (index: number, batchId: string, batchNumber: string, expiryDate?: string) => void;
  updateItemSerialNumbers?: (index: number, serials: string[]) => void;
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
  updateItemSaleType, // Add updateItemSaleType to props
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
  updateReturnItemPrice,
  // ⚡ دوال أنواع البيع المتقدمة للإرجاع
  updateReturnItemWeight,
  updateReturnItemBoxCount,
  updateReturnItemLength,
  updateReturnItemSellingUnit,
  updateReturnItemFullConfig,
  calculateReturnItemTotal,
  // ⚡ دوال أنواع البيع المتقدمة للسلة العادية
  updateItemSellingUnit,
  updateItemWeight,
  updateItemBoxCount,
  updateItemLength,
  updateItemFullConfig,
  updateItemBatch,
  updateItemSerialNumbers
}) => {
  // حالة dialog الدفع المتقدم
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // حساب إجمالي السلة العادية - مع دعم أنواع البيع المتقدمة (متر، وزن، علبة)
  const cartSubtotal = useMemo(() => {
    const itemsTotal = cartItems.reduce((total, item) => {
      return total + calculateCartItemTotal(item);
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

  // حساب إجمالي سلة الإرجاع - مع دعم أنواع البيع المتقدمة
  const returnTotal = useMemo(() => {
    return returnItems.reduce((total, item) => {
      return total + calculateCartItemTotal(item);
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

  const handleUpdateSaleType = useCallback((index: number, saleType: SaleType) => {
    updateItemSaleType?.(index, saleType);
  }, [updateItemSaleType]);

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
        // ⚡ دوال أنواع البيع المتقدمة للإرجاع
        updateReturnItemWeight={updateReturnItemWeight}
        updateReturnItemBoxCount={updateReturnItemBoxCount}
        updateReturnItemLength={updateReturnItemLength}
        updateReturnItemSellingUnit={updateReturnItemSellingUnit}
        updateReturnItemFullConfig={updateReturnItemFullConfig}
        calculateReturnItemTotal={calculateReturnItemTotal}
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
        updateItemSaleType={handleUpdateSaleType}
        removeItemFromCart={handleRemoveItem}
        removeService={removeService}
        removeSubscription={removeSubscription}
        clearCart={clearCart}
        setIsPaymentDialogOpen={setIsPaymentDialogOpen}
        // ⚡ دوال أنواع البيع المتقدمة
        updateItemSellingUnit={updateItemSellingUnit}
        updateItemWeight={updateItemWeight}
        updateItemBoxCount={updateItemBoxCount}
        updateItemLength={updateItemLength}
        updateItemFullConfig={updateItemFullConfig}
        updateItemBatch={updateItemBatch}
        updateItemSerialNumbers={updateItemSerialNumbers}
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
