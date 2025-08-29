/**
 * ملف index موحد لجميع مكونات AuthContext المحسن
 * نقطة وصول واحدة لكامل النظام
 */

// تصدير المكونات الرئيسية
export { AuthProvider, useAuth } from './AuthContext.optimized';

// تصدير الأنواع
export type {
  UserProfile,
  Organization,
  AuthState,
  AuthActions,
  AuthResult,
  AuthContextType,
  AuthError,
  UseAuthSessionReturn,
  UseUserProfileReturn,
  UseUserOrganizationReturn,
  UseAuthPerformanceReturn
} from './types';

// تصدير الخدمات
export {
  authService,
  sessionManager,
  userDataManager,
  subdomainService
} from './services';

// تصدير الـ Hooks
export {
  useAuthSession,
  useUserProfile,
  useUserOrganization
} from './hooks';

// تصدير الأدوات
export {
  saveAuthToStorage,
  loadAuthFromStorage,
  clearAuthStorage,
  saveUserDataToStorage,
  loadUserDataFromStorage,
  isMainDomain,
  extractSubdomain,
  getDefaultOrganizationId,
  validateSession,
  createAuthError,
  handleAuthError,
  trackPerformance,
  debounce,
  throttle,
  retryOperation
} from './utils';

// تصدير الثوابت
export {
  AUTH_TIMEOUTS,
  DEFAULT_ORGANIZATION_ID,
  MAIN_DOMAINS,
  STORAGE_KEYS,
  AUTH_ERROR_MESSAGES,
  PERFORMANCE_THRESHOLDS,
  RETRY_CONFIG,
  FEATURE_FLAGS
} from './constants/authConstants';

// تصدير من types
export {
  AUTH_CACHE_KEYS,
  AUTH_EVENTS
} from './types';

// دالة سريعة للتهيئة
export const initializeAuthSystem = () => {
  // تهيئة الخدمات
  subdomainService.initialize();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ تم تهيئة نظام AuthContext المحسن');
  }
};

// دالة للحصول على تقرير الأداء

