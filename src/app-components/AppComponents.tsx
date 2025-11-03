import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Navigate, BrowserRouter, HashRouter } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { getCategoryById, getCategories } from '../lib/api/unified-api';
import { saveCategoriesToLocalStorage, saveSubcategoriesToLocalStorage, syncCategoriesDataOnStartup } from '../lib/api/categories';
import { configureCrossDomainAuth } from '../lib/cross-domain-auth';
import { useDevtools } from '../hooks/useDevtools';
import useTabFocusEffect from '../hooks/useTabFocusEffect';
import { useAuth } from '../context/AuthContext';
// import useReactQueryState from '../hooks/useReactQueryState'; // Removed for performance
// تم تعطيل تتبع الجلسات مؤقتاً
// import { useSessionTracking } from '../hooks/useSessionTracking';
import SyncManager from '../components/SyncManager';
import { TitlebarProvider } from '../context/TitlebarContext';
import AppleShell from '@/components/apple/AppleShell';
import { ThemeProvider } from '../context/ThemeContext';
import { StaffSessionProvider } from '../context/StaffSessionContext';
import { VirtualNumpadProvider } from '../context/VirtualNumpadContext';
import { GlobalNumpadManager } from '../components/virtual-numpad/GlobalNumpadManager';
import SmartProviderWrapper from '../components/routing/SmartProviderWrapper';

let categoriesSyncedOnStartup = false;

// ============ إعدادات الأداء ============

// 🔧 مكون لتحديد متى يتم عرض مؤشر المزامنة
export const SyncManagerWrapper = () => {
  const location = useLocation();
  const pathname = location.pathname || '';
  const dashboardPrefixes = ['/dashboard', '/pos', '/inventory', '/orders', '/customers', '/analytics'];
  const shouldRenderByPath = dashboardPrefixes.some((prefix) => pathname.startsWith(prefix));
  // لا نشغل المزامنة إلا بعد المصادقة لتجنب الضجيج قبل تسجيل الدخول
  const { user, authReady } = useAuth();
  const isAuthed = Boolean(user) && Boolean(authReady);

  if (!shouldRenderByPath || !isAuthed) {
    return null;
  }

  return <SyncManager autoSync syncInterval={60_000} showIndicator />;
};

// 🎯 مكون لمعالجة تبديل علامات التبويب
export const TabFocusHandler = ({ children }: { children: React.ReactNode }) => {
  // useSessionTracking(); // معطل
  
  useTabFocusEffect({
    onFocus: () => {
      // عند العودة بعد فترة طويلة، يمكن تحديث بعض البيانات الهامة
      // تم إزالة إلغاء الاستعلامات لحل مشكلة عدم التحميل
    },
    onBlur: () => {
      // تم تعطيل إلغاء الاستعلامات لأنه كان يسبب مشكلة عدم التحميل عند التنقل
      // الآن React Query سيدير الطلبات بشكل صحيح
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
    
    // ✅ تم إلغاء مزامنة الفئات - البيانات تأتي الآن من AppInitializationContext
    // البيانات متوفرة مباشرة من استدعاء RPC واحد
    console.log('✅ [AppComponents] تم إلغاء syncCategoriesDataOnStartup - البيانات من AppInitializationContext');
    
    configureCrossDomainAuth();
    
    // تهيئة معالج أخطاء Supabase Auth
    import('../lib/supabase/authErrorHandler').then(({ setupAuthErrorFiltering }) => {
      setupAuthErrorFiltering();
    }).catch(console.warn);

    // تنظيف timeout عند إلغاء المكون
    return () => {
      if (removeLoadingTimeout) clearTimeout(removeLoadingTimeout);
    };
  }, [pageStartTime]);
};

// 🎨 مكون أساسي للتطبيق
export const AppCore = ({ children }: { children: React.ReactNode }) => {
  useAppInitialization();
  
  // كشف ما إذا كان التطبيق يعمل في Electron
  const isElectron = typeof window !== 'undefined' && 
    window.navigator && 
    window.navigator.userAgent && 
    window.navigator.userAgent.includes('Electron');
  
  // في Electron استخدم HashRouter لتفادي أخطاء file:///login
  // في المتصفح استخدم BrowserRouter كالعادة
  const Router = isElectron ? HashRouter : BrowserRouter;
  // في المتصفح، استخدم '/' كـ basename. في Electron (HashRouter) لا حاجة لbasename
  const basename = isElectron ? undefined : '/';
  
  return (
    <Router
      {...(basename ? { basename } : {})}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ThemeProvider>
        <StaffSessionProvider>
          <VirtualNumpadProvider>
            <TitlebarProvider>
              <SmartProviderWrapper>
                {/* Apple-like responsive shell wrapping all legacy content */}
                <div className="app-shell">
                  <div className="app-shell__content">
                    <TabFocusHandler>
                      {/* Inject our AppleShell here so we don't need to touch individual pages */}
                      <AppleShell>
                        {children}
                      </AppleShell>
                      <GlobalNumpadManager />
                    </TabFocusHandler>
                  </div>
                </div>
              </SmartProviderWrapper>
            </TitlebarProvider>
          </VirtualNumpadProvider>
        </StaffSessionProvider>
      </ThemeProvider>
    </Router>
  );
};
