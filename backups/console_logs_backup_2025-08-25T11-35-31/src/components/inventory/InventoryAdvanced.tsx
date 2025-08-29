import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Upload,
  MoreHorizontal,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Boxes,
  Activity,
  BarChart3,
  Settings2,
  Eye,
  EyeOff,
  ArrowUpDown,
  Grid3X3,
  List as ListIcon,
  Calendar,
  ShoppingCart,
  Zap,
  Database,
  Info
} from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import { FixedSizeGrid as VirtualGrid } from 'react-window';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
 } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import useInventoryAdvanced from '@/hooks/useInventoryAdvanced';
import { cn } from '@/lib/utils';
import type { InventoryProduct, BulkUpdateItem } from '@/lib/api/inventory-advanced-api';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

// أنواع العرض
type ViewMode = 'grid' | 'list' | 'compact' | 'detailed';

// مكون إحصائيات متقدمة
const AdvancedStatsPanel = ({ 
  stats, 
  computedStats, 
  className 
}: { 
  stats: any; 
  computedStats: any; 
  className?: string;
}) => {
  if (!stats && !computedStats) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: 'إجمالي المنتجات',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'في المخزون',
      value: computedStats?.inStock || stats?.in_stock_products || 0,
      icon: CheckCircle2,
      color: 'bg-green-500'
    },
    {
      title: 'منخفض المخزون',
      value: computedStats?.lowStock || stats?.low_stock_products || 0,
      icon: AlertCircle,
      color: 'bg-yellow-500'
    },
    {
      title: 'نفذ من المخزون',
      value: computedStats?.outOfStock || stats?.out_of_stock_products || 0,
      icon: TrendingDown,
      color: 'bg-red-500'
    },
    {
      title: 'يحتاج إعادة طلب',
      value: computedStats?.reorderNeeded || stats?.reorder_needed_products || 0,
      icon: ShoppingCart,
      color: 'bg-orange-500'
    },
    {
      title: 'قيمة المخزون',
      value: `${(computedStats?.totalValue || stats?.total_stock_value || 0).toLocaleString()} د.ج`,
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      title: 'متوسط المخزون',
      value: Math.round(computedStats?.averageStock || stats?.average_stock_per_product || 0),
      icon: BarChart3,
      color: 'bg-indigo-500'
    },
    {
      title: 'إضافات الأسبوع',
      value: stats?.last_week_additions || 0,
      icon: TrendingUp,
      color: 'bg-teal-500'
    }
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {statsCards.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <div className={cn("p-2 rounded-full", stat.color)}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// مكون فلترة متقدمة
const AdvancedFilters = ({ 
  filters, 
  onFiltersChange, 
  onClear 
}: {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">الفلاتر المتقدمة</CardTitle>
          <Button variant="outline" size="sm" onClick={onClear}>
            مسح الفلاتر
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">حالة المخزون</label>
            <Select
              value={filters.stock_filter || 'all'}
              onValueChange={(value) => onFiltersChange({ stock_filter: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المنتجات</SelectItem>
                <SelectItem value="in-stock">في المخزون</SelectItem>
                <SelectItem value="low-stock">منخفض المخزون</SelectItem>
                <SelectItem value="out-of-stock">نفذ من المخزون</SelectItem>
                <SelectItem value="reorder-needed">يحتاج إعادة طلب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">ترتيب حسب</label>
            <Select
              value={filters.sort_by || 'name'}
              onValueChange={(value) => onFiltersChange({ sort_by: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="stock">الكمية</SelectItem>
                <SelectItem value="price">السعر</SelectItem>
                <SelectItem value="created">تاريخ الإنشاء</SelectItem>
                <SelectItem value="updated">تاريخ التحديث</SelectItem>
                <SelectItem value="last_inventory_update">آخر تحديث مخزون</SelectItem>
                <SelectItem value="reorder_priority">أولوية إعادة الطلب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">اتجاه الترتيب</label>
            <Select
              value={filters.sort_order || 'ASC'}
              onValueChange={(value) => onFiltersChange({ sort_order: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الاتجاه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC">تصاعدي</SelectItem>
                <SelectItem value="DESC">تنازلي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-variants"
              checked={filters.include_variants !== false}
              onCheckedChange={(checked) => onFiltersChange({ include_variants: checked })}
            />
            <label htmlFor="include-variants" className="text-sm">تضمين المتغيرات</label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-inactive"
              checked={filters.include_inactive === true}
              onCheckedChange={(checked) => onFiltersChange({ include_inactive: checked })}
            />
            <label htmlFor="include-inactive" className="text-sm">تضمين غير النشطة</label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون عنصر منتج في العرض الشبكي
const ProductGridItem = ({ 
  product, 
  isSelected, 
  onSelect, 
  onEdit,
  style 
}: {
  product: InventoryProduct;
  isSelected: boolean;
  onSelect: (product: InventoryProduct) => void;
  onEdit: (product: InventoryProduct) => void;
  style?: React.CSSProperties;
}) => {
  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 border-green-200';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out-of-stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'reorder-needed': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'in-stock': return 'متوفر';
      case 'low-stock': return 'منخفض';
      case 'out-of-stock': return 'نفذ';
      case 'reorder-needed': return 'يحتاج طلب';
      default: return status;
    }
  };

  return (
    <div style={style} className="p-2">
      <Card className={cn(
        "relative cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(product)}
              className="mt-1"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  تعديل المخزون
                </DropdownMenuItem>
                <DropdownMenuItem>
                  عرض التفاصيل
                </DropdownMenuItem>
                <DropdownMenuItem>
                  سجل المخزون
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={product.thumbnailImage} alt={product.name} />
              <AvatarFallback className="rounded-lg">
                {product.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.sku}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الكمية:</span>
              <span className="font-medium">{product.stock_quantity}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">القيمة:</span>
              <span className="font-medium">{product.stock_value.toFixed(2)} د.ج</span>
            </div>

            <Badge 
              variant="outline" 
              className={cn("w-full justify-center", getStockStatusColor(product.stock_status))}
            >
              {getStockStatusText(product.stock_status)}
            </Badge>

            {product.reorder_needed && (
              <Badge variant="outline" className="w-full justify-center bg-orange-50 text-orange-700 border-orange-200">
                <ShoppingCart className="h-3 w-3 mr-1" />
                يحتاج إعادة طلب
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// مكون عنصر منتج في العرض القائمة
const ProductListItem = ({ 
  product, 
  isSelected, 
  onSelect, 
  onEdit 
}: {
  product: InventoryProduct;
  isSelected: boolean;
  onSelect: (product: InventoryProduct) => void;
  onEdit: (product: InventoryProduct) => void;
}) => {
  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'text-green-600';
      case 'low-stock': return 'text-yellow-600';
      case 'out-of-stock': return 'text-red-600';
      case 'reorder-needed': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={cn(
      "flex items-center space-x-4 p-4 border-b hover:bg-muted/50 transition-colors",
      isSelected && "bg-muted border-primary"
    )}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect(product)}
      />

      <Avatar className="h-10 w-10 rounded-lg">
        <AvatarImage src={product.thumbnailImage} alt={product.name} />
        <AvatarFallback className="rounded-lg">
          {product.name.slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium truncate">{product.name}</h3>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={getStockStatusColor(product.stock_status)}
            >
              {product.stock_status}
            </Badge>
            {product.reorder_needed && (
              <Badge variant="outline" className="text-orange-600">
                يحتاج طلب
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted-foreground">{product.sku}</p>
          <div className="flex items-center space-x-4 text-sm">
            <span>الكمية: <strong>{product.stock_quantity}</strong></span>
            <span>القيمة: <strong>{product.stock_value.toFixed(2)} د.ج</strong></span>
            <span>آخر تحديث: <strong>{product.days_since_last_update} يوم</strong></span>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEdit(product)}>
            تعديل المخزون
          </DropdownMenuItem>
          <DropdownMenuItem>
            عرض التفاصيل
          </DropdownMenuItem>
          <DropdownMenuItem>
            سجل المخزون
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// المكون الرئيسي
export const InventoryAdvanced = () => {
  // State للتحكم في العرض
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [bulkReason, setBulkReason] = useState('manual_adjustment');

  // استخدام Hook المتقدم
  const {
    products,
    stats,
    computedStats,
    isLoading,
    isLoadingMore,
    isRefreshing,
    isBulkUpdating,
    hasMore,
    filteredCount,
    totalCount,
    filters,
    searchQuery,
    autocompleteResults,
    error,
    bulkUpdateErrors,
    requestsCount,
    cacheHitRate,
    
    loadMore,
    refresh,
    setFilters,
    setSearchQuery,
    clearFilters,
    bulkUpdate,
    exportData,
    clearError,
    clearCache
  } = useInventoryAdvanced({
    initialPageSize: 80,
    enableInfiniteScroll: true,
    enableRealTimeStats: true
  });

  // مراجع للـ Virtual Scrolling
  const gridRef = useRef<any>(null);
  const listRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // تحديد أبعاد العناصر للـ Virtual Scrolling
  const ITEM_HEIGHT = viewMode === 'list' ? 80 : 220;
  const ITEM_WIDTH = viewMode === 'grid' ? 300 : 400;

  // إدارة التحديد
  const toggleProductSelection = useCallback((product: InventoryProduct) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(product.id)) {
        newSet.delete(product.id);
      } else {
        newSet.add(product.id);
      }
      return newSet;
    });
  }, []);

  const selectAllProducts = useCallback(() => {
    setSelectedProducts(new Set(products.map(p => p.id)));
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  // التحديث المجمع
  const handleBulkUpdate = useCallback(async () => {
    if (!bulkQuantity || selectedProducts.size === 0) {
      toast.error('يرجى اختيار المنتجات وتحديد الكمية');
      return;
    }

    const updates: BulkUpdateItem[] = Array.from(selectedProducts).map(productId => ({
      product_id: productId,
      new_quantity: parseInt(bulkQuantity),
      reason: bulkReason,
      notes: `تحديث مجمع - ${new Date().toLocaleString('ar-DZ')}`
    }));

    try {
      await bulkUpdate(updates);
      setBulkEditDialog(false);
      setBulkQuantity('');
      clearSelection();
    } catch (error) {
    }
  }, [bulkQuantity, selectedProducts, bulkReason, bulkUpdate, clearSelection]);

  // Infinite Scrolling
  const handleScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // رندر العناصر للـ Virtual Scrolling
  const renderGridItem = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * 4 + columnIndex;
    if (index >= products.length) return null;

    const product = products[index];
    return (
      <ProductGridItem
        key={product.id}
        product={product}
        isSelected={selectedProducts.has(product.id)}
        onSelect={toggleProductSelection}
        onEdit={() => {}}
        style={style}
      />
    );
  }, [products, selectedProducts, toggleProductSelection]);

  const renderListItem = useCallback(({ index, style }: any) => {
    if (index >= products.length) {
      if (index === products.length && isLoadingMore) {
        return (
          <div style={style} className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري تحميل المزيد...</span>
          </div>
        );
      }
      return null;
    }

    const product = products[index];
    return (
      <div style={style}>
        <ProductListItem
          product={product}
          isSelected={selectedProducts.has(product.id)}
          onSelect={toggleProductSelection}
          onEdit={() => {}}
        />
      </div>
    );
  }, [products, selectedProducts, toggleProductSelection, isLoadingMore]);

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">حدث خطأ</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
            <Button onClick={clearError} variant="outline">
              إغلاق
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المخزون المتقدمة</h1>
          <p className="text-muted-foreground">
            عرض {filteredCount.toLocaleString()} من أصل {totalCount.toLocaleString()} منتج
            {requestsCount > 0 && (
              <span className="mr-2">
                • معدل الـ Cache: {cacheHitRate.toFixed(1)}%
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            فلاتر متقدمة
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportData('csv')}>
                تصدير CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('xlsx')}>
                تصدير Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            تحديث
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
          >
            <Database className="h-4 w-4 mr-2" />
            مسح Cache
          </Button>
        </div>
      </div>

      {/* Stats Panel */}
      <AdvancedStatsPanel 
        stats={stats} 
        computedStats={computedStats}
      />

      {/* Advanced Filters */}
      {showFilters && (
        <AdvancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClear={clearFilters}
        />
      )}

      {/* Search and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              
              {/* Autocomplete Results */}
              {autocompleteResults.length > 0 && searchQuery && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto">
                  <CardContent className="p-2">
                    {autocompleteResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => setSearchQuery(result.name)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={result.thumbnail_image} />
                          <AvatarFallback>{result.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{result.name}</p>
                          <p className="text-xs text-muted-foreground">{result.sku}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {result.stock_quantity}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {selectedProducts.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkEditDialog(true)}
                    disabled={isBulkUpdating}
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    تحديث مجمع ({selectedProducts.size})
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    إلغاء التحديد
                  </Button>
                </>
              )}

              <Button variant="outline" size="sm" onClick={selectAllProducts}>
                تحديد الكل
              </Button>

              <Separator orientation="vertical" className="h-8" />

              <div className="flex items-center space-x-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Display */}
      <div className="min-h-[600px]" ref={containerRef}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="h-[600px]">
            {viewMode === 'grid' ? (
              <VirtualGrid
                ref={gridRef}
                columnCount={4}
                columnWidth={ITEM_WIDTH}
                height={600}
                rowCount={Math.ceil(products.length / 4)}
                rowHeight={ITEM_HEIGHT}
                width={1200}
                onScroll={({ scrollTop }: any) => {
                  const scrollHeight = Math.ceil(products.length / 4) * ITEM_HEIGHT;
                  handleScroll(scrollTop, scrollHeight, 600);
                }}
              >
                {renderGridItem}
              </VirtualGrid>
            ) : (
              <VirtualList
                ref={listRef}
                height={600}
                itemCount={products.length + (hasMore ? 1 : 0)}
                itemSize={ITEM_HEIGHT}
                onScroll={({ scrollOffset }: any) => {
                  const scrollHeight = (products.length + (hasMore ? 1 : 0)) * ITEM_HEIGHT;
                  handleScroll(scrollOffset, scrollHeight, 600);
                }}
              >
                {renderListItem}
              </VirtualList>
            )}
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground text-center">
                لم يتم العثور على منتجات تطابق معايير البحث والفلترة المحددة
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialog} onOpenChange={setBulkEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث مجمع للمخزون</DialogTitle>
            <DialogDescription>
              تحديث كمية {selectedProducts.size} منتج مُحدد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">الكمية الجديدة</label>
              <Input
                type="number"
                placeholder="أدخل الكمية"
                value={bulkQuantity}
                onChange={(e) => setBulkQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">سبب التحديث</label>
              <Select value={bulkReason} onValueChange={setBulkReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_adjustment">تعديل يدوي</SelectItem>
                  <SelectItem value="inventory_count">جرد مخزون</SelectItem>
                  <SelectItem value="damage">تلف</SelectItem>
                  <SelectItem value="return">إرجاع</SelectItem>
                  <SelectItem value="correction">تصحيح</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkUpdateErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="text-sm font-medium text-red-800 mb-2">أخطاء التحديث:</h4>
                <ul className="space-y-1">
                  {bulkUpdateErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600">
                      {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleBulkUpdate} disabled={isBulkUpdating || !bulkQuantity}>
              {isBulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              تحديث المخزون
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Indicator */}
      {requestsCount > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span>الطلبات: {requestsCount}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span>Cache: {cacheHitRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-muted-foreground">
                أداء محسّن • Infinite Scrolling • Virtual Rendering
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InventoryAdvanced;
