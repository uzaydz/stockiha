import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import InventoryPerformanceOptimized from '@/components/inventory/InventoryPerformanceOptimized';
import ProductInventoryDetails from '@/components/inventory/ProductInventoryDetails';
import { 
  AlertCircle, 
  Loader2,
  Lock,
  Database,
  Settings,
  Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

const Inventory = () => {
  const { user } = useAuth();
  const perms = usePermissions();
  
  // صلاحيات المستخدم
  const [canViewInventory, setCanViewInventory] = useState(false);
  const [canManageInventory, setCanManageInventory] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  
  // حالة العرض
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

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
  if (!canViewInventory && !isCheckingPermissions) {
    return (
      <Layout>
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
      </Layout>
    );
  }
  
  // عرض مؤشر تحميل أثناء التحقق من الصلاحيات
  if (isCheckingPermissions) {
    return (
      <Layout>
        <div className="container mx-auto py-10">
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // عرض النظام المتقدم الجديد
  return (
    <Layout>
      <div className="container mx-auto py-10">
        <div className="space-y-6">
          {/* تنبيه بالنظام المحسن الجديد */}
          <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <Zap className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">🚀 نظام الأداء المحسن متاح الآن!</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              جرب النظام الجديد مع cache ذكي وتحسينات الأداء لتقليل الاستدعاءات بنسبة تصل إلى 70%. 
              <Badge variant="outline" className="ml-2 text-xs">جديد</Badge>
            </AlertDescription>
          </Alert>

          {/* العنوان والوصف */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full">
                <Database className="h-6 w-6 text-primary dark:text-primary/90" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground dark:text-zinc-100">إدارة المخزون المتقدمة</h1>
                <p className="text-muted-foreground dark:text-zinc-400">
                  نظام مخزون متطور مع cache ذكي وأداء محسن لتقليل الاستدعاءات
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                🚀 الأداء المحسن
              </Badge>
              <Badge variant="secondary" className="text-xs">
                نظام متقدم v2.0
              </Badge>
            </div>
          </div>

          {/* شريط الحالة والإعدادات */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    نظام الأداء المحسن مُفعل
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Cache + Throttling
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    إعدادات المخزون
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المحتوى الرئيسي - النظام المحسن للأداء */}
          <InventoryPerformanceOptimized 
            onProductSelect={(productId) => setSelectedProductId(productId)}
            showActions={true}
          />

          {/* نافذة تفاصيل المنتج */}
          {selectedProductId && (
            <ProductInventoryDetails
              productId={selectedProductId}
              onClose={() => setSelectedProductId(null)}
              showInModal={true}
              canEdit={canManageInventory}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Inventory;
