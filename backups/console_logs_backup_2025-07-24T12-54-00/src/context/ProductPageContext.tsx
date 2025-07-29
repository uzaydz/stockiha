import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

// أنواع البيانات الأساسية للمنتج
interface ProductPageData {
  organization: {
    id: string;
    name: string;
    domain?: string;
  } | null;
  organizationSettings: {
    default_language?: string;
    theme_primary_color?: string;
    theme_secondary_color?: string;
    site_name?: string;
    logo_url?: string;
  } | null;
}

interface ProductPageContextType {
  data: ProductPageData | null;
  isLoading: boolean;
  error: Error | null;
  refreshData: () => void;
}

const ProductPageContext = createContext<ProductPageContextType | undefined>(undefined);

// دالة جلب البيانات الأساسية فقط للمنتج مع retry logic
const fetchProductPageData = async (organizationId: string): Promise<ProductPageData> => {
  const supabase = getSupabaseClient();
  
  console.log('🔄 [ProductPageContext] جلب بيانات المؤسسة:', organizationId);
  
  try {
    // التحقق من صحة client
    if (!supabase) {
      throw new Error('Supabase client غير متوفر');
    }

    // جلب بيانات المؤسسة الأساسية فقط مع timeout
    const orgPromise = supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('id', organizationId)
      .single();

    const { data: organization, error: orgError } = await Promise.race([
      orgPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Organization fetch timeout')), 10000)
      )
    ]) as any;

    if (orgError) {
      console.error('❌ [ProductPageContext] خطأ في جلب المؤسسة:', orgError);
      
      // تحقق من نوع الخطأ
      if (orgError.message?.includes('Failed to fetch') || orgError.message?.includes('NetworkError')) {
        throw new Error('فشل في الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.');
      }
      throw orgError;
    }

    if (!organization) {
      throw new Error('لم يتم العثور على المؤسسة');
    }

    console.log('✅ [ProductPageContext] تم جلب بيانات المؤسسة:', organization);

    // جلب الإعدادات الأساسية فقط (غير إجباري)
    let settings = null;
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('organization_settings')
        .select('default_language, theme_primary_color, theme_secondary_color, site_name, logo_url')
        .eq('organization_id', organizationId)
        .single();

      if (settingsError) {
        console.warn('⚠️ [ProductPageContext] لم يتم العثور على إعدادات المؤسسة، استخدام الافتراضية');
      } else {
        settings = settingsData;
        console.log('✅ [ProductPageContext] تم جلب إعدادات المؤسسة:', settings);
      }
    } catch (settingsErr) {
      console.warn('⚠️ [ProductPageContext] تجاهل خطأ الإعدادات:', settingsErr);
    }

    const result = {
      organization,
      organizationSettings: settings
    };

    console.log('🎉 [ProductPageContext] اكتمل جلب البيانات:', result);
    return result;
  } catch (error) {
    console.error('🔴 [ProductPageContext] خطأ في جلب بيانات الصفحة:', error);
    
    // إضافة معلومات إضافية للخطأ
    if (error instanceof Error) {
      throw new Error(`خطأ في تحميل بيانات المتجر: ${error.message}`);
    }
    throw new Error('خطأ غير معروف في تحميل بيانات المتجر');
  }
};

interface ProductPageProviderProps {
  children: ReactNode;
}

