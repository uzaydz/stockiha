import { useEffect, useState, useCallback, memo } from 'react';
import Layout from '@/components/Layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Lock, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { InventoryModernAdvanced } from '@/components/inventory';
import { useAdvancedInventory } from '@/hooks/useAdvancedInventory';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getProducts as syncProductsOnline } from '@/lib/api/offlineProductsAdapter';
import { toast } from 'sonner';

interface InventoryProps extends POSSharedLayoutControls {}

const InventoryComponent = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}: InventoryProps) => {
  const { user } = useAuth();
  const perms = usePermissions();
  const { isOnline } = useNetworkStatus();

  // صلاحيات المستخدم
  const [canViewInventory, setCanViewInventory] = useState(false);
  const [canManageInventory, setCanManageInventory] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  // استخدام hook المخزون المتقدم
  const {
    products,
    stats,
    total,
    filtered,
    totalPages,
    loading,
    updating,
    syncing,
    unsyncedCount,
    filters,
    updateFilters,
    goToPage,
    updateStock,
    refresh,
    syncNow,
  } = useAdvancedInventory({
    autoSync: true,
    syncInterval: 30000,
  });

  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanViewInventory(false);
        setCanManageInventory(false);
        setIsCheckingPermissions(false);
        return;
      }

      // 🔥 إصلاح: فحص الصلاحيات من مصادر متعددة
      let canView = false;
      let canManage = false;

      // 1. فحص محلي من user metadata أولاً (أسرع وأكثر موثوقية)
      const isOrgAdmin = user?.user_metadata?.is_org_admin === true || 
                        user?.app_metadata?.is_org_admin === true;
      const isSuperAdmin = user?.user_metadata?.is_super_admin === true || 
                          user?.app_metadata?.is_super_admin === true;
      const userRole = user?.user_metadata?.role || user?.app_metadata?.role || user?.role;
      
      // المسؤولون لهم جميع الصلاحيات
      if (isOrgAdmin || isSuperAdmin || userRole === 'admin' || userRole === 'owner') {
        canView = true;
        canManage = true;
      } else {
        // فحص الصلاحيات المحددة
        const permissions = user?.user_metadata?.permissions || user?.app_metadata?.permissions || {};
        canView = permissions.viewInventory === true || 
                 permissions.manageInventory === true || 
                 permissions.manageProducts === true;
        canManage = permissions.manageInventory === true || 
                   permissions.manageProducts === true;
      }

      // 2. إذا لم تكن هناك صلاحيات محلية، جرب PermissionsContext
      if (!canView && perms.ready && perms.data) {
        canView = perms.isOrgAdmin || 
                 perms.isSuperAdmin ||
                 perms.data?.has_inventory_access || 
                 perms.data?.can_manage_products || 
                 perms.anyOf(['viewInventory', 'manageInventory', 'manageProducts']);
                 
        canManage = perms.isOrgAdmin || 
                   perms.isSuperAdmin ||
                   perms.data?.can_manage_products || 
                   perms.anyOf(['manageInventory', 'manageProducts']);
      }
      
      
      setCanViewInventory(canView);
      setCanManageInventory(canManage);
      setIsCheckingPermissions(false);
    };
    
    checkPermissions();
  }, [user, perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin, perms.data]);

  // عرض رسالة عدم وجود صلاحية
  useEffect(() => {
    if (!onLayoutStateChange) return;
    queueMicrotask(() => {
      onLayoutStateChange({
        isRefreshing: isCheckingPermissions || loading,
        connectionStatus: !canViewInventory && !isCheckingPermissions ? 'disconnected' : 'connected'
      });
    });
  }, [onLayoutStateChange, isCheckingPermissions, canViewInventory, loading]);

  // مزامنة المنتجات من الخادم
  const handleSyncProducts = useCallback(async () => {
    try {
      if (!isOnline) return;
      const orgId = (user as any)?.user_metadata?.organization_id;
      if (!orgId) return;
      toast.info('جاري مزامنة المنتجات...');
      await syncProductsOnline(orgId, true);
      refresh();
      toast.success('تمت مزامنة المنتجات بنجاح');
    } catch (error: any) {
      toast.error('فشلت مزامنة المنتجات');
    }
  }, [isOnline, user, refresh]);

  // مزامنة عمليات المخزون المعلقة
  const handleSyncInventory = useCallback(async () => {
    if (!isOnline || syncing) return;

    try {
      const syncedCount = await syncNow();
      if (syncedCount > 0) {
        toast.success(`تمت مزامنة ${syncedCount} عملية مخزون`);
      } else {
        toast.info('لا توجد عمليات معلقة للمزامنة');
      }
    } catch (error: any) {
      toast.error('فشلت المزامنة: ' + (error?.message || 'خطأ غير معروف'));
    }
  }, [isOnline, syncing, syncNow]);

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(() => {
      refresh();
    });
    return () => {
      onRegisterRefresh(null);
    };
  }, [onRegisterRefresh, refresh]);

  if (!canViewInventory && !isCheckingPermissions) {
    return renderWithLayout(
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ليس لديك صلاحية</AlertTitle>
          <AlertDescription>
            ليس لديك صلاحية للوصول إلى صفحة المخزون. يرجى التواصل مع مدير النظام للحصول على هذه الصلاحية.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center items-center mt-10 py-20">
          <div className="text-center">
            <Lock className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">صفحة محظورة</h2>
            <p className="mt-2 text-muted-foreground">
              ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع مدير النظام.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // عرض مؤشر تحميل أثناء التحقق من الصلاحيات
  if (isCheckingPermissions) {
    return renderWithLayout(
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
          </div>
        </div>
      </div>
    );
  }

  // عرض النظام المتقدم الجديد
  const pageContent = (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
      <div className="space-y-4 sm:space-y-6">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">إدارة المخزون المتقدمة</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              نظام متكامل لإدارة جميع أنواع المخزون: قطعة، وزن، كرتون، متر، ألوان ومقاسات
            </p>
          </div>

          {/* حالة الاتصال */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-green-50 text-green-700 border-green-200">
                <Wifi className="h-3 w-3 ml-1" />
                متصل
              </Badge>
            ) : (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                <WifiOff className="h-3 w-3 ml-1" />
                أوفلاين
              </Badge>
            )}
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncProducts}
            disabled={!isOnline}
            className="h-8"
          >
            مزامنة المنتجات
          </Button>

          {unsyncedCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncInventory}
              disabled={!isOnline || syncing}
              className="h-8 bg-orange-500 hover:bg-orange-600"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                  جاري المزامنة...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-1" />
                  مزامنة المخزون ({unsyncedCount})
                </>
              )}
            </Button>
          )}

          {unsyncedCount > 0 && !isOnline && (
            <Badge className="bg-red-50 text-red-700 border-red-200">
              {unsyncedCount} عملية معلقة
            </Badge>
          )}
        </div>

        {/* المكون المتقدم للمخزون */}
        <InventoryModernAdvanced
          products={products}
          stats={stats}
          loading={loading}
          filters={filters}
          total={total}
          filtered={filtered}
          totalPages={totalPages}
          onUpdateFilters={updateFilters}
          onGoToPage={goToPage}
          onRefresh={refresh}
          onUpdateStock={updateStock}
          isUpdating={updating}
        />
      </div>
    </div>
  );

  return renderWithLayout(pageContent);
};

const Inventory = memo(InventoryComponent);

Inventory.displayName = 'Inventory';

export default Inventory;
