/**
 * 📝 SmartPurchaseRow - سطر المشتريات الذكي
 * ============================================================
 *
 * سطر واحد في جدول المشتريات مع كل الميزات الذكية:
 * - اختيار الوحدة
 * - حساب التكلفة الأساسية
 * - التسعير الذكي
 * - عرض المخزون
 *
 * ============================================================
 */

import React, { useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Trash2,
  Grid3X3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CompactUnitSelector, UnitBadge } from './UnitSelector';
import { useUnitConversion, productToUnitConfig } from '../hooks/useUnitConversion';
import { useSmartPricing, getAlertColor } from '../hooks/useSmartPricing';
import type { SmartPurchaseItem, PurchaseUnitType } from '../types/smart-purchase.types';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

interface SmartPurchaseRowProps {
  /** بيانات العنصر */
  item: SmartPurchaseItem;
  /** رقم الصف */
  index: number;
  /** عند التحديث */
  onUpdate: (index: number, updates: Partial<SmartPurchaseItem>) => void;
  /** عند الحذف */
  onRemove: (index: number) => void;
  /** فتح مصفوفة المتغيرات */
  onOpenMatrix?: (productId: string) => void;
  /** هل الوضع المضغوط */
  compact?: boolean;
  /** هل Turbo Mode */
  turboMode?: boolean;
  /** اللغة */
  locale?: 'ar' | 'en';
  /** معطل */
  disabled?: boolean;
  /** محدد */
  selected?: boolean;
  /** عند النقر */
  onClick?: () => void;
}

