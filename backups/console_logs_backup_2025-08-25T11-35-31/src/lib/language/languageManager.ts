/**
 * مدير اللغات للمؤسسات
 * منفصل لتحسين الأداء والتعامل مع إعدادات اللغة
 */

import { getOrganizationSettings } from '@/lib/api/unified-api';
import { getOrganizationById } from '@/lib/api/organization';
import { STORAGE_KEYS } from '@/lib/storage/localStorageManager';

// ثوابت اللغة
const LANGUAGE_CACHE_TTL = 30 * 60 * 1000; // 30 دقيقة
const DEFAULT_LANGUAGE = 'ar';

// كلمات مفتاحية لتحليل اللغة
const LANGUAGE_KEYWORDS = {
  french: ['collection', 'boutique', 'mode', 'style', 'paris', 'france'],
  english: ['shop', 'store', 'market', 'online', 'digital', 'tech']
} as const;

/**
 * الحصول على إعدادات اللغة مع تخزين مؤقت
 */
export async function getLanguageSettings(orgId: string): Promise<string> {
  // التحقق من وجود اللغة في الكاش أولاً
  const cachedLanguage = getCachedLanguage(orgId);
  if (cachedLanguage) {
    return cachedLanguage;
  }
  
  try {
    const [orgData, organizationSettings] = await Promise.all([
      getOrganizationById(orgId),
      getOrganizationSettings(orgId)
    ]);

    const detectedLanguage = detectLanguageFromData(orgData, organizationSettings);
    
    // حفظ في الكاش
    setCachedLanguage(orgId, detectedLanguage);
    
    return detectedLanguage;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ خطأ في الحصول على إعدادات اللغة:', error);
    }
    return DEFAULT_LANGUAGE;
  }
}

/**
 * اكتشاف اللغة من بيانات المؤسسة
 */
export function detectLanguageFromData(
  orgData: any,
  organizationSettings: any
): string {
  // تسجيل مفصل للتشخيص (مع throttling)
  if (process.env.NODE_ENV === 'development') {
    const now = Date.now();
    const lastLog = (window as any).__lastLanguageDetectionLog || 0;
    if (now - lastLog > 2000) { // كل ثانيتين فقط
      console.log('🔍 [Language Detection] orgData:', {
        default_language: orgData?.default_language,
        language: orgData?.language,
        name: orgData?.name
      });
      console.log('🔍 [Language Detection] organizationSettings:', organizationSettings);
      (window as any).__lastLanguageDetectionLog = now;
    }
  }

  // ترتيب أولوية المصادر
  const possibleLanguages = [
    orgData?.default_language,
    organizationSettings?.default_language, // تغيير من [0] إلى مباشر
    organizationSettings?.[0]?.default_language,
    orgData?.language,
    organizationSettings?.language, // إضافة نسخة مباشرة
    organizationSettings?.[0]?.language,
    (organizationSettings as any)?.general?.default_language,
    DEFAULT_LANGUAGE
  ];

  // العثور على أول لغة صالحة
  for (const lang of possibleLanguages) {
    if (lang && typeof lang === 'string' && lang.trim() !== '') {
      if (process.env.NODE_ENV === 'development') {
        const now = Date.now();
        const lastFoundLog = (window as any).__lastLanguageFoundLog || 0;
        if (now - lastFoundLog > 2000) { // كل ثانيتين فقط
          console.log(`✅ [Language Detection] وُجدت اللغة: ${lang}`);
          (window as any).__lastLanguageFoundLog = now;
        }
      }
      return lang;
    }
  }

  // fallback: تحليل ذكي بناءً على اسم المؤسسة والنطاق
  const detectedLang = smartLanguageDetection(orgData);
  if (process.env.NODE_ENV === 'development') {
    const now = Date.now();
    const lastSmartLog = (window as any).__lastSmartLanguageLog || 0;
    if (now - lastSmartLog > 2000) { // كل ثانيتين فقط
      console.log(`🤖 [Language Detection] تحليل ذكي: ${detectedLang}`);
      (window as any).__lastSmartLanguageLog = now;
    }
  }
  return detectedLang;
}

/**
 * تحليل ذكي للغة بناءً على البيانات المتاحة
 */
function smartLanguageDetection(orgData: any): string {
  if (!orgData) return DEFAULT_LANGUAGE;
  
  const orgName = (orgData.name || '').toLowerCase();
  const orgSubdomain = (orgData.subdomain || '').toLowerCase();
  const orgDomain = (orgData.domain || '').toLowerCase();
  
  const textToAnalyze = `${orgName} ${orgSubdomain} ${orgDomain}`;
  
  // تحقق من الكلمات الفرنسية
  const hasFrenchKeywords = LANGUAGE_KEYWORDS.french.some(keyword => 
    textToAnalyze.includes(keyword)
  );
  
  // تحقق من الكلمات الإنجليزية
  const hasEnglishKeywords = LANGUAGE_KEYWORDS.english.some(keyword => 
    textToAnalyze.includes(keyword)
  );
  
  if (hasFrenchKeywords) {
    return 'fr';
  } else if (hasEnglishKeywords) {
    return 'en';
  }
  
  // افتراضي: عربي
  return DEFAULT_LANGUAGE;
}

