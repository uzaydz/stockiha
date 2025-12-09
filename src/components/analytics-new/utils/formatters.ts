/**
 * ============================================
 * STOCKIHA ANALYTICS - FORMATTERS
 * دوال التنسيق للأرقام والتواريخ والعملات
 * ============================================
 */

// ==================== Currency Formatting ====================

const CURRENCY_LOCALE = 'ar-DZ';
const CURRENCY_CODE = 'DZD';

/**
 * تنسيق المبلغ كعملة
 */
export function formatCurrency(
  value: number,
  options: {
    showSymbol?: boolean;
    compact?: boolean;
    decimals?: number;
  } = {}
): string {
  const { showSymbol = true, compact = false, decimals = 0 } = options;

  if (compact && Math.abs(value) >= 1000) {
    return formatCompactCurrency(value, showSymbol);
  }

  try {
    const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: CURRENCY_CODE,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);

    // Replace DZD with DA for cleaner display
    return formatted.replace('DZD', 'DA').replace('د.ج.‏', 'DA');
  } catch {
    return `${value.toFixed(decimals)} DA`;
  }
}

/**
 * تنسيق مختصر للمبالغ الكبيرة
 */
export function formatCompactCurrency(value: number, showSymbol: boolean = true): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  let formatted: string;
  let suffix: string;

  if (absValue >= 1_000_000_000) {
    formatted = (absValue / 1_000_000_000).toFixed(1);
    suffix = 'B';
  } else if (absValue >= 1_000_000) {
    formatted = (absValue / 1_000_000).toFixed(1);
    suffix = 'M';
  } else if (absValue >= 1_000) {
    formatted = (absValue / 1_000).toFixed(1);
    suffix = 'K';
  } else {
    formatted = absValue.toFixed(0);
    suffix = '';
  }

  // Remove trailing .0
  formatted = formatted.replace(/\.0$/, '');

  const currencySymbol = showSymbol ? ' DA' : '';
  return `${sign}${formatted}${suffix}${currencySymbol}`;
}

/**
 * تنسيق المبلغ للعرض في KPI Cards
 */
export function formatKPICurrency(value: number): { main: string; suffix: string } {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    const main = (absValue / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
    return { main: `${sign}${main}`, suffix: 'M DA' };
  } else if (absValue >= 1_000) {
    const main = (absValue / 1_000).toFixed(1).replace(/\.?0+$/, '');
    return { main: `${sign}${main}`, suffix: 'K DA' };
  } else {
    return { main: `${sign}${absValue.toFixed(0)}`, suffix: 'DA' };
  }
}

// ==================== Number Formatting ====================

