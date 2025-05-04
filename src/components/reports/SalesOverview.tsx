import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  ShoppingBag, 
  Tag, 
  PieChart, 
  BarChart, 
  ChevronUp, 
  ChevronDown,
  Calendar,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Tipos de datos
type DateRange = {
  from: Date;
  to: Date;
};

type SalesByCategoryData = {
  id: string;
  organization_id: string;
  category_name: string;
  sale_month: string;
  total_sales: number;
  units_sold: number;
  percentage: number;
};

type SalesOverviewProps = {
  data: SalesByCategoryData[];
  dateRange: DateRange;
  isLoading: boolean;
};

// Componente para el resumen de ventas
const SalesOverview = ({ data, dateRange, isLoading }: SalesOverviewProps) => {
  const [viewMode, setViewMode] = useState('chart');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Formatear rango de fechas para mostrar
  const formattedDateRange = `${format(dateRange.from, 'dd MMM yyyy', { locale: ar })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ar })}`;

  // Colores para las categorías
  const categoryColors: Record<string, string> = {
    'الملابس': 'bg-blue-500',
    'الإلكترونيات': 'bg-purple-500',
    'المنزل والحديقة': 'bg-green-500',
    'الجمال والعناية الشخصية': 'bg-pink-500',
    'الأطعمة والمشروبات': 'bg-yellow-500',
    'الألعاب والهوايات': 'bg-red-500',
    'المجوهرات': 'bg-indigo-500',
    'الرياضة': 'bg-emerald-500',
    'الأجهزة': 'bg-orange-500',
    'الكتب والقرطاسية': 'bg-cyan-500',
    'default': 'bg-slate-500'
  };

  // Procesar datos para mostrar
  const processSalesData = () => {
    if (!data || data.length === 0) return [];

    // Agrupar por categoría
    const categoryMap = new Map<string, {
      total_sales: number;
      units_sold: number;
      percentage: number;
      color: string;
    }>();

    let totalSales = 0;
    let totalUnits = 0;

    // Calcular totales
    for (const item of data) {
      totalSales += Number(item.total_sales);
      totalUnits += Number(item.units_sold);
    }

    // Agrupar por categoría
    for (const item of data) {
      const existing = categoryMap.get(item.category_name) || {
        total_sales: 0,
        units_sold: 0,
        percentage: 0,
        color: categoryColors[item.category_name] || categoryColors.default
      };

      categoryMap.set(item.category_name, {
        total_sales: existing.total_sales + Number(item.total_sales),
        units_sold: existing.units_sold + Number(item.units_sold),
        percentage: 0, // Calcularemos esto después
        color: existing.color
      });
    }

    // Calcular porcentajes
    for (const [category, values] of categoryMap.entries()) {
      values.percentage = totalSales > 0 ? (values.total_sales / totalSales) * 100 : 0;
    }

    // Convertir a array y ordenar por ventas
    return Array.from(categoryMap.entries())
      .map(([category, values]) => ({
        category,
        ...values
      }))
      .sort((a, b) => b.total_sales - a.total_sales);
  };

  const salesByCategory = processSalesData();
  
  // Obtener todas las categorías únicas para el filtro
  const allCategories = salesByCategory.map(item => item.category);
  
  // Calcular totales
  const totalSales = salesByCategory.reduce((sum, item) => sum + item.total_sales, 0);
  const totalUnits = salesByCategory.reduce((sum, item) => sum + item.units_sold, 0);
  const averageOrderValue = totalUnits > 0 ? totalSales / totalUnits : 0;
  
  // Filtrar por categoría si es necesario
  const filteredData = categoryFilter === 'all' 
    ? salesByCategory 
    : salesByCategory.filter(item => item.category === categoryFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <h2 className="text-xl font-semibold">نظرة عامة على المبيعات</h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <>الفترة: {formattedDateRange}</>
          )}
        </p>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalSales.toLocaleString()} د.ج
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">عدد الوحدات المباعة</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalUnits.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">متوسط قيمة البيع</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} د.ج
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">عدد الفئات</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {allCategories.length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <CardTitle className="text-lg">التحليل حسب الفئة</CardTitle>
              <CardDescription>
                تحليل المبيعات حسب فئة المنتجات
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="كل الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Tabs value={viewMode} onValueChange={setViewMode} className="hidden md:block">
                <TabsList className="h-9">
                  <TabsTrigger value="chart" className="px-3">
                    <PieChart className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="px-3">
                    <BarChart className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : salesByCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mb-2" />
              <p>لم يتم العثور على بيانات مبيعات للفترة المحددة</p>
            </div>
          ) : viewMode === 'chart' ? (
            <div className="py-4">
              {/* Gráfico de barras horizontal para categorías */}
              <div className="space-y-4">
                {filteredData.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {Math.round(item.percentage)}%
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} rounded-full`} 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{item.units_sold.toLocaleString()} وحدة</span>
                      <span>{item.total_sales.toLocaleString()} د.ج</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 font-medium">الفئة</th>
                    <th className="text-right py-2 font-medium">المبيعات</th>
                    <th className="text-right py-2 font-medium">الوحدات</th>
                    <th className="text-right py-2 font-medium">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.category} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                          <span>{item.category}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {item.total_sales.toLocaleString()} د.ج
                      </td>
                      <td className="py-2 pr-4">
                        {item.units_sold.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {Math.round(item.percentage)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length > 1 && (
                    <tr className="font-medium bg-muted/20">
                      <td className="py-2 pr-4">الإجمالي</td>
                      <td className="py-2 pr-4">
                        {filteredData.reduce((sum, item) => sum + item.total_sales, 0).toLocaleString()} د.ج
                      </td>
                      <td className="py-2 pr-4">
                        {filteredData.reduce((sum, item) => sum + item.units_sold, 0).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {Math.round(filteredData.reduce((sum, item) => sum + item.percentage, 0))}%
                        </Badge>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOverview; 