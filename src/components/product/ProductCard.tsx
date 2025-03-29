
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useShop } from '@/context/ShopContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useShop();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    toast.success('تمت إضافة المنتج إلى عربة التسوق');
  };

  return (
    <Link to={`/product/${product.id}`}>
      <Card 
        className="overflow-hidden transition-all duration-300 group h-full flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative pt-4 px-4">
          {product.isNew && (
            <Badge className="absolute top-6 right-6 z-10 bg-primary">جديد</Badge>
          )}
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <Badge variant="destructive" className="absolute top-6 left-6 z-10">
              خصم {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
            </Badge>
          )}
          <div className="relative aspect-square overflow-hidden rounded-md bg-muted mb-4">
            <img
              src={product.thumbnailImage || '/placeholder.svg'}
              alt={product.name}
              className={`h-full w-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
            />
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`}>
              <Button variant="secondary" size="sm" className="mx-1">
                <Eye className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                عرض التفاصيل
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="flex-grow">
          <h3 className="font-medium truncate text-right">{product.name}</h3>
          <div className="text-sm text-muted-foreground truncate text-right">{product.category}</div>
        </CardContent>
        
        <CardFooter className="border-t p-4 flex flex-col space-y-2">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-bold text-lg">{product.price} ر.س</span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.compareAtPrice} ر.س
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {product.stockQuantity > 0 ? 'متوفر' : 'غير متوفر'}
            </div>
          </div>
          
          <Button 
            onClick={handleAddToCart} 
            disabled={product.stockQuantity <= 0}
            className="w-full"
          >
            <ShoppingCart className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
            {product.stockQuantity > 0 ? 'إضافة للسلة' : 'غير متوفر'}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ProductCard;
