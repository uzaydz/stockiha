// أسباب الإرجاع المحددة في قاعدة البيانات
export const RETURN_REASONS = {
  defective: 'منتج معيب',
  wrong_item: 'منتج خاطئ',
  customer_request: 'طلب العميل',
  damaged: 'تالف',
  expired: 'منتهي الصلاحية',
  wrong_size: 'مقاس خاطئ',
  wrong_color: 'لون خاطئ',
  quality_issue: 'مشكلة في الجودة',
  other: 'أخرى'
} as const;

// نوع أسباب الإرجاع
export type ReturnReason = keyof typeof RETURN_REASONS;

// قائمة أسباب الإرجاع كمصفوفة
export const RETURN_REASONS_ARRAY = Object.entries(RETURN_REASONS).map(([value, label]) => ({
  value: value as ReturnReason,
  label
}));

// دالة للحصول على تسمية السبب
export const getReturnReasonLabel = (reason: string): string => {
  return RETURN_REASONS[reason as ReturnReason] || reason;
};

// أسباب الإرجاع مع رموز تعبيرية للواجهة المحسنة
export const RETURN_REASONS_WITH_ICONS = {
  defective: '🔧 منتج معيب',
  wrong_item: '❌ منتج خاطئ',
  customer_request: '💭 طلب العميل',
  damaged: '💥 تالف',
  expired: '⏰ منتهي الصلاحية',
  wrong_size: '📏 مقاس خاطئ',
  wrong_color: '🎨 لون خاطئ',
  quality_issue: '⚠️ مشكلة في الجودة',
  other: '📝 أخرى'
} as const;

// قائمة أسباب الإرجاع مع الرموز التعبيرية
export const RETURN_REASONS_WITH_ICONS_ARRAY = Object.entries(RETURN_REASONS_WITH_ICONS).map(([value, label]) => ({
  value: value as ReturnReason,
  label
})); 