/**
 * 🎯 Smart Provider Wrapper - Conditional Providers
 * مزودات شرطية محسنة حسب نوع الصفحة
 */

import React, { memo, ReactNode, useMemo, useEffect, useRef } from 'react';
import { PageType, ProviderConfig } from './types';

// Context Providers
import { TenantProvider } from '@/context/TenantContext';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardDataProvider } from '@/context/DashboardDataContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppsProvider } from '@/context/AppsContext';
import { OrganizationDataProvider } from '@/contexts/OrganizationDataContext';
import { ShopProvider } from "@/context/ShopContext";
import { StoreProvider } from "@/context/StoreContext";
import { SuperUnifiedDataProvider } from '@/context/SuperUnifiedDataContext';
import { UserProvider } from '@/context/UserContext';

// Subscription Data Refresher
import SubscriptionDataRefresher from '@/components/subscription/SubscriptionDataRefresher';

// Specialized Providers
import { ProductPageProvider } from '@/context/ProductPageContext';
import { StorePageProvider } from '@/context/StorePageContext';
import { ProductsPageProvider } from '@/context/ProductsPageContext';

// Shared Store Data Providers
import { 
  SharedStoreDataProvider, 
  MinimalSharedStoreDataProvider, 
  ProductPageSharedStoreDataProvider 
} from '@/context/SharedStoreDataContext';
import { 
  OptimizedSharedStoreDataProvider, 
  MinimalOptimizedSharedStoreDataProvider 
} from '@/context/OptimizedSharedStoreDataContext';
import { NotificationsProvider } from '@/context/NotificationsContext';

interface ConditionalProviderProps {
  children: ReactNode;
  config: ProviderConfig;
  pageType: PageType;
  pathname: string;
}

/**
 * 🔐 Auth & Tenant Providers - الطبقة الأساسية
 */
// 🔥 تحسين: استخدام React.memo مع مقارنة عميقة
const AuthTenantWrapper = memo<ConditionalProviderProps>(({ 
  children, 
  config, 
  pageType,
  pathname 
}) => {
  console.log('🚀 AuthTenantWrapper: بدء التهيئة', { pageType, pathname, config });
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastConfig = useRef(config);
  const lastPageType = useRef(pageType);
  const lastPathname = useRef(pathname);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  
  renderCount.current++;
  
  // تم إزالة منطق منع الرندر المفرط لتجنب مشاكل React hooks
  
  console.log('🔄 AuthTenantWrapper: render', {
    renderCount: renderCount.current,
    pageType,
    pathname,
    config
  });
  
  // تعيين العلم مبكراً قبل تركيب مزودات أخرى لتسريع قراراتها
  try {
    if (typeof window !== 'undefined') {
      (window as any).__PUBLIC_PRODUCT_PAGE__ = pageType === 'public-product';
    }
  } catch {}
  
  // وضع علامة عامة لتخفيف المصادقة في صفحات المنتج العامة
  useEffect(() => {
    try {
      (window as any).__PUBLIC_PRODUCT_PAGE__ = pageType === 'public-product';
      console.log('🏷️ AuthTenantWrapper: تعيين علامة الصفحة العامة', { 
        pageType, 
        isPublicProduct: pageType === 'public-product' 
      });
    } catch {}
  }, [pageType]);

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    
    // منع التشغيل المتوازي
    if (initializationPromiseRef.current) {
      return;
    }
    
    initializationPromiseRef.current = (async () => {
      try {
        isInitialized.current = true;
        console.log('✅ AuthTenantWrapper: تم التهيئة');
      } finally {
        initializationPromiseRef.current = null;
      }
    })();
  }, []);

  // 🔥 التحقق من التغييرات لتجنب إعادة الإنشاء
  const shouldRecreate = useMemo(() => {
    return (
      lastConfig.current !== config ||
      lastPageType.current !== pageType ||
      lastPathname.current !== pathname
    );
  }, [config, pageType, pathname]);

  // تحديث القيم المرجعية
  useEffect(() => {
    lastConfig.current = config;
    lastPageType.current = pageType;
    lastPathname.current = pathname;
  }, [config, pageType, pathname]);

  // 🔥 منع إعادة الإنشاء إذا لم تتغير البيانات
  if (!shouldRecreate && isInitialized.current) {
    console.log('⏭️ AuthTenantWrapper: تخطي إعادة الإنشاء - نفس البيانات');
    return (
      <AuthProvider>
        <UserProvider>
          <TenantProvider>
            <SubscriptionDataRefresher />
            {children}
          </TenantProvider>
        </UserProvider>
      </AuthProvider>
    );
  }

  console.log('🎨 AuthTenantWrapper: إرجاع المزودات', { 
    pageType, 
    pathname, 
    hasAuth: true, 
    hasTenant: true 
  });

  return (
    <AuthProvider>
      <UserProvider>
        <TenantProvider>
          <SubscriptionDataRefresher />
          {children}
        </TenantProvider>
      </UserProvider>
    </AuthProvider>
  );
}, (prevProps, nextProps) => {
  // 🔥 تحسين: مقارنة عميقة لمنع إعادة الإنشاء
  return (
    prevProps.children === nextProps.children &&
    prevProps.config === nextProps.config &&
    prevProps.pageType === nextProps.pageType &&
    prevProps.pathname === nextProps.pathname
  );
});

