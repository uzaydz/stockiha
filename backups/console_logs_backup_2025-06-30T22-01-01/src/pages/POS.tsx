import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from "sonner";
import { Product, Order, User as AppUser, Service } from '@/types';
import { useShop } from '@/context/ShopContext';
import { useAuth } from '@/context/AuthContext';
import { usePOSData } from '@/context/POSDataContext';
import { useUnifiedData } from '@/context/UnifiedDataContext';
import { useApps } from '@/context/AppsContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// استيراد الـ hooks المحسنة
import { usePOSBarcode } from '@/components/pos/hooks/usePOSBarcode';
import { usePOSCart } from '@/components/pos/hooks/usePOSCart';
import { usePOSReturn } from '@/components/pos/hooks/usePOSReturn';
import { usePOSOrder } from '@/components/pos/hooks/usePOSOrder';
import { usePOSKeyboard } from '@/components/pos/hooks/usePOSKeyboard';

// استيراد المكونات المحسنة
import Layout from '@/components/Layout';
import POSHeader from '@/components/pos/POSHeader';
import POSContent from '@/components/pos/POSContent';
import Cart from '@/components/pos/Cart';
import CartTabManager from '@/components/pos/CartTabManager';
import CartTabShortcuts from '@/components/pos/CartTabShortcuts';
import ProductVariantSelector from '@/components/pos/ProductVariantSelector';
import POSSettings from '@/components/pos/settings/POSSettings';
import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
import RepairOrderPrint from '@/components/repair/RepairOrderPrint';
import QuickReturnDialog from '@/components/pos/QuickReturnDialog';
import CalculatorComponent from '@/components/pos/Calculator';

// استيراد مكونات UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Wrench } from 'lucide-react';

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
}

