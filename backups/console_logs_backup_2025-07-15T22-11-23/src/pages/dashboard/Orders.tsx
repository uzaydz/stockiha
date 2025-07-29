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
type FilterOrderStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
import { supabase } from "@/lib/supabase";
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

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
    refresh,
    updateOrderLocally,
    updateFilters,
  } = useOrdersData({
    pageSize: 20,
    enablePolling: true,
    pollingInterval: 60000, // Refresh stats every minute
  });

  const { updateOrderStatus, bulkUpdateOrderStatus, updateCallConfirmation } = useOrderOperations(updateOrderLocally);
  
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

      // مسح الكاش أولاً لضمان الحصول على أحدث البيانات
      try {
        if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
          (window as any).clearOrganizationUnifiedCache(currentOrganization.id);
        }
      } catch (cacheError) {
      }

      try {
        const settings = await getOrganizationSettings(currentOrganization.id);
        
        setOrganizationSettings(settings);
        
        // استخراج إعداد خصم المخزون التلقائي من custom_js مع معالجة أفضل
        let autoDeductValue = false;

        if (settings?.custom_js) {
          
          try {
            let customJs;
            if (typeof settings.custom_js === 'string') {
              customJs = JSON.parse(settings.custom_js);
            } else {
              customJs = settings.custom_js;
            }

            // التحقق من وجود إعداد خصم المخزون التلقائي
            if (customJs && typeof customJs === 'object' && 'auto_deduct_inventory' in customJs) {
              autoDeductValue = customJs.auto_deduct_inventory === true;
            } else {
            }
          } catch (error) {
            autoDeductValue = false;
          }
        } else {
          autoDeductValue = false;
        }
        
        setAutoDeductInventory(autoDeductValue);
        
      } catch (error) {
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
      return;
    }

    setUpdatingSettings(true);

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
        } catch (error) {
        }
      }

      // تحديث إعداد خصم المخزون التلقائي
      const updatedCustomJs = {
        ...customJs,
        auto_deduct_inventory: enabled
      };

      // تحديث الإعدادات في قاعدة البيانات
      const updatedSettings = await updateOrganizationSettings(currentOrganization.id, {
        custom_js: JSON.stringify(updatedCustomJs)
      });

      if (updatedSettings) {
        // مسح التخزين المؤقت للإعدادات
        try {
          // مسح cache من UnifiedRequestManager
          if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
            (window as any).clearOrganizationUnifiedCache(currentOrganization.id);
          }
        } catch (cacheError) {
        }

        // تحديث الحالة المحلية
        setOrganizationSettings(updatedSettings);
        setAutoDeductInventory(enabled);

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
              
              if (actualValue !== enabled) {
                setAutoDeductInventory(actualValue);
              }
            }
          } catch (error) {
          }
        }, 1000);
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في التحديث",
          description: "فشل في حفظ الإعدادات، يرجى المحاولة مرة أخرى",
        });
      }
    } catch (error) {
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
    // No need to refresh - updateOrderStatus handles local update
  }, [updateOrderStatus]);

  // Handle bulk status update
  const handleBulkUpdateStatus = useCallback(async (orderIds: string[], newStatus: string) => {
    const result = await bulkUpdateOrderStatus(orderIds, newStatus);
    // No need to refresh - bulkUpdateOrderStatus handles local update
  }, [bulkUpdateOrderStatus]);

  // Handle sending order to shipping provider
  const handleSendToProvider = useCallback(async (orderId: string, providerCode: string) => {
    if (!currentOrganization?.id || !permissions.update) return;
    
    const providerDisplayName = SHIPPING_PROVIDER_NAMES[providerCode] || providerCode;
    
    console.log('🚀 [handleSendToProvider] بدء العملية:', {
      orderId,
      providerCode,
      providerDisplayName,
      organizationId: currentOrganization.id
    });
    
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
      
      console.log('📦 [handleSendToProvider] نتيجة API:', result);
      
      if (result.success) {
        console.log('✅ [handleSendToProvider] نجح الإرسال، بدء التحديث المحلي');
        
        // تحديث البيانات محلياً بدلاً من إعادة الجلب
        if (updateOrderLocally && result.trackingNumber) {
          const updateData: any = {
            shipping_provider: providerCode,
            updated_at: new Date().toISOString()
          };

          // تحديث حقل التتبع المناسب حسب المزود
          if (providerCode === 'yalidine') {
            updateData.yalidine_tracking_id = result.trackingNumber;
          } else if (providerCode === 'zrexpress') {
            updateData.zrexpress_tracking_id = result.trackingNumber;
          } else if (providerCode === 'maystro_delivery') {
            updateData.maystro_tracking_id = result.trackingNumber;
          } else {
            // لجميع مزودي Ecotrack
            updateData.ecotrack_tracking_id = result.trackingNumber;
          }

          // تحديث tracking_info أيضاً لتتطابق مع RPC
          updateData.tracking_info = {
            yalidine_tracking_id: updateData.yalidine_tracking_id || null,
            zrexpress_tracking_id: updateData.zrexpress_tracking_id || null,
            ecotrack_tracking_id: updateData.ecotrack_tracking_id || null,
            maystro_tracking_id: updateData.maystro_tracking_id || null,
            tracking_data: null,
            last_status_update: null,
            delivered_at: null,
            current_location: null,
            estimated_delivery_date: null
          };

          console.log('📝 [handleSendToProvider] بيانات التحديث المحلي:', updateData);
          
          updateOrderLocally(orderId, updateData);
          
          console.log('🔄 [handleSendToProvider] تم استدعاء updateOrderLocally');
        } else {
          console.warn('⚠️ [handleSendToProvider] لم يتم التحديث المحلي:', {
            hasUpdateFunction: !!updateOrderLocally,
            hasTrackingNumber: !!result.trackingNumber
          });
        }

        toast({
          title: "تم الإرسال بنجاح",
          description: `تم إرسال الطلب إلى ${providerDisplayName} برقم التتبع: ${result.trackingNumber}`,
          className: "bg-green-100 border-green-400 text-green-700",
        });
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
  }, [currentOrganization?.id, permissions.update, toast, updateOrderLocally]);

  // Handle filter changes
  const handleFilterChange = useCallback(({ status, searchTerm, dateRange }: any) => {
    // Reset to first page when filters change
    setCurrentPage(1);
    updateFilters({
      status: status || filters.status,
      searchTerm: searchTerm !== undefined ? searchTerm : filters.searchTerm,
      dateFrom: dateRange?.from || null,
      dateTo: dateRange?.to || null,
    });
  }, [updateFilters, filters]);

  // Handle page navigation
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1) {
      setCurrentPage(page);
      // Refresh data for new page
      refresh();
    }
  }, [refresh]);

  // Memoized values
  const totalPages = useMemo(() => Math.ceil(orders.length / pageSize), [orders.length, pageSize]);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

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
                {orders.length.toLocaleString()} طلب محمل
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
              activeStatus={filters.status as any}
                              setActiveStatus={(status: any) => {
                  setCurrentPage(1);
                  updateFilters({ status });
                }}
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
                  orders={orders.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                  loading={loading}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateCallConfirmation={async (orderId, statusId, notes, userId) => {
                    try {
                      // Update in database only - no fetch required
                      const { error } = await supabase
                        .from('online_orders')
                        .update({
                          call_confirmation_status_id: statusId,
                          call_confirmation_notes: notes,
                          call_confirmation_updated_at: new Date().toISOString(),
                          call_confirmation_updated_by: userId,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', orderId)
                        .eq('organization_id', currentOrganization?.id);

                      if (error) throw error;

                      // تحديث البيانات محلياً
                      if (updateOrderLocally) {
                        updateOrderLocally(orderId, {
                          call_confirmation_status_id: statusId,
                          call_confirmation_notes: notes,
                          call_confirmation_updated_at: new Date().toISOString(),
                          call_confirmation_updated_by: userId,
                          updated_at: new Date().toISOString()
                        });
                      }

                      toast({
                        title: "تم التحديث",
                        description: "تم تحديث حالة تأكيد الاتصال بنجاح"
                      });
                    } catch (error) {
                      toast({
                        variant: "destructive",
                        title: "خطأ في التحديث",
                        description: "حدث خطأ أثناء تحديث حالة تأكيد الاتصال"
                      });
                    }
                  }}
                  onSendToProvider={handleSendToProvider}
                  onBulkUpdateStatus={handleBulkUpdateStatus}
                  hasUpdatePermission={permissions.update}
                  hasCancelPermission={permissions.cancel}
                  visibleColumns={visibleColumns}
                  currentUserId={user?.id}
                  currentPage={currentPage}
                  totalItems={orders.length}
                  pageSize={pageSize}
                  hasNextPage={hasNextPage}
                  hasPreviousPage={hasPreviousPage}
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
