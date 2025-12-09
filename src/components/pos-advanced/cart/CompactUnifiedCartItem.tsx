/**
 * 🛒 Compact Unified Cart Item
 *
 * عنصر سلة موحد ومضغوط لجميع أنواع البيع
 * - تصميم موحد (~70 بكسل بدلاً من 250-300)
 * - زر "عدّل" للتعديل السريع عبر Modal
 * - عرض واضح للكمية والسعر
 */

import React, { useMemo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import {
  Package,
  Trash2,
  Scale,
  Box,
  Ruler,
  Plus,
  Minus,
  Edit3,
  AlertTriangle
} from 'lucide-react';
import type { SellingUnit, SaleType } from '@/lib/pricing/wholesalePricing';
import { getWeightUnitLabel } from '@/lib/pricing/wholesalePricing';
import { SaleTypeBadge } from '@/components/pos/SaleTypeSelector';

interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
  saleType?: SaleType;
  isWholesale?: boolean;
  originalPrice?: number;
  sellingUnit?: SellingUnit;
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  pricePerWeightUnit?: number;
  boxCount?: number;
  unitsPerBox?: number;
  boxPrice?: number;
  length?: number;
  pricePerMeter?: number;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
}

interface CompactUnifiedCartItemProps {
  item: CartItem;
  index: number;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onQuickQuantityChange?: (index: number, delta: number) => void;
  isReturn?: boolean;
}

