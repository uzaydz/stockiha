// مكون المخزون المحسن للأداء
// Performance Optimized Inventory Component

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
 } from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Zap,
  Clock,
  Database,
  RefreshCw,
  Filter,
  Eye,
  Edit,
  MoreHorizontal,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { 
  optimizedInventoryAPI,
  useOptimizedInventoryStats,
  useOptimizedInventoryProducts 
} from '@/lib/api/inventory-optimized-api';
import { inventoryCache, cacheKeys } from '@/lib/cache/advanced-cache-system';
import { useDebounce } from '@/hooks/useDebounce';
import ProductInventoryDetails from './ProductInventoryDetails';
import { toast } from 'sonner';


// Types
interface InventoryFilters {
  searchQuery: string;
  stockFilter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  sortBy: 'name' | 'stock' | 'price' | 'updated';
  sortOrder: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

interface PerformanceMetrics {
  cacheHits: number;
  totalRequests: number;
  averageResponseTime: number;
  throttledRequests: number;
}

interface InventoryPerformanceOptimizedProps {
  onProductSelect?: (productId: string) => void;
  showActions?: boolean;
  initialSearchTerm?: string;
  canEdit?: boolean; // إضافة prop جديد للصلاحيات
}

const InventoryPerformanceOptimized: React.FC<InventoryPerformanceOptimizedProps> = ({
  onProductSelect,
  showActions = true,
  initialSearchTerm = '',
  canEdit = true // Default to true if not provided
}) => {
  // Auth state
  const { organizationId, isLoading: authLoading } = useOptimizedAuth();
  
  // Product details and edit state
  const [showProductDetails, setShowProductDetails] = useState<string | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // Filters state
  const [filters, setFilters] = useState<InventoryFilters>({
    searchQuery: initialSearchTerm,
    stockFilter: 'all',
    sortBy: 'name',
    sortOrder: 'ASC',
    page: 1,
    pageSize: 50
  });

  // Debounced search query - زيادة من 500ms إلى 1000ms
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 1000);

  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    cacheHits: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    throttledRequests: 0
  });

  // Memoized filters for API calls - محسن
  const optimizedFilters = useMemo(() => ({
    ...filters,
    searchQuery: debouncedSearchQuery
  }), [filters, debouncedSearchQuery]);

  // API calls using optimized hooks
  const { 
    stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useOptimizedInventoryStats();

  const { 
    products, 
    isLoading: productsLoading, 
    error: productsError,
    refetch: refetchProducts 
  } = useOptimizedInventoryProducts(optimizedFilters);

  // Update performance metrics - محسن
  useEffect(() => {
    const updateMetrics = () => {
      const cacheStats = inventoryCache.getStats();
      setPerformanceMetrics(prev => ({
        ...prev,
        cacheHits: cacheStats.validEntries,
        totalRequests: cacheStats.totalEntries,
      }));
    };

    // تحديث أقل تكراراً
    const interval = setInterval(updateMetrics, 10000); // زيادة من 5000ms إلى 10000ms
    return () => clearInterval(interval);
  }, []);

  // Handlers - محسنة مع useCallback
  const handleFilterChange = useCallback((newFilters: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query, page: 1 }));
  }, []);

  const handleClearCache = useCallback(() => {
    if (organizationId) {
      optimizedInventoryAPI.clearInventoryCache(organizationId);
      refetchStats();
      refetchProducts();
      toast.success('تم مسح Cache بنجاح');
    }
  }, [organizationId, refetchStats, refetchProducts]);

  // Handlers for product actions
  const handleViewProductDetails = useCallback((productId: string) => {
    setShowProductDetails(productId);
  }, []);

  const handleEditProduct = useCallback((productId: string) => {
    if (onProductSelect) {
      onProductSelect(productId);
    } else {
      setSelectedProductForEdit(productId);
    }
  }, [onProductSelect]);

  const handleCloseProductDetails = useCallback(() => {
    setShowProductDetails(null);
  }, []);

  const handleCloseProductEdit = useCallback(() => {
    setSelectedProductForEdit(null);
  }, []);

  // Handlers for product selection
  const handleProductSelect = useCallback((productId: string, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && products) {
      setSelectedProducts(new Set(products.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const handleCopySKU = useCallback(async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      toast.success(`تم نسخ SKU: ${sku}`);
    } catch (error) {
      toast.error('فشل في نسخ SKU');
    }
  }, []);

  // Memoized utility functions
  const getStockStatusColor = useMemo(() => (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'out-of-stock': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }, []);

  const getStockStatusIcon = useMemo(() => (status: string) => {
    switch (status) {
      case 'in-stock': return <TrendingUp className="w-3 h-3" />;
      case 'low-stock': return <AlertCircle className="w-3 h-3" />;
      case 'out-of-stock': return <TrendingDown className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  }, []);

  // Memoized table rows
  const tableRows = useMemo(() => {
    if (!products) return [];
    
    return products.map((product) => (
      <TableRow key={product.id}>
        <TableCell>
          <Checkbox
            checked={selectedProducts.has(product.id)}
            onCheckedChange={(checked) => handleProductSelect(product.id, !!checked)}
            aria-label={`تحديد ${product.name}`}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            {product.thumbnail_image && (
              <img
                src={product.thumbnail_image}
                alt={product.name}
                className="w-10 h-10 rounded object-cover"
                loading="lazy"
              />
            )}
            <div>
              <p className="font-medium">{product.name}</p>
              {product.has_variants && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {product.variant_count} متغير
                </Badge>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
        <TableCell>
          <div className="text-center">
            <span className="font-bold">{product.stock_quantity}</span>
            {product.has_variants && (
              <p className="text-xs text-muted-foreground">
                إجمالي: {product.total_variant_stock}
              </p>
            )}
          </div>
        </TableCell>
        <TableCell>{product.price} د.ج</TableCell>
        <TableCell>
          <Badge 
            className={`text-xs ${getStockStatusColor(product.stock_status)}`}
          >
            {getStockStatusIcon(product.stock_status)}
            <span className="mr-1">
              {product.stock_status === 'in-stock' && 'متوفر'}
              {product.stock_status === 'low-stock' && 'منخفض'}
              {product.stock_status === 'out-of-stock' && 'نفذ'}
            </span>
          </Badge>
        </TableCell>
        <TableCell className="text-sm">
          {product.days_since_last_update} يوم
        </TableCell>
        <TableCell>
          {showActions && (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleViewProductDetails(product.id)}
                title="عرض التفاصيل"
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleEditProduct(product.id)}
                title="تعديل المنتج"
              >
                <Edit className="w-3 h-3" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" title="خيارات إضافية">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleViewProductDetails(product.id)}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    فتح في صفحة جديدة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCopySKU(product.sku)}>
                    <Package className="w-4 h-4 mr-2" />
                    نسخ SKU
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    حذف المنتج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </TableCell>
      </TableRow>
    ));
  }, [products, selectedProducts, handleProductSelect, getStockStatusColor, getStockStatusIcon, handleViewProductDetails, handleEditProduct, handleCopySKU, showActions]);

  // Loading state
  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Performance Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                المخزون المحسن للأداء
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                نظام متطور مع cache و throttling لتقليل الاستدعاءات
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Performance Badges */}
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  Cache: {performanceMetrics.cacheHits}/{performanceMetrics.totalRequests}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {Math.round(performanceMetrics.averageResponseTime)}ms
                </Badge>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearCache}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                مسح Cache
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">إجمالي المنتجات</p>
                  <p className="text-2xl font-bold">{stats.total_products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">متوفر</p>
                  <p className="text-2xl font-bold text-green-600">{stats.in_stock_products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">مخزون منخفض</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.low_stock_products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium">نفذ المخزون</p>
                  <p className="text-2xl font-bold text-red-600">{stats.out_of_stock_products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المنتجات (الاسم، SKU، الباركود)..."
                  value={filters.searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filters.stockFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange({ stockFilter: 'all' })}
              >
                الجميع
              </Button>
              <Button
                variant={filters.stockFilter === 'in-stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange({ stockFilter: 'in-stock' })}
              >
                متوفر
              </Button>
              <Button
                variant={filters.stockFilter === 'low-stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange({ stockFilter: 'low-stock' })}
              >
                منخفض
              </Button>
              <Button
                variant={filters.stockFilter === 'out-of-stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange({ stockFilter: 'out-of-stock' })}
              >
                نفذ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* شريط الإجراءات المجمعة */}
      {selectedProducts.size > 0 && (
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  تم تحديد {selectedProducts.size} منتج
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSelection}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  إلغاء التحديد
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-blue-700 border-blue-300">
                  تصدير المحدد
                </Button>
                <Button size="sm" variant="outline" className="text-blue-700 border-blue-300">
                  تعديل مجمع
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  حذف المحدد
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {productsError && (
            <Alert className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{productsError}</AlertDescription>
            </Alert>
          )}
          
          {productsLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={products && products.length > 0 && selectedProducts.size === products.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="تحديد جميع المنتجات"
                    />
                  </TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>المخزون</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {products && products.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  عرض {products.length} من {products[0]?.filtered_count || 0} منتج
                </p>
                {selectedProducts.size > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {selectedProducts.size} محدد
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange({ page: filters.page - 1 })}
                  disabled={filters.page <= 1}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange({ page: filters.page + 1 })}
                  disabled={products.length < filters.pageSize}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نافذة تفاصيل المنتج */}
      {showProductDetails && (
        <ProductInventoryDetails
          productId={showProductDetails}
          onClose={handleCloseProductDetails}
          showInModal={true}
          canEdit={canEdit}
        />
      )}

      {/* نافذة تعديل المنتج */}
      {selectedProductForEdit && (
        <ProductInventoryDetails
          productId={selectedProductForEdit}
          onClose={handleCloseProductEdit}
          showInModal={true}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};

// استخدام React.memo لتحسين الأداء
export default React.memo(InventoryPerformanceOptimized, (prevProps, nextProps) => {
  return (
    prevProps.showActions === nextProps.showActions &&
    prevProps.initialSearchTerm === nextProps.initialSearchTerm
  );
});
