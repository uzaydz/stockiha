import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  ShoppingCart,
  Users,
  CreditCard,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Infinity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Tipo de datos
type DateRange = {
  from: Date;
  to: Date;
};

type FinancialSummaryProps = {
  data: any;
  dateRange: DateRange;
  isLoading: boolean;
};

const FinancialSummary = ({ data, dateRange, isLoading }: FinancialSummaryProps) => {
  // Formatear rango de fechas para mostrar
  const formattedDateRange = `${format(dateRange.from, 'dd MMM yyyy', { locale: ar })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ar })}`;

  // Función para mostrar indicador de tendencia
  const TrendIndicator = ({ value, neutral = false }: { value: number, neutral?: boolean }) => {
    if (neutral) {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
    
    if (value > 0) {
      return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
    } else if (value < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  // Función para formatear números
  const formatNumber = (num: number, suffix = ''): string => {
    if (num === null || num === undefined) return '0' + suffix;
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M' + suffix;
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K' + suffix;
    } else {
      return num.toFixed(0) + suffix;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <h2 className="text-xl font-semibold">النظرة العامة المالية</h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <>الفترة: {formattedDateRange}</>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* إجمالي المبيعات */}
        <Card className="overflow-hidden border-r-4 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>إجمالي المبيعات</span>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardTitle>
            <CardDescription>إجمالي المبيعات خلال الفترة</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.sales_total 
                    ? Number(data.sales_total).toLocaleString() + ' د.ج' 
                    : '0 د.ج'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendIndicator value={10} /> {/* قيمة مثال فقط */}
                  <span>10% مقارنة بالفترة السابقة</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* صافي الربح */}
        <Card className="overflow-hidden border-r-4 border-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>صافي الربح</span>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </CardTitle>
            <CardDescription>صافي الربح بعد خصم المصروفات</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.profit 
                    ? Number(data.profit).toLocaleString() + ' د.ج' 
                    : '0 د.ج'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendIndicator value={5} /> {/* قيمة مثال فقط */}
                  <span>5% مقارنة بالفترة السابقة</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* إجمالي المصروفات */}
        <Card className="overflow-hidden border-r-4 border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>المصروفات</span>
              <CreditCard className="h-5 w-5 text-red-500" />
            </CardTitle>
            <CardDescription>إجمالي المصروفات خلال الفترة</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.expenses_total 
                    ? Number(data.expenses_total).toLocaleString() + ' د.ج' 
                    : '0 د.ج'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendIndicator value={-2} /> {/* قيمة مثال فقط */}
                  <span>2% مقارنة بالفترة السابقة</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* هامش الربح */}
        <Card className="overflow-hidden border-r-4 border-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>هامش الربح</span>
              <Percent className="h-5 w-5 text-amber-500" />
            </CardTitle>
            <CardDescription>نسبة الربح من إجمالي المبيعات</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.profit_margin ? Number(data.profit_margin).toFixed(1) + '%' : '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendIndicator value={3} /> {/* قيمة مثال فقط */}
                  <span>3% مقارنة بالفترة السابقة</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* عدد الطلبات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>الطلبات</span>
              <ShoppingCart className="h-5 w-5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <div className="flex justify-between mt-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.order_count || 0}
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">المتجر: </span>
                    <span className="font-medium">{data?.in_store_orders || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">أونلاين: </span>
                    <span className="font-medium">{data?.online_orders || 0}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* متوسط قيمة الطلب */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>متوسط الطلب</span>
              <Store className="h-5 w-5 text-cyan-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.sales_total && data?.order_count && data.order_count > 0 
                    ? (Number(data.sales_total) / Number(data.order_count)).toLocaleString(undefined, {maximumFractionDigits: 0}) + ' د.ج' 
                    : '0 د.ج'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  إجمالي قيمة المبيعات / عدد الطلبات
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* عدد العملاء */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>العملاء</span>
              <Users className="h-5 w-5 text-violet-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.unique_customers || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  عدد العملاء الفريدين خلال الفترة
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* توزيع المبيعات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">توزيع المبيعات</CardTitle>
            <CardDescription>
              تحليل المبيعات حسب نوع المنتج والقناة
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* المنتجات */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المنتجات</span>
                    <span className="font-medium">
                      {data?.sales_total 
                        ? Number(data.sales_total).toLocaleString() + ' د.ج' 
                        : '0 د.ج'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-primary" 
                      style={{ 
                        width: `${data?.sales_total && (Number(data.sales_total) + Number(data?.service_sales || 0)) > 0 
                          ? (Number(data.sales_total) / (Number(data.sales_total) + Number(data?.service_sales || 0)) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                
                {/* الخدمات */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>الخدمات</span>
                    <span className="font-medium">
                      {data?.service_sales 
                        ? Number(data.service_sales).toLocaleString() + ' د.ج' 
                        : '0 د.ج'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-cyan-500" 
                      style={{ 
                        width: `${data?.service_sales && (Number(data.sales_total || 0) + Number(data.service_sales)) > 0 
                          ? (Number(data.service_sales) / (Number(data.sales_total || 0) + Number(data.service_sales)) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                
                {/* المتجر الفعلي */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المتجر الفعلي</span>
                    <span className="font-medium">
                      {data?.in_store_sales 
                        ? Number(data.in_store_sales).toLocaleString() + ' د.ج' 
                        : '0 د.ج'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-indigo-500" 
                      style={{ 
                        width: `${data?.in_store_sales && Number(data.sales_total) > 0 
                          ? (Number(data.in_store_sales) / Number(data.sales_total) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                
                {/* المتجر الإلكتروني */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المتجر الإلكتروني</span>
                    <span className="font-medium">
                      {data?.online_sales 
                        ? Number(data.online_sales).toLocaleString() + ' د.ج' 
                        : '0 د.ج'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ 
                        width: `${data?.online_sales && Number(data.sales_total) > 0 
                          ? (Number(data.online_sales) / Number(data.sales_total) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* تحليل المصاريف والأرباح */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">تحليل المصاريف والأرباح</CardTitle>
            <CardDescription>
              مقارنة الإيرادات بالمصاريف والأرباح
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* النسب المئوية في أعلى المخطط */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>الإيرادات (100%)</span>
                  <span>المصاريف ({data?.expenses_total && data?.sales_total && Number(data.sales_total) > 0 
                    ? ((Number(data.expenses_total) / Number(data.sales_total)) * 100).toFixed(1) 
                    : 0}%)</span>
                  <span>الأرباح ({data?.profit && data?.sales_total && Number(data.sales_total) > 0 
                    ? ((Number(data.profit) / Number(data.sales_total)) * 100).toFixed(1) 
                    : 0}%)</span>
                </div>
                
                {/* الرسم البياني العمودي */}
                <div className="flex items-end h-44 gap-8 pt-6">
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-primary h-full rounded-t-md"></div>
                    <p className="mt-2 text-sm font-medium">
                      {data?.sales_total 
                        ? Number(data.sales_total).toLocaleString() 
                        : '0'} د.ج
                    </p>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-red-500 rounded-t-md"
                      style={{ 
                        height: `${data?.expenses_total && data?.sales_total && Number(data.sales_total) > 0 
                          ? ((Number(data.expenses_total) / Number(data.sales_total)) * 100) 
                          : 0}%` 
                      }}
                    ></div>
                    <p className="mt-2 text-sm font-medium">
                      {data?.expenses_total 
                        ? Number(data.expenses_total).toLocaleString() 
                        : '0'} د.ج
                    </p>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-emerald-500 rounded-t-md"
                      style={{ 
                        height: `${data?.profit && data?.sales_total && Number(data.sales_total) > 0 
                          ? ((Number(data.profit) / Number(data.sales_total)) * 100) 
                          : 0}%` 
                      }}
                    ></div>
                    <p className="mt-2 text-sm font-medium">
                      {data?.profit 
                        ? Number(data.profit).toLocaleString() 
                        : '0'} د.ج
                    </p>
                  </div>
                </div>
                
                {/* التسميات */}
                <div className="flex justify-between text-sm font-medium pt-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
                    <span>الإيرادات</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>المصاريف</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
                    <span>الأرباح</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialSummary;
