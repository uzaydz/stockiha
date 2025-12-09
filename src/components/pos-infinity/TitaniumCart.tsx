/**
 * 🛒 TitaniumCart - السلة المحسّنة
 * ═══════════════════════════════════════════════════════════════════════════
 * تصميم بسيط مع تعديل مباشر للكمية والسعر
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
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
  X,
  Package,
  Scale,
  Box,
  Ruler,
  Eye,
  ChevronLeft,
  Zap,
  Loader2,
  Clock,
  PauseCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { POSMode } from './CommandIsland';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type SellingUnit = 'piece' | 'weight' | 'box' | 'meter';

interface CartItem {
  id: string;
  product: any;
  quantity: number;
  variantPrice?: number;
  customPrice?: number;
  colorName?: string;
  sizeName?: string;
  sellingUnit?: SellingUnit;
  weight?: number;
  weightUnit?: 'kg' | 'g';
  boxCount?: number;
  length?: number;
}

type SaleMode = 'normal' | 'discount' | 'debt';

interface TitaniumCartProps {
  mode: POSMode;
  items: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onQuickCheckout?: () => void; // بيع سريع - تسجيل مباشر
  onUpdatePrice?: (index: number, price: number) => void;
  onEditItem?: (index: number) => void;
  customerName?: string;
  onSelectCustomer?: () => void;
  isSubmitting?: boolean;
  subtotal: number;
  discount?: number;
  total: number;
  saleMode?: SaleMode; // نوع البيع (عادي/تخفيض/مديونية)
  // Hold Order Props
  onHoldCart?: () => void;
  // Tabs Props - التبويبات
  tabs?: Array<{
    id: string;
    customerName?: string;
    cartItems?: any[];
    selectedServices?: any[];
    selectedSubscriptions?: any[];
  }>;
  activeTabId?: string;
  onSwitchTab?: (tabId: string) => void;
  onRemoveTab?: (tabId: string) => void;
  // ⚡ Loss Mode Props - سبب الخسارة
  lossDescription?: string;
  onLossDescriptionChange?: (value: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Theme Configuration
// ═══════════════════════════════════════════════════════════════════════════

const THEME = {
  sale: {
    name: 'سلة المشتريات',
    icon: ShoppingCart,
    gradient: 'from-orange-500 to-amber-500',
    solid: 'bg-orange-500',
    light: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    button: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    input: 'focus:ring-orange-500 focus:border-orange-500'
  },
  return: {
    name: 'سلة الإرجاع',
    icon: RotateCcw,
    gradient: 'from-blue-500 to-indigo-500',
    solid: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    button: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    input: 'focus:ring-blue-500 focus:border-blue-500'
  },
  loss: {
    name: 'سلة الخسائر',
    icon: AlertTriangle,
    gradient: 'from-red-500 to-rose-500',
    solid: 'bg-red-500',
    light: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    button: 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    input: 'focus:ring-red-500 focus:border-red-500'
  }
};

const UNIT_CONFIG = {
  piece: { icon: Package, label: 'قطعة', suffix: '' },
  weight: { icon: Scale, label: 'وزن', suffix: 'كغ' },
  box: { icon: Box, label: 'كرتون', suffix: 'كرتون' },
  meter: { icon: Ruler, label: 'متر', suffix: 'م' }
};

// تكوين أنواع البيع
const SALE_MODE_CONFIG = {
  normal: { label: 'عادي', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  discount: { label: 'تخفيض', color: 'bg-amber-500', textColor: 'text-amber-600' },
  debt: { label: 'مديونية', color: 'bg-blue-500', textColor: 'text-blue-600' }
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

// 💎 تنسيق السعر بأرقام إنجليزية واضحة
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
};

// تحويل النص إلى رقم مع دعم الفاصلة العربية والعادية
const parseDecimalInput = (value: string): number => {
  // استبدال الفاصلة بنقطة
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const getUnitValue = (item: CartItem): number => {
  switch (item.sellingUnit) {
    case 'weight': return item.weight || 0;
    case 'box': return item.boxCount || 0;
    case 'meter': return item.length || 0;
    default: return item.quantity;
  }
};

const getUnitSuffix = (item: CartItem): string => {
  switch (item.sellingUnit) {
    case 'weight': return item.weightUnit === 'g' ? 'غ' : 'كغ';
    case 'box': return 'كرتون';
    case 'meter': return 'م';
    default: return '';
  }
};

const calculateItemTotal = (item: CartItem): number => {
  // إذا كان هناك سعر مخصص (customPrice أو variantPrice) نستخدمه لجميع أنواع الوحدات
  const hasCustomPrice = item.customPrice !== undefined || item.variantPrice !== undefined;
  const customPrice = item.customPrice ?? item.variantPrice ?? 0;

  switch (item.sellingUnit) {
    case 'weight': {
      const unitPrice = hasCustomPrice ? customPrice : (item.product?.price_per_weight_unit || item.product?.price || 0);
      return (item.weight || 0) * unitPrice;
    }
    case 'box': {
      const unitPrice = hasCustomPrice ? customPrice : (item.product?.box_price || item.product?.price || 0);
      return (item.boxCount || 0) * unitPrice;
    }
    case 'meter': {
      const unitPrice = hasCustomPrice ? customPrice : (item.product?.price_per_meter || item.product?.price || 0);
      return (item.length || 0) * unitPrice;
    }
    default: {
      const unitPrice = hasCustomPrice ? customPrice : (item.product?.price || 0);
      return unitPrice * item.quantity;
    }
  }
};

const getUnitPrice = (item: CartItem): number => {
  // إذا كان هناك سعر مخصص نستخدمه
  const hasCustomPrice = item.customPrice !== undefined || item.variantPrice !== undefined;
  const customPrice = item.customPrice ?? item.variantPrice ?? 0;

  if (hasCustomPrice) return customPrice;

  switch (item.sellingUnit) {
    case 'weight': return item.product?.price_per_weight_unit || item.product?.price || 0;
    case 'box': return item.product?.box_price || item.product?.price || 0;
    case 'meter': return item.product?.price_per_meter || item.product?.price || 0;
    default: return item.product?.price || 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Cart Item Component
// ═══════════════════════════════════════════════════════════════════════════

const CartItemCard = memo<{
  item: CartItem;
  index: number;
  theme: typeof THEME.sale;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onUpdatePrice?: (index: number, price: number) => void;
  onShowDetails?: (index: number) => void;
}>(({ item, index, theme, onUpdateQuantity, onRemoveItem, onUpdatePrice, onShowDetails }) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [tempQty, setTempQty] = useState('');

  const unitValue = getUnitValue(item);
  const unitSuffix = getUnitSuffix(item);
  const total = calculateItemTotal(item);
  const unitPrice = getUnitPrice(item);
  const isPiece = !item.sellingUnit || item.sellingUnit === 'piece';
  const isDecimal = item.sellingUnit === 'weight' || item.sellingUnit === 'meter';
  const unitConfig = UNIT_CONFIG[item.sellingUnit || 'piece'];
  const UnitIcon = unitConfig.icon;

  const productImage = item.product?.thumbnail_base64 ||
    item.product?.thumbnail_image ||
    item.product?.images?.[0];

  // تعديل السعر الإجمالي (وليس سعر الوحدة)
  const handlePriceClick = () => {
    if (!onUpdatePrice) return;
    // نعرض السعر الإجمالي للتعديل
    setTempPrice(total.toString());
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    const newTotal = parseFloat(tempPrice);
    if (!isNaN(newTotal) && newTotal >= 0 && onUpdatePrice) {
      // نحسب سعر الوحدة الجديد من الإجمالي الجديد
      const newUnitPrice = unitValue > 0 ? newTotal / unitValue : newTotal;
      onUpdatePrice(index, newUnitPrice);
    }
    setIsEditingPrice(false);
  };

  // تعديل الكمية مباشرة
  const handleQtyClick = () => {
    setTempQty(unitValue.toString());
    setIsEditingQty(true);
  };

  const handleQtySave = () => {
    const newQty = isDecimal ? parseDecimalInput(tempQty) : parseInt(tempQty);
    if (!isNaN(newQty) && newQty > 0) {
      // حفظ القيمة كما هي بدون تقريب
      onUpdateQuantity(index, newQty);
    }
    setIsEditingQty(false);
  };

  // زيادة/نقصان الكمية
  const step = isDecimal ? 0.1 : 1;
  const minValue = isDecimal ? 0.01 : 1;

  const handleIncrement = () => {
    const newVal = Math.round((unitValue + step) * 100) / 100;
    onUpdateQuantity(index, newVal);
  };

  const handleDecrement = () => {
    if (unitValue > minValue) {
      const newVal = Math.round((unitValue - step) * 100) / 100;
      onUpdateQuantity(index, newVal);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
      className="group"
    >
      <div className={cn(
        "relative bg-white dark:bg-zinc-800/80 rounded-xl overflow-hidden",
        "border border-zinc-200 dark:border-zinc-700/60",
        "shadow-sm hover:shadow-md dark:shadow-zinc-950/20",
        "transition-all duration-200"
      )}>
        <div className="flex flex-row-reverse gap-3 p-3">
          {/* صورة المنتج مع زر التفاصيل */}
          <div className="relative w-14 h-14 flex-shrink-0 group/image">
            <div className={cn(
              "w-full h-full rounded-lg overflow-hidden",
              "bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600/50"
            )}>
              {productImage ? (
                <img
                  src={productImage}
                  alt={item.product?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                </div>
              )}
            </div>

            {/* زر التفاصيل - يظهر عند hover */}
            {onShowDetails && (
              <button
                onClick={() => onShowDetails(index)}
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  "bg-black/60 rounded-lg",
                  "opacity-0 group-hover/image:opacity-100",
                  "transition-opacity duration-200"
                )}
              >
                <span className="flex items-center gap-1 text-white text-xs font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  تفاصيل
                </span>
              </button>
            )}
          </div>

          {/* معلومات المنتج */}
          <div className="flex-1 min-w-0">
            {/* السطر الأول: الاسم + زر الحذف */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">
                  {item.product?.name}
                </h4>
                {(item.colorName || item.sizeName) && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {[item.colorName, item.sizeName].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemoveItem(index)}
                className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* السطر الثاني: الكمية والسعر */}
            <div className="flex items-center justify-between gap-2 mt-2.5">
              {/* التحكم في الكمية */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDecrement}
                  disabled={unitValue <= minValue}
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    "bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300",
                    "hover:bg-zinc-200 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600/50",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "transition-colors shadow-sm"
                  )}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                {isEditingQty ? (
                  <input
                    type={isDecimal ? "text" : "number"}
                    inputMode={isDecimal ? "decimal" : "numeric"}
                    value={tempQty}
                    onChange={(e) => setTempQty(e.target.value)}
                    onBlur={handleQtySave}
                    onKeyDown={(e) => e.key === 'Enter' && handleQtySave()}
                    className="w-16 h-7 text-center text-sm font-bold border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                    autoFocus
                    placeholder={isDecimal ? "0,0" : "0"}
                  />
                ) : (
                  <button
                    onClick={handleQtyClick}
                    className={cn(
                      "min-w-[44px] h-7 px-2 rounded-lg text-sm font-bold",
                      "flex items-center justify-center gap-1 shadow-sm",
                      theme.badge
                    )}
                  >
                    <UnitIcon className="w-3 h-3" />
                    {unitSuffix && <span className="text-[10px] opacity-70">{unitSuffix}</span>}
                    <span className="font-numeric">{isDecimal ? unitValue.toFixed(2) : unitValue}</span>
                  </button>
                )}

                <button
                  onClick={handleIncrement}
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    "bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300",
                    "hover:bg-zinc-200 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600/50",
                    "transition-colors shadow-sm"
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* السعر - قابل للتعديل */}
              {isEditingPrice ? (
                <input
                  type="number"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(e.target.value)}
                  onBlur={handlePriceSave}
                  onKeyDown={(e) => e.key === 'Enter' && handlePriceSave()}
                  className="w-20 h-7 text-center text-sm font-bold border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                  autoFocus
                  min={0}
                />
              ) : (
                <button
                  onClick={handlePriceClick}
                  disabled={!onUpdatePrice}
                  className={cn(
                    "text-sm font-bold flex items-baseline gap-1 px-2 py-1 rounded-lg",
                    theme.text,
                    onUpdatePrice && "hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  )}
                >
                  <span className="text-[10px] opacity-70 text-zinc-500 dark:text-zinc-400">د.ج</span>
                  <span className="font-numeric">{formatPrice(total)}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
CartItemCard.displayName = 'CartItemCard';

// ═══════════════════════════════════════════════════════════════════════════
// Empty Cart Component
// ═══════════════════════════════════════════════════════════════════════════

const EmptyCart = memo<{ theme: typeof THEME.sale }>(({ theme }) => {
  const Icon = theme.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-3",
        theme.light
      )}>
        <Icon className={cn("w-8 h-8", theme.text)} strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        السلة فارغة
      </h3>
      <p className="text-xs text-zinc-500 text-center">
        اضغط على المنتجات لإضافتها
      </p>
    </div>
  );
});
EmptyCart.displayName = 'EmptyCart';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

