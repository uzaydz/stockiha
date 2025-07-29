import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { toast } from "sonner";
import { Product, Order, User as AppUser, Service } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import { useTenant } from '@/context/TenantContext';
import { useShop } from '@/context/ShopContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// استيراد Hook الجديد
import useCompletePOSData from '@/hooks/useCompletePOSData';
import { usePerformanceOptimizer } from '@/hooks/usePerformanceOptimizer';
// import { useOptimizedToast } from '@/hooks/useOptimizedToast';

// استيراد المكونات المحسنة (سننشئها)
import Layout from '@/components/Layout';
import POSAdvancedHeader from '@/components/pos-advanced/POSAdvancedHeader';
import POSAdvancedContent from '@/components/pos-advanced/POSAdvancedContent';
import POSAdvancedCart from '@/components/pos-advanced/POSAdvancedCart';

// استيراد الـ hooks المحسنة الموجودة
import { usePOSBarcode } from '@/components/pos/hooks/usePOSBarcode';
import { usePOSCart } from '@/components/pos/hooks/usePOSCart';
import { usePOSReturn } from '@/components/pos/hooks/usePOSReturn';
import { usePOSOrder } from '@/components/pos/hooks/usePOSOrder';

// استيراد النوافذ الحوارية
import ProductVariantSelector from '@/components/pos/ProductVariantSelector';
import POSSettings from '@/components/pos/settings/POSSettings';
import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
import RepairOrderPrint from '@/components/repair/RepairOrderPrint';
import PrintReceiptDialog from '@/components/pos/PrintReceiptDialog';
import QuickExpenseDialog from '@/components/pos/QuickExpenseDialog';

import CalculatorComponent from '@/components/pos/Calculator';

// استيراد مكونات UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Wrench, 
  ShoppingCart, 
  RotateCcw, 
  RefreshCw,
  TrendingUp,
  Users,
  Package2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react';

// =================================================================
// 🚀 صفحة POS المتقدمة - تستخدم RPC واحد للأداء العالي
// =================================================================

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
  customPrice?: number; // ✅ إضافة customPrice للسعر المخصص
}

