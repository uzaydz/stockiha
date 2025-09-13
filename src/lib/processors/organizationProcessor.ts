/**
 * معالج بيانات المؤسسات
 * منفصل لتحسين الأداء ومعالجة وتحويل بيانات المؤسسات
 */

import type { Organization } from '@/types/tenant';
import { 
  detectLanguageFromData,
  findLanguageInObject,
  dispatchLanguageUpdateEvent,
  updateOrganizationLanguageSettings,
  updateLanguageFromSettings
} from '@/lib/language/languageManager';
import {
  saveOrganizationData,
  saveOrganizationSettings,
  saveStoreInfoToSession,
  dispatchOrganizationUpdateEvent
} from '@/lib/storage/localStorageManager';
import { getOrganizationDefaultLanguage } from '@/lib/api/deduplicatedApi';

/**
 * تحديث بيانات المنظمة وإرسال إشارة تحديث اللغة
 */
export function updateOrganizationFromData(orgData: any): Organization | null {
  if (!orgData) return null;

  try {
    const organizationSettings = orgData.organization_settings || 
                                 orgData.settings || 
                                 {};

    // البحث الشامل عن اللغة الافتراضية في جميع الأماكن الممكنة
    let defaultLanguage = orgData.default_language || 
                         organizationSettings.default_language || 
                         orgData.language ||
                         organizationSettings.language ||
                         (organizationSettings.general && organizationSettings.general.default_language) ||
                         (organizationSettings.general && organizationSettings.general.language) ||
                         (orgData.store_settings && orgData.store_settings.default_language) ||
                         (orgData.store_settings && orgData.store_settings.language) ||
                         null;

    // إذا لم نجد اللغة، تجنب جلب إضافي في الصفحات العامة للمتجر
    if (!defaultLanguage) {
      let isPublicContext = true;
      try {
        const path = typeof window !== 'undefined' ? window.location.pathname || '' : '';
        // اعتبر لوحات التحكم والإداري ونقطة البيع سياقات خاصة نسمح فيها بجلب دقيق
        isPublicContext = !(
          path.startsWith('/dashboard') ||
          path.startsWith('/admin') ||
          path.startsWith('/pos') ||
          path.startsWith('/super')
        );
        // دعم إشارة الصفحات العامة للمنتجات (إن وُجدت)
        try {
          if ((window as any).__PUBLIC_PRODUCT_PAGE__ === true) {
            isPublicContext = true;
          }
        } catch {}
      } catch {}

      if (isPublicContext) {
        // في الصفحات العامة: لا نغيّر لغة المستخدم إذا كانت مُخزنة مسبقاً وصالحة
        let persistedLang: string | null = null;
        try {
          const stored = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
          if (stored && ['ar', 'en', 'fr'].includes(stored)) {
            persistedLang = stored;
          }
        } catch {}

        // استخدم التحليل المحلي فقط إذا لم تكن هناك لغة محفوظة مسبقاً
        const detected = detectLanguageFromData(orgData, organizationSettings);
        const fallbackLanguage = detected && ['ar', 'en', 'fr'].includes(detected) ? detected : null;

        if (!persistedLang && fallbackLanguage) {
          // لا يوجد لغة محفوظة — طبّق اللغة المكتشفة
          updateLanguageFromSettings(fallbackLanguage);
          defaultLanguage = fallbackLanguage;
        } else {
          // حافظ على اللغة الحالية (المحفوظة) ولا تُطلق حدث تغيير لغة
          defaultLanguage = persistedLang || defaultLanguage;
        }
      } else {
        // في السياقات الخاصة (لوحة التحكم وغيرها) اسمح بالجلب الدقيق مرة واحدة مع إلغاء تكرار
        setTimeout(async () => {
          try {
            const languageFromDB = await getOrganizationDefaultLanguage(orgData.id);
            if (languageFromDB && languageFromDB !== 'ar') {
              updateLanguageFromSettings(languageFromDB);
            } else {
              const fallbackLanguage = detectLanguageFromData(orgData, organizationSettings);
              updateLanguageFromSettings(fallbackLanguage);
            }
          } catch {
            const fallbackLanguage = detectLanguageFromData(orgData, organizationSettings);
            updateLanguageFromSettings(fallbackLanguage);
          }
        }, 100);
        defaultLanguage = 'ar';
      }
    }

    // فحص خاص للبحث عن اللغة في أي مكان (للتطوير)
    if (process.env.NODE_ENV === 'development') {
      const languageFields = findLanguageInObject(orgData);
      if (languageFields.length > 0) {
      }
    }

    // إنشاء كائن المؤسسة
    const orgObject: Organization = {
      id: orgData.id,
      name: orgData.name || orgData.business_name || 'متجر',
      description: orgData.description,
      logo_url: orgData.logo_url,
      domain: orgData.domain,
      subdomain: orgData.subdomain,
      subscription_tier: orgData.subscription_tier || 'free',
      subscription_status: orgData.subscription_status || 'trial',
      settings: updateOrganizationLanguageSettings(organizationSettings, defaultLanguage),
      created_at: orgData.created_at,
      updated_at: orgData.updated_at,
      owner_id: orgData.owner_id
    };

    // إرسال إشارة تحديث اللغة فقط إذا وُجدت في البيانات الأصلية (ليس من fallback)
    const hasLanguageInOriginalData = orgData.default_language || 
                                     organizationSettings.default_language || 
                                     orgData.language ||
                                     organizationSettings.language;
    
    // منع إرسال أحداث تحديث اللغة المتكررة
    if (hasLanguageInOriginalData && defaultLanguage) {
      const eventKey = `lang_update_${orgData.id}_${defaultLanguage}`;
      const lastEvent = (window as any).__lastLanguageEvent || {};
      const now = Date.now();
      
      if (!lastEvent[eventKey] || now - lastEvent[eventKey] > 10000) { // 10 ثوان
        dispatchLanguageUpdateEvent(defaultLanguage, orgData.id);
        if (!lastEvent[eventKey]) lastEvent[eventKey] = {};
        lastEvent[eventKey] = now;
        (window as any).__lastLanguageEvent = lastEvent;
        
        // منع إرسال نفس الحدث من updateLanguageFromSettings
        const globalEventKey = `lang_event_${defaultLanguage}`;
        const globalEventTime = (window as any).__lastLanguageEventTime || {};
        globalEventTime[globalEventKey] = now;
        (window as any).__lastLanguageEventTime = globalEventTime;
      }
    }

    if (process.env.NODE_ENV === 'development') {
    }

    return orgObject;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    return null;
  }
}

