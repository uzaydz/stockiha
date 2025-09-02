import { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { loadCriticalImages, loadLazyImages } from '@/lib/imageOptimization';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { useTenant } from '@/context/TenantContext';
import { getDefaultCategories, mapRealCategoriesToExtended } from './utils';
import type { ExtendedCategory, CategorySettings } from './types';

interface UseCategoryDataProps {
  propCategories?: ExtendedCategory[];
  useRealCategories?: boolean;
  settings?: CategorySettings;
}

export const useCategoryData = ({
  propCategories = [],
  useRealCategories = true,
  settings = {}
}: UseCategoryDataProps) => {
  const { t } = useTranslation();
  const { currentOrganization } = useTenant();
  const { categories: sharedCategories = [] } = useSharedStoreDataContext();

  // استخدام organizationId من TenantContext بدلاً من localStorage
  const organizationId = currentOrganization?.id || (() => {
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) return storedOrgId;
    
    const hostname = window.location.hostname;
    if (hostname.includes('asraycollection')) {
      return '560e2c06-d13c-4853-abcf-d41f017469cf';
    }
    
    return null;
  })();

  // استخدام React Query لجلب البيانات مع deduplication تلقائي
  const {
    data: freshCategories = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['product-categories', organizationId],
    queryFn: async (): Promise<ExtendedCategory[]> => {
      if (!organizationId) return [];
      
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, slug, image_url, is_active, updated_at, icon, description')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        return [];
      }
      
      return (data || []).map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || t('productCategories.fallbackDescription'),
        slug: category.slug,
        imageUrl: category.image_url ? `${category.image_url}?v=${new Date(category.updated_at || Date.now()).getTime()}` : '',
        icon: category.icon || 'layers',
        color: 'from-primary/20 to-secondary/20'
      }));
    },
    enabled: useRealCategories && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق  
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  // معالجة البيانات النهائية
  const displayedCategories = useMemo(() => {
    let categoriesToUse = propCategories.length > 0 ? propCategories : 
                         freshCategories.length > 0 ? freshCategories : 
                         sharedCategories;
    
    // تطبيق فلترة _previewCategories
    if (settings._previewCategories && settings._previewCategories.length > 0) {
      if (typeof settings._previewCategories[0] === 'object') {
        categoriesToUse = settings._previewCategories as ExtendedCategory[];
      } else if (categoriesToUse.length > 0) {
        categoriesToUse = categoriesToUse.filter(cat => 
          (settings._previewCategories as string[]).includes(cat.id)
        );
      }
    }
    
    // استخدام البيانات الحقيقية أو الافتراضية
    if (useRealCategories && categoriesToUse && categoriesToUse.length > 0) {
      let processedCategories = mapRealCategoriesToExtended(categoriesToUse, t);

      // تطبيق الفلترة حسب الإعدادات
      if (settings.selectionMethod === 'manual' && settings.selectedCategories?.length) {
        processedCategories = processedCategories.filter(cat => 
          settings.selectedCategories!.includes(cat.id)
        );
      } else if (settings.selectionMethod === 'newest') {
        processedCategories = processedCategories.reverse();
      }
      
      const displayCount = settings.displayCount || settings.maxCategories || 6;
      return processedCategories.slice(0, displayCount);
    }
    
    // استخدام الفئات الافتراضية
    const displayCount = settings.displayCount || settings.maxCategories || 6;
    return getDefaultCategories(t).slice(0, displayCount);
  }, [freshCategories, propCategories, sharedCategories, useRealCategories, settings, t]);

  // Preload صور الفئات مع تحسينات السرعة
  useEffect(() => {
    if (displayedCategories.length > 0) {
      const imageUrls = displayedCategories
        .slice(0, 6)
        .map(category => category.imageUrl)
        .filter(Boolean);
      
      if (imageUrls.length > 0) {
        // تحميل فوري للصور الثلاث الأولى
        const priorityImages = imageUrls.slice(0, 3);
        const lazyImages = imageUrls.slice(3);
        
        // تحميل فوري للصور المهمة بدون preload links
        loadCriticalImages(priorityImages);
        
        // تحميل متأخر للباقي
        if (lazyImages.length > 0) {
          loadLazyImages(lazyImages, 500);
        }
      }
    }
  }, [displayedCategories]);

  return {
    displayedCategories,
    isLoading,
    showDemoMessage: !isLoading && propCategories.length === 0 && displayedCategories.length > 0
  };
};
