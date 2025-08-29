import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase';
import { getOrganizationBySubdomain } from '@/lib/api/tenant';
import { getCacheData, setCacheData, LONG_CACHE_TTL, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';
import { withCache } from '@/lib/cache/storeCache';
import { getCurrentUserProfile, getCurrentUserProfileWithAgent } from '@/lib/api/users';
import { ensureUserOrganizationLink } from '@/lib/api/auth-helpers';
import { setUserContext, setTag } from '../sentry';
import { getOrganizationById } from '@/lib/api/organization';
import { setCurrentOrganizationId } from '@/lib/requestInterceptor';
import { 
  loadAuthFromStorage, 
  saveAuthToStorage, 
  loadUserDataFromStorage, 
  saveUserDataToStorage,
  clearAuthStorage,
  validateStoredData 
} from '@/lib/utils/auth-storage';
import { authSingleton } from '@/lib/authSingleton';
import { authProxy } from '@/lib/auth-proxy';
import type { Database } from '@/types/database.types';

// Use the complete User type from the database types with call center extensions
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
export type Json = Database['public']['Tables']['users']['Row']['permissions'];

export interface Organization {
  id: string;
  name: string;
  [key: string]: any;
}

export interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  userProfile: UserProfile | null;
  organization: Organization | null;
  currentSubdomain: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: Error | null; needsOrganizationSetup?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error: Error | null }>;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// تحديد ما إذا كان النطاق هو النطاق الرئيسي
const isMainDomain = (hostname: string): boolean => {
  // اعتبار www.ktobi.online هو النطاق الرئيسي
  return hostname === 'www.ktobi.online' || hostname === 'ktobi.online';
};

// استخراج النطاق الفرعي من اسم المضيف (مع تخزين النتيجة)
const extractSubdomain = (hostname: string) => {
  // استخدام قيمة مخزنة محليًا لمنع الاستدعاءات المتكررة
  const cachedSubdomain = sessionStorage.getItem('bazaar_current_subdomain');
  if (cachedSubdomain) {
    return cachedSubdomain === 'null' ? null : cachedSubdomain;
  }

  let subdomain = null;
  
  // خاص بـ localhost: التعامل مع النطاقات الفرعية في بيئة التطوير
  if (hostname.includes('localhost')) {
    // مثال: mystore.localhost:8080 يجب أن تعطي "mystore"
    const parts = hostname.split('.');
    if (parts.length > 1) {
      subdomain = parts[0];
      
    } else {
      
    }
  } 
  // التعامل مع عناوين IP المحلية
  else if (hostname.match(/^127\.\d+\.\d+\.\d+$/) || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    
  } 
  // اختبار ما إذا كان النطاق الرئيسي
  else if (isMainDomain(hostname)) {
    
  } 
  // تقسيم اسم المضيف إلى أجزاء
  else {
    const hostParts = hostname.split('.');
    
    // إذا كان لدينا أكثر من جزئين، الجزء الأول هو النطاق الفرعي
    if (hostParts.length > 2) {
      subdomain = hostParts[0];

      // لا نعتبر 'www' كنطاق فرعي حقيقي
      if (subdomain === 'www') {
        
        subdomain = null;
      }
    }
  }
  
  // حفظ النتيجة في التخزين لتجنب إعادة الحساب
  sessionStorage.setItem('bazaar_current_subdomain', subdomain === null ? 'null' : subdomain);
  return subdomain;
};

// دالة لتحديد معرف المؤسسة الافتراضية للنطاق الرئيسي
const getDefaultOrganizationId = (): string | null => {
  // محاولة استخدام معرف المؤسسة من التخزين المحلي
  const storedOrgId = localStorage.getItem('bazaar_organization_id');
  if (storedOrgId) {
    
    return storedOrgId;
  }
  
  // إذا كنا على النطاق الرئيسي وليس لدينا معرف مخزن
  // هنا يمكننا تعيين معرف افتراضي أو استراتيجية أخرى
  const defaultOrgId = 'aacf0931-91aa-4da3-94e6-eef5d8956443'; // استبدل بمعرف المؤسسة الصحيح
  
  return defaultOrgId;
};

