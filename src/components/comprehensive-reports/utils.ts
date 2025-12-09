/**
 * أدوات مساعدة للتقارير المالية الشاملة
 * Utility functions for Comprehensive Financial Reports
 */

import { FORMAT_OPTIONS, ZAKAT_CONSTANTS, DATE_PRESETS } from './constants';
import type { DateRange, DatePreset } from './types';

// ==================== Date Utilities ====================

/**
 * الحصول على نطاق التاريخ من الـ preset
 */
export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return {
        from: today,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        from: yesterday,
        to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'week': {
      // بداية الأسبوع (السبت في التقويم العربي)
      const dayOfWeek = today.getDay();
      const diffToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
      const weekStart = new Date(today.getTime() - diffToSaturday * 24 * 60 * 60 * 1000);
      return {
        from: weekStart,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: monthStart,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
      return {
        from: quarterStart,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return {
        from: yearStart,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'custom':
    default:
      // افتراضي: الشهر الحالي
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
  }
}

/**
 * تنسيق التاريخ للـ SQL
 */
export function formatDateForSQL(date: Date): string {
  return date.toISOString();
}

/**
 * تنسيق التاريخ للعرض
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(FORMAT_OPTIONS.date.locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * الحصول على عدد الأيام بين تاريخين
 */
export function getDaysBetween(from: Date, to: Date): number {
  const diffTime = Math.abs(to.getTime() - from.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ==================== Number Formatting ====================

/**
 * تنسيق العملة
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0 د.ج';

  // تنسيق بسيط للدينار الجزائري
  const formatted = new Intl.NumberFormat('ar-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} د.ج`;
}

/**
 * تنسيق النسبة المئوية
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0%';

  return new Intl.NumberFormat('ar-DZ', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * تنسيق الأرقام
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0';

  return new Intl.NumberFormat('ar-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * تنسيق أرقام مختصرة (ك، م، مليار)
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)} مليار`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)} م`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)} ك`;
  }

  return formatNumber(value);
}

// ==================== Calculation Utilities ====================

/**
 * حساب النسبة المئوية
 */
export function calculatePercentage(part: number, total: number): number {
  if (!total || total === 0) return 0;
  return (part / total) * 100;
}

/**
 * حساب نسبة التغيير
 */
export function calculateChangePercentage(current: number, previous: number): number {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * حساب هامش الربح
 */
export function calculateProfitMargin(profit: number, revenue: number): number {
  if (!revenue || revenue === 0) return 0;
  return (profit / revenue) * 100;
}

/**
 * حساب الزكاة
 */
export function calculateZakat(
  zakatableBase: number,
  goldPricePerGram: number = ZAKAT_CONSTANTS.defaultGoldPricePerGram
): {
  nisab: number;
  isNisabReached: boolean;
  zakatAmount: number;
} {
  const nisab = ZAKAT_CONSTANTS.nisabGoldGrams * goldPricePerGram;
  const isNisabReached = zakatableBase >= nisab;
  const zakatAmount = isNisabReached ? zakatableBase * ZAKAT_CONSTANTS.rate : 0;

  return {
    nisab,
    isNisabReached,
    zakatAmount,
  };
}

// ==================== Data Aggregation ====================

/**
 * تجميع البيانات حسب التاريخ
 */
export function groupByDate<T>(
  items: T[],
  dateField: keyof T
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const dateValue = item[dateField];
    const dateStr = dateValue ? new Date(dateValue as any).toISOString().split('T')[0] : 'unknown';

    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(item);

    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * تجميع البيانات حسب الشهر
 */
export function groupByMonth<T>(
  items: T[],
  dateField: keyof T
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const dateValue = item[dateField];
    const date = dateValue ? new Date(dateValue as any) : null;
    const monthStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'unknown';

    if (!acc[monthStr]) {
      acc[monthStr] = [];
    }
    acc[monthStr].push(item);

    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * حساب المجموع لحقل معين
 */
export function sumBy<T>(items: T[], field: keyof T): number {
  return items.reduce((sum, item) => {
    const value = item[field];
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
}

/**
 * حساب المتوسط لحقل معين
 */
export function avgBy<T>(items: T[], field: keyof T): number {
  if (!items.length) return 0;
  return sumBy(items, field) / items.length;
}

// ==================== Trend Calculation ====================

/**
 * تحديد نوع التغيير
 */
export function getChangeType(change: number): 'increase' | 'decrease' | 'neutral' {
  if (change > 0) return 'increase';
  if (change < 0) return 'decrease';
  return 'neutral';
}

/**
 * حساب الاتجاه
 */
export function calculateTrend(
  current: number,
  previous: number
): {
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
} {
  const change = calculateChangePercentage(current, previous);
  return {
    value: current,
    change,
    changeType: getChangeType(change),
  };
}

// ==================== Safe Number Operations ====================

/**
 * تحويل آمن للرقم
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  if (value == null) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * جمع آمن للأرقام
 */
export function safeSum(...values: any[]): number {
  return values.reduce((sum, val) => sum + safeNumber(val), 0);
}

// ==================== Color Utilities ====================

/**
 * الحصول على لون حسب النسبة (أخضر للموجب، أحمر للسالب)
 */
export function getColorForValue(value: number): string {
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-zinc-600 dark:text-zinc-400';
}

/**
 * الحصول على خلفية حسب النسبة
 */
export function getBgColorForValue(value: number): string {
  if (value > 0) return 'bg-emerald-50 dark:bg-emerald-900/20';
  if (value < 0) return 'bg-red-50 dark:bg-red-900/20';
  return 'bg-zinc-50 dark:bg-zinc-800';
}

// ==================== Hijri Date (للزكاة) ====================

/**
 * تحويل تقريبي للتاريخ الهجري
 */
export function getApproximateHijriYear(date: Date = new Date()): string {
  // تحويل تقريبي (السنة الهجرية ≈ السنة الميلادية - 579)
  const gregorianYear = date.getFullYear();
  const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32)) + 1;
  return `${hijriYear} هـ`;
}

// ==================== Export Helpers ====================

/**
 * تحضير البيانات للتصدير
 */
export function prepareDataForExport<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string; format?: (value: any) => string }[]
): { headers: string[]; rows: string[][] } {
  const headers = columns.map(col => col.header);
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      return col.format ? col.format(value) : String(value ?? '');
    })
  );

  return { headers, rows };
}

/**
 * إنشاء اسم ملف التصدير
 */
export function generateExportFileName(
  reportName: string,
  dateRange: DateRange,
  extension: string
): string {
  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];
  const timestamp = new Date().getTime();

  return `${reportName}_${fromStr}_${toStr}_${timestamp}.${extension}`;
}
