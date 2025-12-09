/**
 * ⚡ useCategoriesCache - v2.0 (PowerSync Reactive)
 * ============================================================
 *
 * 🚀 Hook محسّن للتصنيفات يستخدم:
 *   - useQuery من @powersync/react (reactive)
 *   - تحديث تلقائي عند أي تغيير
 *   - لا يحتاج cache يدوي - PowerSync يتعامل مع هذا
 *
 * ============================================================
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// =====================================================
// 📦 Types
// =====================================================

interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  organization_id: string;
  created_at: string;
  updated_at?: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  description?: string;
  organization_id: string;
  created_at: string;
  updated_at?: string;
}

interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

interface UseCategoriesCacheResult {
  categories: CategoryWithSubcategories[];
  isLoading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  getCategoryById: (id: string) => CategoryWithSubcategories | null;
  getSubcategoriesByCategoryId: (categoryId: string) => Subcategory[];
}

// =====================================================
// 🎯 Main Hook
// =====================================================

export const useCategoriesCache = (): UseCategoriesCacheResult => {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // ⚡ استعلام التصنيفات (Reactive)
  const categoriesQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM product_categories
        WHERE organization_id = ?
          AND (is_active = 1 OR is_active IS NULL)
        ORDER BY name
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: categoriesData, isLoading: catsLoading, error: catsError } = useQuery<Category>(
    categoriesQuery.sql,
    categoriesQuery.params
  );

  // ⚡ استعلام التصنيفات الفرعية (Reactive)
  const subcategoriesQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM product_subcategories
        WHERE organization_id = ?
        ORDER BY name
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: subcategoriesData, isLoading: subsLoading } = useQuery<Subcategory>(
    subcategoriesQuery.sql,
    subcategoriesQuery.params
  );

  // ⚡ دمج التصنيفات مع التصنيفات الفرعية
  const categories = useMemo((): CategoryWithSubcategories[] => {
    if (!categoriesData) return [];

    const subcategories = subcategoriesData || [];

    return categoriesData.map(cat => ({
      ...cat,
      is_active: Boolean(cat.is_active),
      subcategories: subcategories.filter(sub => sub.category_id === cat.id)
    }));
  }, [categoriesData, subcategoriesData]);

  // =====================================================
  // 🔧 Helper Functions
  // =====================================================

  const refreshCategories = useCallback(async () => {
    // مع PowerSync، البيانات تتحدث تلقائياً
    // هذه الدالة للتوافق مع الكود القديم
    console.log('[useCategoriesCache] Data refreshes automatically via PowerSync');
  }, []);

  const getCategoryById = useCallback((id: string): CategoryWithSubcategories | null => {
    return categories.find(cat => cat.id === id) || null;
  }, [categories]);

  const getSubcategoriesByCategoryId = useCallback((categoryId: string): Subcategory[] => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.subcategories || [];
  }, [categories]);

  return {
    categories,
    isLoading: catsLoading || subsLoading,
    error: catsError ? 'فشل في تحميل الفئات' : null,
    refreshCategories,
    getCategoryById,
    getSubcategoriesByCategoryId
  };
};

export default useCategoriesCache;
