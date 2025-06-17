/**
 * API مركزي موحد - يحل جميع مشاكل الطلبات المكررة نهائياً
 * يعيد توجيه جميع استدعاءات API إلى UnifiedRequestManager
 */

import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';
import { supabase } from '@/lib/supabase';

// إعادة تصدير الأنواع المطلوبة
export type { Category, Subcategory } from '@/lib/api/categories';
export type { OrganizationSettings } from '@/lib/api/settings';

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
    
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();
      
    if (!userData?.organization_id) {
      return [];
    }
    
    organizationId = userData.organization_id;
  }
  
  console.log('🔄 استخدام API موحد للحصول على الفئات:', organizationId);
  const categories = await UnifiedRequestManager.getProductCategories(organizationId);
  
  // تحويل البيانات لتناسب النوع المطلوب
  return (categories || []).map((item: any) => ({
    ...item,
    type: item.type === 'service' ? 'service' : 'product',
    product_count: item.product_count || 0
  }));
};

/**
 * جلب الفئات الفرعية - موحد بدون تكرار
 */
export const getSubcategories = async (categoryId?: string) => {
  console.log('🔄 استخدام API موحد للحصول على الفئات الفرعية');
  const allSubcategories = await UnifiedRequestManager.getProductSubcategories();
  
  if (categoryId) {
    return (allSubcategories || []).filter((sub: any) => sub.category_id === categoryId);
  }
  
  return allSubcategories || [];
};

/**
 * جلب فئة واحدة بالمعرف - موحد
 */
export const getCategoryById = async (id: string, organizationId?: string) => {
  console.log('🔄 استخدام API موحد للحصول على فئة واحدة:', id);
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
  
  console.log('🔄 استخدام API موحد للحصول على إعدادات المنظمة:', organizationId);
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
  
  console.log('🔄 استخدام API موحد للحصول على اشتراكات المنظمة:', organizationId);
  return await UnifiedRequestManager.getOrganizationSubscriptions(organizationId) || [];
};

/**
 * جلب تطبيقات المنظمة - موحد بدون تكرار
 */
export const getOrganizationApps = async (organizationId: string) => {
  if (!organizationId) {
    return [];
  }
  
  console.log('🔄 استخدام API موحد للحصول على تطبيقات المنظمة:', organizationId);
  return await UnifiedRequestManager.getOrganizationApps(organizationId) || [];
};

// ===== تصدير جميع الوظائف =====

export {
  // إعادة تصدير من UnifiedRequestManager
  UnifiedRequestManager
};

// تسجيل تفعيل النظام الموحد
console.log('✅ تم تفعيل النظام الموحد للـ API - لا مزيد من الطلبات المكررة!'); 