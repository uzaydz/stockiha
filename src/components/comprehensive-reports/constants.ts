/**
 * ثوابت التقارير المالية الشاملة
 * Comprehensive Financial Reports Constants
 */

// ==================== Color Palette ====================
// تصميم احترافي بسيط - ألوان محايدة مع ألوان بيانات محددة

export const REPORT_COLORS = {
  // ألوان محايدة للخلفية والنص
  background: {
    primary: 'bg-white dark:bg-zinc-900',
    secondary: 'bg-zinc-50 dark:bg-zinc-800',
    tertiary: 'bg-zinc-100 dark:bg-zinc-700',
  },
  text: {
    primary: 'text-zinc-900 dark:text-zinc-100',
    secondary: 'text-zinc-600 dark:text-zinc-400',
    muted: 'text-zinc-400 dark:text-zinc-500',
  },
  border: {
    default: 'border-zinc-200 dark:border-zinc-700',
    light: 'border-zinc-100 dark:border-zinc-800',
  },

  // ألوان البيانات - محدودة ومتناسقة
  data: {
    revenue: '#3b82f6',      // أزرق - الإيرادات
    costs: '#ef4444',        // أحمر - التكاليف
    profit: '#22c55e',       // أخضر - الأرباح
    zakat: '#8b5cf6',        // بنفسجي - الزكاة
    neutral: '#71717a',      // رمادي - محايد
  },

  // ألوان الحالة
  status: {
    success: 'text-emerald-600 dark:text-emerald-400',
    successBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    warning: 'text-amber-600 dark:text-amber-400',
    warningBg: 'bg-amber-50 dark:bg-amber-900/20',
    error: 'text-red-600 dark:text-red-400',
    errorBg: 'bg-red-50 dark:bg-red-900/20',
    info: 'text-blue-600 dark:text-blue-400',
    infoBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
} as const;

// ألوان الرسوم البيانية (HEX)
export const CHART_COLORS = {
  primary: '#3b82f6',        // أزرق
  secondary: '#22c55e',      // أخضر
  tertiary: '#8b5cf6',       // بنفسجي
  quaternary: '#f59e0b',     // برتقالي
  danger: '#ef4444',         // أحمر
  neutral: '#71717a',        // رمادي

  // تدرجات للمخططات
  gradients: {
    revenue: ['#3b82f6', '#60a5fa'],
    profit: ['#22c55e', '#4ade80'],
    costs: ['#ef4444', '#f87171'],
  },

  // ألوان الفئات (للمخططات الدائرية)
  categories: [
    '#3b82f6', // أزرق
    '#22c55e', // أخضر
    '#f59e0b', // برتقالي
    '#8b5cf6', // بنفسجي
    '#ef4444', // أحمر
    '#06b6d4', // سماوي
    '#ec4899', // وردي
    '#71717a', // رمادي
  ],
} as const;

// ==================== Chart Styles ====================

export const CHART_STYLES = {
  // إعدادات الخط
  font: {
    family: 'inherit',
    size: 12,
  },

  // إعدادات المحاور
  axis: {
    stroke: '#71717a',
    strokeWidth: 1,
    tickSize: 6,
  },

  // إعدادات الشبكة
  grid: {
    stroke: '#e4e4e7',
    strokeDasharray: '3 3',
  },

  // إعدادات Tooltip
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },

  // إعدادات Legend
  legend: {
    iconSize: 12,
    itemGap: 20,
  },

  // ارتفاعات افتراضية
  heights: {
    small: 200,
    medium: 300,
    large: 400,
    xlarge: 500,
  },

  // أنماط الخطوط
  line: {
    strokeWidth: 2,
    dot: { r: 4 },
    activeDot: { r: 6 },
  },

  // أنماط الأعمدة
  bar: {
    radius: [4, 4, 0, 0],
    maxBarSize: 50,
  },

  // أنماط المساحة
  area: {
    fillOpacity: 0.1,
    strokeWidth: 2,
  },
} as const;

// ==================== Date Presets ====================