// أضافة دالة مساعدة لـ ensureClientReady
const ensureClientReady = async () => {
  try {
    // استخدام getSupabaseClient للحصول على الـ unified client
    const client = await getSupabaseClient();
    if (client && client.auth && typeof client.auth.getSession === 'function') {
      return client;
    }
    
    throw new Error('Supabase client غير متاح');
  } catch (error) {
    // fallback: استخدم getSupabaseClient مرة أخرى
    return await getSupabaseClient();
  }
};

// إضافة دوال مساعدة لإدارة حالة المصادقة
const saveAuthState = (session: Session | null, user: SupabaseUser | null, forceDelete: boolean = false) => {
  if (forceDelete || (!session && !user)) {
    clearAuthStorage();
  } else {
    saveAuthToStorage(session, user);
  }
};

// استخدام الأدوات الجديدة لتحميل البيانات المحفوظة
const loadSavedAuthState = (): { session: Session | null; user: SupabaseUser | null } => {
  return loadAuthFromStorage();
};

// دالة مساعدة للتحقق من صحة الجلسة دورياً
const validateSessionPeriodically = async (session: Session | null): Promise<boolean> => {
  if (!session) return false;
  
  try {
    // فحص انتهاء صلاحية التوكن
    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    
    // إذا انتهت الصلاحية فعلياً
    if (expiresAt && now >= expiresAt) {
      return false;
    }
    
    // إذا ستنتهي خلال 5 دقائق، جرب تجديد الجلسة
    if (expiresAt && now >= (expiresAt - 5 * 60 * 1000)) {
      try {
        const client = await getSupabaseClient();
        const { data, error } = await client.auth.refreshSession();
        
        if (error || !data.session) {
          // إذا فشل التجديد، لكن الجلسة لم تنته بعد، اتركها
          return expiresAt > now;
        }
        
        return true;
      } catch (refreshError) {
        // إذا فشل التجديد، لكن الجلسة لم تنته بعد، اتركها
        return expiresAt > now;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// دالة للتحقق من وإضافة بيانات وكيل مركز الاتصال
const addCallCenterAgentData = async (userProfile: UserProfile): Promise<UserProfile> => {
  if (!userProfile?.id) return userProfile;

  // مؤقتاً تعطيل استعلام call_center_agents لحل مشاكل التحديث
  return userProfile;

  /*

  try {
    // التحقق من وجود بيانات وكيل مركز الاتصال
    const { data: agentData, error } = await supabase
      .from('call_center_agents')
      .select('id, assigned_regions, assigned_stores, max_daily_orders, is_available, is_active, performance_metrics, specializations, work_schedule')
      .eq('user_id', userProfile.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && agentData) {
      const updatedProfile = {
        ...userProfile,
        call_center_agent_id: agentData.id,
        assigned_regions: agentData.assigned_regions,
        assigned_stores: agentData.assigned_stores,
        max_daily_orders: agentData.max_daily_orders,
        is_call_center_available: agentData.is_available,
        is_call_center_active: agentData.is_active,
        call_center_performance_metrics: agentData.performance_metrics,
        specializations: agentData.specializations,
        work_schedule: agentData.work_schedule
      };
      return updatedProfile;
    }
  } catch (error) {
  }

  return userProfile;
  */
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // تحميل البيانات المحفوظة كحالة أولية (مرة واحدة فقط)
  const savedAuthState = useMemo(() => {
    const state = loadSavedAuthState();
    return state;
  }, []); // Empty dependency array = run only once

  // تحميل البيانات من localStorage أيضاً
  const savedUserData = useMemo(() => {
    return loadUserDataFromStorage();
  }, []);
  
  const [session, setSession] = useState<Session | null>(savedAuthState.session);
  const [user, setUser] = useState<SupabaseUser | null>(savedAuthState.user);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(savedUserData.userProfile);
  const [organization, setOrganization] = useState<Organization | null>(savedUserData.organization);
  const [currentSubdomain] = useState<string | null>(extractSubdomain(window.location.hostname));
  const [isLoading, setIsLoading] = useState(!savedAuthState.session && !savedAuthState.user); // إذا كان لدينا بيانات محفوظة، نبدأ بـ false
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const [isExplicitSignOut, setIsExplicitSignOut] = useState(false);
  const [hasInitialSessionCheck, setHasInitialSessionCheck] = useState(false);

  // References للتحكم في الأحداث المتكررة
  const lastEventRef = useRef<{ event: string; sessionId: string | null; timestamp: number } | null>(null);
  const authEventTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingUserDataRef = useRef(false);
  const initialLoadRef = useRef(true);
  const pageVisibilityRef = useRef<boolean>(true);
  const authCacheCleanupRef = useRef<(() => void) | null>(null);
  const lastVisibilityChangeRef = useRef<number>(Date.now());
  const isInitializingRef = useRef(false);
  // إضافة كاش محسن للمستخدم لمنع الاستدعاءات المتكررة
  const userCacheRef = useRef<{ user: SupabaseUser | null; timestamp: number } | null>(null);
  const USER_CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
  // إضافة كاش في sessionStorage لمنع الاستدعاءات المتكررة عند تحديث الصفحة
  const SESSION_CACHE_KEY = 'auth_user_cache';
  const SESSION_CACHE_DURATION = 10 * 60 * 1000; // 10 دقائق

  // دالة للحصول من sessionStorage
  const getFromSessionStorage = () => {
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.timestamp && parsed.user) {
          const now = Date.now();
          if ((now - parsed.timestamp) < SESSION_CACHE_DURATION) {
            return parsed.user;
          }
        }
      }
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
    return null;
  };

  // دالة للحفظ في sessionStorage
  const saveToSessionStorage = (user: SupabaseUser | null) => {
    try {
      const cacheData = {
        user,
        timestamp: Date.now()
      };
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  };

  // تحديث حالة المصادقة مع التحقق المحسن من التكرار
  const updateAuthState = useCallback((newSession: Session | null, newUser: SupabaseUser | null, clearAll: boolean = false) => {
    // منع معالجة متزامنة
    if (isProcessingToken) {
      return;
    }

    // تحقق فائق من التكرار مع مقارنة شاملة
    if (!clearAll && session && newSession && user && newUser) {
      const isSameSession = (
        session.access_token === newSession.access_token &&
        session.refresh_token === newSession.refresh_token &&
        session.expires_at === newSession.expires_at
      );
      const isSameUser = (
        user.id === newUser.id &&
        user.email === newUser.email &&
        user.updated_at === newUser.updated_at
      );
      
      if (isSameSession && isSameUser) {
        return;
      }
    }

    // إضافة debouncing لمنع التحديثات السريعة المتكررة
    const now = Date.now();
    if (lastEventRef.current && (now - lastEventRef.current.timestamp) < 100) {
      return;
    }

    setIsProcessingToken(true);

    try {
      if (clearAll) {
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setOrganization(null);
        saveAuthState(null, null, true);
        // مسح البيانات الإضافية
        localStorage.removeItem('current_user_profile');
        localStorage.removeItem('current_organization');
        // مسح كاش المستخدم
        userCacheRef.current = null;
        try {
          sessionStorage.removeItem(SESSION_CACHE_KEY);
        } catch (error) {
          // تجاهل أخطاء sessionStorage
        }
      } else {
        setSession(newSession);
        setUser(newUser);
        if (newSession && newUser) {
          saveAuthState(newSession, newUser);
          // حفظ في كاش المستخدم
          userCacheRef.current = {
            user: newUser,
            timestamp: now
          };
          // حفظ في sessionStorage
          saveToSessionStorage(newUser);
        }
      }

      // تحديث مرجع آخر حدث
      lastEventRef.current = {
        event: clearAll ? 'clear' : 'update',
        sessionId: newSession?.access_token?.substring(0, 10) || null,
        timestamp: now
      };
    } finally {
      // تأخير إعادة تعيين flag للسماح بمعالجة العمليات التابعة
      setTimeout(() => setIsProcessingToken(false), 50);
    }
  }, [session, user, isProcessingToken]);

  // دالة محسنة لجلب المستخدم مع كاش
  const getUserWithCache = useCallback(async (): Promise<{ user: SupabaseUser | null; error: any }> => {
    const now = Date.now();
    
    // التحقق من sessionStorage أولاً (يبقى بعد تحديث الصفحة)
    const sessionCached = getFromSessionStorage();
    if (sessionCached) {
      return { user: sessionCached, error: null };
    }
    
    // التحقق من كاش المستخدم
    if (userCacheRef.current && (now - userCacheRef.current.timestamp) < USER_CACHE_DURATION) {
      // حفظ في sessionStorage أيضاً
      saveToSessionStorage(userCacheRef.current.user);
      return { user: userCacheRef.current.user, error: null };
    }
    
    // منع الطلبات المتكررة
    if (isProcessingToken) {
      // انتظار انتهاء المعالجة الحالية
      return new Promise((resolve) => {
        const checkProcessing = () => {
          if (!isProcessingToken) {
            // إعادة المحاولة بعد انتهاء المعالجة
            getUserWithCache().then(resolve);
          } else {
            setTimeout(checkProcessing, 50);
          }
        };
        checkProcessing();
      });
    }
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // حفظ في كاش الذاكرة
      userCacheRef.current = {
        user,
        timestamp: now
      };
      
      // حفظ في sessionStorage
      saveToSessionStorage(user);
      
      return { user, error };
    } catch (error) {
      return { user: null, error };
    }
  }, [isProcessingToken, getFromSessionStorage, saveToSessionStorage]);

  // دالة التهيئة المحسنة
  const initialize = useCallback(async () => {
    if (isInitializingRef.current) {
      return;
    }
    
    isInitializingRef.current = true;
    
    try {
      // التحقق من sessionStorage أولاً
      const sessionCached = getFromSessionStorage();
      if (sessionCached) {
        // تحديث حالة المصادقة من الكاش
        updateAuthState(session, sessionCached);
        
        // جلب بيانات المستخدم الإضافية من localStorage إذا كانت متوفرة
        try {
          const userProfileData = localStorage.getItem('current_user_profile');
          const orgData = localStorage.getItem('current_organization');
          
          if (userProfileData) {
            const enhancedProfile = await addCallCenterAgentData(JSON.parse(userProfileData));
            setUserProfile(enhancedProfile);
          }
          
          if (orgData) {
            setOrganization(JSON.parse(orgData));
          }
        } catch (error) {
        }
        
        setIsLoading(false);
        setHasInitialSessionCheck(true);
        isInitializingRef.current = false;
        return;
      }
      
      // استخدام الدالة المحسنة مع الكاش
      const { user: currentUser, error: userError } = await getUserWithCache();
      
      if (userError) {
      }
      
      if (currentUser) {
        // تحديث حالة المصادقة
        updateAuthState(session, currentUser);
        
        // جلب بيانات المستخدم الإضافية - منع التكرار
        if (!fetchingUserDataRef.current) {
          fetchingUserDataRef.current = true;
          
          try {
            // التحقق من كاش بيانات المستخدم
            const userProfileCacheKey = `user_profile_${currentUser.id}`;
            const cachedProfile = localStorage.getItem(userProfileCacheKey);
            const now = Date.now();
            const CACHE_DURATION = 10 * 60 * 1000; // 10 دقائق
            
            if (cachedProfile) {
              try {
                const parsed = JSON.parse(cachedProfile);
                if (parsed.timestamp && (now - parsed.timestamp) < CACHE_DURATION) {
                  const enhancedProfile = await addCallCenterAgentData(parsed.data);
                  setUserProfile(enhancedProfile);
                  localStorage.setItem('current_user_profile', JSON.stringify(enhancedProfile));
                  fetchingUserDataRef.current = false;
                  return;
                }
              } catch (error) {
                // تجاهل أخطاء parsing
              }
            }
            
            // جلب بيانات المستخدم من قاعدة البيانات
            const { data: userProfileData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', currentUser.id)
              .single();
            
            if (profileError) {
            } else if (userProfileData) {
              const enhancedProfile = await addCallCenterAgentData(userProfileData);
              setUserProfile(enhancedProfile);
              
              // حفظ في localStorage مع timestamp
              localStorage.setItem('current_user_profile', JSON.stringify(enhancedProfile));
              localStorage.setItem(userProfileCacheKey, JSON.stringify({
                data: userProfileData,
                timestamp: now
              }));
            }
            
            // جلب بيانات المؤسسة - منع التكرار
            const defaultOrgId = getDefaultOrganizationId();
            if (defaultOrgId) {
              // التحقق من كاش بيانات المؤسسة
              const orgCacheKey = `organization_${defaultOrgId}`;
              const cachedOrg = localStorage.getItem(orgCacheKey);
              
              if (cachedOrg) {
                try {
                  const parsed = JSON.parse(cachedOrg);
                  if (parsed.timestamp && (now - parsed.timestamp) < CACHE_DURATION) {
                    setOrganization(parsed.data);
                    localStorage.setItem('current_organization', JSON.stringify(parsed.data));
                    fetchingUserDataRef.current = false;
                    return;
                  }
                } catch (error) {
                  // تجاهل أخطاء parsing
                }
              }
              
              const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', defaultOrgId)
                .single();
              
              if (orgError) {
              } else if (orgData) {
                setOrganization(orgData);
                
                // حفظ في localStorage مع timestamp
                localStorage.setItem('current_organization', JSON.stringify(orgData));
                localStorage.setItem(orgCacheKey, JSON.stringify({
                  data: orgData,
                  timestamp: now
                }));
              }
            }
          } catch (error) {
          } finally {
            fetchingUserDataRef.current = false;
          }
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
      setHasInitialSessionCheck(true);
      isInitializingRef.current = false;
    }
  }, [session, updateAuthState, getUserWithCache, addCallCenterAgentData]);

  // دالة تسجيل الخروج وحذف البيانات
  const signOutAndClearState = useCallback(async () => {
    setIsExplicitSignOut(true);
    
    try {
      const client = await getSupabaseClient();
      const { error } = await client.auth.signOut();
      if (error) {
      } else {
      }
    } catch (error) {
    }
    
    // تنظيف cache المصادقة
    authSingleton.clearAuth();
    
    updateAuthState(null, null, true);
  }, [updateAuthState]);

  // دالة تحديث البيانات المحسنة
  const refreshData = useCallback(async () => {
    if (fetchingUserDataRef.current) {
      return;
    }

    fetchingUserDataRef.current = true;

    try {
      // التحقق من sessionStorage أولاً
      const sessionCached = getFromSessionStorage();
      if (sessionCached) {
        // تحديث حالة المصادقة من الكاش
        updateAuthState(session, sessionCached);
        
        // جلب بيانات المستخدم الإضافية من localStorage إذا كانت متوفرة
        try {
          const userProfileData = localStorage.getItem('current_user_profile');
          const orgData = localStorage.getItem('current_organization');
          
          if (userProfileData) {
            const enhancedProfile = await addCallCenterAgentData(JSON.parse(userProfileData));
            setUserProfile(enhancedProfile);
          }
          
          if (orgData) {
            setOrganization(JSON.parse(orgData));
          }
        } catch (error) {
        }
        
        fetchingUserDataRef.current = false;
        return;
      }
      
      // استخدام الدالة المحسنة مع الكاش
      const { user: currentUser, error: userError } = await getUserWithCache();
      
      if (userError) {
        return;
      }

      if (currentUser) {
        // تحديث حالة المصادقة
        updateAuthState(session, currentUser);

        // جلب بيانات المستخدم الإضافية
        try {
          // جلب بيانات المستخدم من قاعدة البيانات
          const { data: userProfileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          if (profileError) {
          } else if (userProfileData) {
            const enhancedProfile = await addCallCenterAgentData(userProfileData);
            setUserProfile(enhancedProfile);
            
            // حفظ في localStorage
            localStorage.setItem('current_user_profile', JSON.stringify(enhancedProfile));
          }
          
          // جلب بيانات المؤسسة - فقط إذا لم تكن متوفرة
          const defaultOrgId = getDefaultOrganizationId();
          if (defaultOrgId && (!organization || organization.id !== defaultOrgId)) {
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', defaultOrgId)
              .single();
            
            if (orgError) {
            } else if (orgData) {
              setOrganization(orgData);
              localStorage.setItem('current_organization', JSON.stringify(orgData));
            }
          }
        } catch (error) {
        }
      }
    } catch (error) {
    } finally {
      fetchingUserDataRef.current = false;
    }
  }, [getUserWithCache, updateAuthState, session, getFromSessionStorage]);

  // تحديث organization ID في المعترض عندما يتغير organization
  useEffect(() => {
    if (organization?.id) {
      setCurrentOrganizationId(organization.id);
    }
  }, [organization]);

  // إعداد اشتراك في AuthSingleton
  useEffect(() => {
    const subscriptionId = authSingleton.subscribe((authData) => {
      // تحديث الحالة عند تغيير بيانات المصادقة من AuthSingleton
      if (authData.session !== session || authData.user !== user) {
        updateAuthState(authData.session, authData.user);
      }
    });

    authCacheCleanupRef.current = () => {
      authSingleton.unsubscribe(subscriptionId);
    };

    return () => {
      if (authCacheCleanupRef.current) {
        authCacheCleanupRef.current();
      }
    };
  }, []);

  // تحميل البيانات المحفوظة للـ profile والـ organization
  useEffect(() => {
    if (savedAuthState.session && savedAuthState.user && initialLoadRef.current) {
      
      try {
        // تحميل user profile المحفوظ
        const savedProfile = localStorage.getItem('current_user_profile');
        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          setUserProfile(profile as UserProfile);
          
          // إذا كان لدينا profile محفوظ، قلل من وقت التحميل
          if (hasInitialSessionCheck) {
            setIsLoading(false);
          }
        }

        // تحميل organization المحفوظة
        const savedOrg = localStorage.getItem('current_organization');
        if (savedOrg) {
          const org = JSON.parse(savedOrg);
          setOrganization(org);
        }
      } catch (error) {
      }
      
      initialLoadRef.current = false;
    }
  }, [savedAuthState.session, savedAuthState.user, hasInitialSessionCheck]);

  // تحسين useEffect للتهيئة
  useEffect(() => {
    if (hasInitialSessionCheck || isInitializingRef.current) {
      return;
    }

    // إضافة تأخير قصير لتجنب الاستدعاءات المتكررة
    const timeoutId = setTimeout(() => {
      initialize();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasInitialSessionCheck, initialize]);

  // تحسين useEffect لمراقبة تغيير visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const wasHidden = !pageVisibilityRef.current;
      pageVisibilityRef.current = !document.hidden;
      lastVisibilityChangeRef.current = now;

      // إذا عادت الصفحة للظهور بعد غياب طويل، تحديث البيانات
      if (wasHidden && !document.hidden && user) {
        const timeSinceLastVisibilityChange = now - lastVisibilityChangeRef.current;
        if (timeSinceLastVisibilityChange > 30000) { // أكثر من 30 ثانية
          // استخدام الدالة المحسنة مع الكاش
          getUserWithCache().then(({ user: currentUser }) => {
            if (currentUser && currentUser.id !== user?.id) {
              updateAuthState(session, currentUser);
            }
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, session, updateAuthState, getUserWithCache]);

  // تحديث AuthContext للتعامل مع مشكلة إعادة التوجيه عند تحديث الصفحة
  useEffect(() => {
    // إضافة timeout للتأكد من أن التحميل لا يستمر إلى ما لا نهاية
    const loadingTimeout = setTimeout(() => {
      if (isLoading && !user && !isProcessingToken && hasInitialSessionCheck) {
        setIsLoading(false);
      }
    }, 3000); // 3 ثوانٍ كحد أقصى للتحميل

    return () => clearTimeout(loadingTimeout);
  }, [isLoading, user, isProcessingToken, hasInitialSessionCheck]);

  // تحديد قيمة isLoading بشكل ذكي مع تحسينات الأداء
  useEffect(() => {
    // إذا كان لدينا user وuserProfile، توقف عن التحميل
    if (user && userProfile && userProfile.id === user.id && hasInitialSessionCheck) {
      if (isLoading) {
        setIsLoading(false);
      }
    }
    // إذا لم يكن هناك user بعد التحقق الأولي، توقف عن التحميل
    else if (!user && hasInitialSessionCheck && !isProcessingToken) {
      if (isLoading) {
        setIsLoading(false);
      }
    }
    // إذا كان لدينا user فقط (بدون profile) وقد تم الفحص الأولي، نحتاج للانتظار قليلاً
    else if (user && (!userProfile || userProfile.id !== user.id) && hasInitialSessionCheck && !isProcessingToken && !fetchingUserDataRef.current) {
      // إعطاء وقت محدود لتحميل ال profile
      const profileTimeout = setTimeout(() => {
        if (!userProfile || userProfile.id !== user.id) {
          setIsLoading(false);
        }
      }, 3000); // 3 ثواني

      return () => clearTimeout(profileTimeout);
    }
  }, [user?.id, userProfile?.id, hasInitialSessionCheck, isProcessingToken, isLoading]);

  // Cache لمنع التحميل المتكرر مع TTL
  const userDataCacheRef = useRef<{
    userId: string;
    timestamp: number;
    data: { userProfile: UserProfile; organization: Organization | null };
  } | null>(null);

  // دالة fetchUserData محسنة مع cache وdebouncing قوي
  const fetchUserData = useCallback(async () => {
    if (!user || !session) {
      // إذا لم يكن هناك user أو session، امسح البيانات فقط إذا كانت موجودة
      if ((userProfile || organization) && !isProcessingToken) {
        setUserProfile(null);
        setOrganization(null);
      }
      if (isLoading && !isProcessingToken) {
        setIsLoading(false);
      }
      return;
    }

    // منع multiple fetches في نفس الوقت أو للمستخدم نفسه
    if (fetchingUserDataRef.current) {
      return;
    }

    // التحقق من cache صالح (5 دقائق)
    const now = Date.now();
    if (userDataCacheRef.current && 
        userDataCacheRef.current.userId === user.id && 
        (now - userDataCacheRef.current.timestamp) < 5 * 60 * 1000) {
      
      if (!userProfile || userProfile.id !== user.id) {
        setUserProfile(userDataCacheRef.current.data.userProfile);
      }
      if (!organization && userDataCacheRef.current.data.organization) {
        setOrganization(userDataCacheRef.current.data.organization);
      }
      setIsLoading(false);
      return;
    }

    // إذا كانت البيانات محملة بالفعل ومطابقة للمستخدم الحالي
    if (userProfile && userProfile.id === user.id && 
        (!userProfile.organization_id || organization)) {
      setIsLoading(false);
      return;
    }

    // استخدام البيانات المحفوظة كنقطة بداية سريعة
    if (savedUserData.userProfile && 
        savedUserData.userProfile.id === user.id && 
        !userProfile) {
      setUserProfile(savedUserData.userProfile);
      if (savedUserData.organization && 
          savedUserData.organization.id === savedUserData.userProfile.organization_id) {
        setOrganization(savedUserData.organization);
      }
      setIsLoading(false);
      return;
    }

    // بدء عملية تحميل جديدة مع حماية من التكرار
    fetchingUserDataRef.current = true;
    setIsLoading(true);
    
    try {
      // استخدام timeout للحماية من التعليق
      const profilePromise = getCurrentUserProfile();
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 8000)
      );
      
      let profile = await Promise.race([profilePromise, timeoutPromise]);
      
      if (profile) {
        profile = await addCallCenterAgentData(profile);
        setUserProfile(profile as UserProfile);
        
        let org = null;
        if (profile.organization_id) {
          try {
            org = await getOrganizationById(profile.organization_id);
            setOrganization(org);
          } catch (orgError) {
            setOrganization(null);
          }
        } else {
          setOrganization(null);
        }
        
        // حفظ في cache محلي
        userDataCacheRef.current = {
          userId: user.id,
          timestamp: now,
          data: { userProfile: profile, organization: org }
        };
        
        // حفظ في localStorage
        saveUserDataToStorage(profile, org, profile.organization_id);
      }
    } catch (error) {
      
      // استخدام البيانات المحفوظة عند الخطأ
      if (savedUserData.userProfile && savedUserData.userProfile.id === user.id) {
        setUserProfile(savedUserData.userProfile);
        if (savedUserData.organization) {
          setOrganization(savedUserData.organization);
        }
      }
    } finally {
      setIsLoading(false);
      setIsProcessingToken(false);
      fetchingUserDataRef.current = false;
    }
  }, [user?.id, session?.access_token, isProcessingToken, userProfile?.id, organization?.id, savedUserData]);

  // useEffect محسن مع منع تام للطلبات المكررة
  useEffect(() => {
    // تجنب استدعاء fetchUserData إذا:
    // 1. نحن في منتصف عملية تسجيل دخول
    // 2. لدينا مستخدم ومؤسسة بالفعل
    // 3. نحن في منتصف معالجة token
    if (isLoading || fetchingUserDataRef.current || isProcessingToken) {
      return;
    }
    
    // إذا كان لدينا user و organization، لا نحتاج fetchUserData
    if (user && organization && userProfile) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [AuthContext] البيانات متوفرة، تخطي fetchUserData');
      }
      return;
    }
    
    // إضافة debouncing قوي لمنع الاستدعاءات المتكررة
    const timeoutId = setTimeout(() => {
      // فحص مرة أخيرة قبل الاستدعاء
      if (!isLoading && !fetchingUserDataRef.current && !isProcessingToken) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [AuthContext] استدعاء fetchUserData مع debouncing');
        }
        fetchUserData();
      }
    }, 500); // 500ms للسماح لعمليات أخرى بالاكتمال

    return () => clearTimeout(timeoutId);
  }, [fetchUserData, isLoading, isProcessingToken, user, organization, userProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error };
      }

      if (data.session && data.user) {
        // التحقق من ربط المستخدم بالمؤسسة أولاً
        const linkResult = await ensureUserOrganizationLink(data.user.id);
        
        if (!linkResult.success) {
          // إذا كان المستخدم غير مرتبط بمؤسسة، إرجاع خطأ محدد
          return { 
            success: false, 
            error: new Error(linkResult.error || 'فشل في ربط المستخدم بالمؤسسة'),
            needsOrganizationSetup: linkResult.error?.includes('غير مرتبط بأي مؤسسة')
          };
        }
        
        // تطهير أي بيانات مخزنة مؤقتاً قبل تحديث الحالة
        sessionStorage.removeItem('lastLoginRedirect');
        sessionStorage.removeItem('loginRedirectCount');
        
        // تحديث الحالة مع التأكد من تحميل الصلاحيات
        if (data.user) {
          const basicUserData = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email || '',
            role: data.user.user_metadata?.role || 'user',
            organization_id: data.user.user_metadata?.organization_id || null,
            auth_user_id: data.user.id,
            is_active: data.user.user_metadata?.is_active !== false,
            permissions: data.user.user_metadata?.permissions || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          updateAuthState(data.session, basicUserData);
          setIsExplicitSignOut(false);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [AuthContext] تسجيل دخول ناجح مع الصلاحيات:', {
              role: basicUserData.role,
              permissions: basicUserData.permissions,
              is_active: basicUserData.is_active
            });
          }
        }
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name: name,
            role: currentSubdomain ? 'customer' : 'user' // تحديد الدور بناءً على النطاق الفرعي
          }
        }
      });
      
      if (error) {
        setIsLoading(false);
        return { success: false, error };
      }
      
      if (data.session && data.user) {
        updateAuthState(data.session, data.user);
      }
      
      return { success: true, error: null };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: error as Error };
    }
  };

  const signOut = useCallback(async () => {
    await signOutAndClearState();
  }, [signOutAndClearState]);

  const value = useMemo(() => ({
    session,
    user,
    userProfile,
    organization,
    currentSubdomain,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshData,
  }), [session, user, userProfile, organization, currentSubdomain, isLoading, signIn, signUp, signOut, refreshData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