const TitaniumCart: React.FC<TitaniumCartProps> = memo(({
  mode,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onQuickCheckout,
  onUpdatePrice,
  onEditItem,
  customerName,
  onSelectCustomer,
  isSubmitting = false,
  subtotal,
  discount = 0,
  total,
  saleMode = 'normal',
  onHoldCart,
  tabs = [],
  activeTabId,
  onSwitchTab,
  onRemoveTab,
  lossDescription = '',
  onLossDescriptionChange
}) => {
  const theme = THEME[mode];
  const Icon = theme.icon;
  const saleModeConfig = SALE_MODE_CONFIG[saleMode];

  const itemsCount = useMemo(() => items.length, [items]);

  const checkoutLabel = mode === 'sale' ? 'إتمام البيع' : mode === 'return' ? 'تأكيد الإرجاع' : 'تسجيل الخسارة';

  // ⚡ التحقق من إمكانية التسجيل في وضع الخسارة
  const canCheckoutLoss = mode !== 'loss' || (lossDescription && lossDescription.trim().length > 0);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f1419] shadow-sm">

    {/* ═══ Header ═══ */}
    <div className="shrink-0 bg-zinc-50/80 dark:bg-[#161b22] border-b border-zinc-200 dark:border-[#30363d]">
      {/* Top Accent Line */}
      <div className={cn("h-1 w-full", theme.solid)} />

      {/* Title & Actions Row */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
            "bg-gradient-to-br",
            mode === 'sale' && "from-orange-500/20 to-amber-500/10 dark:from-orange-500/30 dark:to-orange-600/20",
            mode === 'return' && "from-blue-500/20 to-indigo-500/10 dark:from-blue-500/30 dark:to-blue-600/20",
            mode === 'loss' && "from-red-500/20 to-rose-500/10 dark:from-red-500/30 dark:to-red-600/20",
            theme.text
          )}>
            <Icon className="w-4.5 h-4.5" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-bold text-sm text-zinc-800 dark:text-[#e6edf3]">{theme.name}</h2>
            <p className="text-[10px] text-zinc-500 dark:text-[#8b949e]"><span className="font-numeric">{itemsCount}</span> منتج</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onHoldCart && (
            <button
              onClick={onHoldCart}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 dark:text-[#8b949e] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
              title="طلب جديد"
            >
              <Plus className="w-4.5 h-4.5" strokeWidth={2} />
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 dark:text-[#8b949e] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
              title="مسح"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Tabs Row ═══ */}
      {tabs.length > 1 && onSwitchTab && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab, idx) => {
              const isActive = tab.id === activeTabId;
              const tabItemsCount = (tab.cartItems?.length || 0);
              const hasItems = tabItemsCount > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSwitchTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                    isActive
                      ? cn("bg-gradient-to-r text-white shadow-sm", theme.gradient)
                      : hasItems
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <span className="max-w-[60px] truncate">
                    {tab.customerName || `#${idx + 1}`}
                  </span>
                  {hasItems && (
                    <span className={cn(
                      "min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center font-numeric",
                      isActive ? "bg-white/25 text-white" : "bg-zinc-300 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-200"
                    )}>
                      {tabItemsCount}
                    </span>
                  )}
                  {!isActive && tabs.length > 1 && onRemoveTab && (
                    <div
                      onClick={(e) => { e.stopPropagation(); onRemoveTab(tab.id); }}
                      className="w-4 h-4 -mr-1 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemoveTab(tab.id);
                        }
                      }}
                    >
                      <X className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Customer Row - Simplified ═══ */}
      {onSelectCustomer && mode !== 'loss' && (
        <div className="px-3 pb-2.5">
          <button
            onClick={onSelectCustomer}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-[#30363d] hover:bg-zinc-50 dark:hover:bg-[#1c2128] hover:border-zinc-300 dark:hover:border-[#484f58] transition-all group shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
                customerName
                  ? "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-600/30 dark:to-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                  : "bg-zinc-100 dark:bg-[#21262d] text-zinc-500 dark:text-[#8b949e] border border-zinc-200 dark:border-[#30363d]"
              )}>
                {customerName ? customerName[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-700 dark:text-[#e6edf3]">
                  {customerName || 'زبون عابر'}
                </span>
                {mode === 'sale' && saleMode !== 'normal' && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm",
                    saleMode === 'discount' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30" :
                    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                  )}>
                    {saleModeConfig.label}
                  </span>
                )}
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-zinc-400 dark:text-[#6e7681] group-hover:text-zinc-600 dark:group-hover:text-[#8b949e] transition-colors" />
          </button>
        </div>
      )}

      {/* ═══ Loss Description Field - سبب الخسارة ═══ */}
      {mode === 'loss' && onLossDescriptionChange && (
        <div className="px-3 pb-2.5">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <label className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              سبب الخسارة (مطلوب)
            </label>
            <Textarea
              placeholder="اكتب سبب الخسارة هنا... مثال: تلف أثناء النقل، انتهاء صلاحية..."
              value={lossDescription}
              onChange={(e) => onLossDescriptionChange(e.target.value)}
              className={cn(
                "min-h-[60px] text-sm resize-none bg-white dark:bg-zinc-800",
                "border-red-300 dark:border-red-700",
                "focus:border-red-500 focus:ring-red-500 dark:focus:border-red-500",
                "placeholder:text-red-300 dark:placeholder:text-red-700"
              )}
            />
            {!lossDescription?.trim() && items.length > 0 && (
              <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                يجب كتابة سبب الخسارة للمتابعة
              </p>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ═══ Cart Items ═══ */}
    <ScrollArea className="flex-1 bg-gradient-to-b from-zinc-50/80 to-zinc-100/50 dark:from-[#0f1419] dark:to-[#0d1117]">
      <div className="p-3 space-y-2">
        {items.map((item, index) => (
          <CartItemCard
            key={`${item.product.id}-${index}`}
            item={item}
            index={index}
            theme={theme}
            onUpdateQuantity={onUpdateQuantity}
            onUpdatePrice={onUpdatePrice}
            onRemoveItem={onRemoveItem}
            onShowDetails={onEditItem}
          />
        ))}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-white dark:bg-[#161b22] shadow-sm border border-zinc-200 dark:border-[#30363d]", theme.text)}>
              <Icon className="w-8 h-8 opacity-60" />
            </div>
            <p className="text-sm font-semibold text-zinc-500 dark:text-[#8b949e]">ابدأ بإضافة منتجات</p>
            <p className="text-xs text-zinc-400 dark:text-[#6e7681] mt-1">اضغط على أي منتج لإضافته</p>
          </div>
        )}
      </div>
    </ScrollArea>

    {/* ═══ Footer ═══ */}
    <div className="bg-white dark:bg-[#161b22] border-t border-zinc-200 dark:border-[#30363d] p-3 pt-0 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.4)] z-20">

      {/* Totals Section */}
      <div className="py-4 space-y-2.5">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-zinc-600 dark:text-[#8b949e] text-xs">
          <span className="font-medium">المجموع الفرعي</span>
          <div className="flex items-baseline gap-1">
            <span className="font-numeric font-semibold">{formatPrice(subtotal)}</span>
            <span className="text-[10px] text-zinc-400 dark:text-[#6e7681]">د.ج</span>
          </div>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">خصم</span>
              <span className="bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-numeric border border-amber-200 dark:border-amber-500/30">{discount}%</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px]">د.ج</span>
              <span className="font-numeric font-semibold">- {formatPrice((subtotal * discount) / 100)}</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-3 border-t border-dashed border-zinc-300 dark:border-[#30363d]">
          <span className="text-base font-bold text-zinc-800 dark:text-[#e6edf3]">الإجمالي</span>
          <div className={cn("flex items-baseline gap-1.5", theme.text)}>
            <span className="text-2xl font-black font-numeric tracking-tight">{formatPrice(total)}</span>
            <span className="text-xs text-zinc-500 dark:text-[#8b949e] font-medium">د.ج</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Primary Button: Solid Color */}
        <Button
          onClick={onCheckout}
          disabled={isSubmitting || items.length === 0 || !canCheckoutLoss}
          className={cn(
            "flex-1 h-12 rounded-xl text-white text-base font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg",
            theme.solid,
            "hover:brightness-110",
            "disabled:opacity-50 disabled:shadow-none disabled:transform-none"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon className="w-5 h-5" strokeWidth={2.5} />
              <span>{checkoutLabel}</span>
            </span>
          )}
        </Button>

        {/* Secondary Button: Outline Colored */}
        {mode === 'sale' && onQuickCheckout && (
          <Button
            onClick={onQuickCheckout}
            disabled={isSubmitting || items.length === 0}
            className={cn(
              "h-12 w-12 rounded-xl p-0 shrink-0 border-2 bg-transparent",
              theme.border,
              theme.text,
              "hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all",
              "disabled:opacity-50"
            )}
            title="بيع سريع (F12)"
          >
            <Zap className="w-6 h-6" strokeWidth={2.5} />
          </Button>
        )}
      </div>
    </div>
  </div>
  );
});

TitaniumCart.displayName = 'TitaniumCart';

export default TitaniumCart;