export const DATE_PRESETS = {
  today: {
    key: 'today',
    label: 'اليوم',
    labelEn: 'Today',
  },
  yesterday: {
    key: 'yesterday',
    label: 'أمس',
    labelEn: 'Yesterday',
  },
  week: {
    key: 'week',
    label: 'هذا الأسبوع',
    labelEn: 'This Week',
  },
  month: {
    key: 'month',
    label: 'هذا الشهر',
    labelEn: 'This Month',
  },
  quarter: {
    key: 'quarter',
    label: 'هذا الربع',
    labelEn: 'This Quarter',
  },
  year: {
    key: 'year',
    label: 'هذه السنة',
    labelEn: 'This Year',
  },
  custom: {
    key: 'custom',
    label: 'مخصص',
    labelEn: 'Custom',
  },
} as const;

// ==================== Expense Categories ====================

export const EXPENSE_CATEGORIES = {
  rent: {
    key: 'rent',
    label: 'إيجار',
    labelEn: 'Rent',
    color: '#3b82f6',
  },
  salaries: {
    key: 'salaries',
    label: 'رواتب',
    labelEn: 'Salaries',
    color: '#22c55e',
  },
  utilities: {
    key: 'utilities',
    label: 'مرافق',
    labelEn: 'Utilities',
    color: '#f59e0b',
  },
  marketing: {
    key: 'marketing',
    label: 'تسويق',
    labelEn: 'Marketing',
    color: '#8b5cf6',
  },
  maintenance: {
    key: 'maintenance',
    label: 'صيانة',
    labelEn: 'Maintenance',
    color: '#ef4444',
  },
  transport: {
    key: 'transport',
    label: 'نقل',
    labelEn: 'Transport',
    color: '#06b6d4',
  },
  supplies: {
    key: 'supplies',
    label: 'مستلزمات',
    labelEn: 'Supplies',
    color: '#ec4899',
  },
  other: {
    key: 'other',
    label: 'أخرى',
    labelEn: 'Other',
    color: '#71717a',
  },
} as const;

// ==================== Loss Types ====================

export const LOSS_TYPES = {
  damaged: {
    key: 'damaged',
    label: 'تالف',
    labelEn: 'Damaged',
  },
  expired: {
    key: 'expired',
    label: 'منتهي الصلاحية',
    labelEn: 'Expired',
  },
  stolen: {
    key: 'stolen',
    label: 'مسروق',
    labelEn: 'Stolen',
  },
  returned_supplier: {
    key: 'returned_supplier',
    label: 'مرتجع للمورد',
    labelEn: 'Returned to Supplier',
  },
  adjustment: {
    key: 'adjustment',
    label: 'تعديل جرد',
    labelEn: 'Inventory Adjustment',
  },
  other: {
    key: 'other',
    label: 'أخرى',
    labelEn: 'Other',
  },
} as const;

// ==================== Return Reasons ====================

export const RETURN_REASONS = {
  defective: {
    key: 'defective',
    label: 'معيب',
    labelEn: 'Defective',
  },
  wrong_item: {
    key: 'wrong_item',
    label: 'منتج خاطئ',
    labelEn: 'Wrong Item',
  },
  not_as_described: {
    key: 'not_as_described',
    label: 'غير مطابق للوصف',
    labelEn: 'Not as Described',
  },
  changed_mind: {
    key: 'changed_mind',
    label: 'غير رأيه',
    labelEn: 'Changed Mind',
  },
  size_issue: {
    key: 'size_issue',
    label: 'مشكلة في المقاس',
    labelEn: 'Size Issue',
  },
  other: {
    key: 'other',
    label: 'أخرى',
    labelEn: 'Other',
  },
} as const;

// ==================== Zakat Constants ====================

export const ZAKAT_CONSTANTS = {
  // نسبة الزكاة
  rate: 0.025, // 2.5%

  // نصاب الذهب (بالجرام) - 85 جرام ذهب عيار 24
  nisabGoldGrams: 85,

  // نصاب الفضة (بالجرام) - 595 جرام فضة
  nisabSilverGrams: 595,

  // سعر الذهب الافتراضي (دينار جزائري) - يجب تحديثه
  defaultGoldPricePerGram: 17500, // ~17,500 DZD/gram

  // النصاب الافتراضي بالدينار الجزائري
  defaultNisabDZD: 1487500, // 85 * 17500
} as const;

