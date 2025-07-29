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
  SortDesc,
  Sparkles,
  TrendingUp,
  Zap,
  Heart,
  Tag,
  ShoppingBag,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

interface POSAdvancedContentProps {
  products: Product[];
  subscriptions: any[];
  subscriptionCategories: any[];
  productCategories: any[]; // ✅ إضافة productCategories
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
  productCategories, // ✅ إضافة productCategories
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
                             product.category_id === selectedCategory ||
                             (product as any).categoryId === selectedCategory ||
                             (product as any).product_category_id === selectedCategory;

      // تصفية المخزون
      const matchesStock = (() => {
        if (stockFilter === 'all') return true;
        const stock = product.stock_quantity || 0;
        const lowStockThreshold = (product as any).low_stock_threshold || 10;
        
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
          const categoryA = (a.category as any)?.name || (a as any).category_name || '';
          const categoryB = (b.category as any)?.name || (b as any).category_name || '';
          comparison = categoryA.localeCompare(categoryB, 'ar');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy, sortOrder]);

  // استخراج الفئات المتاحة - باستخدام productCategories الفعلية
  const availableCategories = useMemo(() => {
    // أولاً: استخدم productCategories إذا كانت متوفرة
    if (productCategories && productCategories.length > 0) {
      return productCategories.map((cat: any) => ({
        id: cat.id || cat.category_id,
        name: cat.name || cat.category_name || `فئة ${cat.id || cat.category_id}`
      }));
    }
    
    // ثانياً: استخرج الفئات المتاحة من المنتجات الموجودة
    const categoriesFromProducts = products
      .filter(p => {
        const hasCategory = p.category_id || (p as any).categoryId || (p as any).product_category_id;
        return hasCategory;
      })
      .map(p => {
        const categoryId = p.category_id || (p as any).categoryId || (p as any).product_category_id;
        
        // جرب العثور على اسم الفئة من مصادر مختلفة
        let categoryName = '';
        
        if ((p as any).category_name) {
          categoryName = (p as any).category_name;
        } else if (p.category && typeof p.category === 'object' && (p.category as any).name) {
          categoryName = (p.category as any).name;
        } else if ((p as any).product_category && typeof (p as any).product_category === 'object' && (p as any).product_category.name) {
          categoryName = (p as any).product_category.name;
        } else if (subscriptionCategories) {
          // ابحث في subscriptionCategories (هذا للتوافق مع البيانات القديمة)
          const foundCategory = subscriptionCategories.find((cat: any) => 
            cat.id === categoryId || cat.category_id === categoryId
          );
          if (foundCategory) {
            categoryName = foundCategory.name || foundCategory.category_name;
          }
        }
        
        return { 
          id: categoryId, 
          name: categoryName || `فئة ${categoryId}` 
        };
      })
      .filter(category => category.id) // تأكد من وجود معرف
      .filter((category, index, self) => 
        index === self.findIndex(c => c.id === category.id)
      );

    return categoriesFromProducts;
  }, [products, productCategories, subscriptionCategories]);

  // مكون عرض المنتج في الشبكة - محسن وعصري
  const ProductGridItem = React.memo(({ product }: { product: Product }) => {
    const stock = product.stock_quantity || 0;
    const lowStockThreshold = 10;
    const isLowStock = stock > 0 && stock <= lowStockThreshold;
    const isOutOfStock = stock === 0;
    const isFavorite = favoriteProducts.some(fav => fav.id === product.id);

    const handleClick = useCallback(() => {
      onAddToCart(product);
    }, [product]);

    const imageUrl = product.thumbnailImage || (product.images && product.images[0]);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card className={cn(
          "group cursor-pointer transition-all duration-300 overflow-hidden h-full flex flex-col",
          "border-0 shadow-sm hover:shadow-xl",
          isReturnMode 
            ? "ring-2 ring-orange-300 hover:ring-orange-400 bg-gradient-to-br from-orange-50/40 to-orange-100/20 hover:shadow-orange-200/30" 
            : "ring-1 ring-border hover:ring-primary/30 bg-gradient-to-br from-background to-background/80 backdrop-blur-sm hover:shadow-primary/5",
          isOutOfStock && "opacity-60 grayscale-[0.3]",
          isLowStock && !isReturnMode && "ring-yellow-300",
          isLowStock && isReturnMode && "ring-orange-400"
        )}>
          <div onClick={handleClick} className="h-full flex flex-col">
            {/* صورة المنتج مع تحسينات حديثة */}
            <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/80 overflow-hidden">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn(
                "w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/60",
                imageUrl ? 'hidden' : ''
              )}>
                <Package2 className="h-12 w-12 text-muted-foreground/50" />
              </div>
              
