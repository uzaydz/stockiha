/**
 * أدوات لإنشاء روابط المعاينة الصحيحة للصفحات
 */

import { Organization } from '@/context/tenant/types';

/**
 * إنشاء رابط معاينة صحيح للصفحة باستخدام النطاق الفرعي أو المخصص للمؤسسة
 */
export const buildPreviewUrl = (
  slug: string, 
  organization: Organization | null,
  pageType: 'landing' | 'custom' = 'landing'
): string => {
  if (!organization) {
    // إذا لم تكن هناك مؤسسة، ارجع الرابط البسيط
    return `/${slug}`;
  }

  const currentHostname = window.location.hostname;
  const currentProtocol = window.location.protocol;
  const currentPort = window.location.port;
  
  // تحديد البادئة للصفحة حسب النوع
  const pagePrefix = pageType === 'custom' ? '/page' : '';
  
  // أولوية 1: النطاق المخصص
  if (organization.domain && organization.domain.trim()) {
    const customDomain = organization.domain.trim();
    const url = `${currentProtocol}//${customDomain}${pagePrefix}/${slug}`;
    return url;
  }
  
  // أولوية 2: النطاق الفرعي
  if (organization.subdomain && organization.subdomain.trim()) {
    const subdomain = organization.subdomain.trim();
    
    // في بيئة التطوير (localhost)
    if (currentHostname.includes('localhost')) {
      const port = currentPort ? `:${currentPort}` : '';
      const url = `${currentProtocol}//${subdomain}.localhost${port}${pagePrefix}/${slug}`;
      return url;
    }
    
    // في بيئة الإنتاج
    const baseDomain = 'ktobi.online'; // يمكن جعل هذا قابل للتكوين
    const url = `${currentProtocol}//${subdomain}.${baseDomain}${pagePrefix}/${slug}`;
    return url;
  }
  
  // إذا لم يكن هناك نطاق مخصص أو فرعي، ارجع الرابط البسيط
  return `${pagePrefix}/${slug}`;
};

/**
 * التحقق من إمكانية معاينة الصفحة
 */
export const canPreviewPage = (
  isPublished: boolean,
  organization: Organization | null
): boolean => {
  // الصفحة يجب أن تكون منشورة
  if (!isPublished) {
    return false;
  }
  
  // يجب أن تكون هناك مؤسسة مع نطاق فرعي أو مخصص
  if (!organization) {
    return false;
  }
  
  const hasDomain = organization.domain && organization.domain.trim();
  const hasSubdomain = organization.subdomain && organization.subdomain.trim();
  
  return Boolean(hasDomain || hasSubdomain);
};

/**
 * رسالة توضيحية عند عدم إمكانية المعاينة
 */
export const getPreviewUnavailableMessage = (
  isPublished: boolean,
  organization: Organization | null
): string => {
  if (!isPublished) {
    return 'يجب نشر الصفحة أولاً لتتمكن من معاينتها';
  }
  
  if (!organization) {
    return 'لا يمكن تحديد معلومات المؤسسة';
  }
  
  const hasDomain = organization.domain && organization.domain.trim();
  const hasSubdomain = organization.subdomain && organization.subdomain.trim();
  
  if (!hasDomain && !hasSubdomain) {
    return 'يجب تكوين نطاق فرعي أو نطاق مخصص للمؤسسة لتتمكن من معاينة الصفحات';
  }
  
  return 'غير متاح للمعاينة';
};
