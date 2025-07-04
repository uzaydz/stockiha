import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { toast } from "sonner";
import { Product, Order, User as AppUser, Service } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// استيراد Hook الجديد
import useCompletePOSData from '@/hooks/useCompletePOSData';

// استيراد المكونات المحسنة (سننشئها)
import Layout from '@/components/Layout';
import POSAdvancedHeader from '@/components/pos-advanced/POSAdvancedHeader';
import POSAdvancedContent from '@/components/pos-advanced/POSAdvancedContent';
import POSAdvancedCart from '@/components/pos-advanced/POSAdvancedCart';
import POSAdvancedSidebar from '@/components/pos-advanced/POSAdvancedSidebar';

// استيراد الـ hooks المحسنة الموجودة
import { usePOSBarcode } from '@/components/pos/hooks/usePOSBarcode';
import { usePOSCart } from '@/components/pos/hooks/usePOSCart';
import { usePOSReturn } from '@/components/pos/hooks/usePOSReturn';
import { usePOSOrder } from '@/components/pos/hooks/usePOSOrder';
import { usePOSKeyboard } from '@/components/pos/hooks/usePOSKeyboard';

// استيراد النوافذ الحوارية
import ProductVariantSelector from '@/components/pos/ProductVariantSelector';
import POSSettings from '@/components/pos/settings/POSSettings';
import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
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

