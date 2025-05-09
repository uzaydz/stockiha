import { useState, useEffect } from 'react';
import { Product, ProductCategory } from '@/types';
import { Search, Filter, ShoppingCart, Tag, Package, LayoutGrid, ListFilter, Percent, Users, Plus, ArrowUpDown, Layers, Grid3X3, Grid2X2, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductCatalog({ products, onAddToCart }: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [sortOption, setSortOption] = useState<'name' | 'price-asc' | 'price-desc' | 'stock'>('name');

  // استخراج الفئات الفريدة للمنتجات
  const categories: string[] = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  
  // أسماء الفئات بالعربية
  const categoryNames: Record<string, string> = {
    'all': 'الكل',
    'consoles': 'أجهزة',
    'accessories': 'إكسسوارات',
    'games_physical': 'ألعاب فيزيائية',
    'games_digital': 'ألعاب رقمية',
    'controllers': 'وحدات تحكم',
    'components': 'قطع غيار',
    'merchandise': 'منتجات تذكارية'
  };

  // تصفية وفرز المنتجات
  useEffect(() => {
    let filtered = products;
    
    // تصفية حسب الفئة
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // تصفية حسب البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
      );
    }
    
    // فرز المنتجات حسب الخيار المحدد
    filtered = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'stock':
          return b.stockQuantity - a.stockQuantity;
        default:
          return 0;
      }
    });
    
    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, sortOption]);

  const handleProductClick = (product: Product) => {
    if (product.stockQuantity > 0) {
      onAddToCart(product);
    }
  };

  // دالة مساعدة لعرض شارات أسعار الجملة
  const renderWholesaleBadges = (product: Product) => {
    return (
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {(product as any).allow_wholesale && (product as any).wholesale_price !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-blue-500/90 text-white border-blue-600">
                  <Users className="h-3 w-3 mr-1" />
                  جملة
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">سعر الجملة: {formatPrice((product as any).wholesale_price ?? 0)}</p>
                <p className="text-xs">الحد الأدنى: {(product as any).min_wholesale_quantity} قطعة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {(product as any).allow_partial_wholesale && (product as any).partial_wholesale_price !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-cyan-500/90 text-white border-cyan-600">
                  <Users className="h-3 w-3 mr-1" />
                  ج.جزئية
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">سعر الجملة الجزئية: {formatPrice((product as any).partial_wholesale_price ?? 0)}</p>
                <p className="text-xs">الحد الأدنى: {(product as any).min_partial_wholesale_quantity} قطعة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {product.isDigital && (
          <Badge variant="secondary" className="shadow-sm">
            رقمي
          </Badge>
        )}
      </div>
    );
  };

  // دالة مساعدة لعرض زر إضافة للسلة
  const renderAddToCartButton = (product: Product) => {
    if (product.stockQuantity <= 0) return null;
    
    return (
      <Button 
        size="sm" 
        variant="ghost" 
        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-full w-8 h-8 p-0 shadow-md"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(product);
        }}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">إضافة إلى السلة</span>
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-card/50 to-background/50 rounded-lg border shadow-md overflow-hidden">
      {/* شريط البحث والفلترة */}
      <div className="bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-sm p-3 border-b sticky top-0 z-10">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="بحث عن منتج، باركود، SKU..."
              className="pl-9 w-full border-primary/20 focus:border-primary shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* زر ترتيب المنتجات */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    // تبديل بين خيارات الترتيب
                    const options: ('name' | 'price-asc' | 'price-desc' | 'stock')[] = ['name', 'price-asc', 'price-desc', 'stock'];
                    const currentIndex = options.indexOf(sortOption);
                    const nextIndex = (currentIndex + 1) % options.length;
                    setSortOption(options[nextIndex]);
                  }}
                  className="flex-shrink-0 shadow-sm"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {sortOption === 'name' && 'ترتيب: الاسم'}
                  {sortOption === 'price-asc' && 'ترتيب: السعر (تصاعدي)'}
                  {sortOption === 'price-desc' && 'ترتيب: السعر (تنازلي)'}
                  {sortOption === 'stock' && 'ترتيب: المخزون'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* زر إظهار/إخفاء الفلاتر */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("flex-shrink-0 shadow-sm", showFilters && "bg-primary/10 text-primary border-primary/50")}
          >
            <Filter className="h-4 w-4" />
          </Button>
          
          {/* زر تغيير طريقة العرض */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              // تبديل بين طرق العرض الثلاثة
              if (viewMode === 'grid') setViewMode('compact');
              else if (viewMode === 'compact') setViewMode('list');
              else setViewMode('grid');
            }}
            className="flex-shrink-0 shadow-sm"
          >
            {viewMode === 'grid' && <Grid3X3 className="h-4 w-4" />}
            {viewMode === 'compact' && <Grid2X2 className="h-4 w-4" />}
            {viewMode === 'list' && <List className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* علامات تبويب الفئات */}
        {showFilters && (
          <motion.div 
            className="pt-1 pb-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Tabs defaultValue="all" value={selectedCategory} className="w-full" onValueChange={setSelectedCategory}>
              <ScrollArea className="max-w-full">
                <TabsList className="flex flex-nowrap overflow-auto bg-background/40 shadow-sm rounded-md">
                  {categories.map(category => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="whitespace-nowrap flex items-center gap-1"
                    >
                      {category === 'all' ? <Package className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
                      {categoryNames[category] || category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </Tabs>
          </motion.div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* قسم المعلومات */}
      <div className="bg-gradient-to-r from-muted/30 to-muted/10 px-4 py-2 flex items-center justify-between text-sm border-b sticky top-[68px] z-10">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary/70" />
          <span>المنتجات: {filteredProducts.length}</span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2">
          {selectedCategory !== 'all' && (
            <Badge variant="outline" className="bg-background/80 shadow-sm border-primary/20">
              {categoryNames[selectedCategory] || selectedCategory}
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="outline" className="bg-background/80 shadow-sm border-primary/20">
              بحث: {searchQuery}
            </Badge>
          )}
        </div>
      </div>

      {/* كتالوج المنتجات */}
      <ScrollArea className="flex-1">
        {filteredProducts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground p-6">
            <Package className="h-12 w-12 mb-2 opacity-20" />
            <p className="mb-2">لم يتم العثور على منتجات</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="bg-background/80"
            >
              إعادة ضبط الفلتر
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-xl border overflow-hidden transition-all hover:shadow-lg relative group",
                  product.stockQuantity > 0 
                    ? "hover:border-primary/50 cursor-pointer bg-card hover:translate-y-[-2px]" 
                    : "opacity-70 bg-muted/40 border-muted"
                )}
                onClick={() => handleProductClick(product)}
              >
                <div className="relative aspect-square bg-gradient-to-br from-white to-gray-50">
                  <img
                    src={product.thumbnailImage || '/placeholder-product.svg'}
                    alt={product.name}
                    className="object-contain w-full h-full p-2"
                  />
                  
                  {product.stockQuantity <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white text-sm font-medium px-3 py-1.5 bg-black/70 rounded-full">نفذت الكمية</span>
                    </div>
                  )}
                  
                  {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                    <Badge variant="destructive" className="absolute top-2 right-2 shadow-md px-2 py-1">
                      الكمية {product.stockQuantity}
                    </Badge>
                  )}
                  
                  {/* عرض شارات الجملة */}
                  {renderWholesaleBadges(product)}
                  
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium flex items-center shadow-md">
                      <Percent className="h-3 w-3 mr-1" />
                      {Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                    </div>
                  )}

                  {/* زر إضافة للسلة */}
                  {renderAddToCartButton(product)}
                </div>
                
                <div className="p-3 border-t bg-card">
                  <h3 className="font-medium text-sm line-clamp-1 mb-1">{product.name}</h3>
                  <div className="flex items-baseline justify-between">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.compareAtPrice)}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs bg-muted/30">
                      {product.sku}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : viewMode === 'compact' ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-4">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "rounded-lg border overflow-hidden transition-all relative group",
                  product.stockQuantity > 0 
                    ? "hover:border-primary/50 cursor-pointer bg-card hover:translate-y-[-1px] hover:shadow" 
                    : "opacity-70 bg-muted/40 border-muted"
                )}
                onClick={() => handleProductClick(product)}
              >
                <div className="relative aspect-square bg-white">
                  <img
                    src={product.thumbnailImage || '/placeholder-product.svg'}
                    alt={product.name}
                    className="object-contain w-full h-full p-1"
                  />
                  
                  {product.stockQuantity <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-medium px-1.5 py-0.5 bg-black/70 rounded">نفذ</span>
                    </div>
                  )}
                  
                  {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                    <Badge variant="destructive" className="absolute top-1 right-1 shadow-sm text-[10px] px-1 py-0">
                      {product.stockQuantity}
                    </Badge>
                  )}
                </div>
                
                <div className="p-2 text-center border-t bg-background/50">
                  <h3 className="text-xs line-clamp-1">{product.name}</h3>
                  <p className="font-semibold text-xs text-primary">{formatPrice(product.price)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-lg border overflow-hidden transition-all hover:shadow flex items-center relative group",
                  product.stockQuantity > 0 
                    ? "hover:border-primary/50 cursor-pointer bg-card" 
                    : "opacity-70 bg-muted/40 border-muted"
                )}
                onClick={() => handleProductClick(product)}
              >
                <div className="relative h-16 w-16 bg-white">
                  <img
                    src={product.thumbnailImage || '/placeholder-product.svg'}
                    alt={product.name}
                    className="object-contain w-full h-full p-1"
                  />
                  
                  {product.stockQuantity <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-medium px-1 py-0.5 bg-black/70 rounded">نفذ</span>
                    </div>
                  )}
                </div>
                
                <div className="p-3 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-sm text-primary">
                          {formatPrice(product.price)}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs bg-muted/30">
                        {product.sku}
                      </Badge>
                      <Badge variant={product.stockQuantity <= 5 ? "destructive" : "secondary"} className="text-xs">
                        المخزون: {product.stockQuantity}
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 