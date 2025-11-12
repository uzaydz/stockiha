import { useEffect, useState, useCallback, memo } from 'react';
import Layout from '@/components/Layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import InventoryModern from '@/components/inventory/InventoryModern';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getProducts as syncProductsOnline } from '@/lib/api/offlineProductsAdapter';
import { getUnsyncedTransactionsCount, syncInventoryData } from '@/lib/db/inventoryDB';
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

  const [refreshKey, setRefreshKey] = useState(0);
  const [useCacheBrowse, setUseCacheBrowse] = useState<boolean>(
    typeof window !== 'undefined' ? window.localStorage.getItem('inventory_use_cache') === '1' : false
  );
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

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
        isRefreshing: isCheckingPermissions,
        connectionStatus: !canViewInventory && !isCheckingPermissions ? 'disconnected' : 'connected'
      });
    });
  }, [onLayoutStateChange, isCheckingPermissions, canViewInventory]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleToggleCacheBrowse = useCallback(() => {
    const next = !useCacheBrowse;
    setUseCacheBrowse(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('inventory_use_cache', next ? '1' : '0');
    }
    setRefreshKey((prev) => prev + 1);
  }, [useCacheBrowse]);

  const handleSyncNow = useCallback(async () => {
    try {
      if (!isOnline) return;
      // جلب من الخادم وحفظ Bulk عبر offlineProductsAdapter
      // includeInactive = true لضمان إتاحة التصفح الكامل محلياً
      const orgId = (user as any)?.user_metadata?.organization_id;
      if (!orgId) return;
      await syncProductsOnline(orgId, true);
      setRefreshKey((prev) => prev + 1);
    } catch {
      // تجاهل
    }
  }, [isOnline, user]);

  const handleSyncInventory = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const syncedCount = await syncInventoryData();
      if (syncedCount > 0) {
        toast.success(`تمت مزامنة ${syncedCount} عملية مخزون`);
        setRefreshKey((prev) => prev + 1);
        // تحديث العداد
        const newCount = await getUnsyncedTransactionsCount();
        setUnsyncedCount(newCount);
      } else {
        toast.info('لا توجد عمليات معلقة للمزامنة');
      }
    } catch (error: any) {
      toast.error('فشلت المزامنة: ' + (error?.message || 'خطأ غير معروف'));
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // تحديث عداد العمليات غير المتزامنة
  useEffect(() => {
    const updateUnsyncedCount = async () => {
      try {
        const count = await getUnsyncedTransactionsCount();
        setUnsyncedCount(count);
      } catch {
        // تجاهل
      }
    };

    updateUnsyncedCount();

    // تحديث العداد كل 10 ثوانٍ
    const intervalId = setInterval(updateUnsyncedCount, 10000);

    return () => clearInterval(intervalId);
  }, [refreshKey]);

  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(() => {
      handleRefresh();
    });
    return () => {
      onRegisterRefresh(null);
    };
  }, [onRegisterRefresh, handleRefresh]);

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

  // عرض النظام الجديد
  const pageContent = (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">إدارة المخزون</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            نظام بسيط وسريع لإدارة مخزونك بسهولة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> تحديث
          </Button>
          <Button
            variant={useCacheBrowse ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleCacheBrowse}
            className="h-8"
          >
            {useCacheBrowse ? 'تصفح من الكاش' : 'تصفح أونلاين'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNow}
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
              disabled={!isOnline || isSyncing}
              className="h-8 bg-orange-500 hover:bg-orange-600"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  جاري المزامنة...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  مزامنة المخزون ({unsyncedCount})
                </>
              )}
            </Button>
          )}
          {(!isOnline || useCacheBrowse) && (
            <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
              {isOnline ? 'التصفح من الكاش' : 'وضع الأوفلاين'}
            </Badge>
          )}
          {unsyncedCount > 0 && !isOnline && (
            <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
              {unsyncedCount} عملية معلقة
            </Badge>
          )}
        </div>

        <InventoryModern key={refreshKey} />
      </div>
    </div>
  );

  return renderWithLayout(pageContent);
};

const Inventory = memo(InventoryComponent);

Inventory.displayName = 'Inventory';

export default Inventory;
