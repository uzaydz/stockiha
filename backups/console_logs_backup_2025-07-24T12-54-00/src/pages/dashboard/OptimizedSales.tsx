import { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import OptimizedSalesOverview from '@/components/sales/OptimizedSalesOverview';
import { DashboardDataProvider } from '@/context/DashboardDataContext';

export default function OptimizedSales() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardDataProvider period="month">
      <Layout>
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">إدارة المبيعات المحسنة</h1>
              <p className="text-muted-foreground">متابعة وتحليل أداء المبيعات بدون استخدام ShopContext</p>
            </div>

            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="overview">نظرة عامة محسنة</TabsTrigger>
                <TabsTrigger value="orders">قريباً - طلبات محسنة</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" forceMount className="mt-6">
                <OptimizedSalesOverview />
              </TabsContent>
              
              <TabsContent value="orders" forceMount className="mt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">🚧 قسم المبيعات والطلبات المحسن قيد التطوير...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ✅ سيستخدم DashboardDataContext بدلاً من ShopContext<br/>
                    ✅ لا طلبات مكررة | ✅ أداء محسن | ✅ React Query متقدم
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </DashboardDataProvider>
  );
}
