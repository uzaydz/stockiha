import { useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { StoreComponent, ComponentType } from '@/types/store-editor';

interface UseAdditionalStoreDataOptions {
  onDataLoaded?: (data: {
    categories: any[];
    featuredProducts: any[];
    customComponents: StoreComponent[];
  }) => void;
  onError?: (error: string) => void;
}

interface UseAdditionalStoreDataReturn {
  loadAdditionalData: (orgId: string) => Promise<void>;
}

export const useAdditionalStoreData = ({
  onDataLoaded,
  onError
}: UseAdditionalStoreDataOptions = {}): UseAdditionalStoreDataReturn => {

  const loadAdditionalData = useCallback(async (orgId: string) => {
    try {
      const supabase = getSupabaseClient();

      // Load data in parallel
      const [categoriesResult, productsResult, componentsResult] = await Promise.all([
        // Categories (limited to 6)
        supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('name')
          .limit(6),

        // Featured products (limited to 4)
        supabase
          .from('products')
          .select(`
            id, name, description, price, compare_at_price, sku, slug,
            thumbnail_image, stock_quantity, is_featured, created_at,
            product_categories!inner(name, slug)
          `)
          .eq('organization_id', orgId)
          .eq('is_featured', true)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(4),

        // Store components
        supabase
          .from('store_settings')
          .select('id, component_type, settings, is_active, order_index')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('order_index')
      ]);

      // Process results
      const processedCategories = (categoriesResult.data || []).map(cat => ({
        ...cat,
        type: (cat.type === 'service' ? 'service' : 'product') as 'product' | 'service',
        product_count: 0, // Will be calculated later if needed
        imageUrl: cat.image_url || '',
        productsCount: 0,
        icon: cat.icon || 'folder',
        color: 'from-blue-500 to-indigo-600'
      }));

      const processedProducts = productsResult.data || [];

      const processedComponents = (componentsResult.data || []).map(item => ({
        id: item.id,
        type: item.component_type as ComponentType,
        settings: item.settings || {},
        isActive: item.is_active,
        orderIndex: item.order_index || 0
      }));

      onDataLoaded?.({
        categories: processedCategories,
        featuredProducts: processedProducts,
        customComponents: processedComponents
      });

    } catch (error: any) {
      const errorMessage = error.message || 'خطأ في تحميل البيانات الإضافية';
      onError?.(errorMessage);
      throw error;
    }
  }, [onDataLoaded, onError]);

  return {
    loadAdditionalData
  };
};
