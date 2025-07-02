import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Category, Subcategory } from '@/lib/api/categories';
import {
  getCategories as fetchCategoriesAPI,
  getSubcategories as fetchSubcategoriesAPI,
} from '@/lib/api/categories';

interface UseCategoryDataProps {
  organizationId: string;
  watchCategoryId?: string; // category_id from form.watch
}

export const useCategoryData = ({ organizationId, watchCategoryId }: UseCategoryDataProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);

  // Fetch categories
  useEffect(() => {
    if (organizationId) {
      setIsLoadingCategories(true);
      fetchCategoriesAPI(organizationId)
        .then(categoriesData => {
          const productCategories = categoriesData.filter(cat => cat.type === 'product');
          setCategories(productCategories);
        })
        .catch(error => {
          toast.error('حدث خطأ أثناء تحميل الفئات');
        })
        .finally(() => setIsLoadingCategories(false));
    }
  }, [organizationId]);

  // Fetch subcategories when category_id changes
  useEffect(() => {
    if (watchCategoryId) {
      setIsLoadingSubcategories(true);
      fetchSubcategoriesAPI(watchCategoryId, organizationId)
        .then(setSubcategories)
        .catch(error => {
          toast.error('حدث خطأ أثناء تحميل الفئات الفرعية');
        })
        .finally(() => setIsLoadingSubcategories(false));
    } else {
      setSubcategories([]);
    }
  }, [watchCategoryId, organizationId]);

  const handleCategoryCreated = useCallback((category: Category) => {
    setCategories(prev => [...prev, category]);
  }, []);

  const handleSubcategoryCreated = useCallback((subcategory: Subcategory) => {
    setSubcategories(prev => [...prev, subcategory]);
  }, []);

  return {
    categories,
    subcategories,
    isLoadingCategories,
    isLoadingSubcategories,
    handleCategoryCreated,
    handleSubcategoryCreated,
  };
};
