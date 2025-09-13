import { useTenant } from '@/context/TenantContext';

/**
 * بناء رابط المتجر بناءً على إعدادات النطاق المخصص أو النطاق الفرعي
 * @param organization معلومات المنظمة
 * @returns رابط المتجر الصحيح
 */
export const buildStoreUrl = (organization?: { 
  domain?: string; 
  subdomain?: string; 
}) => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname.includes('127.0.0.1');
  
  // إذا كان هناك نطاق مخصص معرف في المنظمة
  if (organization?.domain) {
    return `https://${organization.domain}`;
  } 
  // إذا كان هناك نطاق فرعي معرف في المنظمة
  else if (organization?.subdomain) {
    // إذا كنا في بيئة تطوير محلية
    if (isLocalhost) {
      // استخدم النطاق الفرعي مع stockiha.com في بيئة التطوير
      return `https://${organization.subdomain}.stockiha.com`;
    } 
    // إذا كنا في بيئة إنتاج
    else {
      // تحقق ما إذا كان اسم المضيف يحتوي بالفعل على النطاق الفرعي
      if (hostname.startsWith(`${organization.subdomain}.`)) {
        // استخدم النطاق الحالي كما هو
        return window.location.origin;
      } else {
        // للنطاقات الخاصة، استخدم النطاق المناسب
        if (hostname.includes('stockiha.pages.dev')) {
          return `https://${organization.subdomain}.stockiha.com`;
        }
        
        // استخراج النطاق الرئيسي (مثل example.com)
        const domainParts = hostname.split('.');
        const mainDomain = domainParts.length >= 2 
          ? domainParts.slice(-2).join('.') 
          : hostname;
        
        return `https://${organization.subdomain}.${mainDomain}`;
      }
    }
  } 
  // إذا لم يكن هناك نطاق فرعي أو مخصص
  else {
    // في بيئة التطوير، استخدم stockiha.com
    if (isLocalhost) {
      return 'https://stockiha.com';
    }
    // في الإنتاج، استخدم النطاق الحالي
    else {
      return window.location.origin;
    }
  }
};

/**
 * Hook لبناء رابط المتجر باستخدام معلومات المنظمة من السياق
 */
export const useStoreUrl = () => {
  const { currentOrganization } = useTenant();
  
  return buildStoreUrl(currentOrganization);
};

/**
 * بناء رابط التتبع الكامل
 * @param trackingCode كود التتبع
 * @param organization معلومات المنظمة (اختياري)
 * @returns رابط التتبع الكامل
 */
export const buildTrackingUrl = (trackingCode: string, organization?: { 
  domain?: string; 
  subdomain?: string; 
}) => {
  const storeUrl = buildStoreUrl(organization);
  return `${storeUrl}/repair-tracking/${trackingCode}`;
};
