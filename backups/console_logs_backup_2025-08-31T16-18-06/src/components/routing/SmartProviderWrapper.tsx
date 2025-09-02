/**
 * 🚀 Smart Provider Wrapper - Simplified Compatibility Layer
 * طبقة توافق مبسطة للنظام الجديد المحسن
 */

import React, { memo } from 'react';
import { SmartProviderWrapper as NewSmartProviderWrapper } from './smart-wrapper';
import type { SmartProviderWrapperProps } from './smart-wrapper';

/**
 * 🔄 Wrapper للتوافق مع النظام القديم - مبسط ومحسن
 */
export const SmartProviderWrapper = memo<SmartProviderWrapperProps>(({ children }) => {
  return (
    <NewSmartProviderWrapper>
      {children}
    </NewSmartProviderWrapper>
  );
});

SmartProviderWrapper.displayName = 'SmartProviderWrapper';

// Essential exports only
export type { SmartProviderWrapperProps };
export type { 
  PageType, 
  ProviderConfig
} from './smart-wrapper';

export { 
  determinePageType,
  PROVIDER_CONFIGS
} from './smart-wrapper';

export default SmartProviderWrapper;
