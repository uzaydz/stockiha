/**
 * 🎯 Smart Provider Wrapper - Conditional Providers
 * مزودات شرطية محسنة حسب نوع الصفحة
 */

import React, { memo, ReactNode, useMemo, useEffect, useRef } from 'react';
import { PageType, ProviderConfig } from './types';

// Context Providers
import { TenantProvider } from '@/context/TenantContext';
import { PublicTenantProvider } from '@/context/tenant/TenantProvider';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardDataProvider } from '@/context/DashboardDataContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppsProvider } from '@/context/AppsContext';
import { OrganizationDataProvider } from '@/contexts/OrganizationDataContext';
// Removed store-related providers
import { SuperUnifiedDataProvider } from '@/context/SuperUnifiedDataContext';
import { UserProvider } from '@/context/UserContext';
import { PermissionsProvider } from '@/context/PermissionsContext';

// Subscription Data Refresher
import SubscriptionDataRefresher from '@/components/subscription/SubscriptionDataRefresher';

// Specialized Providers - Removed store-related providers

// Removed Shared Store Data Providers - not needed for admin-only
import { NotificationsProvider } from '@/context/NotificationsContext';
import { ShopProvider } from '@/context/ShopContext';

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
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastConfig = useRef(config);
  const lastPageType = useRef(pageType);
  const lastPathname = useRef(pathname);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  
  renderCount.current++;
  
  // تم إزالة منطق منع الرندر المفرط لتجنب مشاكل React hooks

  // Removed store-related page type detection

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

  // مُنشئ تركيبة المزودات بناءً على التكوين (لتخفيف التغليف)
  const buildAuthTenantTree = (cfg: ProviderConfig, node: React.ReactNode) => {
    let result = node;
    const needsRefresher = cfg.apps || cfg.notifications || pageType === 'dashboard' || pageType === 'pos' || pageType === 'pos-orders';
    const needsPermissions = pageType === 'dashboard' || pageType === 'call-center' || pageType === 'pos' || pageType === 'pos-orders';
    const hasDomPreload = (() => {
      try {
        if (typeof document === 'undefined') return false;
        return !!document.getElementById('__PRELOADED_PRODUCT__');
      } catch { return false; }
    })();

    if (cfg.tenant) {
      // ضع SubscriptionDataRefresher داخل TenantProvider لضمان توفر TenantContext
      const withRefresher = (
        <>
          {result}
          {needsRefresher ? <SubscriptionDataRefresher /> : null}
        </>
      );

      // Use TenantProvider for all admin pages
      result = (
        <TenantProvider>
          {withRefresher}
        </TenantProvider>
      );
    }

    if (needsPermissions) {
      result = (
        <PermissionsProvider>
          {result}
        </PermissionsProvider>
      );
    }

    // Always attach Auth for admin pages
    if (cfg.auth) {
      result = (
        <AuthProvider>
          <UserProvider>
            {result}
          </UserProvider>
        </AuthProvider>
      );
    }

    return result;
  };

  // 🔥 منع إعادة الإنشاء إذا لم تتغير البيانات
  if (!shouldRecreate && isInitialized.current) {
    return buildAuthTenantTree(lastConfig.current, children);
  }

  return buildAuthTenantTree(config, children);
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

// Removed SharedStoreDataWrapper - not needed for admin-only

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
    // تخطّي النوتيفيكيشن في محرر المتجر لتفادي أي جلب إضافي
    try {
      if (typeof window !== 'undefined') {
        const pathname = (window.location.hash && window.location.hash.startsWith('#/'))
          ? window.location.hash.slice(1)
          : window.location.pathname;
        if (pathname.startsWith('/dashboard/store-editor')) {
          return false;
        }
      }
    } catch {}

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

    // Shop Provider - مطلوب لصفحات POS
    if (config.shop) {
      result = (
        <ShopProvider>
          {result}
        </ShopProvider>
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

    // Removed Shared Store Data Provider - not needed for admin-only
    
    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastContent.current = result;

    return result;
  }, [config, children]);

  return <>{content}</>;
});

DataProviders.displayName = 'DataProviders';

// Removed ShopProviders - not needed for admin-only

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
  
  // 🔥 Memoized provider structure - يجب أن يكون دائماً موجوداً لتجنب مشاكل Hooks
  const content = useMemo(() => {
    // إذا لم تكن apps مفعلة، إرجاع children مباشرة
    if (!config.apps) {
      return <>{children}</>;
    }
    
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
export const ThemeProviderWrapper = memo<{ children: ReactNode; pageType?: PageType }>(({ 
  children,
  pageType 
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

    // للصفحة الرئيسية (landing)، لا نحتاج إلى ThemeProvider
    if (pageType === 'landing') {
      return children;
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
  }, [children, pageType]);

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
    // التحقق من التغييرات لتجنب إعادة الإنشاء غير الضرورية
    if (
      lastConfig.current === config &&
      lastPageType.current === pageType &&
      lastPathname.current === pathname &&
      lastChildren.current === children &&
      lastContent.current
    ) {
      return lastContent.current;
    }

    // للصفحة الرئيسية (landing)، لا نحتاج إلى أي providers
    if (pageType === 'landing') {
      return children;
    }

    const result = (
      <AuthTenantWrapper 
        config={config} 
        pageType={pageType} 
        pathname={pathname}
      >
        <SpecializedProviders config={config} pageType={pageType} pathname={pathname}>
          <DataProviders config={config} pageType={pageType} pathname={pathname}>
            <AppsProviders config={config} pageType={pageType} pathname={pathname}>
              <NotificationsWrapper config={config} pageType={pageType}>
                <ThemeProviderWrapper pageType={pageType}>
                  {children}
                </ThemeProviderWrapper>
              </NotificationsWrapper>
            </AppsProviders>
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