interface ProductInfo {
  sellByBox?: boolean;
  unitsPerBox?: number;
  sellByMeter?: boolean;
  rollLength?: number;
  sellByWeight?: boolean;
  purchasePrice?: number;
  price?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function SmartPurchaseRow({
  item,
  index,
  onUpdate,
  onRemove,
  onOpenMatrix,
  compact = false,
  turboMode = false,
  locale = 'ar',
  disabled = false,
  selected = false,
  onClick,
}: SmartPurchaseRowProps) {
  // ⚡ إعدادات الوحدة للمنتج (من بيانات المنتج الفعلية)
  const productConfig = useMemo(() => {
    return productToUnitConfig({
      sell_by_box: item.sellByBox ?? false,
      units_per_box: item.unitsPerBox,
      sell_by_meter: item.sellByMeter ?? false,
      roll_length: item.rollLength,
      sell_by_weight: item.sellByWeight ?? false,
    });
  }, [item.sellByBox, item.unitsPerBox, item.sellByMeter, item.rollLength, item.sellByWeight]);

  // تحويل الوحدات
  const {
    availableUnits,
    toBaseQuantity,
    toBaseCost,
    conversionDisplay,
    stockDisplay,
  } = useUnitConversion(productConfig, item.purchaseUnit);

  // التسعير الذكي
  const pricing = useSmartPricing({
    oldCost: item.baseCost,
    newCost: item.unitCost / (item.conversionFactor || 1),
    currentSellingPrice: item.currentSellingPrice || 0,
    targetMargin: 30,
  });

  // تحديث الوحدة
  const handleUnitChange = useCallback((unit: PurchaseUnitType) => {
    const unitInfo = availableUnits.find(u => u.type === unit);
    const factor = unitInfo?.conversionFactor || 1;

    onUpdate(index, {
      purchaseUnit: unit,
      conversionFactor: factor,
      baseQuantity: toBaseQuantity(item.purchaseQuantity),
      baseCost: toBaseCost(item.unitCost),
    });
  }, [index, onUpdate, availableUnits, toBaseQuantity, toBaseCost, item.purchaseQuantity, item.unitCost]);

  // تحديث الكمية
  const handleQuantityChange = useCallback((value: number) => {
    const qty = Math.max(0, value);
    const baseQty = qty * item.conversionFactor;
    const subtotal = qty * item.unitCost;
    const taxAmount = subtotal * (item.taxRate / 100);
    const totalCost = subtotal + taxAmount;

    onUpdate(index, {
      purchaseQuantity: qty,
      baseQuantity: baseQty,
      subtotal,
      taxAmount,
      totalCost,
      newStock: item.currentStock + baseQty,
      stockDisplay: stockDisplay(item.currentStock + baseQty),
    });
  }, [index, onUpdate, item.conversionFactor, item.unitCost, item.taxRate, item.currentStock, stockDisplay]);

  // تحديث سعر الوحدة
  const handleUnitCostChange = useCallback((value: number) => {
    const cost = Math.max(0, value);
    const baseCost = cost / item.conversionFactor;
    const subtotal = item.purchaseQuantity * cost;
    const taxAmount = subtotal * (item.taxRate / 100);
    const totalCost = subtotal + taxAmount;

    onUpdate(index, {
      unitCost: cost,
      baseCost,
      subtotal,
      taxAmount,
      totalCost,
      priceChanged: cost !== item.unitCost,
    });
  }, [index, onUpdate, item.conversionFactor, item.purchaseQuantity, item.taxRate, item.unitCost]);

  // تحديث نسبة الضريبة
  const handleTaxRateChange = useCallback((value: number) => {
    const rate = Math.min(100, Math.max(0, value));
    const taxAmount = item.subtotal * (rate / 100);
    const totalCost = item.subtotal + taxAmount;

    onUpdate(index, {
      taxRate: rate,
      taxAmount,
      totalCost,
    });
  }, [index, onUpdate, item.subtotal]);

  // تنسيق العملة
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 Compact Mode
  // ═══════════════════════════════════════════════════════════════════════════

  if (compact || turboMode) {
    return (
      <tr
        className={cn(
          "hover:bg-muted/50 transition-colors",
          selected && "bg-primary/5",
          disabled && "opacity-50"
        )}
        onClick={onClick}
      >
        {/* المنتج */}
        <td className="p-2 border-b">
          <div className="flex items-center gap-2">
            {item.productImage && (
              <img
                src={item.productImage}
                alt=""
                className="w-8 h-8 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="font-medium truncate text-sm">{item.productName}</div>
              {item.variantDisplayName && (
                <div className="text-xs text-muted-foreground truncate">
                  {item.variantDisplayName}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* الوحدة */}
        <td className="p-2 border-b">
          <CompactUnitSelector
            availableUnits={availableUnits}
            value={item.purchaseUnit}
            onChange={handleUnitChange}
            disabled={disabled}
            locale={locale}
          />
        </td>

        {/* الكمية */}
        <td className="p-2 border-b">
          <Input
            type="number"
            value={item.purchaseQuantity || ''}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
            className="w-20 h-8 text-center text-sm"
            disabled={disabled}
            min={0}
          />
        </td>

        {/* سعر الوحدة */}
        <td className="p-2 border-b">
          <Input
            type="number"
            value={item.unitCost || ''}
            onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
            className="w-24 h-8 text-center text-sm"
            disabled={disabled}
            min={0}
          />
        </td>

        {/* الإجمالي */}
        <td className="p-2 border-b text-left font-medium">
          {formatCurrency(item.totalCost)}
        </td>

        {/* الإجراءات */}
        <td className="p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(index)}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 Full Mode
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div
      className={cn(
        "p-4 bg-card rounded-lg border transition-all",
        selected && "ring-2 ring-primary",
        disabled && "opacity-50",
        "hover:shadow-md"
      )}
      onClick={onClick}
    >
      {/* الصف العلوي - المنتج والإجراءات */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {item.productImage && (
            <img
              src={item.productImage}
              alt=""
              className="w-14 h-14 rounded-lg object-cover border"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{item.productName}</div>
            {item.variantDisplayName && (
              <Badge variant="secondary" className="mt-1">
                {item.variantDisplayName}
              </Badge>
            )}
            {item.productSku && (
              <div className="text-xs text-muted-foreground mt-1">
                SKU: {item.productSku}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* زر المصفوفة */}
          {item.variantType !== 'simple' && onOpenMatrix && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onOpenMatrix(item.productId || '')}
                    disabled={disabled}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>مصفوفة المتغيرات</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* زر الحذف */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onRemove(index)}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* الصف الثاني - الوحدة والكمية والسعر */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* الوحدة */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">الوحدة</label>
          <CompactUnitSelector
            availableUnits={availableUnits}
            value={item.purchaseUnit}
            onChange={handleUnitChange}
            disabled={disabled}
            locale={locale}
          />
          {conversionDisplay && (
            <span className="text-xs text-muted-foreground mt-1 block">
              {conversionDisplay}
            </span>
          )}
        </div>

        {/* الكمية */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">الكمية</label>
          <Input
            type="number"
            value={item.purchaseQuantity || ''}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            min={0}
            className="text-center"
          />
          {item.conversionFactor > 1 && (
            <span className="text-xs text-muted-foreground mt-1 block">
              = {item.baseQuantity} وحدة أساسية
            </span>
          )}
        </div>

        {/* سعر الوحدة */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">سعر الوحدة</label>
          <div className="relative">
            <Input
              type="number"
              value={item.unitCost || ''}
              onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              min={0}
              className="text-center pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              د.ج
            </span>
          </div>
          {item.conversionFactor > 1 && (
            <span className="text-xs text-muted-foreground mt-1 block">
              = {formatCurrency(item.baseCost)} / وحدة
            </span>
          )}
        </div>

        {/* الضريبة */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">الضريبة %</label>
          <Input
            type="number"
            value={item.taxRate || ''}
            onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            min={0}
            max={100}
            className="text-center"
          />
        </div>
      </div>

      {/* الصف الثالث - المجاميع والتنبيهات */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between flex-wrap gap-4">
        {/* المخزون */}
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="text-muted-foreground">المخزون:</span>{' '}
            <span className="font-medium">{item.currentStock}</span>
            {item.purchaseQuantity > 0 && (
              <>
                <span className="text-muted-foreground"> ← </span>
                <span className="text-primary font-medium">{item.newStock}</span>
              </>
            )}
          </span>
        </div>

        {/* تنبيه السعر */}
        {pricing.needsPriceAdjustment && item.currentSellingPrice && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "cursor-help",
                    pricing.alertLevel === 'critical' && "border-red-500 text-red-500",
                    pricing.alertLevel === 'warning' && "border-orange-500 text-orange-500",
                    pricing.alertLevel === 'info' && "border-blue-500 text-blue-500",
                  )}
                >
                  {pricing.costIncreased ? (
                    <TrendingUp className="h-3 w-3 ml-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 ml-1" />
                  )}
                  {pricing.costChangePercent > 0 ? '+' : ''}{pricing.costChangePercent.toFixed(1)}%
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  {pricing.alertMessage}
                  <br />
                  السعر المقترح: {formatCurrency(pricing.suggestedPrice)} د.ج
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* المجموع */}
        <div className="text-left mr-auto">
          {item.taxAmount > 0 && (
            <div className="text-xs text-muted-foreground">
              قبل الضريبة: {formatCurrency(item.subtotal)} | الضريبة: {formatCurrency(item.taxAmount)}
            </div>
          )}
          <div className="text-lg font-bold text-primary">
            {formatCurrency(item.totalCost)} د.ج
          </div>
        </div>
      </div>
    </div>
  );
}

export default SmartPurchaseRow;
