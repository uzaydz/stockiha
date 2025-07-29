import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isValidUuid } from '@/utils/uuid-helpers';

// أنواع البيانات المطلوبة فقط لصفحات المنتجات
interface ProductPageContextType {
  // البيانات الأساسية المطلوبة فقط
  organization: any | null;
  organizationSettings: any | null;
  yalidineProvinces: any[] | null;
  defaultLanguage: string;
  
  // حالة التحميل
  isLoading: boolean;
  error: string | null;
  
  // دوال مساعدة
  refreshData: () => void;
}

const ProductPageContext = createContext<ProductPageContextType | undefined>(undefined);

interface ProductPageProviderProps {
  children: ReactNode;
  organizationId?: string;
  subdomain?: string;
  hostname?: string;
}

// دالة جلب بيانات المؤسسة بطريقة محسنة
const fetchOrganizationData = async (params: {
  organizationId?: string;
  subdomain?: string;
  hostname?: string;
}) => {
  const { organizationId, subdomain, hostname } = params;
  
  let query = supabase.from('organizations').select('*');
  
  if (isValidUuid(organizationId)) {
    query = query.eq('id', organizationId);
  } else if (hostname && !hostname.includes('localhost')) {
    query = query.eq('domain', hostname);
  } else if (subdomain && subdomain !== 'main') {
    query = query.eq('subdomain', subdomain);
  }
  
  const { data, error } = await query.single();
  
  if (error) throw error;
  return data;
};

// دالة جلب إعدادات المؤسسة
const fetchOrganizationSettings = async (organizationId: string) => {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
};

// دالة جلب المحافظات (مطلوبة لحساب الشحن) مع timeout
const fetchYalidineProvinces = async () => {
  // إضافة timeout للاستعلام
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('انتهت مهلة تحميل المحافظات')), 10000)
  );
  
  const queryPromise = supabase
    .from('yalidine_provinces_global')
    .select('id, name_ar')
    .order('name_ar');
  
  try {
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('خطأ في تحميل المحافظات:', error);
      // إرجاع مصفوفة فارغة بدلاً من رمي خطأ
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('خطأ في تحميل المحافظات:', error);
    // إرجاع مصفوفة فارغة في حالة الخطأ
    return [];
  }
};

export const ProductPageProvider: React.FC<ProductPageProviderProps> = ({
  children,
  organizationId,
  subdomain,
  hostname
}) => {
  // جلب بيانات المؤسسة - مع منع الطلبات المكررة
  const {
    data: organization,
    isLoading: orgLoading,
    error: orgError,
    refetch: refetchOrg
  } = useQuery({
    queryKey: ['product-page-organization', { organizationId, subdomain, hostname }],
    queryFn: () => fetchOrganizationData({ organizationId, subdomain, hostname }),
    enabled: !!(organizationId || subdomain || hostname),
    staleTime: 15 * 60 * 1000, // 15 دقيقة (زيادة للحد من الطلبات)
    gcTime: 60 * 60 * 1000, // 60 دقيقة
    retry: 1, // تقليل المحاولات لتسريع التحميل
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // منع إعادة الطلب عند إعادة الاتصال
    refetchOnMount: false, // منع إعادة الطلب عند كل mount
  });

  // جلب إعدادات المؤسسة - مع منع الطلبات المكررة
  const {
    data: organizationSettings,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['product-page-settings', organization?.id],
    queryFn: () => fetchOrganizationSettings(organization.id),
    enabled: !!organization?.id,
    staleTime: 20 * 60 * 1000, // 20 دقيقة (زيادة للحد من الطلبات)
    gcTime: 60 * 60 * 1000, // 60 دقيقة
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // منع إعادة الطلب عند إعادة الاتصال
    refetchOnMount: false, // منع إعادة الطلب عند كل mount
  });

  // جلب المحافظات (مرة واحدة فقط) - مع منع الطلبات المكررة وتحسين الأداء
  const {
    data: yalidineProvinces,
    isLoading: provincesLoading,
    error: provincesError,
    refetch: refetchProvinces
  } = useQuery({
    queryKey: ['yalidine-provinces-light'],
    queryFn: fetchYalidineProvinces,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 2, // محاولتين فقط
    retryDelay: 1000, // ثانية واحدة بين المحاولات
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    // إضافة timeout على مستوى الاستعلام
    meta: {
      timeout: 8000 // 8 ثوان
    }
  });

  // تحديد اللغة الافتراضية
  const defaultLanguage = useMemo(() => {
    return organizationSettings?.default_language || 'ar';
  }, [organizationSettings]);

  // حالة التحميل الإجمالية
  const isLoading = orgLoading || settingsLoading || provincesLoading;
  
  // معالجة الأخطاء
  const error = orgError?.message || settingsError?.message || provincesError?.message || null;

  // دالة تحديث البيانات
  const refreshData = () => {
    refetchOrg();
    refetchSettings();
    refetchProvinces();
  };

  const contextValue = useMemo<ProductPageContextType>(() => ({
    organization,
    organizationSettings,
    yalidineProvinces,
    defaultLanguage,
    isLoading,
    error,
    refreshData,
  }), [
    organization,
    organizationSettings,
    yalidineProvinces,
    defaultLanguage,
    isLoading,
    error,
    refreshData,
  ]);

  return (
    <ProductPageContext.Provider value={contextValue}>
      {children}
    </ProductPageContext.Provider>
  );
};

// Hook للوصول إلى Context
export const useProductPage = () => {
  const context = useContext(ProductPageContext);
  if (context === undefined) {
    throw new Error('useProductPage must be used within a ProductPageProvider');
  }
  return context;
};

// Hook للحصول على المؤسسة الحالية (متوافق مع الكود الحالي)
export const useProductPageOrganization = () => {
  const { organization } = useProductPage();
  return organization;
};

// Hook للوصول السريع للإعدادات (آمن للاستخدام خارج ProductPageProvider)
export const useProductPageSettings = () => {
  const context = useContext(ProductPageContext);
  // إذا لم يكن ضمن ProductPageProvider، إرجاع null بدلاً من رمي خطأ
  if (context === undefined) {
    return null;
  }
  return context.organizationSettings || null;
};

export default ProductPageContext;
