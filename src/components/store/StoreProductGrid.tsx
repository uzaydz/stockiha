import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, ShoppingCart, Heart, Star, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/api/products';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface StoreProductGridProps {
  products: Product[];
  view: 'grid' | 'list';
  gridColumns: 2 | 3 | 4;
}

const StoreProductGrid = ({
  products,
  view,
  gridColumns
}: StoreProductGridProps) => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<string[]>([]);
  
  const toggleWishlist = (productId: string) => {
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter(id => id !== productId));
      toast.success('تم إزالة المنتج من المفضلة');
    } else {
      setWishlist([...wishlist, productId]);
      toast.success('تم إضافة المنتج للمفضلة');
    }
  };
  
  const buyNow = (product: Product) => {
    navigate(`/products/${product.slug}?buy=true`);
    toast.success(`جاري الانتقال لشراء ${product.name}`);
  };
  
  const viewProduct = (product: Product) => {
    navigate(`/products/${product.slug}`);
  };
  
  // Determine grid columns class
  const getGridClass = () => {
    if (view === 'list') return 'grid-cols-1 gap-4';
    
    switch (gridColumns) {
      case 2:
        return 'grid-cols-1 sm:grid-cols-2 gap-6';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };
  
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-muted/30 p-5 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-muted-foreground/70" />
        </div>
        <h3 className="text-xl font-semibold mt-4">لا توجد منتجات</h3>
        <p className="text-muted-foreground text-center mt-2 max-w-md">
          لم يتم العثور على منتجات تطابق معايير البحث الخاصة بك. يرجى تجربة معايير بحث مختلفة.
        </p>
      </div>
    );
  }
  
  return (
    <div className={cn('grid', getGridClass())}>
      {products.map((product) => (
        view === 'grid' ? (
          <ProductCard 
            key={product.id}
            product={product}
            isWishlisted={wishlist.includes(product.id)}
            onToggleWishlist={() => toggleWishlist(product.id)}
            onBuyNow={() => buyNow(product)}
            onView={() => viewProduct(product)}
          />
        ) : (
          <ProductListItem 
            key={product.id}
            product={product}
            isWishlisted={wishlist.includes(product.id)}
            onToggleWishlist={() => toggleWishlist(product.id)}
            onBuyNow={() => buyNow(product)}
            onView={() => viewProduct(product)}
          />
        )
      ))}
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  onBuyNow: () => void;
  onView: () => void;
}

// Helper function to safely get category name
const getCategoryName = (category: any): string | null => {
  if (!category) return null;
  if (typeof category === 'object' && 'name' in category && typeof category.name === 'string') {
    return category.name;
  }
  return null;
};

