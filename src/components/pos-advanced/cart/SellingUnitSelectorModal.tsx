/**
 * 🎯 Selling Unit Selector Modal
 *
 * Modal موحد وذكي لجميع أنواع البيع:
 * - قطعة (piece)
 * - وزن (weight)
 * - كرتون (box)
 * - متر (meter)
 *
 * يوفر تجربة مستخدم سلسة ومضغوطة
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Package, Scale, Box, Ruler, Plus, Minus, Check } from 'lucide-react';
import type { Product } from '@/types';
import type { SellingUnit } from '@/lib/pricing/wholesalePricing';
import { getAvailableSellingUnits, getWeightUnitLabel } from '@/lib/pricing/wholesalePricing';

export interface SellingUnitConfig {
  sellingUnit: SellingUnit;
  value: number;
  quantity: number;
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  boxCount?: number;
  length?: number;
}

interface SellingUnitSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onConfirm: (config: SellingUnitConfig) => void;
  currentConfig?: Partial<SellingUnitConfig>;
  mode?: 'add' | 'edit';
}

interface UnitInfo {
  label: string;
  shortLabel: string;
  pricePerUnit: number;
  min: number;
  max?: number;
  step: number;
  quickValues: number[];
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  info?: string;
}

const SellingUnitSelectorModal: React.FC<SellingUnitSelectorModalProps> = ({
  isOpen,
  onClose,
  product,
  onConfirm,
  currentConfig,
  mode = 'edit'
}) => {
  // الحصول على أنواع البيع المتاحة
  const availableUnits = useMemo(() => getAvailableSellingUnits(product), [product]);

  // الحالة الداخلية
  const [selectedUnit, setSelectedUnit] = useState<SellingUnit>(
    currentConfig?.sellingUnit || availableUnits[0] || 'piece'
  );
  const [value, setValue] = useState<number>(currentConfig?.value || 1);
  const [inputValue, setInputValue] = useState<string>((currentConfig?.value || 1).toString());

  // إعادة تعيين القيم عند فتح/إغلاق
  useEffect(() => {
    if (isOpen) {
      const unit = currentConfig?.sellingUnit || availableUnits[0] || 'piece';
      setSelectedUnit(unit);

      let initialValue = 1;
      if (currentConfig) {
        if (unit === 'weight' && currentConfig.weight) initialValue = currentConfig.weight;
        else if (unit === 'box' && currentConfig.boxCount) initialValue = currentConfig.boxCount;
        else if (unit === 'meter' && currentConfig.length) initialValue = currentConfig.length;
        else if (currentConfig.quantity) initialValue = currentConfig.quantity;
        else if (currentConfig.value) initialValue = currentConfig.value;
      }

      setValue(initialValue);
      setInputValue(initialValue.toString());
    }
  }, [isOpen, currentConfig, availableUnits]);

  // معلومات كل نوع بيع
  const getUnitInfo = useCallback((unit: SellingUnit): UnitInfo => {
    switch (unit) {
      case 'weight':
        const weightUnit = product.weight_unit || 'kg';
        const isSmallUnit = weightUnit === 'g' || weightUnit === 'oz';
        return {
          label: `الوزن (${getWeightUnitLabel(weightUnit)})`,
          shortLabel: getWeightUnitLabel(weightUnit),
          pricePerUnit: product.price_per_weight_unit || 0,
          min: product.min_weight || (isSmallUnit ? 1 : 0.1),
          max: product.max_weight,
          step: isSmallUnit ? 10 : 0.1,
          quickValues: isSmallUnit ? [100, 250, 500, 1000] : [0.5, 1, 2, 5],
          icon: <Scale className="w-4 h-4" />,
          colorClass: 'text-emerald-600 dark:text-emerald-400',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
          borderClass: 'border-emerald-200 dark:border-emerald-800'
        };
      case 'box':
        return {
          label: 'الكرتون',
          shortLabel: 'كرتون',
          pricePerUnit: product.box_price || 0,
          min: 1,
          max: undefined,
          step: 1,
          quickValues: [1, 2, 3, 5, 10],
          icon: <Box className="w-4 h-4" />,
          colorClass: 'text-blue-600 dark:text-blue-400',
          bgClass: 'bg-blue-50 dark:bg-blue-950/30',
          borderClass: 'border-blue-200 dark:border-blue-800',
          info: `${product.units_per_box || 1} وحدة/كرتون`
        };
      case 'meter':
        // ⚡ دعم أسماء حقول متعددة (snake_case, camelCase, أسماء بديلة)
        const p = product as any;
        const minMeters = p.min_meters || p.minMeters || p.min_meters_per_sale || p.minMetersPerSale || 0.1;
        const rollLength = p.roll_length || p.rollLength || p.roll_length_meters || p.rollLengthMeters;
        const pricePerMeter = p.price_per_meter || p.pricePerMeter || 0;

        const meterInfoParts: string[] = [];
        if (minMeters > 0.1) meterInfoParts.push(`الحد الأدنى: ${minMeters} م`);
        if (rollLength) meterInfoParts.push(`طول الرول: ${rollLength} م`);

        return {
          label: 'الطول (متر)',
          shortLabel: 'م',
          pricePerUnit: pricePerMeter,
          min: minMeters,
          max: rollLength,
          step: 0.5,
          quickValues: [0.5, 1, 2, 3, 5],
          icon: <Ruler className="w-4 h-4" />,
          colorClass: 'text-purple-600 dark:text-purple-400',
          bgClass: 'bg-purple-50 dark:bg-purple-950/30',
          borderClass: 'border-purple-200 dark:border-purple-800',
          info: meterInfoParts.length > 0 ? meterInfoParts.join(' • ') : undefined
        };
      case 'piece':
      default:
        return {
          label: 'القطعة',
          shortLabel: 'قطعة',
          pricePerUnit: product.price || 0,
          min: 1,
          max: product.stock_quantity,
          step: 1,
          quickValues: [1, 2, 3, 5, 10],
          icon: <Package className="w-4 h-4" />,
          colorClass: 'text-slate-600 dark:text-slate-400',
          bgClass: 'bg-slate-50 dark:bg-slate-950/30',
          borderClass: 'border-slate-200 dark:border-slate-800'
        };
    }
  }, [product]);

  const unitInfo = useMemo(() => getUnitInfo(selectedUnit), [selectedUnit, getUnitInfo]);
  const totalPrice = useMemo(() => value * unitInfo.pricePerUnit, [value, unitInfo.pricePerUnit]);

  // تغيير نوع البيع
  const handleUnitChange = useCallback((unit: SellingUnit) => {
    setSelectedUnit(unit);
    const newInfo = getUnitInfo(unit);
    const newValue = newInfo.min;
    setValue(newValue);
    setInputValue(newValue.toString());
  }, [getUnitInfo]);

  // تغيير القيمة من الإدخال
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputValue = e.target.value;
    setInputValue(newInputValue);

    const numValue = parseFloat(newInputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      const clampedValue = Math.max(
        unitInfo.min,
        unitInfo.max ? Math.min(numValue, unitInfo.max) : numValue
      );
      setValue(clampedValue);
    }
  }, [unitInfo]);

  // زيادة/نقصان القيمة
  const increment = useCallback(() => {
    const newValue = Math.round((value + unitInfo.step) * 100) / 100;
    const clampedValue = unitInfo.max ? Math.min(newValue, unitInfo.max) : newValue;
    setValue(clampedValue);
    setInputValue(clampedValue.toString());
  }, [value, unitInfo]);

  const decrement = useCallback(() => {
    const newValue = Math.round((value - unitInfo.step) * 100) / 100;
    const clampedValue = Math.max(newValue, unitInfo.min);
    setValue(clampedValue);
    setInputValue(clampedValue.toString());
  }, [value, unitInfo]);

  // اختيار قيمة سريعة
  const handleQuickValue = useCallback((quickValue: number) => {
    setValue(quickValue);
    setInputValue(quickValue.toString());
  }, []);

  // التأكيد
  const handleConfirm = useCallback(() => {
    const config: SellingUnitConfig = {
      sellingUnit: selectedUnit,
      value,
      quantity: selectedUnit === 'piece' ? value : 1,
      weight: selectedUnit === 'weight' ? value : undefined,
      weightUnit: selectedUnit === 'weight' ? (product.weight_unit || 'kg') : undefined,
      boxCount: selectedUnit === 'box' ? value : undefined,
      length: selectedUnit === 'meter' ? value : undefined
    };

    onConfirm(config);
    onClose();
  }, [selectedUnit, value, product.weight_unit, onConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border/50">
          <DialogTitle className="text-base font-semibold">
            {mode === 'add' ? 'إضافة للسلة' : 'تعديل الكمية'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
            {product.name}
          </p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* اختيار نوع البيع - فقط إذا كان هناك أكثر من نوع */}
          {availableUnits.length > 1 && (
            <div className="grid grid-cols-2 gap-2">
              {availableUnits.map((unit) => {
                const info = getUnitInfo(unit);
                const isSelected = selectedUnit === unit;

                return (
                  <button
                    key={unit}
                    onClick={() => handleUnitChange(unit)}
                    className={cn(
                      "relative flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                      isSelected
                        ? `${info.bgClass} ${info.borderClass} ${info.colorClass}`
                        : "border-border/50 hover:border-border bg-background hover:bg-muted/30"
                    )}
                  >
                    <span className={cn(isSelected ? info.colorClass : 'text-muted-foreground')}>
                      {info.icon}
                    </span>
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? info.colorClass : 'text-foreground'
                    )}>
                      {unit === 'piece' && 'قطعة'}
                      {unit === 'weight' && 'وزن'}
                      {unit === 'box' && 'كرتون'}
                      {unit === 'meter' && 'متر'}
                    </span>
                    {isSelected && (
                      <Check className={cn("w-3.5 h-3.5 absolute top-1.5 left-1.5", info.colorClass)} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* إدخال القيمة */}
          <div className={cn(
            "rounded-lg p-3 border",
            unitInfo.bgClass,
            unitInfo.borderClass
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className={unitInfo.colorClass}>{unitInfo.icon}</span>
              <span className={cn("text-sm font-medium", unitInfo.colorClass)}>
                {unitInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={decrement}
                disabled={value <= unitInfo.min}
                className={cn("h-10 w-10 shrink-0", unitInfo.borderClass)}
              >
                <Minus className="w-4 h-4" />
              </Button>

              <div className="relative flex-1">
                <Input
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  step={unitInfo.step}
                  min={unitInfo.min}
                  max={unitInfo.max}
                  className={cn(
                    "text-center text-xl font-bold h-10",
                    unitInfo.borderClass
                  )}
                  dir="ltr"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={increment}
                disabled={unitInfo.max !== undefined && value >= unitInfo.max}
                className={cn("h-10 w-10 shrink-0", unitInfo.borderClass)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* أزرار سريعة */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {unitInfo.quickValues.map((qv) => (
                <Button
                  key={qv}
                  type="button"
                  variant={value === qv ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickValue(qv)}
                  disabled={unitInfo.max !== undefined && qv > unitInfo.max}
                  className={cn(
                    "text-xs h-7 px-2.5",
                    value === qv && unitInfo.colorClass.replace('text-', 'bg-').replace('-600', '-500').replace('-400', '-500')
                  )}
                >
                  {qv}
                </Button>
              ))}
            </div>

            {/* معلومات إضافية */}
            {unitInfo.info && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {unitInfo.info}
              </p>
            )}
          </div>

          {/* ملخص السعر */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {value} {unitInfo.shortLabel} × {unitInfo.pricePerUnit.toLocaleString('ar-DZ')}
              </span>
              <span className="text-lg font-bold text-foreground">
                {totalPrice.toLocaleString('ar-DZ')} د.ج
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            className={cn("flex-1", unitInfo.colorClass.replace('text-', 'bg-').replace('-600', '-500').replace('-400', '-500'))}
          >
            {mode === 'add' ? 'إضافة' : 'تأكيد'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellingUnitSelectorModal;
