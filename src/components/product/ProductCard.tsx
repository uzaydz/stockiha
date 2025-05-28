import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Package } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.success('جاري التوجيه لصفحة الشراء...');
  };

  return (
    <Link to={`/product/${product.id}`}>
      <Card 
        className="overflow-hidden transition-all duration-300 group h-full flex flex-col hover:shadow-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.isNew && (
            <Badge className="absolute top-3 right-3 z-10 bg-primary shadow-lg">جديد</Badge>
          )}
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <Badge variant="destructive" className="absolute top-3 left-3 z-10 shadow-lg">
              خصم {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
            </Badge>
          )}
          
          {!imageError ? (
            <img
              src={product.thumbnailImage || '/placeholder.svg'}
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
          
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          
          <div className={cn(
            "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300",
            isHovered ? 'opacity-100' : 'opacity-0'
          )}>
            <Button variant="secondary" size="sm" className="mx-1">
              <Eye className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              عرض التفاصيل
            </Button>
          </div>
        </div>
        
        <CardContent className="flex-grow p-4">
          <h3 className="font-medium text-base line-clamp-2 text-right mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            {typeof product.category === 'object' && product.category !== null
              ? (product.category as { name: string }).name
              : product.category}
          </p>
        </CardContent>
        
        <CardFooter className="border-t p-4 flex flex-col space-y-3">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-bold text-lg text-primary">{product.price} د.ج</span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.compareAtPrice} د.ج
                </span>
              )}
            </div>
            <div className={cn(
              "text-xs px-3 py-1 rounded-full",
              product.stockQuantity <= 0 ? "bg-red-100 text-red-800" : 
              product.stockQuantity < 10 ? "bg-amber-100 text-amber-800" : 
              "bg-green-100 text-green-800"
            )}>
              {product.stockQuantity <= 0 ? 'نفذ' : 
               product.stockQuantity < 10 ? 'كمية محدودة' : 
               'متوفر'}
            </div>
          </div>
          
          <Button 
            onClick={handleBuyNow} 
            disabled={product.stockQuantity <= 0}
            className="w-full"
          >
            {product.stockQuantity > 0 ? 'اشتري الآن' : 'غير متوفر'}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ProductCard;