/**
 * الحصول على اللغة المحفوظة في Cache
 */
function getCachedLanguage(orgId: string): string | null {
  try {
    const cachedLanguage = localStorage.getItem(`${STORAGE_KEYS.ORG_LANGUAGE_PREFIX}${orgId}`);
    const cacheTimestamp = localStorage.getItem(`${STORAGE_KEYS.ORG_LANGUAGE_TIMESTAMP_PREFIX}${orgId}`);
    
    if (cachedLanguage && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      if (cacheAge < LANGUAGE_CACHE_TTL) {
        return cachedLanguage;
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ خطأ في الحصول على اللغة المحفوظة:', error);
    }
  }
  
  return null;
}

/**
 * حفظ اللغة في Cache
 */
function setCachedLanguage(orgId: string, language: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEYS.ORG_LANGUAGE_PREFIX}${orgId}`, language);
    localStorage.setItem(`${STORAGE_KEYS.ORG_LANGUAGE_TIMESTAMP_PREFIX}${orgId}`, Date.now().toString());
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 تم حفظ اللغة ${language} للمؤسسة ${orgId}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ خطأ في حفظ اللغة:', error);
    }
  }
}

/**
 * البحث عن إعدادات اللغة في أي مكان في البيانات
 */
export function findLanguageInObject(obj: any, path = ''): any[] {
  const results: any[] = [];
  
  for (const [key, value] of Object.entries(obj || {})) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (key.toLowerCase().includes('lang') || key.toLowerCase().includes('locale')) {
      results.push({ path: currentPath, key, value });
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      results.push(...findLanguageInObject(value, currentPath));
    }
  }
  
  return results;
}

/**
 * إرسال حدث تحديث اللغة
 */
export function dispatchLanguageUpdateEvent(language: string, organizationId: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const languageUpdateEvent = new CustomEvent('organizationLanguageUpdate', {
      detail: {
        language,
        organizationId
      }
    });
    
    window.dispatchEvent(languageUpdateEvent);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📡 تم إرسال حدث تحديث اللغة: ${language}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ خطأ في إرسال حدث تحديث اللغة:', error);
    }
  }
}

/**
 * تحديث إعدادات اللغة في بيانات المؤسسة
 */
export function updateOrganizationLanguageSettings(
  organizationSettings: any,
  detectedLanguage: string
): any {
  return {
    ...organizationSettings,
    default_language: detectedLanguage
  };
}

/**
 * مسح cache اللغة للمؤسسة
 */
export function clearLanguageCache(orgId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.ORG_LANGUAGE_PREFIX}${orgId}`);
    localStorage.removeItem(`${STORAGE_KEYS.ORG_LANGUAGE_TIMESTAMP_PREFIX}${orgId}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 تم مسح cache اللغة للمؤسسة ${orgId}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ خطأ في مسح cache اللغة:', error);
    }
  }
}

// متغير لمنع إرسال أحداث متكررة
let lastLanguageUpdate = { language: '', timestamp: 0 };
const LANGUAGE_UPDATE_DEBOUNCE = 2000; // ثانيتان لمنع التكرار
let lastLanguageEventSent = { language: '', timestamp: 0 };

/**
 * تحديث اللغة مباشرة من الإعدادات
 */
export function updateLanguageFromSettings(language: string): void {
  if (typeof window === 'undefined') return;
  
  // منع التكرار: التحقق من آخر تحديث
  const now = Date.now();
  if (lastLanguageUpdate.language === language && 
      now - lastLanguageUpdate.timestamp < LANGUAGE_UPDATE_DEBOUNCE) {
    return;
  }
  
  try {
    // منع إرسال نفس الحدث مرات متكررة
    if (lastLanguageEventSent.language === language && 
        now - lastLanguageEventSent.timestamp < LANGUAGE_UPDATE_DEBOUNCE) {
      return;
    }
    
    // منع إرسال نفس الحدث من organizationProcessor
    const eventKey = `lang_event_${language}`;
    const lastEventTime = (window as any).__lastLanguageEventTime || {};
    if (lastEventTime[eventKey] && now - lastEventTime[eventKey] < 3000) {
      return;
    }
    lastEventTime[eventKey] = now;
    (window as any).__lastLanguageEventTime = lastEventTime;
    
    // إرسال إشارة تحديث اللغة للتطبيق
    setTimeout(() => {
      const event = new CustomEvent('organizationLanguageUpdate', { 
        detail: { 
          language,
          organizationId: localStorage.getItem('bazaar_organization_id') || ''
        } 
      });
      window.dispatchEvent(event);
      
      // تحديث آخر إرسال
      lastLanguageUpdate = { language, timestamp: now };
      lastLanguageEventSent = { language, timestamp: now };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 تم إرسال حدث تحديث اللغة من الإعدادات:', language);
      }
    }, 100); // تأخير بسيط للتأكد من تحميل المكونات
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [Language Manager] خطأ في تحديث اللغة من الإعدادات:', error);
    }
  }
}
