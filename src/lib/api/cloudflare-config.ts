/**
 * وظائف الوصول إلى متغيرات البيئة لـ Cloudflare API
 */

// الحصول على رمز وصول Cloudflare API
export const getCloudflareToken = (): string => {
  // في التطوير، نستخدم المتغيرات المحلية
  // في الإنتاج، نستخدم API Route الآمن
  const token = import.meta.env?.VITE_CLOUDFLARE_API_TOKEN || '';

  // Debug logging
  console.log('🔑 getCloudflareToken:', {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    env: typeof import.meta.env,
    viteToken: import.meta.env?.VITE_CLOUDFLARE_API_TOKEN
  });

  return token;
};

// الحصول على معرف مشروع Cloudflare Pages
export const getCloudflareProjectName = (): string => {
  // في الإنتاج، سيتم الحصول على هذا من متغيرات البيئة
  return import.meta.env?.VITE_CLOUDFLARE_PROJECT_NAME || 'stockiha';
};

// الحصول على معرف Zone ID
export const getCloudflareZoneId = (): string => {
  // في التطوير، نستخدم المتغيرات المحلية
  // في الإنتاج، نستخدم API Route الآمن
  const zoneId = import.meta.env?.VITE_CLOUDFLARE_ZONE_ID || '';

  // Debug logging
  console.log('🏠 getCloudflareZoneId:', {
    hasZoneId: !!zoneId,
    zoneIdLength: zoneId?.length || 0,
    viteZoneId: import.meta.env?.VITE_CLOUDFLARE_ZONE_ID
  });

  return zoneId;
};

// التحقق من توفر متغيرات Cloudflare API (مباشرة دون API Route)
export const hasCloudflareConfig = async (): Promise<boolean> => {
  try {
    // التحقق المباشر من المتغيرات دون الاعتماد على API endpoint
    const token = getCloudflareToken();
    const zoneId = getCloudflareZoneId();
    const projectName = getCloudflareProjectName();

    const hasConfig = !!(token && zoneId && projectName);

    console.log('🔍 فحص إعدادات Cloudflare:', {
      hasToken: !!token,
      hasZoneId: !!zoneId,
      hasProjectName: !!projectName,
      hasConfig
    });

    return hasConfig;
  } catch (error) {
    console.error('❌ خطأ في التحقق من إعدادات Cloudflare:', error);
    return false;
  }
};

// النسخة المتزامنة للتحقق السريع (تعتمد على جميع المتغيرات)
export const hasCloudflareConfigSync = (): boolean => {
  const token = getCloudflareToken();
  const zoneId = getCloudflareZoneId();
  const projectName = getCloudflareProjectName();

  // نعتبر الإعدادات متوفرة إذا كانت جميع المتغيرات موجودة
  return !!(token && zoneId && projectName);
};

// الحصول على عنوان Cloudflare API
export const getCloudflareApiUrl = (): string => {
  return 'https://api.cloudflare.com/client/v4';
};

// الحصول على عنوان Cloudflare Pages API
export const getCloudflarePagesApiUrl = (): string => {
  return `${getCloudflareApiUrl()}/accounts/${getCloudflareZoneId()}/pages/projects`;
};

// الحصول على منصة النشر الحالية
export const getDeploymentPlatform = (): 'cloudflare' | 'vercel' => {
    const platform = import.meta.env?.VITE_DEPLOYMENT_PLATFORM || 'cloudflare';
    return platform as 'cloudflare' | 'vercel';
};

// تحديد ما إذا كان التطبيق يعمل على Cloudflare
export const isCloudflareDeployment = (): boolean => {
    return getDeploymentPlatform() === 'cloudflare';
};

// الحصول على URL الأساسي للـ API
export const getApiBaseUrl = (): string => {
    if (typeof window === 'undefined') {
        // Server-side
        return '/api';
    }
    
    // Client-side
    const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';
    return apiUrl;
};
