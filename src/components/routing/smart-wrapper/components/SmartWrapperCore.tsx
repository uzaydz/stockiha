/**
 * 🚀 Smart Wrapper Core
 * النواة الرئيسية المحسنة والمبسطة
 * مكون منفصل لتحسين الأداء وسهولة الصيانة
 */

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { determinePageType } from '../utils';
import { PROVIDER_CONFIGS } from '../constants';
import type { PageType } from '../types';

// استيراد المكونات المنفصلة
import { CoreInfrastructureWrapper, MinimalCoreInfrastructureWrapper } from './CoreInfrastructureWrapper';
import { I18nSEOWrapper } from './I18nSEOWrapper';
import { ProviderComposer } from './ProviderComposer';

interface SmartWrapperCoreProps {
  children: React.ReactNode;
}

export const SmartWrapperCore = memo<SmartWrapperCoreProps>(({ children }) => {
  
  const location = useLocation();
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastPathname = useRef<string | null>(null);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  
  renderCount.current++;
  
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

  // 🔄 تنظيف عند تغيير المسار
  useEffect(() => {
    if (lastPathname.current !== location.pathname) {
      lastPathname.current = location.pathname;
    }
  }, [location.pathname]);

  // تحديد نوع الصفحة والـ providers المطلوبة
  const { pageType, config } = useMemo(() => {
    const newPageType = determinePageType(location.pathname);
    
    // التحقق من التغييرات
    if (lastPathname.current === location.pathname && isInitialized.current) {
      return { pageType: newPageType, config: PROVIDER_CONFIGS[newPageType] || PROVIDER_CONFIGS.minimal };
    }

    return { pageType: newPageType, config: PROVIDER_CONFIGS[newPageType] || PROVIDER_CONFIGS.minimal };
  }, [location.pathname]);

  // 🌐 Infrastructure content - محسن
  const infrastructureContent = useMemo(() => {
    // Choose minimal wrapper for public store routes to avoid SupabaseProvider at bootstrap
    const minimalTypes = new Set([
      'public-store', 'public-product', 'landing', 'thank-you', 'minimal', 'max-store'
    ]);
    const Wrapper = minimalTypes.has(pageType as any) ? MinimalCoreInfrastructureWrapper : CoreInfrastructureWrapper;

    return (
      <Wrapper>
        <ProviderComposer
          config={config}
          pageType={pageType}
          pathname={location.pathname}
        >
          {children}
        </ProviderComposer>
      </Wrapper>
    );
  }, [config, pageType, location.pathname, children]);

  // 🌐 Final wrapped content with I18n and SEO - محسن
  const finalContent = useMemo(() => (
    <I18nSEOWrapper>
      {infrastructureContent}
    </I18nSEOWrapper>
  ), [infrastructureContent]);

  return (
    <>
      {/* المحتوى الرئيسي */}
      {finalContent}
    </>
  );
});

SmartWrapperCore.displayName = 'SmartWrapperCore';
