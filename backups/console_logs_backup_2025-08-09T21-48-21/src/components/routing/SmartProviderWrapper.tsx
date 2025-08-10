import React, { ReactNode, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";

// Context Providers حسب الحاجة
import { TenantProvider } from '@/context/TenantContext';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardDataProvider } from '@/context/DashboardDataContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppsProvider } from '@/context/AppsContext';
import { OrganizationDataProvider } from '@/contexts/OrganizationDataContext';
import { LoadingControllerProvider } from '@/components/LoadingController';
import { ShopProvider } from "@/context/ShopContext";
import { StoreProvider } from "@/context/StoreContext";
import { SuperUnifiedDataProvider } from '@/context/SuperUnifiedDataContext';
import { SupabaseProvider } from "@/context/SupabaseContext";
import { NotificationsProvider } from '@/context/NotificationsContext';

// Context محسن للصفحات العامة
import { ProductPageProvider } from '@/context/ProductPageContext';
import { StorePageProvider } from '@/context/StorePageContext';
import { ProductsPageProvider } from '@/context/ProductsPageContext';

// المزودين الأساسيين الضروريين
import { UserProvider } from '@/context/UserContext';
import { SharedStoreDataProvider, MinimalSharedStoreDataProvider, ProductPageSharedStoreDataProvider } from '@/context/SharedStoreDataContext';
import { OptimizedSharedStoreDataProvider, MinimalOptimizedSharedStoreDataProvider } from '@/context/OptimizedSharedStoreDataContext';
import { GlobalLoadingProvider } from '@/components/store/GlobalLoadingManager';
import AppWrapper from '@/components/AppWrapper';

import queryClient from "@/lib/config/queryClient";
import i18n from '@/i18n';
import { applyFontsOptimized } from '@/utils/performanceOptimizer';

// 🚨 إضافة نظام تتبع الأداء والمشاكل
const PERFORMANCE_DEBUG = true; // تغيير إلى false في الإنتاج

interface SmartProviderWrapperProps {
  children: ReactNode;
}

// تعريف أنواع الصفحات والـ providers المطلوبة لكل نوع
type PageType = 
  | 'public-product' // صفحات المنتجات العامة
  | 'public-store'   // صفحات المتجر العامة
  | 'max-store'      // صفحة المتجر Max المحسنة
  | 'thank-you'      // صفحة الشكر خفيفة
  | 'auth'           // صفحات التسجيل/الدخول
  | 'dashboard'      // لوحة التحكم
  | 'pos'            // نقطة البيع
  | 'super-admin'    // الإدارة العليا
  | 'call-center'    // مركز الاتصال
  | 'landing'        // صفحات الهبوط
  | 'minimal';       // صفحات بسيطة أخرى

interface ProviderConfig {
  // Providers أساسية (مطلوبة دائماً)
  core: boolean;
  // Providers المصادقة
  auth: boolean;
  // Providers المؤسسة والمستأجر
  tenant: boolean;
  // Providers البيانات الشاملة (POS, Analytics, إلخ)
  unifiedData: boolean;
  // Providers بيانات المؤسسة
  organizationData: boolean;
  // Providers لوحة التحكم
  dashboard: boolean;
  // Providers المتجر والتسوق
  shop: boolean;
  // Providers التطبيقات
  apps: boolean;
  // Provider محسن للمنتجات فقط
  productPage: boolean;
  // Provider محسن لصفحات المتجر
  storePage?: boolean;
  // Provider محسن لصفحة المنتجات
  productsPage?: boolean;
}

// 🚨 مراقبة الأداء والمتكررات
const GLOBAL_WRAPPER_INSTANCES = new Map<string, boolean>();
const WRAPPER_RENDERED = new Set<string>();
const PERFORMANCE_METRICS = {
  totalRenders: 0,
  totalDuplicates: 0,
  averageTime: 0,
  warnings: [] as string[]
};

// 🔧 دالة تسجيل مشاكل الأداء
const logPerformanceIssue = (type: string, data: any) => {
  if (!PERFORMANCE_DEBUG) return;
  
  PERFORMANCE_METRICS.warnings.push(`${type}: ${JSON.stringify(data)}`);
};

