/**
 * تصدير جميع مكونات smart-wrapper المنفصلة
 */

// المكونات الأساسية
export { CoreInfrastructureWrapper } from './CoreInfrastructureWrapper';
export { I18nSEOWrapper } from './I18nSEOWrapper';
export { PageTypeDetector } from './PageTypeDetector';
export { ProviderComposer } from './ProviderComposer';

export { SmartWrapperCore } from './SmartWrapperCore';

// Custom Hooks
export { 
  useMemoizedProviderConfig,
  usePageTypeDetection,
  useProviderComposition
} from './hooks';

// Utility Functions
export { 
  debounce,
  throttle,
  measurePerformance,
  loadWithPriority
} from './utils';

// Constants
export { 
  PERFORMANCE_CONSTANTS,
  DOMAIN_CONSTANTS,
  PAGE_TYPE_CONSTANTS,
  EVENT_CONSTANTS
} from './constants';
