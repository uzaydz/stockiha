import { useState, useEffect } from 'react';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getEmployeePerformance } from '@/lib/api/employees';
import { useToast } from '@/components/ui/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  BarChart,
  Package
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmployeePerformanceDialogProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}

interface PerformanceData {
  ordersCount: number;
  salesTotal: number;
  servicesCount: number;
}

const EmployeePerformanceDialog = ({
  employee,
  open,
  onClose
}: EmployeePerformanceDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    ordersCount: 0,
    salesTotal: 0,
    servicesCount: 0
  });

  useEffect(() => {
    if (open && employee) {
      loadPerformanceData();
    }
  }, [open, employee]);

  const loadPerformanceData = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      const data = await getEmployeePerformance(employee.id);
      setPerformanceData(data);
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل بيانات الأداء',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateOrdersPerMonth = () => {
    // حساب متوسط الطلبات الشهرية
    const employmentDuration = calculateEmploymentDuration();
    if (employmentDuration === 0) return 0;
    
    return (performanceData.ordersCount / employmentDuration).toFixed(1);
  };

  const calculateAverageSalesPerOrder = () => {
    // حساب متوسط المبيعات لكل طلب
    if (performanceData.ordersCount === 0) return 0;
    
    return (performanceData.salesTotal / performanceData.ordersCount).toFixed(2);
  };

  const calculateEmploymentDuration = () => {
    if (!employee) return 0;
    
    const now = new Date();
    const hireDate = new Date(employee.created_at);
    const monthsDiff = (now.getFullYear() - hireDate.getFullYear()) * 12 + 
                        (now.getMonth() - hireDate.getMonth());
    
    return Math.max(1, monthsDiff); // على الأقل شهر واحد
  };

  const renderPerformanceMetrics = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <ShoppingBag className="h-4 w-4 mr-2 text-blue-500" />
              إجمالي الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.ordersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {calculateOrdersPerMonth()} طلب / شهر
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-green-500" />
              إجمالي المبيعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.salesTotal.toFixed(2)} د.ج</div>
            <p className="text-xs text-muted-foreground mt-1">
              {calculateAverageSalesPerOrder()} د.ج / طلب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-purple-500" />
              الخدمات المقدمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.servicesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              منذ {calculateEmploymentDuration()} شهر
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderComparison = () => {
    // هذا قسم يعرض مقارنة أداء الموظف مع المتوسط (بيانات افتراضية)
    const averages = {
      ordersPerMonth: 25,
      salesTotal: 15000,
      servicesCount: 10
    };
    
    const ordersPercent = calculateEmploymentDuration() === 0 || averages.ordersPerMonth === 0 
      ? 0 
      : Math.min(100, (Number(calculateOrdersPerMonth()) / averages.ordersPerMonth) * 100);
    
    const salesPercent = averages.salesTotal === 0 
      ? 0 
      : Math.min(100, (performanceData.salesTotal / averages.salesTotal) * 100);
    
    const servicesPercent = averages.servicesCount === 0 
      ? 0 
      : Math.min(100, (performanceData.servicesCount / averages.servicesCount) * 100);
    
    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-medium mb-3 flex items-center">
          <BarChart className="h-4 w-4 mr-2 text-slate-500" />
          مقارنة مع متوسط الأداء
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الطلبات الشهرية</span>
              <span className="font-medium">{ordersPercent.toFixed(0)}%</span>
            </div>
            <Progress value={ordersPercent} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">المبيعات</span>
              <span className="font-medium">{salesPercent.toFixed(0)}%</span>
            </div>
            <Progress value={salesPercent} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الخدمات</span>
              <span className="font-medium">{servicesPercent.toFixed(0)}%</span>
            </div>
            <Progress value={servicesPercent} className="h-2" />
          </div>
        </div>
      </div>
    );
  };

  const renderProductivityMetrics = () => {
    return (
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-amber-500" />
              إحصائيات الإنتاجية
            </CardTitle>
            <CardDescription>
              مؤشرات أداء الموظف منذ تاريخ الانضمام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">متوسط المبيعات اليومية</span>
                <span className="text-lg font-semibold">
                  {(performanceData.salesTotal / (calculateEmploymentDuration() * 30)).toFixed(2)} د.ج
                </span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">متوسط الطلبات الأسبوعية</span>
                <span className="text-lg font-semibold">
                  {(performanceData.ordersCount / (calculateEmploymentDuration() * 4)).toFixed(1)}
                </span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">قيمة المبيعات لكل خدمة</span>
                <span className="text-lg font-semibold">
                  {performanceData.servicesCount === 0 
                    ? '0.00' 
                    : (performanceData.salesTotal / performanceData.servicesCount).toFixed(2)
                  } د.ج
                </span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">مدة الخدمة في الشركة</span>
                <span className="text-lg font-semibold">
                  {calculateEmploymentDuration()} شهر
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>تقرير أداء الموظف</DialogTitle>
          <DialogDescription>
            عرض تقرير أداء الموظف {employee.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">ملخص الأداء</TabsTrigger>
              <TabsTrigger value="comparison">مقارنة</TabsTrigger>
              <TabsTrigger value="productivity">إنتاجية</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="py-4">
              {renderPerformanceMetrics()}
            </TabsContent>
            
            <TabsContent value="comparison" className="py-4">
              {renderPerformanceMetrics()}
              {renderComparison()}
            </TabsContent>
            
            <TabsContent value="productivity" className="py-4">
              {renderProductivityMetrics()}
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeePerformanceDialog; 