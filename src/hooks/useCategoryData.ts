import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Category, Subcategory, getLocalCategories, getLocalSubcategoriesByCategoryId } from '@/lib/api/categories';
import {
  getCategories as fetchCategoriesAPI,
  getSubcategories as fetchSubcategoriesAPI,
} from '@/lib/api/categories';
import { trackRender } from '@/utils/debugRenderLoop';

interface UseCategoryDataProps {
  organizationId: string;
  watchCategoryId?: string; // category_id from form.watch
}

export const useCategoryData = ({ organizationId, watchCategoryId }: UseCategoryDataProps) => {
  // 🔍 تتبع renders للتصحيح - معطل مؤقتًا
  // trackRender('useCategoryData', { organizationId, watchCategoryId });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);

  // Fetch categories with offline-first fallback
  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const loadLocalFirst = async () => {
      try {
        // محاولة تعبئة فورية من التخزين المحلي
        const localCats = await getLocalCategories();
        if (!cancelled && Array.isArray(localCats) && localCats.length > 0) {
          const productCategories = localCats.filter((cat: any) => (cat?.type || 'product') === 'product');
          setCategories(productCategories as Category[]);
        }
      } catch {}
    };

    const loadRemote = async () => {
      setIsLoadingCategories(true);
      try {
        const categoriesData = await fetchCategoriesAPI(organizationId);
        const productCategories = categoriesData.filter(cat => cat.type === 'product');
        if (!cancelled) setCategories(productCategories);
      } catch (error) {
        if (!cancelled) toast.error('حدث خطأ أثناء تحميل الفئات');
      } finally {
        if (!cancelled) setIsLoadingCategories(false);
      }
    };

    void loadLocalFirst();
    if (isOnline) {
      void loadRemote();
    } else {
      // في وضع عدم الاتصال اكتف بالبيانات المحلية
      setIsLoadingCategories(false);
    }

    return () => { cancelled = true; };
  }, [organizationId]);

  // Fetch subcategories when category_id changes (offline-first)
  useEffect(() => {
    let cancelled = false;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const run = async () => {
      if (!watchCategoryId) {
        // ✅ فقط أعد التعيين إذا كان هناك subcategories فعلاً
        setSubcategories(prev => prev.length > 0 ? [] : prev);
        return;
      }

      // تعبئة محلية أولية
      try {
        const localSubs = await getLocalSubcategoriesByCategoryId(watchCategoryId);
        if (!cancelled && Array.isArray(localSubs) && localSubs.length > 0) {
          setSubcategories(localSubs as Subcategory[]);
        }
      } catch {}

      if (!isOnline) {
        setIsLoadingSubcategories(false);
        return; // لا نحاول البعيد عند عدم الاتصال
      }

      setIsLoadingSubcategories(true);
      try {
        const subs = await fetchSubcategoriesAPI(watchCategoryId, organizationId);
        if (!cancelled) setSubcategories(subs || []);
      } catch (error) {
        if (!cancelled) toast.error('حدث خطأ أثناء تحميل الفئات الفرعية');
      } finally {
        if (!cancelled) setIsLoadingSubcategories(false);
      }
    };

    void run();
    
    return () => { cancelled = true; };
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
