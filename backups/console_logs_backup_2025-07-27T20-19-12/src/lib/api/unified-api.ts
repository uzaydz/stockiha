/**
 * API مركزي موحد - يحل جميع مشاكل الطلبات المكررة نهائياً
 * يعيد توجيه جميع استدعاءات API إلى UnifiedRequestManager
 */

import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';
import { supabase } from '@/lib/supabase';

// إعادة تصدير الأنواع المطلوبة
export type { Category, Subcategory } from '@/lib/api/categories';
export type { OrganizationSettings } from '@/types/settings';

// ===== وظائف الفئات الموحدة =====

/**
 * جلب فئات المنتجات - موحد بدون تكرار
 */
export const getCategories = async (organizationId?: string) => {
  
  if (!organizationId) {
    
    // الحصول على معرف المؤسسة من المستخدم الحالي
    const userInfo = await supabase.auth.getUser();
    const userId = userInfo.data.user?.id;

    if (!userId) {
      return [];
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.organization_id) {
      return [];
    }
    
    organizationId = userData.organization_id;
  }

  try {
    const categoriesResult = await UnifiedRequestManager.getProductCategories(organizationId);

    // التأكد من أن النتيجة array قبل استخدام .map()
    if (!categoriesResult || !Array.isArray(categoriesResult)) {
      return [];
    }

    // تحويل البيانات لتناسب النوع المطلوب
    const mappedCategories = categoriesResult.map((item: any) => ({
      ...item,
      type: item.type === 'service' ? 'service' : 'product',
      product_count: item.product_count || 0
    }));

    return mappedCategories;
  } catch (error) {
    return [];
  }
};

/**
 * جلب الفئات الفرعية - موحد بدون تكرار مع فلترة حسب organization_id
 */
export const getSubcategories = async (categoryId?: string, organizationId?: string) => {
  try {
    
    let allSubcategories = await UnifiedRequestManager.getProductSubcategories();
    
    // إذا لم توجد فئات فرعية، إرجاع مصفوفة فارغة
    if (!allSubcategories || !Array.isArray(allSubcategories)) {
      return [];
    }

    // فلترة حسب organization_id إذا كان محدداً
    if (organizationId) {
      const beforeFilter = allSubcategories.length;
      allSubcategories = allSubcategories.filter((sub: any) => 
        sub.organization_id === organizationId
      );
    }

    // فلترة حسب categoryId إذا كان محدداً
    if (categoryId) {
      const beforeFilter = allSubcategories.length;
      allSubcategories = allSubcategories.filter((sub: any) => sub.category_id === categoryId);
    }

    return allSubcategories || [];
  } catch (error) {
    return [];
  }
};

/**
 * جلب فئة واحدة بالمعرف - موحد
 */
export const getCategoryById = async (id: string, organizationId?: string) => {
  const categories = await getCategories(organizationId);
  return categories.find((cat: any) => cat.id === id) || null;
};

// ===== وظائف الإعدادات الموحدة =====

/**
 * جلب إعدادات المنظمة - موحد بدون تكرار
 */
export const getOrganizationSettings = async (organizationId: string) => {
  if (!organizationId) {
    console.warn('⚠️ [getOrganizationSettings] No organizationId provided');
    return null;
  }
  
  console.log('🔍 [getOrganizationSettings] Fetching settings for org:', organizationId);
  const settings = await UnifiedRequestManager.getOrganizationSettings(organizationId);
  
  console.log('📊 [getOrganizationSettings] Raw settings from UnifiedRequestManager:', {
    hasSettings: !!settings,
    settingsType: Array.isArray(settings) ? 'array' : typeof settings,
    settingsLength: Array.isArray(settings) ? settings.length : 'N/A',
    primaryColor: Array.isArray(settings) ? settings[0]?.theme_primary_color : settings?.theme_primary_color,
    secondaryColor: Array.isArray(settings) ? settings[0]?.theme_secondary_color : settings?.theme_secondary_color,
    themeMode: Array.isArray(settings) ? settings[0]?.theme_mode : settings?.theme_mode,
    orgId: Array.isArray(settings) ? settings[0]?.organization_id : settings?.organization_id,
    fullSettings: settings
  });
  
  // إذا لم توجد إعدادات، عدم إرجاع ألوان افتراضية - دع themeManager يتعامل مع ذلك
  if (!settings) {
    console.warn('⚠️ [getOrganizationSettings] No settings found for org:', organizationId);
    return null; // إرجاع null بدلاً من القيم الافتراضية
  }
  
  // إصلاح إضافي: إذا كانت البيانات مصفوفة، استخرج العنصر الأول
  let finalSettings = settings;
  if (Array.isArray(settings) && settings.length > 0) {
    console.log('🔧 [getOrganizationSettings] تحويل مصفوفة إلى كائن واحد');
    finalSettings = settings[0];
  }
  
  console.log('✅ [getOrganizationSettings] Returning final settings:', {
    primaryColor: finalSettings.theme_primary_color,
    secondaryColor: finalSettings.theme_secondary_color,
    themeMode: finalSettings.theme_mode,
    orgId: finalSettings.organization_id,
    finalSettings
  });
  
  return finalSettings;
};

/**
 * جلب اشتراكات المنظمة - موحد بدون تكرار
 */
export const getOrganizationSubscriptions = async (organizationId: string) => {
  if (!organizationId) {
    return [];
  }
  
  return await UnifiedRequestManager.getOrganizationSubscriptions(organizationId) || [];
};

/**
 * جلب تطبيقات المنظمة - موحد بدون تكرار
 */
export const getOrganizationApps = async (organizationId: string) => {
  if (!organizationId) {
    return [];
  }
  
  return await UnifiedRequestManager.getOrganizationApps(organizationId) || [];
};

// ===== تصدير جميع الوظائف =====

export {
  // إعادة تصدير من UnifiedRequestManager
  UnifiedRequestManager
};

// تسجيل تفعيل النظام الموحد
