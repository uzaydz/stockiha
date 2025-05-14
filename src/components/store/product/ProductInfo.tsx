import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface ProductInfoProps {
  name: string;
  price: number;
  discountPrice?: number;
  currentPrice?: number;
  rating?: number;
  isNew?: boolean;
  stock: number;
  description?: string;
}

const ProductInfo = ({
  name,
  price,
  discountPrice,
  currentPrice,
  rating = 0,
  isNew = false,
  stock,
  description
}: ProductInfoProps) => {
  const discountPercentage = discountPrice 
    ? Math.round(((price - discountPrice) / price) * 100) 
    : 0;

  // استخدام السعر الحالي (من اللون أو المقاس) إذا كان متوفراً
  const displayPrice = currentPrice !== undefined ? currentPrice : (discountPrice || price);
  const hasDiscount = discountPrice && currentPrice === undefined;

  return (
    <div className="space-y-6">
      {/* اسم المنتج */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{name}</h1>
        
        {/* العلامات والتصنيفات */}
        <div className="flex flex-wrap gap-2 mt-3">
          {isNew && (
            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-full px-3 py-1">
              جديد
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-full px-3 py-1">
              خصم {discountPercentage}%
            </Badge>
          )}
          <Badge className={`${stock > 0 ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'} rounded-full px-3 py-1`}>
            {stock > 0 ? 'متوفر' : 'غير متوفر'}
          </Badge>
        </div>
      </div>

      {/* التقييم */}
      <div className="flex items-center">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} 
            />
          ))}
        </div>
        <span className="mr-2 text-sm text-muted-foreground">
          {rating.toFixed(1)} ({Math.floor(Math.random() * 100) + 50} تقييم)
        </span>
      </div>

      {/* السعر */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border shadow-sm p-5"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-foreground">
            {displayPrice.toLocaleString()} د.ج
          </span>
          
          {hasDiscount && (
            <span className="text-base text-muted-foreground line-through">
              {price.toLocaleString()} د.ج
            </span>
          )}
        </div>
        
        {/* حالة المخزون */}
        <div className="text-sm flex items-center mt-3">
          {stock > 0 ? (
            <div className="flex items-center text-green-600">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-2"></span>
              متوفر في المخزون 
              <span className="font-medium mx-1">({stock})</span>
              قطعة
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full ml-2"></span>
              غير متوفر حالياً
            </div>
          )}
        </div>
      </motion.div>

      {/* وصف المنتج المختصر */}
      {description && (
        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
          {description.length > 150 
            ? `${description.substring(0, 150)}...` 
            : description}
        </div>
      )}
    </div>
  );
};

export default ProductInfo; 