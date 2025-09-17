import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import { StoreInitializationData } from '@/api/optimizedStoreDataService';

interface UseStoreComputedValuesOptions {
  storeData: Partial<StoreInitializationData> | null;
  customComponents: StoreComponent[];
}

interface UseStoreComputedValuesReturn {
  storeName: string;
  extendedCategories: any[];
  defaultStoreComponents: StoreComponent[];
  componentsToRender: StoreComponent[];
}

export const useStoreComputedValues = ({
  storeData,
  customComponents
}: UseStoreComputedValuesOptions): UseStoreComputedValuesReturn => {
  const { currentSubdomain } = useAuth();

  const storeName = useMemo(() => {
    const nameFromDetails = storeData?.organization_details?.name;
    const nameFromSettings = (storeData?.organization_settings as any)?.site_name;
    return nameFromDetails || nameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  }, [storeData?.organization_details?.name, storeData?.organization_settings, currentSubdomain]);

  const extendedCategories = useMemo(() => {
    if (!storeData?.categories || storeData.categories.length === 0) {
      return [];
    }

    return storeData.categories.map(category => ({
      ...category,
      imageUrl: category.image_url || '',
      productsCount: category.product_count || 0,
      icon: category.icon || 'folder',
      color: 'from-blue-500 to-indigo-600'
    }));
  }, [storeData?.categories]);

  const defaultStoreComponents = useMemo((): StoreComponent[] => [
    {
      id: 'banner-default',
      type: 'hero',
      settings: {
        title: storeName,
        subtitle: storeData?.organization_details?.description || 'أفضل المنتجات بأفضل الأسعار'
      },
      isActive: true,
      orderIndex: 0
    },
    {
      id: 'categories-default',
      type: 'product_categories',
      settings: { title: 'تسوق حسب الفئة' },
      isActive: true,
      orderIndex: 1
    },
    {
      id: 'featured-default',
      type: 'featured_products',
      settings: { title: 'منتجات مميزة' },
      isActive: true,
      orderIndex: 2
    },
    {
      id: 'services-default',
      type: 'services',
      settings: {},
      isActive: true,
      orderIndex: 3
    },
    {
      id: 'testimonials-default',
      type: 'testimonials',
      settings: {},
      isActive: true,
      orderIndex: 4
    },
    {
      id: 'about-default',
      type: 'about',
      settings: {
        title: `عن ${storeName}`,
        content: storeData?.organization_details?.description || 'مرحباً بك في متجرنا.'
      },
      isActive: true,
      orderIndex: 5
    },
    {
      id: 'contact-default',
      type: 'contact',
      settings: { email: storeData?.organization_details?.contact_email },
      isActive: true,
      orderIndex: 6
    },
  ], [storeName, storeData?.organization_details]);

  const componentsToRender = useMemo(() => {
    // إصلاح للإنتاج: تحقق من وجود مكونات مخصصة صالحة
    const filteredCustomComponents = customComponents
      .filter(component => {
        const normalizedType = component.type.toLowerCase();
        return normalizedType !== 'seo_settings' && component.isActive;
      })
      .map(component => {
        let normalizedType = component.type.toLowerCase();
        if (normalizedType === 'categories') {
          normalizedType = 'product_categories';
        }
        return {
          ...component,
          type: normalizedType as ComponentType
        };
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // إذا كانت المكونات المخصصة موجودة وصالحة، استخدمها
    if (filteredCustomComponents.length > 0) {
      console.log('🎯 [useStoreComputedValues] استخدام المكونات المخصصة:', filteredCustomComponents.length);
      return filteredCustomComponents;
    }

    // إلا استخدم المكونات الافتراضية
    console.log('⚠️ [useStoreComputedValues] استخدام المكونات الافتراضية - لا توجد مكونات مخصصة');
    return defaultStoreComponents;
  }, [customComponents, defaultStoreComponents]);

  return {
    storeName,
    extendedCategories,
    defaultStoreComponents,
    componentsToRender
  };
};
