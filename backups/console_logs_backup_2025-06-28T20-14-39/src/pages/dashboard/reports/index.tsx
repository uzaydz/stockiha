import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  BarChart2, 
  CreditCard, 
  Package, 
  Truck, 
  Calendar, 
  Filter,
  Download,
  RefreshCw,
  PieChart,
  Layers,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/context/TenantContext';
import { addDays, format, subDays, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';

// Componentes de informes
import FinancialSummary from '@/components/reports/FinancialSummary';
import SalesOverview from '@/components/reports/SalesOverview';
import ProductPerformance from '@/components/reports/ProductPerformance';
import ExpensesAnalysis from '@/components/reports/ExpensesAnalysis';
import InventoryValuation from '@/components/reports/InventoryValuation';
import SalesTrends from '@/components/reports/SalesTrends';

// Tipos de datos
type DateRange = {
  from: Date;
  to: Date;
};

type PeriodOption = {
  label: string;
  value: string;
  dateRange: DateRange;
};

const FinancialReports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [periodOptions] = useState<PeriodOption[]>([
    {
      label: 'اليوم',
      value: 'today',
      dateRange: {
        from: new Date(),
        to: new Date(),
      },
    },
    {
      label: 'آخر 7 أيام',
      value: 'last7days',
      dateRange: {
        from: subDays(new Date(), 6),
        to: new Date(),
      },
    },
    {
      label: 'آخر 30 يوم',
      value: 'last30days',
      dateRange: {
        from: subDays(new Date(), 29),
        to: new Date(),
      },
    },
    {
      label: 'الشهر الحالي',
      value: 'thisMonth',
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
    {
      label: 'الشهر الماضي',
      value: 'lastMonth',
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
      },
    },
    {
      label: 'الربع الحالي',
      value: 'thisQuarter',
      dateRange: {
        from: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1),
        to: new Date(),
      },
    },
    {
      label: 'السنة الحالية',
      value: 'thisYear',
      dateRange: {
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
      },
    },
  ]);
  const [selectedPeriod, setSelectedPeriod] = useState('last30days');
  
  // Estados para los datos de reportes
  const [financialSummary, setFinancialSummary] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [expensesData, setExpensesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);

  // Efecto para actualizar el rango de fechas cuando cambia el período seleccionado
  useEffect(() => {
    const selectedOption = periodOptions.find(option => option.value === selectedPeriod);
    if (selectedOption) {
      setDateRange(selectedOption.dateRange);
    }
  }, [selectedPeriod, periodOptions]);

  // Función para cargar los datos de los informes
  const loadReportData = async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    
    try {
      // Cargar el resumen financiero
      const { data: financialData, error: financialError } = await supabase.rpc(
        'get_financial_summary_v2',
        {
          p_organization_id: currentOrganization.id,
          p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
          p_end_date: format(dateRange.to, 'yyyy-MM-dd')
        }
      );
      
      if (financialError) throw financialError;
      setFinancialSummary(financialData[0] || null);
      
      // Cargar los productos más vendidos
      const { data: productsData, error: productsError } = await supabase.rpc(
        'get_top_products_v2',
        {
          p_organization_id: currentOrganization.id,
          p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
          p_end_date: format(dateRange.to, 'yyyy-MM-dd'),
          p_limit: 10
        }
      );
      
      if (productsError) throw productsError;
      setTopProducts(productsData || []);
      
      // Cargar análisis de gastos
      const { data: expensesData, error: expensesError } = await supabase.rpc(
        'get_expenses_by_category_v2',
        {
          p_organization_id: currentOrganization.id,
          p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
          p_end_date: format(dateRange.to, 'yyyy-MM-dd')
        }
      );
      
      if (expensesError) throw expensesError;
      setExpensesData(expensesData || []);
      
      // Cargar resumen de inventario
      const { data: inventoryData, error: inventoryError } = await supabase.rpc(
        'get_inventory_summary_v2',
        {
          p_organization_id: currentOrganization.id
        }
      );
      
      if (inventoryError) throw inventoryError;
      setInventoryData(inventoryData || []);
      
      // Cargar datos de tendencias
      const { data: trendsData, error: trendsError } = await supabase.rpc(
        'get_sales_trends_v2',
        {
          p_organization_id: currentOrganization.id,
          p_period: 'daily',
          p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
          p_end_date: format(dateRange.to, 'yyyy-MM-dd')
        }
      );
      
      if (trendsError) throw trendsError;
      setTrendsData(trendsData || []);
      
      // Cargar datos de ventas por categoría
      const { data: salesByCategory, error: salesError } = await supabase
        .from('reports_sales_by_category')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .gte('sale_month', format(subMonths(dateRange.from, 6), 'yyyy-MM-dd'))
        .lte('sale_month', format(addDays(dateRange.to, 1), 'yyyy-MM-dd'))
        .order('sale_month', { ascending: false });
      
      if (salesError) throw salesError;
      setSalesData(salesByCategory || []);
      
    } catch (error) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل بيانات التقارير. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos cuando cambia el rango de fechas o la organización
  useEffect(() => {
    loadReportData();
  }, [dateRange.from, dateRange.to, currentOrganization?.id]);

  // Manejar cambio de período personalizado
  const handleDateRangeChange = (range: DateRange) => {
    if (range.from && range.to) {
      setDateRange(range);
      setSelectedPeriod('custom');
    }
  };

  // Función para exportar los datos
  const handleExportData = () => {
    toast({
      title: "جاري تحضير التقرير",
      description: "يتم تحضير التقرير للتنزيل. سيكون متاحًا قريبًا.",
    });
    
    // Implementación real de exportación se añadirá aquí
  };

  // Función para refrescar los datos
  const handleRefreshData = () => {
    loadReportData();
    toast({
      title: "تم تحديث البيانات",
      description: "تم تحديث بيانات التقارير بنجاح.",
    });
  };

  return (
    <Layout>
      <Helmet>
        <title>التقارير المالية | منصة بازار</title>
      </Helmet>

      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">التقارير المالية</h1>
            <p className="text-muted-foreground">
              تحليل مفصل للأداء المالي والمبيعات والمخزون
            </p>
          </div>
          
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:space-x-reverse">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4" />
              <span>تصدير</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleRefreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-x-reverse md:space-y-0 md:items-center">
            <Select
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="اختر الفترة" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">فترة مخصصة</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex-1">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={handleDateRangeChange}
                locale={ar}
                align="start"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto pb-2">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>النظرة العامة</span>
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>المبيعات</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span>المنتجات</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>المصروفات</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>المخزون</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>الاتجاهات</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <FinancialSummary
              data={financialSummary}
              dateRange={dateRange}
              isLoading={isLoading}
            />
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    <span>توزيع المبيعات</span>
                  </CardTitle>
                  <CardDescription>
                    تحليل المبيعات حسب مصدر الإيراد
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Componente para mostrar el gráfico de distribución de ventas */}
                  {isLoading ? (
                    <div className="h-[250px] flex items-center justify-center">
                      <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="h-32 w-32 bg-muted rounded-full"></div>
                        <div className="h-4 w-24 bg-muted rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[250px]">
                      {/* Aquí iría el componente de gráfico */}
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm">سيتم تنفيذ الرسم البياني لاحقاً</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    <span>أداء المبيعات</span>
                  </CardTitle>
                  <CardDescription>
                    مقارنة المبيعات مع الفترة السابقة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Componente para mostrar el gráfico de rendimiento de ventas */}
                  {isLoading ? (
                    <div className="h-[250px] flex items-center justify-center">
                      <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="h-32 w-full bg-muted rounded"></div>
                        <div className="h-4 w-24 bg-muted rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[250px]">
                      {/* Aquí iría el componente de gráfico */}
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm">سيتم تنفيذ الرسم البياني لاحقاً</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    <span>أفضل المنتجات مبيعاً</span>
                  </CardTitle>
                  <CardDescription>
                    المنتجات الأكثر مبيعاً خلال الفترة المحددة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {isLoading ? (
                      <div className="space-y-2">
                        {Array(5).fill(0).map((_, i) => (
                          <div key={i} className="animate-pulse flex items-center gap-4 p-2">
                            <div className="h-10 w-10 bg-muted rounded"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-3/4 bg-muted rounded"></div>
                              <div className="h-3 w-1/2 bg-muted rounded"></div>
                            </div>
                            <div className="h-8 w-16 bg-muted rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : topProducts.length > 0 ? (
                      <div className="space-y-1">
                        {topProducts.map((product, index) => (
                          <div 
                            key={product.product_id} 
                            className={`flex items-center justify-between p-2 rounded hover:bg-muted/40 ${
                              index % 2 === 0 ? 'bg-muted/20' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{product.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {typeof product.category === 'object' && product.category !== null
                                    ? (product.category as { name: string }).name
                                    : product.category}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{product.units_sold} وحدة</p>
                              <p className="text-sm text-muted-foreground">
                                {Number(product.total_revenue).toLocaleString()} د.ج
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-2 text-center text-muted-foreground">
                          لم يتم العثور على بيانات مبيعات للفترة المحددة
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span>توزيع المصروفات</span>
                  </CardTitle>
                  <CardDescription>
                    تحليل المصروفات حسب الفئة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Componente para mostrar el gráfico de gastos */}
                  {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="h-40 w-40 bg-muted rounded-full"></div>
                        <div className="h-4 w-24 bg-muted rounded"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      {/* Aquí iría el componente de gráfico */}
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm">سيتم تنفيذ الرسم البياني لاحقاً</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <SalesOverview 
              data={salesData}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductPerformance 
              products={topProducts}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <ExpensesAnalysis 
              data={expensesData}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <InventoryValuation 
              data={inventoryData}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <SalesTrends 
              data={trendsData}
              dateRange={dateRange}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default FinancialReports;