const CompactUnifiedCartItem: React.FC<CompactUnifiedCartItemProps> = ({
  item,
  index,
  onRemove,
  onEdit,
  onQuickQuantityChange,
  isReturn = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // نوع البيع الحالي
  const sellingUnit = item.sellingUnit || 'piece';

  // معلومات العرض حسب نوع البيع
  const displayInfo = useMemo(() => {
    switch (sellingUnit) {
      case 'weight':
        const weightLabel = getWeightUnitLabel(item.weightUnit || item.product.weight_unit || 'kg');
        return {
          value: item.weight || 1,
          unit: weightLabel,
          pricePerUnit: item.pricePerWeightUnit || item.product.price_per_weight_unit || 0,
          icon: <Scale className="w-3 h-3" />,
          colorClass: 'text-emerald-600 dark:text-emerald-400',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/30'
        };
      case 'box':
        return {
          value: item.boxCount || 1,
          unit: 'كرتون',
          pricePerUnit: item.boxPrice || item.product.box_price || 0,
          icon: <Box className="w-3 h-3" />,
          colorClass: 'text-blue-600 dark:text-blue-400',
          bgClass: 'bg-blue-50 dark:bg-blue-950/30',
          info: `${item.unitsPerBox || item.product.units_per_box || 1} وحدة`
        };
      case 'meter':
        return {
          value: item.length || 1,
          unit: 'م',
          pricePerUnit: item.pricePerMeter || item.product.price_per_meter || 0,
          icon: <Ruler className="w-3 h-3" />,
          colorClass: 'text-purple-600 dark:text-purple-400',
          bgClass: 'bg-purple-50 dark:bg-purple-950/30'
        };
      case 'piece':
      default:
        return {
          value: item.quantity,
          unit: '',
          pricePerUnit: item.customPrice || item.variantPrice || item.product.price || 0,
          icon: <Package className="w-3 h-3" />,
          colorClass: 'text-slate-600 dark:text-slate-400',
          bgClass: ''
        };
    }
  }, [item, sellingUnit]);

  // حساب الإجمالي
  const total = useMemo(() => {
    return displayInfo.value * displayInfo.pricePerUnit;
  }, [displayInfo]);

  // صورة المنتج
  const imageSrc = item.variantImage ||
    (item.product as any).thumbnail_base64 ||
    item.product.thumbnail_image ||
    item.product.thumbnailImage ||
    (item.product.images && item.product.images[0]);

  // التحقق من المتطلبات (الدفعات/الأرقام التسلسلية)
  const hasWarning = useMemo(() => {
    if (item.product.track_serial_numbers && item.product.require_serial_on_sale !== false) {
      const requiredSerials = item.quantity;
      const providedSerials = item.serialNumbers?.length || 0;
      if (providedSerials < requiredSerials) return true;
    }
    if (item.product.track_batches && !item.batchId) return true;
    return false;
  }, [item]);

  // تغيير سريع للكمية (للقطع فقط)
  const handleQuickIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (sellingUnit === 'piece' && onQuickQuantityChange) {
      onQuickQuantityChange(index, 1);
    }
  }, [index, sellingUnit, onQuickQuantityChange]);

  const handleQuickDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (sellingUnit === 'piece' && onQuickQuantityChange && displayInfo.value > 1) {
      onQuickQuantityChange(index, -1);
    }
  }, [index, sellingUnit, onQuickQuantityChange, displayInfo.value]);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200",
        isReturn
          ? "border-amber-300/50 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/20"
          : "border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm",
        hasWarning && "border-yellow-400 dark:border-yellow-600 ring-1 ring-yellow-400/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* صورة المنتج */}
      <div className="relative w-11 h-11 flex-shrink-0 bg-muted rounded-md overflow-hidden border border-border/50">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={cn(
          "w-full h-full flex items-center justify-center",
          imageSrc ? "hidden" : ""
        )}>
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* أيقونة نوع البيع على الصورة */}
        {sellingUnit !== 'piece' && (
          <div className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900",
            displayInfo.bgClass || 'bg-slate-100'
          )}>
            <span className={displayInfo.colorClass}>{displayInfo.icon}</span>
          </div>
        )}
      </div>

      {/* معلومات المنتج */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {/* الاسم */}
        <h4 className="text-sm font-semibold leading-tight line-clamp-1 text-foreground">
          {item.product.name}
        </h4>

        {/* المتغيرات والكمية */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* اللون والحجم */}
          {(item.colorName || item.sizeName) && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
              {item.colorName && item.colorCode && (
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1 align-middle border border-border"
                  style={{ backgroundColor: item.colorCode }}
                />
              )}
              {item.colorName}
              {item.colorName && item.sizeName && ' • '}
              {item.sizeName}
            </span>
          )}

          {/* شارة الجملة */}
          {item.saleType && item.saleType !== 'retail' && (
            <SaleTypeBadge saleType={item.saleType} size="xs" />
          )}

          {/* الكمية/القيمة */}
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1",
            displayInfo.bgClass || 'bg-muted/50',
            displayInfo.colorClass || 'text-foreground'
          )}>
            {displayInfo.icon}
            <span>{displayInfo.value}</span>
            {displayInfo.unit && <span>{displayInfo.unit}</span>}
          </span>

          {/* معلومات إضافية للكرتون */}
          {sellingUnit === 'box' && displayInfo.info && (
            <span className="text-[9px] text-muted-foreground">
              ({displayInfo.info})
            </span>
          )}

          {/* تحذير */}
          {hasWarning && (
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
          )}
        </div>
      </div>

      {/* تحكمات سريعة للقطع */}
      {sellingUnit === 'piece' && onQuickQuantityChange && (
        <div className={cn(
          "flex items-center gap-0.5 transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickDecrement}
            disabled={displayInfo.value <= 1}
            className="h-6 w-6 p-0 rounded hover:bg-muted"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickIncrement}
            className="h-6 w-6 p-0 rounded hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* السعر */}
      <div className="flex-shrink-0 text-right min-w-[70px]">
        {displayInfo.pricePerUnit !== total && (
          <div className="text-[10px] text-muted-foreground leading-none">
            {displayInfo.pricePerUnit.toLocaleString('ar-DZ')}
          </div>
        )}
        <div className="text-sm font-bold text-foreground leading-tight">
          {total.toLocaleString('ar-DZ')}
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* زر التعديل */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(index)}
          className={cn(
            "h-7 w-7 p-0 rounded transition-all",
            displayInfo.colorClass.includes('emerald') && "hover:bg-emerald-100 hover:text-emerald-700",
            displayInfo.colorClass.includes('blue') && "hover:bg-blue-100 hover:text-blue-700",
            displayInfo.colorClass.includes('purple') && "hover:bg-purple-100 hover:text-purple-700",
            !displayInfo.colorClass.includes('emerald') && !displayInfo.colorClass.includes('blue') && !displayInfo.colorClass.includes('purple') && "hover:bg-primary/10 hover:text-primary"
          )}
          title="تعديل"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </Button>

        {/* زر الحذف */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-7 w-7 p-0 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          title="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default React.memo(CompactUnifiedCartItem);
