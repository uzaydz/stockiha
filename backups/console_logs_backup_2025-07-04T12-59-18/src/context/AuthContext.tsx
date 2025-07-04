import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { getOrganizationBySubdomain } from '@/lib/api/tenant';
import { getCacheData, setCacheData, LONG_CACHE_TTL, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';
import { withCache } from '@/lib/cache/storeCache';
import { getCurrentUserProfile, getCurrentUserProfileWithAgent } from '@/lib/api/users';
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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: Error | null }>;
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
      } else {
        setSession(newSession);
        setUser(newUser);
        if (newSession && newUser) {
          saveAuthState(newSession, newUser);
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

  // دالة تحديث البيانات
  const refreshData = useCallback(async () => {
    console.log('🔄 [AuthContext] refreshData بدء التنفيذ:', { hasUser: !!user, hasSession: !!session });
    
    if (!user || !session) {
      console.log('❌ [AuthContext] لا يوجد مستخدم أو جلسة:', { user: !!user, session: !!session });
      return;
    }

    setIsLoading(true);
    
    try {
      // مسح cache localStorage لضمان جلب البيانات الطازجة
      localStorage.removeItem('current_user_profile');
      localStorage.removeItem('current_organization');
      
      let profile = await getCurrentUserProfile();

      // إضافة بيانات وكيل مركز الاتصال إذا كان موجوداً
      if (profile) {
        profile = await addCallCenterAgentData(profile);
      }
      
      setUserProfile(profile as UserProfile);
      
      // حفظ في localStorage للمرات القادمة
      if (profile) {
        localStorage.setItem('current_user_profile', JSON.stringify(profile));
      }

      if (profile?.organization_id) {
        const org = await getOrganizationById(profile.organization_id);
        setOrganization(org);
        
        // حفظ في localStorage للمرات القادمة
        if (org) {
          localStorage.setItem('current_organization', JSON.stringify(org));
        }
      } else {
        setOrganization(null);
        localStorage.removeItem('current_organization');
      }
    } catch (error) {
      await signOutAndClearState();
    } finally {
      setIsLoading(false);
    }
  }, [user, session, signOutAndClearState]);

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

  useEffect(() => {

    // إضافة مراقب لتغيير visibility الصفحة مع debouncing
    const handleVisibilityChange = () => {
      const now = Date.now();
      const wasVisible = pageVisibilityRef.current;
      const isVisible = !document.hidden;
      
      // تجنب logging المتكرر إذا لم يتغير شيء
      if (wasVisible === isVisible) {
        return;
      }
      
      pageVisibilityRef.current = isVisible;
      lastVisibilityChangeRef.current = now;
      
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const initialize = async () => {
      // منع التهيئة المتعددة المتزامنة
      if (isInitializingRef.current) {
        return;
      }
      
      isInitializingRef.current = true;

      // إذا كانت هناك جلسة وبيانات مستخدم محفوظة، تحقق من صحتها
      if (savedAuthState.session && savedAuthState.user) {
        try {
          // التحقق من صحة الجلسة المحفوظة
          const isValid = await validateSessionPeriodically(savedAuthState.session);
          if (isValid) {
            // الجلسة صحيحة، إذا كان لدينا profile محفوظ، نوقف التحميل
            if (savedUserData.userProfile) {
              setIsLoading(false);
            } else {
              // إذا لم يكن لدينا profile، نجلبه في الخلفية
              refreshData();
            }
            setHasInitialSessionCheck(true);
          } else {
            updateAuthState(null, null, true);
            setIsLoading(false);
            setHasInitialSessionCheck(true);
          }
        } catch (error) {
          updateAuthState(null, null, true);
          setIsLoading(false);
          setHasInitialSessionCheck(true);
        }
      } else {
        setIsLoading(true);
      }

      // 1. Set up the listener with enhanced deduplication
      const client = await getSupabaseClient();
      const { data: { subscription } } = client.auth.onAuthStateChange((event, newSession) => {
        const sessionId = newSession?.access_token?.slice(-10) || null;
        const now = Date.now();
        
        // تحسين نظام التحقق من التكرار مع مراعاة page visibility
        if (lastEventRef.current) {
          const { event: lastEvent, sessionId: lastSessionId, timestamp: lastTimestamp } = lastEventRef.current;
          
          // التحقق من أن الحدث لم يحدث بسبب page focus
          const timeSinceVisibilityChange = now - lastVisibilityChangeRef.current;
          const isRecentVisibilityChange = timeSinceVisibilityChange < 2000; // خلال ثانيتين من تغيير visibility
          
          // للأحداث SIGNED_IN: تجاهل التكرار لنفس الجلسة خلال 5 ثوانِ أو إذا كان بسبب page focus
          if (event === 'SIGNED_IN' && lastEvent === 'SIGNED_IN' && lastSessionId === sessionId) {
            if ((now - lastTimestamp) < 5000 || isRecentVisibilityChange) {
              return;
            }
          }
          
          // للأحداث الأخرى: تجاهل التكرار خلال ثانية واحدة
          if (lastEvent === event && lastSessionId === sessionId && (now - lastTimestamp) < 1000) {
            return;
          }
        }

        // حفظ الحدث الحالي بعد التحقق
        lastEventRef.current = { event, sessionId, timestamp: now };

        // إلغاء المعالجة السابقة
        if (authEventTimeoutRef.current) {
          clearTimeout(authEventTimeoutRef.current);
          authEventTimeoutRef.current = null;
        }

        // معالجة فورية للأحداث الهامة، مع debouncing للأحداث المتكررة فقط
        const processEvent = () => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // للأحداث SIGNED_IN: تحقق إضافي من تغيير البيانات الفعلي
            if (event === 'SIGNED_IN' && session && newSession) {
              // إذا كان نفس access_token، تجاهل المعالجة
              if (session.access_token === newSession.access_token) {
                return;
              }
            }
            
            updateAuthState(newSession, newSession?.user ?? null);
            setIsExplicitSignOut(false);
          } else if (event === 'SIGNED_OUT') {
            if (isExplicitSignOut || (!user && !userProfile)) {
              updateAuthState(null, null, true);
            } else {
              return;
            }
          } else if (event === 'INITIAL_SESSION') {
            if (!isProcessingToken && !savedAuthState.session) {
              updateAuthState(newSession, newSession?.user ?? null);
            }
          }
        };

        // معالجة فورية للأحداث الهامة، debouncing فقط للأحداث المتكررة
        if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          // معالجة فورية للأحداث الحرجة
          processEvent();
          
          // تحديد أن التحقق الأولي من الجلسة تم
          if (event === 'INITIAL_SESSION') {
            setHasInitialSessionCheck(true);
            // إذا لم تكن هناك جلسة، توقف عن التحميل
            if (!newSession) {
              setIsLoading(false);
            }
          }
        } else {
          // debouncing قصير للأحداث الأخرى (50ms)
          authEventTimeoutRef.current = setTimeout(() => {
            processEvent();
            // تحديد أن التحقق الأولي من الجلسة تم
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !hasInitialSessionCheck) {
              setHasInitialSessionCheck(true);
            }
          }, 50);
        }
      });

      // 2. Check for a session transfer token in the URL.
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');

      if (authToken) {
        setIsProcessingToken(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          const { session: decodedSession } = JSON.parse(atob(authToken));
          if (decodedSession) {
            const { data, error } = await client.auth.setSession({
              access_token: decodedSession.access_token,
              refresh_token: decodedSession.refresh_token,
            });

            if (error) {
              setIsProcessingToken(false);
              await signOutAndClearState();
            } else if (data.session && data.user) {
              updateAuthState(data.session, data.user);
            } else {
              setIsProcessingToken(false);
              await signOutAndClearState();
            }
          }
        } catch (error) {
          setIsProcessingToken(false);
          await signOutAndClearState();
        }
              } else {
        // 3. If no token, استخدم البيانات المحفوظة بدلاً من استدعاء getSession مباشرة
        if (!savedAuthState.session) {
          // لا توجد جلسة محفوظة، استدعي getSession مرة واحدة فقط
          try {
            const { data: { session: initialSession } } = await client.auth.getSession();
            
            if (!initialSession) {
              // لا توجد جلسة
              setIsLoading(false);
              setHasInitialSessionCheck(true);
            } else {
              // وجدت جلسة في Supabase
              updateAuthState(initialSession, initialSession.user);
              setHasInitialSessionCheck(true);
            }
          } catch (error) {
            setIsLoading(false);
            setHasInitialSessionCheck(true);
          }
        } else {
          // لدينا جلسة محفوظة، لا نحتاج لاستدعاء getSession
          // الـ onAuthStateChange listener سيتولى التحقق من صحتها
          setHasInitialSessionCheck(true);
          setIsLoading(false);
        }
      }

        // إنهاء التهيئة
        isInitializingRef.current = false;

      return () => {
        isInitializingRef.current = false;
        subscription.unsubscribe();
        if (authEventTimeoutRef.current) {
          clearTimeout(authEventTimeoutRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    initialize();
      }, []); // Empty dependencies - run only once on mount

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
            console.warn('فشل في تحميل بيانات المؤسسة:', orgError);
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
      console.warn('خطأ في تحميل بيانات المستخدم:', error);
      
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

  // useEffect محسن مع debouncing قوي
  useEffect(() => {
    // إضافة debouncing لمنع الاستدعاءات المتكررة
    const timeoutId = setTimeout(() => {
      fetchUserData();
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
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