/**
 * تنسيق الأرقام العادية
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
  } = {}
): string {
  const { decimals = 0, compact = false } = options;

  if (compact && Math.abs(value) >= 1000) {
    return formatCompactNumber(value);
  }

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return value.toFixed(decimals);
  }
}

/**
 * تنسيق مختصر للأرقام الكبيرة
 */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  } else if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${sign}${absValue.toFixed(0)}`;
}

// ==================== Percentage Formatting ====================

/**
 * تنسيق النسبة المئوية
 */
export function formatPercent(
  value: number,
  options: {
    decimals?: number;
    showSign?: boolean;
  } = {}
): string {
  const { decimals = 1, showSign = false } = options;

  const formatted = value.toFixed(decimals);
  const sign = showSign && value > 0 ? '+' : '';

  return `${sign}${formatted}%`;
}

/**
 * تنسيق نسبة التغير
 */
export function formatChange(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

// ==================== Weight & Measurement Formatting ====================

/**
 * تنسيق الوزن
 */
export function formatWeight(value: number, unit: string = 'kg'): string {
  const unitLabels: Record<string, string> = {
    kg: 'كغ',
    g: 'غ',
    lb: 'رطل',
    oz: 'أونصة',
  };

  return `${formatNumber(value, { decimals: 2 })} ${unitLabels[unit] || unit}`;
}

/**
 * تنسيق الطول/المتر
 */
export function formatLength(value: number, unit: string = 'm'): string {
  const unitLabels: Record<string, string> = {
    m: 'م',
    cm: 'سم',
    ft: 'قدم',
    inch: 'بوصة',
  };

  return `${formatNumber(value, { decimals: 2 })} ${unitLabels[unit] || unit}`;
}

/**
 * تنسيق عدد الصناديق
 */
export function formatBoxes(value: number): string {
  return `${formatNumber(value)} صندوق`;
}

// ==================== Date Formatting ====================

/**
 * تنسيق التاريخ
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    short: { day: 'numeric', month: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  }[format];

  try {
    return new Intl.DateTimeFormat('ar-DZ', options).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * تنسيق الوقت
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  try {
    return new Intl.DateTimeFormat('ar-DZ', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

/**
 * تنسيق التاريخ والوقت معاً
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  try {
    return new Intl.DateTimeFormat('ar-DZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/**
 * تنسيق نطاق التاريخ
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = formatDate(start, 'medium');
  const endStr = formatDate(end, 'medium');

  if (startStr === endStr) {
    return startStr;
  }

  return `${startStr} - ${endStr}`;
}

/**
 * حساب الفرق بين تاريخين (نص وصفي)
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return 'الآن';
      return `منذ ${diffMinutes} دقيقة`;
    }
    return `منذ ${diffHours} ساعة`;
  } else if (diffDays === 1) {
    return 'أمس';
  } else if (diffDays < 7) {
    return `منذ ${diffDays} أيام`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `منذ ${weeks} أسبوع`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `منذ ${months} شهر`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `منذ ${years} سنة`;
  }
}

// ==================== Chart Formatting ====================

/**
 * تنسيق قيمة المحور Y في الرسوم البيانية
 */
export function formatAxisValue(value: number | string | null | undefined): string {
  // Convert to number if needed
  let numValue: number;
  
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else if (value === null || value === undefined) {
    return '0';
  } else {
    // Fallback for any other type
    numValue = Number(value);
  }
  
  // Check if the value is a valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '0';
  }
  
  if (Math.abs(numValue) >= 1_000_000) {
    return `${(numValue / 1_000_000).toFixed(0)}M`;
  } else if (Math.abs(numValue) >= 1_000) {
    return `${(numValue / 1_000).toFixed(0)}K`;
  }
  return numValue.toFixed(0);
}

/**
 * تنسيق تسمية الشهر
 */
export function formatMonthLabel(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar-DZ', { month: 'short' }).format(d);
}

/**
 * تنسيق تسمية اليوم في الأسبوع
 */
export function formatDayLabel(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar-DZ', { weekday: 'short' }).format(d);
}

// ==================== Status & Label Formatting ====================

/**
 * تسميات أنواع الخسائر
 */
export const lossTypeLabels: Record<string, string> = {
  damage: 'تلف',
  damaged: 'تالف',
  expiry: 'انتهاء صلاحية',
  expired: 'منتهي الصلاحية',
  theft: 'سرقة',
  spoilage: 'فساد',
  breakage: 'كسر',
  defective: 'عيب صناعي',
  shortage: 'نقص',
  water_damage: 'تلف مائي',
  fire_damage: 'تلف حريق',
  other: 'أخرى',
};

/**
 * تسميات أسباب الإرجاع
 */
export const returnReasonLabels: Record<string, string> = {
  defective: 'معيب',
  wrong_item: 'منتج خاطئ',
  not_as_described: 'غير مطابق للوصف',
  changed_mind: 'غير رأيه',
  size_issue: 'مشكلة في المقاس',
  color_issue: 'مشكلة في اللون',
  damaged: 'تالف',
  expired: 'منتهي الصلاحية',
  other: 'أخرى',
};

/**
 * تسميات طرق الدفع
 */
export const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  card: 'بطاقة',
  bank_transfer: 'تحويل بنكي',
  ccp: 'CCP',
  baridimob: 'بريدي موب',
  credit: 'آجل',
  mixed: 'مختلط',
  other: 'أخرى',
};

/**
 * تسميات أنواع البيع
 */
export const saleTypeLabels: Record<string, string> = {
  retail: 'تجزئة',
  wholesale: 'جملة',
  partial_wholesale: 'نصف جملة',
};

/**
 * تسميات أنواع المنتجات
 */
export const productTypeLabels: Record<string, string> = {
  piece: 'قطعة',
  weight: 'وزن',
  meter: 'متر',
  box: 'صندوق',
};

/**
 * تسميات حالات الطلب
 */
export const orderStatusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  processing: 'جاري المعالجة',
  completed: 'مكتمل',
  paid: 'مدفوع',
  cancelled: 'ملغي',
  refunded: 'مسترد',
};

// ==================== Utility ====================

/**
 * تحويل رقم آمن
 */
export function safeNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * حساب النسبة المئوية
 */
export function calculatePercent(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * حساب نسبة التغير
 */
export function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}
