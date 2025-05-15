import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  getSuppliers, 
  getSupplierPerformance, 
  getSupplierPaymentSummaries, 
  getOverduePurchases,
  Supplier,
  SupplierPerformance,
  SupplierPaymentSummary,
  SupplierPurchase
} from '@/api/supplierService';
import { useToast } from '@/components/ui/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Package,
  Truck,
  Clock,
  DollarSign,
  Star,
  AlertTriangle,
  BarChart3,
  List,
  Users,
  TrendingUp,
  ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function SuppliersDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [performance, setPerformance] = useState<SupplierPerformance[]>([]);
  const [paymentSummaries, setPaymentSummaries] = useState<SupplierPaymentSummary[]>([]);
  const [overduePurchases, setOverduePurchases] = useState<SupplierPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // إحصائيات مجمعة
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalSpent: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    localSuppliers: 0,
    internationalSuppliers: 0,
  });
  
  // جلب البيانات
  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        // جلب جميع البيانات المطلوبة
        const [
          suppliersData,
          performanceData,
          paymentSummariesData,
          overduePurchasesData
        ] = await Promise.all([
          getSuppliers(organizationId),
          getSupplierPerformance(organizationId),
          getSupplierPaymentSummaries(organizationId),
          getOverduePurchases(organizationId)
        ]);
        
        // تخزين البيانات
        setSuppliers(suppliersData);
        setPerformance(performanceData);
        setPaymentSummaries(paymentSummariesData);
        setOverduePurchases(overduePurchasesData);
        
        // حساب الإحصائيات
        const activeSuppliers = suppliersData.filter(s => s.is_active).length;
        const localSuppliers = suppliersData.filter(s => s.supplier_type === 'local').length;
        const totalSpent = paymentSummariesData.reduce((sum, item) => sum + Number(item.total_paid_amount), 0);
        const outstandingAmount = paymentSummariesData.reduce((sum, item) => sum + Number(item.total_outstanding), 0);
        const overdueAmount = overduePurchasesData.reduce((sum, purchase) => sum + Number(purchase.balance_due), 0);
        
        setStats({
          totalSuppliers: suppliersData.length,
          activeSuppliers,
          totalSpent,
          outstandingAmount,
          overdueAmount,
          localSuppliers,
          internationalSuppliers: suppliersData.length - localSuppliers
        });
      } catch (error) {
        console.error('Error loading suppliers dashboard data:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل بيانات لوحة معلومات الموردين',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [organizationId]);
  
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
  
  // فرز الموردين حسب الأداء
  const topPerformingSuppliers = [...performance]
    .sort((a, b) => b.rating - a.rating || b.total_purchases - a.total_purchases)
    .slice(0, 5);
  
  // الموردين مع أعلى المستحقات
  const topOutstandingSuppliers = [...paymentSummaries]
    .sort((a, b) => b.total_outstanding - a.total_outstanding)
    .slice(0, 5);
  
  // الفواتير المتأخرة المقبلة
  const upcomingOverduePurchases = [...overduePurchases]
    .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
    .slice(0, 5);
  
  // تقصير النص الطويل
  const truncateText = (text: string, maxLength: number = 20) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // عرض النجوم حسب التقييم
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={`h-4 w-4 ${
              index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">لوحة معلومات الموردين</h2>
      
      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي الموردين</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl">{stats.totalSuppliers}</CardTitle>
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-muted-foreground">
              <div>نشط: {stats.activeSuppliers}</div>
              <div>{Math.round((stats.activeSuppliers / stats.totalSuppliers) * 100) || 0}%</div>
            </div>
            <Progress value={(stats.activeSuppliers / stats.totalSuppliers) * 100 || 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي المشتريات</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl">{stats.totalSpent.toLocaleString()} دج</CardTitle>
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-muted-foreground">
              <div>محلي/دولي</div>
              <div>{stats.localSuppliers}/{stats.internationalSuppliers}</div>
            </div>
            <Progress value={(stats.localSuppliers / stats.totalSuppliers) * 100 || 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>المستحقات المعلقة</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl">{stats.outstandingAmount.toLocaleString()} دج</CardTitle>
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-muted-foreground">
              <div>متأخر</div>
              <div>{stats.overdueAmount.toLocaleString()} دج</div>
            </div>
            <Progress 
              value={(stats.overdueAmount / stats.outstandingAmount) * 100 || 0} 
              className="mt-2" 
              indicatorClassName="bg-red-500"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription>مشتريات متأخرة</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl">{overduePurchases.length}</CardTitle>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            {overduePurchases.length > 0 ? (
              <Button 
                variant="default" 
                size="sm" 
                className="w-full"
                onClick={() => navigate('/dashboard/suppliers/purchases')}
              >
                عرض المتأخرات
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">لا توجد مدفوعات متأخرة</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* بيانات مفصلة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أفضل الموردين أداءً */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>أفضل الموردين أداءً</CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <CardDescription>الموردين ذوي أعلى تقييم ومعدل مشتريات</CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformingSuppliers.length > 0 ? (
              <div className="space-y-4">
                {topPerformingSuppliers.map((supplier) => (
                  <div key={supplier.supplier_id} className="flex items-center space-x-4 rtl:space-x-reverse">
                    <Avatar>
                      <AvatarFallback>{supplier.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium leading-none">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground">{supplier.total_purchases} مشتريات</p>
                      </div>
                      <div className="flex justify-between items-center">
                        {renderStars(supplier.rating)}
                        <span className="text-xs text-muted-foreground">
                          متوسط التسليم: {supplier.avg_delivery_days ? supplier.avg_delivery_days.toFixed(1) : '0.0'} يوم
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                لا توجد بيانات أداء للموردين بعد
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* أعلى المستحقات */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>أعلى المستحقات المعلقة</CardTitle>
              <DollarSign className="h-5 w-5 text-amber-500" />
            </div>
            <CardDescription>الموردين الذين لديهم أعلى المستحقات المالية</CardDescription>
          </CardHeader>
          <CardContent>
            {topOutstandingSuppliers.length > 0 ? (
              <div className="space-y-4">
                {topOutstandingSuppliers
                  .filter(supplier => supplier.total_outstanding > 0)
                  .map((supplier) => (
                    <div key={supplier.supplier_id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{supplier.name}</div>
                        <div className="font-semibold">{supplier.total_outstanding.toLocaleString()} دج</div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <div>إجمالي المشتريات: {supplier.total_purchase_amount.toLocaleString()} دج</div>
                        <div>المدفوع: {supplier.total_paid_amount.toLocaleString()} دج</div>
                      </div>
                      <Progress 
                        value={(supplier.total_paid_amount / supplier.total_purchase_amount) * 100 || 0} 
                        className="h-2" 
                      />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                لا توجد مستحقات معلقة للموردين
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* الفواتير المتأخرة */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>المدفوعات المتأخرة</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <CardDescription>فواتير المشتريات المتأخرة التي تحتاج للمتابعة</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingOverduePurchases.length > 0 ? (
            <div className="space-y-4">
              {upcomingOverduePurchases.map((purchase) => {
                const supplier = suppliers.find(s => s.id === purchase.supplier_id);
                const daysOverdue = purchase.due_date 
                  ? Math.floor((new Date().getTime() - new Date(purchase.due_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                  
                return (
                  <div key={purchase.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <div className="font-medium">{purchase.purchase_number}</div>
                      <div className="text-sm text-muted-foreground">{supplier?.name}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono">{purchase.balance_due.toLocaleString()} دج</div>
                      <Badge variant="outline" className="mt-1">متبقي</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-red-500 font-medium">
                        {daysOverdue} يوم متأخر
                      </div>
                      <div className="text-sm text-muted-foreground">
                        تاريخ الاستحقاق: {format(new Date(purchase.due_date || ''), 'dd/MM/yyyy', { locale: ar })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              لا توجد مدفوعات متأخرة حالياً
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 