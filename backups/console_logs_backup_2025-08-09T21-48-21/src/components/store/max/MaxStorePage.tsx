import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '@/context/ThemeContext';
import { useTenant } from '@/context/TenantContext';
import { getCompleteStoreData, StoreData } from '@/api/optimized-store-api';
import { Truck, ShieldCheck, Gem } from 'lucide-react';
import SEOHead from '@/components/store/SEOHead';
import { StoreHead } from '../StoreHead';
import { applyEnhancedColors, generateHoverFixCSS } from '@/utils/colorUtils';

// Lazy loading للمكونات لتحسين الأداء
const MaxNavbar = lazy(() => import('./components/MaxNavbar.tsx').then(m => ({ default: m.MaxNavbar })));
const StoreBanner = lazy(() => import('../StoreBanner.tsx').then(m => ({ default: m.default })));
const MaxCategories = lazy(() => import('./components/MaxCategories.tsx').then(m => ({ default: m.MaxCategories })));
const MaxFeaturedProducts = lazy(() => import('./components/MaxFeaturedProducts.tsx').then(m => ({ default: m.MaxFeaturedProducts })));
const MaxAboutUs = lazy(() => import('./components/MaxAboutUs.tsx').then(m => ({ default: m.MaxAboutUs })));
const MaxTestimonials = lazy(() => import('./components/MaxTestimonials.tsx').then(m => ({ default: m.MaxTestimonials })));
const MaxFooter = lazy(() => import('./components/MaxFooter.tsx').then(m => ({ default: m.MaxFooter })));

import { MaxLoadingSpinner } from './components/MaxLoadingSpinner.tsx';
import { MaxErrorBoundary } from './components/MaxErrorBoundary.tsx';

interface MaxStorePageProps {
  subdomain?: string;
  existingStoreData?: any;
}