// ==================== Revenue Sources ====================

export const REVENUE_SOURCES = {
  pos: {
    key: 'pos',
    label: 'مبيعات نقطة البيع',
    labelEn: 'POS Sales',
    color: CHART_COLORS.primary,
  },
  online: {
    key: 'online',
    label: 'مبيعات أونلاين',
    labelEn: 'Online Sales',
    color: CHART_COLORS.secondary,
  },
  repair: {
    key: 'repair',
    label: 'خدمات الإصلاح',
    labelEn: 'Repair Services',
    color: CHART_COLORS.tertiary,
  },
  subscription: {
    key: 'subscription',
    label: 'خدمات الاشتراكات',
    labelEn: 'Subscription Services',
    color: CHART_COLORS.quaternary,
  },
} as const;

// ==================== Payment Methods ====================

export const PAYMENT_METHODS = {
  cash: {
    key: 'cash',
    label: 'نقدي',
    labelEn: 'Cash',
  },
  card: {
    key: 'card',
    label: 'بطاقة',
    labelEn: 'Card',
  },
  bank_transfer: {
    key: 'bank_transfer',
    label: 'تحويل بنكي',
    labelEn: 'Bank Transfer',
  },
  ccp: {
    key: 'ccp',
    label: 'CCP',
    labelEn: 'CCP',
  },
  baridimob: {
    key: 'baridimob',
    label: 'بريدي موب',
    labelEn: 'BaridiMob',
  },
  credit: {
    key: 'credit',
    label: 'آجل',
    labelEn: 'Credit',
  },
} as const;

// ==================== Format Helpers ====================

export const FORMAT_OPTIONS = {
  currency: {
    locale: 'ar-DZ',
    style: 'currency' as const,
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  percentage: {
    locale: 'ar-DZ',
    style: 'percent' as const,
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  },
  number: {
    locale: 'ar-DZ',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  date: {
    locale: 'ar-DZ',
    dateStyle: 'medium' as const,
  },
  dateTime: {
    locale: 'ar-DZ',
    dateStyle: 'medium' as const,
    timeStyle: 'short' as const,
  },
} as const;

// ==================== Export Formats ====================

export const EXPORT_FORMATS = {
  pdf: {
    key: 'pdf',
    label: 'PDF',
    mimeType: 'application/pdf',
    extension: '.pdf',
  },
  excel: {
    key: 'excel',
    label: 'Excel',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: '.xlsx',
  },
  csv: {
    key: 'csv',
    label: 'CSV',
    mimeType: 'text/csv',
    extension: '.csv',
  },
} as const;

// ==================== Report Sections ====================

export const REPORT_SECTIONS = {
  kpi: {
    key: 'kpi',
    label: 'المؤشرات الرئيسية',
    labelEn: 'Key Performance Indicators',
  },
  revenue: {
    key: 'revenue',
    label: 'الإيرادات',
    labelEn: 'Revenue',
  },
  costs: {
    key: 'costs',
    label: 'التكاليف والمصاريف',
    labelEn: 'Costs & Expenses',
  },
  profit: {
    key: 'profit',
    label: 'الأرباح',
    labelEn: 'Profit',
  },
  inventory: {
    key: 'inventory',
    label: 'المخزون',
    labelEn: 'Inventory',
  },
  purchases: {
    key: 'purchases',
    label: 'المشتريات',
    labelEn: 'Purchases',
  },
  services: {
    key: 'services',
    label: 'الخدمات',
    labelEn: 'Services',
  },
  losses: {
    key: 'losses',
    label: 'الخسائر',
    labelEn: 'Losses',
  },
  returns: {
    key: 'returns',
    label: 'المرتجعات',
    labelEn: 'Returns',
  },
  zakat: {
    key: 'zakat',
    label: 'الزكاة',
    labelEn: 'Zakat',
  },
  trends: {
    key: 'trends',
    label: 'الاتجاهات',
    labelEn: 'Trends',
  },
} as const;
