// تنسيق الأرقام
export const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('ar-DZ').format(num);
};

// تنسيق النسب المئوية
export const formatPercentage = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return '0.0%';
  }
  return `${num.toFixed(1)}%`;
};

// تنسيق المبالغ
export const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 د.ج';
  }
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// ألوان الحالات
export const statusColors: Record<string, string> = {
  'pending': '#f59e0b',
  'processing': '#3b82f6',
  'shipped': '#8b5cf6',
  'delivered': '#10b981',
  'completed': '#059669',
  'cancelled': '#ef4444',
  'refunded': '#6b7280'
};

export const statusLabels: Record<string, string> = {
  'pending': 'معلق',
  'processing': 'قيد المعالجة',
  'shipped': 'تم الإرسال',
  'delivered': 'تم الاستلام',
  'completed': 'مكتمل',
  'cancelled': 'ملغي',
  'refunded': 'مُسترد'
};

// ألوان حالات الدفع
export const paymentStatusColors: Record<string, string> = {
  'pending': '#f59e0b',
  'paid': '#10b981',
  'partial': '#f97316',
  'failed': '#ef4444',
  'refunded': '#6b7280'
};

export const paymentStatusLabels: Record<string, string> = {
  'pending': 'معلق',
  'paid': 'مدفوع',
  'partial': 'جزئي',
  'failed': 'فشل',
  'refunded': 'مُسترد'
};

// ألوان طرق الدفع
export const paymentMethodColors: Record<string, string> = {
  'cash': '#10b981',
  'card': '#3b82f6',
  'credit': '#f59e0b',
  'transfer': '#8b5cf6'
};

export const paymentMethodLabels: Record<string, string> = {
  'cash': 'نقدي',
  'card': 'بطاقة',
  'credit': 'آجل',
  'transfer': 'تحويل'
}; 