/**
 * 📦 useLandedCostDistributor - Hook لتوزيع التكاليف الإضافية
 * ============================================================
 *
 * يدير توزيع التكاليف الإضافية (شحن، جمارك، تأمين) على المنتجات
 * - التوزيع حسب القيمة
 * - التوزيع حسب الكمية
 * - التوزيع حسب الوزن
 * - التوزيع بالتساوي
 *
 * ============================================================
 */

import { useMemo, useCallback } from 'react';
import type {
  SmartPurchaseItem,
  LandedCost,
  LandedCostsSummary,
  CostDistributionMethod,
} from '../types/smart-purchase.types';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface LandedCostDistributorConfig {
  /** عناصر المشتريات */
  items: SmartPurchaseItem[];
  /** التكاليف الإضافية */
  costs: LandedCost[];
  /** طريقة التوزيع الافتراضية */
  defaultMethod?: CostDistributionMethod;
}

export interface ItemWithLandedCost extends SmartPurchaseItem {
  /** حصة التكاليف الإضافية */
  landedCostShare: number;
  /** التكلفة النهائية الحقيقية */
  finalCost: number;
  /** التكلفة النهائية للوحدة الأساسية */
  finalBaseCost: number;
  /** تفاصيل التوزيع لكل تكلفة */
  costBreakdown: Record<string, number>;
}

