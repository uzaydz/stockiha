
/**
 * 💎 TitaniumProductCard - The Modern Arabic Edition
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Design Philosophy: "Clarity & Cultural Resonance"
 * - Layout: Balanced 60/40 Split. Focused on readability.
 * - language: Native Arabic Units (قطعة, كغ, متر, علبة).
 * - Aesthetics: Clean lines, subtle depth, high-contrast text.
 * - Interaction: Smooth, predictable, and engaging.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  Star,
  Layers,
  Scale,
  Ruler,
  Package,
  RotateCcw,
  AlertOctagon,
  Box,
  Plus,
  Zap
} from 'lucide-react';
import { ProductItemProps } from '../types';
import ProductImage from '@/components/store/ProductImage';
import { getAvailableSellingUnits } from '@/lib/pricing/wholesalePricing';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type StockStatus = 'high' | 'medium' | 'low' | 'empty';

interface StockInfo {
  value: number;
  unit: string;
  type: 'piece' | 'weight' | 'meter' | 'box';
  status: StockStatus;
  displayValue: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const getStockStatus = (value: number, type: string): StockStatus => {
  if (value <= 0) return 'empty';
  const thresholds = {
    piece: { low: 5, medium: 20 },
    weight: { low: 2, medium: 10 },
    meter: { low: 10, medium: 50 },
    box: { low: 3, medium: 10 }
  };
  const threshold = thresholds[type as keyof typeof thresholds] || thresholds.piece;
  if (value <= threshold.low) return 'low';
  if (value <= threshold.medium) return 'medium';
  return 'high';
};

const formatPrice = (price: number): string => {
  // استخدام أرقام إنجليزية للوضوح والاتساق
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(price);
};

// 💎 CSS class للأرقام - خط JetBrains Mono المثالي
const numberStyle = "font-numeric";

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const TitaniumProductCard: React.FC<ProductItemProps> = memo(({
  product,
  favoriteProducts,
  isReturnMode,
  isLossMode = false,
  onAddToCart
}) => {

  // ⚡ Logic: Determine Stock Display with Arabic Units
  const stockInfo = useMemo((): StockInfo => {
    const availableUnits = getAvailableSellingUnits(product as any);

    if (availableUnits.includes('weight') && product.sell_by_weight) {
      const v = (product as any).available_weight || 0;
      return { value: v, unit: 'كغ', type: 'weight', status: getStockStatus(v, 'weight'), displayValue: v.toFixed(1) };
    }
    if (availableUnits.includes('meter') && product.sell_by_meter) {
      const v = (product as any).available_length || 0;
      return { value: v, unit: 'متر', type: 'meter', status: getStockStatus(v, 'meter'), displayValue: v.toString() };
    }
    if (availableUnits.includes('box') && product.sell_by_box) {
      const v = (product as any).available_boxes || 0;
      return { value: v, unit: 'علبة', type: 'box', status: getStockStatus(v, 'box'), displayValue: v.toString() };
    }

    // Default: Piece
    const v = product.stock_quantity || 0;
    return { value: v, unit: 'قطعة', type: 'piece', status: getStockStatus(v, 'piece'), displayValue: v.toString() };
  }, [product]);

  const isFavorite = useMemo(() => favoriteProducts.some(fav => fav.id === product.id), [favoriteProducts, product.id]);

  const handleClick = useCallback(() => {
    onAddToCart(product);
  }, [product, onAddToCart]);

  // ⚡ Logic: Image Selection
  const imageUrl = useMemo(() => {
    if ((product as any).thumbnail_base64?.trim()) return (product as any).thumbnail_base64;
    if (product.thumbnail_image?.trim()) return product.thumbnail_image;
    if (product.images?.length > 0) return product.images[0];
    const local = (product as any).images_base64;
    if (local) { try { const p = JSON.parse(local); if (p?.length) return p[0]; } catch { } }
    return null;
  }, [product]);

  // 🎨 Style Configuration (Modes)
  const styleConfig = useMemo(() => {
    if (isLossMode) return {
      container: 'border-orange-300/50 dark:border-orange-500/30 bg-orange-50/30 dark:bg-orange-500/5',
      badge: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm',
      badgeText: 'خسارة',
      iconStart: <AlertOctagon className="w-3.5 h-3.5" />,
      actionBtn: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md'
    };
    if (isReturnMode) return {
      container: 'border-blue-300/50 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-500/5',
      badge: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm',
      badgeText: 'إرجاع',
      iconStart: <RotateCcw className="w-3.5 h-3.5" />,
      actionBtn: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-md'
    };
    return {
      container: 'border-zinc-200 dark:border-[#30363d] bg-white dark:bg-[#161b22]',
      badge: null,
      badgeText: null,
      iconStart: null,
      actionBtn: 'bg-zinc-900 dark:bg-orange-500 text-white hover:scale-105 shadow-md'
    };
  }, [isLossMode, isReturnMode]);

  // 📦 Stock Badge Style
  const stockBadgeStyle = useMemo(() => {
    if (stockInfo.status === 'empty') return "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30";
    if (stockInfo.status === 'low') return "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
    if (stockInfo.status === 'medium') return "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
    return "bg-zinc-100 dark:bg-[#21262d] text-zinc-700 dark:text-[#8b949e] border-zinc-200 dark:border-[#30363d]";
  }, [stockInfo.status]);

  return (
    <div
      onClick={handleClick}
      dir="rtl"
      className={cn(
        // Dimensions & Base
        "group relative flex flex-col h-full w-full overflow-hidden",
        "rounded-2xl cursor-pointer select-none",

        // Borders & Background
        "border transition-all duration-300",
        styleConfig.container,

        // Shadow & Hover interactions
        "shadow-sm hover:shadow-lg hover:border-zinc-300 dark:hover:border-[#484f58]",
        "hover:-translate-y-0.5",

        // Stock Opacity
        stockInfo.status === 'empty' && "opacity-75 grayscale-[0.8]"
      )}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          A. MEDIA SECTION (Top 60%)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative h-[60%] w-full bg-zinc-100 dark:bg-[#21262d] overflow-hidden">
        <ProductImage
          src={imageUrl || ''}
          alt={product.name}
          productName={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          size="medium"
        />

        {/* 🏷️ Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start pointer-events-none z-10">
          {/* Left: Mode Badge Only */}
          <div className="flex flex-col gap-1.5 items-start">
            {styleConfig.badge && (
              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md flex items-center gap-1", styleConfig.badge)}>
                {styleConfig.iconStart}
                {styleConfig.badgeText}
              </span>
            )}
          </div>

          {/* Right: Favorite */}
          {isFavorite && (
            <div className="w-7 h-7 rounded-full bg-white/90 dark:bg-[#21262d]/90 backdrop-blur-md flex items-center justify-center shadow-sm pointer-events-auto border border-transparent dark:border-[#30363d]">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
          )}
        </div>

        {/* 🚫 Out of Stock Overlay - Elegant & Central */}
        {stockInfo.status === 'empty' && (
          <div className="absolute inset-0 z-20 bg-white/40 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
            <div className="px-4 py-1.5 bg-red-500/90 text-white text-xs font-bold rounded-lg shadow-xl backdrop-blur-md border border-white/20 transform -rotate-3">
              نفد من المخزون
            </div>
          </div>
        )}

        {/* 🏷️ Bottom Indicators (Unit & Variants) - New Location */}
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1 pointer-events-none z-10">
          {/* Unit Type */}
          {(product.sell_by_weight || product.sell_by_meter || product.sell_by_box) && (
            <div className="h-6 px-2 rounded-lg bg-zinc-900/80 dark:bg-[#0f1419]/90 backdrop-blur-md flex items-center gap-1.5 text-white shadow-md border border-white/10 dark:border-[#30363d]">
              {product.sell_by_weight ? <Scale className="w-3.5 h-3.5 text-sky-400" /> :
                product.sell_by_meter ? <Ruler className="w-3.5 h-3.5 text-amber-400" /> :
                  <Box className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="text-[10px] font-bold">
                {product.sell_by_weight ? 'وزن' : product.sell_by_meter ? 'متر' : 'علبة'}
              </span>
            </div>
          )}

          {/* Variants Indicator */}
          {(product as any).has_variants && (
            <div className="h-6 px-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 backdrop-blur-md flex items-center gap-1.5 text-white shadow-md border border-white/20">
              <Layers className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] font-bold">خيارات</span>
            </div>
          )}
        </div>

        {/* 🎬 Quick Add Button (Floating on Image Bottom-Left) */}
        {!isLossMode && !isReturnMode && stockInfo.status !== 'empty' && (
          <div className={cn(
            "absolute bottom-2 left-2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
            "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
            styleConfig.actionBtn
          )}>
            <Plus className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          B. INFO SECTION (Bottom 40%)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative h-[40%] flex flex-col p-3.5 gap-2 bg-white dark:bg-[#161b22]">

        {/* 1. Title Area - Cleaned up */}
        <div className="flex-1 min-h-0 pt-0.5">
          <h3 className="text-[14px] font-bold text-zinc-800 dark:text-[#e6edf3] leading-relaxed line-clamp-2" title={product.name}>
            {product.name}
          </h3>
        </div>

        {/* 2. Price & Stock Row */}
        <div className="flex items-end justify-between shrink-0">

          {/* Price Block - العملة على اليمين */}
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 dark:text-[#6e7681] font-medium mb-[-2px]">السعر</span>
            <div className="flex items-baseline gap-1.5 flex-row-reverse">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#8b949e]">د.ج</span>
              <span className={cn("text-xl font-bold text-zinc-900 dark:text-[#e6edf3]", numberStyle)}>
                {formatPrice(product.price || 0)}
              </span>
            </div>
          </div>

          {/* Stock Pill - المخزون */}
          {stockInfo.status !== 'empty' && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm flex-row-reverse",
              stockBadgeStyle
            )}>
              <span className="text-[9px] font-medium opacity-80">{stockInfo.unit}</span>
              <span className={cn("text-sm font-bold", numberStyle)}>{stockInfo.displayValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.product.id === next.product.id &&
    prev.product.stock_quantity === next.product.stock_quantity &&
    prev.product.updatedAt === next.product.updatedAt &&
    prev.isLossMode === next.isLossMode &&
    prev.isReturnMode === next.isReturnMode;
});

TitaniumProductCard.displayName = 'TitaniumProductCard';

export default TitaniumProductCard;

