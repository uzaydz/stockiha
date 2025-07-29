// 🔄 تحديث 2025-07-04: إصلاح المنطقة الزمنية للتحليلات المالية
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, startOfQuarter, endOfQuarter } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { DateRange, FinancialData, ChartDataItem } from './types';

// 💰 تنسيق العملة بالدينار الجزائري
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// 📊 تنسيق النسبة المئوية
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

// 📅 تنسيق التاريخ باللغة العربية
export const formatDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy', { locale: ar });
};

// 📅 تنسيق التاريخ والوقت
export const formatDateTime = (date: Date): string => {
  return format(date, 'dd/MM/yyyy HH:mm', { locale: ar });
};

// 📅 إعداد نطاقات التاريخ المحددة مسبقاً مع تصحيح المنطقة الزمنية
export const getDateRangePreset = (preset: string): DateRange => {
  // الحصول على التاريخ الحالي في الجزائر بشكل صحيح
  const now = new Date();
  
  // حساب التاريخ الجزائري بناءً على UTC+1
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // تحويل إلى UTC
  const algerianTime = utcTime + (1 * 3600000); // إضافة ساعة واحدة للجزائر (UTC+1)
  const algerianDate = new Date(algerianTime);

  let result: DateRange;
  
  switch (preset) {
    case 'today':
      // بدء اليوم والنهاية بالتوقيت الجزائري
      result = { 
        from: new Date(Date.UTC(algerianDate.getFullYear(), algerianDate.getMonth(), algerianDate.getDate(), 0, 0, 0)),
        to: new Date(Date.UTC(algerianDate.getFullYear(), algerianDate.getMonth(), algerianDate.getDate(), 23, 59, 59, 999))
      };
      break;
    case 'week':
      const weekAgo = new Date(algerianTime - (7 * 24 * 60 * 60 * 1000));
      result = { 
        from: new Date(Date.UTC(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate(), 0, 0, 0)),
        to: new Date(Date.UTC(algerianDate.getFullYear(), algerianDate.getMonth(), algerianDate.getDate(), 23, 59, 59, 999))
      };
      break;
    case 'month':
      result = { 
        from: new Date(Date.UTC(algerianDate.getFullYear(), algerianDate.getMonth(), 1, 0, 0, 0)),
        to: new Date(Date.UTC(algerianDate.getFullYear(), algerianDate.getMonth() + 1, 0, 23, 59, 59, 999))
      };
      break;
    case 'quarter':
      const quarterStart = Math.floor(algerianDate.getMonth() / 3) * 3;
      result = { 
        from: new Date(Date.UTC(algerianDate.getFullYear(), quarterStart, 1, 0, 0, 0)),
        to: new Date(Date.UTC(algerianDate.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999))
      };
      break;
    case 'year':
      result = { 
        from: new Date(Date.UTC(algerianDate.getFullYear(), 0, 1, 0, 0, 0)),
        to: new Date(Date.UTC(algerianDate.getFullYear(), 11, 31, 23, 59, 59, 999))
      };
      break;
    default:
      result = { 
        from: new Date(Date.UTC(algerianDate.getFullYear(), algerianDate.getMonth(), 1, 0, 0, 0)),
        to: new Date(Date.UTC(algerianDate.getFullYear(), algerianDate.getMonth() + 1, 0, 23, 59, 59, 999))
      };
  }

  return result;
};

// 📊 إعداد بيانات الرسوم البيانية للمبيعات
export const prepareSalesChartData = (data: FinancialData): ChartDataItem[] => {
  if (!data) return [];
  
  return [
    { 
      name: 'نقطة البيع', 
      value: data.pos_sales_revenue, 
      profit: data.pos_sales_profit 
    },
    { 
      name: 'المتجر الإلكتروني', 
      value: data.online_sales_revenue, 
      profit: data.online_sales_profit 
    },
    { 
      name: 'خدمات التصليح', 
      value: data.repair_services_revenue, 
      profit: data.repair_services_profit 
    },
    { 
      name: 'تحميل الألعاب', 
      value: data.game_downloads_revenue, 
      profit: data.game_downloads_profit 
    },
    { 
      name: 'الاشتراكات', 
      value: data.subscription_services_revenue, 
      profit: data.subscription_services_profit 
    }
  ].filter(item => item.value > 0);
};

// 📊 إعداد بيانات تحليل الأرباح
export const prepareProfitAnalysisData = (data: FinancialData): ChartDataItem[] => {
  if (!data) return [];
  
  return [
    { name: 'الإيرادات الإجمالية', value: data.total_revenue, amount: data.total_revenue },
    { name: 'التكلفة الإجمالية', value: data.total_cost, amount: data.total_cost },
    { name: 'الربح الإجمالي', value: data.total_gross_profit, amount: data.total_gross_profit },
    { name: 'المصروفات', value: data.total_expenses, amount: data.total_expenses },
    { name: 'الربح الصافي', value: data.total_net_profit, amount: data.total_net_profit }
  ];
};

// 📈 حساب نسبة النمو (يمكن إضافته لاحقاً)
export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// 📊 حساب هامش الربح
export const calculateProfitMargin = (revenue: number, cost: number): number => {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
};

// 🎨 الحصول على لون حسب النوع
export const getColorByType = (type: 'revenue' | 'profit' | 'cost' | 'debt' | 'success' | 'warning' | 'danger'): string => {
  const colorMap = {
    revenue: '#10B981', // أخضر للإيرادات
    profit: '#3B82F6',  // أزرق للربح
    cost: '#EF4444',    // أحمر للتكلفة
    debt: '#F59E0B',    // برتقالي للديون
    success: '#10B981', // أخضر للنجاح
    warning: '#F59E0B', // برتقالي للتحذير
    danger: '#EF4444'   // أحمر للخطر
  };
  
  return colorMap[type] || '#6B7280';
};

// 📱 التحقق من نقطة التقسيم الحالية
export const useCurrentBreakpoint = (): string => {
  if (typeof window === 'undefined') return 'lg';
  
  const width = window.innerWidth;
  
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  
  return 'xs';
};

// 🔢 تنسيق الأرقام الكبيرة (ك، م، ب)
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'ب';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'م';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'ك';
  }
  return num.toString();
};