// إعدادات محسنة للـ POS - فقط الضروري
const PROVIDER_CONFIGS: Record<PageType, ProviderConfig> = {
  'thank-you': {
    core: true,
    auth: true,     // نحتاج Tenant لتحديد المؤسسة إن وجد
    tenant: true,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },
  'public-product': {
    core: true,
    auth: true,   // ✅ مطلوب لـ TenantProvider (حتى لو كان guest)
    tenant: true,  // ✅ مطلوب لتحديد المؤسسة
    unifiedData: false,    // ❌ ثقيل جداً - نستخدم ProductPageProvider بدلاً منه
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: true, // ✅ فقط للمنتجات - بيانات خفيفة
  },
  'public-store': {
    core: true,
    auth: true,    // ✅ مطلوب لـ TenantProvider
    tenant: true,  // لتحديد المؤسسة
    unifiedData: false,    // ❌ تجنب تحميل SuperUnifiedDataProvider للصفحات العامة
    organizationData: false, // ❌ غير مطلوب - يسبب طلبات مكررة
    dashboard: false,
    shop: false,   // ❌ غير مطلوب - يسبب طلبات مكررة
    apps: false,
    productPage: false,
    productsPage: true, // ✅ مطلوب لتفعيل ProductsPageProvider لصفحة المنتجات
  },
  'max-store': {
    core: true,
    auth: true,    // ✅ مطلوب لـ TenantProvider
    tenant: true,   // ✅ نحتاج TenantContext لتحديد المؤسسة فقط
    unifiedData: false,    // ❌ ثقيل جداً - نستخدم providers خفيفة
    organizationData: false, // ❌ سنستخدم Providers محسنة بدلاً منه
    dashboard: false,
    shop: false,    // ❌ سنستخدم Providers محسنة بدلاً من ShopProvider الثقيل
    apps: false,
    productPage: true, // ✅ للمنتجات - بيانات خفيفة
    storePage: true, // ✅ نحتاج StorePageProvider للصفحة الرئيسية
    productsPage: true, // ✅ نحتاج ProductsPageProvider لصفحة المنتجات
  },
  'auth': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: false,    // ❌ تجنب تحميل بيانات غير ضرورية في صفحات المصادقة
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },
  'dashboard': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true,     // ✅ فقط SuperUnifiedDataProvider للحصول على جميع البيانات
    organizationData: false, // ❌ إزالة التكرار - البيانات موجودة في SuperUnifiedDataProvider
    dashboard: false,      // ❌ إزالة - البيانات موجودة في SuperUnifiedDataProvider  
    shop: false,          // ❌ إزالة - البيانات موجودة في SuperUnifiedDataProvider
    apps: true,           // ✅ مطلوب لـ repair-services في POS
    productPage: false,
  },
  'pos': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true, // ✅ مطلوب لـ POS لعرض التطبيقات في القائمة الجانبية
    organizationData: false, // غير مطلوب لـ POS
    dashboard: false, // غير مطلوب لـ POS
    shop: true, // ✅ مطلوب لـ POS - تم تصحيح الخطأ
    apps: true, // ✅ مطلوب لـ repair-services في POS
    productPage: false,
    storePage: false,
    productsPage: false,
  },
  'super-admin': {
    core: true,
    auth: true,
    tenant: false,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },
  'call-center': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true,  // مطلوب لبيانات الطلبات
    organizationData: true,  // ✅ مطلوب لبيانات العملاء والمنتجات
    dashboard: false,
    shop: false,
    apps: true,  // ✅ مطلوب لـ ConditionalRoute في call-center
    productPage: false,
  },
  'landing': {
    core: true,
    auth: true,    // ✅ مطلوب لـ TenantProvider
    tenant: true,  // لعرض معلومات المؤسسة
    unifiedData: false,    // ❌ تجنب تحميل بيانات المتجر في صفحات الهبوط
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },
  'minimal': {
    core: true,
    auth: false,
    tenant: false,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },
};

