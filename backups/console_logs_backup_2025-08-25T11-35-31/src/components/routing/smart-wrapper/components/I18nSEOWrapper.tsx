/**
 * 🌐 Internationalization Wrapper
 * طبقة التدويل والـ SEO
 * مكون منفصل لتحسين الأداء وسهولة الصيانة
 */

import React, { memo, useEffect, useState, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";

interface I18nSEOWrapperProps {
  children: React.ReactNode;
}

export const I18nSEOWrapper = memo<I18nSEOWrapperProps>(({ children }) => {
  const [i18nInstance, setI18nInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadI18n = async () => {
      try {
        setIsLoading(true);
        
        // استخدام dynamic import لتحسين الأداء
        const mod = await import('@/i18n');
        const instance = mod?.default ?? mod;
        
        if (mounted && instance) {
          setI18nInstance(instance);
        }
      } catch (error) {
        console.warn('❌ [I18nSEOWrapper] خطأ في تحميل i18n:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // استخدام requestIdleCallback إذا كان متاحاً
    if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
      (window as any).requestIdleCallback(loadI18n);
    } else {
      // fallback لـ setTimeout مع تأخير قصير
      setTimeout(loadI18n, 10);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Memoize المحتوى لتحسين الأداء
  const content = useMemo(() => (
    <>
      {children}
      <Toaster />
      <Sonner />
    </>
  ), [children]);

  // قبل تهيئة i18n، اعرض المحتوى بدون مزود i18n لتسريع الإقلاع
  if (isLoading || !i18nInstance) {
    return (
      <HelmetProvider>
        {content}
      </HelmetProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18nInstance}>
      <HelmetProvider>
        {content}
      </HelmetProvider>
    </I18nextProvider>
  );
});

I18nSEOWrapper.displayName = 'I18nSEOWrapper';
