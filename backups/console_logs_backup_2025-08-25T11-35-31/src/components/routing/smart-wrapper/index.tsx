/**
 * 🚀 Smart Provider Wrapper - Main Entry Point
 * النقطة الرئيسية المحسنة والمبسطة للـ Provider الذكي
 * يستخدم المكونات المنفصلة لتحسين الأداء
 */

import React, { memo } from 'react';
import { SmartWrapperCore } from './components';
import type { SmartProviderWrapperProps } from './types';

/**
 * 🚀 Main Smart Provider Wrapper Component
 * المكون الرئيسي المحسن والمبسط
 */
export const SmartProviderWrapper = memo<SmartProviderWrapperProps>(({ children }) => {
  return (
    <SmartWrapperCore>
      {children}
    </SmartWrapperCore>
  );
});

SmartProviderWrapper.displayName = 'SmartProviderWrapper';

/**
 * 📊 Type Exports
 */
export type { 
  PageType, 
  ProviderConfig, 
  SmartProviderWrapperProps,
  PerformanceMetrics,
  DomainInfo
} from './types';

/**
 * 🛠️ Utility Exports
 */
export { 
  determinePageType,
  extractDomainInfo,
  getPageTypeResult
} from './utils';

/**
 * ⚙️ Configuration Exports
 */
export { 
  PROVIDER_CONFIGS,
  PERFORMANCE_CONFIG,
  PLATFORM_DOMAINS
} from './constants';

// Default export for backward compatibility
export default SmartProviderWrapper;