// مكون تحميل متقدم
const POSLoadingSkeleton = () => (
  <div className="min-h-screen">
    <div className="p-4 space-y-4">
      {/* هيكل الترويسة */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      {/* هيكل الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
      
      {/* هيكل المحتوى الرئيسي */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
        <div className="col-span-4">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

const POSAdvanced = () => {
  // بيانات المصادقة والتطبيقات
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const { isAppEnabled } = useApps();
  
  // الحصول على addOrder من useShop
  const { addOrder } = useShop();

  // البيانات الأساسية من RPC واحد محسن
  const {
    // البيانات الأساسية
    products,
    subscriptions,
    subscriptionCategories,
    productCategories, // ✅ إضافة productCategories
    users,
    customers,
    recentOrders,
    inventoryStats,
    orderStats,
    
    // حالة التحميل والأخطاء
    isLoading,
    isRefetching,
    error,
    errorMessage,
    
    // دوال التحديث
    refreshData,
    updateProductStockInCache,
    getProductStock,
    
    // معلومات الأداء
    executionTime,
    dataTimestamp
  } = useCompletePOSData();

  // إيقاف تحميل POSDataContext المكرر إذا كانت البيانات متوفرة من useCompletePOSData
  const shouldUsePOSDataContext = !products || products.length === 0;

  // الحالات المحلية للواجهة
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [isPOSSettingsOpen, setIsPOSSettingsOpen] = useState(false);
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [isRepairPrintDialogOpen, setIsRepairPrintDialogOpen] = useState(false);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState<any>(null);
  const [repairQueuePosition, setRepairQueuePosition] = useState(1);
  
  // حالات طباعة الطلبات العادية
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const [completedServices, setCompletedServices] = useState<any[]>([]);
  const [completedSubscriptions, setCompletedSubscriptions] = useState<any[]>([]);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedSubtotal, setCompletedSubtotal] = useState(0);
  const [completedDiscount, setCompletedDiscount] = useState(0);
  const [completedDiscountAmount, setCompletedDiscountAmount] = useState(0);
  const [completedCustomerName, setCompletedCustomerName] = useState<string | undefined>();
  const [completedOrderNumber, setCompletedOrderNumber] = useState('');
  const [completedOrderDate, setCompletedOrderDate] = useState(new Date());
  const [completedPaidAmount, setCompletedPaidAmount] = useState(0);
  const [completedRemainingAmount, setCompletedRemainingAmount] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [considerRemainingAsPartial, setConsiderRemainingAsPartial] = useState(false);
  const [subscriptionAccountInfo, setSubscriptionAccountInfo] = useState<any>();

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // تحويل المستخدم الحالي
  const currentUser: AppUser | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: user.user_metadata?.name || 'User',
      email: user.email || '',
      role: 'employee',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization_id: user.user_metadata?.organization_id || currentOrganization?.id || ''
    };
  }, [user, currentOrganization]);

  // تحويل العملاء لصيغة مناسبة
  const filteredUsers: AppUser[] = useMemo(() => {
    return customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      role: 'customer' as const,
      isActive: true,
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at || customer.created_at),
      organization_id: customer.organization_id
    }));
  }, [customers]);

  // =================================================================
  // 🛒 إدارة السلة والطلبات
  // =================================================================

  const {
    tabs,
    activeTab,
    activeTabId,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    duplicateTab,
    clearEmptyTabs,
    getTabSummary,
    addItemToCart,
    addVariantToCart,
    removeItemFromCart,
    updateItemQuantity,
    updateItemPrice, // ✅ إضافة updateItemPrice
    clearCart,
    addService,
    removeService,
    updateServicePrice,
    handleAddSubscription,
    removeSubscription,
    updateSubscriptionPrice,
    assignCustomerToTab
  } = usePOSCart({
    updateProductStockInCache,
    getProductStock,
    products
  });

  const {
    isReturnMode,
    returnItems,
    returnReason,
    returnNotes,
    setReturnReason,
    setReturnNotes,
    addItemToReturnCart,
    updateReturnItemQuantity,
    removeReturnItem,
    clearReturnCart,
    toggleReturnMode,
    processReturn
  } = usePOSReturn({
    currentUser,
    currentOrganizationId: currentOrganization?.id,
    updateProductStockInCache,
    refreshPOSData: refreshData
  });

  const {
    currentOrder,
    favoriteProducts,
    isSubmittingOrder,
    setCurrentOrder,
    handleOpenOrder,
    submitOrder
  } = usePOSOrder({
    cartItems,
    selectedServices,
    selectedSubscriptions,
    currentUser,
    addOrder,
    users: filteredUsers,
    orders: recentOrders,
    products,
    updateProductStockInCache,
    refreshProducts: refreshData,
    refreshPOSData: refreshData,
    clearCart
  });

  // دالة submitOrder مخصصة للتوافق مع POSAdvancedCart مع دعم الدفع الجزئي
  const handleSubmitOrder = useCallback(async (
    customerId?: string, 
    notes?: string, 
    discount?: number, 
    discountType?: 'percentage' | 'fixed', 
    amountPaid?: number,
    paymentMethod?: string,
    isPartialPayment?: boolean,
    considerRemainingAsPartial?: boolean
  ) => {
    try {
      // حساب التخفيض والمبالغ
      const cartSubtotal = cartItems.reduce((total, item) => {
        const price = (item as any).customPrice || item.variantPrice || item.product.price || 0;
        return total + (price * item.quantity);
      }, 0);
      
      const servicesTotal = selectedServices.reduce((total, service) => total + (service.price || 0), 0);
      const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => total + (subscription.price || 0), 0);
      const subtotal = cartSubtotal + servicesTotal + subscriptionsTotal;
      
      let discountAmount = 0;
      if (discount && discount > 0) {
        if (discountType === 'percentage') {
          discountAmount = (subtotal * discount) / 100;
        } else {
          discountAmount = discount;
        }
      }
      
      const finalTotal = Math.max(0, subtotal - discountAmount);
      const paidAmount = amountPaid || finalTotal;
      
      // ✅ إضافة التخفيض التلقائي عند الدفع بمبلغ أقل
      let actualDiscountAmount = discountAmount;
      if (paidAmount < finalTotal && paidAmount > 0 && discountAmount === 0) {
        // إذا لم يكن هناك تخفيض مسبق ولكن المبلغ المدفوع أقل من المجموع
        actualDiscountAmount = finalTotal - paidAmount;
      }
      
      const actualFinalTotal = Math.max(0, subtotal - actualDiscountAmount);
      const remainingAmount = Math.max(0, actualFinalTotal - paidAmount);
      
      // تحديد إذا كان دفع جزئي
      const isActualPartialPayment = paidAmount > 0 && paidAmount < actualFinalTotal;
      
      // تحديد حالة الدفع
      let paymentStatus: 'paid' | 'pending' = 'paid';
      if (isActualPartialPayment && considerRemainingAsPartial && remainingAmount > 0) {
        paymentStatus = 'pending';
      }
      
      const orderDetails: Partial<Order> = {
        customerId: customerId === 'anonymous' ? undefined : customerId,
        notes: isActualPartialPayment && considerRemainingAsPartial 
          ? `${notes || ''} | دفع جزئي: ${paidAmount.toFixed(2)} دج - متبقي: ${remainingAmount.toFixed(2)} دج`
          : notes,
        paymentMethod: paymentMethod || 'cash',
        paymentStatus,
        discount: actualDiscountAmount, // ✅ استخدام التخفيض الفعلي (مع التخفيض التلقائي)
        subtotal,
        total: actualFinalTotal, // ✅ استخدام المجموع الفعلي
        partialPayment: (isActualPartialPayment && considerRemainingAsPartial && remainingAmount > 0) ? {
          amountPaid: paidAmount,
          remainingAmount: remainingAmount
        } : undefined,
        considerRemainingAsPartial: isActualPartialPayment ? considerRemainingAsPartial : undefined
      };
      
      // حفظ البيانات للطباعة قبل إرسال الطلب
      setCompletedItems([...cartItems]);
      setCompletedServices([...selectedServices]);
      setCompletedSubscriptions([...selectedSubscriptions]);
      setCompletedSubtotal(subtotal);
      setCompletedDiscount(discount || 0);
      setCompletedDiscountAmount(actualDiscountAmount);
      setCompletedTotal(actualFinalTotal);
      setCompletedPaidAmount(paidAmount);
      setCompletedRemainingAmount(remainingAmount);
      setIsPartialPayment(isActualPartialPayment);
      setConsiderRemainingAsPartial(considerRemainingAsPartial || false);
      
      // البحث عن اسم العميل
      const customer = customers.find(c => c.id === customerId);
      setCompletedCustomerName(customer?.name);
      
      const result = await submitOrder(orderDetails);
      
      // 🔍 تتبع مصدر الرقم 666 - نقطة 6: في POSAdvanced بعد استقبال النتيجة من submitOrder
      
      // تحديد رقم الطلب وتاريخه
      setCompletedOrderNumber(`POS-${result.customerOrderNumber || Date.now()}`);
      setCompletedOrderDate(new Date());
      
      // فتح نافذة الطباعة
      setIsPrintDialogOpen(true);
      
      if (isActualPartialPayment && considerRemainingAsPartial && remainingAmount > 0) {
        toast.success(`تم إنشاء الطلب #${result.customerOrderNumber} بنجاح - مبلغ متبقي: ${remainingAmount.toFixed(2)} دج`);
      } else {
        toast.success(`تم إنشاء الطلب #${result.customerOrderNumber} بنجاح`);
      }
    } catch (error) {
      toast.error('فشل في إنشاء الطلب');
    }
  }, [submitOrder, cartItems, selectedServices, selectedSubscriptions, customers]);

  // دالة processReturn مخصصة للتوافق مع POSAdvancedCart
  const handleProcessReturn = useCallback(async (customerId?: string, reason?: string, notes?: string) => {
    try {
      const orderDetails: Partial<Order> = {
        customerId: customerId === 'anonymous' ? undefined : customerId,
        notes: `${reason ? `السبب: ${reason}` : ''}${notes ? ` - ${notes}` : ''}`,
        paymentMethod: 'cash',
        paymentStatus: 'paid'
      };
      
      const result = await processReturn(orderDetails);
      toast.success('تم معالجة الإرجاع بنجاح');
    } catch (error) {
      toast.error('فشل في معالجة الإرجاع');
    }
  }, [processReturn]);

  // =================================================================
  // 🎯 معالجات الأحداث
  // =================================================================

  // معالجة اختيار المنتجات مع المتغيرات
  const handleProductWithVariants = useCallback((product: Product) => {
    if (product.has_variants && product.colors && product.colors.length > 0) {
      setSelectedProductForVariant(product);
      setIsVariantDialogOpen(true);
      return;
    }
    
    if (isReturnMode) {
      addItemToReturnCart(product);
    } else {
      addItemToCart(product);
    }
  }, [isReturnMode, addItemToReturnCart, addItemToCart]);

  // معالجة إضافة متغير للسلة
  const handleAddVariantToCart = useCallback((
    product: Product, 
    colorId?: string, 
    sizeId?: string, 
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => {
    addVariantToCart(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage);
    setIsVariantDialogOpen(false);
    setSelectedProductForVariant(null);
  }, [addVariantToCart]);

  // معالجة تحديث البيانات
  const handleRefreshData = useCallback(async () => {
    try {
      await refreshData();
      toast.success(`تم تحديث البيانات بنجاح في ${executionTime}ms`);
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  }, [refreshData, executionTime]);

  // دالة معالجة نجاح إضافة خدمة التصليح
  const handleRepairServiceSuccess = useCallback(async (orderId: string, trackingCode: string) => {
    try {
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          images:repair_images(*),
          history:repair_status_history(*, users(name)),
          repair_location:repair_locations(id, name, description, address, phone),
          staff:users(id, name, email, phone)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedRepairOrder(data);
        setRepairQueuePosition(1);
        setIsRepairPrintDialogOpen(true);
      }

      setIsRepairDialogOpen(false);
      toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
    } catch (error) {
      setIsRepairDialogOpen(false);
      toast.success('تم إنشاء طلبية تصليح جديدة بنجاح');
    }
  }, []);

  // Hook الباركود
  const { barcodeBuffer } = usePOSBarcode({
    products,
    currentOrganizationId: currentOrganization?.id,
    onAddToCart: isReturnMode ? addItemToReturnCart : addItemToCart,
    onAddVariant: addVariantToCart
  });

  // =================================================================
  // 🎨 العرض والواجهة
  // =================================================================

  // معالجة حالة الخطأ
  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">خطأ في تحميل البيانات</h2>
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={handleRefreshData} disabled={isRefetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
              إعادة المحاولة
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  // معالجة حالة التحميل
  if (isLoading) {
    return (
      <Layout>
        <POSLoadingSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        {/* المحتوى الرئيسي */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* الترويسة المحسنة */}
          <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-border/50 shadow-sm">
            <POSAdvancedHeader
              isReturnMode={isReturnMode}
              returnItemsCount={returnItems.length}
              isRepairServicesEnabled={isAppEnabled('repair-services')}
              isPOSDataLoading={isRefetching}
              onCalculatorOpen={() => setIsCalculatorOpen(true)}
              onToggleReturnMode={toggleReturnMode}
              onPOSSettingsOpen={() => setIsPOSSettingsOpen(true)}
              onRepairDialogOpen={() => setIsRepairDialogOpen(true)} // ✅ إضافة نافذة التصليح
              onQuickExpenseOpen={() => setIsQuickExpenseOpen(true)} // ✅ إضافة نافذة المصروف السريع
              onRefreshData={handleRefreshData}
              executionTime={executionTime}
              dataTimestamp={dataTimestamp}
            />
          </div>

          {/* المحتوى الأساسي */}
          <div className="flex-1 flex gap-3 p-3 min-h-0">
            {/* منطقة المنتجات والاشتراكات */}
            <div className="flex-1 flex flex-col min-h-0">
              <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
                <div className="flex-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl min-h-0">
                  <POSAdvancedContent
                    products={products}
                    subscriptions={subscriptions}
                    subscriptionCategories={subscriptionCategories}
                    productCategories={productCategories} // ✅ إضافة productCategories
                    favoriteProducts={favoriteProducts}
                    isReturnMode={isReturnMode}
                    isLoading={false}
                    isPOSDataLoading={isRefetching}
                    onAddToCart={handleProductWithVariants}
                    onAddSubscription={handleAddSubscription}
                    onRefreshData={handleRefreshData}
                  />
                </div>
              </Suspense>
            </div>

            {/* منطقة السلة */}
            <div className="w-80 flex flex-col min-h-0">
              <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
                <div className="flex-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl min-h-0">
                  <POSAdvancedCart
                  isReturnMode={isReturnMode}
                  // بيانات السلة العادية
                  tabs={tabs}
                  activeTab={activeTab}
                  activeTabId={activeTabId}
                  cartItems={cartItems}
                  selectedServices={selectedServices}
                  selectedSubscriptions={selectedSubscriptions}
                  // بيانات سلة الإرجاع
                  returnItems={returnItems}
                  returnReason={returnReason}
                  returnNotes={returnNotes}
                  // العملاء والمستخدمين
                  customers={filteredUsers}
                  currentUser={currentUser}
                  // دوال إدارة التبويبات
                  setActiveTabId={setActiveTabId}
                  addTab={addTab}
                  removeTab={removeTab}
                  updateTab={updateTab}
                  // دوال إدارة السلة
                  updateItemQuantity={updateItemQuantity}
                  updateItemPrice={updateItemPrice} // ✅ إضافة updateItemPrice
                  removeItemFromCart={removeItemFromCart}
                  clearCart={clearCart}
                  submitOrder={handleSubmitOrder}
                  // دوال إدارة الإرجاع
                  updateReturnItemQuantity={updateReturnItemQuantity}
                  removeReturnItem={removeReturnItem}
                  clearReturnCart={clearReturnCart}
                  processReturn={handleProcessReturn}
                  setReturnReason={setReturnReason}
                  setReturnNotes={setReturnNotes}
                  // دوال الخدمات والاشتراكات - مع wrapper لتحويل التوقيعات
                  removeService={(index: number) => removeService(activeTabId, selectedServices[index]?.id)}
                  updateServicePrice={(index: number, price: number) => updateServicePrice(activeTabId, selectedServices[index]?.id, price)}
                  removeSubscription={(index: number) => removeSubscription(activeTabId, selectedSubscriptions[index]?.id)}
                  updateSubscriptionPrice={(index: number, price: number) => updateSubscriptionPrice(activeTabId, selectedSubscriptions[index]?.id, price)}
                  // حالة التحميل
                  isSubmittingOrder={isSubmittingOrder}
                />
                </div>
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* النوافذ الحوارية */}
      
      {/* نافذة اختيار المتغيرات */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent 
          className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              اختيار متغيرات المنتج
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              اختر اللون والمقاس المناسب لإضافة المنتج إلى السلة
            </DialogDescription>
          </DialogHeader>
          
          {selectedProductForVariant && (
            <ProductVariantSelector
              product={selectedProductForVariant}
              onAddToCart={handleAddVariantToCart}
              onCancel={() => {
                setIsVariantDialogOpen(false);
                setSelectedProductForVariant(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة إعدادات POS */}
      <POSSettings
        isOpen={isPOSSettingsOpen}
        onOpenChange={setIsPOSSettingsOpen}
      />

      {/* نافذة الآلة الحاسبة */}
      <CalculatorComponent
        isOpen={isCalculatorOpen}
        onOpenChange={setIsCalculatorOpen}
      />

      {/* نافذة المصروف السريع */}
      <QuickExpenseDialog
        isOpen={isQuickExpenseOpen}
        onOpenChange={setIsQuickExpenseOpen}
      />

      {/* نافذة خدمة التصليح */}
      {isAppEnabled('repair-services') && (
        <RepairServiceDialog
          isOpen={isRepairDialogOpen}
          onClose={() => setIsRepairDialogOpen(false)}
          onSuccess={handleRepairServiceSuccess}
        />
      )}

      {/* نافذة طباعة وصل التصليح */}
      <Dialog open={isRepairPrintDialogOpen} onOpenChange={setIsRepairPrintDialogOpen}>
        <DialogContent 
          className="max-w-2xl max-h-[85vh] overflow-y-auto p-0"
          aria-describedby={undefined}
        >
          <div className="bg-white">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">طباعة وصل التصليح</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsRepairPrintDialogOpen(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedRepairOrder && (
                <RepairOrderPrint 
                  order={selectedRepairOrder} 
                  queuePosition={repairQueuePosition} 
                />
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsRepairPrintDialogOpen(false)}
              >
                إغلاق
              </Button>
              <Button onClick={() => window.print()}>
                طباعة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة طباعة الطلبات العادية */}
      <PrintReceiptDialog
        isOpen={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        completedItems={completedItems}
        completedServices={completedServices}
        completedTotal={completedTotal}
        completedSubtotal={completedSubtotal}
        completedDiscount={completedDiscount}
        completedDiscountAmount={completedDiscountAmount}
        completedCustomerName={completedCustomerName}
        completedPaidAmount={completedPaidAmount}
        completedRemainingAmount={completedRemainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        orderDate={completedOrderDate}
        orderNumber={completedOrderNumber}
        subscriptionAccountInfo={subscriptionAccountInfo}
        onPrintCompleted={() => {
          setIsPrintDialogOpen(false);
          // مسح البيانات المحفوظة للطباعة
          setCompletedItems([]);
          setCompletedServices([]);
          setCompletedSubscriptions([]);
          setCompletedTotal(0);
          setCompletedSubtotal(0);
          setCompletedDiscount(0);
          setCompletedDiscountAmount(0);
          setCompletedCustomerName(undefined);
          setCompletedOrderNumber('');
          setCompletedPaidAmount(0);
          setCompletedRemainingAmount(0);
          setIsPartialPayment(false);
          setConsiderRemainingAsPartial(false);
          setSubscriptionAccountInfo(undefined);
        }}
      />

      {/* شريط حالة الأداء */}
      {executionTime && (
        <div className="fixed bottom-4 left-4 z-50">
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            <Activity className="h-3 w-3 mr-1" />
            {executionTime}ms
          </Badge>
        </div>
      )}
    </Layout>
  );
};

export default POSAdvanced;
