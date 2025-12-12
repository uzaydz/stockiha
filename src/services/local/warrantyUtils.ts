/**
 * 🛡️ Warranty Utilities - أدوات حساب الضمان
 * ============================================================
 * توحيد حساب الضمان في مكان واحد
 *
 * المشكلة:
 * - بعض المنتجات تستخدم warranty_months
 * - بعضها يستخدم warranty_duration_months
 * - بعضها يستخدم has_warranty + warranty_type
 *
 * الحل:
 * - دالة واحدة getWarrantyMonths تتعامل مع كل الحالات
 *
 * @version 1.0.0
 * @date 2025-12-12
 */

import { Product } from '@/types';

// =====================================================
// الأنواع
// =====================================================

export interface WarrantyInfo {
  hasWarranty: boolean;
  months: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  isUnderWarranty?: boolean;
  daysRemaining?: number;
}

export interface ProductWithWarranty {
  warranty_months?: number;
  warranty_duration_months?: number;
  has_warranty?: boolean | number;
  warranty_type?: string;
}

// =====================================================
// الدوال الرئيسية
// =====================================================

/**
 * الحصول على عدد أشهر الضمان من المنتج
 * يتعامل مع جميع أسماء الحقول المختلفة
 */
export function getWarrantyMonths(product: ProductWithWarranty | null | undefined): number {
  if (!product) return 0;

  // الترتيب حسب الأولوية
  // 1. warranty_duration_months (الاسم الجديد المُفضل)
  if (typeof product.warranty_duration_months === 'number' && product.warranty_duration_months > 0) {
    return product.warranty_duration_months;
  }

  // 2. warranty_months (الاسم القديم)
  if (typeof product.warranty_months === 'number' && product.warranty_months > 0) {
    return product.warranty_months;
  }

  // 3. التحقق من has_warranty flag
  const hasWarranty = product.has_warranty === true || product.has_warranty === 1;
  if (!hasWarranty) {
    return 0;
  }

  // إذا كان has_warranty = true لكن لا يوجد أشهر محددة، نفترض 12 شهر (سنة)
  return 12;
}

/**
 * التحقق إذا كان المنتج له ضمان
 */
export function hasWarranty(product: ProductWithWarranty | null | undefined): boolean {
  if (!product) return false;

  // التحقق من has_warranty flag أولاً
  if (product.has_warranty === true || product.has_warranty === 1) {
    return true;
  }

  // التحقق من وجود أشهر ضمان
  return getWarrantyMonths(product) > 0;
}

/**
 * الحصول على نوع الضمان
 */
export function getWarrantyType(product: ProductWithWarranty | null | undefined): string | undefined {
  if (!product || !hasWarranty(product)) return undefined;
  return product.warranty_type;
}

/**
 * حساب تاريخ انتهاء الضمان
 */
export function calculateWarrantyEndDate(
  startDate: Date | string,
  months: number
): Date {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
}

/**
 * الحصول على معلومات الضمان الكاملة
 */
export function getWarrantyInfo(
  product: ProductWithWarranty | null | undefined,
  warrantyStartDate?: string
): WarrantyInfo {
  const months = getWarrantyMonths(product);
  const hasWarrantyFlag = months > 0;

  const info: WarrantyInfo = {
    hasWarranty: hasWarrantyFlag,
    months,
    type: getWarrantyType(product)
  };

  if (hasWarrantyFlag && warrantyStartDate) {
    info.startDate = warrantyStartDate;
    const endDate = calculateWarrantyEndDate(warrantyStartDate, months);
    info.endDate = endDate.toISOString();

    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    info.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    info.isUnderWarranty = info.daysRemaining > 0;
  }

  return info;
}

/**
 * التحقق إذا كان الضمان لا يزال سارياً
 */
export function isWarrantyValid(
  warrantyEndDate: string | Date | null | undefined
): boolean {
  if (!warrantyEndDate) return false;

  const end = typeof warrantyEndDate === 'string'
    ? new Date(warrantyEndDate)
    : warrantyEndDate;

  return end > new Date();
}

/**
 * حساب الأيام المتبقية من الضمان
 */
export function getWarrantyDaysRemaining(
  warrantyEndDate: string | Date | null | undefined
): number {
  if (!warrantyEndDate) return 0;

  const end = typeof warrantyEndDate === 'string'
    ? new Date(warrantyEndDate)
    : warrantyEndDate;

  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * تنسيق عرض الضمان
 */
export function formatWarrantyDisplay(months: number): string {
  if (months <= 0) return 'بدون ضمان';
  if (months === 1) return 'شهر واحد';
  if (months === 2) return 'شهران';
  if (months >= 3 && months <= 10) return `${months} أشهر`;
  if (months === 12) return 'سنة';
  if (months === 24) return 'سنتان';
  if (months % 12 === 0) {
    const years = months / 12;
    if (years >= 3 && years <= 10) return `${years} سنوات`;
    return `${years} سنة`;
  }
  return `${months} شهر`;
}

/**
 * تنسيق حالة الضمان
 */
export function formatWarrantyStatus(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'منتهي';
  if (daysRemaining <= 7) return 'ينتهي خلال أسبوع';
  if (daysRemaining <= 30) return 'ينتهي خلال شهر';
  if (daysRemaining <= 90) return 'ينتهي خلال 3 أشهر';
  return 'ساري';
}

// =====================================================
// التصدير
// =====================================================

export default {
  getWarrantyMonths,
  hasWarranty,
  getWarrantyType,
  calculateWarrantyEndDate,
  getWarrantyInfo,
  isWarrantyValid,
  getWarrantyDaysRemaining,
  formatWarrantyDisplay,
  formatWarrantyStatus
};