// 🔥 تحسين: إضافة displayName
AuthTenantWrapper.displayName = 'AuthTenantWrapper';

/**
 * 🗃️ Shared Store Data Provider - مُحسن حسب نوع الصفحة مع memoization
 */
const SharedStoreDataWrapper = memo<{
  children: ReactNode;
  pageType: PageType;
  pathname: string;
}>(({ children, pageType, pathname }) => {
  // 🔥 تحسين: تقليل console.log في الإنتاج
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 SharedStoreDataWrapper: بدء التهيئة', { pageType, pathname });
  }
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastPageType = useRef(pageType);
  const lastPathname = useRef(pathname);
  const lastProviderComponent = useRef<any>(null);
  
  // تحسين اختيار المزود مع useMemo والتحقق من التغييرات
  const ProviderComponent = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الحساب
    if (
      lastPageType.current === pageType &&
      lastPathname.current === pathname &&
      lastProviderComponent.current
    ) {
      // 🔥 إزالة console.log لتجنب التكرار
      return lastProviderComponent.current;
    }
    
    let component;
    switch (pageType) {
      case 'dashboard':
      case 'pos':
        // للوحة التحكم ونقطة البيع - استخدام المحسن
        if (pathname.includes('/dashboard/orders-v2')) {
          component = MinimalOptimizedSharedStoreDataProvider;
        } else {
          component = OptimizedSharedStoreDataProvider;
        }
        break;

      case 'public-product':
        // للمنتجات العامة - provider محسن للمنتجات
        component = ProductPageSharedStoreDataProvider;
        break;

      case 'landing':
      case 'thank-you':
      case 'auth':
        // للصفحات الخفيفة - أدنى حد
        component = MinimalSharedStoreDataProvider;
        break;

      default:
        // باقي الصفحات - provider عادي
        component = SharedStoreDataProvider;
        break;
    }
    
    // تحديث القيم المرجعية
    lastPageType.current = pageType;
    lastPathname.current = pathname;
    lastProviderComponent.current = component;
    
    // 🔥 إزالة console.log لتجنب التكرار
    
    return component;
  }, [pageType, pathname]);

  // 🔥 إزالة console.log لتجنب التكرار

  return (
    <ProviderComponent>
      {children}
    </ProviderComponent>
  );
});

SharedStoreDataWrapper.displayName = 'SharedStoreDataWrapper';

/**
 * 🔔 Notifications Provider - شرطي حسب نوع الصفحة والتكوين
 * يجب أن يكون بعد TenantProvider لأن useRealTimeNotifications يحتاج useTenant
 */
const NotificationsWrapper = memo<{
  children: ReactNode;
  pageType: PageType;
  config: ProviderConfig;
}>(({ children, pageType, config }) => {
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastPageType = useRef(pageType);
  const lastConfig = useRef(config);
  const lastNeedsNotifications = useRef<boolean | null>(null);
  
  // الصفحات التي تحتاج NotificationsProvider مع memoization
  const needsNotifications = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الحساب
    if (
      lastPageType.current === pageType &&
      lastConfig.current === config &&
      lastNeedsNotifications.current !== null
    ) {
      return lastNeedsNotifications.current;
    }
    
    const result = [
      'dashboard',
      'pos', 
      'call-center'
      // إزالة 'max-store' لأن النوتيفيكيشن لا يجب أن تكون في المتجر
    ].includes(pageType) || config.notifications;
    
    // تحديث القيم المرجعية
    lastPageType.current = pageType;
    lastConfig.current = config;
    lastNeedsNotifications.current = result;
    
    return result;
  }, [pageType, config]);

  if (needsNotifications) {
    return (
      <NotificationsProvider>
        {children}
      </NotificationsProvider>
    );
  }

  return <>{children}</>;
});

NotificationsWrapper.displayName = 'NotificationsWrapper';

/**
 * 🎯 Specialized Providers - مزودات متخصصة
 */
