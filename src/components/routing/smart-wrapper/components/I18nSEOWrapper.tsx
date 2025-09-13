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
import { SafeTranslationProvider } from '@/components/safe-i18n/SafeTranslationProvider';

// إنشاء HelmetContext منفصل لضمان التهيئة الصحيحة
const helmetContext = {
  instances: new Set(),
  add: (instance: any) => {
    helmetContext.instances.add(instance);
  },
  remove: (instance: any) => {
    helmetContext.instances.delete(instance);
  },
  update: (instance: any) => {
    // لا حاجة لفعل شيء هنا
  },
  canUseDOM: typeof window !== 'undefined',
  setHelmet: (helmet: any) => {
    // لا حاجة لفعل شيء هنا
  },
  helmetInstances: {
    get: () => helmetContext.instances,
    add: (instance: any) => helmetContext.instances.add(instance),
    remove: (instance: any) => helmetContext.instances.delete(instance)
  }
};

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
      <HelmetProvider context={helmetContext}>
        {content}
      </HelmetProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18nInstance}>
      <SafeTranslationProvider>
        <HelmetProvider context={helmetContext}>
          {content}
        </HelmetProvider>
      </SafeTranslationProvider>
    </I18nextProvider>
  );
});

I18nSEOWrapper.displayName = 'I18nSEOWrapper';