              {/* طبقة تفاعلية */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
              
              {/* شارات الحالة المحسنة للتباين */}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                {isFavorite && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center"
                  >
                    <Badge className="bg-yellow-500/95 text-white text-xs backdrop-blur-md border-2 border-yellow-400/30 shadow-2xl ring-1 ring-black/10">
                      <Heart className="h-3 w-3 fill-current" />
                    </Badge>
                  </motion.div>
                )}
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-xs backdrop-blur-md shadow-2xl border-2 border-white/20 dark:border-gray-800/20 ring-1 ring-black/10 dark:ring-white/10">
                    نفد المخزون
                  </Badge>
                )}
                {isLowStock && (
                  <Badge className="bg-yellow-500/95 text-white text-xs backdrop-blur-md shadow-2xl border-2 border-yellow-400/30 ring-1 ring-black/10">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    قليل
                  </Badge>
                )}
              </div>

              {/* مؤشر الإضافة المحسن */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "p-3 rounded-full backdrop-blur-sm border shadow-xl",
                    isReturnMode 
                      ? "bg-orange-500/90 border-orange-400/50 text-white" 
                      : "bg-primary/90 border-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {isReturnMode ? (
                    <RotateCcw className="h-5 w-5 animate-spin" style={{ animationDuration: '2s' }} />
                  ) : (
                    <ShoppingCart className="h-5 w-5" />
                  )}
                </motion.div>
              </div>

              {/* شارة السعر العائمة المحسنة بتباين عالي */}
              <div className="absolute bottom-3 left-3">
                <Badge 
                  className="text-sm font-bold !bg-white/95 dark:!bg-gray-900/95 !text-gray-900 dark:!text-gray-100 backdrop-blur-md shadow-2xl border-2 border-gray-300/50 dark:border-gray-600/50 ring-1 ring-black/20 dark:ring-white/20"
                  style={{ 
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.1)' 
                  }}
                >
                  {product.price?.toLocaleString()} دج
                </Badge>
              </div>
            </div>

            {/* معلومات المنتج المحسنة */}
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                    {product.name}
                  </h3>
                  {((product.category as any)?.name || (product as any).category_name) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {(product.category as any)?.name || (product as any).category_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1",
                      stock > lowStockThreshold 
                        ? "bg-green-100 text-green-700" 
                        : stock > 0 
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    )}>
                      {stock > lowStockThreshold && <CheckCircle className="h-3 w-3" />}
                      {stock <= lowStockThreshold && stock > 0 && <AlertCircle className="h-3 w-3" />}
                      {stock === 0 && <AlertCircle className="h-3 w-3" />}
                      {stock} قطعة
                    </div>
                  </div>

                  {product.has_variants && (
                    <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
                      <Sparkles className="h-3 w-3 mr-1" />
                      متغيرات
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    );
  }, (prevProps, nextProps) => {
    return prevProps.product.id === nextProps.product.id &&
           prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
           prevProps.product.name === nextProps.product.name &&
           prevProps.product.price === nextProps.product.price;
  });

  // مكون عرض المنتج في القائمة
  const ProductListItem = useCallback(({ product }: { product: Product }) => {
    const stock = product.stock_quantity || 0;
    const isOutOfStock = stock === 0;
    const isLowStock = stock > 0 && stock <= ((product as any).low_stock_threshold || 10);
    const isFavorite = favoriteProducts.some(fav => fav.id === product.id);

    return (
      <Card className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-md",
        isReturnMode 
          ? "border-orange-200 hover:border-orange-300 bg-gradient-to-r from-orange-50/30 to-background hover:from-orange-50/50" 
          : "border-border hover:border-primary/30",
        isOutOfStock && "opacity-60"
      )}>
        <CardContent 
          className="p-3"
          onClick={() => onAddToCart(product)}
        >
          <div className="flex items-center gap-3">
            {/* صورة مصغرة */}
            <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                              {((product as any).thumbnail_image || product.thumbnailImage || (product.images && product.images[0])) ? (
                  <img 
                    src={(product as any).thumbnail_image || product.thumbnailImage || (product.images && product.images[0])} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn(
                "w-full h-full flex items-center justify-center",
                                    ((product as any).thumbnail_image || product.thumbnailImage || (product.images && product.images[0])) ? "hidden" : ""
              )}>
                <Package2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* معلومات المنتج */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {(product.category as any)?.name || (product as any).category_name || 'غير محدد'}
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col bg-gradient-to-br from-background to-background/95 min-h-0"
    >
      {/* رأسية حديثة ومينيماليست */}
      <div className="relative overflow-hidden">
        {/* خلفية متدرجة خفيفة */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5" />
        
        <div className="relative p-6 border-b border-border/50 backdrop-blur-sm">
          <div className="space-y-4">
            {/* العنوان الرئيسي مع الأيقونات */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl border transition-all duration-300",
                  isReturnMode 
                    ? "bg-orange-500/20 border-orange-300/50 text-orange-700" 
                    : "bg-primary/10 border-primary/20 text-primary"
                )}>
                  {isReturnMode ? (
                    <RotateCcw className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
                  ) : (
                    <ShoppingBag className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h1 className={cn(
                    "text-xl font-bold transition-all duration-300",
                    isReturnMode ? "text-orange-800" : "text-foreground"
                  )}>
                    {isReturnMode ? (
                      <span className="flex items-center gap-2">
                        🔄 منتجات الإرجاع
                        <Badge className="bg-orange-500 text-white text-xs animate-pulse">
                          وضع نشط
                        </Badge>
                      </span>
                    ) : (
                      'كتالوج المنتجات'
                    )}
                  </h1>
                  <p className={cn(
                    "text-sm transition-all duration-300",
                    isReturnMode ? "text-orange-600/80" : "text-muted-foreground"
                  )}>
                    {isReturnMode 
                      ? `${filteredAndSortedProducts.length} منتج متاح للإرجاع`
                      : `${filteredAndSortedProducts.length} منتج متاح`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshData}
                  disabled={isPOSDataLoading}
                  className="h-9 gap-2 hover:shadow-md transition-all duration-200"
                >
                  <RefreshCw className={cn(
                    "h-4 w-4",
                    isPOSDataLoading && "animate-spin"
                  )} />
                  تحديث
                </Button>
              </div>
            </div>

            {/* شريط البحث الحديث */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                placeholder="🔍 ابحث عن المنتجات بالاسم، الوصف، أو الباركود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 h-12 text-base border-2 focus:border-primary/50 bg-background/60 backdrop-blur-sm placeholder:text-muted-foreground/70"
              />
              {searchQuery && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="h-6 w-6 p-0 hover:bg-muted rounded-full"
                  >
                    ×
                  </Button>
                </motion.div>
              )}
            </div>

            {/* تبويبات عصرية وأدوات التحكم */}
            <div className="flex items-center justify-between">
              {/* تبويبات مع تأثيرات حديثة */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="h-11 bg-muted/50 border border-border/50 p-1">
                  <TabsTrigger 
                    value="products" 
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9 gap-2 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-primary/10">
                        <Package2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="font-medium">المنتجات</span>
                      <Badge variant="secondary" className="text-xs">
                        {filteredAndSortedProducts.length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  {isAppEnabled('subscription-services') && (
                    <TabsTrigger 
                      value="subscriptions" 
                      className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-9 gap-2 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-primary/10">
                          <CreditCard className="h-3 w-3 text-primary" />
                        </div>
                        <span className="font-medium">الاشتراكات</span>
                        <Badge variant="secondary" className="text-xs">
                          {subscriptions.length}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>

              {/* أدوات التحكم الحديثة */}
              <div className="flex items-center gap-2">
                {/* تصفية الفئات */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-36 h-10 bg-background/60 border-border/50 hover:bg-background transition-colors">
                    <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        جميع الفئات
                      </div>
                    </SelectItem>
                    {availableCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* تصفية المخزون */}
                <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as any)}>
                  <SelectTrigger className="w-32 h-10 bg-background/60 border-border/50 hover:bg-background transition-colors">
                    <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="instock">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        متوفر
                      </div>
                    </SelectItem>
                    <SelectItem value="lowstock">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        منخفض
                      </div>
                    </SelectItem>
                    <SelectItem value="outofstock">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        نفد
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* ترتيب */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-10 px-3 bg-background/60 border-border/50 hover:bg-background transition-colors gap-2"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      ترتيب
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* وضع العرض */}
                <div className="flex rounded-lg border border-border/50 bg-background/60 p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "h-8 px-3 transition-all duration-200",
                      viewMode === 'grid' && "shadow-sm"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "h-8 px-3 transition-all duration-200",
                      viewMode === 'list' && "shadow-sm"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} className="h-full flex flex-col">
          {/* تبويب المنتجات */}
          <TabsContent value="products" className="flex-1 mt-0 min-h-0">
            <ScrollArea className="h-full w-full">
              <div className="p-4 pb-20">
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
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, staggerChildren: 0.1 }}
                    className={cn(
                      "gap-4",
                      viewMode === 'grid' 
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                        : "space-y-3"
                    )}
                  >
                    {filteredAndSortedProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="group relative overflow-hidden ring-1 ring-border hover:ring-primary/30 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                              onClick={() => onAddToCart(product)}>
                          <div className="aspect-square relative">
                            {(() => {
                              // البحث عن صورة صالحة من مصادر مختلفة
                              const imageUrl = product.thumbnailImage || 
                                               (product.images && product.images.length > 0 && product.images[0]) ||
                                               (product as any).thumbnail_image ||
                                               (product as any).image ||
                                               (product as any).image_url;
                              
                              return imageUrl ? (
                                <img 
                                  src={imageUrl} 
                                  alt={product.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  onError={(e) => {
                                    // في حالة فشل تحميل الصورة، جرب صورة أخرى أو أخفي الصورة
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                                  <Package2 className="h-8 w-8 text-primary/40" />
                                </div>
                              );
                            })()}
                            
                            {/* شارة المخزون المحسنة */}
                            <Badge 
                              variant={product.stock_quantity > 10 ? "default" : product.stock_quantity > 0 ? "secondary" : "destructive"}
                              className="absolute top-2 right-2 text-xs backdrop-blur-md shadow-lg border border-white/30 dark:border-gray-800/30 font-medium"
                            >
                              {product.stock_quantity > 10 ? "متوفر" : product.stock_quantity > 0 ? "قليل" : "نفد"}
                            </Badge>

                            {/* مؤشر الإضافة */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                                  <Plus className="h-5 w-5" />
                                </div>
                              </div>
                            </div>

                            {/* شارة السعر العائمة المحسنة بتباين عالي */}
                            <div className="absolute bottom-2 left-2">
                              <Badge 
                                className="!bg-white/95 dark:!bg-gray-900/95 !text-gray-900 dark:!text-gray-100 backdrop-blur-md shadow-2xl border-2 border-gray-300/50 dark:border-gray-600/50 ring-1 ring-black/20 dark:ring-white/20 font-bold"
                                style={{ 
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)', 
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.1)' 
                                }}
                              >
                                {product.price?.toLocaleString()} دج
                              </Badge>
                            </div>
                          </div>

                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <h3 className="font-medium text-sm leading-tight line-clamp-2">
                                {product.name}
                              </h3>
                              
                              {(product as any).category_name && (
                                <Badge variant="outline" className="text-xs">
                                  {(product as any).category_name}
                                </Badge>
                              )}

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  المخزون: {product.stock_quantity}
                                </span>
                                <Heart className="h-4 w-4 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* تبويب الاشتراكات */}
          {isAppEnabled('subscription-services') && (
            <TabsContent value="subscriptions" className="flex-1 mt-0 min-h-0">
              <ScrollArea className="h-full w-full">
                <div className="p-4 pb-20">
                  {!subscriptions || subscriptions.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">لا توجد خدمات اشتراك</h3>
                        <p className="text-muted-foreground">
                          {!subscriptions ? 'جاري تحميل خدمات الاشتراك...' : 'لم يتم العثور على أي خدمات اشتراك متاحة'}
                        </p>

                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subscriptions.map((subscription: any) => (
                        <Card 
                          key={subscription.id}
                          className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                          onClick={() => onAddSubscription(subscription)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{subscription.name || subscription.service_name || 'خدمة غير محددة'}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                {subscription.description || 'لا يوجد وصف'}
                              </p>
                              <div className="text-sm font-bold text-primary">
                                {(subscription.price || subscription.selling_price || subscription.purchase_price || 0).toLocaleString()} دج
                              </div>
                              {subscription.category_name && (
                                <Badge variant="outline" className="text-xs">
                                  {subscription.category_name}
                                </Badge>
                              )}
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
    </motion.div>
  );
};

export default POSAdvancedContent;
