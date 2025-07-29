import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldAlert, Package, TrendingUp, Clock, CheckCircle, DollarSign, AlertTriangle, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkUserPermissions } from "@/lib/api/permissions";
import { OrdersDataProvider } from '@/context/OrdersDataContext';
import { useOrdersData, useOrderOperations } from "@/hooks/useOrdersData";
import { sendOrderToShippingProvider } from "@/utils/ecotrackShippingIntegration";
import { useEnabledShippingProviders } from "@/hooks/useEnabledShippingProviders";
import { 
  ORDER_STATUS_LABELS, 
  getOrderCustomerName,
  getTrackingField,
  SHIPPING_PROVIDER_NAMES,
  formatCurrency
} from "@/utils/ordersHelpers";
// استيراد دوال إدارة إعدادات المؤسسة
import { getOrganizationSettings, updateOrganizationSettings } from "@/lib/api/settings";
import type { OrganizationSettings } from "@/types/settings";

// Lazy load heavy components
const OrdersTable = lazy(() => import("@/components/orders/table/OrdersTable"));
const OrdersTableMobile = lazy(() => import("@/components/orders/OrdersTableMobile"));
const OrdersDashboard = lazy(() => import("@/components/orders/OrdersDashboard"));
const OrdersAdvancedFilters = lazy(() => import("@/components/orders/OrdersAdvancedFilters"));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-48">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Main component
const Orders = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Permissions state
  const [permissions, setPermissions] = useState({
    view: false,
    update: false,
    cancel: false,
    loading: true,
  });

  // إعدادات المؤسسة وخصم المخزون التلقائي
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [autoDeductInventory, setAutoDeductInventory] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // View preferences
  const [viewMode, setViewMode] = useState<'table' | 'mobile'>('table');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact', 
    'total', 'items', 'status', 'call_confirmation', 'shipping_provider', 
    'source', 'actions'
  ]);

  // Use custom hooks for data management
  const {
    orders,
    loading,
    error,
    hasMore,
    orderCounts,
    orderStats,
    filters,
    loadMore,
    goToPage,
    applyFilters,
    refresh,
    pageSize,
    currentPage,
    totalCount,
  } = useOrdersData({
    pageSize: 20,
    enablePolling: true,
    pollingInterval: 60000, // Refresh stats every minute
  });

  const { updateOrderStatus, bulkUpdateOrderStatus } = useOrderOperations();
  
  // جلب شركات الشحن المفعلة مرة واحدة لكامل الصفحة
  const {
    enabledProviders: shippingProviders,
    isLoading: loadingProviders,
    error: providersError
  } = useEnabledShippingProviders(currentOrganization?.id || '');

  // Check viewport size for responsive design
  useEffect(() => {
    const checkViewport = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'table');
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      
      try {
        const [canView, canUpdate, canCancel] = await Promise.all([
          checkUserPermissions(user, 'viewOrders' as any),
          checkUserPermissions(user, 'updateOrderStatus' as any),
          checkUserPermissions(user, 'cancelOrders' as any),
        ]);

        setPermissions({
          view: canView,
          update: canUpdate,
          cancel: canCancel,
          loading: false,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك",
        });
        setPermissions(prev => ({ ...prev, loading: false }));
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  // تحميل إعدادات المؤسسة
  useEffect(() => {
    const loadOrganizationSettings = async () => {
      if (!currentOrganization?.id) {
        setLoadingSettings(false);
        return;
      }

      console.log('🔄 تحميل إعدادات المؤسسة:', currentOrganization.id);

      // مسح الكاش أولاً لضمان الحصول على أحدث البيانات
      try {
        if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
          (window as any).clearOrganizationUnifiedCache(currentOrganization.id);
          console.log('🧹 تم مسح التخزين المؤقت قبل تحميل الإعدادات');
        }
      } catch (cacheError) {
        console.warn('⚠️ تحذير: فشل في مسح التخزين المؤقت:', cacheError);
      }

      try {
        const settings = await getOrganizationSettings(currentOrganization.id);
        console.log('📋 الإعدادات المحملة:', settings);
        
        setOrganizationSettings(settings);
        
        // استخراج إعداد خصم المخزون التلقائي من custom_js مع معالجة أفضل
        let autoDeductValue = false;
        
        console.log('🔍 فحص وجود custom_js:', {
          hasCustomJs: !!settings?.custom_js,
          customJsType: typeof settings?.custom_js,
          customJsLength: settings?.custom_js?.length,
          settingsKeys: settings ? Object.keys(settings) : 'no settings'
        });
        
        if (settings?.custom_js) {
          console.log('🔍 فحص custom_js:', settings.custom_js);
          
          try {
            let customJs;
            if (typeof settings.custom_js === 'string') {
              customJs = JSON.parse(settings.custom_js);
            } else {
              customJs = settings.custom_js;
            }
            
            console.log('📊 البيانات المحللة من custom_js:', customJs);
            
            // التحقق من وجود إعداد خصم المخزون التلقائي
            if (customJs && typeof customJs === 'object' && 'auto_deduct_inventory' in customJs) {
              autoDeductValue = customJs.auto_deduct_inventory === true;
              console.log('✅ تم العثور على إعداد خصم المخزون التلقائي:', autoDeductValue);
            } else {
              console.log('ℹ️ لم يتم العثور على إعداد خصم المخزون التلقائي في الكائن، استخدام القيمة الافتراضية: false');
              console.log('🔍 محتويات customJs:', customJs);
              console.log('🔍 مفاتيح customJs:', customJs ? Object.keys(customJs) : 'no keys');
            }
          } catch (error) {
            console.error('❌ خطأ في تحليل custom_js:', error);
            console.log('🔧 استخدام القيمة الافتراضية: false');
            autoDeductValue = false;
          }
        } else {
          console.log('ℹ️ custom_js فارغ أو غير موجود، استخدام القيمة الافتراضية: false');
          autoDeductValue = false;
        }
        
        setAutoDeductInventory(autoDeductValue);
        console.log('🎯 تم تعيين قيمة خصم المخزون التلقائي إلى:', autoDeductValue);
        
      } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات المؤسسة:', error);
        toast({
          variant: "destructive",
          title: "خطأ في تحميل الإعدادات",
          description: "حدث خطأ أثناء تحميل إعدادات المؤسسة",
        });
        setAutoDeductInventory(false);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadOrganizationSettings();
  }, [currentOrganization?.id, toast]);

  // دالة تحديث إعداد خصم المخزون التلقائي
  const handleToggleAutoDeductInventory = async (enabled: boolean) => {
    if (!currentOrganization?.id) {
      console.error('معرف المؤسسة مفقود');
      return;
    }

    setUpdatingSettings(true);
    console.log('🔄 بدء تحديث إعداد خصم المخزون التلقائي:', { enabled, organizationId: currentOrganization.id });

    try {
      // استخراج البيانات الموجودة من custom_js مع معالجة أفضل للأخطاء
      let customJs: any = {
        trackingPixels: {
          facebook: { enabled: false, pixelId: '' },
          tiktok: { enabled: false, pixelId: '' },
          snapchat: { enabled: false, pixelId: '' },
          google: { enabled: false, pixelId: '' }
        }
      };

      if (organizationSettings?.custom_js) {
        try {
          if (typeof organizationSettings.custom_js === 'string') {
            customJs = JSON.parse(organizationSettings.custom_js);
          } else {
            customJs = organizationSettings.custom_js;
          }
          console.log('📋 البيانات الموجودة في custom_js:', customJs);
        } catch (error) {
          console.error('❌ خطأ في تحليل custom_js الموجود:', error);
          console.log('🔧 استخدام القيم الافتراضية');
        }
      }

      // تحديث إعداد خصم المخزون التلقائي
      const updatedCustomJs = {
        ...customJs,
        auto_deduct_inventory: enabled
      };

      console.log('📝 البيانات المحدثة لـ custom_js:', updatedCustomJs);

      // تحديث الإعدادات في قاعدة البيانات
      const updatedSettings = await updateOrganizationSettings(currentOrganization.id, {
        custom_js: JSON.stringify(updatedCustomJs)
      });

      console.log('✅ نتيجة تحديث الإعدادات:', updatedSettings);

      if (updatedSettings) {
        // مسح التخزين المؤقت للإعدادات
        try {
          // مسح cache من UnifiedRequestManager
          if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
            (window as any).clearOrganizationUnifiedCache(currentOrganization.id);
            console.log('🧹 تم مسح التخزين المؤقت للمؤسسة');
          }
        } catch (cacheError) {
          console.warn('⚠️ تحذير: فشل في مسح التخزين المؤقت:', cacheError);
        }

        // تحديث الحالة المحلية
        setOrganizationSettings(updatedSettings);
        setAutoDeductInventory(enabled);
        
        console.log('🎉 تم تحديث الحالة المحلية بنجاح');
        
        toast({
          title: enabled ? "تم تفعيل خصم المخزون التلقائي" : "تم إلغاء خصم المخزون التلقائي",
          description: enabled 
            ? "سيتم خصم المخزون تلقائياً عند إنشاء الطلبيات الجديدة"
            : "لن يتم خصم المخزون تلقائياً، ستحتاج لتأكيد الطلبيات يدوياً",
          className: enabled ? "bg-green-100 border-green-400 text-green-700" : undefined,
        });

        // إعادة تحميل الإعدادات للتأكد من الحفظ
        setTimeout(async () => {
          try {
            const reloadedSettings = await getOrganizationSettings(currentOrganization.id);
            if (reloadedSettings?.custom_js) {
              const parsedJs = JSON.parse(reloadedSettings.custom_js);
              const actualValue = parsedJs?.auto_deduct_inventory === true;
              console.log('🔍 التحقق من القيمة المحفوظة:', actualValue);
              
              if (actualValue !== enabled) {
                console.error('⚠️ تحذير: القيمة المحفوظة لا تطابق القيمة المطلوبة');
                setAutoDeductInventory(actualValue);
              }
            }
          } catch (error) {
            console.error('❌ خطأ في إعادة تحميل الإعدادات:', error);
          }
        }, 1000);
      } else {
        console.error('❌ فشل في تحديث الإعدادات - لم يتم إرجاع بيانات');
        toast({
          variant: "destructive",
          title: "خطأ في التحديث",
          description: "فشل في حفظ الإعدادات، يرجى المحاولة مرة أخرى",
        });
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث إعدادات المؤسسة:', error);
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث إعدادات خصم المخزون التلقائي",
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Handle order status update with optimistic updates
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      refresh(); // Refresh data after successful update
    }
  }, [updateOrderStatus, refresh]);

  // Handle bulk status update
  const handleBulkUpdateStatus = useCallback(async (orderIds: string[], newStatus: string) => {
    const result = await bulkUpdateOrderStatus(orderIds, newStatus);
    if (result.success) {
      refresh(); // Refresh data after successful update
    }
  }, [bulkUpdateOrderStatus, refresh]);

  // Handle sending order to shipping provider
  const handleSendToProvider = useCallback(async (orderId: string, providerCode: string) => {
    if (!currentOrganization?.id || !permissions.update) return;
    
    const providerDisplayName = SHIPPING_PROVIDER_NAMES[providerCode] || providerCode;
    
    try {
      toast({
        title: "جاري الإرسال...",
        description: `جاري إرسال الطلب إلى ${providerDisplayName}`,
      });

      const result = await sendOrderToShippingProvider(
        orderId, 
        providerCode, 
        currentOrganization.id
      );
      
      if (result.success) {
        toast({
          title: "تم الإرسال بنجاح",
          description: `تم إرسال الطلب إلى ${providerDisplayName} برقم التتبع: ${result.trackingNumber}`,
          className: "bg-green-100 border-green-400 text-green-700",
        });
        refresh(); // Refresh data
      } else {
        toast({
          variant: "destructive",
          title: "فشل في الإرسال",
          description: result.message || "حدث خطأ أثناء إرسال الطلب",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: `حدث خطأ أثناء محاولة إرسال الطلب إلى ${providerDisplayName}`,
      });
    }
  }, [currentOrganization?.id, permissions.update, toast, refresh]);

  // Handle filter changes
  const handleFilterChange = useCallback(({ status, searchTerm, dateRange }: any) => {
    applyFilters({
      status: status || filters.status,
      searchTerm: searchTerm !== undefined ? searchTerm : filters.searchTerm,
      dateFrom: dateRange?.from || null,
      dateTo: dateRange?.to || null,
    });
  }, [applyFilters, filters]);

  // Handle page navigation
  const handlePageChange = useCallback((page: number) => {
    if (goToPage) {
      // Convert from 1-based page number to 0-based index
      goToPage(page - 1);
    }
  }, [goToPage]);

  // Memoized values
  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);

  // Quick stats cards data
  const statsCards = useMemo(() => [
    {
      title: "إجمالي المبيعات",
      value: orderStats.totalSales,
      icon: Package,
      trend: orderStats.salesTrend,
      color: "text-green-600",
    },
    {
      title: "متوسط قيمة الطلب",
      value: orderStats.avgOrderValue,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "الطلبات المعلقة",
      value: orderCounts.pending,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "الطلبات المكتملة",
      value: orderCounts.delivered,
      icon: CheckCircle,
      color: "text-green-600",
    },
  ], [orderStats, orderCounts]);

  // Loading state
  if (permissions.loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin ml-2" />
          <span>جاري التحميل...</span>
        </div>
      </Layout>
    );
  }

  // Permission denied state
  if (!permissions.view) {
    return (
      <Layout>
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>
            ليس لديك صلاحية لعرض صفحة الطلبات. يرجى التواصل مع مدير النظام.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header - Following Dashboard Design Pattern */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الطلبات</h1>
              <Badge variant="outline" className="text-sm">
                {totalCount.toLocaleString()} طلب إجمالي
              </Badge>
            </div>
            
            {/* زر تفعيل خصم المخزون التلقائي */}
            <div className="flex items-center gap-3">
              {loadingSettings ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري التحميل...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-background/80 border border-border/30 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">خصم المخزون التلقائي</span>
                  </div>
                  <Switch
                    checked={autoDeductInventory}
                    onCheckedChange={handleToggleAutoDeductInventory}
                    disabled={updatingSettings}
                    className="data-[state=checked]:bg-green-600"
                  />
                  {updatingSettings && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Stats Grid - Using Exact Dashboard StatCard Pattern */}
          <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground">ملخص الطلبات</h2>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {statsCards.map((card, index) => (
                <Card key={index} className="rounded-xl bg-background/80 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center h-5 w-5 bg-primary/10 text-primary rounded-md text-xs font-medium border border-primary/20">
                            {index + 1}
                          </span>
                          <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        </div>
                        <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                          card.color === 'text-green-600' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 
                          card.color === 'text-blue-600' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                          card.color === 'text-yellow-600' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                          'bg-primary/10 text-primary'
                        }`}>
                          <card.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-foreground">
                          {typeof card.value === 'number' && card.title.includes('المبيعات') ? 
                            formatCurrency(card.value) : card.value}
                        </div>
                        {card.trend && card.trend !== 0 && card.title.includes('المبيعات') && (
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs ${
                            card.trend > 0 ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400' : 
                            'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'
                          }`}>
                            <TrendingUp className="h-3 w-3" />
                            <span>{card.trend > 0 ? '+' : ''}{card.trend}%</span>
                          </div>
                        )}
                        {card.title === 'متوسط قيمة الطلب' && (
                          <p className="text-xs text-muted-foreground">
                            لكل طلب
                          </p>
                        )}
                        {card.title === 'الطلبات المعلقة' && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(orderStats.pendingAmount)} في الانتظار
                          </p>
                        )}
                        {card.title === 'الطلبات المكتملة' && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(orderStats.avgOrderValue)} متوسط القيمة
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
            <AlertDescription>
              حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى أو تحديث الصفحة.
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Filters Section - Following Dashboard Pattern */}
        <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
          <Suspense fallback={<LoadingFallback />}>
            <OrdersAdvancedFilters
              orderCounts={orderCounts}
              onFilterChange={handleFilterChange}
              activeStatus={filters.status}
              setActiveStatus={(status) => applyFilters({ status })}
            />
          </Suspense>
        </div>

        {/* Main Orders Content */}
        <div className="space-y-4">
          {/* Orders Table/List */}
          <Suspense fallback={<LoadingFallback />}>
            {viewMode === 'mobile' ? (
              <OrdersTableMobile
                orders={orders}
                loading={loading}
                onUpdateStatus={handleUpdateStatus}
                onSendToProvider={handleSendToProvider}
                hasUpdatePermission={permissions.update}
                hasCancelPermission={permissions.cancel}
                onLoadMore={loadMore}
                hasMore={hasMore}
              />
            ) : (
              <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm">
                <OrdersTable
                  orders={orders}
                  loading={loading}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateCallConfirmation={() => {}}
                  onSendToProvider={handleSendToProvider}
                  onBulkUpdateStatus={handleBulkUpdateStatus}
                  hasUpdatePermission={permissions.update}
                  hasCancelPermission={permissions.cancel}
                  visibleColumns={visibleColumns}
                  currentUserId={user?.id}
                  currentPage={currentPage + 1}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  hasNextPage={currentPage + 1 < totalPages}
                  hasPreviousPage={currentPage > 0}
                  onPageChange={handlePageChange}
                  hasMoreOrders={hasMore}
                  shippingProviders={shippingProviders}
                />
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </Layout>
  );
};

// Export with provider
const OrdersWithProvider = () => {
  return (
    <OrdersDataProvider>
      <Orders />
    </OrdersDataProvider>
  );
};

export default OrdersWithProvider;