// مكون تحميل محسن للمكونات الفرعية باستخدام Tailwind
const ComponentSkeleton: React.FC<{ type: string }> = ({ type }) => (
  <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg mx-4 mb-4 ${
    type === 'navbar' ? 'h-16' : 
    type === 'hero' ? 'h-96' : 
    type === 'categories' ? 'h-64' : 
    type === 'footer' ? 'h-48' : 'h-40'
  }`}>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
    </div>
  </div>
);

// تحسين الـ viewport للأداء
const useViewportOptimization = () => {
  useEffect(() => {
    // تحسين الـ viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no');
    }

    // تحسين الـ scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // تحسين الـ font display - إزالة preload المزدوج
    const existingFontLink = document.querySelector('link[href="/fonts/tajawal-regular.woff2"]');
    if (!existingFontLink) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.as = 'font';
      fontLink.type = 'font/woff2';
      fontLink.href = '/fonts/tajawal-regular.woff2';
      fontLink.crossOrigin = 'anonymous';
      document.head.appendChild(fontLink);
    }

    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);
};

const MaxStorePage: React.FC<MaxStorePageProps> = ({ 
  subdomain: propSubdomain, 
  existingStoreData 
}) => {
  const { subdomain: paramSubdomain } = useParams();
  const subdomain = propSubdomain || paramSubdomain || 'demo';
  const { theme, setTheme, reloadOrganizationTheme } = useTheme();
  const { isLoading: tenantLoading, currentOrganization } = useTenant();
  
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(!existingStoreData);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // تحسين الـ viewport
  useViewportOptimization();

  // تحويل البيانات الموجودة إلى تنسيق Max (محسن)
  const convertExistingData = useCallback((data: any): StoreData | null => {
    if (!data?.organization_details) return null;
    
    return {
      success: true,
      organization_details: data.organization_details,
      organization_settings: {
        theme_primary_color: '#3B82F6',
        theme_secondary_color: '#10B981',
        theme_mode: 'light',
        custom_css: '',
        custom_js: '',
        custom_js_footer: '',
        ...data.organization_settings
      },
      categories: data.categories || [],
      subcategories: data.subcategories || [],
      featured_products: data.featured_products || [],
      store_layout_components: [
        { id: 'hero-1', type: 'hero', isActive: true, orderIndex: 1, settings: {} },
        { id: 'categories-1', type: 'categories', isActive: true, orderIndex: 2, settings: {} },
        { id: 'featuredproducts-1', type: 'featuredproducts', isActive: true, orderIndex: 3, settings: {} },
        { id: 'about-1', type: 'about', isActive: true, orderIndex: 4, settings: {} },
        { id: 'testimonials-1', type: 'testimonials', isActive: true, orderIndex: 5, settings: {} },
        { id: 'footer-1', type: 'footer', isActive: true, orderIndex: 6, settings: {} }
      ],
      footer_settings: data.footer_settings || {},
      shipping_info: data.shipping_info || { has_shipping_providers: false },
      stats: {
        total_products: data.featured_products?.length || 0,
        total_categories: data.categories?.length || 0,
        total_featured_products: data.featured_products?.length || 0,
        total_customers: 100,
        last_updated: new Date().toISOString()
      },
      meta: {
        query_timestamp: new Date().toISOString(),
        data_freshness: 'converted_from_existing',
        performance_optimized: true,
        total_queries_reduced_to: 1
      }
    };
  }, []);

  // جلب بيانات المتجر (محسن)
  const fetchStoreData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getCompleteStoreData(subdomain);
      
      if (!data) {
        throw new Error('لم يتم العثور على بيانات المتجر');
      }

      setStoreData(data);
      setIsVisible(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  // إعادة المحاولة (محسن)
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    fetchStoreData();
  }, [fetchStoreData]);

  // تحميل البيانات عند بدء التطبيق
  useEffect(() => {
    if (existingStoreData) {
      const convertedData = convertExistingData(existingStoreData);
      if (convertedData) {
        setStoreData(convertedData);
        setLoading(false);
        setIsVisible(true);
        return;
      }
    }
    
    fetchStoreData();
  }, [subdomain, existingStoreData, convertExistingData, fetchStoreData]);

  // تطبيق ثيم المتجر Max (محسن مع ThemeContext)
  useEffect(() => {
    if (!storeData?.organization_settings) return;

    const settings = storeData.organization_settings;
    const root = document.documentElement;

    // تحويل الألوان إلى تنسيق HSL المطلوب لـ Tailwind
    const hexToHsl = (hex: string) => {
      // إزالة # من بداية الكود اللوني
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
      const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
      const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // حساب لون النص المناسب بناءً على سطوع اللون - محسن
    const getContrastColor = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      
      // حساب السطوع النسبي باستخدام معادلة W3C المحسنة
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // إذا كان اللون داكن (سطوع أقل من 140)، استخدم أبيض، وإلا استخدم أسود
      return brightness < 140 ? '0 0% 98%' : '222.2 84% 4.9%';
    };

    // حساب لون مُخفف للهوفر
    const getLighterColor = (hex: string, factor: number = 0.1) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      
      const lighterR = Math.min(255, r + (255 - r) * factor);
      const lighterG = Math.min(255, g + (255 - g) * factor);
      const lighterB = Math.min(255, b + (255 - b) * factor);
      
      return hexToHsl(`#${Math.round(lighterR).toString(16).padStart(2, '0')}${Math.round(lighterG).toString(16).padStart(2, '0')}${Math.round(lighterB).toString(16).padStart(2, '0')}`);
    };

    // حساب لون مُغمق للهوفر  
    const getDarkerColor = (hex: string, factor: number = 0.1) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      
      const darkerR = Math.max(0, r * (1 - factor));
      const darkerG = Math.max(0, g * (1 - factor));
      const darkerB = Math.max(0, b * (1 - factor));
      
      return hexToHsl(`#${Math.round(darkerR).toString(16).padStart(2, '0')}${Math.round(darkerG).toString(16).padStart(2, '0')}${Math.round(darkerB).toString(16).padStart(2, '0')}`);
    };
    
    // تطبيق الألوان المخصصة على متغيرات CSS الخاصة بـ Tailwind
    const primaryColor = settings.theme_primary_color || '#3B82F6';
    const secondaryColor = settings.theme_secondary_color || '#10B981';

    // استخدام النظام المحسن للألوان
    const enhancedColors = applyEnhancedColors(primaryColor, secondaryColor);
    
    const colorProperties = {
      ...enhancedColors,
      '--accent': hexToHsl(secondaryColor),
      '--accent-foreground': getContrastColor(secondaryColor),
      '--muted': '210 40% 96%',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--border': '214.3 31.8% 91.4%',
      '--ring': hexToHsl(primaryColor),
      '--card': '0 0% 100%',
      '--card-foreground': '222.2 84% 4.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222.2 84% 4.9%',
      '--background': '0 0% 100%',
      '--foreground': '222.2 84% 4.9%'
    };

    // تطبيق الألوان فوراً
    Object.entries(colorProperties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // إجبار إعادة رسم الصفحة بطريقة محسنة لتجنب مشاكل الأداء
    const forceRerender = () => {
      // استخدام requestAnimationFrame بدلاً من setTimeout لتحسين الأداء
      requestAnimationFrame(() => {
        root.style.opacity = '0.99';
        requestAnimationFrame(() => {
          root.style.opacity = '';
          
          // إجبار تحديث جميع العناصر التي تستخدم متغيرات CSS
          const elementsWithPrimary = document.querySelectorAll('[class*="bg-primary"], [class*="text-primary"], [class*="border-primary"]');
          elementsWithPrimary.forEach(el => {
            const element = el as HTMLElement;
            element.style.opacity = '0.99';
            requestAnimationFrame(() => {
              element.style.opacity = '';
            });
          });
        });
      });
    };
    
    forceRerender();
    setTimeout(forceRerender, 50);
    setTimeout(() => {
      forceRerender();
    }, 200);
    
    // تطبيق وضع الثيم من إعدادات المتجر
    if (settings.theme_mode && settings.theme_mode !== theme) {
      const storeTheme = settings.theme_mode === 'auto' ? 'system' : settings.theme_mode;
      setTheme(storeTheme as any);
    }
    
    // تطبيق CSS المخصص وإجبار استخدام الألوان
    const existingStyle = document.getElementById('max-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'max-custom-css';
    
    // CSS لإجبار تطبيق الألوان على جميع المكونات
    let customCSS = `
      /* إجبار تطبيق ألوان الثيم على المستوى الجذري */
      :root {
        --primary: ${hexToHsl(primaryColor)} !important;
        --primary-foreground: ${getContrastColor(primaryColor)} !important;
        --secondary: ${hexToHsl(secondaryColor)} !important;
        --secondary-foreground: ${getContrastColor(secondaryColor)} !important;
        --accent: ${hexToHsl(secondaryColor)} !important;
        --accent-foreground: ${getContrastColor(secondaryColor)} !important;
        --ring: ${hexToHsl(primaryColor)} !important;
      }
      
      /* قواعد CSS قوية جداً مع أعلى specificity */
      html body div section div div a[class*="bg-primary"],
      html body div section div div button[class*="bg-primary"],
      html body section div div a[class*="bg-primary"],
      html body section div div button[class*="bg-primary"] {
        background-color: hsl(${hexToHsl(primaryColor)}) !important;
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      html body div section div div a[class*="bg-primary"] *,
      html body div section div div button[class*="bg-primary"] *,
      html body section div div a[class*="bg-primary"] *,
      html body section div div button[class*="bg-primary"] * {
        color: hsl(${getContrastColor(primaryColor)}) !important;
        fill: hsl(${getContrastColor(primaryColor)}) !important;
        stroke: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على العناصر مع specificity عالي */
      html body [class*="bg-primary"], 
      html body .bg-primary {
        background-color: hsl(${hexToHsl(primaryColor)}) !important;
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      html body [class*="text-primary"], 
      html body .text-primary {
        color: hsl(${hexToHsl(primaryColor)}) !important;
      }
      
      html body [class*="text-primary-foreground"], 
      html body .text-primary-foreground {
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      html body [class*="border-primary"], 
      html body .border-primary {
        border-color: hsl(${hexToHsl(primaryColor)}) !important;
      }
      
      html body [class*="bg-secondary"], 
      html body .bg-secondary {
        background-color: hsl(${hexToHsl(secondaryColor)}) !important;
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      html body [class*="text-secondary"], 
      html body .text-secondary {
        color: hsl(${hexToHsl(secondaryColor)}) !important;
      }
      
      html body [class*="text-secondary-foreground"], 
      html body .text-secondary-foreground {
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      html body [class*="bg-accent"], 
      html body .bg-accent {
        background-color: hsl(${hexToHsl(secondaryColor)}) !important;
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      html body [class*="text-accent"], 
      html body .text-accent {
        color: hsl(${hexToHsl(secondaryColor)}) !important;
      }
      
      html body [class*="text-accent-foreground"], 
      html body .text-accent-foreground {
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      ${generateHoverFixCSS(primaryColor, secondaryColor).replace(/\n/g, '\n      ')}
      
      html body .hover\\:text-primary:hover,
      html body [class*="hover:text-primary"]:hover {
        color: hsl(${hexToHsl(primaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على الحالة العادية للأزرار (غير hover) */
      html body a.bg-primary:not(:hover),
      html body button.bg-primary:not(:hover),
      html body [class*="bg-primary"]:not(:hover) {
        background-color: hsl(${hexToHsl(primaryColor)}) !important;
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      html body a.bg-primary:not(:hover) *,
      html body button.bg-primary:not(:hover) *,
      html body [class*="bg-primary"]:not(:hover) * {
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      html body a.bg-secondary:not(:hover),
      html body button.bg-secondary:not(:hover),
      html body [class*="bg-secondary"]:not(:hover) {
        background-color: hsl(${hexToHsl(secondaryColor)}) !important;
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      html body a.bg-secondary:not(:hover) *,
      html body button.bg-secondary:not(:hover) *,
      html body [class*="bg-secondary"]:not(:hover) * {
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على الأزرار - قواعد شاملة */
      html body button.bg-primary,
      html body [role="button"].bg-primary,
      html body .btn-primary,
      html body button[class*="bg-primary"],
      html body [role="button"][class*="bg-primary"],
      html body a[class*="bg-primary"],
      html body .bg-primary {
        background-color: hsl(${hexToHsl(primaryColor)}) !important;
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على الأزرار الثانوية */
      html body button.bg-secondary,
      html body [role="button"].bg-secondary,
      html body button[class*="bg-secondary"],
      html body [role="button"][class*="bg-secondary"],
      html body a[class*="bg-secondary"],
      html body .bg-secondary {
        background-color: hsl(${hexToHsl(secondaryColor)}) !important;
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على text-primary-foreground */
      html body [class*="text-primary-foreground"],
      html body .text-primary-foreground,
      html body .bg-primary *,
      html body [class*="bg-primary"] * {
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على text-secondary-foreground */
      html body [class*="text-secondary-foreground"],
      html body .text-secondary-foreground,
      html body .bg-secondary *,
      html body [class*="bg-secondary"] * {
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على الروابط */
      html body a.text-primary,
      html body [class*="text-primary"] {
        color: hsl(${hexToHsl(primaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على الأيقونات - قواعد شاملة */
      html body [class*="bg-primary"] svg,
      html body .bg-primary svg,
      html body [class*="bg-primary"] .lucide,
      html body .bg-primary .lucide,
      html body button[class*="bg-primary"] svg,
      html body a[class*="bg-primary"] svg {
        color: hsl(${getContrastColor(primaryColor)}) !important;
        fill: hsl(${getContrastColor(primaryColor)}) !important;
        stroke: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      html body [class*="bg-secondary"] svg,
      html body .bg-secondary svg,
      html body [class*="bg-secondary"] .lucide,
      html body .bg-secondary .lucide,
      html body button[class*="bg-secondary"] svg,
      html body a[class*="bg-secondary"] svg {
        color: hsl(${getContrastColor(secondaryColor)}) !important;
        fill: hsl(${getContrastColor(secondaryColor)}) !important;
        stroke: hsl(${getContrastColor(secondaryColor)}) !important;
      }
      
      /* إجبار تطبيق الألوان على النصوص داخل الأزرار */
      html body button[class*="bg-primary"] span,
      html body a[class*="bg-primary"] span,
      html body button[class*="bg-primary"] .font-semibold,
      html body a[class*="bg-primary"] .font-semibold {
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      html body button[class*="bg-secondary"] span,
      html body a[class*="bg-secondary"] span,
      html body button[class*="bg-secondary"] .font-semibold,
      html body a[class*="bg-secondary"] .font-semibold {
        color: hsl(${getContrastColor(secondaryColor)}) !important;
      }
    `;
    
    // إضافة CSS المخصص من الإعدادات
    if (settings.custom_css) {
      customCSS += '\n\n' + settings.custom_css;
    }
    
    // إضافة CSS خاص للهيرو لإصلاح مشكلة الأزرار
    customCSS += `
      /* إصلاح خاص لأزرار الهيرو */
      section[class*="bg-gradient-to-br"] a[class*="bg-primary"],
      section[class*="bg-gradient-to-br"] button[class*="bg-primary"] {
        background-color: hsl(${hexToHsl(primaryColor)}) !important;
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      section[class*="bg-gradient-to-br"] a[class*="bg-primary"] svg,
      section[class*="bg-gradient-to-br"] button[class*="bg-primary"] svg {
        color: hsl(${getContrastColor(primaryColor)}) !important;
        fill: hsl(${getContrastColor(primaryColor)}) !important;
        stroke: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      /* إصلاح أزرار الهيرو بشكل مباشر */
      .bg-primary.text-primary-foreground {
        background-color: hsl(${hexToHsl(primaryColor)}) !important;
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
      
      .bg-primary.text-primary-foreground * {
        color: hsl(${getContrastColor(primaryColor)}) !important;
      }
    `;

    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement);
    
    // إجبار تحديث جميع العناصر التي تستخدم الألوان
    setTimeout(() => {
      try {
        const elementsToUpdate = document.querySelectorAll(`
          [class*="bg-primary"], 
          [class*="text-primary"], 
          [class*="border-primary"],
          [class*="bg-secondary"], 
          [class*="text-secondary"], 
          [class*="bg-accent"], 
          [class*="text-accent"],
          a[class*="bg-primary"],
          button[class*="bg-primary"],
          .text-primary-foreground,
          .text-secondary-foreground
        `);
      
      elementsToUpdate.forEach(el => {
        const element = el as HTMLElement;
        // إجبار إعادة حساب الأنماط بطريقة محسنة
        requestAnimationFrame(() => {
          element.style.opacity = '0.99';
          requestAnimationFrame(() => {
            element.style.opacity = '';
          });
        });
        
        // إجبار تطبيق الألوان مباشرة على الأزرار
        const elementClasses = element.className?.toString() || '';
        if (element.classList.contains('bg-primary') || elementClasses.includes('bg-primary')) {
          const primaryHsl = hexToHsl(primaryColor);
          const primaryForegroundHsl = getContrastColor(primaryColor);
          element.style.backgroundColor = `hsl(${primaryHsl})`;
          element.style.color = `hsl(${primaryForegroundHsl})`;
          
          // إجبار تطبيق الألوان على الأيقونات والنصوص الفرعية
          const childElements = element.querySelectorAll('*');
          childElements.forEach(child => {
            (child as HTMLElement).style.color = `hsl(${primaryForegroundHsl})`;
          });
        }
        
        if (element.classList.contains('bg-secondary') || elementClasses.includes('bg-secondary')) {
          const secondaryHsl = hexToHsl(secondaryColor);
          const secondaryForegroundHsl = getContrastColor(secondaryColor);
          element.style.backgroundColor = `hsl(${secondaryHsl})`;
          element.style.color = `hsl(${secondaryForegroundHsl})`;
          
          // إجبار تطبيق الألوان على الأيقونات والنصوص الفرعية
          const childElements = element.querySelectorAll('*');
          childElements.forEach(child => {
            (child as HTMLElement).style.color = `hsl(${secondaryForegroundHsl})`;
          });
        }
      });
      
      } catch (error) {
      }
    }, 100);
    
    // إجبار تحديث إضافي للأزرار بعد وقت أطول
    setTimeout(() => {
      try {
        const heroButtons = document.querySelectorAll('section[class*="bg-gradient-to-br"] a[class*="bg-primary"], section[class*="bg-gradient-to-br"] button[class*="bg-primary"]');
        heroButtons.forEach(button => {
          const element = button as HTMLElement;
          const primaryHsl = hexToHsl(primaryColor);
          const primaryForegroundHsl = getContrastColor(primaryColor);
          
          // تطبيق الألوان مع requestAnimationFrame لتحسين الأداء
          requestAnimationFrame(() => {
            element.style.backgroundColor = `hsl(${primaryHsl})`;
            element.style.color = `hsl(${primaryForegroundHsl})`;
            
            // إجبار تطبيق الألوان على جميع العناصر الفرعية
            const allChildren = element.querySelectorAll('*');
            allChildren.forEach(child => {
              const childElement = child as HTMLElement;
              childElement.style.color = `hsl(${primaryForegroundHsl})`;
              childElement.style.fill = `hsl(${primaryForegroundHsl})`;
              childElement.style.stroke = `hsl(${primaryForegroundHsl})`;
            });
          });
        });
        
      } catch (error) {
      }
    }, 300);
    
    // تحميل ثيم المؤسسة من ThemeContext
    if (storeData.organization_details?.id) {
      reloadOrganizationTheme();
    }

    return () => {
      const existingStyle = document.getElementById('max-custom-css');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [storeData, theme, setTheme, reloadOrganizationTheme]);

  // تطبيق JavaScript المخصص (محسن)
  useEffect(() => {
    if (!storeData?.organization_settings?.custom_js) return;

    try {
      const script = document.createElement('script');
      script.textContent = storeData.organization_settings.custom_js;
      script.id = 'max-custom-js';
      script.async = true;
      document.head.appendChild(script);
      
      return () => {
        const existingScript = document.getElementById('max-custom-js');
        if (existingScript) {
          existingScript.remove();
        }
      };
    } catch (err) {
    }
  }, [storeData]);

  // ترتيب المكونات (محسن بـ useMemo)
  const sortedComponents = useMemo(() => {
    return storeData?.store_layout_components
      ?.filter(comp => comp.isActive)
      ?.sort((a, b) => a.orderIndex - b.orderIndex) || [];
  }, [storeData?.store_layout_components]);

  // تحسين الـ SEO والـ Meta Tags
  const seoData = useMemo(() => {
    if (!storeData) return null;
    
    return {
      title: `${storeData.organization_details?.name || 'متجر إلكتروني'} - متجر Max`,
      description: storeData.organization_details?.description || 'متجر إلكتروني متطور مع تصميم حديث وأداء عالي',
      keywords: `متجر إلكتروني, ${storeData.organization_details?.name}, تسوق أونلاين, ${storeData.categories?.map(c => c.name).join(', ')}`,
      ogImage: storeData.organization_details?.logo_url || '/images/logo-new.webp',
      canonicalUrl: `https://${subdomain}.stockiha.com/`
    };
  }, [storeData, subdomain]);

  // حساب رابط صورة LCP (صورة الهيرو) وتجهيز مسار render من Supabase مع srcset
  const lcpImage = useMemo(() => {
    try {
      if (!storeData) return null;
      const rawUrl = (
        storeData.store_layout_components?.find(c => c.type === 'hero')?.settings?.imageUrl ||
        storeData.organization_details?.logo_url ||
        storeData.organization_settings?.logo_url ||
        ''
      ) as string;
      if (!rawUrl) return null;
      if (rawUrl.endsWith('.svg')) {
        return { href: rawUrl, srcSet: undefined as string | undefined };
      }
      if (rawUrl.includes('/storage/v1/object/public/')) {
        const url = new URL(rawUrl);
        const pathAfterPublic = url.pathname.split('/storage/v1/object/public/')[1];
        const base = `${url.origin}/storage/v1/render/image/public/${pathAfterPublic}`;
        const srcSet = [400, 800, 1200]
          .map(w => `${base}?width=${w}&quality=75 ${w}w`).join(', ');
        return { href: `${base}?width=800&quality=75`, srcSet };
      }
      return { href: rawUrl, srcSet: undefined };
    } catch {
      return null;
    }
  }, [storeData]);

  // رسائل التحميل والأخطاء (محسنة باستخدام Tailwind)
  // عرض التحميل إذا كان أي من النظامين يحمل أو إذا لم تكتمل عملية تحديد المؤسسة بعد
  if (loading || tenantLoading || (!currentOrganization && !error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-4">
        <MaxLoadingSpinner />
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">جاري تحميل المتجر...</h2>
          <p className="text-muted-foreground">نحن نحضر لك تجربة تسوق مميزة</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <MaxErrorBoundary>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-foreground mb-4">حدث خطأ</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button 
              onClick={handleRetry} 
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="mr-2">🔄</span>
              إعادة المحاولة ({retryCount})
            </button>
          </div>
        </div>
      </MaxErrorBoundary>
    );
  }

  // عرض "المتجر غير موجود" فقط إذا اكتمل التحميل ولم يتم العثور على بيانات
  if (!storeData && !loading && !tenantLoading && currentOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-3xl font-bold text-foreground mb-4">المتجر غير موجود</h1>
          <p className="text-muted-foreground mb-6">
            لم يتم العثور على المتجر المطلوب: <strong className="text-primary">{subdomain}</strong>
          </p>
          <button 
            onClick={handleRetry} 
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span className="mr-2">🔄</span>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // إذا لم تكتمل عملية تحديد المؤسسة أو لا توجد بيانات بعد، أظهر التحميل
  if (!storeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-4">
        <MaxLoadingSpinner />
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">جاري تحميل المتجر...</h2>
          <p className="text-muted-foreground">نحن نحضر لك تجربة تسوق مميزة</p>
        </div>
      </div>
    );
  }

  return (
    <MaxErrorBoundary>
      <StoreHead
        storeName={storeData.organization_details?.name || storeData.organization_settings?.site_name}
        storeDescription={seoData?.description || storeData.organization_details?.description}
        storeKeywords={seoData?.keywords || ''}
        faviconUrl={storeData.organization_settings?.favicon_url}
        logoUrl={storeData.organization_settings?.logo_url || storeData.organization_details?.logo_url}
        organizationId={storeData.organization_details?.id}
        customCSS={storeData.organization_settings?.custom_css}
        customJSHeader={storeData.organization_settings?.custom_js}
        themeColor={storeData.organization_settings?.theme_primary_color}
      />
      
      <Helmet>
        {/* Viewport وتحسينات الأداء */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content={storeData.organization_settings?.theme_primary_color || '#3B82F6'} />
        
        {/* تحسينات الأداء */}
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="//unpkg.com" />

        {/* Preload لصورة LCP مع fetchpriority=high لجعل الاكتشاف مبكراً */}
        {lcpImage?.href && (
          <link
            rel="preload"
            as="image"
            href={lcpImage.href}
            imageSrcSet={lcpImage.srcSet}
            imageSizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 512px"
            fetchPriority="high"
          />
        )}
        
        {/* CSS المخصص */}
        {storeData.organization_settings?.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: storeData.organization_settings.custom_css }} />
        )}
      </Helmet>
      
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div 
            className="min-h-screen bg-background text-foreground font-['Tajawal'] rtl"
            data-theme={storeData.organization_settings.theme_mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {/* مؤشر اختبار الألوان المحسن */}
            <div className="fixed top-4 left-4 z-50 p-4 bg-white border-2 border-gray-200 rounded-xl shadow-xl text-xs max-w-sm">
              <div className="mb-3 font-bold text-gray-800 text-sm">🎨 ألوان الثيم المطبقة</div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-lg border-2 border-gray-300 shadow-sm" 
                    style={{ backgroundColor: storeData?.organization_settings?.theme_primary_color || '#3B82F6' }}
                  ></div>
                  <div>
                    <div className="font-medium text-gray-800">Primary</div>
                    <div className="text-gray-600">{storeData?.organization_settings?.theme_primary_color || '#3B82F6'}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-lg border-2 border-gray-300 shadow-sm" 
                    style={{ backgroundColor: storeData?.organization_settings?.theme_secondary_color || '#10B981' }}
                  ></div>
                  <div>
                    <div className="font-medium text-gray-800">Secondary</div>
                    <div className="text-gray-600">{storeData?.organization_settings?.theme_secondary_color || '#10B981'}</div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-gray-700 font-medium mb-2">Tailwind CSS Variables:</div>
                  <div className="flex gap-2 items-center">
                    <div className="w-5 h-5 bg-primary rounded-lg border border-gray-300 shadow-sm"></div>
                    <div className="w-5 h-5 bg-secondary rounded-lg border border-gray-300 shadow-sm"></div>
                    <div className="w-5 h-5 bg-accent rounded-lg border border-gray-300 shadow-sm"></div>
                    <span className="text-gray-600 text-xs">تطبيق مباشر</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-gray-700 font-medium mb-2">اختبار الأزرار:</div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs hover:bg-primary/90 transition-colors">
                      Primary
                    </button>
                    <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg text-xs hover:bg-secondary/90 transition-colors">
                      Secondary
                    </button>
                    <button className="px-3 py-1 bg-accent text-accent-foreground rounded-lg text-xs hover:bg-accent/90 transition-colors">
                      Accent
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    💡 إذا كانت الأزرار مرئية هنا، فالألوان تعمل بشكل صحيح
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-2">
                  <div className="text-xs text-gray-500">
                    ✅ تم تطبيق الألوان بنجاح
                  </div>
                </div>
              </div>
            </div>

            {/* النافبار مع تحسين الأداء */}
            <Suspense fallback={<ComponentSkeleton type="navbar" />}>
              <MaxNavbar 
                storeData={storeData}
                categories={storeData.categories}
              />
            </Suspense>

            {/* محتوى الصفحة الرئيسي */}
            <main className="relative">
              <AnimatePresence>
                {sortedComponents.map((component, index) => (
                  <motion.div
                    key={`${component.type}-${component.id}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: index * 0.1,
                      ease: "easeOut"
                    }}
                    className="relative w-full"
                  >
                    <Suspense fallback={<ComponentSkeleton type={component.type} />}>
                      {component.type === 'hero' && (
                        <StoreBanner 
                          heroData={{
                            imageUrl: component.settings?.imageUrl || component.settings?.hero_image_url || storeData.organization_details?.logo_url || storeData.organization_settings?.logo_url,
                            title: component.settings?.title || storeData.organization_details?.name || 'متجر إلكتروني متطور',
                            description: component.settings?.description || storeData.organization_details?.description || 'اكتشف أفضل المنتجات بأفضل الأسعار مع تجربة تسوق استثنائية',
                            primaryButtonText: component.settings?.primaryButtonText || 'تسوق الآن',
                            primaryButtonLink: component.settings?.primaryButtonLink || '/products',
                            secondaryButtonText: component.settings?.secondaryButtonText || 'تعرف علينا',
                            secondaryButtonLink: component.settings?.secondaryButtonLink || '/about',
                            primaryButtonStyle: component.settings?.primaryButtonStyle || 'primary',
                            secondaryButtonStyle: component.settings?.secondaryButtonStyle || 'primary',
                            trustBadges: component.settings?.trustBadges || [
                              { icon: Truck, text: 'توصيل سريع' },
                              { icon: ShieldCheck, text: 'دفع آمن' },
                              { icon: Gem, text: 'جودة عالية' },
                            ]
                          }}
                        />
                      )}
                      
                      {component.type === 'categories' && (
                        <MaxCategories 
                          settings={component.settings}
                          categories={storeData.categories}
                          storeData={storeData}
                        />
                      )}
                      
                      {component.type === 'featuredproducts' && (
                        <MaxFeaturedProducts 
                          settings={component.settings}
                          products={storeData.featured_products}
                          storeData={storeData}
                        />
                      )}
                      
                      {component.type === 'about' && (
                        <MaxAboutUs 
                          settings={component.settings}
                          storeData={storeData}
                        />
                      )}
                      
                      {component.type === 'testimonials' && (
                        <MaxTestimonials 
                          settings={component.settings}
                          storeData={storeData}
                        />
                      )}
                    </Suspense>
                  </motion.div>
                ))}
              </AnimatePresence>
            </main>

            {/* الفوتر مع تحسين الأداء */}
            <Suspense fallback={<ComponentSkeleton type="footer" />}>
              <MaxFooter 
                storeData={storeData}
                footerSettings={storeData.footer_settings}
              />
            </Suspense>

            {/* JavaScript المخصص للفوتر */}
            {storeData.organization_settings.custom_js_footer && (
              <script 
                dangerouslySetInnerHTML={{
                  __html: storeData.organization_settings.custom_js_footer
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MaxErrorBoundary>
  );
};

export default MaxStorePage;
