/**
 * ⚡ useReactiveCategories - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للتصنيفات مع تحديث تلقائي
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ReactiveCategory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReactiveSubcategory {
  id: string;
  name: string;
  category_id: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReactiveCategoryWithSubs extends ReactiveCategory {
  subcategories: ReactiveSubcategory[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveCategories
// ═══════════════════════════════════════════════════════════════════════════

export interface UseReactiveCategoriesOptions {
  activeOnly?: boolean;
  type?: 'product' | 'service';
  searchTerm?: string;
}

/**
 * 🚀 Hook للتصنيفات (Reactive)
 *
 * @example
 * ```tsx
 * const { categories, isLoading } = useReactiveCategories();
 * // categories يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveCategories(options: UseReactiveCategoriesOptions = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;
  const { activeOnly = false, type, searchTerm } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = 'SELECT * FROM product_categories WHERE organization_id = ?';
    const queryParams: any[] = [orgId];

    // فلتر الفئات الفعالة فقط
    if (activeOnly) {
      query += ' AND (is_active = 1 OR is_active IS NULL)';
    }

    // فلتر النوع
    if (type) {
      query += ' AND type = ?';
      queryParams.push(type);
    }

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))';
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY name';

    return { sql: query, params: queryParams };
  }, [orgId, activeOnly, type, searchTerm]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveCategory>(sql, params);

  const categories = useMemo(() => {
    if (!data) return [];
    return data.map(c => ({
      ...c,
      is_active: Boolean(c.is_active)
    }));
  }, [data]);

  return {
    categories,
    isLoading,
    isFetching,
    error: error || null,
    total: categories.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Subcategories Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للتصنيفات الفرعية (Reactive)
 */
export function useReactiveSubcategories(categoryId?: string) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    if (categoryId) {
      return {
        sql: `
          SELECT * FROM product_subcategories
          WHERE organization_id = ? AND category_id = ?
          ORDER BY name
        `,
        params: [orgId, categoryId]
      };
    }

    return {
      sql: `
        SELECT * FROM product_subcategories
        WHERE organization_id = ?
        ORDER BY name
      `,
      params: [orgId]
    };
  }, [orgId, categoryId]);

  const { data, isLoading, error } = useQuery<ReactiveSubcategory>(sql, params);

  return {
    subcategories: data || [],
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Categories with Subcategories Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للتصنيفات مع التصنيفات الفرعية (Reactive)
 */
export function useReactiveCategoriesWithSubs() {
  const { categories, isLoading: catsLoading, error: catsError } = useReactiveCategories();
  const { subcategories, isLoading: subsLoading, error: subsError } = useReactiveSubcategories();

  const categoriesWithSubs = useMemo(() => {
    if (!categories.length) return [];

    return categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category_id === cat.id)
    }));
  }, [categories, subcategories]);

  return {
    categories: categoriesWithSubs,
    isLoading: catsLoading || subsLoading,
    error: catsError || subsError
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Category Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لتصنيف واحد (Reactive)
 */
export function useReactiveCategory(categoryId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !categoryId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM product_categories WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [categoryId, orgId]
    };
  }, [categoryId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveCategory>(sql, params);

  const category = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0];
  }, [data]);

  return { category, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Category Count Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد التصنيفات (Reactive)
 */
export function useReactiveCategoryCount() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }
    return {
      sql: `
        SELECT
          (SELECT COUNT(*) FROM product_categories WHERE organization_id = ?) as categories,
          (SELECT COUNT(*) FROM product_subcategories WHERE organization_id = ?) as subcategories
      `,
      params: [orgId, orgId]
    };
  }, [orgId]);

  const { data, isLoading } = useQuery<{ categories: number; subcategories: number }>(sql, params);

  const counts = useMemo(() => {
    if (!data || data.length === 0) {
      return { categories: 0, subcategories: 0 };
    }
    return {
      categories: Number(data[0].categories) || 0,
      subcategories: Number(data[0].subcategories) || 0
    };
  }, [data]);

  return { counts, isLoading };
}

export default useReactiveCategories;