export const ProductPageProvider: React.FC<ProductPageProviderProps> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isReadyToQuery, setIsReadyToQuery] = useState(false);

  // محاولة استخراج organizationId من مصادر متعددة
  useEffect(() => {
    const detectOrganizationId = () => {
      // الأولوية 1: currentOrganization من TenantContext
      if (currentOrganization?.id) {
        console.log('🎯 [ProductPageProvider] استخدام معرف المؤسسة من TenantContext:', currentOrganization.id);
        setOrganizationId(currentOrganization.id);
        setIsReadyToQuery(true);
        return;
      }

      // الأولوية 2: localStorage من StoreRouter
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      if (storedOrgId && storedOrgId !== 'default-organization-id') {
        console.log('🎯 [ProductPageProvider] استخدام معرف المؤسسة من localStorage:', storedOrgId);
        setOrganizationId(storedOrgId);
        setIsReadyToQuery(true);
        return;
      }

      // الأولوية 3: انتظار قصير ثم المحاولة مرة أخرى
      const hostname = window.location.hostname;
      console.log('🔍 [ProductPageProvider] لم يتم العثور على معرف مؤسسة، النطاق:', hostname);
      setOrganizationId(null);
      
      // إعطاء StoreRouter وقتاً قصيراً لحفظ البيانات (فقط في المحاولة الأولى)
      if (!isReadyToQuery) {
        console.log('⏱️ [ProductPageProvider] انتظار StoreRouter لحفظ البيانات...');
        setTimeout(() => {
          const retryStoredOrgId = localStorage.getItem('bazaar_organization_id');
          if (retryStoredOrgId && retryStoredOrgId !== 'default-organization-id') {
            console.log('✅ [ProductPageProvider] تم العثور على معرف المؤسسة بعد الانتظار:', retryStoredOrgId);
            setOrganizationId(retryStoredOrgId);
          }
          setIsReadyToQuery(true);
        }, 1500); // انتظار 1.5 ثانية
      } else {
        setIsReadyToQuery(true);
      }
    };

    // استدعاء أولي
    detectOrganizationId();

    // مراقبة تغييرات localStorage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'bazaar_organization_id' || event.key === 'bazaar_current_subdomain') {
        console.log('📡 [ProductPageProvider] تم اكتشاف تغيير في localStorage:', { 
          key: event.key, 
          newValue: event.newValue,
          oldValue: event.oldValue 
        });
        
        // إعادة تحديد معرف المؤسسة
        setTimeout(detectOrganizationId, 100);
      }
    };

    // إضافة مراقب localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // تنظيف المراقب
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentOrganization, isReadyToQuery]);

  console.log('🏗️ [ProductPageProvider] البيانات الأولية:', {
    currentOrganization,
    organizationId,
    isReadyToQuery,
    enabled: !!organizationId && isReadyToQuery
  });

  const {
    data,
    isLoading,
    error,
    refetch: refreshData
  } = useQuery({
    queryKey: ['product-page-data', organizationId],
    queryFn: () => fetchProductPageData(organizationId!),
    enabled: !!organizationId && isReadyToQuery,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // إعادة المحاولة فقط للأخطاء الشبكية، وليس لأخطاء "المؤسسة غير موجودة"
      if (error?.message?.includes('لم يتم العثور على المؤسسة') || 
          error?.message?.includes('Organization not found')) {
        return false; // لا تعيد المحاولة للمؤسسات غير الموجودة
      }
      return failureCount < 3; // إعادة المحاولة 3 مرات للأخطاء الأخرى
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // زيادة تدريجية
  });

  console.log('📊 [ProductPageProvider] حالة React Query:', {
    isLoading,
    hasData: !!data,
    error: error?.message,
    organizationId
  });

  const contextValue: ProductPageContextType = {
    data: data || null,
    isLoading,
    error: error as Error | null,
    refreshData,
  };

  // إظهار loading إذا لم يتم تحديد المؤسسة أو البيانات لا تزال تُحمل
  if (!organizationId) {
    console.warn('⚠️ [ProductPageProvider] لم يتم تحديد معرف المؤسسة');
    return (
      <ProductPageContext.Provider value={contextValue}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>جاري تحديد المؤسسة...</p>
          </div>
        </div>
      </ProductPageContext.Provider>
    );
  }

  if (isLoading) {
    console.log('🔄 [ProductPageProvider] جاري تحميل البيانات...');
    return (
      <ProductPageContext.Provider value={contextValue}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>جاري تحميل بيانات المتجر...</p>
          </div>
        </div>
      </ProductPageContext.Provider>
    );
  }

  if (error) {
    console.error('❌ [ProductPageProvider] خطأ في تحميل البيانات:', error);
    
    // التحقق إذا كان الخطأ بسبب عدم وجود المؤسسة
    const isOrganizationNotFound = error.message?.includes('لم يتم العثور على المؤسسة') || 
                                   error.message?.includes('Organization not found');
    
    if (isOrganizationNotFound) {
      // لا تعرض خطأ، بل حاول إعادة التوجيه أو عرض رسالة ودية
      console.log('🔄 [ProductPageProvider] المؤسسة غير موجودة، محاولة إعادة التحديد...');
      
      // محاولة إعادة تحديد المؤسسة بعد ثانيتين
      setTimeout(() => {
        setOrganizationId(null);
      }, 2000);
      
      return (
        <ProductPageContext.Provider value={contextValue}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>جاري إعداد المتجر...</p>
            </div>
          </div>
        </ProductPageContext.Provider>
      );
    }
    
    // للأخطاء الأخرى، أظهر واجهة الخطأ
    return (
      <ProductPageContext.Provider value={contextValue}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-red-600">
            <h2 className="text-xl font-bold mb-4">خطأ في تحميل بيانات المتجر</h2>
            <p className="mb-4 text-gray-600">{error.message}</p>
            <div className="space-x-2">
              <button 
                onClick={() => refreshData()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-2"
              >
                إعادة المحاولة
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                مسح البيانات وإعادة التحميل
              </button>
            </div>
          </div>
        </div>
      </ProductPageContext.Provider>
    );
  }

  return (
    <ProductPageContext.Provider value={contextValue}>
      {children}
    </ProductPageContext.Provider>
  );
};

// Hook لاستخدام البيانات
export const useProductPageData = (): ProductPageContextType => {
  const context = useContext(ProductPageContext);
  if (context === undefined) {
    throw new Error('useProductPageData must be used within a ProductPageProvider');
  }
  return context;
};

// Hook للوصول السريع للمؤسسة (آمن للاستخدام خارج ProductPageProvider)
export const useProductPageOrganization = () => {
  const context = useContext(ProductPageContext);
  // إذا لم يكن ضمن ProductPageProvider، إرجاع null بدلاً من رمي خطأ
  if (context === undefined) {
    return null;
  }
  return context.data?.organization || null;
};

// Hook للوصول السريع للإعدادات (آمن للاستخدام خارج ProductPageProvider)
export const useProductPageSettings = () => {
  const context = useContext(ProductPageContext);
  // إذا لم يكن ضمن ProductPageProvider، إرجاع null بدلاً من رمي خطأ
  if (context === undefined) {
    return null;
  }
  return context.data?.organizationSettings || null;
};

// Hook للتوافق مع الكود القديم (deprecated)
export const useProductPage = () => {
  const { data, isLoading, error } = useProductPageData();
  return {
    organization: data?.organization || null,
    organizationSettings: data?.organizationSettings || null,
    isLoading,
    error,
  };
};
