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
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastConfig = useRef<ProviderConfig | null>(null);
  const lastPageType = useRef<PageType | null>(null);
  const lastPathname = useRef<string | null>(null);
  
  renderCount.current++;
  
  // 🔥 Memoized provider composition مع التحقق من التغييرات
  const providerContent = useMemo(() => {
    // التحقق من التغييرات لتجنب إعادة الإنشاء غير الضرورية
    if (
      lastConfig.current === config &&
      lastPageType.current === pageType &&
      lastPathname.current === pathname
    ) {
      return (
        <ProviderComposition
          config={config}
          pageType={pageType}
          pathname={pathname}
        >
          {children}
        </ProviderComposition>
      );
    }

    // تحديث القيم المرجعية
    lastConfig.current = config;
    lastPageType.current = pageType;
    lastPathname.current = pathname;

    return (
      <ProviderComposition
        config={config}
        pageType={pageType}
        pathname={pathname}
      >
        {children}
      </ProviderComposition>
    );
  }, [config, pageType, pathname, children]);

  // 🛡️ Error boundary wrapped content مع memoization محسن
  const errorBoundaryContent = useMemo(() => {
    return (
      <SmartErrorBoundary
        pageType={pageType}
        pathname={pathname}
        enableRecovery={true}
      >
        <AuthErrorBoundary pageType={pageType}>
          <DataErrorBoundary pageType={pageType}>
            {providerContent}
          </DataErrorBoundary>
        </AuthErrorBoundary>
      </SmartErrorBoundary>
    );
  }, [pageType, pathname, providerContent]);

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);

  // إرجاع المحتوى المغلف بالحماية من الأخطاء
  return errorBoundaryContent;
});

ProviderComposer.displayName = 'ProviderComposer';
