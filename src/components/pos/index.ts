/**
 * مكونات نقطة البيع (POS)
 */

// مؤشر الوضع الحالي (موظف/مدير)
export { default as CurrentModeIndicator, CurrentModeBadge } from './CurrentModeIndicator';

// تبديل الموظف السريع
export { default as QuickStaffSwitch } from './QuickStaffSwitch';

// طباعة الفاتورة من نقطة البيع
export { default as PrintInvoiceFromPOS } from './PrintInvoiceFromPOS';
export type { PrintInvoiceFromPOSRef } from './PrintInvoiceFromPOS';
