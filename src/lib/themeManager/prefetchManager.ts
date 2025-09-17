// نظام إدارة التحميل المسبق للثيم والإعدادات
import { getOrganizationSettings } from '@/lib/api/settings';
import { applyInstantTheme, updateOrganizationTheme } from './themeController';
import { getOrganizationIdSync } from './detectionUtils';
import i18n, { changeLanguageSafely } from '@/i18n';

interface PrefetchData {
  organizationId: string;
  settings: any;
  timestamp: number;
}

// تخزين البيانات المحملة مسبقاً
const prefetchCache = new Map<string, PrefetchData>();
const prefetchPromises = new Map<string, Promise<PrefetchData>>();

/**
 * تحميل إعدادات المؤسسة مسبقاً
 */
export async function prefetchOrganizationSettings(organizationId: string): Promise<PrefetchData | null> {
  // التحقق من وجود البيانات في الذاكرة المؤقتة
  const cached = prefetchCache.get(organizationId);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 دقائق
    return cached;
  }

  // التحقق من وجود promise جاري
  const existingPromise = prefetchPromises.get(organizationId);
  if (existingPromise) {
    return existingPromise;
  }

  // إنشاء promise جديد
  const prefetchPromise = (async (): Promise<PrefetchData> => {
    try {
      const settings = await getOrganizationSettings(organizationId);

      if (!settings) {
        throw new Error('لم يتم العثور على إعدادات المؤسسة');
      }

      const data: PrefetchData = {
        organizationId,
        settings,
        timestamp: Date.now()
      };

      // حفظ في الذاكرة المؤقتة
      prefetchCache.set(organizationId, data);

      return data;
    } catch (error) {
      console.warn('⚠️ [PrefetchManager] خطأ في تحميل إعدادات المؤسسة:', error);
      throw error;
    } finally {
      prefetchPromises.delete(organizationId);
    }
  })();

  prefetchPromises.set(organizationId, prefetchPromise);
  return prefetchPromise;
}

/**
 * تطبيق الإعدادات المحملة مسبقاً بشكل فوري
 */
export async function applyPrefetchedSettings(prefetchData: PrefetchData): Promise<void> {
  const { settings } = prefetchData;
  const startTime = performance.now();

  // التحقق من النطاق العام - لا نطبق الإعدادات في النطاقات العامة
  const currentHostname = window.location.hostname;
  if (isPublicDomain(currentHostname)) {
    console.log('🎨 [PrefetchManager] نطاق عام - تخطي تطبيق الإعدادات المحملة مسبقاً', { hostname: currentHostname });
    return;
  }

  try {
    // تطبيق اللغة فوراً إذا كانت مختلفة
    if (settings.default_language && settings.default_language !== i18n.language) {
      console.log('🎨 [PrefetchManager] تطبيق اللغة المحملة مسبقاً:', settings.default_language);

      // تطبيق اللغة بدون انتظار changeLanguage الكامل
      i18n.language = settings.default_language;

      // تحديث اتجاه الصفحة فوراً
      const direction = settings.default_language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', direction);
      document.body.setAttribute('dir', direction);

      // جدولة تحديث اللغة الكامل في الخلفية
      setTimeout(() => {
        changeLanguageSafely(settings.default_language).catch(console.warn);
      }, 0);
    }

    // تطبيق الألوان والثيم فوراً
    if (settings.theme_primary_color || settings.theme_secondary_color) {
      console.log('🎨 [PrefetchManager] تطبيق الثيم المحمل مسبقاً');

      updateOrganizationTheme(prefetchData.organizationId, {
        theme_primary_color: settings.theme_primary_color,
        theme_secondary_color: settings.theme_secondary_color,
        theme_mode: settings.theme_mode,
        custom_css: settings.custom_css
      });
    }

    const endTime = performance.now();
    console.log(`✅ [PrefetchManager] تم تطبيق الإعدادات المحملة مسبقاً في ${Math.round(endTime - startTime)}ms`);

  } catch (error) {
    console.warn('⚠️ [PrefetchManager] خطأ في تطبيق الإعدادات المحملة مسبقاً:', error);
  }
}

/**
 * تحميل مسبق ذكي للإعدادات بناءً على النطاق الحالي
 */
