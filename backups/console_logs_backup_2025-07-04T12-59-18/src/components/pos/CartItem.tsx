import { useState } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, Package, Check, ShoppingBag, AlertTriangle, X } from 'lucide-react';
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
  customReturnPrice?: number; // سعر مخصص للإرجاع
}

interface CartItemProps {
  item: CartItemType;
  index: number;
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  updateItemPrice?: (index: number, price: number) => void;
  canEditPrice?: boolean;
  relatedProducts?: Product[];
  onRelatedProductClick?: (product: Product) => void;
}

export default function CartItem({ 
  item, 
  index, 
  updateItemQuantity, 
  removeItemFromCart, 
  updateItemPrice,
  canEditPrice = true,
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
  
  // دالة تعديل السعر
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value) || 0;
    if (updateItemPrice && newPrice >= 0) {
      updateItemPrice(index, newPrice);
    }
  };
  
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
        "flex gap-3 p-3 border transition-all duration-300 rounded-lg group",
        "border-border dark:border-border",
        isHovered 
          ? "bg-accent/50 dark:bg-accent/50 shadow-md border-border dark:border-border" 
          : "bg-card dark:bg-card hover:bg-accent/30 dark:hover:bg-accent/30"
      )}>
        {/* صورة المنتج - تحسين تصميم الصورة مع إضافة الظل */}
        <div className="relative w-[70px] h-[70px] bg-background dark:bg-background rounded-lg overflow-hidden flex-shrink-0 shadow-sm group/image border border-border dark:border-border">
          <img 
            src={imageUrl}
            alt={product.name}
            className="object-contain w-full h-full transition-transform group-hover/image:scale-105"
          />
          
          {/* علامة الكمية - تحسين التصميم */}
          <div className="absolute top-1 left-1 bg-primary dark:bg-primary text-primary-foreground dark:text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-md shadow-sm border border-background/20 dark:border-background/20">
            {quantity}
          </div>
          
          {/* تنبيه المخزون */}
          {isLowStock && !isOutOfStock && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 dark:bg-yellow-600 rounded-full flex items-center justify-center shadow-md border-2 border-background dark:border-background">
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
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 dark:bg-red-600 rounded-full flex items-center justify-center shadow-md border-2 border-background dark:border-background">
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
              <h3 className="font-semibold text-sm text-foreground dark:text-foreground line-clamp-1">
                {product.name}
              </h3>
              
              {/* المتغيرات (اللون والمقاس) - تحسين عرض متغيرات المنتج */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {colorName && (
                  <div className="text-[10px] bg-muted dark:bg-muted px-2 py-1 rounded-full flex items-center shadow-sm border border-border dark:border-border">
                    <div 
                      className="w-2.5 h-2.5 rounded-full mr-1.5 border border-border dark:border-border shadow-sm" 
                      style={{ backgroundColor: colorCode || '#888' }}
                    ></div>
                    <span className="text-foreground dark:text-foreground font-medium">{colorName}</span>
                    
                    {sizeName && (
                      <>
                        <span className="mx-1.5 text-muted-foreground dark:text-muted-foreground">|</span>
                        <span className="text-foreground dark:text-foreground font-medium">{sizeName}</span>
                      </>
                    )}
                  </div>
                )}
                
                <div className="text-[10px] bg-muted dark:bg-muted px-2 py-1 rounded-full flex items-center shadow-sm border border-border dark:border-border">
                  <Package className="w-2.5 h-2.5 mr-1 text-muted-foreground dark:text-muted-foreground" />
                  <span className="text-foreground dark:text-foreground font-medium">كود: {product.id.substring(0, 8)}</span>
                </div>
              </div>
            </div>
            
            {/* زر الحذف - إصلاح المشكل وتحسين الظهور */}
            <div className="flex items-center">
              <AnimatePresence>
                {showDeleteConfirm ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center space-x-1 bg-card dark:bg-card backdrop-blur-sm shadow-lg rounded-full p-0.5 border border-border dark:border-border"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="h-7 w-7 rounded-full text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent"
                    >
                      <span className="sr-only">إلغاء</span>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => removeItemFromCart(index)}
                      className="h-7 w-7 rounded-full text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 shadow-sm"
                    >
                      <span className="sr-only">تأكيد الحذف</span>
                      <Check className="h-3.5 w-3.5" />
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
                        "h-8 w-8 rounded-full transition-all duration-300 shadow-sm",
                        "opacity-100", // إزالة الإخفاء وجعل الزر مرئي دائماً
                        "text-red-500 dark:text-red-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-500",
                        "border border-red-200 dark:border-red-800 hover:border-red-500 dark:hover:border-red-500"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">حذف</span>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* السعر ومعلومات المنتج - تحسين توزيع العناصر في الجزء السفلي للمنتج */}
          <div className="flex items-end justify-between mt-auto pt-3">
            {/* شريط المخزون والسعر */}
            <div className="space-y-2">
              {/* شريط المخزون مع معلومات أكثر تفصيلاً */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-24 h-2 bg-muted dark:bg-muted rounded-full overflow-hidden shadow-sm border border-border dark:border-border">
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
              
              {/* السعر - تحسين طريقة عرض السعر مع إمكانية التعديل */}
              <div className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
                {canEditPrice && updateItemPrice ? (
                  <Input
                    type="number"
                    value={price}
                    onChange={handlePriceChange}
                    className="w-16 h-6 text-xs text-right bg-background dark:bg-background/50 border-primary/30"
                    step="0.01"
                    min="0"
                  />
                ) : (
                  <span className="font-medium">{formatPrice(price)}</span>
                )}
                <span className="mx-0.5 opacity-60">×</span>
                <span className="opacity-80 font-medium">{quantity}</span>
                <span className="ml-2 text-xs opacity-50">=</span>
                <span className="text-primary dark:text-primary font-semibold text-sm">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
            
            {/* التحكم بالكمية - تحسين ظهور أزرار التحكم بالكمية */}
            <div className="flex items-center rounded-lg overflow-hidden border border-border dark:border-border shadow-sm bg-background dark:bg-background">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-none border-r border-border dark:border-border text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30"
                onClick={() => updateItemQuantity(index, quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
                <span className="sr-only">تقليل الكمية</span>
              </Button>
              
              <span className="w-10 text-center text-sm font-semibold text-foreground dark:text-foreground bg-muted dark:bg-muted">
                {quantity}
              </span>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-none border-l border-border dark:border-border text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent hover:text-primary dark:hover:text-primary disabled:opacity-30"
                onClick={() => updateItemQuantity(index, quantity + 1)}
                disabled={!canIncreaseQuantity()}
              >
                <Plus className="h-3.5 w-3.5" />
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
