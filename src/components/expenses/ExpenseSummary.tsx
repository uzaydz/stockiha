import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpenses } from '@/hooks/useExpenses';
import { Activity, ArrowDown, ArrowUp, CalendarClock, DollarSign, LineChart, Repeat } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ExpenseWithRecurring } from '@/types/expenses';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ResponsivePie } from '@nivo/pie';

export function ExpenseSummary() {
  const { useExpenseSummaryQuery } = useExpenses();
  const { data: summary, isLoading, error } = useExpenseSummaryQuery();

  if (isLoading) {
    return <ExpenseSummarySkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-white dark:bg-card p-8 text-center" dir="rtl">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground">حدث خطأ أثناء تحميل ملخص المصروفات</h3>
        <p className="text-sm text-muted-foreground mt-2">يرجى المحاولة مرة أخرى لاحقاً.</p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // تنسيق البيانات لمخطط المصروفات الشهرية
  const chartData = Object.entries(summary.by_month).map(([month, amount]) => {
    const [year, monthNum] = month.split('-');
    const monthName = getArabicMonthName(parseInt(monthNum) - 1);
    return {
      month: `${monthName} ${year}`,
      amount: Number(amount).toFixed(2),
    };
  }).sort((a, b) => {
    // ترتيب حسب التاريخ لضمان الترتيب الزمني
    const monthA = a.month.split(' ');
    const monthB = b.month.split(' ');
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const indexA = arabicMonths.indexOf(monthA[0]);
    const indexB = arabicMonths.indexOf(monthB[0]);
    const yearA = parseInt(monthA[1]);
    const yearB = parseInt(monthB[1]);
    
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    return indexA - indexB;
  });

  // تنسيق البيانات لفئات المصروفات
  const categoryData = Object.entries(summary.by_category).map(([category, amount]) => ({
    category: translateCategory(category),
    amount: Number(amount).toFixed(2),
  }));

  // Icons for categories
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      'الإيجار': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
      'الرواتب': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
      'المرافق': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"></path><path d="M2 20h20"></path><path d="M14 12v.01"></path></svg>,
      'المخزون': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"></path><path d="M2 7v3a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V7"></path></svg>,
      'التسويق': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
      'الصيانة': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>,
      'متنوع': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
      'غير مصنف': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>,
    };
    
    return icons[category] || icons['غير مصنف'];
  };

  // Función para obtener el color de categoría
  const getCategoryColors = (category: string) => {
    const colors: Record<string, {bg: string, text: string}> = {
      'الإيجار': {bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400'},
      'الرواتب': {bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400'},
      'المرافق': {bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400'},
      'المخزون': {bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400'},
      'التسويق': {bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400'},
      'الصيانة': {bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400'},
      'متنوع': {bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-700 dark:text-gray-300'},
      'غير مصنف': {bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400'},
    };
    
    return colors[category] || colors['غير مصنف'];
  };

  // Transformar datos para el gráfico de pastel
  const getPieChartData = () => {
    if (!summary?.categories) return [];
    
    return Object.entries(summary.categories).map(([category, amount], index) => ({
      id: category,
      label: category,
      value: Number(amount),
      color: [
        '#3B82F6', // blue
        '#6366F1', // indigo
        '#F59E0B', // amber
        '#F97316', // orange
        '#8B5CF6', // purple
        '#14B8A6', // teal
        '#6B7280', // gray
        '#4B5563', // gray-600
      ][index % 8]
    }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* المصروفات الحديثة والقادمة */}
      <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">المصروفات الحديثة والقادمة</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
            </div>
          </div>
        ) : summary?.recent_expenses && summary.recent_expenses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.recent_expenses.map((expense) => {
              const categoryColors = getCategoryColors(expense.category);
              return (
                <div 
                  key={expense.id} 
                  className="rounded-lg border border-border dark:border-border p-4 bg-white dark:bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${categoryColors.bg} ${categoryColors.text} group-hover:scale-110 transition-transform duration-200`}>
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{expense.title}</h4>
                        <p className="text-sm text-muted-foreground">{expense.category}</p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold ${categoryColors.text}`}>
                      {Number(expense.amount).toFixed(2)} د.ج
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">
                      {format(new Date(expense.expense_date), "MMM d, yyyy")}
                    </p>
                    {expense.is_recurring && (
                      <Badge variant="outline" className="bg-primary/5 dark:bg-primary/10 text-primary border-primary/20 dark:border-primary/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m17 2 4 4-4 4"></path>
                          <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
                          <path d="m7 22-4-4 4-4"></path>
                          <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
                        </svg>
                        متكرر
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8 bg-muted/20 dark:bg-muted/10 rounded-lg">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted dark:bg-muted/50 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground">لا توجد مصروفات حديثة</h3>
            <p className="text-sm text-muted-foreground mt-2">لم يتم تسجيل أي مصروفات حديثة أو قادمة.</p>
          </div>
        )}
      </div>

      {/* إحصائيات المصروفات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* إجمالي المصروفات */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              إجمالي المصروفات
            </CardTitle>
            <CardDescription>مجموع جميع المصروفات في الشهر الحالي</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                `${Number(summary?.total_expenses || 0).toFixed(2)} د.ج`
              )}
            </div>
            {summary?.previous_month_change && (
              <div className="flex items-center mt-2">
                <Badge variant={summary.previous_month_change > 0 ? "destructive" : "outline"} className="text-xs">
                  {summary.previous_month_change > 0 ? "+" : ""}
                  {summary.previous_month_change}%
                </Badge>
                <span className="text-xs text-muted-foreground mr-2">
                  مقارنة بالشهر السابق
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* المصروفات المتكررة */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m17 2 4 4-4 4"></path>
                <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
                <path d="m7 22-4-4 4-4"></path>
                <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
              </svg>
              المصروفات المتكررة
            </CardTitle>
            <CardDescription>إجمالي المصروفات الشهرية المتكررة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                `${Number(summary?.recurring_expenses || 0).toFixed(2)} د.ج`
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                `${summary?.recurring_count || 0} مصروف متكرر شهري`
              )}
            </p>
          </CardContent>
        </Card>

        {/* المصروفات القادمة */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              المصروفات القادمة
            </CardTitle>
            <CardDescription>المصروفات المستحقة في الأيام السبعة القادمة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                `${Number(summary?.upcoming_total || 0).toFixed(2)} د.ج`
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                `${summary?.upcoming_count || 0} مصروف في الأسبوع القادم`
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* فئات المصروفات والمخطط البياني */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* فئات المصروفات */}
        <Card className="md:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"></path>
                <rect x="7" y="10" width="4" height="8"></rect>
                <rect x="15" y="6" width="4" height="12"></rect>
              </svg>
              فئات المصروفات
            </CardTitle>
            <CardDescription>تقسيم المصروفات حسب الفئة للشهر الحالي</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : summary?.categories && Object.keys(summary.categories).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(summary.categories).map(([category, amount]) => {
                  const total = Number(summary.total_expenses || 0);
                  const percentage = total > 0 ? ((Number(amount) / total) * 100).toFixed(1) : '0';
                  const categoryColors = getCategoryColors(category);
                  
                  return (
                    <div key={category} className="space-y-2 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${categoryColors.bg} ${categoryColors.text} group-hover:scale-110 transition-transform duration-200`}>
                            {getCategoryIcon(category)}
                          </div>
                          <span className="font-medium text-foreground">{category}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold ${categoryColors.text}`}>
                            {Number(amount).toFixed(2)} د.ج
                          </span>
                          <span className="text-muted-foreground text-xs mr-2">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden dark:bg-muted/70">
                        <div
                          className={`h-full ${categoryColors.text.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-')} rounded-full transition-all duration-300 ease-in-out group-hover:opacity-80`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-4">
                <p className="text-muted-foreground">لا توجد بيانات متاحة</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* المخطط البياني للمصروفات */}
        <Card className="md:col-span-3 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20"></path>
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8.56 3.69a9 9 0 0 0-2.92 1.95M3.69 8.56A9 9 0 0 0 2.3 11.5"></path>
                <path d="M15.44 3.69a9 9 0 0 1 2.92 1.95M20.31 8.56A9 9 0 0 1 21.7 11.5"></path>
                <path d="M3.69 15.44a9 9 0 0 0 1.95 2.92"></path>
                <path d="M8.56 20.31A9 9 0 0 0 11.5 21.7"></path>
                <path d="M15.44 20.31a9 9 0 0 1 2.92-1.95"></path>
                <path d="M20.31 15.44a9 9 0 0 1-1.95 2.92"></path>
              </svg>
              توزيع المصروفات
            </CardTitle>
            <CardDescription>توزيع المصروفات حسب الفئة بشكل بياني</CardDescription>
          </CardHeader>
          <CardContent className="p-2 h-[300px]">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : summary?.categories && Object.keys(summary.categories).length > 0 ? (
              <ResponsivePie
                data={getPieChartData()}
                margin={{ top: 30, right: 20, bottom: 30, left: 20 }}
                innerRadius={0.6}
                padAngle={0.5}
                cornerRadius={4}
                activeOuterRadiusOffset={8}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="var(--muted-foreground)"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="var(--foreground)"
                defs={[
                  {
                    id: 'dots',
                    type: 'patternDots',
                    background: 'inherit',
                    color: 'rgba(255, 255, 255, 0.3)',
                    size: 4,
                    padding: 1,
                    stagger: true
                  },
                  {
                    id: 'lines',
                    type: 'patternLines',
                    background: 'inherit',
                    color: 'rgba(255, 255, 255, 0.3)',
                    rotation: -45,
                    lineWidth: 6,
                    spacing: 10
                  }
                ]}
                fill={[
                  { match: { id: 'الإيجار' }, id: 'lines' },
                  { match: { id: 'الرواتب' }, id: 'dots' },
                  { match: { id: 'المرافق' }, id: 'lines' },
                  { match: { id: 'المخزون' }, id: 'dots' },
                ]}
                legends={[
                  {
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 30,
                    itemsSpacing: 0,
                    itemWidth: 65,
                    itemHeight: 18,
                    itemTextColor: "var(--muted-foreground)",
                    itemDirection: 'right-to-left',
                    itemOpacity: 1,
                    symbolSize: 12,
                    symbolShape: 'circle',
                  }
                ]}
                theme={{
                  tooltip: {
                    container: {
                      backgroundColor: "var(--card)",
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      color: "var(--card-foreground)",
                      fontSize: '0.875rem',
                      direction: 'rtl',
                    }
                  },
                  grid: {
                    line: {
                      stroke: "var(--border)",
                      strokeWidth: 1
                    }
                  }
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-muted-foreground">لا توجد بيانات كافية للعرض</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ExpenseSummarySkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-4 w-[150px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1 border-border">
          <CardHeader>
            <Skeleton className="h-6 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent className="h-80">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-[250px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-[100px] mb-3" />
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
              
              <div>
                <Skeleton className="h-4 w-[120px] mb-3" />
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// وظائف مساعدة لتنسيق التواريخ والترجمة
function getArabicMonthName(monthIndex: number): string {
  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return arabicMonths[monthIndex];
}

function formatDateArabic(date: Date): string {
  const day = date.getDate();
  const month = getArabicMonthName(date.getMonth());
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function translateCategory(category: string): string {
  // Si la categoría ya está en árabe, devolverla directamente
  if (/[\u0600-\u06FF]/.test(category)) {
    return category;
  }
  
  // Si parece un UUID (contiene guiones y tiene la longitud típica de un UUID)
  if (category.includes('-') && category.length > 30) {
    return 'غير مصنف'; // Categoría no clasificada
  }
  
  // Tabla de traducciones inglés -> árabe
  const translations: Record<string, string> = {
    'Rent': 'الإيجار',
    'Salaries': 'الرواتب',
    'Utilities': 'المرافق',
    'Inventory': 'المخزون',
    'Marketing': 'التسويق',
    'Maintenance': 'الصيانة',
    'Miscellaneous': 'متنوع',
    // يمكن إضافة المزيد من الترجمات حسب الحاجة
  };
  
  return translations[category] || category;
} 