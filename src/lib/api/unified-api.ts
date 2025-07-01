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
    console.log('🔍 getSubcategories called with:', { categoryId, organizationId });
    
    console.log('📞 About to call UnifiedRequestManager.getProductSubcategories()...');
    let allSubcategories = await UnifiedRequestManager.getProductSubcategories();
    console.log('📦 Raw subcategories from DB:', allSubcategories?.length || 0, allSubcategories);
    
    // إذا لم توجد فئات فرعية، إرجاع مصفوفة فارغة
    if (!allSubcategories || !Array.isArray(allSubcategories)) {
      console.log('❌ No subcategories or not array');
      return [];
    }

    // فلترة حسب organization_id إذا كان محدداً
    if (organizationId) {
      const beforeFilter = allSubcategories.length;
      allSubcategories = allSubcategories.filter((sub: any) => 
        sub.organization_id === organizationId
      );
      console.log(`🔧 Filtered by organization_id: ${beforeFilter} → ${allSubcategories.length}`);
    }

    // فلترة حسب categoryId إذا كان محدداً
    if (categoryId) {
      const beforeFilter = allSubcategories.length;
      allSubcategories = allSubcategories.filter((sub: any) => sub.category_id === categoryId);
      console.log(`🔧 Filtered by categoryId: ${beforeFilter} → ${allSubcategories.length}`);
    }

    console.log('✅ Final subcategories result:', allSubcategories.length);
    return allSubcategories || [];
  } catch (error) {
    console.error('❌ Error fetching subcategories:', error);
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
    return null;
  }
  
  const settings = await UnifiedRequestManager.getOrganizationSettings(organizationId);
  
  // إذا لم توجد إعدادات، إرجاع الإعدادات الافتراضية
  if (!settings) {
    return {
      organization_id: organizationId,
      theme_primary_color: '#3B82F6',
      theme_secondary_color: '#10B981',
      theme_mode: 'light' as const,
      site_name: 'stockiha',
      custom_css: null,
      logo_url: null,
      favicon_url: null,
      default_language: 'ar',
      custom_js: null,
      custom_header: null,
      custom_footer: null,
      enable_registration: true,
      enable_public_site: true
    };
  }
  
  return settings;
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
