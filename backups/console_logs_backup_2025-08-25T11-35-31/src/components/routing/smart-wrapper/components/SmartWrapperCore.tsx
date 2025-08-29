/**
 * 🚀 Smart Wrapper Core
 * النواة الرئيسية المحسنة والمبسطة
 * مكون منفصل لتحسين الأداء وسهولة الصيانة
 */

import React, { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { determinePageType } from '../utils';
import { PROVIDER_CONFIGS } from '../constants';
import type { PageType } from '../types';

// استيراد المكونات المنفصلة
import { CoreInfrastructureWrapper } from './CoreInfrastructureWrapper';
import { I18nSEOWrapper } from './I18nSEOWrapper';
import { PageTypeDetector } from './PageTypeDetector';
import { ProviderComposer } from './ProviderComposer';

interface SmartWrapperCoreProps {
  children: React.ReactNode;
}

export const SmartWrapperCore = memo<SmartWrapperCoreProps>(({ children }) => {
  const location = useLocation();
  const [earlyPageType, setEarlyPageType] = useState<PageType | null>(null);
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastPathname = useRef(location.pathname);
  const lastPageType = useRef<PageType | null>(null);
  
  renderCount.current++;
  
  // معالج اكتشاف نوع الصفحة - محسن
  const handlePageTypeDetected = useCallback((pageType: PageType, isEarly: boolean) => {
    if (isEarly && !earlyPageType) {
      setEarlyPageType(pageType);
      // إرسال event للكشف المبكر
      window.dispatchEvent(new CustomEvent('bazaar:page-type-detected', {
        detail: { pageType, isEarly }
      }));
    }
  }, [earlyPageType]);
  
  // 📊 Page type detection and config - محسن مع الكشف المبكر والتحقق من التغييرات
  const pageType = useMemo(() => {
    // إذا كان لدينا نوع صفحة مبكر، استخدمه
    if (earlyPageType) {
      return earlyPageType;
    }
    
    // التحقق من تغيير المسار لتجنب إعادة الحساب غير الضرورية
    if (lastPathname.current === location.pathname && lastPageType.current) {
      return lastPageType.current;
    }
    
    const newPageType = determinePageType(location.pathname);
    lastPathname.current = location.pathname;
    lastPageType.current = newPageType;
    
    return newPageType;
  }, [earlyPageType, location.pathname]);
  
  const config = useMemo(() => {
    return PROVIDER_CONFIGS[pageType] || PROVIDER_CONFIGS.minimal;
  }, [pageType]);
  
  // 🔥 Memoized provider composition - محسن مع dependencies محدودة
  const providerContent = useMemo(() => (
    <ProviderComposer
      config={config}
      pageType={pageType}
      pathname={location.pathname}
    >
      {children}
    </ProviderComposer>
  ), [config, pageType, location.pathname, children]);

  // 🏗️ Infrastructure wrapped content - محسن
  const infrastructureContent = useMemo(() => (
    <CoreInfrastructureWrapper>
      {providerContent}
    </CoreInfrastructureWrapper>
  ), [providerContent]);

  // 🌐 Final wrapped content with I18n and SEO - محسن
  const finalContent = useMemo(() => (
    <I18nSEOWrapper>
      {infrastructureContent}
    </I18nSEOWrapper>
  ), [infrastructureContent]);

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);

  // 🔄 تنظيف عند تغيير المسار
  useEffect(() => {
    if (lastPathname.current !== location.pathname) {
      lastPathname.current = location.pathname;
      // إعادة تعيين نوع الصفحة المبكر عند تغيير المسار
      if (earlyPageType) {
        setEarlyPageType(null);
      }
    }
  }, [location.pathname, earlyPageType]);

  return (
    <>
      {/* كاشف نوع الصفحة المبكر - محسن */}
      <PageTypeDetector onPageTypeDetected={handlePageTypeDetected} />
      
      {/* المحتوى الرئيسي */}
      {finalContent}
    </>
  );
});

SmartWrapperCore.displayName = 'SmartWrapperCore';
