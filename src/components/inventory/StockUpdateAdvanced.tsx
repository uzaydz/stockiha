/**
 * 🏭 Advanced Stock Update Dialog
 * نافذة تحديث المخزون المتقدمة - تدعم جميع أنواع البيع
 *
 * يدعم:
 * - البيع بالقطعة (piece)
 * - البيع بالوزن (weight) - kg, g
 * - البيع بالكرتون (box)
 * - البيع بالمتر (meter) - m, cm
 * - الألوان والمقاسات
 * - العمل أوفلاين وأونلاين
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { resolveProductImageSrc } from '@/lib/products/productImageResolver';
import {
  Package,
  Scale,
  Box,
  Ruler,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdvancedInventoryProduct } from './types';

// =====================================================
// الأنواع
// =====================================================

type SellingUnitType = 'piece' | 'weight' | 'box' | 'meter';
type OperationType = 'add' | 'subtract' | 'set';

interface ColorVariant {
  id: string;
  name: string;
  color_code: string;
  quantity: number;
  has_sizes: boolean;
  sizes?: SizeVariant[];
}

interface SizeVariant {
  id: string;
  name: string;
  quantity: number;
}

interface StockUpdateAdvancedProps {
  item: AdvancedInventoryProduct;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUpdateStock: (params: StockUpdateParams) => Promise<boolean>;
  isUpdating?: boolean;
  isOnline?: boolean;
}

export interface StockUpdateParams {
  productId: string;
  organizationId?: string;
  sellingUnitType: SellingUnitType;
  operation: OperationType;
  // للقطعة
  quantityPieces?: number;
  // للوزن
  weightAmount?: number;
  weightUnit?: 'kg' | 'g';
  // للكرتون
  boxesAmount?: number;
  // للمتر
  metersAmount?: number;
  meterUnit?: 'm' | 'cm';
  // للمتغيرات
  colorId?: string;
  sizeId?: string;
  // معلومات إضافية
  notes?: string;
  batchNumber?: string;
  expiryDate?: string;
  unitCost?: number;
}

// =====================================================
// وحدات القياس
// =====================================================

const WEIGHT_UNITS = [
  { value: 'kg', label: 'كيلوغرام', shortLabel: 'كغ' },
  { value: 'g', label: 'غرام', shortLabel: 'غ' },
];

const METER_UNITS = [
  { value: 'm', label: 'متر', shortLabel: 'م' },
  { value: 'cm', label: 'سنتيمتر', shortLabel: 'سم' },
];

// =====================================================
// المكون الرئيسي
// =====================================================

export default function StockUpdateAdvanced({
  item,
  open,
  onClose,
  onSuccess,
  onUpdateStock,
  isUpdating = false,
  isOnline = true,
}: StockUpdateAdvancedProps) {
  // تحديد نوع البيع الافتراضي
  const defaultSellingType = useMemo((): SellingUnitType => {
    if (item.sell_by_weight) return 'weight';
    if (item.sell_by_box) return 'box';
    if (item.sell_by_meter) return 'meter';
    return 'piece';
  }, [item]);

  // الحالة
  const [sellingType, setSellingType] = useState<SellingUnitType>(defaultSellingType);
  const [operation, setOperation] = useState<OperationType>('add');
  const [quantity, setQuantity] = useState<number>(0);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>('kg');
  const [meterUnit, setMeterUnit] = useState<'m' | 'cm'>('m');
  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeVariant | null>(null);
  const [notes, setNotes] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [unitCost, setUnitCost] = useState<number>(0);
  const [imageError, setImageError] = useState(false);
  const imageSrc = useMemo(() => resolveProductImageSrc(item as any, ''), [item]);

  // إعادة تعيين الحالة عند فتح النافذة
  useEffect(() => {
    if (open) {
      setSellingType(defaultSellingType);
      setOperation('add');
      setQuantity(0);
      setWeightUnit((item.weight_unit as 'kg' | 'g') || 'kg');
      setMeterUnit((item.meter_unit as 'm' | 'cm') || 'm');
      setSelectedColor(null);
      setSelectedSize(null);
      setNotes('');
      setBatchNumber('');
      setUnitCost(0);
      setImageError(false);
    }
  }, [open, defaultSellingType, item]);

  // حساب المخزون الحالي حسب النوع
  const currentStock = useMemo(() => {
    if (selectedSize) {
      return selectedSize.quantity;
    }
    if (selectedColor) {
      return selectedColor.quantity;
    }

    switch (sellingType) {
      case 'weight':
        return item.available_weight || 0;
      case 'box':
        return item.available_boxes || 0;
      case 'meter':
        return item.available_length || 0;
      case 'piece':
      default:
        return item.stock_quantity || 0;
    }
  }, [sellingType, selectedColor, selectedSize, item]);

  // حساب المخزون المتوقع بعد العملية
  const previewStock = useMemo(() => {
    switch (operation) {
      case 'add':
        return currentStock + quantity;
      case 'subtract':
        return Math.max(0, currentStock - quantity);
      case 'set':
        return quantity;
      default:
        return currentStock;
    }
  }, [operation, currentStock, quantity]);

  // تحديد أنواع البيع المتاحة
  const availableSellingTypes = useMemo(() => {
    const types: { value: SellingUnitType; label: string; icon: typeof Package; available: boolean }[] = [
      { value: 'piece', label: 'قطعة', icon: Package, available: true },
      { value: 'weight', label: 'وزن', icon: Scale, available: item.sell_by_weight || false },
      { value: 'box', label: 'كرتون', icon: Box, available: item.sell_by_box || false },
      { value: 'meter', label: 'متر', icon: Ruler, available: item.sell_by_meter || false },
    ];
    return types;
  }, [item]);

  // الحصول على وحدة القياس
  const getUnitLabel = useCallback(() => {
    switch (sellingType) {
      case 'weight':
        return weightUnit === 'kg' ? 'كغ' : 'غ';
      case 'box':
        return 'كرتون';
      case 'meter':
        return meterUnit === 'm' ? 'م' : 'سم';
      case 'piece':
      default:
        return 'قطعة';
    }
  }, [sellingType, weightUnit, meterUnit]);

  // معالجة تغيير اللون
  const handleColorSelect = (color: ColorVariant | null) => {
    setSelectedColor(color);
    setSelectedSize(null);
    if (color) {
      setQuantity(0);
    }
  };

  // معالجة تغيير المقاس
  const handleSizeSelect = (size: SizeVariant | null) => {
    setSelectedSize(size);
    if (size) {
      setQuantity(0);
    }
  };

  // معالجة الإرسال
  const handleSubmit = async () => {
    // التحقق من صحة البيانات
    if (quantity <= 0 && operation !== 'set') {
      toast.error('يرجى إدخال كمية صحيحة');
      return;
    }

    if (operation === 'subtract' && quantity > currentStock) {
      toast.error('الكمية المطلوبة أكبر من المخزون المتاح');
      return;
    }

    // إعداد البيانات
    const params: StockUpdateParams = {
      productId: item.id,
      sellingUnitType: sellingType,
      operation,
      notes: notes || undefined,
      batchNumber: batchNumber || undefined,
      unitCost: unitCost > 0 ? unitCost : undefined,
      colorId: selectedColor?.id,
      sizeId: selectedSize?.id,
    };

    // إضافة الكمية حسب النوع
    switch (sellingType) {
      case 'piece':
        params.quantityPieces = quantity;
        break;
      case 'weight':
        // تحويل إلى كيلوغرام إذا كانت بالغرام
        params.weightAmount = weightUnit === 'g' ? quantity / 1000 : quantity;
        params.weightUnit = weightUnit;
        break;
      case 'box':
        params.boxesAmount = quantity;
        break;
      case 'meter':
        // تحويل إلى متر إذا كانت بالسنتيمتر
        params.metersAmount = meterUnit === 'cm' ? quantity / 100 : quantity;
        params.meterUnit = meterUnit;
        break;
    }

    const success = await onUpdateStock(params);
    if (success) {
      onSuccess();
    }
  };

  // الإجراءات السريعة
  const quickActions = useMemo(() => {
    const baseActions = sellingType === 'piece' || sellingType === 'box'
      ? [1, 5, 10, 20, 50, 100]
      : sellingType === 'weight'
      ? weightUnit === 'kg' ? [0.5, 1, 2, 5, 10, 20] : [100, 250, 500, 1000, 2000, 5000]
      : meterUnit === 'm' ? [0.5, 1, 2, 5, 10, 20] : [10, 25, 50, 100, 200, 500];

    return baseActions;
  }, [sellingType, weightUnit, meterUnit]);

  // تحقق من وجود مقاسات للون المحدد
  const colorHasSizes = selectedColor?.has_sizes && selectedColor.sizes && selectedColor.sizes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            تحديث المخزون
            {!isOnline && (
              <Badge variant="outline" className="mr-2 bg-amber-50 text-amber-700 border-amber-200">
                <WifiOff className="h-3 w-3 ml-1" />
                أوفلاين
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات المنتج */}
          <Card className="bg-slate-50 dark:bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* صورة المنتج */}
                {imageSrc && !imageError ? (
                  <img
                    src={imageSrc}
                    alt={item.name}
                    className="h-20 w-20 rounded-lg object-cover border"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center border">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                )}

                {/* تفاصيل المنتج */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                  {item.sku && (
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  )}

                  {/* إحصائيات المخزون */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 ml-1" />
                      {item.stock_quantity} قطعة
                    </Badge>
                    {item.sell_by_weight && (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                        <Scale className="h-3 w-3 ml-1" />
                        {(item.available_weight || 0).toFixed(2)} {item.weight_unit || 'kg'}
                      </Badge>
                    )}
                    {item.sell_by_box && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        <Box className="h-3 w-3 ml-1" />
                        {item.available_boxes || 0} كرتون
                      </Badge>
                    )}
                    {item.sell_by_meter && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                        <Ruler className="h-3 w-3 ml-1" />
                        {(item.available_length || 0).toFixed(2)} {item.meter_unit || 'm'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* اختيار نوع البيع */}
          {availableSellingTypes.filter(t => t.available).length > 1 && (
            <div>
              <Label className="text-base mb-3 block">نوع الوحدة</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableSellingTypes
                  .filter(t => t.available)
                  .map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      variant={sellingType === type.value ? 'default' : 'outline'}
                      className={cn(
                        'h-auto py-3 flex flex-col gap-1',
                        sellingType === type.value && 'ring-2 ring-primary ring-offset-2'
                      )}
                      onClick={() => {
                        setSellingType(type.value);
                        setQuantity(0);
                      }}
                    >
                      <type.icon className="h-5 w-5" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* اختيار وحدة القياس للوزن */}
          {sellingType === 'weight' && (
            <div>
              <Label className="text-base mb-3 block">وحدة الوزن</Label>
              <div className="flex gap-2">
                {WEIGHT_UNITS.map((unit) => (
                  <Button
                    key={unit.value}
                    type="button"
                    variant={weightUnit === unit.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setWeightUnit(unit.value as 'kg' | 'g');
                      setQuantity(0);
                    }}
                  >
                    {unit.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* اختيار وحدة القياس للمتر */}
          {sellingType === 'meter' && (
            <div>
              <Label className="text-base mb-3 block">وحدة القياس</Label>
              <div className="flex gap-2">
                {METER_UNITS.map((unit) => (
                  <Button
                    key={unit.value}
                    type="button"
                    variant={meterUnit === unit.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setMeterUnit(unit.value as 'm' | 'cm');
                      setQuantity(0);
                    }}
                  >
                    {unit.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* اختيار اللون (إذا كان المنتج له متغيرات) */}
          {item.has_variants && item.colors && item.colors.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">اختر اللون</Label>
                <Badge variant="outline" className="text-xs">
                  {item.colors.length} لون متاح
                </Badge>
              </div>

              {/* ملخص الألوان */}
              <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.colors.slice(0, 6).map((color: any) => (
                    <div
                      key={color.id}
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 py-1 rounded-full border shadow-sm"
                    >
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: color.color_code }}
                      />
                      <span className="text-xs font-medium">{color.name}</span>
                      <span className="text-xs text-muted-foreground">({color.quantity})</span>
                    </div>
                  ))}
                  {item.colors.length > 6 && (
                    <span className="text-xs text-muted-foreground">+{item.colors.length - 6} أخرى</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={!selectedColor ? 'default' : 'outline'}
                  className={cn(
                    "justify-start h-auto py-3 transition-all",
                    !selectedColor && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => handleColorSelect(null)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <Package className="h-3 w-3 text-primary" />
                    </div>
                    <div className="text-right flex-1">
                      <div className="font-medium">جميع الألوان</div>
                      <div className="text-xs text-muted-foreground">
                        {item.stock_quantity} قطعة إجمالي
                      </div>
                    </div>
                  </div>
                </Button>

                {item.colors.map((color: any) => (
                  <Button
                    key={color.id}
                    type="button"
                    variant={selectedColor?.id === color.id ? 'default' : 'outline'}
                    className={cn(
                      "justify-start h-auto py-3 transition-all",
                      selectedColor?.id === color.id && "ring-2 ring-primary ring-offset-2",
                      color.quantity === 0 && "opacity-60"
                    )}
                    onClick={() => handleColorSelect(color)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="relative">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-md flex-shrink-0"
                          style={{ backgroundColor: color.color_code }}
                        />
                        {color.has_sizes && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">S</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{color.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{color.quantity} قطعة</span>
                          {color.has_sizes && color.sizes && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                              {color.sizes.length} مقاس
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* اختيار المقاس */}
          {colorHasSizes && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base flex items-center gap-2">
                  اختر المقاس
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {selectedColor?.name}
                  </Badge>
                </Label>
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                  مطلوب
                </Badge>
              </div>

              {!selectedSize && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>يجب اختيار مقاس محدد لتحديث المخزون لهذا اللون</span>
                </div>
              )}

              {/* جدول المقاسات */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-muted-foreground grid grid-cols-3">
                  <span>المقاس</span>
                  <span className="text-center">الكمية</span>
                  <span className="text-left">الحالة</span>
                </div>
                <div className="divide-y">
                  {selectedColor!.sizes!.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => handleSizeSelect(size)}
                      className={cn(
                        "w-full px-3 py-2.5 grid grid-cols-3 items-center transition-all hover:bg-slate-50 dark:hover:bg-slate-800",
                        selectedSize?.id === size.id && "bg-primary/10 hover:bg-primary/15"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 transition-all",
                          selectedSize?.id === size.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                        )}>
                          {size.name}
                        </div>
                      </div>
                      <div className="text-center">
                        <span className={cn(
                          "font-semibold",
                          size.quantity === 0 && "text-red-500",
                          size.quantity > 0 && size.quantity <= 5 && "text-amber-500",
                          size.quantity > 5 && "text-green-600"
                        )}>
                          {size.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground mr-1">قطعة</span>
                      </div>
                      <div className="text-left">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            size.quantity === 0 && "bg-red-50 text-red-700 border-red-200",
                            size.quantity > 0 && size.quantity <= 5 && "bg-amber-50 text-amber-700 border-amber-200",
                            size.quantity > 5 && "bg-green-50 text-green-700 border-green-200"
                          )}
                        >
                          {size.quantity === 0 ? 'نفذ' : size.quantity <= 5 ? 'منخفض' : 'متوفر'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ملخص المقاسات */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="text-xs text-blue-700 dark:text-blue-300 mb-2">ملخص مقاسات {selectedColor?.name}</div>
                <div className="flex flex-wrap gap-2">
                  {selectedColor!.sizes!.map((size) => (
                    <div
                      key={size.id}
                      className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                        selectedSize?.id === size.id
                          ? "bg-primary text-primary-foreground"
                          : size.quantity === 0
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-white dark:bg-slate-700 border"
                      )}
                      onClick={() => handleSizeSelect(size)}
                    >
                      {size.name}: {size.quantity}
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 text-xs text-blue-600 dark:text-blue-400">
                  إجمالي اللون: {selectedColor!.sizes!.reduce((sum, s) => sum + s.quantity, 0)} قطعة
                </div>
              </div>
            </div>
          )}

          {/* ملخص الاختيار الحالي */}
          {(selectedColor || selectedSize) && (
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    {selectedColor && (
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: selectedColor.color_code }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      تحديث مخزون: {selectedColor?.name || 'جميع الألوان'}
                      {selectedSize && ` - مقاس ${selectedSize.name}`}
                    </div>
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      المخزون الحالي: {currentStock} {getUnitLabel()}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                    onClick={() => {
                      setSelectedColor(null);
                      setSelectedSize(null);
                    }}
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* نوع العملية */}
          <div>
            <Label className="text-base mb-3 block">نوع العملية</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={operation === 'add' ? 'default' : 'outline'}
                className={cn(
                  'h-auto py-3',
                  operation === 'add' && 'bg-green-600 hover:bg-green-700'
                )}
                onClick={() => {
                  setOperation('add');
                  setQuantity(0);
                }}
              >
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
              <Button
                type="button"
                variant={operation === 'subtract' ? 'default' : 'outline'}
                className={cn(
                  'h-auto py-3',
                  operation === 'subtract' && 'bg-red-600 hover:bg-red-700'
                )}
                onClick={() => {
                  setOperation('subtract');
                  setQuantity(0);
                }}
              >
                <Minus className="h-4 w-4 ml-1" />
                خصم
              </Button>
              <Button
                type="button"
                variant={operation === 'set' ? 'default' : 'outline'}
                className={cn(
                  'h-auto py-3',
                  operation === 'set' && 'bg-blue-600 hover:bg-blue-700'
                )}
                onClick={() => {
                  setOperation('set');
                  setQuantity(currentStock);
                }}
              >
                <RefreshCw className="h-4 w-4 ml-1" />
                تحديد
              </Button>
            </div>
          </div>

          {/* الإجراءات السريعة */}
          {operation !== 'set' && (
            <div>
              <Label className="text-base mb-3 block">إجراءات سريعة</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {quickActions.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(value)}
                    className={cn(
                      quantity === value && 'border-primary bg-primary/10'
                    )}
                  >
                    {operation === 'add' ? '+' : '-'}{value}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* إدخال الكمية */}
          <div>
            <Label htmlFor="quantity" className="text-base mb-2 block">
              {operation === 'set' ? 'الكمية الجديدة' : 'الكمية'}
            </Label>
            <div className="relative">
              <Input
                id="quantity"
                type="number"
                min="0"
                step={sellingType === 'weight' || sellingType === 'meter' ? '0.01' : '1'}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="text-xl font-semibold text-center h-14 pr-16"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                {getUnitLabel()}
              </div>
            </div>

            {/* معاينة المخزون */}
            <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl border border-blue-100 dark:border-blue-900">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">المخزون الحالي</div>
                <div className="font-semibold">{currentStock.toLocaleString()} {getUnitLabel()}</div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium">سيصبح المخزون</div>
                <div className={cn(
                  'text-2xl font-bold',
                  previewStock > currentStock ? 'text-green-600' :
                  previewStock < currentStock ? 'text-red-600' : 'text-blue-600'
                )}>
                  {previewStock.toLocaleString()} {getUnitLabel()}
                </div>
              </div>
              {operation !== 'set' && quantity > 0 && (
                <div className="mt-2 text-xs text-center text-muted-foreground">
                  {operation === 'add' ? (
                    <span className="text-green-600">+{quantity} {getUnitLabel()}</span>
                  ) : (
                    <span className="text-red-600">-{quantity} {getUnitLabel()}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* معلومات إضافية (للإضافة فقط) */}
          {operation === 'add' && (
            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="notes">ملاحظات</TabsTrigger>
                <TabsTrigger value="batch">معلومات الدفعة</TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="notes">ملاحظة (اختياري)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف ملاحظة حول هذه العملية..."
                    rows={2}
                    className="mt-2"
                  />
                </div>
              </TabsContent>
              <TabsContent value="batch" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batchNumber">رقم الدفعة</Label>
                    <Input
                      id="batchNumber"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="مثال: BATCH-001"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitCost">سعر الوحدة</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost || ''}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* ملاحظة للخصم والتحديد */}
          {operation !== 'add' && (
            <div>
              <Label htmlFor="notes">ملاحظة (اختياري)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سبب التعديل..."
                rows={2}
                className="mt-2"
              />
            </div>
          )}

          {/* أزرار الإجراء */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isUpdating ||
                (quantity <= 0 && operation !== 'set') ||
                (colorHasSizes && !selectedSize)
              }
              className={cn(
                'flex-1',
                operation === 'add' && 'bg-green-600 hover:bg-green-700',
                operation === 'subtract' && 'bg-red-600 hover:bg-red-700'
              )}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  {!isOnline && <WifiOff className="h-4 w-4 ml-2" />}
                  {operation === 'add' ? 'إضافة للمخزون' :
                   operation === 'subtract' ? 'خصم من المخزون' : 'تحديث المخزون'}
                </>
              )}
            </Button>
          </div>

          {/* تنبيه الأوفلاين */}
          {!isOnline && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 inline ml-1" />
              أنت في وضع الأوفلاين. سيتم حفظ التعديلات محلياً ومزامنتها عند عودة الاتصال.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
