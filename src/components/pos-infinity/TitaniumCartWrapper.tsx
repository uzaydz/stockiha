/**
 * 🛒 TitaniumCartWrapper - غلاف السلة بتصميم التيتانيوم
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * يدمج بين:
 * - تصميم Titanium الجديد (الألوان والشكل)
 * - كل وظائف POSAdvancedCart الحالية
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  Trash2,
  Plus,
  Minus,
  User,
  CreditCard,
  X,
  Package,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { POSMode } from './CommandIsland';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface CartItem {
  id?: string;
  product: any;
  quantity: number;
  variantPrice?: number;
  customPrice?: number;
  colorName?: string;
  sizeName?: string;
  colorId?: string;
  sizeId?: string;
  variantImage?: string;
  sellingUnit?: string;
  weight?: number;
  boxCount?: number;
  length?: number;
}

interface TitaniumCartWrapperProps {
  // Mode
  isReturnMode: boolean;
  isLossMode?: boolean;

  // Cart Items
  cartItems: CartItem[];
  returnItems?: CartItem[];

  // Functions
  updateItemQuantity: (index: number, quantity: number) => void;
  removeItemFromCart: (index: number) => void;
  clearCart: () => void;

  // Return Functions
  updateReturnItemQuantity?: (index: number, quantity: number) => void;
  removeReturnItem?: (index: number) => void;
  clearReturnCart?: () => void;

  // Checkout
  onCheckout: () => void;
  onProcessReturn?: () => void;
  isSubmitting?: boolean;

  // Customer
  customerName?: string;
  onSelectCustomer?: () => void;

  // Tabs (simplified - just show active tab info)
  activeTabName?: string;
  tabsCount?: number;

  // Calculate totals externally
  subtotal: number;
  discount?: number;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mode Config
// ═══════════════════════════════════════════════════════════════════════════

const MODE_CONFIG = {
  sale: {
    title: 'سلة المشتريات',
    icon: ShoppingCart,
    colors: {
      header: 'bg-gradient-to-r from-orange-500 to-amber-500',
      accent: 'text-orange-600 dark:text-orange-400',
      button: 'bg-orange-500 hover:bg-orange-600',
      light: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800'
    }
  },
  return: {
    title: 'سلة الإرجاع',
    icon: RotateCcw,
    colors: {
      header: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      accent: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-500 hover:bg-blue-600',
      light: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800'
    }
  },
  loss: {
    title: 'سلة الخسائر',
    icon: AlertTriangle,
    colors: {
      header: 'bg-gradient-to-r from-red-500 to-rose-500',
      accent: 'text-red-600 dark:text-red-400',
      button: 'bg-red-500 hover:bg-red-600',
      light: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Cart Item Component
// ═══════════════════════════════════════════════════════════════════════════

const CartItemRow = memo<{
  item: CartItem;
  index: number;
  mode: POSMode;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
}>(({ item, index, mode, onUpdateQuantity, onRemoveItem }) => {
  const price = item.customPrice ?? item.variantPrice ?? item.product?.price ?? 0;
  const lineTotal = price * item.quantity;
  const config = MODE_CONFIG[mode];

  // الحصول على صورة المنتج
  const imageUrl = useMemo(() => {
    if (item.variantImage) return item.variantImage;
    if (item.product?.thumbnail_image) return item.product.thumbnail_image;
    if (item.product?.images?.[0]) return item.product.images[0];
    return null;
  }, [item]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        "bg-white dark:bg-[#161b22]",
        "border-zinc-200 dark:border-[#30363d]",
        "transition-all duration-200"
      )}
    >
      {/* صورة المنتج */}
      <div className="w-12 h-12 rounded-md bg-zinc-100 dark:bg-[#21262d] overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.product?.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-zinc-400" />
          </div>
        )}
      </div>

      {/* معلومات المنتج */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-[#e6edf3] truncate">
          {item.product?.name}
        </h4>
        {(item.colorName || item.sizeName) && (
          <p className="text-xs text-zinc-500 dark:text-[#8b949e] mt-0.5">
            {[item.colorName, item.sizeName].filter(Boolean).join(' • ')}
          </p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-zinc-400 dark:text-[#6e7681]">{price.toLocaleString('ar-DZ')} د.ج</span>
          <span className={cn("text-sm font-bold", config.colors.accent)}>
            {lineTotal.toLocaleString('ar-DZ')} د.ج
          </span>
        </div>
      </div>

      {/* التحكم في الكمية */}
      <div className="flex flex-col items-end gap-1.5">
        <button
          onClick={() => onRemoveItem(index)}
          className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-[#21262d] rounded-md p-0.5">
          <button
            onClick={() => onUpdateQuantity(index, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center transition-colors",
              item.quantity <= 1
                ? "text-zinc-300 dark:text-[#484f58] cursor-not-allowed"
                : "text-zinc-600 dark:text-[#8b949e] hover:bg-zinc-200 dark:hover:bg-[#30363d]"
            )}
          >
            <Minus className="w-3 h-3" />
          </button>

          <span className="w-7 text-center text-xs font-bold text-zinc-900 dark:text-[#e6edf3] tabular-nums">
            {item.quantity}
          </span>

          <button
            onClick={() => onUpdateQuantity(index, item.quantity + 1)}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 dark:text-[#8b949e] hover:bg-zinc-200 dark:hover:bg-[#30363d] transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
CartItemRow.displayName = 'CartItemRow';

// ═══════════════════════════════════════════════════════════════════════════
// Empty Cart Component
// ═══════════════════════════════════════════════════════════════════════════

const EmptyCart = memo<{ mode: POSMode }>(({ mode }) => {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
      <div className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center mb-3",
        config.colors.light
      )}>
        <Icon className={cn("w-7 h-7", config.colors.accent)} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-[#e6edf3] mb-1">
        السلة فارغة
      </h3>
      <p className="text-xs text-zinc-500 dark:text-[#8b949e] text-center">
        اضغط على المنتجات لإضافتها
      </p>
    </div>
  );
});
EmptyCart.displayName = 'EmptyCart';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

const TitaniumCartWrapper: React.FC<TitaniumCartWrapperProps> = memo(({
  isReturnMode,
  isLossMode = false,
  cartItems,
  returnItems = [],
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  updateReturnItemQuantity,
  removeReturnItem,
  clearReturnCart,
  onCheckout,
  onProcessReturn,
  isSubmitting = false,
  customerName,
  onSelectCustomer,
  activeTabName,
  tabsCount = 1,
  subtotal,
  discount = 0,
  total
}) => {
  // تحديد الوضع
  const mode: POSMode = isLossMode ? 'loss' : isReturnMode ? 'return' : 'sale';
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  // تحديد العناصر والدوال حسب الوضع
  const items = isReturnMode ? returnItems : cartItems;
  const handleUpdateQuantity = isReturnMode ? updateReturnItemQuantity : updateItemQuantity;
  const handleRemoveItem = isReturnMode ? removeReturnItem : removeItemFromCart;
  const handleClearCart = isReturnMode ? clearReturnCart : clearCart;
  const handleCheckout = isReturnMode ? onProcessReturn : onCheckout;

  const itemsCount = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0)
  , [items]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f1419] overflow-hidden">
      {/* ═══ Header ═══ */}
      <div className={cn("p-3 text-white", config.colors.header)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-base">{config.title}</h2>
              <p className="text-xs opacity-80">
                {itemsCount > 0 ? `${itemsCount} عنصر` : 'فارغة'}
                {tabsCount > 1 && activeTabName && ` • ${activeTabName}`}
              </p>
            </div>
          </div>

          {items.length > 0 && handleClearCart && (
            <button
              onClick={handleClearCart}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="مسح السلة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Customer Selection ═══ */}
      {onSelectCustomer && mode === 'sale' && (
        <button
          onClick={onSelectCustomer}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 border-b",
            "border-zinc-100 dark:border-[#30363d]",
            "hover:bg-zinc-50 dark:hover:bg-[#161b22] transition-colors"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            customerName
              ? config.colors.light
              : "bg-zinc-100 dark:bg-[#21262d]"
          )}>
            <User className={cn(
              "w-4 h-4",
              customerName ? config.colors.accent : "text-zinc-400 dark:text-[#8b949e]"
            )} />
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-medium text-zinc-900 dark:text-[#e6edf3]">
              {customerName || 'اختر عميل'}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-[#8b949e]">
              {customerName ? 'تغيير العميل' : 'بيع بدون عميل'}
            </p>
          </div>
        </button>
      )}

      {/* ═══ Cart Items ═══ */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <EmptyCart mode={mode} />
        ) : (
          <div className="p-2 space-y-2">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <CartItemRow
                  key={`${item.product?.id}-${item.colorName}-${item.sizeName}-${index}`}
                  item={item}
                  index={index}
                  mode={mode}
                  onUpdateQuantity={handleUpdateQuantity || (() => {})}
                  onRemoveItem={handleRemoveItem || (() => {})}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* ═══ Footer - Totals & Checkout ═══ */}
      {items.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-[#30363d] bg-zinc-50 dark:bg-[#161b22]">
          {/* Totals */}
          <div className="p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 dark:text-[#8b949e]">المجموع الفرعي</span>
              <span className="font-medium text-zinc-900 dark:text-[#e6edf3]">
                {subtotal.toLocaleString('ar-DZ')} د.ج
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 dark:text-[#8b949e]">الخصم</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  -{discount.toLocaleString('ar-DZ')} د.ج
                </span>
              </div>
            )}

            <div className="flex justify-between pt-1.5 border-t border-zinc-200 dark:border-[#30363d]">
              <span className="font-bold text-sm text-zinc-900 dark:text-[#e6edf3]">الإجمالي</span>
              <span className={cn("text-lg font-bold", config.colors.accent)}>
                {total.toLocaleString('ar-DZ')} د.ج
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="p-3 pt-0">
            <Button
              onClick={handleCheckout}
              disabled={isSubmitting || items.length === 0}
              className={cn(
                "w-full h-11 text-sm font-bold rounded-xl text-white",
                config.colors.button,
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري المعالجة...
                </span>
              ) : mode === 'sale' ? (
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  إتمام البيع
                </span>
              ) : mode === 'return' ? (
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  تأكيد الإرجاع
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  تسجيل الخسارة
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

TitaniumCartWrapper.displayName = 'TitaniumCartWrapper';

export default TitaniumCartWrapper;
