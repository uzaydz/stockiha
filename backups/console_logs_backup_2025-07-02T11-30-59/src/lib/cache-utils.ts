import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';

/**
 * تنظيف cache الفئات الفرعية عند تحديثها
 */
export const clearSubcategoriesCache = (organizationId?: string) => {
  try {
    // تنظيف جميع أنواع cache للفئات الفرعية
    UnifiedRequestManager.clearCache('subcategories');
    UnifiedRequestManager.clearCache('unified_subcategories');
    
    if (organizationId) {
      // تنظيف cache المحدد للمؤسسة
      UnifiedRequestManager.clearCache(`subcategories_${organizationId}`);
      UnifiedRequestManager.clearCache(`unified_subcategories_${organizationId}`);
    }
    
    console.log('🧹 Subcategories cache cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing subcategories cache:', error);
  }
};

/**
 * تنظيف cache الفئات عند تحديثها
 */
export const clearCategoriesCache = (organizationId?: string) => {
  try {
    if (organizationId) {
      // تنظيف cache المحدد للمؤسسة
      UnifiedRequestManager.clearCache(`categories_${organizationId}`);
      UnifiedRequestManager.clearCache(`unified_categories_${organizationId}`);
    }
    
    // تنظيف cache العام
    UnifiedRequestManager.clearCache('categories');
    UnifiedRequestManager.clearCache('unified_categories_all');
    
    console.log('Categories cache cleared successfully');
  } catch (error) {
    console.error('Error clearing categories cache:', error);
  }
};

/**
 * تنظيف جميع cache الفئات والفئات الفرعية
 */
export const clearAllCategoriesCache = (organizationId?: string) => {
  clearCategoriesCache(organizationId);
  clearSubcategoriesCache(organizationId);
}; 