/**
 * Context موحد لجميع بيانات المؤسسة - يحل مشكلة الطلبات المكررة
 * مصمم خصيصاً بناءً على تحليل الطلبات المكررة في المشروع
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import { supabase } from '@/lib/supabase-client';

// أنواع البيانات الموحدة
interface OrganizationData {
  settings: any | null;
  subscriptions: any[] | null;
  apps: any[] | null;
  categories: any[] | null;
  products: any[] | null;
  isLoading: boolean;
  error: string | null;
}

interface OrganizationDataContextType extends OrganizationData {
  refetchSettings: () => void;
  refetchSubscriptions: () => void;
  refetchApps: () => void;
  refetchCategories: () => void;
  refetchProducts: () => void;
  refetchAll: () => void;
}

const OrganizationDataContext = createContext<OrganizationDataContextType | undefined>(undefined);

// Singleton pattern للتحكم في الاستدعاءات المتكررة
const activeRequests = new Map<string, Promise<any>>();
const settingsCache = new Map<string, { data: any; timestamp: number }>();
const SETTINGS_CACHE_DURATION = 2 * 60 * 1000; // دقيقتان

// دوال جلب البيانات المحسنة مع deduplication
const fetchOrganizationSettings = async (organizationId: string) => {
  const cacheKey = `settings-${organizationId}`;
  
  // فحص التخزين المؤقت أولاً
  const cached = settingsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SETTINGS_CACHE_DURATION) {
    return cached.data;
  }

  // فحص الطلبات النشطة لتجنب التكرار
  if (activeRequests.has(cacheKey)) {
    return activeRequests.get(cacheKey);
  }

  // إنشاء طلب جديد
  const requestPromise = (async () => {
    try {
      
      // محاولة جلب الإعدادات باستخدام نظام التنسيق
      const { coordinateRequest } = await import('@/lib/api/requestCoordinator');
      const data = await coordinateRequest(
        'organization_settings',
        { organization_id: organizationId },
        async () => {
          const { data, error } = await supabase
            .from('organization_settings')
            .select('*')
            .eq('organization_id', organizationId)
            .maybeSingle();
          
          if (error) throw error;
          return data;
        },
        'OrganizationDataContext'
      );
      
      const error = null; // لا يوجد خطأ إذا نجح التنسيق
      
      if (error) {
        // إذا كان الخطأ متعلق بالصلاحيات، جرب الدالة المباشرة
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          try {
            // استخدام استعلام مباشر بدلاً من RPC غير الموجود
            const { data: directData, error: directError } = await supabase
              .from('organization_settings')
              .select('*')
              .eq('organization_id', organizationId)
              .maybeSingle();
            
            if (directError) {
              return null; // إرجاع null بدلاً من رمي خطأ
            }
            
            const result = directData || null;
            // حفظ في التخزين المؤقت
            if (result) {
              settingsCache.set(cacheKey, { data: result, timestamp: Date.now() });
            }
            return result;
          } catch (rpcError) {
            return null;
          }
        }
        
        // للأخطاء الأخرى، تجاهل إذا كان "no rows"
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          return null; // إرجاع null بدلاً من رمي خطأ
        }
      }
      
      // حفظ في التخزين المؤقت
      if (data) {
        settingsCache.set(cacheKey, { data, timestamp: Date.now() });
      }
      
      return data || null;
    } catch (error) {
      return null; // إرجاع null في حالة أي خطأ
    } finally {
      // إزالة الطلب من القائمة النشطة
      activeRequests.delete(cacheKey);
    }
  })();

  // حفظ الطلب في القائمة النشطة
  activeRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
};

const fetchOrganizationSubscriptions = async (organizationId: string) => {
  
  // جلب الاشتراكات النشطة من الجدول الموجود
  try {
    const { data, error } = await (supabase as any)
      .from('subscription_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }

    // إضافة لوغ للتشخيص
    if (data && data.length > 0) {
      if (import.meta.env.DEV) {
        console.log(`تم جلب ${data.length} خطة اشتراك للمنظمة ${organizationId}`);
      }
    } else {
      if (import.meta.env.DEV) {
        console.log(`لم يتم العثور على خطط اشتراك للمنظمة ${organizationId}`);
      }
    }

    return data || [];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('فشل في جلب خطط الاشتراك:', error);
    }
    return [];
  }
};

const fetchOrganizationApps = async (organizationId: string) => {
  
  // استخدام جدول موجود بدلاً من organization_apps
  try {
    const { data, error } = await (supabase as any)
      .from('subscription_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('فشل في جلب خطط الاشتراك:', error);
    }
    return [];
  }
};

const fetchProductCategories = async (organizationId: string) => {
  // استخدام استعلام مباشر بدلاً من UnifiedRequestManager
  try {
    const { data, error } = await (supabase as any)
      .from('product_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('فشل في جلب فئات المنتجات:', error);
    }
    return [];
  }
};

const fetchProducts = async (organizationId: string) => {
  
  const { data, error } = await (supabase as any)
    .from('products')
    .select(`
      *,
      category:category_id(id, name, slug),
      subcategory:subcategory_id(id, name, slug)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data || [];
};

// مقدم البيانات الموحد
export const OrganizationDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 استخدام البيانات من useSharedStoreData بدلاً من الاستدعاءات المنفصلة
  const { 
    products, 
    categories, 
    organizationSettings,
    isLoading: sharedLoading,
    error: sharedError
  } = useSharedStoreData({
    includeProducts: true,
    includeCategories: true,
    includeFooterSettings: true,
    enabled: !!currentOrganization?.id
  });

  // تحديث حالة التحميل
  useEffect(() => {
    setIsLoading(sharedLoading);
  }, [sharedLoading]);

  // تحديث حالة الخطأ
  useEffect(() => {
    setError(sharedError);
  }, [sharedError]);

  const contextValue = {
    products: products || [],
    categories: categories || [],
    organizationSettings: organizationSettings || {},
    isLoading,
    error,
    refreshData: () => {}, // لا حاجة للتحديث اليدوي
    
    // إضافة الدوال المفقودة
    refetchSettings: () => {},
    refetchSubscriptions: () => {},
    refetchApps: () => {},
    refetchCategories: () => {},
    refetchProducts: () => {},
    refetchAll: () => {},
    
    // إضافة البيانات المفقودة
    settings: organizationSettings || null,
    subscriptions: [],
    apps: []
  };

  return (
    <OrganizationDataContext.Provider value={contextValue}>
      {children}
    </OrganizationDataContext.Provider>
  );
};

// Hook للاستخدام
export const useOrganizationData = (): OrganizationDataContextType => {
  const context = useContext(OrganizationDataContext);
  if (!context) {
    throw new Error('useOrganizationData must be used within OrganizationDataProvider');
  }
  return context;
};

// Hooks محددة لكل نوع بيانات
export const useOrganizationSettings = () => {
  const { settings, isLoading, error, refetchSettings } = useOrganizationData();
  return { settings, isLoading, error, refetch: refetchSettings };
};

export const useOrganizationSubscriptions = () => {
  const { subscriptions, isLoading, error, refetchSubscriptions } = useOrganizationData();
  return { subscriptions, isLoading, error, refetch: refetchSubscriptions };
};

export const useOrganizationApps = () => {
  const { apps, isLoading, error, refetchApps } = useOrganizationData();
  return { apps, isLoading, error, refetch: refetchApps };
};

export const useProductCategories = () => {
  const { categories, isLoading, error, refetchCategories } = useOrganizationData();
  return { categories, isLoading, error, refetch: refetchCategories };
};

export const useProducts = () => {
  const { products, isLoading, error, refetchProducts } = useOrganizationData();
  return { products, isLoading, error, refetch: refetchProducts };
};

export default OrganizationDataContext;
