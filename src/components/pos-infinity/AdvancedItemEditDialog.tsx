/**
 * 🔧 AdvancedItemEditDialog - نافذة تعديل البيانات المتقدمة
 * ═══════════════════════════════════════════════════════════════════════════
 * تصميم شامل يدعم:
 * - أنواع البيع (قطعة/وزن/كرتون/متر)
 * - نوع التسعير (تجزئة/جملة/نصف جملة)
 * - الدفعات والصلاحية
 * - الأرقام التسلسلية
 * - الضمان
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Scale, Box, Ruler, Package, Check,
  Minus, Plus, Warehouse, Tag, Calendar,
  Hash, Shield, AlertTriangle, Clock,
  ShoppingBag, Layers, CheckCircle2
} from 'lucide-react';
import type { POSMode } from './CommandIsland';
import type { SaleType } from '@/lib/pricing/wholesalePricing';
import {
  calculateProductPrice,
  toProductPricingInfo,
  isSaleTypeAvailable,
  getMinQuantityForSaleType,
} from '@/lib/pricing/wholesalePricing';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type SellingUnit = 'piece' | 'weight' | 'box' | 'meter';

interface BatchInfo {
  id: string;
  batch_number: string;
  remaining_quantity: number;
  expiry_date?: string;
  purchase_price?: number;
  received_date?: string;
}

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
  // الدفعات
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  // الأرقام التسلسلية
  serialNumbers?: string[];
  // نوع البيع (جملة/تجزئة)
  saleType?: SaleType;
}

interface AdvancedItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartItem | null;
  index: number;
  onSave: (index: number, updates: Partial<CartItem>) => void;
  mode?: POSMode;
  // بيانات الدفعات (اختياري - يُجلب من المنتج إذا لم يُقدم)
  availableBatches?: BatchInfo[];
  // بيانات الأرقام التسلسلية (اختياري)
  availableSerials?: string[];
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

const SALE_TYPE_CONFIG = {
  retail: { label: 'تجزئة', color: 'bg-blue-500', lightColor: 'bg-blue-50 dark:bg-blue-500/10', textColor: 'text-blue-600' },
  partial_wholesale: { label: 'نصف جملة', color: 'bg-amber-500', lightColor: 'bg-amber-50 dark:bg-amber-500/10', textColor: 'text-amber-600' },
  wholesale: { label: 'جملة', color: 'bg-green-600', lightColor: 'bg-green-50 dark:bg-green-500/10', textColor: 'text-green-600' }
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

const parseDecimalInput = (value: string): number => {
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const getAllowedSellingUnits = (product: any): SellingUnit[] => {
  const units: SellingUnit[] = ['piece'];
  if (product?.sell_by_weight) units.push('weight');
  if (product?.sell_by_box) units.push('box');
  if (product?.sell_by_meter) units.push('meter');

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

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'غير محدد';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getDaysUntilExpiry = (expiryDate?: string): number | null => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
  mode = 'sale',
  availableBatches: externalBatches,
  availableSerials: externalSerials
}) => {
  const colors = MODE_COLORS[mode];

  // ═══ State ═══
  const [sellingUnit, setSellingUnit] = useState<SellingUnit>('piece');
  const [value, setValue] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>('kg');

  // نوع البيع (جملة/تجزئة)
  const [saleType, setSaleType] = useState<SaleType>('retail');

  // الدفعات
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>();
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string | undefined>();

  // الأرقام التسلسلية
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState('');

  // ═══ Computed ═══
  const product = item?.product;
  const isDecimal = sellingUnit === 'weight' || sellingUnit === 'meter';
  const allowedUnits = useMemo(() => item ? getAllowedSellingUnits(item.product) : ['piece'], [item]);
  const available = product ? getAvailableStock(product, sellingUnit) : 0;
  const remaining = Math.max(0, available - value);
  const suffix = product ? getUnitSuffix(product, sellingUnit) : '';

  // الدفعات المتاحة
  const batches = useMemo(() => {
    if (externalBatches) return externalBatches;
    // محاولة الحصول على الدفعات من المنتج
    return product?.batches || [];
  }, [externalBatches, product]);

  // هل يتطلب دفعة؟
  const requiresBatch = product?.track_batches && batches.length > 0;

  // هل يتطلب رقم تسلسلي؟
  const requiresSerial = product?.track_serial_numbers && product?.require_serial_on_sale !== false;

  // هل لديه ضمان؟
  const hasWarranty = product?.has_warranty;
  const warrantyMonths = product?.warranty_duration_months || 0;

  // حساب أنواع البيع المتاحة (جملة/تجزئة)
  const pricingInfo = useMemo(() => product ? toProductPricingInfo(product) : null, [product]);
  const availableSaleTypes = useMemo(() => {
    if (!pricingInfo) return [];
    const types: SaleType[] = ['retail', 'partial_wholesale', 'wholesale'];
    return types.filter(type => isSaleTypeAvailable(pricingInfo, type));
  }, [pricingInfo]);

  // حساب السعر
  const unitPrice = useMemo(() => {
    if (!product) return 0;

    // إذا كان هناك أكثر من نوع تسعير متاح، احسب السعر بناءً على نوع البيع
    if (availableSaleTypes.length > 1 && pricingInfo) {
      const pricing = calculateProductPrice(pricingInfo, sellingUnit === 'piece' ? value : 1, saleType);
      return pricing.unitPrice;
    }

    switch (sellingUnit) {
      case 'weight': return product.price_per_weight_unit || product.price || 0;
      case 'box': return product.box_price || (product.price * (product.units_per_box || 1));
      case 'meter': return product.price_per_meter || product.price || 0;
      default: return item?.variantPrice || product.price || 0;
    }
  }, [product, sellingUnit, item, saleType, availableSaleTypes, pricingInfo, value]);

  const total = value * unitPrice;

  // معلومات الكرتون
  const boxInfo = useMemo(() => {
    if (!product?.sell_by_box) return null;
    const unitsPerBox = product.units_per_box || 1;
    const totalPieces = product.stock_quantity || 0;
    const fullBoxes = Math.floor(totalPieces / unitsPerBox);
    const loosePieces = totalPieces % unitsPerBox;
    return { unitsPerBox, fullBoxes, loosePieces };
  }, [product]);

  // هل هناك ميزات متقدمة تحتاج عرض؟
  const hasAdvancedFeatures = requiresBatch || requiresSerial || availableSaleTypes.length > 1;

  // ═══ Initialize ═══
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
      setSaleType(item.saleType || 'retail');
      setSelectedBatchId(item.batchId);
      setSelectedBatchNumber(item.batchNumber);
      setSerialNumbers(item.serialNumbers || []);
    }
  }, [item, allowedUnits]);

  // ═══ Handlers ═══
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    const v = parseDecimalInput(text);
    if (v > 0 && v <= available) {
      setValue(v);
    }
  };

  const handleBatchSelect = (batch: BatchInfo) => {
    setSelectedBatchId(batch.id);
    setSelectedBatchNumber(batch.batch_number);
  };

  const handleAddSerial = () => {
    const trimmed = serialInput.trim().toUpperCase();
    if (trimmed && !serialNumbers.includes(trimmed)) {
      const requiredCount = sellingUnit === 'piece' ? value : 1;
      if (serialNumbers.length < requiredCount) {
        setSerialNumbers([...serialNumbers, trimmed]);
        setSerialInput('');
      }
    }
  };

  const handleRemoveSerial = (serial: string) => {
    setSerialNumbers(serialNumbers.filter(s => s !== serial));
  };

  const handleSave = useCallback(() => {
    const updates: Partial<CartItem> = {
      sellingUnit,
      quantity: sellingUnit === 'piece' ? value : 1,
      weight: sellingUnit === 'weight' ? value : undefined,
      weightUnit: sellingUnit === 'weight' ? weightUnit : undefined,
      boxCount: sellingUnit === 'box' ? value : undefined,
      length: sellingUnit === 'meter' ? value : undefined,
      saleType: availableSaleTypes.length > 1 ? saleType : undefined,
      batchId: requiresBatch ? selectedBatchId : undefined,
      batchNumber: requiresBatch ? selectedBatchNumber : undefined,
      serialNumbers: requiresSerial ? serialNumbers : undefined,
    };
    onSave(index, updates);
    onOpenChange(false);
  }, [index, sellingUnit, value, weightUnit, saleType, selectedBatchId, selectedBatchNumber, serialNumbers, onSave, onOpenChange, availableSaleTypes, requiresBatch, requiresSerial]);

  // التحقق من الصلاحية
  const requiredSerialCount = sellingUnit === 'piece' ? value : 1;
  const isSerialValid = !requiresSerial || serialNumbers.length >= requiredSerialCount;
  const isBatchValid = !requiresBatch || selectedBatchId;
  const isValid = value > 0 && value <= available && isSerialValid && isBatchValid;

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden dark:bg-[#161b22] dark:border-[#30363d]",
        hasAdvancedFeatures ? "sm:max-w-md" : "sm:max-w-sm"
      )} dir="rtl">
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

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-4">

            {/* ═══ نوع وحدة البيع ═══ */}
            {allowedUnits.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  وحدة البيع
                </Label>
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
              </div>
            )}

            {/* ═══ نوع التسعير (جملة/تجزئة) ═══ */}
            {availableSaleTypes.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  نوع السعر
                </Label>
                <div className="flex gap-2">
                  {availableSaleTypes.map((type) => {
                    const config = SALE_TYPE_CONFIG[type];
                    const isActive = saleType === type;
                    const minQty = pricingInfo ? getMinQuantityForSaleType(pricingInfo, type) : 1;
                    const canUse = value >= minQty;

                    return (
                      <button
                        key={type}
                        onClick={() => canUse && setSaleType(type)}
                        disabled={!canUse}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                          isActive ? cn(config.color, "text-white") : cn(config.lightColor, config.textColor),
                          !canUse && "opacity-40 cursor-not-allowed"
                        )}
                        title={!canUse ? `يتطلب ${minQty}+ وحدة` : config.label}
                      >
                        {config.label}
                        {minQty > 1 && <span className="text-xs opacity-70 block">({minQty}+)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ معلومات المخزون ═══ */}
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

              {/* معلومات الضمان */}
              {hasWarranty && (
                <div className="mt-2 pt-2 border-t border-current/10 flex items-center gap-2 text-xs text-green-600">
                  <Shield className="w-3 h-3" />
                  ضمان {warrantyMonths} شهر
                </div>
              )}
            </div>

            {/* ═══ إدخال الكمية ═══ */}
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

            {/* ═══ اختيار الدفعة ═══ */}
            {requiresBatch && batches.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  الدفعة
                  <span className="text-red-500">*</span>
                </Label>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {batches.map((batch) => {
                    const daysLeft = getDaysUntilExpiry(batch.expiry_date);
                    const isExpiringSoon = daysLeft !== null && daysLeft <= 30;
                    const isSelected = selectedBatchId === batch.id;

                    return (
                      <button
                        key={batch.id}
                        onClick={() => handleBatchSelect(batch)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 text-right transition-all",
                          isSelected
                            ? cn(colors.light, colors.border)
                            : "border-zinc-200 dark:border-[#30363d] hover:border-zinc-300",
                          isExpiringSoon && !isSelected && "border-orange-200 bg-orange-50/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isSelected && <CheckCircle2 className={cn("w-4 h-4", colors.text)} />}
                            <span className="font-medium">{batch.batch_number}</span>
                          </div>
                          <Badge variant="secondary">
                            متبقي: {batch.remaining_quantity}
                          </Badge>
                        </div>
                        {batch.expiry_date && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>تنتهي: {formatDate(batch.expiry_date)}</span>
                            {isExpiringSoon && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                {daysLeft! <= 0 ? 'منتهية!' : `${daysLeft} يوم`}
                              </Badge>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {!selectedBatchId && (
                  <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    يجب اختيار دفعة لهذا المنتج
                  </div>
                )}
              </div>
            )}

            {/* ═══ الأرقام التسلسلية ═══ */}
            {requiresSerial && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  الأرقام التسلسلية
                  <span className="text-red-500">*</span>
                  <Badge variant={serialNumbers.length >= requiredSerialCount ? "default" : "secondary"} className="mr-auto">
                    {serialNumbers.length} / {requiredSerialCount}
                  </Badge>
                </Label>

                {/* إدخال رقم جديد */}
                <div className="flex gap-2">
                  <Input
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSerial()}
                    placeholder="أدخل الرقم التسلسلي..."
                    disabled={serialNumbers.length >= requiredSerialCount}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddSerial}
                    disabled={!serialInput.trim() || serialNumbers.length >= requiredSerialCount}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* الأرقام المضافة */}
                {serialNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {serialNumbers.map((serial) => (
                      <Badge
                        key={serial}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        <span className="text-xs font-mono">{serial}</span>
                        <button
                          onClick={() => handleRemoveSerial(serial)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {serialNumbers.length < requiredSerialCount && (
                  <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    يجب إدخال {requiredSerialCount - serialNumbers.length} رقم تسلسلي إضافي
                  </div>
                )}
              </div>
            )}

            {/* ═══ السعر والإجمالي ═══ */}
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

            {/* ═══ زر الحفظ ═══ */}
            <Button
              onClick={handleSave}
              disabled={!isValid}
              className={cn("w-full h-12 text-base font-bold text-white", colors.primary, colors.primaryHover)}
            >
              <Check className="w-5 h-5 ml-2" />
              تأكيد
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedItemEditDialog;