const POS = () => {
  // الـ contexts الأساسية
  const { products: shopProducts, services, orders, addOrder, users, isLoading, refreshData } = useShop();
  const { user } = useAuth();
  const { isAppEnabled } = useApps();
  const { currentOrganization } = useTenant();
  
  // البيانات الموحدة المحسنة
  const { posData, refreshPOSData: refreshUnifiedPOSData } = useUnifiedData();
  
  // بيانات POS المحسنة
  const { 
    products, 
    subscriptions, 
    categories: subscriptionCategories, 
    posSettings,
    organizationApps,
    isLoading: isPOSDataLoading,
    errors,
    refreshAll: refreshPOSData,
    refreshProducts,
    updateProductStockInCache,
    getProductStock
  } = usePOSData();
  
  // حالات UI الأساسية
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [isPOSSettingsOpen, setIsPOSSettingsOpen] = useState(false);
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [isRepairPrintDialogOpen, setIsRepairPrintDialogOpen] = useState(false);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState(null);
  const [repairQueuePosition, setRepairQueuePosition] = useState(0);
  const [isQuickReturnOpen, setIsQuickReturnOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // مرجع لدالة تحديث المخزون
  const productCatalogUpdateFunction = useRef<((productId: string, stockChange: number) => void) | null>(null);

  // تحويل user إلى AppUser
  const currentUser: AppUser | null = user ? {
    id: user.id,
    name: user.user_metadata?.name || 'User',
    email: user.email || '',
    role: 'employee',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization_id: user.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id') || ''
  } : null;

  // استخدام العملاء من البيانات الموحدة
  const allCustomers = posData?.customers || [];
  
  // تحويل العملاء لصيغة AppUser للتوافق مع باقي النظام
  const filteredUsers: AppUser[] = allCustomers.map(customer => ({
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

  // Hook السلة المحسن
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

  // Hook الإرجاع المحسن
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
    refreshPOSData
  });

  // Hook الطلبات المحسن
  const {
    currentOrder,
    recentOrders,
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
    orders,
    products,
    updateProductStockInCache,
    refreshProducts,
    refreshPOSData,
    clearCart
  });

  // Hook الباركود المحسن
  const { barcodeBuffer } = usePOSBarcode({
    products,
    currentOrganizationId: currentOrganization?.id,
    onAddToCart: isReturnMode ? addItemToReturnCart : addItemToCart,
    onAddVariant: addVariantToCart
  });

  // Hook لوحة المفاتيح المحسن
  usePOSKeyboard({
    onCalculatorOpen: () => setIsCalculatorOpen(true),
    onQuickReturnOpen: () => setIsQuickReturnOpen(true),
    onPOSSettingsOpen: () => setIsPOSSettingsOpen(true),
    onRefreshData: refreshProducts,
    isLoading: isPOSDataLoading
  });

  // دالة معالجة اختيار المتغيرات
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

  // دالة إضافة متغير للسلة مع إغلاق النافذة
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

  // دالة معالجة إضافة خدمة
  const handleAddService = useCallback((
    service: Service & { customerId?: string }, 
    scheduledDate?: Date, 
    notes?: string, 
    repairLocationId?: string
  ) => {
    const existingServiceIndex = selectedServices.findIndex(s => s.id === service.id);
    
    if (existingServiceIndex !== -1) {
      const updatedServices = [...selectedServices];
      updatedServices[existingServiceIndex] = {
        ...service,
        scheduledDate,
        notes,
        customerId: service.customerId
      };
      updateTab(activeTabId, { selectedServices: updatedServices });
    } else {
      addService({ 
        ...service, 
        scheduledDate, 
        notes,
        customerId: service.customerId
      });
    }
    
    toast.success(`تمت إضافة خدمة "${service.name}"`);
  }, [selectedServices, updateTab, activeTabId, addService]);

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

  // دالة لاستقبال دالة تحديث المخزون من ProductCatalogOptimized
  const handleStockUpdate = useCallback((productId: string, updateFunction: any) => {
    if (productId === '__update_function__') {
      productCatalogUpdateFunction.current = updateFunction;
    }
  }, []);

  // دالة معالجة الباركود المسح ضوئياً
  const handleBarcodeScanned = useCallback((barcode: string) => {
    // يتم التعامل مع هذا في usePOSBarcode hook
  }, []);

  // دالة تحديث شاملة
  const handleRefreshData = useCallback(async () => {
    try {
      await Promise.all([
        refreshProducts(),
        refreshUnifiedPOSData(),
        refreshData()
      ]);
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  }, [refreshProducts, refreshUnifiedPOSData, refreshData]);

  if (isLoading) {
  return (
    <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل بيانات نقطة البيع...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
        <div className="mx-auto">
        {/* ترويسة POS */}
        <POSHeader
          isReturnMode={isReturnMode}
          returnItemsCount={returnItems.length}
          isRepairServicesEnabled={isAppEnabled('repair-services')}
          isPOSDataLoading={isPOSDataLoading}
          onQuickReturnOpen={() => setIsQuickReturnOpen(true)}
          onCalculatorOpen={() => setIsCalculatorOpen(true)}
          onToggleReturnMode={toggleReturnMode}
          onPOSSettingsOpen={() => setIsPOSSettingsOpen(true)}
          onRepairDialogOpen={() => setIsRepairDialogOpen(true)}
          onRefreshData={handleRefreshData}
        />
          
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* عمود المنتجات والاشتراكات */}
            <div className="col-span-12 md:col-span-8 h-full flex flex-col">
            <POSContent
              products={products}
              subscriptions={subscriptions}
              subscriptionCategories={subscriptionCategories}
              recentOrders={recentOrders}
              favoriteProducts={favoriteProducts}
                      isReturnMode={isReturnMode}
              isLoading={isLoading}
              isPOSDataLoading={isPOSDataLoading}
              onAddToCart={handleProductWithVariants}
              onAddSubscription={handleAddSubscription}
                        onBarcodeScanned={handleBarcodeScanned}
                        onOpenOrder={handleOpenOrder}
              onQuickAddProduct={handleProductWithVariants}
              onStockUpdate={handleStockUpdate}
              onRefreshData={handleRefreshData}
                      />
                  </div>

          {/* عمود السلة */}
          <div className="col-span-12 md:col-span-4 h-full">
            <div className="flex flex-col gap-4 sticky top-4 h-[calc(100vh-5rem)] overflow-hidden">
                <div className="flex-1 overflow-hidden flex flex-col border bg-card/30 rounded-lg">
                  {isReturnMode ? (
                    <Cart 
                      cartItems={returnItems}
                    customers={filteredUsers}
                      updateItemQuantity={updateReturnItemQuantity}
                      removeItemFromCart={removeReturnItem}
                      clearCart={clearReturnCart}
                      submitOrder={processReturn}
                    currentUser={currentUser}
                      selectedServices={[]}
                      removeService={() => {}}
                      updateServicePrice={() => {}}
                      selectedSubscriptions={[]}
                      removeSubscription={() => {}}
                      updateSubscriptionPrice={() => {}}
                      isReturnMode={isReturnMode}
                      returnReason={returnReason}
                      setReturnReason={setReturnReason}
                      returnNotes={returnNotes}
                      setReturnNotes={setReturnNotes}
                    />
                  ) : (
                    <CartTabManager
                      tabs={tabs}
                      activeTab={activeTab}
                      activeTabId={activeTabId}
                      setActiveTabId={setActiveTabId}
                      addTab={addTab}
                      removeTab={removeTab}
                      updateTab={updateTab}
                    customers={filteredUsers}
                    updateItemQuantity={(tabId, index, quantity) => updateItemQuantity(index, quantity)}
                    removeItemFromCart={(tabId, index) => removeItemFromCart(index)}
                    clearCart={clearCart}
                      submitOrder={submitOrder}
                    currentUser={currentUser}
                    removeService={removeService}
                    updateServicePrice={updateServicePrice}
                    removeSubscription={removeSubscription}
                    updateSubscriptionPrice={updateSubscriptionPrice}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* اختصارات التبويبات */}
      <CartTabShortcuts
        activeTabId={activeTabId}
        tabs={tabs.map(tab => ({ id: tab.id, name: tab.name }))}
        onSwitchTab={setActiveTabId}
        onAddTab={() => {
          try {
            addTab();
          } catch (error) {
            toast.error((error as Error).message);
          }
        }}
        onCloseTab={(tabId) => {
          try {
            removeTab(tabId);
          } catch (error) {
            toast.error((error as Error).message);
          }
        }}
        onDuplicateTab={(tabId) => {
          try {
            duplicateTab(tabId);
          } catch (error) {
            toast.error((error as Error).message);
          }
        }}
        isEnabled={!isReturnMode}
      />

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

      {/* نافذة إعدادات نقطة البيع */}
      <POSSettings
        isOpen={isPOSSettingsOpen}
        onOpenChange={setIsPOSSettingsOpen}
      />
      
      {/* نافذة خدمة التصليح */}
      {isAppEnabled('repair-services') && (
        <RepairServiceDialog
          isOpen={isRepairDialogOpen}
          onClose={() => setIsRepairDialogOpen(false)}
          onSuccess={handleRepairServiceSuccess}
        />
      )}

      {/* نافذة الإرجاع السريع */}
      <QuickReturnDialog
        isOpen={isQuickReturnOpen}
        onOpenChange={setIsQuickReturnOpen}
        onReturnCreated={() => {
          toast.success('تم إنشاء طلب الإرجاع بنجاح');
        }}
      />

      {/* نافذة الآلة الحاسبة */}
      <CalculatorComponent
        isOpen={isCalculatorOpen}
        onOpenChange={setIsCalculatorOpen}
      />

      {/* نافذة طباعة وصل التصليح */}
      {selectedRepairOrder && (
        <Dialog open={isRepairPrintDialogOpen} onOpenChange={setIsRepairPrintDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                طباعة وصل التصليح
              </DialogTitle>
              <DialogDescription>
                رقم الطلبية: {selectedRepairOrder.order_number || selectedRepairOrder.id.slice(0, 8)} | {selectedRepairOrder.customer_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="order-2 lg:order-1">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span>👁️</span>
                    معاينة الوصل
                  </h3>
                  <div className="border rounded-md p-2 bg-gray-50 max-h-96 overflow-y-auto">
                    <div className="transform scale-90 origin-top-right flex justify-center">
                      <RepairOrderPrint order={selectedRepairOrder} queuePosition={repairQueuePosition} />
                    </div>
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span>📋</span>
                    محتويات الوصل
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center gap-2">
                        <span>🧾</span>
                        إيصال العميل
                      </h4>
                      <ul className="text-xs space-y-1 text-blue-700 mr-4">
                        <li>• معلومات المتجر والعميل</li>
                        <li>• تفاصيل العطل والدفع</li>
                        <li>• رمز QR للتتبع</li>
                        <li>• شروط الخدمة</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-yellow-800 mb-2 flex items-center gap-2">
                        <span>🏷️</span>
                        لصقة الجهاز
                      </h4>
                      <ul className="text-xs space-y-1 text-yellow-700 mr-4">
                        <li>• رقم الطلبية بارز</li>
                        <li>• معلومات العميل المختصرة</li>
                        <li>• QR للتتبع والإنهاء</li>
                        <li>• مساحة لملاحظات الفني</li>
                        <li className="font-bold">• رقم الترتيب: {repairQueuePosition || 'غير محدد'}</li>
                      </ul>
                    </div>
                    </div>
                        </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <button 
                className="px-4 py-2 border rounded hover:bg-gray-50"
                onClick={() => setIsRepairPrintDialogOpen(false)}
              >
                إغلاق
              </button>
              <div className="flex gap-2">
                <RepairOrderPrint order={selectedRepairOrder} queuePosition={repairQueuePosition} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
};

export default POS;