export const SpecializedProviders = memo<ConditionalProviderProps>(({ 
  children, 
  config 
}) => {
  console.log('🚀 SpecializedProviders: بدء التهيئة', { config });
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider composition
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      console.log('♻️ SpecializedProviders: استخدام المحتوى المحفوظ');
      return lastContent.current;
    }
    
    console.log('🔄 SpecializedProviders: إنشاء محتوى جديد', { config });
    
    let result = children;

    // Product Page Provider - للمنتجات
    if (config.productPage) {
      console.log('🎯 SpecializedProviders: إضافة ProductPageProvider');
      result = (
        <ProductPageProvider>
          {result}
        </ProductPageProvider>
      );
    }

    // Store Page Provider - لصفحات المتجر
    if (config.storePage) {
      console.log('🎯 SpecializedProviders: إضافة StorePageProvider');
      result = (
        <StorePageProvider>
          {result}
        </StorePageProvider>
      );
    }

    // Products Page Provider - لصفحة المنتجات المتعددة
    if (config.productsPage) {
      console.log('🎯 SpecializedProviders: إضافة ProductsPageProvider');
      result = (
        <ProductsPageProvider>
          {result}
        </ProductsPageProvider>
      );
    }
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;
    
    console.log('✅ SpecializedProviders: تم إنشاء المحتوى', {
      hasProductPage: config.productPage,
      hasStorePage: config.storePage,
      hasProductsPage: config.productsPage
    });
    
    return result;
  }, [config, children]);

  console.log('🎨 SpecializedProviders: إرجاع المحتوى', { config });

  return <>{content}</>;
});

SpecializedProviders.displayName = 'SpecializedProviders';

/**
 * 📊 Data Providers - مزودات البيانات الرئيسية
 */
export const DataProviders = memo<ConditionalProviderProps>(({ 
  children, 
  config 
}) => {
  console.log('🚀 DataProviders: بدء التهيئة', { config });
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider composition
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      console.log('♻️ DataProviders: استخدام المحتوى المحفوظ');
      return lastContent.current;
    }
    
    console.log('🔄 DataProviders: إنشاء محتوى جديد', { config });
    
    let result = children;

    // Super Unified Data Provider - الحل الموحد الشامل
    if (config.unifiedData) {
      console.log('🎯 DataProviders: إضافة SuperUnifiedDataProvider');
      result = (
        <SuperUnifiedDataProvider>
          {result}
        </SuperUnifiedDataProvider>
      );
    }

    // Organization Data Provider
    if (config.organizationData) {
      console.log('🎯 DataProviders: إضافة OrganizationDataProvider');
      result = (
        <OrganizationDataProvider>
          {result}
        </OrganizationDataProvider>
      );
    }

    // Dashboard Data Provider
    if (config.dashboard) {
      console.log('🎯 DataProviders: إضافة DashboardDataProvider');
      result = (
        <DashboardDataProvider>
          {result}
        </DashboardDataProvider>
      );
    }

    // Shared Store Data Provider - مطلوب لجميع صفحات المتجر
    console.log('🎯 DataProviders: إضافة SharedStoreDataWrapper');
    result = (
      <SharedStoreDataWrapper pageType="minimal" pathname="/">
        {result}
      </SharedStoreDataWrapper>
    );
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;
    
    console.log('✅ DataProviders: تم إنشاء المحتوى', {
      hasUnifiedData: config.unifiedData,
      hasOrganizationData: config.organizationData,
      hasDashboard: config.dashboard
    });
    
    return result;
  }, [config, children]);

  console.log('🎨 DataProviders: إرجاع المحتوى', { config });

  return <>{content}</>;
});

DataProviders.displayName = 'DataProviders';

/**
 * 🛒 Shop & Store Providers - مزودات المتجر
 */
export const ShopProviders = memo<ConditionalProviderProps>(({ 
  children, 
  config 
}) => {
  console.log('🚀 ShopProviders: بدء التهيئة', { config });
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider structure - يجب أن يكون دائماً موجوداً لتجنب مشاكل Hooks
  const content = useMemo(() => {
    // إذا لم يكن shop مفعل، إرجاع children مباشرة
    if (!config.shop) {
      console.log('⏭️ ShopProviders: تخطي - shop غير مفعل');
      return <>{children}</>;
    }
    
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      console.log('♻️ ShopProviders: استخدام المحتوى المحفوظ');
      return lastContent.current;
    }
    
    console.log('🔄 ShopProviders: إنشاء محتوى جديد');
    
    const result = (
      <ShopProvider>
        <StoreProvider>
          {children}
        </StoreProvider>
      </ShopProvider>
    );
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;
    
    console.log('✅ ShopProviders: تم إنشاء المحتوى');
    
    return result;
  }, [config, children]);

  console.log('🎨 ShopProviders: إرجاع المحتوى');

  return content;
});

