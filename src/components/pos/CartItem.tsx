import { useState, useMemo } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, Package, Check, ShoppingBag, AlertTriangle, X, Store, Boxes } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ensureArray } from '@/context/POSDataContext';
import { SaleTypeSelector, SaleTypeBadge, SavingsSummary } from './SaleTypeSelector';
import type { SaleType } from '@/lib/pricing/wholesalePricing';
import { toProductPricingInfo, isSaleTypeAvailable } from '@/lib/pricing/wholesalePricing';
import { resolveProductImageSrc } from '@/lib/products/productImageResolver';

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
  saleType?: SaleType; // نوع البيع (تجزئة/جملة/نصف جملة)
  isWholesale?: boolean; // هل هذا سعر جملة؟
  originalPrice?: number; // السعر الأصلي قبل خصم الجملة
}

interface CartItemProps {
  item: CartItemType;
  index: number;
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  updateItemPrice?: (index: number, price: number) => void;
  updateItemSaleType?: (index: number, saleType: SaleType) => void;
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
  updateItemSaleType,
  canEditPrice = true,
  relatedProducts = [],
  onRelatedProductClick
}: CartItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showRelated, setShowRelated] = useState(false);

  // استخراج معلومات المنتج
  const { product, quantity, colorName, colorCode, sizeName } = item;
  const imageUrl = item.variantImage || resolveProductImageSrc(product as any, '/placeholder-product.svg');
  const price = item.variantPrice !== undefined ? item.variantPrice : product.price;
  const totalPrice = price * quantity;

  // التحقق من توفر خيارات الجملة للمنتج
  const pricingInfo = useMemo(() => toProductPricingInfo(product), [product]);
  const hasWholesaleOptions = useMemo(() => {
    return isSaleTypeAvailable(pricingInfo, 'wholesale') ||
           isSaleTypeAvailable(pricingInfo, 'partial_wholesale');
  }, [pricingInfo]);

  // نوع البيع الحالي
  const currentSaleType: SaleType = item.saleType || 'retail';

  // السعر الأصلي للمقارنة
  const originalPrice = item.originalPrice || product.price;
  
  // دالة تعديل السعر
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value) || 0;
    if (updateItemPrice && newPrice >= 0) {
      updateItemPrice(index, newPrice);
    }
  };
  
  // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
  const productColors = ensureArray(product.colors) as any[];

  // قم بتحديد ما إذا كان يمكن زيادة الكمية
  const canIncreaseQuantity = () => {
    // تحقق من المخزون المتاح
    if (item.colorId && item.sizeId) {
      const color = productColors.find(c => c.id === item.colorId);
      const colorSizes = ensureArray(color?.sizes) as any[];
      const size = colorSizes.find(s => s.id === item.sizeId);
      return size ? quantity < size.quantity : false;
    } else if (item.colorId) {
      const color = productColors.find(c => c.id === item.colorId);
      return color ? quantity < color.quantity : false;
    } else {
      return quantity < product.stock_quantity;
    }
  };

  // حساب حالة المخزون
  const availableStock = (() => {
    if (item.colorId && item.sizeId) {
      const color = productColors.find(c => c.id === item.colorId);
      const colorSizes = ensureArray(color?.sizes) as any[];
      const size = colorSizes.find(s => s.id === item.sizeId);
      return size ? size.quantity : 0;
    } else if (item.colorId) {
      const color = productColors.find(c => c.id === item.colorId);
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
        "flex gap-2.5 p-2.5 border transition-all duration-200 rounded-lg group",
        "border-border/50 dark:border-border/50",
        isHovered 
          ? "bg-muted/50 dark:bg-muted/50 border-border dark:border-border" 
          : "bg-card/50 dark:bg-card/50 hover:bg-muted/30 dark:hover:bg-muted/30"
      )}>
        {/* صورة المنتج - مبسطة وأصغر */}
        <div className="relative w-14 h-14 bg-muted/30 dark:bg-muted/30 rounded-md overflow-hidden flex-shrink-0 group/image">
          <img 
            src={imageUrl}
            alt={product.name}
            className="object-contain w-full h-full transition-transform group-hover/image:scale-105"
          />
          
          {/* علامة الكمية - مبسطة */}
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
            {quantity}
          </div>
          
          {/* تنبيه المخزون - مدمج */}
          {(isLowStock || isOutOfStock) && (
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-yellow-500 dark:bg-yellow-600 rounded-full flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
        
        {/* معلومات المنتج - تحسين تنسيق المعلومات وتوزيعها */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground dark:text-foreground line-clamp-1 mb-1">
                {product.name}
              </h3>
              
              {/* المتغيرات (اللون والمقاس) - مبسطة ومدمجة */}
              {(colorName || sizeName) && (
                <div className="text-[10px] text-muted-foreground dark:text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  {colorName && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full border border-border/50"
                        style={{ backgroundColor: colorCode || '#888' }}
                      />
                      <span>{colorName}</span>
                    </div>
                  )}
                  {colorName && sizeName && <span className="opacity-50">•</span>}
                  {sizeName && <span>{sizeName}</span>}
                </div>
              )}

              {/* محدد نوع البيع (جملة/تجزئة) */}
              {hasWholesaleOptions && updateItemSaleType && (
                <div className="mt-1">
                  <SaleTypeSelector
                    product={product}
                    quantity={quantity}
                    currentSaleType={currentSaleType}
                    onSaleTypeChange={(saleType) => updateItemSaleType(index, saleType)}
                    size="sm"
                    showDetails={false}
                  />
                </div>
              )}

              {/* عرض شارة نوع البيع إذا كان جملة ولا يوجد محدد */}
              {!hasWholesaleOptions && item.isWholesale && (
                <div className="mt-1">
                  <SaleTypeBadge saleType={currentSaleType} size="sm" />
                </div>
              )}
            </div>
            
            {/* زر الحذف - مبسط */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItemFromCart(index)}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* السعر والتحكم - مبسط ومدمج */}
          <div className="flex items-center justify-between mt-2">
            {/* السعر */}
            <div className="text-xs flex items-center gap-1">
              {canEditPrice && updateItemPrice ? (
                <Input
                  type="number"
                  value={price}
                  onChange={handlePriceChange}
                  className="w-14 h-6 text-xs p-1 bg-background/50 border-border/50"
                  step="0.01"
                  min="0"
                />
              ) : (
                <span className="font-medium text-muted-foreground">{formatPrice(price)}</span>
              )}
              <span className="text-muted-foreground/50 text-[10px]">×{quantity}</span>
              <span className="text-primary font-semibold text-sm">
                {formatPrice(totalPrice)}
              </span>
              {/* عرض التوفير إذا كان سعر الجملة أقل */}
              {item.isWholesale && originalPrice > price && (
                <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-950 px-1 rounded">
                  -{((originalPrice - price) / originalPrice * 100).toFixed(0)}%
                </span>
              )}
            </div>
            
            {/* التحكم بالكمية - مبسط */}
            <div className="flex items-center rounded-md overflow-hidden border border-border/50 h-7 bg-background/30">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-full w-7 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 p-0"
                onClick={() => updateItemQuantity(index, quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <span className="w-8 text-center text-xs font-medium text-foreground px-1">
                {quantity}
              </span>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="h-full w-7 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 p-0"
                onClick={() => updateItemQuantity(index, quantity + 1)}
                disabled={!canIncreaseQuantity()}
              >
                <Plus className="h-3 w-3" />
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
