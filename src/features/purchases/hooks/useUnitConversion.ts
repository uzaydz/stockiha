/**
 * 🔄 useUnitConversion - Hook لتحويل الوحدات
 * ============================================================
 *
 * يدير تحويل الوحدات بين وحدة الشراء والوحدة الأساسية
 * - الكرتونة ↔ القطعة
 * - اللفة ↔ المتر
 * - الكيلو ↔ الغرام
 *
 * ============================================================
 */

import { useMemo, useCallback } from 'react';
import {
  PurchaseUnitType,
  UNIT_DEFINITIONS,
  UnitInfo,
} from '../types/smart-purchase.types';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ProductUnitConfig {
  // إعدادات الكرتونة/الصندوق
  sellByBox: boolean;
  unitsPerBox: number;
  boxPrice?: number;
  boxPurchasePrice?: number;
  boxBarcode?: string;

  // إعدادات البيع بالمتر
  sellByMeter: boolean;
  rollLength?: number; // طول اللفة بالمتر
  pricePerMeter?: number;
  purchasePricePerMeter?: number;

  // إعدادات البيع بالوزن
  sellByWeight: boolean;
  weightUnit?: 'kg' | 'g';
  pricePerWeightUnit?: number;
  purchasePricePerWeightUnit?: number;

  // الوحدة الافتراضية
  defaultPurchaseUnit?: PurchaseUnitType;
}

export interface UnitConversionResult {
  // الوحدات المتاحة
  availableUnits: UnitInfo[];

  // الوحدة المحددة
  selectedUnit: UnitInfo;

  // عامل التحويل
  conversionFactor: number;

  // دوال التحويل
  toBaseQuantity: (purchaseQty: number) => number;
  toPurchaseQuantity: (baseQty: number) => number;
  toBaseCost: (purchaseUnitCost: number) => number;
  toPurchaseUnitCost: (baseCost: number) => number;