// متغير لمنع حفظ البيانات المتكرر
let lastSaveTimestamp = 0;
const SAVE_DEBOUNCE = 2000; // ثانيتان

/**
 * حفظ بيانات المؤسسة في جميع أماكن التخزين
 */
export function saveCompleteOrganizationData(
  organization: Organization,
  currentSubdomain?: string
): void {
  const now = Date.now();
  
  // منع الحفظ المتكرر
  if (now - lastSaveTimestamp < SAVE_DEBOUNCE) {
    return;
  }
  
  lastSaveTimestamp = now;
  
  try {
    // 1. حفظ البيانات الأساسية
    saveOrganizationData(organization);
    
    // 2. حفظ الإعدادات
    saveOrganizationSettings(organization.id, organization);
    
    // 3. حفظ معلومات المتجر في session storage
    const subdomain = organization.subdomain || currentSubdomain;
    if (subdomain) {
      saveStoreInfoToSession(subdomain, organization);
    }
    
    // 4. إرسال حدث التحديث
    const orgDataForEvent = {
      id: organization.id,
      name: organization.name,
      description: organization.description || `${organization.name} - متجر إلكتروني متميز`,
      logo_url: organization.logo_url,
      subdomain: organization.subdomain || currentSubdomain
    };
    
    const orgSettings = {
      site_name: organization.name,
      seo_store_title: organization.name,
      seo_meta_description: organization.description || `${organization.name} - أفضل المنتجات بأفضل الأسعار`,
      meta_keywords: `${organization.name}, متجر إلكتروني, تسوق أونلاين`,
      logo_url: organization.logo_url,
      favicon_url: organization.logo_url
    };
    
    dispatchOrganizationUpdateEvent(orgDataForEvent, orgSettings, subdomain);
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
}

/**
 * التحقق من صحة المؤسسة وإضافة البيانات الناقصة
 */
export function validateAndEnrichOrganization(
  orgData: any,
  currentSubdomain?: string
): Organization | null {
  if (!orgData || !orgData.id) {
    return null;
  }
  
  // معالجة البيانات الأساسية
  const processedOrg = updateOrganizationFromData(orgData);
  if (!processedOrg) {
    return null;
  }
  
  // إضافة النطاق الفرعي إذا كان مفقوداً
  if (!processedOrg.subdomain && currentSubdomain && currentSubdomain !== 'main') {
    processedOrg.subdomain = currentSubdomain;
  }
  
  // إضافة وصف افتراضي إذا كان مفقوداً
  if (!processedOrg.description) {
    processedOrg.description = `${processedOrg.name} - متجر إلكتروني متميز`;
  }
  
  return processedOrg;
}

/**
 * دمج بيانات المؤسسة من مصادر متعددة
 */
export function mergeOrganizationData(
  primaryData: any,
  secondaryData?: any,
  localData?: any
): any {
  const merged = { ...primaryData };
  
  // دمج البيانات الثانوية (إذا وجدت)
  if (secondaryData) {
    Object.keys(secondaryData).forEach(key => {
      if (!merged[key] && secondaryData[key]) {
        merged[key] = secondaryData[key];
      }
    });
  }
  
  // دمج البيانات المحلية (إذا وجدت)
  if (localData) {
    Object.keys(localData).forEach(key => {
      if (!merged[key] && localData[key]) {
        merged[key] = localData[key];
      }
    });
  }
  
  return merged;
}

/**
 * تحديث حقول محددة في المؤسسة
 */
export function updateOrganizationFields(
  organization: Organization,
  updates: Partial<Organization>
): Organization {
  const updated = { ...organization, ...updates };
  
  // تحديث timestamp
  updated.updated_at = new Date().toISOString();
  
  return updated;
}

/**
 * استخراج معلومات أساسية للعرض السريع
 */
export function extractOrganizationSummary(organization: Organization): {
  id: string;
  name: string;
  subdomain?: string;
  logo_url?: string;
  status: string;
} {
  return {
    id: organization.id,
    name: organization.name,
    subdomain: organization.subdomain,
    logo_url: organization.logo_url,
    status: organization.subscription_status
  };
}

/**
 * التحقق من أذونات المؤسسة
 */
export function checkOrganizationPermissions(
  organization: Organization,
  userId?: string
): {
  isOwner: boolean;
  canEdit: boolean;
  canInvite: boolean;
} {
  const isOwner = userId === organization.owner_id;
  
  return {
    isOwner,
    canEdit: isOwner, // يمكن توسيعه ليشمل المسؤولين
    canInvite: isOwner // يمكن توسيعه ليشمل المسؤولين
  };
}
