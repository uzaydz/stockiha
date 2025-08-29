/**
 * TenantContext المحسن - مبسط ومقسم لتحسين الأداء
 * يستخدم المكونات المنفصلة لتحسين السرعة وسهولة الصيانة
 */

// إعادة تصدير المكونات المحسنة
export { TenantProvider, useTenant } from './tenant';

// تصدير للتوافق مع الإصدار السابق
export { 
  updateOrganizationFromData
} from '@/lib/processors/organizationProcessor';

export { 
  checkCustomDomain as getOrganizationFromCustomDomain
} from '@/utils/subdomainUtils';
