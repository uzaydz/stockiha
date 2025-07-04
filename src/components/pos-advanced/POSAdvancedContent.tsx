import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { useApps } from '@/context/AppsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingCart,
  RotateCcw,
  Search,
  Filter,
  Grid3X3,
  List,
  Package2,
  CreditCard,
  Star,
  Eye,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  RefreshCw,
  SortAsc,
  SortDesc
} from 'lucide-react';

interface POSAdvancedContentProps {
  products: Product[];
  subscriptions: any[];
  subscriptionCategories: any[];
  favoriteProducts: Product[];
  isReturnMode: boolean;
  isLoading: boolean;
  isPOSDataLoading: boolean;
  onAddToCart: (product: Product) => void;
  onAddSubscription: (subscription: any, pricing?: any) => void;
  onRefreshData: () => Promise<void>;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'price' | 'stock' | 'category';
type SortOrder = 'asc' | 'desc';

const POSAdvancedContent: React.FC<POSAdvancedContentProps> = ({
  products,
  subscriptions,
  subscriptionCategories,
  favoriteProducts,
  isReturnMode,
  isLoading,
  isPOSDataLoading,
  onAddToCart,
  onAddSubscription,
  onRefreshData
}) => {
  const { isAppEnabled } = useApps();

  // حالات التصفية والبحث
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>('all');
  const [activeTab, setActiveTab] = useState<'products' | 'subscriptions'>('products');

  // تصفية وترتيب المنتجات
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // تصفية البحث
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // تصفية الفئة
      const matchesCategory = selectedCategory === 'all' || 
                             product.category_id === selectedCategory;

      // تصفية المخزون
      const matchesStock = (() => {
        if (stockFilter === 'all') return true;
        const stock = product.stock_quantity || 0;
        const lowStockThreshold = product.low_stock_threshold || 10;
        
        switch (stockFilter) {
          case 'instock': return stock > lowStockThreshold;
          case 'lowstock': return stock > 0 && stock <= lowStockThreshold;
          case 'outofstock': return stock === 0;
          default: return true;
        }
      })();

      return matchesSearch && matchesCategory && matchesStock;
    });

    // ترتيب المنتجات
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ar');
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'stock':
          comparison = (a.stock_quantity || 0) - (b.stock_quantity || 0);
          break;
        case 'category':
          comparison = (a.category?.name || '').localeCompare(b.category?.name || '', 'ar');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy, sortOrder]);

  // استخراج الفئات المتاحة
  const availableCategories = useMemo(() => {
    const categories = products
      .filter(p => p.category)
      .map(p => ({ id: p.category_id, name: p.category!.name }))
      .filter((category, index, self) => 
        index === self.findIndex(c => c.id === category.id)
      );
    return categories;
  }, [products]);

  // مكون عرض المنتج في الشبكة
  const ProductGridItem = useCallback(({ product }: { product: Product }) => {
    const stock = product.stock_quantity || 0;
    const lowStockThreshold = product.low_stock_threshold || 10;
    const isLowStock = stock > 0 && stock <= lowStockThreshold;
    const isOutOfStock = stock === 0;
    const isFavorite = favoriteProducts.some(fav => fav.id === product.id);

    return (
      <Card className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden",
        "border-l-4",
        isReturnMode ? "border-l-orange-400 hover:border-l-orange-500" : "border-l-primary hover:border-l-primary/80",
        isOutOfStock && "opacity-60",
        isLowStock && "border-l-yellow-400"
      )}>
        <div 
          onClick={() => onAddToCart(product)}
          className="p-0"
        >
          {/* صورة المنتج */}
          <div className="relative h-32 bg-muted">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            
            {/* شارات الحالة */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {isFavorite && (
                <Badge className="bg-yellow-500 text-white text-xs">
                  <Star className="h-3 w-3" />
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs">
                  نفد
                </Badge>
              )}
              {isLowStock && (
                <Badge className="bg-yellow-500 text-white text-xs">
                  قليل
                </Badge>
              )}
            </div>

            {/* مؤشر التصفح */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {isReturnMode ? (
                  <RotateCcw className="h-6 w-6 text-white" />
                ) : (
                  <ShoppingCart className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
          </div>

          {/* معلومات المنتج */}
          <CardContent className="p-3">
            <div className="space-y-2">
              <div>
                <h3 className="font-medium text-sm leading-tight line-clamp-2">
                  {product.name}
                </h3>
                {product.category && (
                  <p className="text-xs text-muted-foreground">
                    {product.category.name}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-primary">
                  {product.price?.toLocaleString()} دج
                </div>
                <div className="text-xs text-muted-foreground">
                  مخزون: {stock}
                </div>
              </div>

              {product.has_variants && (
                <Badge variant="outline" className="text-xs">
                  متغيرات متاحة
                </Badge>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }, [favoriteProducts, isReturnMode, onAddToCart]);

  // مكون عرض المنتج في القائمة
  const ProductListItem = useCallback(({ product }: { product: Product }) => {
    const stock = product.stock_quantity || 0;
    const isOutOfStock = stock === 0;
    const isLowStock = stock > 0 && stock <= (product.low_stock_threshold || 10);
    const isFavorite = favoriteProducts.some(fav => fav.id === product.id);

    return (
      <Card className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-md",
        isOutOfStock && "opacity-60"
      )}>
        <CardContent 
          className="p-3"
          onClick={() => onAddToCart(product)}
        >
          <div className="flex items-center gap-3">
            {/* صورة مصغرة */}
            <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* معلومات المنتج */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {product.category?.name || 'غير محدد'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">
                    {product.price?.toLocaleString()} دج
                  </div>
                  <div className="text-xs text-muted-foreground">
                    مخزون: {stock}
                  </div>
                </div>
              </div>

              {/* شارات الحالة */}
              <div className="flex items-center gap-1 mt-2">
                {isFavorite && (
                  <Badge variant="outline" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    مفضل
                  </Badge>
                )}
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-xs">
                    نفد المخزون
                  </Badge>
                )}
                {isLowStock && (
                  <Badge className="bg-yellow-500 text-white text-xs">
                    مخزون منخفض
                  </Badge>
                )}
                {product.has_variants && (
                  <Badge variant="outline" className="text-xs">
                    متغيرات
                  </Badge>
                )}
              </div>
            </div>

            {/* أيقونة الإضافة */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {isReturnMode ? (
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [favoriteProducts, isReturnMode, onAddToCart]);

  return (
    <div className="h-full flex flex-col">
      {/* شريط البحث والتصفية */}
      <div className="p-4 border-b bg-card/50">
        <div className="space-y-3">
          {/* الصف الأول: البحث والإجراءات */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن المنتجات (الاسم، الوصف، الباركود...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshData}
              disabled={isPOSDataLoading}
              className="h-9"
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                isPOSDataLoading && "animate-spin"
              )} />
              تحديث
            </Button>
          </div>

          {/* الصف الثاني: تبويبات وأدوات العرض */}
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="h-9">
                <TabsTrigger value="products" className="text-sm">
                  <Package2 className="h-4 w-4 mr-2" />
                  المنتجات ({filteredAndSortedProducts.length})
                </TabsTrigger>
                {isAppEnabled('subscription-services') && (
                  <TabsTrigger value="subscriptions" className="text-sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    الاشتراكات ({subscriptions.length})
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {/* تصفية الفئات */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* تصفية المخزون */}
              <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as any)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="المخزون" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المخزون</SelectItem>
                  <SelectItem value="instock">متوفر</SelectItem>
                  <SelectItem value="lowstock">منخفض</SelectItem>
                  <SelectItem value="outofstock">نفد</SelectItem>
                </SelectContent>
              </Select>

              {/* ترتيب */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {setSortBy('name'); setSortOrder('asc');}}>
                    ترتيب أبجدي (أ-ي)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {setSortBy('name'); setSortOrder('desc');}}>
                    ترتيب أبجدي (ي-أ)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {setSortBy('price'); setSortOrder('asc');}}>
                    السعر (منخفض → مرتفع)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {setSortBy('price'); setSortOrder('desc');}}>
                    السعر (مرتفع → منخفض)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {setSortBy('stock'); setSortOrder('desc');}}>
                    المخزون (مرتفع → منخفض)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {setSortBy('stock'); setSortOrder('asc');}}>
                    المخزون (منخفض → مرتفع)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* وضع العرض */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-9 px-3 rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-9 px-3 rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} className="h-full flex flex-col">
          {/* تبويب المنتجات */}
          <TabsContent value="products" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {filteredAndSortedProducts.length === 0 ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <Package2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all' 
                          ? 'لا توجد منتجات مطابقة للتصفية'
                          : 'لا توجد منتجات'
                        }
                      </h3>
                      <p className="text-muted-foreground">
                        {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all'
                          ? 'جرب تغيير معايير البحث أو التصفية'
                          : 'لم يتم العثور على أي منتجات في قاعدة البيانات'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    "gap-4",
                    viewMode === 'grid' 
                      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                      : "space-y-2"
                  )}>
                    {filteredAndSortedProducts.map((product) => (
                      viewMode === 'grid' ? (
                        <ProductGridItem key={product.id} product={product} />
                      ) : (
                        <ProductListItem key={product.id} product={product} />
                      )
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* تبويب الاشتراكات */}
          {isAppEnabled('subscription-services') && (
            <TabsContent value="subscriptions" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {subscriptions.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">لا توجد خدمات اشتراك</h3>
                        <p className="text-muted-foreground">
                          لم يتم العثور على أي خدمات اشتراك متاحة
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subscriptions.map((subscription) => (
                        <Card 
                          key={subscription.id}
                          className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                          onClick={() => onAddSubscription(subscription)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{subscription.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                {subscription.description}
                              </p>
                              <div className="text-sm font-bold text-primary">
                                {subscription.price?.toLocaleString()} دج
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default POSAdvancedContent;