export interface LandedCostDistributorResult {
  /** العناصر مع التكاليف الموزعة */
  itemsWithCosts: ItemWithLandedCost[];
  /** ملخص التكاليف */
  summary: LandedCostsSummary;
  /** إجمالي التكاليف الإضافية */
  totalLandedCosts: number;
  /** إجمالي تكلفة المشتريات (مع التكاليف الإضافية) */
  grandTotal: number;
  /** دالة لإضافة تكلفة */
  addCost: (cost: Omit<LandedCost, 'id'>) => void;
  /** دالة لحذف تكلفة */
  removeCost: (costId: string) => void;
  /** دالة لتعديل تكلفة */
  updateCost: (costId: string, updates: Partial<LandedCost>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📦 Hook لتوزيع التكاليف الإضافية
 *
 * @example
 * ```tsx
 * const { itemsWithCosts, totalLandedCosts, addCost } = useLandedCostDistributor({
 *   items: purchaseItems,
 *   costs: [
 *     { id: '1', type: 'shipping', label: 'شحن', amount: 5000, distributionMethod: 'by_value' }
 *   ]
 * });
 * ```
 */
export function useLandedCostDistributor(
  config: LandedCostDistributorConfig
): LandedCostDistributorResult {
  const { items, costs, defaultMethod = 'by_value' } = config;

  // حساب إجمالي القيم للتوزيع
  const totals = useMemo(() => {
    let totalValue = 0;
    let totalQuantity = 0;
    let totalWeight = 0;

    for (const item of items) {
      totalValue += item.totalCost;
      totalQuantity += item.baseQuantity;
      // افتراض وزن 1 للعناصر بدون وزن
      totalWeight += item.baseQuantity; // يمكن تعديله لاحقاً لدعم الوزن الفعلي
    }

    return { totalValue, totalQuantity, totalWeight, itemCount: items.length };
  }, [items]);

  // توزيع التكاليف على العناصر
  const itemsWithCosts = useMemo((): ItemWithLandedCost[] => {
    if (items.length === 0) return [];

    // حساب التوزيع لكل تكلفة
    const distributions = costs.map(cost => {
      return distributeCost(cost, items, totals, defaultMethod);
    });

    // تجميع التوزيعات على كل عنصر
    return items.map((item, index) => {
      let landedCostShare = 0;
      const costBreakdown: Record<string, number> = {};

      for (let i = 0; i < costs.length; i++) {
        const share = distributions[i][index] || 0;
        landedCostShare += share;
        costBreakdown[costs[i].id] = share;
      }

      const finalCost = item.totalCost + landedCostShare;
      const finalBaseCost = item.baseQuantity > 0
        ? finalCost / item.baseQuantity
        : 0;

      return {
        ...item,
        landedCostShare,
        finalCost,
        finalBaseCost,
        costBreakdown,
      };
    });
  }, [items, costs, totals, defaultMethod]);

  // حساب الملخصات
  const { summary, totalLandedCosts, grandTotal } = useMemo(() => {
    const totalLandedCosts = costs.reduce((sum, c) => sum + c.amount, 0);

    // توزيع كل تكلفة على العناصر
    const distributedAmounts: Record<string, number> = {};
    for (const item of itemsWithCosts) {
      distributedAmounts[item.id] = item.landedCostShare;
    }

    const itemsTotal = items.reduce((sum, i) => sum + i.totalCost, 0);
    const grandTotal = itemsTotal + totalLandedCosts;

    return {
      summary: {
        costs,
        totalAmount: totalLandedCosts,
        distributedAmounts,
      },
      totalLandedCosts,
      grandTotal,
    };
  }, [costs, items, itemsWithCosts]);

  // دوال الإدارة (ستحتاج state خارجي)
  const addCost = useCallback((cost: Omit<LandedCost, 'id'>) => {
    // يتم التنفيذ في المكون الأب
    console.log('Add cost:', cost);
  }, []);

  const removeCost = useCallback((costId: string) => {
    // يتم التنفيذ في المكون الأب
    console.log('Remove cost:', costId);
  }, []);

  const updateCost = useCallback((costId: string, updates: Partial<LandedCost>) => {
    // يتم التنفيذ في المكون الأب
    console.log('Update cost:', costId, updates);
  }, []);

  return {
    itemsWithCosts,
    summary,
    totalLandedCosts,
    grandTotal,
    addCost,
    removeCost,
    updateCost,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * توزيع تكلفة واحدة على العناصر
 */
function distributeCost(
  cost: LandedCost,
  items: SmartPurchaseItem[],
  totals: { totalValue: number; totalQuantity: number; totalWeight: number; itemCount: number },
  defaultMethod: CostDistributionMethod
): number[] {
  const method = cost.distributionMethod || defaultMethod;
  const distributions: number[] = [];

  if (items.length === 0 || cost.amount === 0) {
    return items.map(() => 0);
  }

  switch (method) {
    case 'by_value':
      // التوزيع حسب القيمة
      if (totals.totalValue === 0) {
        return items.map(() => cost.amount / items.length);
      }
      for (const item of items) {
        const ratio = item.totalCost / totals.totalValue;
        distributions.push(cost.amount * ratio);
      }
      break;

    case 'by_quantity':
      // التوزيع حسب الكمية
      if (totals.totalQuantity === 0) {
        return items.map(() => cost.amount / items.length);
      }
      for (const item of items) {
        const ratio = item.baseQuantity / totals.totalQuantity;
        distributions.push(cost.amount * ratio);
      }
      break;

    case 'by_weight':
      // التوزيع حسب الوزن (مؤقتاً نستخدم الكمية)
      if (totals.totalWeight === 0) {
        return items.map(() => cost.amount / items.length);
      }
      for (const item of items) {
        const ratio = item.baseQuantity / totals.totalWeight;
        distributions.push(cost.amount * ratio);
      }
      break;

    case 'equal':
    default:
      // التوزيع بالتساوي
      const perItem = cost.amount / totals.itemCount;
      for (let i = 0; i < items.length; i++) {
        distributions.push(perItem);
      }
      break;
  }

  return distributions;
}

/**
 * حساب التكلفة النهائية للوحدة
 */
export function calculateFinalUnitCost(
  itemCost: number,
  landedCostShare: number,
  quantity: number
): number {
  if (quantity === 0) return 0;
  return (itemCost + landedCostShare) / quantity;
}

/**
 * حساب نسبة التكاليف الإضافية من التكلفة الإجمالية
 */
export function calculateLandedCostPercentage(
  landedCostShare: number,
  totalCost: number
): number {
  if (totalCost === 0) return 0;
  return (landedCostShare / totalCost) * 100;
}

/**
 * إنشاء تكلفة إضافية جديدة
 */
export function createLandedCost(
  type: LandedCost['type'],
  amount: number,
  label?: string,
  method: CostDistributionMethod = 'by_value'
): LandedCost {
  const labels: Record<LandedCost['type'], string> = {
    shipping: 'شحن',
    customs: 'جمارك',
    insurance: 'تأمين',
    handling: 'مناولة',
    other: 'أخرى',
  };

  return {
    id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    label: label || labels[type],
    amount,
    distributionMethod: method,
  };
}

/**
 * تنسيق مبلغ التكلفة
 */
export function formatLandedCost(
  amount: number,
  currency: string = 'DZD',
  locale: string = 'ar-DZ'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * الحصول على أيقونة نوع التكلفة
 */
export function getLandedCostIcon(type: LandedCost['type']): string {
  const icons: Record<LandedCost['type'], string> = {
    shipping: '🚚',
    customs: '🛃',
    insurance: '🛡️',
    handling: '📦',
    other: '💰',
  };
  return icons[type] || '💰';
}

/**
 * الحصول على وصف طريقة التوزيع
 */
export function getDistributionMethodLabel(
  method: CostDistributionMethod,
  locale: 'ar' | 'en' = 'ar'
): string {
  const labels: Record<CostDistributionMethod, { ar: string; en: string }> = {
    by_value: { ar: 'حسب القيمة', en: 'By Value' },
    by_quantity: { ar: 'حسب الكمية', en: 'By Quantity' },
    by_weight: { ar: 'حسب الوزن', en: 'By Weight' },
    equal: { ar: 'بالتساوي', en: 'Equal' },
  };
  return labels[method][locale];
}

/**
 * التحقق من صحة التكلفة
 */
export function validateLandedCost(cost: Partial<LandedCost>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!cost.type) {
    errors.push('نوع التكلفة مطلوب');
  }

  if (cost.amount === undefined || cost.amount < 0) {
    errors.push('المبلغ يجب أن يكون صفر أو أكثر');
  }

  if (!cost.label || cost.label.trim() === '') {
    errors.push('اسم التكلفة مطلوب');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default useLandedCostDistributor;
