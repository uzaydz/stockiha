import { useState } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, Package, Check, ShoppingBag, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface CartItemType {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
}

interface CartItemProps {
  item: CartItemType;
  index: number;
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  relatedProducts?: Product[];
  onRelatedProductClick?: (product: Product) => void;
}

export default function CartItem({ 
  item, 
  index, 
  updateItemQuantity, 
  removeItemFromCart, 
  relatedProducts = [],
  onRelatedProductClick
}: CartItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  
  // استخراج معلومات المنتج
  const { product, quantity, colorName, colorCode, sizeName } = item;
  const imageUrl = item.variantImage || product.thumbnailImage || '/placeholder-product.svg';
  const price = item.variantPrice !== undefined ? item.variantPrice : product.price;
  const totalPrice = price * quantity;
  
  // قم بتحديد ما إذا كان يمكن زيادة الكمية
  const canIncreaseQuantity = () => {
    // تحقق من المخزون المتاح
    if (item.colorId && item.sizeId) {
      const color = product.colors?.find(c => c.id === item.colorId);
      const size = color?.sizes?.find(s => s.id === item.sizeId);
      return size ? quantity < size.quantity : false;
    } else if (item.colorId) {
      const color = product.colors?.find(c => c.id === item.colorId);
      return color ? quantity < color.quantity : false;
    } else {
      return quantity < product.stock_quantity;
    }
  };

  // حساب حالة المخزون
  const availableStock = (() => {
    if (item.colorId && item.sizeId) {
      const color = product.colors?.find(c => c.id === item.colorId);
      const size = color?.sizes?.find(s => s.id === item.sizeId);
      return size ? size.quantity : 0;
    } else if (item.colorId) {
      const color = product.colors?.find(c => c.id === item.colorId);
      return color ? color.quantity : 0;
    }
    return product.stock_quantity;
  })();
  
  const stockPercentage = Math.min(100, Math.round((quantity / Math.max(1, availableStock)) * 100));
  const stockColor = stockPercentage < 30 
    ? 'bg-emerald-500/80 dark:bg-emerald-600/60' 
    : stockPercentage < 70 
      ? 'bg-amber-500/80 dark:bg-amber-600/60' 
      : 'bg-red-500/80 dark:bg-red-600/60';
  
  // التحقق إذا كان المخزون منخفض
  const isLowStock = availableStock <= 5 && availableStock > 0;
  const isOutOfStock = availableStock <= 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative rounded-lg overflow-hidden"
    >
      <div className={cn(
        "flex gap-3 p-3 border transition-all duration-300 rounded-lg",
        "border-border dark:border-zinc-800",
        isHovered 
          ? "bg-accent/30 dark:bg-accent/10 shadow-md" 
          : "bg-background dark:bg-zinc-900"
      )}>
        {/* صورة المنتج - تحسين تصميم الصورة مع إضافة الظل */}
        <div className="relative w-[70px] h-[70px] bg-white dark:bg-zinc-800/70 rounded-md overflow-hidden flex-shrink-0 shadow-sm group">
          <img 
            src={imageUrl}
            alt={product.name}
            className="object-contain w-full h-full transition-transform group-hover:scale-110"
          />
          
          {/* علامة الكمية - تحسين التصميم */}
          <div className="absolute top-0 left-0 bg-primary dark:bg-primary/90 text-white text-xs font-bold px-1.5 py-0.5 rounded-br shadow-sm">
            {quantity}
          </div>
          
          {/* تنبيه المخزون */}
          {isLowStock && !isOutOfStock && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-zinc-800">
                    <AlertTriangle className="h-3 w-3 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">المخزون منخفض - متبقي {availableStock} فقط</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {isOutOfStock && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-zinc-800">
                    <AlertTriangle className="h-3 w-3 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">نفذت الكمية من المخزن</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* معلومات المنتج - تحسين تنسيق المعلومات وتوزيعها */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground dark:text-zinc-200 line-clamp-1">
                {product.name}
              </h3>
              
              {/* المتغيرات (اللون والمقاس) - تحسين عرض متغيرات المنتج */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {colorName && (
                  <div className="text-[10px] bg-accent/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full flex items-center">
                    <div 
                      className="w-2.5 h-2.5 rounded-full mr-1 border border-white/50 shadow-sm" 
                      style={{ backgroundColor: colorCode || '#888' }}
                    ></div>
                    <span className="text-foreground/80 dark:text-zinc-300">{colorName}</span>
                    
                    {sizeName && (
                      <>
                        <span className="mx-1 opacity-50">|</span>
                        <span className="text-foreground/80 dark:text-zinc-300">{sizeName}</span>
                      </>
                    )}
                  </div>
                )}
                
                <div className="text-[10px] bg-accent/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full flex items-center">
                  <Package className="w-2.5 h-2.5 mr-1 text-foreground/70 dark:text-zinc-400" />
                  <span className="text-foreground/80 dark:text-zinc-300">كود: {product.id.substring(0, 8)}</span>
                </div>
              </div>
            </div>
            
            <AnimatePresence>
              {showDeleteConfirm ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-1 bg-background/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-sm rounded-full p-0.5 border border-border dark:border-zinc-700"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-6 w-6 rounded-full text-muted-foreground dark:text-zinc-400 hover:bg-accent/50 dark:hover:bg-zinc-700"
                  >
                    <span className="sr-only">إلغاء</span>
                    <Trash2 className="h-3 w-3 opacity-70" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => removeItemFromCart(index)}
                    className="h-6 w-6 rounded-full text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    <span className="sr-only">تأكيد الحذف</span>
                    <Check className="h-3 w-3" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(true)}
                    className={cn(
                      "h-6 w-6 rounded-full transition-all duration-300",
                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100", 
                      "text-destructive hover:text-white hover:bg-destructive/90 dark:hover:bg-destructive/80"
                    )}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">حذف</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* السعر ومعلومات المنتج - تحسين توزيع العناصر في الجزء السفلي للمنتج */}
          <div className="flex items-end justify-between mt-auto pt-2">
            {/* شريط المخزون والسعر */}
            <div className="space-y-1.5">
              {/* شريط المخزون مع معلومات أكثر تفصيلاً */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-20 h-1.5 bg-accent/30 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={stockColor} style={{ width: `${stockPercentage}%` }}></div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="text-xs">
                      <p>الكمية المطلوبة: {quantity}</p>
                      <p>المتاح في المخزن: {availableStock}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* السعر - تحسين طريقة عرض السعر */}
              <div className="text-xs text-muted-foreground dark:text-zinc-400 flex items-center gap-0.5">
                <span>{formatPrice(price)}</span>
                <span className="mx-1 opacity-60">×</span>
                <span className="opacity-80">{quantity}</span>
                <span className="ml-1.5"></span>
                <span className="text-primary dark:text-primary/90 font-medium">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
            
            {/* التحكم بالكمية - تحسين ظهور أزرار التحكم بالكمية */}
            <div className="flex items-center rounded-lg overflow-hidden border border-border dark:border-zinc-800 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 rounded-none border-r border-border dark:border-zinc-800 text-muted-foreground dark:text-zinc-400 hover:bg-accent/50 dark:hover:bg-zinc-800 hover:text-destructive"
                onClick={() => updateItemQuantity(index, quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
                <span className="sr-only">تقليل الكمية</span>
              </Button>
              
              <span className="w-8 text-center text-xs font-medium text-foreground dark:text-zinc-300">
                {quantity}
              </span>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 rounded-none border-l border-border dark:border-zinc-800 text-muted-foreground dark:text-zinc-400 hover:bg-accent/50 dark:hover:bg-zinc-800 hover:text-primary"
                onClick={() => updateItemQuantity(index, quantity + 1)}
                disabled={!canIncreaseQuantity()}
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">زيادة الكمية</span>
              </Button>
            </div>
          </div>
          
          {/* إزالة ميزة قد يعجبك أيضاً */}
          {false && relatedProducts && relatedProducts.length > 0 && (
            <AnimatePresence>
              {(isHovered || showRelated) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 pt-2 border-t border-border/50 dark:border-zinc-800/50"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground dark:text-zinc-500">
                        قد يعجبك أيضاً
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-4 w-4 rounded-full"
                        onClick={() => setShowRelated(!showRelated)}
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {showRelated ? "إخفاء" : "عرض"}
                        </span>
                      </Button>
                    </div>
                    
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                      {relatedProducts.slice(0, 3).map((relatedProduct) => (
                        <button
                          key={relatedProduct.id}
                          onClick={() => onRelatedProductClick?.(relatedProduct)}
                          className="flex-shrink-0 w-10 h-10 rounded bg-accent/30 dark:bg-zinc-800 overflow-hidden relative group"
                        >
                          <img 
                            src={relatedProduct.thumbnailImage || '/placeholder-product.svg'} 
                            alt={relatedProduct.name} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ShoppingBag className="h-4 w-4 text-white" />
                          </div>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="absolute inset-0" />
                              <TooltipContent side="bottom">
                                <p className="text-xs">{relatedProduct.name}</p>
                                <p className="text-xs font-medium">{formatPrice(relatedProduct.price)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
} 