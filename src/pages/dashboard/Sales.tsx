import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SalesOverview from '@/components/sales/SalesOverview';
import SalesTable from '@/components/sales/SalesTable';
import SalesAnalytics from '@/components/sales/SalesAnalytics';
import SalesReports from '@/components/sales/SalesReports';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function Sales() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasViewReportsPermission, setHasViewReportsPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  // <-- إضافة تسجيل تحميل/إلغاء تحميل -->
  useEffect(() => {
    
    return () => {
      
    };
  }, []);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      setPermissionLoading(true);
      
      try {
        // التحقق من صلاحية مشاهدة المبيعات
        const canViewSales = await checkUserPermissions(user, 'viewSales' as any);
        setHasViewPermission(canViewSales);
        
        // التحقق من صلاحية عرض التقارير
        const canViewReports = await checkUserPermissions(user, 'viewReports' as any);
        setHasViewReportsPermission(canViewReports);
      } catch (error) {
        console.error('خطأ في التحقق من الصلاحيات:', error);
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك للوصول إلى هذه الصفحة"
        });
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  // التحقق من أن المستخدم لديه صلاحية لعرض التبويب المحدد
  const canViewTab = (tabName: string) => {
    if (permissionLoading) return false;
    
    if (tabName === 'reports' || tabName === 'analytics') {
      return hasViewReportsPermission;
    }
    
    return hasViewPermission;
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-2xl font-bold">المبيعات</h1>
            <p className="text-muted-foreground">عرض وإدارة جميع المبيعات والمعاملات في نظام نقاط البيع</p>
          </div>
          
          {/* رسالة تحميل */}
          {permissionLoading && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>جاري التحقق من الصلاحيات...</p>
            </div>
          )}
          
          {/* رسالة تحذير عند عدم وجود صلاحية */}
          {!permissionLoading && !hasViewPermission && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>غير مصرح</AlertTitle>
              <AlertDescription>ليس لديك صلاحية لمشاهدة صفحة المبيعات.</AlertDescription>
            </Alert>
          )}
          
          {/* عرض محتوى الصفحة فقط إذا كان لدى المستخدم صلاحية */}
          {(hasViewPermission || permissionLoading) && (
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="orders">المبيعات والطلبات</TabsTrigger>
                <TabsTrigger value="analytics" disabled={!canViewTab('analytics')}>التحليلات</TabsTrigger>
                <TabsTrigger value="reports" disabled={!canViewTab('reports')}>التقارير</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" forceMount className="mt-6">
                <SalesOverview />
              </TabsContent>
              
              <TabsContent value="orders" forceMount className="mt-6">
                <SalesTable />
              </TabsContent>
              
              <TabsContent value="analytics" forceMount className="mt-6">
                {canViewTab('analytics') ? (
                  <SalesAnalytics />
                ) : (
                  <Alert variant="destructive" className="mt-4">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>غير مصرح</AlertTitle>
                    <AlertDescription>ليس لديك صلاحية لمشاهدة تحليلات المبيعات.</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="reports" forceMount className="mt-6">
                {canViewTab('reports') ? (
                  <SalesReports />
                ) : (
                  <Alert variant="destructive" className="mt-4">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>غير مصرح</AlertTitle>
                    <AlertDescription>ليس لديك صلاحية لمشاهدة تقارير المبيعات.</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </Layout>
  );
} 