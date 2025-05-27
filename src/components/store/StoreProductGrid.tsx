import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Heart, Star, AlertCircle, Package, Sparkles } from 'lucide-react';
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-2xl font-semibold mb-4">لا توجد منتجات</h3>
        <p className="text-muted-foreground text-center max-w-md">
          لم يتم العثور على منتجات تطابق معايير البحث الخاصة بك. يرجى تجربة معايير بحث مختلفة.
        </p>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("grid", getGridClass())}
    >
      {products.map((product, index) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          view={view} 
          index={index}
        />
      ))}
    </motion.div>
  );
};

interface ProductCardProps {
  product: Product;
  view: 'grid' | 'list';
  index: number;
}

const ProductCard = ({ product, view, index }: ProductCardProps) => {
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'تم إزالة المنتج من المفضلة' : 'تم إضافة المنتج للمفضلة');
  };
  
  const buyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/products/${product.slug}?buy=true`);
    toast.success(`جاري الانتقال لشراء ${product.name}`);
  };
  
  const viewProduct = () => {
    navigate(`/products/${product.slug}`);
  };

  // حساب نسبة الخصم
  const discountPercentage = product.compare_at_price && product.compare_at_price > product.price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  // تحديد حالة المخزون
  const getStockStatus = () => {
    if (product.stock_quantity <= 0) return { status: 'out', label: 'نفذ', color: 'bg-red-100 text-red-800' };
    if (product.stock_quantity < 10) return { status: 'low', label: 'كمية محدودة', color: 'bg-amber-100 text-amber-800' };
    return { status: 'in', label: 'متوفر', color: 'bg-green-100 text-green-800' };
  };

  const stockStatus = getStockStatus();

  if (view === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -2 }}
      >
        <Card 
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
          onClick={viewProduct}
        >
          <div className="flex p-4 gap-4">
            {/* صورة المنتج - حجم ثابت في العرض المدرج */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <div className="w-full h-full bg-muted rounded-lg overflow-hidden">
                {!imageError ? (
                  <img
                    src={product.thumbnail_image || product.images?.[0] || '/placeholder.svg'}
                    alt={product.name}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-300 group-hover:scale-105",
                      !imageLoaded && "opacity-0"
                    )}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 bg-muted animate-pulse" />
                )}
              </div>
              
              {/* شارات المنتج */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.is_new && (
                  <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                    <Sparkles className="h-3 w-3 ml-1" />
                    جديد
                  </Badge>
                )}
                {discountPercentage > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    -{discountPercentage}%
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleWishlist}
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
              >
                <Heart className={cn("h-4 w-4", isWishlisted && "fill-red-500 text-red-500")} />
              </Button>
            </div>

            {/* معلومات المنتج */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {product.description}
                </p>
                
                {/* تقييم المنتج */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < 4 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">(4.5)</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                {/* السعر */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {product.price.toLocaleString()} د.ج
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-lg text-muted-foreground line-through">
                      {product.compare_at_price.toLocaleString()} د.ج
                    </span>
                  )}
                </div>

                {/* حالة المخزون والأزرار */}
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={stockStatus.color}>
                    {stockStatus.label}
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={buyNow}
                      disabled={product.stock_quantity <= 0}
                      className="w-full"
                    >
                      {product.stock_quantity > 0 ? 'اشتري الآن' : 'غير متوفر'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // عرض الشبكة (Grid View)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group h-full flex flex-col"
        onClick={viewProduct}
      >
        {/* صورة المنتج - حجم ثابت لحل مشكلة عدم التناسق */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {!imageError ? (
            <img
              src={product.thumbnail_image || product.images?.[0] || '/placeholder.svg'}
              alt={product.name}
              className={cn(
                "w-full h-full object-cover transition-all duration-500 group-hover:scale-110",
                !imageLoaded && "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          
          {/* تحميل الصورة */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          
          {/* طبقة تفاعل عند التمرير */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); viewProduct(); }}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={toggleWishlist}>
                <Heart className={cn("h-4 w-4", isWishlisted && "fill-red-500 text-red-500")} />
              </Button>
            </div>
          </div>
          
          {/* شارات المنتج */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.is_new && (
              <Badge className="bg-green-500 hover:bg-green-600 text-xs shadow-lg">
                <Sparkles className="h-3 w-3 ml-1" />
                جديد
              </Badge>
            )}
            {discountPercentage > 0 && (
              <Badge variant="destructive" className="text-xs shadow-lg">
                -{discountPercentage}%
              </Badge>
            )}
          </div>

          {/* زر المفضلة */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleWishlist}
            className="absolute top-3 right-3 h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-red-500 text-red-500")} />
          </Button>
        </div>

        {/* محتوى البطاقة */}
        <CardContent className="p-4 flex-grow flex flex-col">
          {/* اسم المنتج */}
          <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {product.name}
          </h3>
          
          {/* وصف المنتج */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-grow">
            {product.description}
          </p>
          
          {/* تقييم المنتج */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < 4 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">(4.5)</span>
          </div>

          {/* السعر */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-primary">
              {product.price.toLocaleString()} د.ج
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {product.compare_at_price.toLocaleString()} د.ج
              </span>
            )}
          </div>

          {/* حالة المخزون */}
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className={cn("text-xs", stockStatus.color)}>
              {stockStatus.label}
            </Badge>
            {product.stock_quantity > 0 && product.stock_quantity < 10 && (
              <span className="text-xs text-muted-foreground">
                {product.stock_quantity} قطعة متبقية
              </span>
            )}
          </div>
        </CardContent>

        {/* أزرار الإجراءات */}
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <Button 
            onClick={buyNow}
            disabled={product.stock_quantity <= 0}
            className="w-full"
          >
            {product.stock_quantity > 0 ? 'اشتري الآن' : 'غير متوفر'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default StoreProductGrid;
