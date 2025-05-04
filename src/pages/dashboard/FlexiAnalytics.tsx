import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line
} from 'recharts';
import { RefreshCwIcon, TrendingUpIcon, Phone, EuroIcon } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import type { 
  FlexiSale, 
  CurrencySale, 
  FlexiStats, 
  CurrencyStats 
} from '../../types/flexi';
import { getFlexiSales, getFlexiStats } from '../../api/flexiService';
import { getCurrencySales, getCurrencyStats } from '../../api/currencyService';
import { Button } from '../../components/ui/button';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';

// ألوان للمخططات - تحسين نظام الألوان ليكون أكثر أناقة
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const COLORS_DARK = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#22D3EE', '#FB923C'];
const GRADIENT_COLORS = ['#3B82F6', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#22D3EE', '#FB923C'];

// نمط الخطوط متوافق مع العربية
const CHART_STYLE = {
  fontFamily: "'Tajawal', 'Noto Sans Arabic', sans-serif",
  fontSize: '12px'
};

export default function FlexiAnalytics() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // حالة مبيعات الفليكسي
  const [flexiSales, setFlexiSales] = useState<FlexiSale[]>([]);
  const [flexiStats, setFlexiStats] = useState<FlexiStats[]>([]);
  const [loadingFlexi, setLoadingFlexi] = useState(true);
  
  // حالة مبيعات العملات
  const [currencySales, setCurrencySales] = useState<CurrencySale[]>([]);
  const [currencyStats, setCurrencyStats] = useState<CurrencyStats[]>([]);
  const [loadingCurrency, setLoadingCurrency] = useState(true);
  
  // إجماليات
  const [flexiTotals, setFlexiTotals] = useState({
    totalSales: 0,
    totalTransactions: 0
  });
  
  const [currencyTotals, setCurrencyTotals] = useState({
    totalSalesDinar: 0,
    totalSalesOriginal: 0,
    totalTransactions: 0
  });
  
  const fetchFlexiData = async () => {
    setLoadingFlexi(true);
    try {
      // الحصول على مبيعات الفليكسي
      const salesResult = await getFlexiSales(20, 0);
      setFlexiSales(salesResult.data);
      
      // الحصول على إحصائيات الفليكسي
      const stats = await getFlexiStats();
      setFlexiStats(stats);
      
      // حساب الإجماليات
      const totalSales = stats.reduce((sum, item) => sum + item.total_sales, 0);
      const totalTransactions = stats.reduce((sum, item) => sum + item.total_transactions, 0);
      
      setFlexiTotals({
        totalSales,
        totalTransactions
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحميل بيانات تحليل الفليكسي'
      });
      console.error(error);
    } finally {
      setLoadingFlexi(false);
    }
  };
  
  const fetchCurrencyData = async () => {
    setLoadingCurrency(true);
    try {
      // الحصول على مبيعات العملات
      const salesResult = await getCurrencySales(20, 0);
      setCurrencySales(salesResult.data);
      
      // الحصول على إحصائيات العملات
      const stats = await getCurrencyStats();
      setCurrencyStats(stats);
      
      // حساب الإجماليات
      const totalSalesDinar = stats.reduce((sum, item) => sum + item.total_sales_dinar, 0);
      const totalSalesOriginal = stats.reduce((sum, item) => sum + item.total_sales_original, 0);
      const totalTransactions = stats.reduce((sum, item) => sum + item.total_transactions, 0);
      
      setCurrencyTotals({
        totalSalesDinar,
        totalSalesOriginal,
        totalTransactions
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'لم نتمكن من تحميل بيانات تحليل العملات'
      });
      console.error(error);
    } finally {
      setLoadingCurrency(false);
    }
  };
  
  useEffect(() => {
    fetchFlexiData();
    fetchCurrencyData();
  }, []);
  
  // تحويل بيانات الشبكات لعرضها في مخطط RadialBar
  const prepareFlexiChartData = () => {
    // ترتيب البيانات حسب إجمالي المبيعات تنازلياً
    return flexiStats
      .sort((a, b) => b.total_sales - a.total_sales)
      .map((item, index) => ({
        name: item.network,
        value: item.total_sales,
        fill: COLORS[index % COLORS.length]
      }));
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6 text-primary-900">تحليل مبيعات الفليكسي والعملات الرقمية</h1>
        
        <Tabs defaultValue="flexi" className="w-full">
          <TabsList className="w-full flex mb-6 justify-center bg-card shadow rounded-lg overflow-hidden p-1">
            <TabsTrigger value="flexi" className="flex-1 py-2.5 rounded-md font-medium">تحليل الفليكسي</TabsTrigger>
            <TabsTrigger value="currencies" className="flex-1 py-2.5 rounded-md font-medium">تحليل العملات الرقمية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flexi">
            {/* بطاقات إحصائية */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-tr from-blue-50 to-white dark:from-blue-950/40 dark:to-background dark:border dark:border-border/50">
                <CardHeader className="pb-2 border-b dark:border-border/30">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4 text-primary" />
                    إجمالي المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-primary">{flexiTotals.totalSales.toLocaleString()} دج</div>
                  <p className="text-xs text-muted-foreground mt-1">القيمة الإجمالية لمبيعات الفليكسي</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-tr from-green-50 to-white dark:from-green-950/40 dark:to-background dark:border dark:border-border/50">
                <CardHeader className="pb-2 border-b dark:border-border/30">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-500" />
                    عدد العمليات
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-500">{flexiTotals.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي عدد عمليات بيع الفليكسي</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-tr from-amber-50 to-white dark:from-amber-950/40 dark:to-background dark:border dark:border-border/50">
                <CardHeader className="pb-2 border-b dark:border-border/30">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    متوسط العملية
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                    {flexiTotals.totalTransactions > 0 
                      ? Math.round(flexiTotals.totalSales / flexiTotals.totalTransactions).toLocaleString() 
                      : 0} دج
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">متوسط قيمة العملية</p>
                </CardContent>
              </Card>
            </div>
            
            {/* الرسم البياني والجدول */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-md border-0 dark:border dark:border-border/50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>توزيع المبيعات حسب الشبكة</CardTitle>
                      <CardDescription>مقارنة مبيعات شبكات الفليكسي المختلفة</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchFlexiData} disabled={loadingFlexi}
                      className="rounded-full">
                      <RefreshCwIcon className={`h-4 w-4 ml-2 ${loadingFlexi ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="h-96">
                  {loadingFlexi ? (
                    <div className="flex justify-center items-center h-full">
                      <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        innerRadius="30%" 
                        outerRadius="90%" 
                        data={prepareFlexiChartData()}
                        startAngle={0} 
                        endAngle={360}
                        barSize={20}
                      >
                        <RadialBar
                          background
                          dataKey="value"
                          name="name"
                          cornerRadius={10}
                          label={false}
                          className="dark:fill-opacity-80"
                        />
                        <Tooltip 
                          formatter={(value) => `${Number(value).toLocaleString()} دج`}
                          labelStyle={{ ...CHART_STYLE, color: '#374151' }}
                          contentStyle={{ ...CHART_STYLE, borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                        />
                        <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="left"
                          wrapperStyle={CHART_STYLE}
                          formatter={(value, entry, index) => {
                            const color = COLORS[index % COLORS.length];
                            return <span style={{ color: color }} className="dark:text-gray-300">{value}</span>
                          }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-0 dark:border dark:border-border/50">
                <CardHeader>
                  <CardTitle>إحصائيات الشبكات</CardTitle>
                  <CardDescription>تفاصيل المبيعات والعمليات لكل شبكة</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingFlexi ? (
                    <div className="flex justify-center items-center h-32">
                      <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 dark:bg-muted/20">
                          <TableHead className="font-bold">الشبكة</TableHead>
                          <TableHead className="font-bold">إجمالي المبيعات</TableHead>
                          <TableHead className="font-bold">عدد العمليات</TableHead>
                          <TableHead className="font-bold">آخر عملية</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flexiStats.map((stat, index) => (
                          <TableRow key={`flexi-stat-${stat.network}-${index}`} className="hover:bg-muted/20">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {stat.network}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{stat.total_sales.toLocaleString()} دج</TableCell>
                            <TableCell>{stat.total_transactions}</TableCell>
                            <TableCell>
                              {stat.latest_transaction 
                                ? new Date(stat.latest_transaction).toLocaleString('ar-DZ')
                                : 'لا توجد عمليات'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* آخر العمليات */}
            <Card className="mt-6 shadow-md border-0 dark:border dark:border-border/50">
              <CardHeader className="border-b dark:border-border/30">
                <CardTitle>آخر عمليات البيع</CardTitle>
                <CardDescription>آخر عمليات بيع الفليكسي</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingFlexi ? (
                  <div className="flex justify-center items-center h-32">
                    <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : flexiSales.length === 0 ? (
                  <div className="text-center py-8 bg-muted/10 rounded-lg">
                    <p className="text-muted-foreground">لا توجد عمليات بيع حتى الآن</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 dark:bg-muted/20">
                          <TableHead className="font-bold">التاريخ</TableHead>
                          <TableHead className="font-bold">الشبكة</TableHead>
                          <TableHead className="font-bold">رقم الهاتف</TableHead>
                          <TableHead className="font-bold">المبلغ</TableHead>
                          <TableHead className="font-bold">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flexiSales.map((sale, index) => (
                          <TableRow key={`flexi-sale-${sale.id || index}`} className="hover:bg-muted/20">
                            <TableCell>
                              {new Date(sale.created_at).toLocaleDateString('ar-DZ')}
                              <div className="text-xs text-muted-foreground">
                                {new Date(sale.created_at).toLocaleTimeString('ar-DZ')}
                              </div>
                            </TableCell>
                            <TableCell>
                              {sale.network?.name || 'غير معروف'}
                            </TableCell>
                            <TableCell dir="ltr" className="font-mono">{sale.phone_number}</TableCell>
                            <TableCell className="font-medium">{sale.amount.toLocaleString()} دج</TableCell>
                            <TableCell>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium
                                ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  sale.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                                  'bg-red-100 text-red-800'}`}
                              >
                                {sale.status === 'completed' ? 'مكتمل' : 
                                 sale.status === 'pending' ? 'قيد الانتظار' : 'فشل'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="currencies">
            {/* بطاقات إحصائية */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-tr from-violet-50 to-white dark:from-violet-950/40 dark:to-background dark:border dark:border-border/50">
                <CardHeader className="pb-2 border-b dark:border-border/30">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <EuroIcon className="h-4 w-4 text-violet-600 dark:text-violet-500" />
                    إجمالي المبيعات (دج)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-violet-600 dark:text-violet-500">{currencyTotals.totalSalesDinar.toLocaleString()} دج</div>
                  <p className="text-xs text-muted-foreground mt-1">القيمة الإجمالية بالدينار الجزائري</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-tr from-indigo-50 to-white dark:from-indigo-950/40 dark:to-background dark:border dark:border-border/50">
                <CardHeader className="pb-2 border-b dark:border-border/30">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-500" />
                    عدد العمليات
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">{currencyTotals.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي عدد عمليات بيع العملات</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-tr from-cyan-50 to-white dark:from-cyan-950/40 dark:to-background dark:border dark:border-border/50">
                <CardHeader className="pb-2 border-b dark:border-border/30">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-500" />
                    متوسط العملية
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-500">
                    {currencyTotals.totalTransactions > 0 
                      ? Math.round(currencyTotals.totalSalesDinar / currencyTotals.totalTransactions).toLocaleString() 
                      : 0} دج
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">متوسط قيمة العملية بالدينار</p>
                </CardContent>
              </Card>
            </div>
            
            {/* الرسم البياني والجدول */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-md border-0 dark:border dark:border-border/50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>توزيع المبيعات حسب العملة</CardTitle>
                      <CardDescription>مقارنة مبيعات العملات المختلفة</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchCurrencyData} disabled={loadingCurrency}
                      className="rounded-full">
                      <RefreshCwIcon className={`h-4 w-4 ml-2 ${loadingCurrency ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="h-96">
                  {loadingCurrency ? (
                    <div className="flex justify-center items-center h-full">
                      <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={currencyStats}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        barCategoryGap="20%"
                        barSize={40}
                      >
                        <defs>
                          {currencyStats.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={`colorGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9}/>
                              <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} className="dark:stroke-gray-700" />
                        <XAxis 
                          dataKey="currency" 
                          tick={{ fontSize: 12, fontFamily: "'Tajawal', sans-serif" }}
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                          className="dark:text-gray-400 dark:[&>.recharts-cartesian-axis-line]:stroke-gray-700"
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fontFamily: "'Tajawal', sans-serif" }}
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                          tickFormatter={(value) => value.toLocaleString()}
                          className="dark:text-gray-400 dark:[&>.recharts-cartesian-axis-line]:stroke-gray-700"
                        />
                        <Tooltip 
                          formatter={(value) => `${Number(value).toLocaleString()} دج`}
                          labelStyle={{ ...CHART_STYLE, color: '#374151' }}
                          contentStyle={{ ...CHART_STYLE, borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                        />
                        <Legend 
                          wrapperStyle={CHART_STYLE}
                          formatter={(value) => <span style={{ color: '#4B5563' }}>{value}</span>}
                        />
                        <Bar 
                          dataKey="total_sales_dinar" 
                          name="المبيعات (دج)"
                          radius={[5, 5, 0, 0]} 
                        >
                          {currencyStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#colorGradient${index})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-0 dark:border dark:border-border/50">
                <CardHeader>
                  <CardTitle>إحصائيات العملات</CardTitle>
                  <CardDescription>تفاصيل المبيعات والعمليات لكل عملة</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCurrency ? (
                    <div className="flex justify-center items-center h-32">
                      <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 dark:bg-muted/20">
                          <TableHead className="font-bold">العملة</TableHead>
                          <TableHead className="font-bold">المبيعات (عملة)</TableHead>
                          <TableHead className="font-bold">المبيعات (دج)</TableHead>
                          <TableHead className="font-bold">العمليات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currencyStats.map((stat, index) => (
                          <TableRow key={`currency-stat-${stat.currency}-${index}`} className="hover:bg-muted/20">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {stat.currency} ({stat.currency_code})
                              </div>
                            </TableCell>
                            <TableCell>{stat.total_sales_original.toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{stat.total_sales_dinar.toLocaleString()} دج</TableCell>
                            <TableCell>{stat.total_transactions}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* آخر العمليات */}
            <Card className="mt-6 shadow-md border-0 dark:border dark:border-border/50">
              <CardHeader className="border-b dark:border-border/30">
                <CardTitle>آخر عمليات البيع</CardTitle>
                <CardDescription>آخر عمليات بيع العملات الرقمية</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingCurrency ? (
                  <div className="flex justify-center items-center h-32">
                    <RefreshCwIcon className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : currencySales.length === 0 ? (
                  <div className="text-center py-8 bg-muted/10 rounded-lg">
                    <p className="text-muted-foreground">لا توجد عمليات بيع حتى الآن</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 dark:bg-muted/20">
                          <TableHead className="font-bold">التاريخ</TableHead>
                          <TableHead className="font-bold">العملة</TableHead>
                          <TableHead className="font-bold">المبلغ (عملة)</TableHead>
                          <TableHead className="font-bold">المبلغ (دج)</TableHead>
                          <TableHead className="font-bold">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currencySales.map((sale, index) => (
                          <TableRow key={`currency-sale-${sale.id || index}`} className="hover:bg-muted/20">
                            <TableCell>
                              {new Date(sale.created_at).toLocaleDateString('ar-DZ')}
                              <div className="text-xs text-muted-foreground">
                                {new Date(sale.created_at).toLocaleTimeString('ar-DZ')}
                              </div>
                            </TableCell>
                            <TableCell>
                              {sale.currency?.name || 'غير معروف'}
                            </TableCell>
                            <TableCell className="font-mono">{sale.amount.toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{sale.dinar_amount.toLocaleString()} دج</TableCell>
                            <TableCell>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium
                                ${sale.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                  sale.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
                              >
                                {sale.status === 'completed' ? 'مكتمل' : 
                                 sale.status === 'pending' ? 'قيد الانتظار' : 'فشل'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
} 