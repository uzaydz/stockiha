/**
 * 🪝 Custom Hooks for Smart Wrapper
 * الـ hooks المخصصة لـ Smart Wrapper
 */

import { useMemo } from 'react';

/**
 * Hook لتحسين تكوين المزودين
 */
export const useMemoizedProviderConfig = (config: any) => {
  return useMemo(() => config, [config]);
};

/**
 * Hook لتحسين اكتشاف نوع الصفحة
 */
export const usePageTypeDetection = (pathname: string, earlyPageType: string | null) => {
  return useMemo(() => {
    if (earlyPageType) {
      return earlyPageType;
    }
    
    // استيراد ديناميكي لتحسين الأداء
    const { determinePageType } = require('../utils');
    return determinePageType(pathname);
  }, [earlyPageType, pathname]);
};

/**
 * Hook لتحسين تكوين المزودين
 */
export const useProviderComposition = (
  config: any,
  pageType: string,
  pathname: string,
  children: React.ReactNode
) => {
  return useMemo(() => ({
    config,
    pageType,
    pathname,
    children
  }), [config, pageType, pathname, children]);
};