const ProductCard = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onBuyNow,
  onView
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if product is on sale
  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  
  // Check if product is new (less than 14 days old)
  const isNew = product.is_new || (
    new Date().getTime() - new Date(product.created_at).getTime() < 14 * 24 * 60 * 60 * 1000
  );
  
  // Check if product is out of stock
  const isOutOfStock = product.stock_quantity <= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="group"
    >
      <Card className="border overflow-hidden h-full transition-all duration-300 hover:shadow-md">
        <div 
          className="relative aspect-square overflow-hidden bg-muted/10"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Product image */}
          <img
            src={product.thumbnail_image}
            alt={product.name}
            className={cn(
              "w-full h-auto transition-all duration-500",
              isHovered ? "scale-110" : "scale-100"
            )}
          />
          
          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isNew && (
              <Badge className="bg-green-500 hover:bg-green-600">جديد</Badge>
            )}
            {isOnSale && (
              <Badge className="bg-red-500 hover:bg-red-600">
                خصم {Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)}%
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="outline" className="bg-background">نفذت الكمية</Badge>
            )}
          </div>
          
          {/* Quick action buttons */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 flex justify-center gap-2 p-3 bg-gradient-to-t from-black/70 to-transparent",
            "opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          )}>
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist();
              }}
            >
              <Heart 
                className={cn(
                  "h-4 w-4", 
                  isWishlisted ? "fill-red-500 text-red-500" : ""
                )} 
              />
              <span className="sr-only">إضافة للمفضلة</span>
            </Button>
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">عرض المنتج</span>
            </Button>
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOutOfStock) onBuyNow();
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">شراء الآن</span>
            </Button>
          </div>
        </div>
        
        {/* Product details */}
        <CardContent className="p-4">
          <div className="space-y-1.5">
            {/* Product category */}
            {getCategoryName(product.category) && (
              <div className="text-xs text-muted-foreground">
                {getCategoryName(product.category)}
              </div>
            )}
            
            {/* Product name */}
            <h3 
              className="font-medium line-clamp-2 hover:text-primary cursor-pointer"
              onClick={onView}
            >
              {product.name}
            </h3>
            
            {/* Product rating */}
            <div className="flex items-center gap-1">
              {Array(5).fill(0).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3.5 w-3.5",
                    i < 4 ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30" 
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground">(4.0)</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex items-center justify-between">
          {/* Price display */}
          <div className="flex items-start gap-1 flex-col">
            <div className="font-semibold">
              {formatPrice(product.price)}
            </div>
            {isOnSale && (
              <div className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price!)}
              </div>
            )}
          </div>
          
          {/* Buy Now button - was Add to cart */}
          <Button
            size="sm"
            variant={isOutOfStock ? "outline" : "default"}
            className={cn(
              isOutOfStock ? "text-muted-foreground" : "",
              "rounded-full px-3"
            )}
            disabled={isOutOfStock}
            onClick={onBuyNow}
          >
            {isOutOfStock ? "نفذت الكمية" : "شراء الآن"} 
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const ProductListItem = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onBuyNow,
  onView
}: ProductCardProps) => {
  // Check if product is on sale
  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  
  // Check if product is new (less than 14 days old)
  const isNew = product.is_new || (
    new Date().getTime() - new Date(product.created_at).getTime() < 14 * 24 * 60 * 60 * 1000
  );
  
  // Check if product is out of stock
  const isOutOfStock = product.stock_quantity <= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border hover:border-primary/50 transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row">
          {/* Product Image */}
          <div className="relative sm:w-1/4 aspect-square bg-muted/10">
            <img
              src={product.thumbnail_image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            
            {/* Badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {isNew && (
                <Badge className="bg-green-500 hover:bg-green-600">جديد</Badge>
              )}
              {isOnSale && (
                <Badge className="bg-red-500 hover:bg-red-600">
                  خصم {Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)}%
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="outline" className="bg-background">نفذت الكمية</Badge>
              )}
            </div>
          </div>
          
          {/* Product Details */}
          <div className="flex flex-col justify-between p-4 sm:p-6 sm:w-3/4">
            <div className="space-y-2">
              {/* Product category and name */}
              <div>
                {getCategoryName(product.category) && (
                  <div className="text-sm text-muted-foreground">
                    {getCategoryName(product.category)}
                  </div>
                )}
                <h3 
                  className="text-lg font-medium hover:text-primary cursor-pointer"
                  onClick={onView}
                >
                  {product.name}
                </h3>
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-1">
                {Array(5).fill(0).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < 4 ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30" 
                    )}
                  />
                ))}
                <span className="text-sm text-muted-foreground">(4.0)</span>
              </div>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
              {/* Price */}
              <div className="flex items-end gap-2">
                <div className="text-xl font-semibold">
                  {formatPrice(product.price)}
                </div>
                {isOnSale && (
                  <div className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price!)}
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={onToggleWishlist}
                >
                  <Heart 
                    className={cn(
                      "h-4 w-4 mr-1",
                      isWishlisted ? "fill-red-500 text-red-500" : ""
                    )} 
                  />
                  المفضلة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={onView}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  عرض
                </Button>
                <Button
                  size="sm"
                  variant={isOutOfStock ? "outline" : "default"}
                  className="rounded-full"
                  disabled={isOutOfStock}
                  onClick={onBuyNow}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  {isOutOfStock ? "نفذت الكمية" : "شراء الآن"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default StoreProductGrid; 