export async function smartPrefetch(): Promise<PrefetchData | null> {
  try {
    // التحقق من النطاق العام - لا نحمل مسبقاً في النطاقات العامة
    const currentHostname = window.location.hostname;
    if (isPublicDomain(currentHostname)) {
      console.log('🎨 [PrefetchManager] نطاق عام - تخطي التحميل المسبق الذكي', { hostname: currentHostname });
      return null;
    }

    // الحصول على معرف المؤسسة من النطاق أو التخزين المحلي
    let orgId = getOrganizationIdSync();

    // إذا لم يكن هناك معرف مؤسسة، حاول جلبها من النطاق
    if (!orgId) {
      const hostname = window.location.hostname;
      const { getOrganizationIdFromDomainAsync } = await import('./detectionUtils');
      orgId = await getOrganizationIdFromDomainAsync(hostname);

      if (!orgId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🎨 [PrefetchManager] لا يوجد معرف مؤسسة - تخطي التحميل المسبق');
        }
        return null;
      }
    }

    console.log('🎨 [PrefetchManager] بدء التحميل المسبق للمؤسسة:', orgId);

    const prefetchData = await prefetchOrganizationSettings(orgId);

    if (prefetchData) {
      // حفظ البيانات في window object للوصول السريع من قبل المكونات الأخرى
      (window as any).__PREFETCHED_STORE_DATA__ = {
        ...prefetchData.settings,
        organization: { id: prefetchData.organizationId },
        organization_details: { id: prefetchData.organizationId },
        timestamp: Date.now(),
        source: 'prefetch_manager'
      };

      // 🔥 إضافة: حفظ البيانات في sessionStorage للاستمرارية عند التنقل بين الصفحات
      try {
        const hostname = window.location.hostname;
        const storeKey = `store_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
        sessionStorage.setItem(storeKey, JSON.stringify({
          data: {
            ...prefetchData.settings,
            organization: { id: prefetchData.organizationId },
            organization_details: { id: prefetchData.organizationId },
            organizationId: prefetchData.organizationId
          },
          timestamp: Date.now(),
          source: 'prefetch_manager'
        }));
      } catch (sessionError) {
        console.warn('⚠️ [PrefetchManager] فشل في حفظ البيانات في sessionStorage:', sessionError);
      }

      console.log('💾 [PrefetchManager] حفظ البيانات في window object و sessionStorage:', {
        hasData: true,
        organizationId: prefetchData.organizationId,
        hasSettings: !!prefetchData.settings
      });

      // تطبيق الإعدادات فوراً
      await applyPrefetchedSettings(prefetchData);

      // حفظ البيانات للاستخدام المستقبلي
      localStorage.setItem('bazaar_prefetch_data', JSON.stringify({
        ...prefetchData,
        appliedAt: Date.now()
      }));
    }

    return prefetchData;
  } catch (error) {
    console.warn('⚠️ [PrefetchManager] خطأ في التحميل المسبق الذكي:', error);
    return null;
  }
}

/**
 * استرجاع البيانات المحفوظة من التحميل المسبق السابق
 */
export function getCachedPrefetchData(): PrefetchData | null {
  try {
    const stored = localStorage.getItem('bazaar_prefetch_data');
    if (!stored) return null;

    const data = JSON.parse(stored);

    // التحقق من أن البيانات حديثة (أقل من ساعة)
    if (Date.now() - data.appliedAt > 60 * 60 * 1000) {
      localStorage.removeItem('bazaar_prefetch_data');
      return null;
    }

    return data;
  } catch (error) {
    console.warn('⚠️ [PrefetchManager] خطأ في استرجاع البيانات المحفوظة:', error);
    return null;
  }
}

/**
 * تطبيق البيانات المحفوظة من التحميل المسبق السابق
 */
export async function applyCachedPrefetchData(): Promise<void> {
  const cachedData = getCachedPrefetchData();

  if (cachedData) {
    console.log('🎨 [PrefetchManager] تطبيق البيانات المحفوظة من التحميل المسبق السابق');
    await applyPrefetchedSettings(cachedData);
  }
}

/**
 * تنظيف البيانات المحملة مسبقاً
 */
export function clearPrefetchCache(): void {
  prefetchCache.clear();
  prefetchPromises.clear();
  localStorage.removeItem('bazaar_prefetch_data');
}

// متغير لتتبع ما إذا تم عرض التحذير بالفعل
let hasShownNoOrgWarning = false;

/**
 * عرض تحذير عدم وجود معرف مؤسسة مرة واحدة فقط
 */
function logNoOrganizationWarning() {
  if (!hasShownNoOrgWarning) {
    console.log('🎨 [PrefetchManager] لا يوجد معرف مؤسسة للتحميل المسبق');
    hasShownNoOrgWarning = true;
  }
}

// قائمة النطاقات العامة التي لا يجب تطبيق الإعدادات عليها
const PUBLIC_DOMAINS = [
  'ktobi.online',
  'www.ktobi.online',
  'stockiha.com',
  'www.stockiha.com',
  'stockiha.pages.dev'
];

// دالة للتحقق من localhost
const isLocalhostDomain = (hostname: string) => {
  return hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         hostname.startsWith('localhost:') ||
         hostname.startsWith('127.0.0.1:');
};

// دالة للتحقق من النطاق العام
const isPublicDomain = (hostname: string) => {
  return PUBLIC_DOMAINS.includes(hostname) || isLocalhostDomain(hostname);
};

// بدء التحميل المسبق عند تحميل الصفحة
if (typeof window !== 'undefined') {
  const currentHostname = window.location.hostname;

  // تطبيق البيانات المحفوظة فقط إذا لم نكن في نطاق عام
  if (!isPublicDomain(currentHostname)) {
    applyCachedPrefetchData().then(() => {
      // ثم بدء التحميل المسبق الجديد
      smartPrefetch();
    });
  } else {
    console.log('🎨 [PrefetchManager] نطاق عام - تخطي تطبيق الإعدادات المحملة مسبقاً', { hostname: currentHostname });
  }

  // ربط مع window للاستخدام في التطوير
  (window as any).prefetchManager = {
    prefetchOrganizationSettings,
    applyPrefetchedSettings,
    smartPrefetch,
    getCachedPrefetchData,
    applyCachedPrefetchData,
    clearPrefetchCache
  };
}
