/**
 * 🎭 Provider Composer
 * مؤلف المزودين المحسن للأداء
 * مكون منفصل لتحسين الأداء وسهولة الصيانة
 */

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { ProviderComposition } from '../ConditionalProviders';
import { SmartErrorBoundary, AuthErrorBoundary, DataErrorBoundary } from '../ErrorBoundaries';
import type { PageType, ProviderConfig } from '../types';

interface ProviderComposerProps {
  config: ProviderConfig;
  pageType: PageType;
  pathname: string;
  children: React.ReactNode;
}

export const ProviderComposer = memo<ProviderComposerProps>(({ 
  config, 
  pageType, 
  pathname, 
  children 
}) => {
  console.log('🚀 ProviderComposer: بدء التهيئة', { pageType, pathname });
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastConfig = useRef<ProviderConfig | null>(null);
  const lastPageType = useRef<PageType | null>(null);
  const lastPathname = useRef<string | null>(null);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  
  renderCount.current++;
  
  console.log('🔄 ProviderComposer: render', { 
    renderCount: renderCount.current,
    pageType,
    pathname,
    config
  });
  
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
        console.log('✅ ProviderComposer: تم التهيئة');
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

  // 🔥 منع إعادة الإنشاء إذا لم تتغير البيانات
  if (!shouldRecreate && isInitialized.current && lastConfig.current) {
    console.log('⏭️ ProviderComposer: تخطي إعادة الإنشاء - نفس البيانات');
    return (
      <SmartErrorBoundary
        pageType={pageType}
        pathname={pathname}
        enableRecovery={true}
      >
        <AuthErrorBoundary pageType={pageType}>
          <DataErrorBoundary pageType={pageType}>
            <ProviderComposition
              config={lastConfig.current}
              pageType={pageType}
              pathname={pathname}
            >
              {children}
            </ProviderComposition>
          </DataErrorBoundary>
        </AuthErrorBoundary>
      </SmartErrorBoundary>
    );
  }

  // إنشاء محتوى جديد
  const newConfig = useMemo(() => {
    console.log('🔄 ProviderComposer: إنشاء محتوى جديد', {
      lastConfig: lastConfig.current,
      newConfig: config,
      lastPageType: lastPageType.current,
      newPageType: pageType,
      lastPathname: lastPathname.current,
      newPathname: pathname
    });
    
    return config;
  }, [config, pageType, pathname]);

  // 🛡️ Error boundary wrapped content مع memoization محسن
  const errorBoundaryContent = useMemo(() => {
    console.log('🛡️ ProviderComposer: إنشاء Error Boundaries');
    return (
      <SmartErrorBoundary
        pageType={pageType}
        pathname={pathname}
        enableRecovery={true}
      >
        <AuthErrorBoundary pageType={pageType}>
          <DataErrorBoundary pageType={pageType}>
            <ProviderComposition
              config={newConfig}
              pageType={pageType}
              pathname={pathname}
            >
              {children}
            </ProviderComposition>
          </DataErrorBoundary>
        </AuthErrorBoundary>
      </SmartErrorBoundary>
    );
  }, [pageType, pathname, newConfig, children]);

  console.log('🎨 ProviderComposer: إرجاع المحتوى', {
    pageType,
    pathname,
    renderCount: renderCount.current
  });

  // إرجاع المحتوى المغلف بالحماية من الأخطاء
  return errorBoundaryContent;
});

ProviderComposer.displayName = 'ProviderComposer';
