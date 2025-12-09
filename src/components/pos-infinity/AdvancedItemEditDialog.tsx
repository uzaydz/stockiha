/**
 * 🔧 AdvancedItemEditDialog - نافذة تعديل البيانات المتقدمة
 * ═══════════════════════════════════════════════════════════════════════════
 * تصميم بسيط ومتناسق مع ألوان الأوضاع (بيع/إرجاع/خسارة)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Scale, Box, Ruler, Package, Check,
  Minus, Plus, Warehouse
} from 'lucide-react';
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

interface AdvancedItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartItem | null;
  index: number;
  onSave: (index: number, updates: Partial<CartItem>) => void;
  mode?: POSMode;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mode Colors
// ═══════════════════════════════════════════════════════════════════════════

const MODE_COLORS = {
  sale: {
    primary: 'bg-orange-500',
    primaryHover: 'hover:bg-orange-600',
    light: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-500/30',
    ring: 'ring-orange-500/20'
  },
  return: {
    primary: 'bg-blue-500',
    primaryHover: 'hover:bg-blue-600',
    light: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30',
    ring: 'ring-blue-500/20'
  },
  loss: {
    primary: 'bg-red-500',
    primaryHover: 'hover:bg-red-600',
    light: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
    ring: 'ring-red-500/20'
  }
};

const UNIT_CONFIG = {
  piece: { label: 'قطعة', icon: Package, shortLabel: 'قطعة' },
  weight: { label: 'وزن', icon: Scale, shortLabel: 'كغ' },
  box: { label: 'كرتون', icon: Box, shortLabel: 'كرتون' },
  meter: { label: 'متر', icon: Ruler, shortLabel: 'م' }
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

// تحويل النص إلى رقم مع دعم الفاصلة العربية والعادية
const parseDecimalInput = (value: string): number => {
  // استبدال الفاصلة بنقطة
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const getAllowedSellingUnits = (product: any): SellingUnit[] => {
  const units: SellingUnit[] = ['piece'];
  if (product?.sell_by_weight) units.push('weight');
  if (product?.sell_by_box) units.push('box');
  if (product?.sell_by_meter) units.push('meter');

  // إذا يُباع فقط بطريقة واحدة
  if (product?.sell_by_weight && !product?.sell_by_box && !product?.sell_by_meter) return ['weight'];
  if (product?.sell_by_box && !product?.sell_by_weight && !product?.sell_by_meter) {
    return product?.allow_single_unit_sale !== false ? ['piece', 'box'] : ['box'];
  }
  if (product?.sell_by_meter && !product?.sell_by_weight && !product?.sell_by_box) return ['meter'];

  return units;
};

const getAvailableStock = (product: any, unit: SellingUnit): number => {
  switch (unit) {
    case 'weight': return product?.available_weight || 0;
    case 'box': return product?.available_boxes || Math.floor((product?.stock_quantity || 0) / (product?.units_per_box || 1));
    case 'meter': return product?.available_length || 0;
    default: return product?.stock_quantity || 0;
  }
};

const getUnitSuffix = (product: any, unit: SellingUnit): string => {
  switch (unit) {
    case 'weight': return product?.weight_unit === 'g' ? 'غ' : 'كغ';
    case 'box': return 'كرتون';
    case 'meter': return 'م';
    default: return 'قطعة';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

const AdvancedItemEditDialog: React.FC<AdvancedItemEditDialogProps> = ({
  open,
  onOpenChange,
  item,
  index,
  onSave,
  mode = 'sale'
}) => {
  const colors = MODE_COLORS[mode];

  // State
  const [sellingUnit, setSellingUnit] = useState<SellingUnit>('piece');
  const [value, setValue] = useState(1);
  const [inputValue, setInputValue] = useState('1'); // للإدخال النصي مع دعم الفاصلة
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>('kg');

  // هل هذا النوع يدعم الأرقام العشرية؟
  const isDecimal = sellingUnit === 'weight' || sellingUnit === 'meter';

  // Computed
  const allowedUnits = useMemo(() => item ? getAllowedSellingUnits(item.product) : ['piece'], [item]);
  const product = item?.product;
  const available = product ? getAvailableStock(product, sellingUnit) : 0;
  const remaining = Math.max(0, available - value);
  const suffix = product ? getUnitSuffix(product, sellingUnit) : '';

  // حساب السعر
  const unitPrice = useMemo(() => {
    if (!product) return 0;
    switch (sellingUnit) {
      case 'weight': return product.price_per_weight_unit || product.price || 0;
      case 'box': return product.box_price || (product.price * (product.units_per_box || 1));
      case 'meter': return product.price_per_meter || product.price || 0;
      default: return item?.variantPrice || product.price || 0;
    }
  }, [product, sellingUnit, item]);

  const total = value * unitPrice;

  // معلومات إضافية للكرتون
  const boxInfo = useMemo(() => {
    if (!product?.sell_by_box) return null;
    const unitsPerBox = product.units_per_box || 1;
    const totalPieces = product.stock_quantity || 0;
    const fullBoxes = Math.floor(totalPieces / unitsPerBox);
    const loosePieces = totalPieces % unitsPerBox;
    return { unitsPerBox, fullBoxes, loosePieces };
  }, [product]);

  // Initialize
  useEffect(() => {
    if (item) {
      const initialUnit = item.sellingUnit ||
        (item.product?.sell_by_weight ? 'weight' :
         item.product?.sell_by_box ? 'box' :
         item.product?.sell_by_meter ? 'meter' : 'piece');

      setSellingUnit(allowedUnits.includes(initialUnit) ? initialUnit : allowedUnits[0]);

      let initialValue: number;
      switch (initialUnit) {
        case 'weight': initialValue = item.weight || 0.5; break;
        case 'box': initialValue = item.boxCount || 1; break;
        case 'meter': initialValue = item.length || 1; break;
        default: initialValue = item.quantity || 1;
      }
      setValue(initialValue);
      setInputValue(initialValue.toString());

      setWeightUnit(item.weightUnit || item.product?.weight_unit || 'kg');
    }
  }, [item, allowedUnits]);

  // Handlers
  const handleIncrement = () => {
    const step = sellingUnit === 'piece' || sellingUnit === 'box' ? 1 : 0.1;
    const newVal = Math.min(available, Math.round((value + step) * 100) / 100);
    setValue(newVal);
    setInputValue(newVal.toString());
  };

  const handleDecrement = () => {
    const step = sellingUnit === 'piece' || sellingUnit === 'box' ? 1 : 0.1;
    const minVal = sellingUnit === 'piece' || sellingUnit === 'box' ? 1 : 0.01;
    const newVal = Math.max(minVal, Math.round((value - step) * 100) / 100);
    setValue(newVal);
    setInputValue(newVal.toString());
  };

  // معالجة تغيير الإدخال النصي
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // تحويل مع دعم الفاصلة
    const v = parseDecimalInput(text);
    if (v > 0 && v <= available) {
      setValue(v);
    }
  };

  const handleSave = useCallback(() => {
    const updates: Partial<CartItem> = {
      sellingUnit,
      quantity: sellingUnit === 'piece' ? value : 1,
      weight: sellingUnit === 'weight' ? value : undefined,
      weightUnit: sellingUnit === 'weight' ? weightUnit : undefined,
      boxCount: sellingUnit === 'box' ? value : undefined,
      length: sellingUnit === 'meter' ? value : undefined,
    };
    onSave(index, updates);
    onOpenChange(false);
  }, [index, sellingUnit, value, weightUnit, onSave, onOpenChange]);

  const isValid = value > 0 && value <= available;

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden dark:bg-[#161b22] dark:border-[#30363d]" dir="rtl">
        {/* Header */}
        <div className={cn("px-4 py-3 text-white", colors.primary)}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold text-base">
              {product?.name}
            </DialogTitle>
            {(item.colorName || item.sizeName) && (
              <p className="text-white/80 text-sm">
                {[item.colorName, item.sizeName].filter(Boolean).join(' • ')}
              </p>
            )}
          </DialogHeader>
        </div>

        <div className="p-4 space-y-4">
          {/* اختيار نوع البيع */}
          {allowedUnits.length > 1 && (
            <div className="flex gap-2">
              {allowedUnits.map((unit) => {
                const config = UNIT_CONFIG[unit];
                const Icon = config.icon;
                const isActive = sellingUnit === unit;

                return (
                  <button
                    key={unit}
                    onClick={() => {
                      setSellingUnit(unit);
                      const newVal = unit === 'piece' || unit === 'box' ? 1 : 0.5;
                      setValue(newVal);
                      setInputValue(newVal.toString());
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all text-sm font-medium",
                      isActive
                        ? cn(colors.light, colors.border, colors.text)
                        : "border-zinc-200 dark:border-[#30363d] text-zinc-500 dark:text-[#8b949e] hover:border-zinc-300 dark:hover:border-[#484f58]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* معلومات المخزون - مبسطة */}
          <div className={cn("rounded-lg p-3", colors.light)}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Warehouse className="w-4 h-4" />
                المتوفر
              </span>
              <span className={cn("font-bold", colors.text)}>
                {available} {suffix}
              </span>
            </div>

            {/* معلومات الكرتون */}
            {sellingUnit === 'box' && boxInfo && (
              <div className="mt-2 pt-2 border-t border-current/10 text-xs text-muted-foreground">
                الكرتون = {boxInfo.unitsPerBox} قطعة
              </div>
            )}

            {sellingUnit === 'piece' && boxInfo && (
              <div className="mt-2 pt-2 border-t border-current/10 text-xs text-muted-foreground">
                {boxInfo.fullBoxes} كرتون + {boxInfo.loosePieces} قطعة
              </div>
            )}
          </div>

          {/* إدخال الكمية */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الكمية</span>
              <span className="text-muted-foreground">
                المتبقي: <span className={remaining > 0 ? "text-emerald-600" : "text-red-500"}>{remaining} {suffix}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={value <= (sellingUnit === 'piece' || sellingUnit === 'box' ? 1 : 0.1)}
                className="h-12 w-12 rounded-xl text-lg"
              >
                <Minus className="w-5 h-5" />
              </Button>

              <div className="flex-1 relative">
                <Input
                  type={isDecimal ? "text" : "number"}
                  inputMode={isDecimal ? "decimal" : "numeric"}
                  min={isDecimal ? undefined : 1}
                  max={isDecimal ? undefined : available}
                  step={isDecimal ? undefined : 1}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={isDecimal ? "0,0" : "0"}
                  className="h-12 text-center text-2xl font-bold pr-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {suffix}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={value >= available}
                className="h-12 w-12 rounded-xl text-lg"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* وحدة الوزن */}
            {sellingUnit === 'weight' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setWeightUnit('kg')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                    weightUnit === 'kg' ? cn(colors.primary, "text-white") : "bg-zinc-100 dark:bg-[#21262d] dark:text-[#8b949e]"
                  )}
                >
                  كيلوغرام
                </button>
                <button
                  onClick={() => setWeightUnit('g')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                    weightUnit === 'g' ? cn(colors.primary, "text-white") : "bg-zinc-100 dark:bg-[#21262d] dark:text-[#8b949e]"
                  )}
                >
                  غرام
                </button>
              </div>
            )}
          </div>

          {/* السعر والإجمالي */}
          <div className="bg-zinc-50 dark:bg-[#0f1419] rounded-lg p-3 space-y-2 dark:border dark:border-[#30363d]">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">سعر الوحدة</span>
              <span>{unitPrice.toLocaleString('ar-DZ')} د.ج / {suffix}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">الإجمالي</span>
              <span className={cn("text-xl font-bold", colors.text)}>
                {total.toLocaleString('ar-DZ')} د.ج
              </span>
            </div>
          </div>

          {/* زر الحفظ */}
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className={cn("w-full h-12 text-base font-bold text-white", colors.primary, colors.primaryHover)}
          >
            <Check className="w-5 h-5 ml-2" />
            تأكيد
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedItemEditDialog;
