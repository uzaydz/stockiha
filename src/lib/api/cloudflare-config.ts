/**
 * وظائف الوصول إلى متغيرات البيئة لـ Cloudflare API
 */

// الحصول على رمز وصول Cloudflare API
export const getCloudflareToken = (): string => {
  // في الإنتاج، سيتم الحصول على هذا من متغيرات البيئة
  return (typeof process !== 'undefined' && process.env?.CLOUDFLARE_API_TOKEN) || 
         (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_API_TOKEN) || 
         '';
};

// الحصول على معرف مشروع Cloudflare Pages
export const getCloudflareProjectName = (): string => {
  // في الإنتاج، سيتم الحصول على هذا من متغيرات البيئة
  return (typeof process !== 'undefined' && process.env?.CLOUDFLARE_PROJECT_NAME) || 
         (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_PROJECT_NAME) || 
         'stockiha';
};

// الحصول على معرف Zone ID
export const getCloudflareZoneId = (): string => {
  // في الإنتاج، سيتم الحصول على هذا من متغيرات البيئة
  return (typeof process !== 'undefined' && process.env?.CLOUDFLARE_ZONE_ID) || 
         (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_ZONE_ID) || 
         '';
};

// التحقق من توفر متغيرات Cloudflare API
export const hasCloudflareConfig = (): boolean => {
  const token = getCloudflareToken();
  const projectName = getCloudflareProjectName();
  const zoneId = getCloudflareZoneId();

  // التحقق من وجود القيم
  return !!token && !!projectName && !!zoneId;
};

// الحصول على عنوان Cloudflare API
export const getCloudflareApiUrl = (): string => {
  return 'https://api.cloudflare.com/client/v4';
};

// الحصول على عنوان Cloudflare Pages API
export const getCloudflarePagesApiUrl = (): string => {
  return `${getCloudflareApiUrl()}/accounts/${getCloudflareZoneId()}/pages/projects`;
};