// مكون لعرض إحصائيات سريعة
const QuickStats = ({ inventoryStats, orderStats, isLoading }: {
  inventoryStats?: any;
  orderStats?: any;
  isLoading: boolean;
}) => {
  const stats = useMemo(() => [
    {
      title: 'إجمالي المنتجات',
      value: inventoryStats?.totalProducts || 0,
      icon: Package2,
      color: 'blue',
      trend: '+12%'
    },
    {
      title: 'مبيعات اليوم',
      value: orderStats?.todaySales || 0,
      icon: DollarSign,
      color: 'green',
      trend: '+8%',
      format: 'currency'
    },
    {
      title: 'طلبات اليوم',
      value: orderStats?.todayOrders || 0,
      icon: ShoppingCart,
      color: 'purple',
      trend: '+5%'
    },
    {
      title: 'نفد المخزون',
      value: inventoryStats?.outOfStockProducts || 0,
      icon: AlertCircle,
      color: 'red',
      trend: inventoryStats?.outOfStockProducts > 0 ? 'تحذير' : 'جيد'
    }
  ], [inventoryStats, orderStats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, i) => {
        const IconComponent = stat.icon;
        const colorClasses = {
          blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
          green: 'bg-green-500/10 text-green-600 border-green-200',
          purple: 'bg-purple-500/10 text-purple-600 border-purple-200',
          red: 'bg-red-500/10 text-red-600 border-red-200'
        };

        return (
          <Card key={i} className={cn(
            "p-4 transition-all duration-200 hover:shadow-md cursor-pointer",
            "border-l-4",
            colorClasses[stat.color as keyof typeof colorClasses]
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">
                  {stat.format === 'currency' 
                    ? `${stat.value.toLocaleString()} دج`
                    : stat.value.toLocaleString()
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.trend}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                colorClasses[stat.color as keyof typeof colorClasses]
              )}>
                <IconComponent className="h-6 w-6" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const POSAdvanced = () => {
  // =================================================================
  // 🔧 الحالة والبيانات الأساسية
  // =================================================================
  
  const { user } = useAuth();
  const { isAppEnabled } = useApps();
  const { currentOrganization } = useTenant();

  // استخدام Hook الجديد لجلب جميع البيانات
  const {
    // البيانات
    products,
    subscriptions,
    subscriptionCategories,
    productCategories,
    posSettings,
    organizationApps,
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

  // الحالات المحلية للواجهة
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [isPOSSettingsOpen, setIsPOSSettingsOpen] = useState(false);
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [isQuickReturnOpen, setIsQuickReturnOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    addOrder: () => Promise.resolve({} as Order), // سنحتاج لتنفيذ هذا
    users: filteredUsers,
    orders: recentOrders,
    products,
    updateProductStockInCache,
    refreshProducts: refreshData,
    refreshPOSData: refreshData,
    clearCart
  });

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

  // Hook الباركود
  const { barcodeBuffer } = usePOSBarcode({
    products,
    currentOrganizationId: currentOrganization?.id,
    onAddToCart: isReturnMode ? addItemToReturnCart : addItemToCart,
    onAddVariant: addVariantToCart
  });

  // Hook لوحة المفاتيح
  usePOSKeyboard({
    onCalculatorOpen: () => setIsCalculatorOpen(true),
    onQuickReturnOpen: () => setIsQuickReturnOpen(true),
    onPOSSettingsOpen: () => setIsPOSSettingsOpen(true),
    onRefreshData: handleRefreshData,
    isLoading: isLoading || isRefetching
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
      <div className="flex h-screen overflow-hidden bg-background">
        {/* الشريط الجانبي القابل للطي */}
        <POSAdvancedSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          favoriteProducts={favoriteProducts}
          recentOrders={recentOrders.slice(0, 5)}
          onQuickAddProduct={handleProductWithVariants}
          onOpenOrder={handleOpenOrder}
          inventoryStats={inventoryStats}
          orderStats={orderStats}
        />

        {/* المحتوى الرئيسي */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* الترويسة المحسنة */}
          <POSAdvancedHeader
            isReturnMode={isReturnMode}
            returnItemsCount={returnItems.length}
            isRepairServicesEnabled={isAppEnabled('repair-services')}
            isPOSDataLoading={isRefetching}
            onQuickReturnOpen={() => setIsQuickReturnOpen(true)}
            onCalculatorOpen={() => setIsCalculatorOpen(true)}
            onToggleReturnMode={toggleReturnMode}
            onPOSSettingsOpen={() => setIsPOSSettingsOpen(true)}
            onRefreshData={handleRefreshData}
            executionTime={executionTime}
            dataTimestamp={dataTimestamp}
          />

          {/* الإحصائيات السريعة */}
          <div className="px-6 py-2">
            <QuickStats
              inventoryStats={inventoryStats}
              orderStats={orderStats}
              isLoading={false}
            />
          </div>

          {/* المحتوى الأساسي */}
          <div className="flex-1 flex gap-4 p-4 overflow-hidden">
            {/* منطقة المنتجات والاشتراكات */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <POSAdvancedContent
                  products={products}
                  subscriptions={subscriptions}
                  subscriptionCategories={subscriptionCategories}
                  favoriteProducts={favoriteProducts}
                  isReturnMode={isReturnMode}
                  isLoading={false}
                  isPOSDataLoading={isRefetching}
                  onAddToCart={handleProductWithVariants}
                  onAddSubscription={handleAddSubscription}
                  onRefreshData={handleRefreshData}
                />
              </Suspense>
            </div>

            {/* منطقة السلة */}
            <div className="w-80 flex flex-col overflow-hidden">
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
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
                  removeItemFromCart={removeItemFromCart}
                  clearCart={clearCart}
                  submitOrder={submitOrder}
                  // دوال إدارة الإرجاع
                  updateReturnItemQuantity={updateReturnItemQuantity}
                  removeReturnItem={removeReturnItem}
                  clearReturnCart={clearReturnCart}
                  processReturn={processReturn}
                  setReturnReason={setReturnReason}
                  setReturnNotes={setReturnNotes}
                  // دوال الخدمات والاشتراكات
                  removeService={removeService}
                  updateServicePrice={updateServicePrice}
                  removeSubscription={removeSubscription}
                  updateSubscriptionPrice={updateSubscriptionPrice}
                  // حالة التحميل
                  isSubmittingOrder={isSubmittingOrder}
                />
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
