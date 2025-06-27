import React, { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInventoryAdvanced } from '@/hooks/useInventoryAdvanced';
import ProductInventoryDetails from './ProductInventoryDetails';
import {
  Search,
  Filter,
  Grid3X3,
  List as ListIcon,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit3,
  Download,
  RefreshCw,
  Loader2,
  SortAsc,
  SortDesc,
  Palette,
  Ruler,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InventoryAdvancedListProps {
  initialSearchTerm?: string;
  onProductSelect?: (productId: string) => void;
  showActions?: boolean;
  compactMode?: boolean;
}

const InventoryAdvancedList: React.FC<InventoryAdvancedListProps> = ({
  initialSearchTerm = '',
  onProductSelect,
  showActions = true,
  compactMode = false
}) => {
  const {
    products,
    stats,
    computedStats,
    isLoading,
    error,
    hasMore,
    currentPage,
    totalPages,
    setSearchQuery,
    loadMore,
    setFilters,
    refresh,
    exportData,
    clearError
  } = useInventoryAdvanced({
    initialPageSize: 50
  });

  // حالة العرض
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showProductDetails, setShowProductDetails] = useState<string | null>(null);

  // خيارات الفلترة
  const [filterState, setFilterState] = useState({
    stockStatus: 'all',
    category: '',
    hasVariants: 'all',
    priceRange: { min: '', max: '' },
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  // البحث الأولي
  useEffect(() => {
    if (initialSearchTerm) {
      setSearchQuery(initialSearchTerm);
    }
  }, [initialSearchTerm, setSearchQuery]);

  // تطبيق الفلاتر
  const applyFilters = useCallback(() => {
    const newFilters: any = {
      sort_by: filterState.sortBy,
      sort_order: filterState.sortOrder
    };

    if (filterState.stockStatus !== 'all') {
      newFilters.stock_status = filterState.stockStatus;
    }

    if (filterState.category) {
      newFilters.category_id = filterState.category;
    }

    if (filterState.hasVariants !== 'all') {
      newFilters.has_variants = filterState.hasVariants === 'yes';
    }

    if (filterState.priceRange.min) {
      newFilters.min_price = parseFloat(filterState.priceRange.min);
    }

    if (filterState.priceRange.max) {
      newFilters.max_price = parseFloat(filterState.priceRange.max);
    }

    setFilters(newFilters);
  }, [filterState, setFilters]);

  // البحث مع التأخير
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    const timer = setTimeout(() => {
      setSearchQuery(value);
    }, 300);

    setSearchTimer(timer);
  }, [searchTimer, setSearchQuery]);

  // تنظيف Timer عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  // معالجة تحديد المنتجات
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const selectAllProducts = useCallback(() => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  }, [products, selectedProducts.size]);

  // مكون بطاقة المنتج
  const ProductCard: React.FC<{ product: any; index?: number }> = ({ product }) => {
    const isSelected = selectedProducts.has(product.id);
    
    return (
      <Card className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        compactMode && "p-2"
      )}>
        <CardContent className={cn("p-4", compactMode && "p-3")}>
          {/* رأس البطاقة */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleProductSelection(product.id)}
                className="mt-1"
              />
              
              {product.image_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="min-w-0 flex-1">
                <h3 className={cn(
                  "font-medium truncate",
                  compactMode ? "text-sm" : "text-base"
                )}>
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  SKU: {product.sku}
                  {product.barcode && ` • ${product.barcode}`}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  product.stock_status === 'in-stock' && "border-green-500 text-green-700",
                  product.stock_status === 'low-stock' && "border-yellow-500 text-yellow-700",
                  product.stock_status === 'out-of-stock' && "border-red-500 text-red-700"
                )}
              >
                {product.stock_status === 'in-stock' && <CheckCircle className="w-3 h-3 mr-1" />}
                {product.stock_status === 'low-stock' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {product.stock_status === 'out-of-stock' && <XCircle className="w-3 h-3 mr-1" />}
                {product.stock_status_text || product.stock_status}
              </Badge>
            </div>
          </div>

          {/* معلومات المخزون */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className={cn(
                "font-bold text-primary",
                compactMode ? "text-lg" : "text-xl"
              )}>
                {product.stock_quantity || 0}
              </div>
              <div className="text-xs text-muted-foreground">إجمالي</div>
            </div>
            
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className={cn(
                "font-bold text-blue-600",
                compactMode ? "text-lg" : "text-xl"
              )}>
                {product.variants_count || 1}
              </div>
              <div className="text-xs text-muted-foreground">متغيرات</div>
            </div>
            
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className={cn(
                "font-bold text-green-600",
                compactMode ? "text-sm" : "text-base"
              )}>
                {product.price || 0} د.ج
              </div>
              <div className="text-xs text-muted-foreground">السعر</div>
            </div>
          </div>

          {/* المتغيرات السريعة */}
          {product.has_variants && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                {product.use_sizes ? (
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Palette className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {product.use_sizes ? 'ألوان ومقاسات' : 'ألوان فقط'}
                </span>
              </div>
              
              {product.colors_preview && (
                <div className="flex gap-1 flex-wrap">
                  {product.colors_preview.slice(0, 5).map((color: any, index: number) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color.color_code }}
                      title={color.color_name}
                    />
                  ))}
                  {product.colors_preview.length > 5 && (
                    <div className="w-4 h-4 rounded-full bg-muted border border-gray-300 flex items-center justify-center">
                      <span className="text-xs">+{product.colors_preview.length - 5}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* الإجراءات */}
          {showActions && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowProductDetails(product.id)}
              >
                <Eye className="w-3 h-3 mr-1" />
                عرض
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onProductSelect?.(product.id)}
              >
                <Edit3 className="w-3 h-3" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40" align="end">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => onProductSelect?.(product.id)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      فتح في صفحة جديدة
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // مكون العنصر في القائمة
  const ListItem: React.FC<{ index: number; style: any }> = ({ index, style }) => {
    const product = products[index];
    
    if (!product) {
      return (
        <div style={style} className="p-2">
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    return (
      <div style={style} className="p-2">
        <ProductCard product={product} index={index} />
      </div>
    );
  };

  // مكون الفلاتر
  const FiltersPanel = () => (
    <Sheet open={showFilters} onOpenChange={setShowFilters}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            فلترة المنتجات
          </SheetTitle>
          <SheetDescription>
            قم بتخصيص عرض المنتجات حسب احتياجاتك
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* حالة المخزون */}
          <div className="space-y-2">
            <Label>حالة المخزون</Label>
            <Select
              value={filterState.stockStatus}
              onValueChange={(value) => setFilterState(prev => ({ ...prev, stockStatus: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="in-stock">متوفر</SelectItem>
                <SelectItem value="low-stock">منخفض</SelectItem>
                <SelectItem value="out-of-stock">نفذ المخزون</SelectItem>
                <SelectItem value="reorder-needed">يحتاج إعادة طلب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* المتغيرات */}
          <div className="space-y-2">
            <Label>المتغيرات</Label>
            <Select
              value={filterState.hasVariants}
              onValueChange={(value) => setFilterState(prev => ({ ...prev, hasVariants: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="yes">مع متغيرات</SelectItem>
                <SelectItem value="no">بدون متغيرات</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* نطاق السعر */}
          <div className="space-y-2">
            <Label>نطاق السعر (د.ج)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="من"
                type="number"
                value={filterState.priceRange.min}
                onChange={(e) => setFilterState(prev => ({
                  ...prev,
                  priceRange: { ...prev.priceRange, min: e.target.value }
                }))}
              />
              <Input
                placeholder="إلى"
                type="number"
                value={filterState.priceRange.max}
                onChange={(e) => setFilterState(prev => ({
                  ...prev,
                  priceRange: { ...prev.priceRange, max: e.target.value }
                }))}
              />
            </div>
          </div>

          {/* الترتيب */}
          <div className="space-y-2">
            <Label>ترتيب حسب</Label>
            <div className="flex gap-2">
              <Select
                value={filterState.sortBy}
                onValueChange={(value) => setFilterState(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">الاسم</SelectItem>
                  <SelectItem value="sku">SKU</SelectItem>
                  <SelectItem value="price">السعر</SelectItem>
                  <SelectItem value="stock">المخزون</SelectItem>
                  <SelectItem value="created_at">تاريخ الإنشاء</SelectItem>
                  <SelectItem value="updated_at">آخر تحديث</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterState(prev => ({
                  ...prev,
                  sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                }))}
              >
                {filterState.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={applyFilters} className="flex-1">
              تطبيق الفلاتر
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterState({
                  stockStatus: 'all',
                  category: '',
                  hasVariants: 'all',
                  priceRange: { min: '', max: '' },
                  sortBy: 'name',
                  sortOrder: 'asc'
                });
              }}
            >
              إعادة تعيين
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={clearError}>
              إغلاق
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* شريط البحث والأدوات */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في المنتجات... (الاسم، SKU، الباركود)"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {/* تبديل طريقة العرض */}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* الفلاتر */}
          <Button variant="outline" size="sm" onClick={() => setShowFilters(true)}>
            <Filter className="w-4 h-4 mr-1" />
            فلترة
          </Button>

          {/* تحديث */}
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>

          {/* تصدير */}
          <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
            <Download className="w-4 h-4 mr-1" />
            تصدير
          </Button>
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      {(stats || computedStats) && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats?.total_products || (computedStats ? computedStats.inStock + computedStats.lowStock + computedStats.outOfStock : 0)}
              </div>
              <div className="text-xs text-muted-foreground">إجمالي المنتجات</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.in_stock_products || computedStats?.inStock || 0}
              </div>
              <div className="text-xs text-muted-foreground">متوفر</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.low_stock_products || computedStats?.lowStock || 0}
              </div>
              <div className="text-xs text-muted-foreground">منخفض</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats?.out_of_stock_products || computedStats?.outOfStock || 0}
              </div>
              <div className="text-xs text-muted-foreground">نفذ المخزون</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.products_with_variants || 0}
              </div>
              <div className="text-xs text-muted-foreground">مع متغيرات</div>
            </div>
          </Card>
        </div>
      )}

      {/* شريط الإجراءات المجمعة */}
      {selectedProducts.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                تم تحديد {selectedProducts.size} منتج
              </span>
              <Button variant="outline" size="sm" onClick={selectAllProducts}>
                {selectedProducts.size === products.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                تصدير المحدد
              </Button>
              <Button size="sm" variant="outline">
                تعديل مجمع
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* قائمة المنتجات */}
      <Card>
        <CardContent className="p-0">
          {isLoading && products.length === 0 ? (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground">جرب تغيير معايير البحث أو الفلترة</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[600px]">
              <List
                height={600}
                width="100%"
                itemCount={products.length}
                itemSize={200}
                overscanCount={5}
              >
                {ListItem}
              </List>
            </div>
          )}

          {/* زر تحميل المزيد */}
          {hasMore && !isLoading && (
            <div className="p-4 text-center border-t">
              <Button onClick={loadMore} variant="outline" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                تحميل المزيد ({currentPage} من {totalPages})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <FiltersPanel />

      {/* تفاصيل المنتج */}
      {showProductDetails && (
        <ProductInventoryDetails
          productId={showProductDetails}
          onClose={() => setShowProductDetails(null)}
          showInModal={true}
        />
      )}
    </div>
  );
};

export default InventoryAdvancedList; 