// Global deduplication system - للتتبع فقط (تم تعطيل منطق التكرار لتجنب مشاكل React)
// استخدام المتغيرات المُعرّفة بالأعلى بدلاً من إعادة التعريف

// إضافة cache للتحقق من التكرار
let lastRenderedPageType: PageType | null = null;
let lastRenderedPathname: string | null = null;

// دالة تحديد نوع الصفحة من المسار
const determinePageType = (pathname: string): PageType => {
  // تحسين: استخدام cache للتحقق من التكرار
  if (lastRenderedPathname === pathname && lastRenderedPageType) {
    return lastRenderedPageType;
  }

  // التحقق من صفحة المتجر Max أولاً
  // إذا كان هناك subdomain أو custom domain وهي الصفحة الرئيسية
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname.includes('localhost');
  
  // للـ localhost، نتحقق من وجود subdomain في الاسم
  const hasSubdomainLocalhost = isLocalhost && hostname.split('.').length > 1 && !hostname.startsWith('www.');
  // 🔧 إصلاح: استثناء www من اعتباره subdomain
  const hasSubdomain = !isLocalhost && hostname.split('.').length > 2 && !hostname.startsWith('www.');
  const isCustomDomain = !isLocalhost && !hostname.includes('stockiha.com') && !hostname.includes('ktobi.online');
  
  let pageType: PageType;

  // 🔧 إصلاح: إضافة التحقق من النطاقات العامة للمنصة
  const platformDomains = ['stockiha.com', 'www.stockiha.com', 'ktobi.online', 'www.ktobi.online'];
  const isPlatformDomain = platformDomains.includes(hostname);

  // 🔧 إصلاح: التحقق من نطاق المنصة أولاً
  if (isPlatformDomain) {
    if (pathname === '/') {
      pageType = 'landing';
    } else if (pathname.includes('/features') || pathname.includes('/pricing') || pathname.includes('/contact')) {
      pageType = 'landing';
    } else if (pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/forgot-password') || pathname.includes('/reset-password')) {
      pageType = 'auth';
    } else if (pathname === '/pos' || pathname === '/dashboard/pos-advanced') {
      pageType = 'pos';
    } else if (pathname.includes('/dashboard')) {
      pageType = 'dashboard';
    } else if (pathname.includes('/super-admin')) {
      pageType = 'super-admin';
    } else if (pathname.includes('/call-center')) {
      pageType = 'call-center';
    } else {
      pageType = 'minimal';
    }
  }
  // إذا كان المسار هو الصفحة الرئيسية وهناك subdomain أو custom domain = Max Store
  else if (pathname === '/' && (hasSubdomainLocalhost || hasSubdomain || isCustomDomain)) {
    pageType = 'max-store';
  }
  // صفحات المتجر العامة - تحقق من وجود subdomain أو custom domain
  else if (
    pathname === '/thank-you'
  ) {
    // صفحة الشكر دائماً خفيفة لتجنب استدعاءات المتجر العامة
    pageType = 'thank-you';
  }
  // صفحات شراء المنتجات مع subdomain
  else if (
    (pathname.includes('/product-purchase-max') ||
    pathname.includes('/product-max') ||
    pathname.includes('/product-public') ||
    pathname.match(/^\/products\/[^\/]+$/)) && // منتج واحد محدد
    (hasSubdomainLocalhost || hasSubdomain || isCustomDomain)
  ) {
    pageType = 'public-product';
  }
  // صفحات المتجر العامة مع subdomain أو custom domain (مثل /products و /category/...)
  else if (
    (hasSubdomainLocalhost || hasSubdomain || isCustomDomain) &&
    (
      pathname === '/products' ||
      pathname.includes('/category/') ||
      pathname.includes('/products/details/')
    )
  ) {
    pageType = 'public-store';
  }
  // 🔧 إصلاح: التعامل مع localhost بدون subdomain
  else if (isLocalhost) {
    // localhost بدون subdomain - يحتاج AuthProvider للوصول إلى /login و /dashboard
    if (pathname.includes('/login') || pathname.includes('/signup') || pathname.includes('/forgot-password') || pathname.includes('/reset-password')) {
      pageType = 'auth';
    } else if (pathname === '/pos' || pathname === '/dashboard/pos-advanced') {
      pageType = 'pos';
    } else if (pathname.includes('/dashboard')) {
      pageType = 'dashboard';
    } else if (pathname.includes('/super-admin')) {
      pageType = 'super-admin';
    } else if (pathname.includes('/call-center')) {
      pageType = 'call-center';
    } else {
      pageType = 'landing'; // بدلاً من minimal للحصول على AuthProvider
    }
  }
  // صفحات شراء المنتجات
  else if (
    pathname.includes('/product-purchase-max') ||
    pathname.includes('/product-max') ||
    pathname.includes('/product-public') ||
    pathname.match(/^\/products\/[^\/]+$/) // منتج واحد محدد
  ) {
    pageType = 'public-product';
  }
  // صفحات المتجر العامة - بدون subdomain
  else if (
    pathname === '/products' ||
    pathname.includes('/category/') ||
    pathname.includes('/products/details/')
  ) {
    pageType = 'public-store';
  }
  // الباقي صفحات بسيطة
  else {
    pageType = 'minimal';
  }

  // حفظ في cache
  lastRenderedPathname = pathname;
  lastRenderedPageType = pageType;
  
  return pageType;
};

