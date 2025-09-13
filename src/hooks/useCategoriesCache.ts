import { useState, useEffect, useCallback } from 'react';
import { Category, Subcategory, getCategories, getSubcategories } from '@/lib/api/categories';
import { useTenant } from '@/context/TenantContext';

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

export const useCategoriesCache = (): UseCategoriesCacheResult => {
  const { currentOrganization } = useTenant();
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // مدة صلاحية الـ cache (5 دقائق)
  const CACHE_DURATION = 5 * 60 * 1000;

  // دالة لجلب الفئات والفئات الفرعية
  const fetchCategories = useCallback(async (force = false) => {
    if (!currentOrganization?.id) return;

    const now = Date.now();

    // فحص إذا كان الـ cache صالح
    if (!force && categories.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // جلب الفئات النشطة
      const categoriesData = await getCategories(currentOrganization.id);
      const activeCategories = categoriesData.filter(cat => cat.is_active);

      // جلب الفئات الفرعية لكل فئة
      const categoriesWithSubs: CategoryWithSubcategories[] = await Promise.all(
        activeCategories.map(async (category) => {
          try {
            const subcategories = await getSubcategories(category.id, currentOrganization.id);
            const activeSubcategories = subcategories.filter(sub => sub.is_active);

            return {
              ...category,
              subcategories: activeSubcategories
            };
          } catch (error) {
            console.error(`Error loading subcategories for category ${category.id}:`, error);
            return {
              ...category,
              subcategories: []
            };
          }
        })
      );

      setCategories(categoriesWithSubs);
      setLastFetchTime(now);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('فشل في تحميل الفئات');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, categories.length, lastFetchTime]);

  // دالة لتحديث الفئات
  const refreshCategories = useCallback(async () => {
    await fetchCategories(true);
  }, [fetchCategories]);

  // دالة للحصول على فئة محددة
  const getCategoryById = useCallback((id: string): CategoryWithSubcategories | null => {
    return categories.find(cat => cat.id === id) || null;
  }, [categories]);

  // دالة للحصول على الفئات الفرعية لفئة محددة
  const getSubcategoriesByCategoryId = useCallback((categoryId: string): Subcategory[] => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.subcategories || [];
  }, [categories]);

  // تحميل الفئات عند التحميل الأول
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchCategories();
    }
  }, [currentOrganization?.id, fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refreshCategories,
    getCategoryById,
    getSubcategoriesByCategoryId
  };
};
