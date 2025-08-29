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
export const AuthTenantWrapper = memo<ConditionalProviderProps>(({ 
  children, 
  config, 
  pageType,
  pathname 
}) => {
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastConfig = useRef(config);
  const lastPageType = useRef(pageType);
  const lastPathname = useRef(pathname);
  
  renderCount.current++;
  
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
    } catch {}
  }, [pageType]);

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
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
    if (shouldRecreate) {
      lastConfig.current = config;
      lastPageType.current = pageType;
      lastPathname.current = pathname;
    }
  }, [shouldRecreate, config, pageType, pathname]);

  if (!config.auth) {
    return <>{children}</>;
  }

  // 🔥 Memoized provider structure
  const providerStructure = useMemo(() => {
    if (config.tenant) {
      return (
        <AuthProvider>
          <TenantProvider>
            <UserProvider>
              <NotificationsWrapper pageType={pageType} config={config}>
                <SharedStoreDataWrapper pageType={pageType} pathname={pathname}>
                  {children}
                </SharedStoreDataWrapper>
              </NotificationsWrapper>
            </UserProvider>
          </TenantProvider>
        </AuthProvider>
      );
    } else {
      return (
        <AuthProvider>
          <UserProvider>
            <NotificationsWrapper pageType={pageType} config={config}>
              <SharedStoreDataWrapper pageType={pageType} pathname={pathname}>
                {children}
              </SharedStoreDataWrapper>
            </NotificationsWrapper>
          </UserProvider>
        </AuthProvider>
      );
    }
  }, [config.tenant, pageType, pathname, children, config]);

  return providerStructure;
});

AuthTenantWrapper.displayName = 'AuthTenantWrapper';

/**
 * 🗃️ Shared Store Data Provider - مُحسن حسب نوع الصفحة مع memoization
 */
const SharedStoreDataWrapper = memo<{
  children: ReactNode;
  pageType: PageType;
  pathname: string;
}>(({ children, pageType, pathname }) => {
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
    
    return component;
  }, [pageType, pathname]);

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
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider composition
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      return lastContent.current;
    }
    
    let result = children;

    // Product Page Provider - للمنتجات
    if (config.productPage) {
      result = (
        <ProductPageProvider>
          {result}
        </ProductPageProvider>
      );
    }

    // Store Page Provider - لصفحات المتجر
    if (config.storePage) {
      result = (
        <StorePageProvider>
          {result}
        </StorePageProvider>
      );
    }

    // Products Page Provider - لصفحة المنتجات المتعددة
    if (config.productsPage) {
      result = (
        <ProductsPageProvider>
          {result}
        </ProductsPageProvider>
      );
    }
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;
    
    return result;
  }, [config, children]);

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
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider composition
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      return lastContent.current;
    }
    
    let result = children;

    // Super Unified Data Provider - الحل الموحد الشامل
    if (config.unifiedData) {
      result = (
        <SuperUnifiedDataProvider>
          {result}
        </SuperUnifiedDataProvider>
      );
    }

    // Organization Data Provider
    if (config.organizationData) {
      result = (
        <OrganizationDataProvider>
          {result}
        </OrganizationDataProvider>
      );
    }

    // Dashboard Data Provider
    if (config.dashboard) {
      result = (
        <DashboardDataProvider>
          {result}
        </DashboardDataProvider>
      );
    }
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;
    
    return result;
  }, [config, children]);

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
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  if (!config.shop) {
    return <>{children}</>;
  }

  // 🔥 Memoized provider structure
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      return lastContent.current;
    }
    
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
    
    return result;
  }, [config, children]);

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
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastContent = useRef<ReactNode>(null);
  
  if (!config.apps) {
    return <>{children}</>;
  }

  // 🔥 Memoized provider structure
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastConfig.current === config && lastContent.current) {
      return lastContent.current;
    }
    
    const result = (
      <AppsProvider>
        {children}
      </AppsProvider>
    );
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;
    
    return result;
  }, [config, children]);

  return content;
});

AppsProviders.displayName = 'AppsProviders';

/**
 * 🎨 Theme Provider - مزود الثيم
 */
export const ThemeProviderWrapper = memo<{ children: ReactNode }>(({ 
  children 
}) => {
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastChildren = useRef(children);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider structure
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (lastChildren.current === children && lastContent.current) {
      return lastContent.current;
    }
    
    const result = (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    );
    
    // تحديث القيم المرجعية
    lastChildren.current = children;
    lastContent.current = result;
    
    return result;
  }, [children]);

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
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastConfig = useRef(config);
  const lastPageType = useRef(pageType);
  const lastPathname = useRef(pathname);
  const lastChildren = useRef(children);
  const lastContent = useRef<ReactNode>(null);
  
  // 🔥 Memoized provider composition
  const content = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء
    if (
      lastConfig.current === config &&
      lastPageType.current === pageType &&
      lastPathname.current === pathname &&
      lastChildren.current === children &&
      lastContent.current
    ) {
      return lastContent.current;
    }
    
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
                <ThemeProviderWrapper>
                  {children}
                </ThemeProviderWrapper>
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
    
    return result;
  }, [config, pageType, pathname, children]);

  return content;
});

ProviderComposition.displayName = 'ProviderComposition';
