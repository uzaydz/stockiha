import { useEffect, useState, useCallback, memo } from 'react';
import Layout from '@/components/Layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import InventoryModern from '@/components/inventory/InventoryModern';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface InventoryProps extends POSSharedLayoutControls {}

const InventoryComponent = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}: InventoryProps) => {
  const { user } = useAuth();
  const perms = usePermissions();
  
  // صلاحيات المستخدم
  const [canViewInventory, setCanViewInventory] = useState(false);
  const [canManageInventory, setCanManageInventory] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);
  const renderWithLayout = (node: JSX.Element) => (
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
    <div className="container mx-auto py-6 px-4 sm:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">إدارة المخزون</h1>
          <p className="text-muted-foreground">
            نظام بسيط وسريع لإدارة مخزونك بسهولة
          </p>
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
