import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileBarChart, Package, Receipt, ShoppingBag } from 'lucide-react';
import { SuppliersList } from '@/components/suppliers/SuppliersList';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import Layout from '@/components/Layout';

export default function SuppliersManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('suppliers');
  
  // تحديد التبويب النشط بناءً على المسار
  useEffect(() => {
    const path = location.pathname;
    
    if (path.includes('/dashboard/suppliers/purchases')) {
      setActiveTab('purchases');
    } else if (path.includes('/dashboard/suppliers/payments')) {
      setActiveTab('payments');
    } else if (path.includes('/dashboard/suppliers/reports')) {
      setActiveTab('reports');
    } else {
      setActiveTab('suppliers');
    }
  }, [location]);
  
  // التنقل عند تغيير التبويب
  const handleTabChange = (value: string) => {
    switch (value) {
      case 'suppliers':
        navigate('/dashboard/suppliers');
        break;
      case 'purchases':
        navigate('/dashboard/suppliers/purchases');
        break;
      case 'payments':
        navigate('/dashboard/suppliers/payments');
        break;
      case 'reports':
        navigate('/dashboard/suppliers/reports');
        break;
      default:
        navigate('/dashboard/suppliers');
    }
  };
  
  // التحقق من وجود مسار فرعي (مفتوح)
  const hasSubroute = location.pathname !== '/dashboard/suppliers';
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة الموردين</h1>
            <Breadcrumb className="mt-2">
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">لوحة التحكم</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/suppliers">الموردين</BreadcrumbLink>
              </BreadcrumbItem>
              {hasSubroute && (
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    {activeTab === 'purchases' && 'المشتريات'}
                    {activeTab === 'payments' && 'المدفوعات'}
                    {activeTab === 'reports' && 'التقارير'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
            </Breadcrumb>
          </div>
          
          {/* أزرار إضافة سريعة */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/suppliers/purchases/new')}
            >
              <ShoppingBag className="ml-2 h-4 w-4" />
              مشتريات جديدة
            </Button>
            <Button onClick={() => navigate('/dashboard/suppliers/new')}>
              <Package className="ml-2 h-4 w-4" />
              مورد جديد
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suppliers">
              <Package className="h-4 w-4 ml-2" />
              الموردين
            </TabsTrigger>
            <TabsTrigger value="purchases">
              <ShoppingBag className="h-4 w-4 ml-2" />
              المشتريات
            </TabsTrigger>
            <TabsTrigger value="payments">
              <Receipt className="h-4 w-4 ml-2" />
              المدفوعات
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileBarChart className="h-4 w-4 ml-2" />
              التقارير
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            {hasSubroute ? (
              <Outlet />
            ) : (
              <TabsContent value="suppliers" className="m-0">
                <SuppliersList />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </Layout>
  );
} 