  // عرض مفيد
  conversionDisplay: string; // مثل "×12 قطعة"
  stockDisplay: (baseStock: number) => string; // مثل "500m (5 لفات)"
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔄 Hook لتحويل الوحدات
 *
 * @example
 * ```tsx
 * const { toBaseQuantity, conversionDisplay } = useUnitConversion(product, 'box');
 * const baseQty = toBaseQuantity(5); // 5 كراتين × 12 = 60 قطعة
 * ```
 */
export function useUnitConversion(
  productConfig: ProductUnitConfig | null,
  selectedUnitType: PurchaseUnitType = 'piece'
): UnitConversionResult {

  // تحديد الوحدات المتاحة بناءً على إعدادات المنتج
  const availableUnits = useMemo((): UnitInfo[] => {
    const units: UnitInfo[] = [
      { ...UNIT_DEFINITIONS.piece }
    ];

    if (!productConfig) return units;

    // إضافة الكرتونة إذا كان المنتج يباع بالكرتونة
    if (productConfig.sellByBox && productConfig.unitsPerBox > 1) {
      units.push({
        ...UNIT_DEFINITIONS.box,
        conversionFactor: productConfig.unitsPerBox
      });

      // إضافة الدزينة إذا كانت مناسبة
      if (productConfig.unitsPerBox === 12) {
        units.push({
          ...UNIT_DEFINITIONS.dozen,
          conversionFactor: 12
        });
      }
    }

    // إضافة اللفة والمتر إذا كان المنتج يباع بالمتر
    if (productConfig.sellByMeter) {
      units.push({ ...UNIT_DEFINITIONS.meter });

      if (productConfig.rollLength && productConfig.rollLength > 0) {
        units.push({
          ...UNIT_DEFINITIONS.roll,
          conversionFactor: productConfig.rollLength,
          baseUnit: 'meter'
        });
      }
    }

    // إضافة وحدات الوزن إذا كان المنتج يباع بالوزن
    if (productConfig.sellByWeight) {
      units.push({ ...UNIT_DEFINITIONS.kg });
      units.push({ ...UNIT_DEFINITIONS.gram });
    }

    return units;
  }, [productConfig]);

  // الوحدة المحددة حالياً
  const selectedUnit = useMemo((): UnitInfo => {
    const found = availableUnits.find(u => u.type === selectedUnitType);
    if (found) return found;

    // إذا لم نجد الوحدة، نستخدم الافتراضية
    if (productConfig?.defaultPurchaseUnit) {
      const defaultFound = availableUnits.find(u => u.type === productConfig.defaultPurchaseUnit);
      if (defaultFound) return defaultFound;
    }

    return availableUnits[0] || UNIT_DEFINITIONS.piece;
  }, [availableUnits, selectedUnitType, productConfig]);

  // عامل التحويل
  const conversionFactor = useMemo(() => {
    if (selectedUnit.type === 'piece' || selectedUnit.type === 'meter' || selectedUnit.type === 'gram') {
      return 1;
    }

    // للكرتونة
    if (selectedUnit.type === 'box' && productConfig?.unitsPerBox) {
      return productConfig.unitsPerBox;
    }

    // للفة
    if (selectedUnit.type === 'roll' && productConfig?.rollLength) {
      return productConfig.rollLength;
    }

    // للدزينة
    if (selectedUnit.type === 'dozen') {
      return 12;
    }

    // للكيلو
    if (selectedUnit.type === 'kg') {
      return 1000; // 1 كيلو = 1000 غرام
    }

    return selectedUnit.conversionFactor;
  }, [selectedUnit, productConfig]);

  // دوال التحويل
  const toBaseQuantity = useCallback((purchaseQty: number): number => {
    return purchaseQty * conversionFactor;
  }, [conversionFactor]);

  const toPurchaseQuantity = useCallback((baseQty: number): number => {
    if (conversionFactor === 0) return 0;
    return baseQty / conversionFactor;
  }, [conversionFactor]);

  const toBaseCost = useCallback((purchaseUnitCost: number): number => {
    if (conversionFactor === 0) return 0;
    return purchaseUnitCost / conversionFactor;
  }, [conversionFactor]);

  const toPurchaseUnitCost = useCallback((baseCost: number): number => {
    return baseCost * conversionFactor;
  }, [conversionFactor]);

  // عرض التحويل
  const conversionDisplay = useMemo(() => {
    if (conversionFactor === 1) return '';

    const baseLabel = selectedUnit.baseUnit === 'meter'
      ? 'متر'
      : selectedUnit.baseUnit === 'gram'
        ? 'غرام'
        : 'قطعة';

    return `×${conversionFactor} ${baseLabel}`;
  }, [conversionFactor, selectedUnit]);

  // عرض المخزون
  const stockDisplay = useCallback((baseStock: number): string => {
    if (conversionFactor === 1) {
      return `${baseStock} ${selectedUnit.labelAr}`;
    }

    const purchaseUnits = Math.floor(baseStock / conversionFactor);
    const remainder = baseStock % conversionFactor;

    // تحديد الوحدة الأساسية للعرض
    const baseLabel = selectedUnit.baseUnit === 'meter'
      ? 'm'
      : selectedUnit.baseUnit === 'gram'
        ? 'g'
        : '';

    // عرض مثل "500m (5 لفات)"
    if (remainder > 0) {
      return `${baseStock}${baseLabel} (${purchaseUnits} ${selectedUnit.labelAr} + ${remainder})`;
    }

    return `${baseStock}${baseLabel} (${purchaseUnits} ${selectedUnit.labelAr})`;
  }, [conversionFactor, selectedUnit]);

  return {
    availableUnits,
    selectedUnit,
    conversionFactor,
    toBaseQuantity,
    toPurchaseQuantity,
    toBaseCost,
    toPurchaseUnitCost,
    conversionDisplay,
    stockDisplay,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * تحويل إعدادات المنتج من قاعدة البيانات إلى ProductUnitConfig
 */
export function productToUnitConfig(product: {
  sell_by_box?: boolean;
  units_per_box?: number;
  box_price?: number;
  box_purchase_price?: number;
  box_barcode?: string;
  sell_by_meter?: boolean;
  roll_length?: number;
  price_per_meter?: number;
  purchase_price_per_meter?: number;
  sell_by_weight?: boolean;
  weight_unit?: 'kg' | 'g';
  price_per_weight_unit?: number;
  purchase_price_per_weight_unit?: number;
}): ProductUnitConfig {
  return {
    sellByBox: product.sell_by_box || false,
    unitsPerBox: product.units_per_box || 1,
    boxPrice: product.box_price,
    boxPurchasePrice: product.box_purchase_price,
    boxBarcode: product.box_barcode,
    sellByMeter: product.sell_by_meter || false,
    rollLength: product.roll_length,
    pricePerMeter: product.price_per_meter,
    purchasePricePerMeter: product.purchase_price_per_meter,
    sellByWeight: product.sell_by_weight || false,
    weightUnit: product.weight_unit,
    pricePerWeightUnit: product.price_per_weight_unit,
    purchasePricePerWeightUnit: product.purchase_price_per_weight_unit,
  };
}

/**
 * الحصول على الوحدات المتاحة للمنتج
 */
export function getAvailableUnitsForProduct(product: {
  sell_by_box?: boolean;
  units_per_box?: number;
  sell_by_meter?: boolean;
  roll_length?: number;
  sell_by_weight?: boolean;
}): PurchaseUnitType[] {
  const units: PurchaseUnitType[] = ['piece'];

  if (product.sell_by_box && product.units_per_box && product.units_per_box > 1) {
    units.push('box');
  }

  if (product.sell_by_meter) {
    units.push('meter');
    if (product.roll_length && product.roll_length > 0) {
      units.push('roll');
    }
  }

  if (product.sell_by_weight) {
    units.push('kg');
    units.push('gram');
  }

  return units;
}

/**
 * تنسيق الكمية مع الوحدة
 */
export function formatQuantityWithUnit(
  quantity: number,
  unit: PurchaseUnitType,
  locale: 'ar' | 'en' = 'ar'
): string {
  const unitInfo = UNIT_DEFINITIONS[unit];
  const label = locale === 'ar' ? unitInfo.labelAr : unitInfo.label;

  // تنسيق الأرقام
  const formattedQty = quantity % 1 === 0
    ? quantity.toString()
    : quantity.toFixed(2);

  return `${formattedQty} ${label}`;
}

/**
 * تنسيق التكلفة مع الوحدة
 */
export function formatCostPerUnit(
  cost: number,
  unit: PurchaseUnitType,
  currency: string = 'DZD',
  locale: 'ar' | 'en' = 'ar'
): string {
  const unitInfo = UNIT_DEFINITIONS[unit];
  const label = locale === 'ar' ? unitInfo.labelAr : unitInfo.label;

  const formattedCost = new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cost);

  return `${formattedCost} / ${label}`;
}

export default useUnitConversion;
