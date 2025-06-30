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

import queryClient from "@/lib/config/queryClient";
import i18n from '@/i18n';

interface SmartProviderWrapperProps {
  children: ReactNode;
}

// تعريف أنواع الصفحات والـ providers المطلوبة لكل نوع
type PageType = 
  | 'public-product' // صفحات المنتجات العامة
  | 'public-store'   // صفحات المتجر العامة
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
}

// تكوين الـ providers لكل نوع صفحة
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
    unifiedData: true,  // ✅ مطلوب لنقطة البيع
    organizationData: true,
    dashboard: false,
    shop: true,  // ✅ مطلوب لـ ShopProvider في POS
    apps: true,  // ✅ مطلوب لـ ConditionalRoute في POS
    productPage: false,
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

// دالة تحديد نوع الصفحة من المسار
const determinePageType = (pathname: string): PageType => {
  // صفحات شراء المنتجات
  if (
    pathname.includes('/product-purchase-max') ||
    pathname.includes('/product-max') ||
    pathname.includes('/product-public') ||
    pathname.match(/^\/products\/[^\/]+$/) // منتج واحد محدد
  ) {
    return 'public-product';
  }

  // صفحات المتجر العامة
  if (
    pathname === '/products' ||
    pathname.includes('/category/') ||
    pathname.includes('/products/details/') ||
    pathname === '/' && !pathname.includes('/dashboard')
  ) {
    return 'public-store';
  }

  // صفحات المصادقة
  if (
    pathname.includes('/login') ||
    pathname.includes('/signup') ||
    pathname.includes('/admin/signup') ||
    pathname.includes('/tenant/signup')
  ) {
    return 'auth';
  }

  // الإدارة العليا
  if (pathname.includes('/super-admin')) {
    return 'super-admin';
  }

  // مركز الاتصال
  if (pathname.includes('/call-center')) {
    return 'call-center';
  }

  // نقطة البيع - يجب أن يكون قبل dashboard
  if (pathname === '/pos' || pathname === '/dashboard/pos') {
    return 'pos';
  }

  // لوحة التحكم (بعد التحقق من POS)
  if (pathname.includes('/dashboard')) {
    return 'dashboard';
  }

  // صفحات الهبوط
  if (
    pathname.includes('/features') ||
    pathname.includes('/pricing') ||
    pathname.includes('/contact') ||
    pathname.match(/^\/[^\/]+$/) // صفحة هبوط مخصصة
  ) {
    return 'landing';
  }

  // الباقي صفحات بسيطة
  return 'minimal';
};

// مكون الـ wrapper الذكي
export const SmartProviderWrapper: React.FC<SmartProviderWrapperProps> = ({ children }) => {
  const location = useLocation();
  
  // تحديد نوع الصفحة والـ providers المطلوبة
  const pageType = useMemo(() => determinePageType(location.pathname), [location.pathname]);
  const config = PROVIDER_CONFIGS[pageType];
  
  // لوغ في وضع التطوير مع debouncing لتجنب الطباعة المفرطة
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const timeoutId = setTimeout(() => {
        console.log(`🔧 SmartProvider: ${location.pathname} → ${pageType}`, config);
      }, 100); // تأخير 100ms لتجميع الطلبات المتتالية
      
      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, pageType, config]);

  // بناء الـ providers layer by layer
  let content = children;

  // 🔧 جميع Providers التي تتطلب React Query يجب أن تكون داخل Core providers

  // Core providers (دائماً مطلوبة) - يجب أن تكون الأولى
  if (config.core) {
    // Product Page provider (محسن للمنتجات) - داخل QueryClientProvider
    if (config.productPage) {
      // استخراج معلومات المؤسسة من URL
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalhost = hostname.includes('localhost');
      const subdomain = isLocalhost ? hostname.split('.')[0] : null;
      const customDomain = !isLocalhost ? hostname : null;

      content = (
        <ProductPageProvider
          subdomain={subdomain || undefined}
          hostname={customDomain || undefined}
        >
          {content}
        </ProductPageProvider>
      );
    }

    // جميع Providers التي تستخدم React Query - داخل QueryClientProvider
    
    // Auth providers
    if (config.auth) {
      content = <AuthProvider>{content}</AuthProvider>;
    }

    // Tenant providers
    if (config.tenant) {
      content = <TenantProvider>{content}</TenantProvider>;
    }

    // Unified Data providers (الثقيلة - فقط عند الضرورة)
    if (config.unifiedData) {
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
    }

    // تطبيق Core providers في الطبقة الخارجية
    content = (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoadingControllerProvider maxConcurrentRequests={2}>
            <SupabaseProvider>
              <ThemeProvider>
                <I18nextProvider i18n={i18n}>
                  <HelmetProvider>
                    {content}
                    <Toaster />
                    <Sonner />
                  </HelmetProvider>
                </I18nextProvider>
              </ThemeProvider>
            </SupabaseProvider>
          </LoadingControllerProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return <>{content}</>;
};

export default SmartProviderWrapper; 