/**
 * ثوابت AuthContext
 */

// Default Organization ID (يمكن تعديله حسب المشروع)
export const DEFAULT_ORGANIZATION_ID = 'aacf0931-91aa-4da3-94e6-eef5d8956443';

// Main Domain Detection
export const MAIN_DOMAINS = ['www.ktobi.online', 'ktobi.online'] as const;

// Development Domains
export const DEV_DOMAINS = ['localhost', '127.0.0.1'] as const;

// Cache Keys (مكملة للموجودة في types)
export const STORAGE_KEYS = {
  // Auth specific
  AUTH_STATE: 'bazaar_auth_state',
  AUTH_USER: 'bazaar_auth_user',
  AUTH_SESSION: 'bazaar_auth_session',
  
  // User specific
  USER_PROFILE_PREFIX: 'user_profile_',
  USER_DATA_CACHE: 'user_data_cache_',
  
  // Organization specific
  ORGANIZATION_PREFIX: 'organization_',
  ORGANIZATION_CACHE: 'organization_cache_',
  
  // Session specific
  SESSION_CACHE: 'auth_session_cache',
  LAST_LOGIN_REDIRECT: 'lastLoginRedirect',
  LOGIN_REDIRECT_COUNT: 'loginRedirectCount',
  
  // Performance tracking
  PERFORMANCE_METRICS: 'auth_performance_metrics',
  LAST_VISIBILITY_CHANGE: 'last_visibility_change',
} as const;

// Error Messages
export const AUTH_ERROR_MESSAGES = {
  NETWORK_ERROR: 'خطأ في الاتصال بالشبكة',
  INVALID_CREDENTIALS: 'بيانات الدخول غير صحيحة',
  SESSION_EXPIRED: 'انتهت صلاحية الجلسة',
  USER_NOT_FOUND: 'المستخدم غير موجود',
  ORGANIZATION_NOT_FOUND: 'المؤسسة غير موجودة',
  PERMISSION_DENIED: 'ليس لديك صلاحية للوصول',
  TIMEOUT: 'انتهت مهلة الطلب',
  VALIDATION_FAILED: 'فشل في التحقق من البيانات',
  CACHE_ERROR: 'خطأ في نظام التخزين المؤقت',
  UNKNOWN_ERROR: 'خطأ غير معروف',
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 1000, // 1 ثانية
  VERY_SLOW_OPERATION: 3000, // 3 ثوانٍ
  CACHE_HIT_TARGET: 0.8, // 80% cache hit rate
  API_CALL_LIMIT: 10, // max API calls per minute
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 ثانية
  EXPONENTIAL_BACKOFF: true,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_PERFORMANCE_TRACKING: true,
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development',
  ENABLE_CACHE: true,
  ENABLE_SESSION_VALIDATION: true,
  ENABLE_AUTO_REFRESH: true,
} as const;

// Auth Timeouts (من types/auth.ts)
export const AUTH_TIMEOUTS = {
  USER_CACHE_DURATION: 5 * 60 * 1000, // 5 دقائق
  SESSION_CACHE_DURATION: 10 * 60 * 1000, // 10 دقائق
  PROFILE_CACHE_DURATION: 10 * 60 * 1000, // 10 دقائق
  LOADING_TIMEOUT: 8000, // 8 ثوانٍ
  DEBOUNCE_DELAY: 500, // 0.5 ثانية
  VISIBILITY_DELAY: 30000, // 30 ثانية
} as const;
