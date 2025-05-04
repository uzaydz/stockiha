import { useState } from 'react';
import { 
  Package, 
  ArrowDownUp, 
  Search, 
  AlertTriangle, 
  CheckCircle2,
  XCircle, 
  Layers,
  ChevronsUpDown,
  SlidersHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TableRow,
} from '@/components/ui/table';

// Tipos de datos
type InventoryItem = {
  product_id: string;
  product_name: string;
  category: string;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  total_value: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_updated: string;
};

type InventoryValuationProps = {
  data: InventoryItem[];
  isLoading: boolean;
};

// Componente para valoración de inventario
const InventoryValuation = ({ data, isLoading }: InventoryValuationProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<{column: string; direction: 'asc' | 'desc'}>({
    column: 'total_value',
    direction: 'desc'
  });
  
  // Procesar datos de inventario
  const processInventoryData = () => {
    if (!data || data.length === 0) return {
      filteredItems: [],
      categories: [],
      totalValue: 0,
      inStockCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };
    
    // Obtener categorías únicas
    const categories = Array.from(new Set(data.map(item => item.category)));
    
    // Contar estados
    const inStockCount = data.filter(item => item.status === 'in_stock').length;
    const lowStockCount = data.filter(item => item.status === 'low_stock').length;
    const outOfStockCount = data.filter(item => item.status === 'out_of_stock').length;
    
    // Calcular valor total
    const totalValue = data.reduce((sum, item) => sum + Number(item.total_value), 0);
    
    // Filtrar y ordenar items
    let filteredItems = [...data];
    
    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.product_name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    }
    
    // Filtro por categoría
    if (categoryFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }
    
    // Filtro por estado
    if (statusFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.status === statusFilter);
    }
    
    // Ordenar
    filteredItems.sort((a, b) => {
      const aValue = a[sortBy.column as keyof InventoryItem];
      const bValue = b[sortBy.column as keyof InventoryItem];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortBy.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else {
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        return sortBy.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
    });
    
    return {
      filteredItems,
      categories,
      totalValue,
      inStockCount,
      lowStockCount,
      outOfStockCount
    };
  };
  
  const { 
    filteredItems, 
    categories, 
    totalValue, 
    inStockCount, 
    lowStockCount, 
    outOfStockCount 
  } = processInventoryData();
  
  // Función para obtener color de estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-500';
      case 'low_stock':
        return 'bg-yellow-500';
      case 'out_of_stock':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };
  
  // Función para traducir el estado
  const translateStatus = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'متوفر';
      case 'low_stock':
        return 'مخزون منخفض';
      case 'out_of_stock':
        return 'نفذ من المخزون';
      default:
        return status;
    }
  };
  
  // Función para cambiar ordenamiento
  const toggleSort = (column: string) => {
    if (sortBy.column === column) {
      setSortBy({
        column,
        direction: sortBy.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortBy({
        column,
        direction: 'asc'
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <h2 className="text-xl font-semibold">تقييم المخزون</h2>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">إجمالي قيمة المخزون</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalValue.toLocaleString()} د.ج
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">منتجات متوفرة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {inStockCount}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">مخزون منخفض</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {lowStockCount}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">نفذ من المخزن</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {outOfStockCount}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <CardTitle className="text-lg">تفاصيل المخزون</CardTitle>
              <CardDescription>
                قائمة بجميع المنتجات في المخزون وقيمتها
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:space-x-reverse">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن منتج..."
                  className="pr-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="تصفية حسب الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="in_stock">متوفر</SelectItem>
                  <SelectItem value="low_stock">مخزون منخفض</SelectItem>
                  <SelectItem value="out_of_stock">نفذ من المخزون</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>إعادة ضبط</span>
              </Button>
            </div>
            
            {/* Tabla */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mb-2" />
                <p>لم يتم العثور على بيانات مخزون مطابقة</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">
                        <Button 
                          variant="ghost" 
                          className="gap-1 p-0 h-auto font-medium"
                          onClick={() => toggleSort('product_name')}
                        >
                          المنتج
                          {sortBy.column === 'product_name' && (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">
                        <Button 
                          variant="ghost" 
                          className="gap-1 p-0 h-auto font-medium"
                          onClick={() => toggleSort('stock_quantity')}
                        >
                          الكمية
                          {sortBy.column === 'stock_quantity' && (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button 
                          variant="ghost" 
                          className="gap-1 p-0 h-auto font-medium"
                          onClick={() => toggleSort('cost_price')}
                        >
                          سعر التكلفة
                          {sortBy.column === 'cost_price' && (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button 
                          variant="ghost" 
                          className="gap-1 p-0 h-auto font-medium"
                          onClick={() => toggleSort('sale_price')}
                        >
                          سعر البيع
                          {sortBy.column === 'sale_price' && (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button 
                          variant="ghost" 
                          className="gap-1 p-0 h-auto font-medium"
                          onClick={() => toggleSort('total_value')}
                        >
                          القيمة الإجمالية
                          {sortBy.column === 'total_value' && (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.stock_quantity}</TableCell>
                        <TableCell>{Number(item.cost_price).toLocaleString()} د.ج</TableCell>
                        <TableCell>{Number(item.sale_price).toLocaleString()} د.ج</TableCell>
                        <TableCell>{Number(item.total_value).toLocaleString()} د.ج</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(item.status)} hover:${getStatusColor(item.status)}`}>
                            {translateStatus(item.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground text-right">
              {!isLoading && `عرض ${filteredItems.length} من إجمالي ${data?.length || 0} منتج`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryValuation; 