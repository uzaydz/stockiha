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
import { CoreInfrastructureWrapper } from './CoreInfrastructureWrapper';
import { I18nSEOWrapper } from './I18nSEOWrapper';
import { ProviderComposer } from './ProviderComposer';

interface SmartWrapperCoreProps {
  children: React.ReactNode;
}

export const SmartWrapperCore = memo<SmartWrapperCoreProps>(({ children }) => {
  console.log('🚀 SmartWrapperCore: بدء التهيئة');
  
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
        console.log('✅ SmartWrapperCore: تم التهيئة');
      } finally {
        initializationPromiseRef.current = null;
      }
    })();
  }, []);

  // 🔄 تنظيف عند تغيير المسار
  useEffect(() => {
    if (lastPathname.current !== location.pathname) {
      console.log('🔄 SmartWrapperCore: تغيير المسار', { 
        from: lastPathname.current, 
        to: location.pathname 
      });
      lastPathname.current = location.pathname;
    }
  }, [location.pathname]);

  // تحديد نوع الصفحة والـ providers المطلوبة
  const { pageType, config } = useMemo(() => {
    const newPageType = determinePageType(location.pathname);
    
    // التحقق من التغييرات
    if (lastPathname.current === location.pathname && isInitialized.current) {
      console.log('⏭️ SmartWrapperCore: تخطي إعادة التحديد - نفس المسار');
      return { pageType: newPageType, config: PROVIDER_CONFIGS[newPageType] || PROVIDER_CONFIGS.minimal };
    }
    
    console.log('🎯 SmartWrapperCore: تحديد نوع صفحة جديد', {
      pathname: location.pathname,
      newPageType,
      lastPathname: lastPathname.current,
      lastPageType: null
    });
    
    return { pageType: newPageType, config: PROVIDER_CONFIGS[newPageType] || PROVIDER_CONFIGS.minimal };
  }, [location.pathname]);

  // 🌐 Infrastructure content - محسن
  const infrastructureContent = useMemo(() => (
    <CoreInfrastructureWrapper>
      <ProviderComposer
        config={config}
        pageType={pageType}
        pathname={location.pathname}
      >
        {children}
      </ProviderComposer>
    </CoreInfrastructureWrapper>
  ), [config, pageType, location.pathname, children]);

  // 🌐 Final wrapped content with I18n and SEO - محسن
  const finalContent = useMemo(() => (
    <I18nSEOWrapper>
      {infrastructureContent}
    </I18nSEOWrapper>
  ), [infrastructureContent]);

  console.log('🎨 SmartWrapperCore: إرجاع المحتوى', {
    pageType,
    config,
    hasChildren: !!children,
    renderCount: renderCount.current
  });

  return (
    <>
      {/* المحتوى الرئيسي */}
      {finalContent}
    </>
  );
});

SmartWrapperCore.displayName = 'SmartWrapperCore';