// مكون الـ wrapper الذكي
export const SmartProviderWrapper: React.FC<SmartProviderWrapperProps> = ({ children }) => {
  const location = useLocation();
  
  // 🚨 تتبع الأداء - بداية
  const wrapperStartTime = performance.now();
  PERFORMANCE_METRICS.totalRenders++;
  
  // منع تشغيل متعدد لنفس المسار - تحسين
  const instanceKey = `wrapper-${location.pathname}-${location.search}`;
  
  // تحسين: منع إعادة الإنشاء إذا كان نفس المسار
  const isAlreadyRendered = WRAPPER_RENDERED.has(instanceKey);
  
  // 🚨 تتبع التكرارات
  if (isAlreadyRendered) {
    PERFORMANCE_METRICS.totalDuplicates++;
    logPerformanceIssue('DUPLICATE_WRAPPER_RENDER', {
      instanceKey,
      pathname: location.pathname,
      search: location.search,
      totalDuplicates: PERFORMANCE_METRICS.totalDuplicates,
      message: 'تم تشغيل الـ wrapper مرتين لنفس المسار - مشكلة أداء'
    });
  }
  
  // ✅ تم تبسيط المنطق لتجنب مشاكل Rules of Hooks
  useEffect(() => {
    const effectStart = performance.now();
    
    // 🚨 تتبع useEffect
    
    // تسجيل الـ instance للتتبع فقط
    GLOBAL_WRAPPER_INSTANCES.set(instanceKey, true);
    WRAPPER_RENDERED.add(instanceKey);
    
    const effectEnd = performance.now();
    
    // 🚨 تتبع مدة useEffect
    const effectDuration = effectEnd - effectStart;
    if (effectDuration > 5) { // إذا كان useEffect يستغرق أكثر من 5ms
      logPerformanceIssue('SLOW_USEEFFECT', {
        duration: effectDuration,
        instanceKey,
        pathname: location.pathname
      });
    }

    // تنظيف عند الإلغاء
    return () => {
      GLOBAL_WRAPPER_INSTANCES.delete(instanceKey);
      // لا نحذف من WRAPPER_RENDERED للاحتفاظ بالcache
    };
  }, [instanceKey]);
  
  // تحديد نوع الصفحة والـ providers المطلوبة - تحسين مع cache
  const { pageType, config } = useMemo(() => {
    const pageTypeStart = performance.now();
    
    const type = determinePageType(location.pathname);
    const pageConfig = PROVIDER_CONFIGS[type];
    
    const pageTypeEnd = performance.now();
    const pageTypeDuration = pageTypeEnd - pageTypeStart;
    
    // 🚨 تتبع تحديد نوع الصفحة
    
    // تحذير إذا كان تحديد النوع بطيئاً
    if (pageTypeDuration > 10) {
      logPerformanceIssue('SLOW_PAGE_TYPE_DETERMINATION', {
        duration: pageTypeDuration,
        pathname: location.pathname,
        pageType: type
      });
    }
    
    return { pageType: type, config: pageConfig };
  }, [location.pathname, location.search, isAlreadyRendered]);

  // 🎨 تطبيق الخطوط عند تغيير المسار (محسن لتجنب reflow) - فقط عند الحاجة
  useEffect(() => {
    if (!isAlreadyRendered) {
      const fontStart = performance.now();
      
      // استخدام الدالة المحسنة
      const timeout = setTimeout(() => {
        applyFontsOptimized();
        
        const fontEnd = performance.now();
      }, 50);
      
      return () => clearTimeout(timeout);
    } else {
    }
  }, [location.pathname, isAlreadyRendered]);

  // 🔥 تحسين: استخدام useMemo لمنع إعادة إنشاء الـ providers
  const wrappedContent = useMemo(() => {
    const providersStart = performance.now();
    
    // 🚨 تتبع إنشاء الـ providers
    
    let content = children;

    // 🔧 جميع Providers التي تتطلب React Query يجب أن تكون داخل Core providers

    // Core providers (دائماً مطلوبة) - يجب أن تكون الأولى
    if (config.core) {
      
      // Product Page provider (محسن للمنتجات) - داخل QueryClientProvider
      if (config.productPage) {
        // استخراج معلومات المؤسسة من URL
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const isLocalhost = hostname.includes('localhost');
        
        // تحسين: تحديد subdomain و hostname بشكل صحيح
        let subdomain = null;
        let customDomain = null;
        
        if (isLocalhost) {
          // للـ localhost: البحث عن subdomain في الاسم
          if (hostname.split('.').length > 1) {
            subdomain = hostname.split('.')[0];
          }
        } else {
          // للـ production: التحقق من نوع الدومين
          if (hostname.includes('stockiha.com') || hostname.includes('ktobi.online')) {
            // subdomain.stockiha.com أو subdomain.ktobi.online
            const parts = hostname.split('.');
            if (parts.length > 2 && parts[0] !== 'www') {
              subdomain = parts[0];
            }
          } else {
            // custom domain
            customDomain = hostname;
          }
        }

        content = (
          <ProductPageProvider>
            {content}
          </ProductPageProvider>
        );
      }

      // Store Page provider (محسن لصفحات المتجر) - داخل QueryClientProvider
      if (config.storePage) {
        content = (
          <StorePageProvider>
            {content}
          </StorePageProvider>
        );
      }

      // Products Page provider (محسن لصفحة المنتجات) - داخل QueryClientProvider
      if (config.productsPage) {
        content = (
          <ProductsPageProvider>
            {content}
          </ProductsPageProvider>
        );
      }

      // جميع Providers التي تستخدم React Query - داخل القائمة الرئيسية
      
      // Auth و Tenant providers تم تطبيقهم بالفعل في النظام الأساسي أعلاه
      // لذا نقوم بتعطيلهم هنا لتجنب التكرار

      // Super Unified Data provider (الحل الموحد الجديد - بدلاً من المتضاربة)
      if (config.unifiedData) {
        content = (
          <SuperUnifiedDataProvider>
            {content}
          </SuperUnifiedDataProvider>
        );
      }

      // Organization Data providers
      if (config.organizationData) {
        content = <OrganizationDataProvider>{content}</OrganizationDataProvider>;
      }

      // Dashboard providers
      if (config.dashboard) {
        content = <DashboardDataProvider>{content}</DashboardDataProvider>;
      }

      // Shop providers
      if (config.shop) {
        content = (
          <ShopProvider>
            <StoreProvider>
              {content}
            </StoreProvider>
          </ShopProvider>
        );
      }

      // Apps providers
      if (config.apps) {
        content = <AppsProvider>{content}</AppsProvider>;
      } else {
      }

      // تطبيق Core providers في الطبقة الخارجية
      // إصلاح ترتيب الـ providers - AuthProvider أولاً
      // ملاحظة: TenantProvider يحتاج دائماً إلى AuthProvider لذا تم تحديث التكوين لضمان ذلك
              // ملاحظة: تم تحسين NavbarLinks لتجنب التبعية على SuperUnifiedDataContext في الصفحات العامة
      // ملاحظة: POSOrdersOptimized يستخدم useOrdersData من UnifiedDataContext لذا تحتاج صفحة dashboard إلى organizationData: true
      content = (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <LoadingControllerProvider maxConcurrentRequests={3}>
              <SupabaseProvider>
                {/* AuthProvider يجب أن يكون أولاً */}
                {config.auth ? (
                  <AuthProvider>
                    {config.tenant ? (
                      <TenantProvider>
                        <UserProvider>
                                                  {/* للـ dashboard نحتاج OptimizedSharedStoreDataProvider لبعض الصفحات مثل Orders */}
                        {pageType === 'dashboard' || pageType === 'pos' ? (
                          location.pathname.includes('/dashboard/orders-v2') ? (
                            <MinimalOptimizedSharedStoreDataProvider>
                              <ThemeProviderWrapper>
                                <GlobalLoadingProvider>
                                  <NotificationsProvider>
                                    <AppWrapper>
                                      {content}
                                    </AppWrapper>
                                  </NotificationsProvider>
                                </GlobalLoadingProvider>
                              </ThemeProviderWrapper>
                            </MinimalOptimizedSharedStoreDataProvider>
                          ) : (
                            <OptimizedSharedStoreDataProvider>
                              <ThemeProviderWrapper>
                                <GlobalLoadingProvider>
                                  <NotificationsProvider>
                                    <AppWrapper>
                                      {content}
                                    </AppWrapper>
                                  </NotificationsProvider>
                                </GlobalLoadingProvider>
                              </ThemeProviderWrapper>
                            </OptimizedSharedStoreDataProvider>
                          )
                        ) : pageType === 'public-product' ? (
                          <ProductPageSharedStoreDataProvider>
                            <ThemeProviderWrapper>
                              <GlobalLoadingProvider>
                                <AppWrapper>
                                  {content}
                                </AppWrapper>
                              </GlobalLoadingProvider>
                            </ThemeProviderWrapper>
                          </ProductPageSharedStoreDataProvider>
                        ) : (
                          pageType === 'landing' || pageType === 'thank-you' ? (
                            <MinimalSharedStoreDataProvider>
                              <ThemeProviderWrapper>
                                <GlobalLoadingProvider>
                                  <AppWrapper>
                                    {content}
                                  </AppWrapper>
                                </GlobalLoadingProvider>
                              </ThemeProviderWrapper>
                            </MinimalSharedStoreDataProvider>
                          ) : (
                            <SharedStoreDataProvider>
                              <ThemeProviderWrapper>
                                <GlobalLoadingProvider>
                                  <AppWrapper>
                                    {content}
                                  </AppWrapper>
                                </GlobalLoadingProvider>
                              </ThemeProviderWrapper>
                            </SharedStoreDataProvider>
                          )
                        )}
                        </UserProvider>
                      </TenantProvider>
                    ) : (
                      <UserProvider>
                        {pageType === 'dashboard' || pageType === 'pos' ? (
                          <MinimalOptimizedSharedStoreDataProvider>
                            <ThemeProviderWrapper>
                              <GlobalLoadingProvider>
                                <AppWrapper>
                                  {content}
                                </AppWrapper>
                              </GlobalLoadingProvider>
                            </ThemeProviderWrapper>
                          </MinimalOptimizedSharedStoreDataProvider>
                        ) : pageType === 'public-product' ? (
                          <MinimalSharedStoreDataProvider>
                            <ThemeProviderWrapper>
                              <GlobalLoadingProvider>
                                <AppWrapper>
                                  {content}
                                </AppWrapper>
                              </GlobalLoadingProvider>
                            </ThemeProviderWrapper>
                          </MinimalSharedStoreDataProvider>
                        ) : (
                          <MinimalSharedStoreDataProvider>
                            <ThemeProviderWrapper>
                              <GlobalLoadingProvider>
                                <AppWrapper>
                                  {content}
                                </AppWrapper>
                              </GlobalLoadingProvider>
                            </ThemeProviderWrapper>
                          </MinimalSharedStoreDataProvider>
                        )}
                      </UserProvider>
                    )}
                  </AuthProvider>
                ) : (
                                  // للصفحات التي لا تحتاج مصادقة أو tenant
                pageType === 'dashboard' || pageType === 'pos' ? (
                  <MinimalOptimizedSharedStoreDataProvider>
                    <ThemeProviderWrapper>
                      <GlobalLoadingProvider>
                        <AppWrapper>
                          {content}
                        </AppWrapper>
                      </GlobalLoadingProvider>
                    </ThemeProviderWrapper>
                  </MinimalOptimizedSharedStoreDataProvider>
                ) : pageType === 'public-product' ? (
                  <MinimalSharedStoreDataProvider>
                    <ThemeProviderWrapper>
                      <GlobalLoadingProvider>
                        <AppWrapper>
                          {content}
                        </AppWrapper>
                      </GlobalLoadingProvider>
                    </ThemeProviderWrapper>
                  </MinimalSharedStoreDataProvider>
                ) : (
                  <MinimalSharedStoreDataProvider>
                    <ThemeProviderWrapper>
                      <GlobalLoadingProvider>
                        <AppWrapper>
                          {content}
                        </AppWrapper>
                      </GlobalLoadingProvider>
                    </ThemeProviderWrapper>
                    </MinimalSharedStoreDataProvider>
                  )
                )}
              </SupabaseProvider>
            </LoadingControllerProvider>
          </TooltipProvider>
        </QueryClientProvider>
      );

      // إضافة I18n و Helmet في النهاية
      content = (
        <I18nextProvider i18n={i18n}>
          <HelmetProvider>
            {content}
            <Toaster />
            <Sonner />
          </HelmetProvider>
        </I18nextProvider>
      );
    }

    const providersEnd = performance.now();
    const providersDuration = providersEnd - providersStart;

    // 🚨 تتبع مدة إنشاء الـ providers

    // تحذير إذا كان إنشاء الـ providers بطيئاً
    if (providersDuration > 50) {
      logPerformanceIssue('SLOW_PROVIDERS_CREATION', {
        duration: providersDuration,
        pageType,
        config,
        pathname: location.pathname
      });
    }

    return content;
  }, [
    children,
    config.core,
    config.productPage,
    config.storePage,
    config.productsPage,
    config.auth,
    config.tenant,
    config.unifiedData,
    config.organizationData,
    config.dashboard,
    config.shop,
    config.apps,
    pageType,
    location.pathname,
    location.search,
    isAlreadyRendered
  ]); // 🔥 تحسين dependencies لتجنب إعادة التحميل غير الضروري

  // 🚨 تتبع الأداء - نهاية
  const wrapperEndTime = performance.now();
  const totalWrapperDuration = wrapperEndTime - wrapperStartTime;
  
  // تحديث المقاييس العامة
  PERFORMANCE_METRICS.averageTime = 
    (PERFORMANCE_METRICS.averageTime * (PERFORMANCE_METRICS.totalRenders - 1) + totalWrapperDuration) / 
    PERFORMANCE_METRICS.totalRenders;

  // طباعة تقرير الأداء النهائي

  // تحذير إذا كان الـ wrapper بطيئاً جداً
  if (totalWrapperDuration > 100) {
    logPerformanceIssue('VERY_SLOW_WRAPPER', {
      duration: totalWrapperDuration,
      pageType,
      pathname: location.pathname,
      message: 'SmartProviderWrapper يستغرق وقتاً طويلاً - مشكلة أداء خطيرة'
    });
  }

  // إضافة معلومات الأداء إلى window للتشخيص
  if (typeof window !== 'undefined') {
    (window as any).smartWrapperPerformance = PERFORMANCE_METRICS;
  }

  return wrappedContent;
};

export default SmartProviderWrapper;

// ThemeProviderWrapper من main.tsx
const ThemeProviderWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);
