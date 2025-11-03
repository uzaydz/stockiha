import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart, Activity } from 'lucide-react';
import { SuppliersDashboard } from '@/components/suppliers/SuppliersDashboard';
import Layout from '@/components/Layout';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface SupplierReportsProps extends POSSharedLayoutControls {}

export default function SupplierReports({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}: SupplierReportsProps = {}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const perms = usePermissions();
  
  // محاولة الحصول على organization_id بطرق متعددة
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  
  // تحديد organization_id عند تهيئة المكون
  useEffect(() => {
    // محاولة الحصول على organization_id من كائن المستخدم
    if (user && 'organization_id' in user) {
      
      setOrganizationId((user as any).organization_id);
      return;
    }
    
    // محاولة الحصول من التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      
      setOrganizationId(storedOrgId);
      return;
    }
    
    // القيمة الاحتياطية النهائية (يمكن تغييرها حسب احتياجك)
    
    setOrganizationId("10c02497-45d4-417a-857b-ad383816d7a0");
  }, [user]);

  // تسجيل دالة التحديث
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(async () => {
        setIsRefreshing(true);
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: true });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsRefreshing(false);
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: false });
        }
      });
    }
  }, [onRegisterRefresh, onLayoutStateChange]);

  // إرسال حالة الاتصال
  useEffect(() => {
    if (onLayoutStateChange) {
      onLayoutStateChange({ 
        connectionStatus: 'connected',
        isRefreshing
      });
    }
  }, [isRefreshing, onLayoutStateChange]);
  
  const content = (
    <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">تقارير الموردين</h1>
          <p className="text-muted-foreground">تحليل بيانات الموردين والمشتريات</p>
        </div>
        
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard" className="flex items-center">
              <Activity className="ml-2 h-4 w-4" />
              لوحة المعلومات
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center">
              <LineChart className="ml-2 h-4 w-4" />
              تقارير المدفوعات
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center">
              <BarChart className="ml-2 h-4 w-4" />
              تقارير الأداء
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <SuppliersDashboard />
          </TabsContent>
          
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>تقارير المدفوعات</CardTitle>
                <CardDescription>تحليل مدفوعات الموردين والمبالغ المستحقة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-40">
                  <p className="text-muted-foreground">تقارير المدفوعات قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>تقارير الأداء</CardTitle>
                <CardDescription>تحليل أداء الموردين وجودة المنتجات</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-40">
                  <p className="text-muted-foreground">تقارير الأداء قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );

  if (perms.ready && !perms.anyOf(['viewReports','viewFinancialReports','viewSuppliers'])) {
    const node = (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية الوصول إلى تقارير الموردين.</AlertDescription>
        </Alert>
      </div>
    );
    return useStandaloneLayout ? <Layout>{node}</Layout> : node;
  }

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
}
