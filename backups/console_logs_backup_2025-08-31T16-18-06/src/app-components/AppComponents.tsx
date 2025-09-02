import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Navigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { getCategoryById, getCategories } from '../lib/api/unified-api';
import { syncCategoriesDataOnStartup } from '../lib/api/categories';
import { configureCrossDomainAuth } from '../lib/cross-domain-auth';
import { useDevtools } from '../hooks/useDevtools';
import useTabFocusEffect from '../hooks/useTabFocusEffect';
// import useReactQueryState from '../hooks/useReactQueryState'; // Removed for performance
// تم تعطيل تتبع الجلسات مؤقتاً
// import { useSessionTracking } from '../hooks/useSessionTracking';
import SyncManager from '../components/SyncManager';

// ============ إعدادات الأداء ============

// 🔧 مكون لتحديد متى يتم عرض مؤشر المزامنة
export const SyncManagerWrapper = () => {
  // إخفاء SyncManager تماماً من الواجهة الأمامية
  return null;
  
  // الكود القديم (معطل):
  // const location = useLocation();
  // const isDashboardPage = location.pathname.startsWith('/dashboard') || 
  //                        location.pathname.startsWith('/pos') ||
  //                        location.pathname === '/' ||
  //                        location.pathname.startsWith('/inventory') ||
  //                        location.pathname.startsWith('/orders');
  
  // // إظهار SyncManager فقط في صفحات لوحة التحكم وفي بيئة Electron
  // if (!isDashboardPage) {
  //   return null;
  // }
  
  // return <SyncManager autoSync={true} syncInterval={60000} showIndicator={true} />;
};

// 🎯 مكون لمعالجة تبديل علامات التبويب
export const TabFocusHandler = ({ children }: { children: React.ReactNode }) => {
  // useSessionTracking(); // معطل
  
  useTabFocusEffect({
    onFocus: () => {
      // عند العودة بعد فترة طويلة، يمكن تحديث بعض البيانات الهامة
    },
    onBlur: () => {
      // إيقاف أي طلبات قيد التنفيذ بشكل آمن
      const queryClient = (window as any).__REACT_QUERY_GLOBAL_CLIENT;
      if (queryClient) {
        queryClient.cancelQueries({
          predicate: (query) => {
            const state = query.state;
            return state.fetchStatus === 'fetching' || state.status === 'pending';
          }
        });
      }
    },
    // اعتبار العودة خلال 5 دقائق عودة سريعة لا تتطلب إعادة تحميل
    fastReturnThreshold: 1000 * 60 * 5
  });
  
  // استخدام الخطاف الجديد للتعامل مع حالة React Query (تم إزالته لتحسين الأداء)
  // useReactQueryState();
  
  return <>{children}</>;
};

// 🔄 مكون إعادة التوجيه للفئات المحسن
export const CategoryRedirect = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { currentOrganization } = useTenant();
  const [actualCategoryId, setActualCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const findCategory = async () => {
      if (!categoryId || !currentOrganization) {
        setIsLoading(false);
        return;
      }
      
      try {
        // أولاً: محاولة البحث بالـ ID مباشرة
        let category = await getCategoryById(categoryId, currentOrganization.id);
        
        if (category) {
          setActualCategoryId(category.id);
          setIsLoading(false);
          return;
        }
        
        // ثانياً: البحث بالـ slug في جميع الفئات
        const allCategories = await getCategories(currentOrganization.id);
        const categoryBySlug = allCategories.find(cat => 
          cat.slug === categoryId || 
          cat.slug?.includes(categoryId) ||
          cat.name.toLowerCase().replace(/\s+/g, '-') === categoryId
        );
        
        if (categoryBySlug) {
          setActualCategoryId(categoryBySlug.id);
        }
        
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };
    
    findCategory();
  }, [categoryId, currentOrganization]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري البحث عن الفئة...</p>
        </div>
      </div>
    );
  }
  
  if (!categoryId) {
    return <Navigate to="/products" replace />;
  }
  
  if (actualCategoryId) {
    return <Navigate to={`/products?category=${actualCategoryId}`} replace />;
  }
  
  // إذا لم نجد الفئة، نوجه إلى صفحة المنتجات العامة
  return <Navigate to="/products" replace />;
};

// 🚀 Hook للإعدادات الأولية للتطبيق
export const useAppInitialization = () => {
  const pageStartTime = (window as any).pageLoadStartTime || performance.now();
  
  // تفعيل مراقبة أخطاء التطوير والـ HMR
  useDevtools();
  
  useEffect(() => {
    // ⏱️ تتبع useEffect في App
    const useEffectStartTime = performance.now();
    
    // 🚀 إزالة شاشة التحميل عند جاهزية React App
    let removeLoadingTimeout: NodeJS.Timeout | undefined;
    if (typeof window !== 'undefined' && (window as any).removeInitialLoading) {
      // تأخير صغير للتأكد من اكتمال الرندر الأول
      removeLoadingTimeout = setTimeout(() => {
        (window as any).removeInitialLoading();
      }, 50);
    }
    
    // تأجيل مزامنة الفئات لتجنب التكرار مع React Strict Mode والاستدعاءات من POSDataContext
    const syncTimeout = setTimeout(() => {
      // إيقاف المزامنة تماماً لتجنب التكرار مع الـ providers الجديدة
      // الآن useSharedStoreData يتولى جلب الفئات، لذا لا نحتاج مزامنة إضافية
      const shouldSkipSync = true; // تعطيل المزامنة لتجنب الطلبات المضاعفة
      
      if (!shouldSkipSync) {
        syncCategoriesDataOnStartup();
      } else {
      }
    }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
    
    configureCrossDomainAuth();
    
    // تهيئة معالج أخطاء Supabase Auth
    import('../lib/supabase/authErrorHandler').then(({ setupAuthErrorFiltering }) => {
      setupAuthErrorFiltering();
    }).catch(console.warn);

    // تنظيف timeout عند إلغاء المكون
    return () => {
      clearTimeout(syncTimeout);
      if (removeLoadingTimeout) clearTimeout(removeLoadingTimeout);
    };
  }, [pageStartTime]);
};

// 🎨 مكون أساسي للتطبيق
export const AppCore = ({ children }: { children: React.ReactNode }) => {
  useAppInitialization();
  
  return (
    <TabFocusHandler>
      {children}
      <SyncManagerWrapper />
    </TabFocusHandler>
  );
};
