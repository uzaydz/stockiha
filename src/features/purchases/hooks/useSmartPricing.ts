/**
 * 💰 useSmartPricing - Hook للتسعير الذكي
 * ============================================================
 *
 * يدير اقتراح أسعار البيع بناءً على:
 * - تغير تكلفة الشراء
 * - الهامش المستهدف
 * - المنافسة
 *
 * ============================================================
 */

import { useMemo, useCallback, useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface PricingConfig {
  /** التكلفة القديمة (سعر الشراء السابق) */
  oldCost: number;
  /** التكلفة الجديدة (سعر الشراء الحالي) */
  newCost: number;
  /** سعر البيع الحالي */
  currentSellingPrice: number;
  /** الهامش المستهدف (نسبة مئوية) */
  targetMargin?: number;
  /** الحد الأدنى للهامش */
  minMargin?: number;
  /** الحد الأقصى للزيادة المسموحة (نسبة مئوية) */
  maxPriceIncrease?: number;
  /** تقريب السعر */
  roundTo?: number; // مثل 10 أو 50 أو 100
  /** عملة العرض */
  currency?: string;
}

export interface SmartPricingResult {
  /** السعر المقترح */
  suggestedPrice: number;
  /** الهامش الحالي (%) */
  currentMargin: number;
  /** الهامش الجديد المقترح (%) */
  suggestedMargin: number;
  /** نسبة تغير التكلفة (%) */
  costChangePercent: number;
  /** نسبة تغير السعر المقترح (%) */
  priceChangePercent: number;
  /** هل التكلفة ارتفعت؟ */
  costIncreased: boolean;
  /** هل يحتاج تعديل السعر؟ */
  needsPriceAdjustment: boolean;
  /** مستوى التنبيه */
  alertLevel: 'none' | 'info' | 'warning' | 'critical';
  /** رسالة التنبيه */
  alertMessage: string;
  /** الربح لكل وحدة (حالي) */
  currentProfit: number;
  /** الربح لكل وحدة (مقترح) */
  suggestedProfit: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 💰 Hook للتسعير الذكي
 *
 * @example
 * ```tsx
 * const pricing = useSmartPricing({
 *   oldCost: 100,
 *   newCost: 120,
 *   currentSellingPrice: 150,
 *   targetMargin: 30
 * });
 *
 * if (pricing.needsPriceAdjustment) {
 *   console.log(`السعر المقترح: ${pricing.suggestedPrice}`);
 * }
 * ```
 */
export function useSmartPricing(config: PricingConfig): SmartPricingResult {
  const {
    oldCost,
    newCost,
    currentSellingPrice,
    targetMargin = 30,
    minMargin = 10,
    maxPriceIncrease = 50,
    roundTo = 10,
    currency = 'DZD'
  } = config;

  return useMemo(() => {
    // حساب نسبة تغير التكلفة
    const costChangePercent = oldCost > 0
      ? ((newCost - oldCost) / oldCost) * 100
      : 0;

    const costIncreased = newCost > oldCost;

    // حساب الهامش الحالي
    const currentProfit = currentSellingPrice - newCost;
    const currentMargin = currentSellingPrice > 0
      ? (currentProfit / currentSellingPrice) * 100
      : 0;

    // حساب السعر المقترح بناءً على الهامش المستهدف
    // الصيغة: السعر = التكلفة / (1 - الهامش)
    let suggestedPrice = newCost / (1 - targetMargin / 100);

    // تقريب السعر
    if (roundTo > 0) {
      suggestedPrice = Math.ceil(suggestedPrice / roundTo) * roundTo;
    }

    // التأكد من عدم تجاوز الحد الأقصى للزيادة
    const maxAllowedPrice = currentSellingPrice * (1 + maxPriceIncrease / 100);
    if (suggestedPrice > maxAllowedPrice) {
      suggestedPrice = Math.ceil(maxAllowedPrice / roundTo) * roundTo;
    }

    // حساب الهامش والربح المقترح
    const suggestedProfit = suggestedPrice - newCost;
    const suggestedMargin = suggestedPrice > 0
      ? (suggestedProfit / suggestedPrice) * 100
      : 0;

    // حساب نسبة تغير السعر
    const priceChangePercent = currentSellingPrice > 0
      ? ((suggestedPrice - currentSellingPrice) / currentSellingPrice) * 100
      : 0;

    // تحديد هل يحتاج تعديل
    const needsPriceAdjustment =
      currentMargin < minMargin ||
      (costIncreased && Math.abs(costChangePercent) > 5);

    // تحديد مستوى التنبيه
    let alertLevel: 'none' | 'info' | 'warning' | 'critical' = 'none';
    let alertMessage = '';

    if (currentMargin < 0) {
      alertLevel = 'critical';
      alertMessage = '⚠️ تحذير: أنت تبيع بخسارة!';
    } else if (currentMargin < minMargin) {
      alertLevel = 'warning';
      alertMessage = `⚠️ الهامش منخفض (${currentMargin.toFixed(1)}%)، يُنصح برفع السعر`;
    } else if (costIncreased && costChangePercent > 10) {
      alertLevel = 'warning';
      alertMessage = `📈 التكلفة ارتفعت ${costChangePercent.toFixed(1)}%، تحقق من السعر`;
    } else if (costIncreased && costChangePercent > 5) {
      alertLevel = 'info';
      alertMessage = `ℹ️ التكلفة ارتفعت ${costChangePercent.toFixed(1)}%`;
    } else if (!costIncreased && costChangePercent < -5) {
      alertLevel = 'info';
      alertMessage = `✅ التكلفة انخفضت ${Math.abs(costChangePercent).toFixed(1)}%`;
    }

    return {
      suggestedPrice,
      currentMargin,
      suggestedMargin,
      costChangePercent,
      priceChangePercent,
      costIncreased,
      needsPriceAdjustment,
      alertLevel,
      alertMessage,
      currentProfit,
      suggestedProfit,
    };
  }, [oldCost, newCost, currentSellingPrice, targetMargin, minMargin, maxPriceIncrease, roundTo]);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Batch Pricing Hook
// ═══════════════════════════════════════════════════════════════════════════

export interface BatchPricingItem {
  productId: string;
  productName: string;
  oldCost: number;
  newCost: number;
  currentSellingPrice: number;
}

export interface BatchPricingResult {
  items: (BatchPricingItem & SmartPricingResult)[];
  summary: {
    totalItems: number;
    itemsNeedingAdjustment: number;
    criticalItems: number;
    warningItems: number;
    averageMargin: number;
    totalCurrentValue: number;
    totalSuggestedValue: number;
  };
}

/**
 * 💰 Hook للتسعير الذكي للمجموعات
 */
export function useBatchSmartPricing(
  items: BatchPricingItem[],
  config: Omit<PricingConfig, 'oldCost' | 'newCost' | 'currentSellingPrice'> = {}
): BatchPricingResult {
  const {
    targetMargin = 30,
    minMargin = 10,
    maxPriceIncrease = 50,
    roundTo = 10,
  } = config;

  return useMemo(() => {
    const processedItems = items.map(item => {
      const pricing = calculatePricing({
        oldCost: item.oldCost,
        newCost: item.newCost,
        currentSellingPrice: item.currentSellingPrice,
        targetMargin,
        minMargin,
        maxPriceIncrease,
        roundTo,
      });

      return {
        ...item,
        ...pricing,
      };
    });

    // حساب الملخص
    const itemsNeedingAdjustment = processedItems.filter(i => i.needsPriceAdjustment).length;
    const criticalItems = processedItems.filter(i => i.alertLevel === 'critical').length;
    const warningItems = processedItems.filter(i => i.alertLevel === 'warning').length;

    const totalMargins = processedItems.reduce((sum, i) => sum + i.currentMargin, 0);
    const averageMargin = items.length > 0 ? totalMargins / items.length : 0;

    const totalCurrentValue = processedItems.reduce((sum, i) => sum + i.currentSellingPrice, 0);
    const totalSuggestedValue = processedItems.reduce((sum, i) => sum + i.suggestedPrice, 0);

    return {
      items: processedItems,
      summary: {
        totalItems: items.length,
        itemsNeedingAdjustment,
        criticalItems,
        warningItems,
        averageMargin,
        totalCurrentValue,
        totalSuggestedValue,
      },
    };
  }, [items, targetMargin, minMargin, maxPriceIncrease, roundTo]);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * حساب التسعير (دالة مساعدة)
 */
function calculatePricing(config: PricingConfig): SmartPricingResult {
  const {
    oldCost,
    newCost,
    currentSellingPrice,
    targetMargin = 30,
    minMargin = 10,
    maxPriceIncrease = 50,
    roundTo = 10,
  } = config;

  const costChangePercent = oldCost > 0
    ? ((newCost - oldCost) / oldCost) * 100
    : 0;

  const costIncreased = newCost > oldCost;

  const currentProfit = currentSellingPrice - newCost;
  const currentMargin = currentSellingPrice > 0
    ? (currentProfit / currentSellingPrice) * 100
    : 0;

  let suggestedPrice = newCost / (1 - targetMargin / 100);

  if (roundTo > 0) {
    suggestedPrice = Math.ceil(suggestedPrice / roundTo) * roundTo;
  }

  const maxAllowedPrice = currentSellingPrice * (1 + maxPriceIncrease / 100);
  if (suggestedPrice > maxAllowedPrice) {
    suggestedPrice = Math.ceil(maxAllowedPrice / roundTo) * roundTo;
  }

  const suggestedProfit = suggestedPrice - newCost;
  const suggestedMargin = suggestedPrice > 0
    ? (suggestedProfit / suggestedPrice) * 100
    : 0;

  const priceChangePercent = currentSellingPrice > 0
    ? ((suggestedPrice - currentSellingPrice) / currentSellingPrice) * 100
    : 0;

  const needsPriceAdjustment =
    currentMargin < minMargin ||
    (costIncreased && Math.abs(costChangePercent) > 5);

  let alertLevel: 'none' | 'info' | 'warning' | 'critical' = 'none';
  let alertMessage = '';

  if (currentMargin < 0) {
    alertLevel = 'critical';
    alertMessage = '⚠️ تحذير: أنت تبيع بخسارة!';
  } else if (currentMargin < minMargin) {
    alertLevel = 'warning';
    alertMessage = `⚠️ الهامش منخفض (${currentMargin.toFixed(1)}%)`;
  } else if (costIncreased && costChangePercent > 10) {
    alertLevel = 'warning';
    alertMessage = `📈 التكلفة ارتفعت ${costChangePercent.toFixed(1)}%`;
  } else if (costIncreased && costChangePercent > 5) {
    alertLevel = 'info';
    alertMessage = `ℹ️ التكلفة ارتفعت ${costChangePercent.toFixed(1)}%`;
  }

  return {
    suggestedPrice,
    currentMargin,
    suggestedMargin,
    costChangePercent,
    priceChangePercent,
    costIncreased,
    needsPriceAdjustment,
    alertLevel,
    alertMessage,
    currentProfit,
    suggestedProfit,
  };
}

/**
 * حساب السعر المقترح مباشرة
 */
export function calculateSuggestedPrice(
  cost: number,
  targetMargin: number = 30,
  roundTo: number = 10
): number {
  const price = cost / (1 - targetMargin / 100);
  return roundTo > 0 ? Math.ceil(price / roundTo) * roundTo : price;
}

/**
 * حساب الهامش من السعر والتكلفة
 */
export function calculateMargin(sellingPrice: number, cost: number): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - cost) / sellingPrice) * 100;
}

/**
 * حساب التكلفة من السعر والهامش
 */
export function calculateCostFromMargin(sellingPrice: number, margin: number): number {
  return sellingPrice * (1 - margin / 100);
}

/**
 * حساب السعر من التكلفة والهامش
 */
export function calculatePriceFromMargin(cost: number, margin: number): number {
  if (margin >= 100) return cost * 2; // تجنب القسمة على صفر
  return cost / (1 - margin / 100);
}

/**
 * تنسيق نسبة مئوية
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * تنسيق العملة
 */
export function formatCurrency(
  value: number,
  currency: string = 'DZD',
  locale: string = 'ar-DZ'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * الحصول على لون التنبيه
 */
export function getAlertColor(level: SmartPricingResult['alertLevel']): string {
  switch (level) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
      return 'blue';
    default:
      return 'green';
  }
}

export default useSmartPricing;
