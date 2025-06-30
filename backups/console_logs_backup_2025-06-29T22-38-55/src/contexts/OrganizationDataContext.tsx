/**
 * Context موحد لجميع بيانات المؤسسة - يحل مشكلة الطلبات المكررة
 * مصمم خصيصاً بناءً على تحليل الطلبات المكررة في المشروع
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../context/TenantContext';
import { supabase } from '@/lib/supabase';
import UnifiedRequestManager from '@/lib/unifiedRequestManager';

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
    console.log('🎯 استخدام إعدادات المؤسسة من التخزين المؤقت');
    return cached.data;
  }

  // فحص الطلبات النشطة لتجنب التكرار
  if (activeRequests.has(cacheKey)) {
    console.log('🔄 انتظار طلب نشط للإعدادات...');
    return activeRequests.get(cacheKey);
  }

  // إنشاء طلب جديد
  const requestPromise = (async () => {
    try {
      console.log('🔍 جلب إعدادات المؤسسة من قاعدة البيانات:', organizationId);
      
      // محاولة جلب الإعدادات مع معالجة أفضل للأخطاء
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(); // استخدام maybeSingle بدلاً من single
      
      if (error) {
        // إذا كان الخطأ متعلق بالصلاحيات، جرب الدالة المباشرة
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          try {
            const { data: directData, error: directError } = await supabase
              .rpc('get_organization_settings_direct', { org_id: organizationId });
            
            if (directError) {
              console.warn('فشل في جلب الإعدادات بالطريقة المباشرة:', directError);
              return null; // إرجاع null بدلاً من رمي خطأ
            }
            
            const result = directData?.[0] || null;
            // حفظ في التخزين المؤقت
            if (result) {
              settingsCache.set(cacheKey, { data: result, timestamp: Date.now() });
              console.log('✅ تم جلب الإعدادات بالوصول المباشر وحفظها في التخزين المؤقت');
            }
            return result;
          } catch (rpcError) {
            console.warn('فشل في استدعاء get_organization_settings_direct:', rpcError);
            return null;
          }
        }
        
        // للأخطاء الأخرى، تجاهل إذا كان "no rows"
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.warn('خطأ في جلب إعدادات المؤسسة:', error);
          return null; // إرجاع null بدلاً من رمي خطأ
        }
      }
      
      // حفظ في التخزين المؤقت
      if (data) {
        settingsCache.set(cacheKey, { data, timestamp: Date.now() });
        console.log('✅ تم جلب إعدادات المؤسسة وحفظها في التخزين المؤقت');
      }
      
      return data || null;
    } catch (error) {
      console.warn('خطأ عام في جلب إعدادات المؤسسة:', error);
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
  
  // جلب الاشتراكات النشطة من الجدول المحسن
  const { data, error } = await (supabase as any)
    .from('active_organization_subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('خطأ في جلب الاشتراكات:', error);
    throw error;
  }

  // إضافة لوغ للتشخيص
  if (data && data.length > 0) {
    console.log('✅ تم جلب الاشتراكات النشطة:', data);
  } else {
    console.log('⚠️ لم يتم العثور على اشتراكات نشطة');
  }

  return data || [];
};

const fetchOrganizationApps = async (organizationId: string) => {
  
  const { data, error } = await supabase
    .from('organization_apps')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data || [];
};

const fetchProductCategories = async (organizationId: string) => {
  // استخدام UnifiedRequestManager للحد من الطلبات المكررة
  try {
    const data = await UnifiedRequestManager.getProductCategories(organizationId);
    return data || [];
  } catch (error) {
    if (import.meta.env.DEV) {
    }
    throw error;
  }
};

const fetchProducts = async (organizationId: string) => {
  
  const { data, error } = await supabase
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
  const queryClient = useQueryClient();
  
  const organizationId = currentOrganization?.id;
  
  // استعلامات محسنة مع staleTime مناسب لكل نوع بيانات
  const {
    data: settings,
    error: settingsError,
    isLoading: settingsLoading,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: () => fetchOrganizationSettings(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق - تحديث أقل تكراراً للإعدادات
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 1,
    refetchOnMount: false, // منع التحديث التلقائي عند التحميل
    refetchOnWindowFocus: false,
  });

  const {
    data: subscriptions,
    error: subscriptionsError,
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions
  } = useQuery({
    queryKey: ['organization-subscriptions', organizationId],
    queryFn: () => fetchOrganizationSubscriptions(organizationId!),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 دقيقة - تحديث أكثر تكراراً للاشتراكات الحيوية
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    retry: 3, // زيادة عدد المحاولات للاشتراكات المهمة
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // backoff strategy
    refetchOnMount: true, // إعادة التحقق عند التحميل للاشتراكات
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // تحديث تلقائي كل 5 دقائق للاشتراكات
    // خيارات إضافية لضمان الموثوقية
    networkMode: 'online',
    refetchOnReconnect: true,
  });

  const {
    data: apps,
    error: appsError,
    isLoading: appsLoading,
    refetch: refetchApps
  } = useQuery({
    queryKey: ['organization-apps', organizationId],
    queryFn: () => fetchOrganizationApps(organizationId!),
    enabled: !!organizationId,
    staleTime: 15 * 60 * 1000, // 15 دقيقة - تحديث أقل تكراراً للتطبيقات
    gcTime: 45 * 60 * 1000, // 45 دقيقة
    retry: 1,
    refetchOnMount: false, // منع التحديث التلقائي عند التحميل
    refetchOnWindowFocus: false,
  });

  const {
    data: categories,
    error: categoriesError,
    isLoading: categoriesLoading,
    refetch: refetchCategories
  } = useQuery({
    queryKey: ['product-categories', organizationId],
    queryFn: () => fetchProductCategories(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق - تحديث معقول للفئات
    gcTime: 60 * 60 * 1000, // ساعة واحدة
    retry: 1,
    refetchOnMount: false, // منع التحديث التلقائي عند التحميل
    refetchOnWindowFocus: false,
  });

  // تعطيل جلب جميع المنتجات من Context لتجنب التكرار
  // الصفحات ستستخدم getProductsPaginated مباشرة
  const products = null;
  const productsError = null;
  const productsLoading = false;
  const refetchProducts = () => {};

  // جمع حالات التحميل والأخطاء
  const isLoading = settingsLoading || subscriptionsLoading || appsLoading || categoriesLoading || productsLoading;
  const error = settingsError?.message || subscriptionsError?.message || appsError?.message || 
               categoriesError?.message || productsError?.message || null;

  // دالة لإعادة تحميل جميع البيانات
  const refetchAll = () => {
    refetchSettings();
    refetchSubscriptions();
    refetchApps();
    refetchCategories();
    refetchProducts();
  };

  // كونسول شامل لتتبع حالة البيانات
  React.useEffect(() => {
    if (organizationId) {
    }
  }, [
    organizationId, isLoading, settings, subscriptions, apps, categories,
    settingsError, subscriptionsError, appsError, categoriesError
  ]);

  const value: OrganizationDataContextType = {
    settings: settings || null,
    subscriptions: subscriptions || null,
    apps: apps || null,
    categories: categories || null,
    products: products || null,
    isLoading,
    error,
    refetchSettings,
    refetchSubscriptions,
    refetchApps,
    refetchCategories,
    refetchProducts,
    refetchAll,
  };

  return (
    <OrganizationDataContext.Provider value={value}>
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
