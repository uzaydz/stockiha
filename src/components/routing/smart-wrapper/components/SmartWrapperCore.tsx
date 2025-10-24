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
  
  // حماية من استخدام useLocation خارج Router
  let location;
  try {
    location = useLocation();
  } catch (error) {
    // إذا لم يكن Router جاهزاً، استخدم location افتراضي
    location = { pathname: '/', search: '', hash: '', state: null, key: 'default' };
  }
  
  // تحسين: استخدام useMemo لتجنب إعادة الحساب غير الضرورية
  const pathname = useMemo(() => location.pathname, [location.pathname]);
  
  try { console.log('🧭 [SmartWrapperCore] render start', { pathname }); } catch {}
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  const lastPathname = useRef<string | null>(null);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  
  renderCount.current++;
  
  // 🔥 منع إعادة الرسم المتكررة - سيتم تطبيقه بعد استخدام جميع hooks
  
  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      console.log('🔁 [SmartWrapperCore] already initialized');
      return;
    }
    
    // منع التشغيل المتوازي
    if (initializationPromiseRef.current) {
      return;
    }
    
    initializationPromiseRef.current = (async () => {
      try {
        console.time('⏱️ [SmartWrapperCore] init');
        isInitialized.current = true;
      } finally {
        console.timeEnd('⏱️ [SmartWrapperCore] init');
        initializationPromiseRef.current = null;
      }
    })();
  }, []);

  // 🔄 تنظيف عند تغيير المسار
  useEffect(() => {
    if (lastPathname.current !== pathname) {
      console.log('➡️ [SmartWrapperCore] pathname changed', { from: lastPathname.current, to: pathname });
      lastPathname.current = pathname;
    }
  }, [pathname]);

  // تحديد نوع الصفحة والـ providers المطلوبة
  const { pageType, config } = useMemo(() => {
    const newPageType = determinePageType(pathname);
    console.log('🧩 [SmartWrapperCore] determinePageType', { pathname, pageType: newPageType });
    
    // التحقق من التغييرات
    if (lastPathname.current === pathname && isInitialized.current) {
      return { pageType: newPageType, config: PROVIDER_CONFIGS[newPageType] || PROVIDER_CONFIGS.minimal };
    }

    return { pageType: newPageType, config: PROVIDER_CONFIGS[newPageType] || PROVIDER_CONFIGS.minimal };
  }, [pathname]);

  // 🌐 Infrastructure content - محسن
  const infrastructureContent = useMemo(() => {
    // Choose minimal wrapper for public store routes to avoid SupabaseProvider at bootstrap
    // إزالة 'public-product' لأنه يحتاج الآن AuthProvider للسلة
    const minimalTypes = new Set([
      'public-store', 'landing', 'thank-you', 'minimal', 'max-store'
    ]);
    const Wrapper = minimalTypes.has(pageType as any) ? MinimalCoreInfrastructureWrapper : CoreInfrastructureWrapper;
    console.log('🏗️ [SmartWrapperCore] choosing wrapper', { pageType, wrapper: minimalTypes.has(pageType as any) ? 'minimal' : 'core' });

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

// مقارنة مخصصة لمنع إعادة الرسم غير الضرورية
const areEqual = (prevProps: SmartWrapperCoreProps, nextProps: SmartWrapperCoreProps) => {
  // مقارنة الأطفال فقط - إذا لم يتغيروا، لا تعيد الرسم
  return prevProps.children === nextProps.children;
};

export default React.memo(SmartWrapperCore, areEqual);