ShopProviders.displayName = 'ShopProviders';

/**
 * 📱 Apps Provider - مزود التطبيقات
 */
export const AppsProviders = memo<ConditionalProviderProps>(({ 
  children, 
  config 
}) => {
  console.log('🚀 AppsProviders: بدء التهيئة', { config });
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider structure - يجب أن يكون دائماً موجوداً لتجنب مشاكل Hooks
  const content = useMemo(() => {
    // إذا لم تكن apps مفعلة، إرجاع children مباشرة
    if (!config.apps) {
      console.log('⏭️ AppsProviders: تخطي - apps غير مفعل');
      return <>{children}</>;
    }
    
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      console.log('♻️ AppsProviders: استخدام المحتوى المحفوظ');
      return lastContent.current;
    }
    
    console.log('🔄 AppsProviders: إنشاء محتوى جديد');
    
    const result = (
      <AppsProvider>
        {children}
      </AppsProvider>
    );
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;
    
    console.log('✅ AppsProviders: تم إنشاء المحتوى');
    
    return result;
  }, [config, children]);

  console.log('🎨 AppsProviders: إرجاع المحتوى');

  return content;
});

AppsProviders.displayName = 'AppsProviders';

/**
 * 🎨 Theme Provider - مزود الثيم
 */
export const ThemeProviderWrapper = memo<{ children: ReactNode }>(({ 
  children 
}) => {
  console.log('🚀 ThemeProviderWrapper: بدء التهيئة');
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastChildren = useRef(children);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider structure
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastChildren.current === children && lastContent.current) {
      console.log('♻️ ThemeProviderWrapper: استخدام المحتوى المحفوظ');
      return lastContent.current;
    }
    
    console.log('🔄 ThemeProviderWrapper: إنشاء محتوى جديد');
    
    const result = (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    );
    
    // تحديث القيم المرجعية
    lastChildren.current = children;
    lastContent.current = result;
    
    console.log('✅ ThemeProviderWrapper: تم إنشاء المحتوى');
    
    return result;
  }, [children]);

  console.log('🎨 ThemeProviderWrapper: إرجاع المحتوى');

  return content;
});

ThemeProviderWrapper.displayName = 'ThemeProviderWrapper';

/**
 * 🔄 Provider Composition - تركيب جميع المزودات
 */
export const ProviderComposition = memo<ConditionalProviderProps>(({ 
  children, 
  config, 
  pageType, 
  pathname 
}) => {
  console.log('🚀 ProviderComposition: بدء التهيئة', { pageType, pathname, config });
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastPageType = useRef(pageType);
  const lastPathname = useRef(pathname);
  const lastChildren = useRef(children);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider composition
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء غير الضرورية
    if (
      lastConfig.current === config &&
      lastPageType.current === pageType &&
      lastPathname.current === pathname &&
      lastChildren.current === children &&
      lastContent.current
    ) {
      console.log('♻️ ProviderComposition: استخدام المحتوى المحفوظ');
      return lastContent.current;
    }
    
    console.log('🔄 ProviderComposition: إنشاء محتوى جديد', {
      lastConfig: lastConfig.current,
      newConfig: config,
      lastPageType: lastPageType.current,
      newPageType: pageType,
      lastPathname: lastPathname.current,
      newPathname: pathname
    });
    
    const result = (
      <AuthTenantWrapper 
        config={config} 
        pageType={pageType} 
        pathname={pathname}
      >
        <SpecializedProviders config={config} pageType={pageType} pathname={pathname}>
          <DataProviders config={config} pageType={pageType} pathname={pathname}>
            <ShopProviders config={config} pageType={pageType} pathname={pathname}>
              <AppsProviders config={config} pageType={pageType} pathname={pathname}>
                <NotificationsWrapper config={config} pageType={pageType}>
                  <ThemeProviderWrapper>
                    {children}
                  </ThemeProviderWrapper>
                </NotificationsWrapper>
              </AppsProviders>
            </ShopProviders>
          </DataProviders>
        </SpecializedProviders>
      </AuthTenantWrapper>
    );
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastPageType.current = pageType;
    lastPathname.current = pathname;
    lastChildren.current = children;
    lastContent.current = result;
    
    console.log('✅ ProviderComposition: تم إنشاء المحتوى الجديد');
    return result;
  }, [config, pageType, pathname, children]);

  console.log('🎨 ProviderComposition: إرجاع المحتوى', { pageType, pathname });

  return content;
});

ProviderComposition.displayName = 'ProviderComposition';
