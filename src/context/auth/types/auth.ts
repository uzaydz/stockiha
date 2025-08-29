/**
 * أنواع وواجهات AuthContext المحسن
 * منفصل لتحسين الأداء وسهولة الصيانة
 */

import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// User Profile مع دعم مركز الاتصال
export type UserProfile = Database['public']['Tables']['users']['Row'] & {
  // إضافة معلومات مركز الاتصال
  call_center_agent_id?: string;
  assigned_regions?: string[];
  assigned_stores?: string[];
  max_daily_orders?: number;
  is_call_center_available?: boolean;
  is_call_center_active?: boolean;
  call_center_performance_metrics?: any;
  specializations?: string[];
  work_schedule?: any;
  [key: string]: any; // Allow other properties
};

// Organization type
export interface Organization {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  domain?: string;
  subdomain?: string;
  subscription_tier?: string;
  subscription_status?: string;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
  [key: string]: any;
}

// Auth State
export interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  userProfile: UserProfile | null;
  organization: Organization | null;
  currentSubdomain: string | null;
  isLoading: boolean;
  isProcessingToken: boolean;
  isExplicitSignOut: boolean;
  hasInitialSessionCheck: boolean;
  authReady: boolean; // حالة للتأكد من اكتمال فحص المصادقة الأولي

  // متغيرات مراقبة تحميل البيانات
  isLoadingProfile: boolean;
  isLoadingOrganization: boolean;
  profileLoaded: boolean;
  organizationLoaded: boolean;
  dataLoadingComplete: boolean;
}

// Auth Actions
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateAuthState: (session: Session | null, user: SupabaseUser | null, clearAll?: boolean) => void;
  forceUpdateAuthState: (session: Session | null, user: SupabaseUser | null, clearAll?: boolean) => void;
  initialize: () => Promise<void>;
}

// Auth Result
export interface AuthResult {
  success: boolean;
  error: Error | null;
  needsOrganizationSetup?: boolean;
}

// Auth Context Type
export interface AuthContextType extends AuthState, AuthActions {}

// Cache Types
export interface UserCacheItem {
  user: SupabaseUser | null;
  timestamp: number;
}

export interface UserDataCacheItem {
  userId: string;
  timestamp: number;
  data: {
    userProfile: UserProfile;
    organization: Organization | null;
  };
}

export interface SessionCacheItem {
  user: SupabaseUser | null;
  timestamp: number;
}

// Storage Types
export interface StoredAuthData {
  session: Session | null;
  user: SupabaseUser | null;
}

export interface StoredUserData {
  userProfile: UserProfile | null;
  organization: Organization | null;
}

// Event Types
export interface AuthEvent {
  event: string;
  sessionId: string | null;
  timestamp: number;
}

// Performance Metrics
export interface AuthPerformanceMetrics {
  initializeTime: number;
  fetchUserDataTime: number;
  signInTime: number;
  signOutTime: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  errorCount: number;
}

// Service Options
export interface AuthServiceOptions {
  enableCache?: boolean;
  cacheTimeout?: number;
  enablePerformanceTracking?: boolean;
  enableDebugLogging?: boolean;
}

// Validation Options
export interface ValidationOptions {
  validateSession?: boolean;
  validateUser?: boolean;
  validateOrganization?: boolean;
  strict?: boolean;
}

// Error Types
export interface AuthError extends Error {
  code?: string;
  type?: 'NETWORK' | 'VALIDATION' | 'AUTH' | 'PERMISSION' | 'TIMEOUT';
  context?: Record<string, any>;
}

// Hook Return Types
export interface UseAuthSessionReturn {
  session: Session | null;
  isValidSession: boolean;
  refreshSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
}

export interface UseUserProfileReturn {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: AuthError | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
}

export interface UseUserOrganizationReturn {
  organization: Organization | null;
  isLoading: boolean;
  error: AuthError | null;
  refetch: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<boolean>;
}

export interface UseAuthCacheReturn {
  clearCache: () => void;
  clearUserCache: () => void;
  clearSessionCache: () => void;
  getCacheStats: () => {
    userCacheSize: number;
    sessionCacheSize: number;
    lastCleanup: number;
  };
}

export interface UseAuthPerformanceReturn {
  metrics: AuthPerformanceMetrics;
  resetMetrics: () => void;
  logMetric: (key: keyof AuthPerformanceMetrics, value: number) => void;
  startTimer: (operation: string) => void;
  endTimer: (operation: string) => number;
  logCacheHit: () => void;
  logCacheMiss: () => void;
  logApiCall: () => void;
  logError: () => void;
  getCacheHitRate: () => number;
  getPerformanceReport: () => any;
}

// Constants
export const AUTH_CACHE_KEYS = {
  USER_CACHE: 'auth_user_cache',
  SESSION_CACHE: 'auth_session_cache',
  PERFORMANCE: 'auth_performance_metrics',
  SUBDOMAIN: 'bazaar_current_subdomain',
  ORGANIZATION_ID: 'bazaar_organization_id',
  USER_PROFILE: 'current_user_profile',
  ORGANIZATION: 'current_organization',
} as const;

export const AUTH_EVENTS = {
  SIGN_IN: 'auth:sign_in',
  SIGN_OUT: 'auth:sign_out',
  SESSION_REFRESH: 'auth:session_refresh',
  PROFILE_UPDATE: 'auth:profile_update',
  ORGANIZATION_CHANGE: 'auth:organization_change',
  ERROR: 'auth:error',
} as const;

// Type Guards
export const isAuthError = (error: any): error is AuthError => {
  return error instanceof Error && 'type' in error;
};

export const isValidSession = (session: Session | null): session is Session => {
  if (!session) return false;
  
  const now = Date.now();
  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  
  return expiresAt > now;
};

export const isValidUserProfile = (profile: any): profile is UserProfile => {
  return profile && typeof profile === 'object' && 'id' in profile;
};

export const isValidOrganization = (org: any): org is Organization => {
  return org && typeof org === 'object' && 'id' in org && 'name' in org;
};
