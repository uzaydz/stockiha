import { useState, useEffect } from 'react';
import { Product, ProductCategory } from '@/types';
import { Search, Filter, ShoppingCart, Tag, Package, LayoutGrid, ListFilter, Percent, Users } from 'lucide-react';
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

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductCatalog({ products, onAddToCart }: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Extractar categorías únicas de productos
  const categories: string[] = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  
  // Nombres de categorías en árabe
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

  useEffect(() => {
    // Filtrar productos por búsqueda y categoría
    let filtered = products;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
      );
    }
    
    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const handleProductClick = (product: Product) => {
    if (product.stockQuantity > 0) {
      onAddToCart(product);
    }
  };

  // Helper function to render wholesale pricing badges
  const renderWholesaleBadges = (product: Product) => {
    return (
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {product.allow_wholesale && product.wholesale_price !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-blue-500/90 text-white border-blue-600">
                  <Users className="h-3 w-3 mr-1" />
                  جملة
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">سعر الجملة: {formatPrice(product.wholesale_price ?? 0)}</p>
                <p className="text-xs">الحد الأدنى: {product.min_wholesale_quantity} قطعة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {product.allow_partial_wholesale && product.partial_wholesale_price !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-cyan-500/90 text-white border-cyan-600">
                  <Users className="h-3 w-3 mr-1" />
                  ج.جزئية
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">سعر الجملة الجزئية: {formatPrice(product.partial_wholesale_price ?? 0)}</p>
                <p className="text-xs">الحد الأدنى: {product.min_partial_wholesale_quantity} قطعة</p>
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-card to-background rounded-lg border shadow-md overflow-hidden">
      {/* Barra de búsqueda y filtros */}
      <div className="bg-card/95 backdrop-blur-sm p-3 mb-1 shadow-sm border-b">
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
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("flex-shrink-0 shadow-sm", showFilters && "bg-primary/10 text-primary border-primary/50")}
          >
            <ListFilter className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex-shrink-0 shadow-sm"
          >
            {viewMode === 'grid' ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <ListFilter className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {showFilters && (
          <div className="pt-1 pb-1">
            <Tabs defaultValue="all" value={selectedCategory} className="w-full" onValueChange={setSelectedCategory}>
              <ScrollArea className="max-w-full">
                <TabsList className="flex flex-nowrap overflow-auto bg-background/40 shadow-sm">
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
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Sección de información */}
      <div className="bg-muted/30 px-4 py-2 flex items-center justify-between text-sm border-b">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary/70" />
          <span>المنتجات: {filteredProducts.length}</span>
        </div>
        <div className="text-muted-foreground">
          {selectedCategory !== 'all' && (
            <Badge variant="outline" className="mr-2 bg-background shadow-sm border-primary/20">
              {categoryNames[selectedCategory] || selectedCategory}
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="outline" className="bg-background shadow-sm border-primary/20">
              بحث: {searchQuery}
            </Badge>
          )}
        </div>
      </div>

      {/* Catálogo de productos */}
      <ScrollArea className="flex-1">
        {filteredProducts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-20" />
            <p>لم يتم العثور على منتجات</p>
            <Button 
              variant="link" 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              إعادة ضبط الفلتر
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={cn(
                  "rounded-md border overflow-hidden transition-all hover:shadow-md relative group",
                  product.stockQuantity > 0 
                    ? "hover:border-primary/50 cursor-pointer bg-card hover:translate-y-[-2px]" 
                    : "opacity-70 bg-muted/40 border-muted"
                )}
                onClick={() => handleProductClick(product)}
              >
                <div className="relative aspect-square bg-white">
                  <img
                    src={product.thumbnailImage || '/placeholder-product.svg'}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                  
                  {product.stockQuantity <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-sm font-medium px-2 py-1 bg-black/50 rounded">نفذت الكمية</span>
                    </div>
                  )}
                  
                  {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                    <Badge variant="destructive" className="absolute top-2 right-2 shadow-sm">
                      الكمية {product.stockQuantity}
                    </Badge>
                  )}
                  
                  {/* Render wholesale badges */}
                  {renderWholesaleBadges(product)}
                  
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-sm font-medium flex items-center shadow-sm">
                      <Percent className="h-3 w-3 mr-0.5" />
                      {Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                    </div>
                  )}
                  
                  {product.stockQuantity > 0 && (
                    <Button 
                      size="icon" 
                      variant="secondary"
                      className="absolute bottom-2 left-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 bg-primary text-primary-foreground transition-opacity shadow-md"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium line-clamp-1">{product.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-primary font-bold">{formatPrice(product.price)}</span>
                    {product.compareAtPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>
                  {(product.wholesale_price !== undefined || product.partial_wholesale_price !== undefined) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {product.wholesale_price !== undefined && (
                        <span className="mr-1">جملة: {formatPrice(product.wholesale_price)}</span>
                      )}
                      {product.partial_wholesale_price !== undefined && (
                        <span>ج.جزئية: {formatPrice(product.partial_wholesale_price)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id}
                className={cn(
                  "overflow-hidden transition-all border",
                  product.stockQuantity > 0 
                    ? "hover:border-primary/50 cursor-pointer hover:shadow-md hover:translate-y-[-2px]" 
                    : "opacity-70 bg-muted/40 border-muted"
                )}
                onClick={() => handleProductClick(product)}
              >
                <CardContent className="p-0">
                  <div className="flex gap-3 p-3">
                    <div className="w-16 h-16 xs:w-20 xs:h-20 rounded-md overflow-hidden flex-shrink-0 bg-white border shadow-sm">
                      <img
                        src={product.thumbnailImage || '/placeholder-product.svg'}
                        alt={product.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h3 className="font-medium line-clamp-1 text-sm sm:text-base">{product.name}</h3>
                        <Badge variant="outline" className="mr-2 h-6 bg-primary/10 text-primary border-primary/30">
                          {product.stockQuantity > 0 ? `المخزون: ${product.stockQuantity}` : 'نفذت الكمية'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.description}</p>
                      <div className="flex flex-wrap items-center justify-between mt-2">
                        <div>
                          <span className="text-primary font-bold text-sm">{formatPrice(product.price)}</span>
                          {product.compareAtPrice && (
                            <span className="text-xs text-muted-foreground line-through ml-2">
                              {formatPrice(product.compareAtPrice)}
                            </span>
                          )}
                          {(product.wholesale_price !== undefined || product.partial_wholesale_price !== undefined) && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {product.wholesale_price !== undefined && (
                                <span className="mr-1">جملة: {formatPrice(product.wholesale_price)}</span>
                              )}
                              {product.partial_wholesale_price !== undefined && (
                                <span>ج.جزئية: {formatPrice(product.partial_wholesale_price)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {product.allow_wholesale && (
                            <Badge variant="outline" className="bg-blue-500/90 text-white border-blue-600 text-xs h-6">
                              <Users className="h-3 w-3 mr-1" />
                              جملة
                            </Badge>
                          )}
                          {product.isDigital && (
                            <Badge variant="outline" className="bg-background text-xs h-6">
                              رقمي
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 