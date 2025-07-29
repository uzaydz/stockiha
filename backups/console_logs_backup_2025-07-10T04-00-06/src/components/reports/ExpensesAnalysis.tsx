import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  CreditCard,
  DollarSign,
  Calendar,
  PieChart,
  TrendingDown,
  ArrowUpDown,
  FileText,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

// Tipos de datos
type DateRange = {
  from: Date;
  to: Date;
};

type ExpenseData = {
  category: string;
  expense_count: number;
  total_amount: number;
  percentage_of_total: number;
};

type ExpensesAnalysisProps = {
  data: ExpenseData[];
  dateRange: DateRange;
  isLoading: boolean;
};

// Colores para las categorías de gastos
const categoryColors: Record<string, string> = {
  'رواتب': 'bg-blue-500',
  'إيجار': 'bg-purple-500',
  'مرافق': 'bg-green-500',
  'تسويق': 'bg-yellow-500',
  'معدات': 'bg-pink-500',
  'صيانة': 'bg-indigo-500',
  'مشتريات': 'bg-red-500',
  'نقل': 'bg-cyan-500',
  'ضرائب': 'bg-amber-500',
  'تأمين': 'bg-emerald-500',
  'أخرى': 'bg-gray-500',
};

// Componente de análisis de gastos
const ExpensesAnalysis = ({ data, dateRange, isLoading }: ExpensesAnalysisProps) => {
  const [timeFilter, setTimeFilter] = useState('all');
  
  // Formatear rango de fechas para mostrar
  const formattedDateRange = `${format(dateRange.from, 'dd MMM yyyy', { locale: ar })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ar })}`;
  
  // Calcular totales
  const totalExpenses = data?.reduce((sum, expense) => sum + Number(expense.total_amount), 0) || 0;
  const totalCount = data?.reduce((sum, expense) => sum + Number(expense.expense_count), 0) || 0;
  const averageExpense = totalCount > 0 ? totalExpenses / totalCount : 0;
  
  // Obtener color para una categoría
  const getCategoryColor = (category: string): string => {
    return categoryColors[category] || 'bg-gray-500';
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <h2 className="text-xl font-semibold">تحليل المصروفات</h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <>الفترة: {formattedDateRange}</>
          )}
        </p>
      </div>
      
      {/* بطاقات KPI الرئيسية */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* إجمالي المصروفات */}
        <Card className="overflow-hidden border-r-4 border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>إجمالي المصروفات</span>
              <DollarSign className="h-5 w-5 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalExpenses.toLocaleString()} د.ج
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* عدد المصروفات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>عدد المصروفات</span>
              <FileText className="h-5 w-5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {totalCount}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* متوسط المصروف */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>متوسط المصروف</span>
              <TrendingDown className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {averageExpense.toLocaleString(undefined, {maximumFractionDigits: 0})} د.ج
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* عدد الفئات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>عدد الفئات</span>
              <Filter className="h-5 w-5 text-cyan-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-5">
        {/* جدول تحليل المصروفات */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">تفاصيل المصروفات حسب الفئة</CardTitle>
            <CardDescription>
              تحليل مفصل للمصروفات مرتبة حسب إجمالي المبلغ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mb-2" />
                <p>لم يتم العثور على بيانات مصروفات للفترة المحددة</p>
              </div>
            ) : (
              <ScrollArea className="h-[380px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفئة</TableHead>
                      <TableHead className="text-center">عدد المصروفات</TableHead>
                      <TableHead className="text-center">النسبة المئوية</TableHead>
                      <TableHead className="text-left">إجمالي المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.map((expense, index) => (
                      <TableRow key={expense.category}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getCategoryColor(expense.category)}`} />
                            <span className="font-medium">{expense.category}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{Number(expense.expense_count).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={`${Number(expense.percentage_of_total) > 20 
                              ? 'bg-red-500' 
                              : Number(expense.percentage_of_total) > 10
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'} text-white`}
                          >
                            {Number(expense.percentage_of_total).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">{Number(expense.total_amount).toLocaleString()} د.ج</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        
        {/* رسم بياني للتوزيع */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">توزيع المصروفات</CardTitle>
            <CardDescription>
              توزيع المصروفات حسب الفئة كنسبة مئوية من الإجمالي
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-[380px]">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ) : data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground h-[380px]">
                <PieChart className="h-12 w-12 mb-2" />
                <p>لم يتم العثور على بيانات مصروفات للفترة المحددة</p>
              </div>
            ) : (
              <div className="h-[380px] flex flex-col justify-between">
                {/* رسم بياني دائري بسيط باستخدام CSS */}
                <div className="relative w-[200px] h-[200px] mx-auto">
                  {data?.map((expense, index) => {
                    // حساب زوايا بداية ونهاية كل قطاع
                    const previousPercentages = data.slice(0, index).reduce(
                      (sum, e) => sum + Number(e.percentage_of_total),
                      0
                    );
                    const startAngle = (previousPercentages / 100) * 360;
                    const endAngle = startAngle + (Number(expense.percentage_of_total) / 100) * 360;
                    
                    // إنشاء خصائص CSS لعرض القطاع
                    const pieStyle = {
                      position: 'absolute' as const,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      clipPath: `polygon(50% 50%, 50% 0%, ${endAngle <= 90 ? 50 + 50 * Math.tan(endAngle * Math.PI / 180) : 100}% ${endAngle <= 90 ? 0 : endAngle <= 180 ? 50 - 50 / Math.tan(endAngle * Math.PI / 180) : 0}%, ${endAngle >= 270 ? 0 : endAngle >= 180 ? 0 : 50 - 50 * Math.tan(endAngle * Math.PI / 180)}% ${endAngle >= 270 ? 50 + 50 / Math.tan(endAngle * Math.PI / 180) : endAngle >= 180 ? 100 : 0}%)`,
                      transform: `rotate(${startAngle}deg)`,
                      backgroundColor: getCategoryColor(expense.category).replace('bg-', ''),
                      zIndex: 10 - index,
                    };
                    
                    return (
                      <div key={expense.category} style={pieStyle} />
                    );
                  })}
                </div>
                
                {/* وسيلة إيضاح المخطط */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {data?.slice(0, 6).map((expense) => (
                    <div key={expense.category} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(expense.category)}`} />
                      <span className="text-sm truncate">{expense.category}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {Number(expense.percentage_of_total).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {data?.length > 6 && (
                    <div className="flex items-center gap-2 col-span-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span className="text-sm">أخرى</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {data.slice(6).reduce((sum, expense) => sum + Number(expense.percentage_of_total), 0).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpensesAnalysis;
