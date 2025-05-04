import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  BarChart,
  ShoppingBag, 
  Search,
  ArrowUpDown,
  ChevronDown,
  DollarSign,
  Percent,
  Package,
  Tag
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Tipos de datos
type DateRange = {
  from: Date;
  to: Date;
};

type ProductData = {
  product_id: string;
  product_name: string;
  category: string;
  units_sold: number;
  total_revenue: number;
  profit_margin: number;
  total_profit: number;
};

type ProductPerformanceProps = {
  products: ProductData[];
  dateRange: DateRange;
  isLoading: boolean;
};

// Componente de rendimiento de productos
const ProductPerformance = ({ products, dateRange, isLoading }: ProductPerformanceProps) => {
  // Estado para la búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('units_sold');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Obtener categorías únicas de los productos
  const categories = ['all', ...Array.from(new Set(products.map(product => product.category)))];
  
  // Filtrar productos por búsqueda y categoría
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = searchTerm === '' || 
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof ProductData];
      const bValue = b[sortBy as keyof ProductData];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        const aString = String(aValue);
        const bString = String(bValue);
        return sortDirection === 'asc' 
          ? aString.localeCompare(bString) 
          : bString.localeCompare(aString);
      }
    });
  
  // Totales
  const totalRevenue = products.reduce((sum, product) => sum + Number(product.total_revenue), 0);
  const totalProfit = products.reduce((sum, product) => sum + Number(product.total_profit), 0);
  const totalUnitsSold = products.reduce((sum, product) => sum + Number(product.units_sold), 0);
  const averageMargin = products.length > 0 
    ? products.reduce((sum, product) => sum + Number(product.profit_margin), 0) / products.length 
    : 0;
  
  // Función para manejar el cambio de ordenación
  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };
  
  // Formatear rango de fechas para mostrar
  const formattedDateRange = `${format(dateRange.from, 'dd MMM yyyy', { locale: ar })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ar })}`;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <h2 className="text-xl font-semibold">أداء المنتجات</h2>
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
        {/* إجمالي وحدات المبيعات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>الوحدات المباعة</span>
              <Package className="h-5 w-5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {totalUnitsSold.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* إجمالي الإيرادات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>إجمالي الإيرادات</span>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalRevenue.toLocaleString()} د.ج
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* إجمالي الربح */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>إجمالي الربح</span>
              <BarChart className="h-5 w-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalProfit.toLocaleString()} د.ج
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* متوسط هامش الربح */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>متوسط الهامش</span>
              <Percent className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {averageMargin.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* أدوات البحث والتصفية */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">تحليل أداء المنتجات</CardTitle>
          <CardDescription>
            تحليل المنتجات حسب المبيعات والربحية خلال الفترة المحددة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-2 md:space-x-reverse">
              {/* حقل البحث */}
              <div className="relative flex-1">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن منتج..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-8"
                />
              </div>
              
              {/* فلتر التصنيف */}
              <Select
                value={filterCategory}
                onValueChange={setFilterCategory}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {categories.filter(c => c !== 'all').map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* فلتر الترتيب */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    <span>ترتيب حسب</span>
                    <ChevronDown className="h-4 w-4 mr-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    checked={sortBy === 'units_sold'}
                    onCheckedChange={() => handleSortChange('units_sold')}
                  >
                    الوحدات المباعة
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={sortBy === 'total_revenue'}
                    onCheckedChange={() => handleSortChange('total_revenue')}
                  >
                    إجمالي الإيرادات
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={sortBy === 'profit_margin'}
                    onCheckedChange={() => handleSortChange('profit_margin')}
                  >
                    هامش الربح
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={sortBy === 'total_profit'}
                    onCheckedChange={() => handleSortChange('total_profit')}
                  >
                    إجمالي الربح
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* جدول المنتجات */}
            {isLoading ? (
              <div className="space-y-2">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead className="text-center">التصنيف</TableHead>
                      <TableHead 
                        className="text-center cursor-pointer"
                        onClick={() => handleSortChange('units_sold')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>الوحدات</span>
                          {sortBy === 'units_sold' && (
                            <ChevronDown 
                              className={`h-4 w-4 transition-transform ${
                                sortDirection === 'asc' ? 'rotate-180' : ''
                              }`} 
                            />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer"
                        onClick={() => handleSortChange('total_revenue')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>الإيرادات</span>
                          {sortBy === 'total_revenue' && (
                            <ChevronDown 
                              className={`h-4 w-4 transition-transform ${
                                sortDirection === 'asc' ? 'rotate-180' : ''
                              }`} 
                            />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer"
                        onClick={() => handleSortChange('profit_margin')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>هامش الربح</span>
                          {sortBy === 'profit_margin' && (
                            <ChevronDown 
                              className={`h-4 w-4 transition-transform ${
                                sortDirection === 'asc' ? 'rotate-180' : ''
                              }`} 
                            />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer"
                        onClick={() => handleSortChange('total_profit')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>إجمالي الربح</span>
                          {sortBy === 'total_profit' && (
                            <ChevronDown 
                              className={`h-4 w-4 transition-transform ${
                                sortDirection === 'asc' ? 'rotate-180' : ''
                              }`} 
                            />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <ShoppingBag className="h-10 w-10 mb-2" />
                            <p>لم يتم العثور على منتجات تطابق معايير البحث</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product, index) => (
                        <TableRow key={product.product_id}>
                          <TableCell className="text-center font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{product.product_name}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {Number(product.units_sold).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {Number(product.total_revenue).toLocaleString()} د.ج
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={`
                                ${Number(product.profit_margin) >= 30 ? 'bg-emerald-500' : 
                                  Number(product.profit_margin) >= 15 ? 'bg-amber-500' : 
                                  'bg-red-500'} text-white
                              `}
                            >
                              {Number(product.profit_margin).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {Number(product.total_profit).toLocaleString()} د.ج
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductPerformance; 