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
import { UnifiedDataProvider } from '@/context/UnifiedDataContext';
import { UniversalDataUpdateProvider } from '@/context/UniversalDataUpdateContext';
import { SupabaseProvider } from "@/context/SupabaseContext";

// Context محسن للصفحات العامة
import { ProductPageProvider } from '@/context/ProductPageContext';
import { StorePageProvider } from '@/context/StorePageContext';
import { ProductsPageProvider } from '@/context/ProductsPageContext';

import queryClient from "@/lib/config/queryClient";
import i18n from '@/i18n';
import { applyFontsOptimized } from '@/utils/performanceOptimizer';

interface SmartProviderWrapperProps {
  children: ReactNode;
}

// تعريف أنواع الصفحات والـ providers المطلوبة لكل نوع
type PageType = 
  | 'public-product' // صفحات المنتجات العامة
  | 'public-store'   // صفحات المتجر العامة
  | 'max-store'      // صفحة المتجر Max المحسنة
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
  // Provider الثيم (اختياري)
  theme?: boolean;
}

// إعدادات محسنة للـ POS - فقط الضروري
const PROVIDER_CONFIGS: Record<PageType, ProviderConfig> = {
  'public-product': {
    core: true,
    auth: false,
    tenant: false,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: true, // ✅ فقط للمنتجات
    theme: true, // ✅ مطلوب لتطبيق ثيم المؤسسة
  },
  'public-store': {
    core: true,
    auth: false,
    tenant: true,  // لتحديد المؤسسة
    unifiedData: false,
    organizationData: true, // للفئات والمنتجات
    dashboard: false,
    shop: true,
    apps: false,
    productPage: false,
    theme: true, // ✅ مطلوب لتطبيق ثيم المؤسسة
  },
  'max-store': {
    core: true,
    auth: false,
    tenant: true,   // ✅ نحتاج TenantContext لتحديد المؤسسة فقط
    unifiedData: false,
    organizationData: false, // ❌ سنستخدم Providers محسنة بدلاً منه
    dashboard: false,
    shop: false,    // ❌ سنستخدم Providers محسنة بدلاً من ShopProvider الثقيل
    apps: false,
    productPage: false,
    storePage: true, // ✅ نحتاج StorePageProvider للصفحة الرئيسية
    productsPage: true, // ✅ نحتاج ProductsPageProvider لصفحة المنتجات
    theme: true,    // ✅ نحتاج ThemeContext
  },
  'auth': {
    core: true,
    auth: true,
    tenant: false,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
    theme: true, // ✅ مطلوب لتطبيق الثيم المناسب
  },
  'dashboard': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true,  // ✅ كامل فقط للوحة التحكم
    organizationData: true,
    dashboard: true,
    shop: true,  // ✅ مطلوب لـ store-editor و معاينة المتجر
    apps: true,
    productPage: false,
  },
  'pos': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true,
    organizationData: false, // غير مطلوب لـ POS
    dashboard: false, // غير مطلوب لـ POS
    shop: true, // ✅ مطلوب لـ POS - تم تصحيح الخطأ
    apps: true, // مطلوب لـ POS
    productPage: false,
    storePage: false,
    productsPage: false,
    theme: true, // مطلوب لـ POS
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
    auth: false,
    tenant: true,  // لعرض معلومات المؤسسة
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
    theme: true, // ✅ مطلوب لتطبيق ثيم المؤسسة
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
const GLOBAL_WRAPPER_INSTANCES = new Map<string, boolean>();
const WRAPPER_RENDERED = new Set<string>();

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
  const hasSubdomain = !isLocalhost && hostname.split('.').length > 2;
  const isCustomDomain = !isLocalhost && !hostname.includes('stockiha.com') && !hostname.includes('ktobi.online');
  
  let pageType: PageType;

  // إذا كان المسار هو الصفحة الرئيسية وهناك subdomain أو custom domain = Max Store
  if (pathname === '/' && (hasSubdomainLocalhost || hasSubdomain || isCustomDomain)) {
    console.log('🎯 تم تحديد صفحة Max Store:', { hostname, hasSubdomainLocalhost, hasSubdomain, isCustomDomain });
    pageType = 'max-store';
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
  // صفحات المتجر العامة - تحقق من وجود subdomain أو custom domain
  else if (
    pathname === '/products' ||
    pathname.includes('/category/') ||
    pathname.includes('/products/details/') ||
    pathname === '/' && !pathname.includes('/dashboard')
  ) {
    // إذا كان هناك subdomain أو custom domain، استخدم max-store
    if (hasSubdomainLocalhost || hasSubdomain || isCustomDomain) {
      console.log('🎯 تم تحديد صفحة Max Store للمسار:', pathname, { hostname, hasSubdomainLocalhost, hasSubdomain, isCustomDomain });
      pageType = 'max-store';
    } else {
      pageType = 'public-store';
    }
  }
  // صفحات المصادقة
  else if (
    pathname.includes('/login') ||
    pathname.includes('/signup') ||
    pathname.includes('/admin/signup') ||
    pathname.includes('/tenant/signup')
  ) {
    pageType = 'auth';
  }
  // الإدارة العليا
  else if (pathname.includes('/super-admin')) {
    pageType = 'super-admin';
  }
  // مركز الاتصال
  else if (pathname.includes('/call-center')) {
    pageType = 'call-center';
  }
  // نقطة البيع - يجب أن يكون قبل dashboard
  else if (pathname === '/pos' || pathname === '/dashboard/pos') {
    pageType = 'pos';
  }
  // لوحة التحكم (بعد التحقق من POS)
  else if (pathname.includes('/dashboard')) {
    pageType = 'dashboard';
  }
  // صفحات الهبوط
  else if (
    pathname.includes('/features') ||
    pathname.includes('/pricing') ||
    pathname.includes('/contact') ||
    pathname.match(/^\/[^\/]+$/) // صفحة هبوط مخصصة
  ) {
    pageType = 'landing';
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
  
  // تتبع الأداء - بداية
  const wrapperStartTime = performance.now();
  console.log('🎯 [PERFORMANCE] بداية SmartProviderWrapper:', {
    pathname: location.pathname,
    search: location.search,
    timestamp: new Date().toISOString(),
    startTime: wrapperStartTime
  });
  
  // منع تشغيل متعدد لنفس المسار - تحسين
  const instanceKey = `wrapper-${location.pathname}-${location.search}`;
  
  // تحسين: منع إعادة الإنشاء إذا كان نفس المسار
  const isAlreadyRendered = WRAPPER_RENDERED.has(instanceKey);
  
  if (isAlreadyRendered) {
    console.warn('⚠️ [PERFORMANCE] تكرار في SmartProviderWrapper - نفس المسار:', {
      instanceKey,
      pathname: location.pathname,
      'مشكلة': 'تم تشغيل الـ wrapper مرتين لنفس المسار'
    });
  }
  
  // ✅ تم تبسيط المنطق لتجنب مشاكل Rules of Hooks
  useEffect(() => {
    const effectStart = performance.now();
    console.log('🔄 [PERFORMANCE] useEffect SmartProviderWrapper:', {
      instanceKey,
      effectStart
    });
    
    // تسجيل الـ instance للتتبع فقط
    GLOBAL_WRAPPER_INSTANCES.set(instanceKey, true);
    WRAPPER_RENDERED.add(instanceKey);
    
    const effectEnd = performance.now();
    console.log('✅ [PERFORMANCE] انتهاء useEffect SmartProviderWrapper:', {
      duration: (effectEnd - effectStart) / 1000,
      'وقت التأثير بالثواني': (effectEnd - effectStart) / 1000
    });
    
    // تنظيف عند الإلغاء
    return () => {
      console.log('🧹 [PERFORMANCE] تنظيف SmartProviderWrapper:', instanceKey);
      GLOBAL_WRAPPER_INSTANCES.delete(instanceKey);
      // لا نحذف من WRAPPER_RENDERED للاحتفاظ بالcache
    };
  }, [instanceKey]);
  
  // تحديد نوع الصفحة والـ providers المطلوبة - تحسين مع cache
  const { pageType, config } = useMemo(() => {
    const pageTypeStart = performance.now();
    console.log('🔍 [PERFORMANCE] بداية تحديد نوع الصفحة:', {
      pathname: location.pathname,
      pageTypeStart
    });
    
    const type = determinePageType(location.pathname);
    const pageConfig = PROVIDER_CONFIGS[type];
    
    const pageTypeEnd = performance.now();
    
    // تقليل الطباعة إذا كان نفس النوع
    if (!isAlreadyRendered) {
      console.log('📄 [PERFORMANCE] نوع الصفحة المحدد:', {
        type,
        pathname: location.pathname,
        config: pageConfig,
        duration: (pageTypeEnd - pageTypeStart) / 1000,
        'وقت التحديد بالثواني': (pageTypeEnd - pageTypeStart) / 1000
      });
    } else {
      console.log('⏭️ [PERFORMANCE] تجاهل طباعة نوع الصفحة - تم تشغيلها مسبقاً');
    }
    
    return { pageType: type, config: pageConfig };
  }, [location.pathname, location.search, isAlreadyRendered]);

  // 🎨 تطبيق الخطوط عند تغيير المسار (محسن لتجنب reflow) - فقط عند الحاجة
  useEffect(() => {
    if (!isAlreadyRendered) {
      const fontStart = performance.now();
      console.log('🎨 [PERFORMANCE] بداية تطبيق الخطوط:', {
        pathname: location.pathname,
        fontStart
      });
      
      // استخدام الدالة المحسنة
      const timeout = setTimeout(() => {
        applyFontsOptimized();
        
        const fontEnd = performance.now();
        console.log('✅ [PERFORMANCE] انتهاء تطبيق الخطوط:', {
          duration: (fontEnd - fontStart) / 1000,
          'وقت تطبيق الخطوط بالثواني': (fontEnd - fontStart) / 1000
        });
      }, 50);
      
      return () => clearTimeout(timeout);
    } else {
      console.log('⏭️ [PERFORMANCE] تجاهل تطبيق الخطوط - تم تطبيقها مسبقاً');
    }
  }, [location.pathname, isAlreadyRendered]);

  // 🔥 تحسين: استخدام useMemo لمنع إعادة إنشاء الـ providers
  const wrappedContent = useMemo(() => {
    const providersStart = performance.now();
    console.log('🏗️ [PERFORMANCE] بداية إنشاء الـ providers:', {
      pageType,
      config,
      providersStart
    });
    
    let content = children;

    // 🔧 جميع Providers التي تتطلب React Query يجب أن تكون داخل Core providers

    // Core providers (دائماً مطلوبة) - يجب أن تكون الأولى
    if (config.core) {
      console.log('🔧 [PERFORMANCE] تفعيل Core providers');
      
      // Product Page provider (محسن للمنتجات) - داخل QueryClientProvider
      if (config.productPage) {
        console.log('🛍️ [PERFORMANCE] تفعيل ProductPageProvider');
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
          <ProductPageProvider
            subdomain={subdomain}
            hostname={customDomain}
          >
            {content}
          </ProductPageProvider>
        );
      }

      // Store Page provider (محسن لصفحات المتجر) - داخل QueryClientProvider
      if (config.storePage) {
        console.log('🏪 [PERFORMANCE] تفعيل StorePageProvider للصفحة:', pageType);
        content = (
          <StorePageProvider>
            {content}
          </StorePageProvider>
        );
      }

      // Products Page provider (محسن لصفحة المنتجات) - داخل QueryClientProvider
      if (config.productsPage) {
        console.log('🛍️ [PERFORMANCE] تفعيل ProductsPageProvider للصفحة:', pageType);
        content = (
          <ProductsPageProvider>
            {content}
          </ProductsPageProvider>
        );
      }

      // جميع Providers التي تستخدم React Query - داخل QueryClientProvider
      
      // Auth providers
      if (config.auth) {
        console.log('🔐 [PERFORMANCE] تفعيل AuthProvider للصفحة:', pageType);
        content = <AuthProvider>{content}</AuthProvider>;
      }

      // Tenant providers - يجب أن يكون مبكراً لتحديد المؤسسة
      if (config.tenant) {
        console.log('🏢 [PERFORMANCE] تفعيل TenantProvider للصفحة:', pageType);
        content = <TenantProvider>{content}</TenantProvider>;
      } else {
        console.log('❌ [PERFORMANCE] تجاهل TenantProvider للصفحة:', pageType);
      }

      // Unified Data providers (الثقيلة - فقط عند الضرورة)
      if (config.unifiedData) {
        console.log('🔗 [PERFORMANCE] تفعيل UnifiedDataProvider للصفحة:', pageType);
        content = (
          <UnifiedDataProvider>
            <UniversalDataUpdateProvider>
              {content}
            </UniversalDataUpdateProvider>
          </UnifiedDataProvider>
        );
      }

      // Organization Data providers
      if (config.organizationData) {
        console.log('🏛️ [PERFORMANCE] تفعيل OrganizationDataProvider للصفحة:', pageType);
        content = <OrganizationDataProvider>{content}</OrganizationDataProvider>;
      }

      // Dashboard providers
      if (config.dashboard) {
        content = <DashboardDataProvider>{content}</DashboardDataProvider>;
      }

      // Shop providers
      if (config.shop) {
        console.log('�� [PERFORMANCE] تفعيل ShopProvider للصفحة:', pageType);
        content = (
          <ShopProvider>
            <StoreProvider>
              {content}
            </StoreProvider>
          </ShopProvider>
        );
      } else {
        console.log('❌ [PERFORMANCE] تجاهل ShopProvider للصفحة:', pageType);
      }

      // Apps providers
      if (config.apps) {
        content = <AppsProvider>{content}</AppsProvider>;
      }

      // تطبيق Core providers في الطبقة الخارجية
      // Theme Provider - يُطبق مبكراً لتجنب التأخير في الثيم
      if (config.theme) {
        console.log('🎨 [PERFORMANCE] تفعيل ThemeProvider للصفحة:', pageType);
        content = (
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <LoadingControllerProvider maxConcurrentRequests={3}>
                <SupabaseProvider>
                  <ThemeProvider>
                    {content}
                  </ThemeProvider>
                </SupabaseProvider>
              </LoadingControllerProvider>
            </TooltipProvider>
          </QueryClientProvider>
        );
      } else {
        console.log('❌ [PERFORMANCE] تجاهل ThemeProvider للصفحة:', pageType);
        content = (
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <LoadingControllerProvider maxConcurrentRequests={3}>
                <SupabaseProvider>
                  {content}
                </SupabaseProvider>
              </LoadingControllerProvider>
            </TooltipProvider>
          </QueryClientProvider>
        );
      }

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
    console.log('✅ [PERFORMANCE] انتهاء إنشاء الـ providers:', {
      duration: (providersEnd - providersStart) / 1000,
      'وقت إنشاء الـ providers بالثواني': (providersEnd - providersStart) / 1000
    });

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
    config.theme,
    pageType,
    location.pathname,
    location.search,
    isAlreadyRendered
  ]); // 🔥 تحسين dependencies لتجنب إعادة التحميل غير الضروري

  // تتبع الأداء - نهاية
  const wrapperEndTime = performance.now();
  console.log('🏁 [PERFORMANCE] انتهاء SmartProviderWrapper:', {
    totalDuration: (wrapperEndTime - wrapperStartTime) / 1000,
    'إجمالي وقت الـ wrapper بالثواني': (wrapperEndTime - wrapperStartTime) / 1000,
    pageType,
    pathname: location.pathname,
    isAlreadyRendered
  });

  return wrappedContent;
};

export default SmartProviderWrapper;
