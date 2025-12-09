/**
 * 🔄 UnitSelector - مكون اختيار الوحدة الذكي
 * ============================================================
 *
 * يعرض قائمة الوحدات المتاحة للمنتج مع عامل التحويل
 *
 * ============================================================
 */

import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PurchaseUnitType, UnitInfo } from '../types/smart-purchase.types';
import { useUnitConversion, type ProductUnitConfig } from '../hooks/useUnitConversion';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

interface UnitSelectorProps {
  /** إعدادات الوحدة للمنتج */
  productConfig: ProductUnitConfig | null;
  /** الوحدة المحددة */
  value: PurchaseUnitType;
  /** عند تغيير الوحدة */
  onChange: (unit: PurchaseUnitType, conversionFactor: number) => void;
  /** حجم المكون */
  size?: 'sm' | 'md' | 'lg';
  /** معطل */
  disabled?: boolean;
  /** اللغة */
  locale?: 'ar' | 'en';
  /** إظهار عامل التحويل */
  showConversion?: boolean;
  /** className إضافي */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Component
// ═══════════════════════════════════════════════════════════════════════════

export function UnitSelector({
  productConfig,
  value,
  onChange,
  size = 'md',
  disabled = false,
  locale = 'ar',
  showConversion = true,
  className,
}: UnitSelectorProps) {
  const {
    availableUnits,
    selectedUnit,
    conversionFactor,
    conversionDisplay,
  } = useUnitConversion(productConfig, value);

  const handleChange = (newUnit: PurchaseUnitType) => {
    const unitInfo = availableUnits.find(u => u.type === newUnit);
    const factor = unitInfo?.conversionFactor || 1;
    onChange(newUnit, factor);
  };

  // أحجام مختلفة
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  // إذا كانت هناك وحدة واحدة فقط، نعرض badge بدلاً من select
  if (availableUnits.length === 1) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="secondary" className={cn(sizeClasses[size], 'px-3')}>
          {locale === 'ar' ? availableUnits[0].labelAr : availableUnits[0].label}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn(sizeClasses[size], 'min-w-[100px]')}>
          <SelectValue>
            {locale === 'ar' ? selectedUnit.labelAr : selectedUnit.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableUnits.map((unit) => (
            <SelectItem key={unit.type} value={unit.type}>
              <div className="flex items-center justify-between gap-4 w-full">
                <span>{locale === 'ar' ? unit.labelAr : unit.label}</span>
                {unit.conversionFactor > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ×{unit.conversionFactor}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* عرض عامل التحويل */}
      {showConversion && conversionDisplay && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {conversionDisplay}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Compact Unit Selector (للاستخدام في الجداول)
// ═══════════════════════════════════════════════════════════════════════════

interface CompactUnitSelectorProps {
  availableUnits: UnitInfo[];
  value: PurchaseUnitType;
  onChange: (unit: PurchaseUnitType) => void;
  disabled?: boolean;
  locale?: 'ar' | 'en';
}

export function CompactUnitSelector({
  availableUnits,
  value,
  onChange,
  disabled = false,
  locale = 'ar',
}: CompactUnitSelectorProps) {
  const selectedUnit = availableUnits.find(u => u.type === value) || availableUnits[0];

  if (availableUnits.length <= 1) {
    return (
      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
        {locale === 'ar' ? selectedUnit?.labelAr : selectedUnit?.label}
      </span>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="h-7 text-xs min-w-[70px] px-2">
        <SelectValue>
          {locale === 'ar' ? selectedUnit?.labelAr : selectedUnit?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableUnits.map((unit) => (
          <SelectItem key={unit.type} value={unit.type} className="text-xs">
            <div className="flex items-center gap-2">
              <span>{locale === 'ar' ? unit.labelAr : unit.label}</span>
              {unit.conversionFactor > 1 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  ×{unit.conversionFactor}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Unit Badge (لعرض الوحدة فقط بدون تفاعل)
// ═══════════════════════════════════════════════════════════════════════════

interface UnitBadgeProps {
  unit: PurchaseUnitType;
  conversionFactor?: number;
  locale?: 'ar' | 'en';
  size?: 'sm' | 'md';
  showConversion?: boolean;
}

export function UnitBadge({
  unit,
  conversionFactor = 1,
  locale = 'ar',
  size = 'sm',
  showConversion = false,
}: UnitBadgeProps) {
  const labels: Record<PurchaseUnitType, { ar: string; en: string }> = {
    piece: { ar: 'قطعة', en: 'Piece' },
    box: { ar: 'كرتونة', en: 'Box' },
    pack: { ar: 'علبة', en: 'Pack' },
    roll: { ar: 'لفة', en: 'Roll' },
    meter: { ar: 'متر', en: 'Meter' },
    kg: { ar: 'كيلو', en: 'Kg' },
    gram: { ar: 'غرام', en: 'Gram' },
    liter: { ar: 'لتر', en: 'Liter' },
    dozen: { ar: 'دزينة', en: 'Dozen' },
    pallet: { ar: 'بالتة', en: 'Pallet' },
  };

  const label = locale === 'ar' ? labels[unit]?.ar : labels[unit]?.en;

  return (
    <Badge
      variant="secondary"
      className={cn(
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
      )}
    >
      {label}
      {showConversion && conversionFactor > 1 && (
        <span className="ml-1 text-muted-foreground">×{conversionFactor}</span>
      )}
    </Badge>
  );
}

export default UnitSelector;
