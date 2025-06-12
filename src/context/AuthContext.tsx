import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { getOrganizationBySubdomain } from '@/lib/api/tenant';
import { getCacheData, setCacheData, LONG_CACHE_TTL, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';
import { withCache } from '@/lib/cache/storeCache';
import { getCurrentUserProfile } from '@/lib/api/users';
import { setUserContext, setTag } from '../sentry';
import { getOrganizationById } from '@/lib/api/organization';

// Define Json type if not available from Supabase directly
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// Define a basic UserProfile type. Replace with a more specific one if available.
export interface UserProfile {
  id: string;
  role: string;
  permissions?: Json;
  organization_id: string;
  // Add other profile fields as needed
  [key: string]: any; // Allow other properties
}

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

// أضافة دالة ensureClientReady
const ensureClientReady = async () => {
  try {
    // تحقق من أن supabase متاح
    if (supabase && supabase.auth && typeof supabase.auth.getSession === 'function') {
      return supabase;
    }
    
    // fallback: استخدم getSupabaseClient
    const client = await getSupabaseClient();
    if (client && client.auth && typeof client.auth.getSession === 'function') {
      return client;
    }
    
    throw new Error('Supabase client غير متاح');
  } catch (error) {
    return supabase; // fallback إلى supabase مباشرة
  }
};

// إضافة دوال مساعدة لإدارة حالة المصادقة
const saveAuthState = (session: Session | null, user: SupabaseUser | null, forceDelete: boolean = false) => {
  try {
    if (session && user) {
      const authState = {
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          token_type: session.token_type,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata,
          }
        },
        timestamp: Date.now(),
        lastValidation: Date.now() // إضافة timestamp للتحقق الأخير
      };
      localStorage.setItem('bazaar_auth_state', JSON.stringify(authState));
    } else if (forceDelete) {
      // حذف البيانات فقط إذا طُلب ذلك صراحة (مثل تسجيل الخروج)
      localStorage.removeItem('bazaar_auth_state');
    } else {
    }
  } catch (error) {
  }
};

const loadSavedAuthState = (): { session: Session | null; user: SupabaseUser | null } => {
  try {
    const savedState = localStorage.getItem('bazaar_auth_state');
    if (!savedState) return { session: null, user: null };

    const authState = JSON.parse(savedState);
    
    // تحقق من انتهاء صلاحية الجلسة (مع إضافة 10 دقائق buffer)
    const expiresAt = authState.session?.expires_at;
    if (expiresAt) {
      const expirationTime = expiresAt * 1000; // تحويل إلى milliseconds
      const now = Date.now();
      const bufferTime = 10 * 60 * 1000; // 10 دقائق buffer محسّن
      
      if (now >= (expirationTime - bufferTime)) {
        localStorage.removeItem('bazaar_auth_state');
        return { session: null, user: null };
      }
    }

    // التحقق من أن البيانات المحفوظة لا تتجاوز 24 ساعة
    const savedTimestamp = authState.timestamp || 0;
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    if (Date.now() - savedTimestamp > maxAge) {
      localStorage.removeItem('bazaar_auth_state');
      return { session: null, user: null };
    }

    return {
      session: authState.session as Session,
      user: authState.session.user as SupabaseUser
    };
  } catch (error) {
    localStorage.removeItem('bazaar_auth_state');
    return { session: null, user: null };
  }
};

// دالة مساعدة للتحقق من صحة الجلسة دورياً
const validateSessionPeriodically = async (session: Session | null): Promise<boolean> => {
  if (!session) return false;
  
  try {
    // فحص انتهاء صلاحية التوكن
    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    
    // إذا انتهت الصلاحية أو ستنتهي خلال 5 دقائق
    if (expiresAt && now >= (expiresAt - 5 * 60 * 1000)) {
      
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.refreshSession();
      
      if (error || !data.session) {
        return false;
      }
      
      return true;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // تحميل البيانات المحفوظة كحالة أولية
  const savedAuthState = loadSavedAuthState();
  
  const [session, setSession] = useState<Session | null>(savedAuthState.session);
  const [user, setUser] = useState<SupabaseUser | null>(savedAuthState.user);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(extractSubdomain(window.location.hostname));
  const [isLoading, setIsLoading] = useState(!savedAuthState.session); // إذا كانت هناك جلسة محفوظة، نبدأ بـ false
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const [isExplicitSignOut, setIsExplicitSignOut] = useState(false);

  // References للتحكم في الأحداث المتكررة
  const lastEventRef = useRef<{ event: string; sessionId: string | null; timestamp: number } | null>(null);
  const authEventTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingUserDataRef = useRef(false);
  const initialLoadRef = useRef(true);
  const pageVisibilityRef = useRef<boolean>(true);
  const lastVisibilityChangeRef = useRef<number>(Date.now());
  const isInitializingRef = useRef(false);

  // تحديث حالة المصادقة مع التحقق من التكرار
  const updateAuthState = useCallback((newSession: Session | null, newUser: SupabaseUser | null, clearAll: boolean = false) => {

    // التحقق من التكرار - تجنب تحديث الحالة إذا لم تتغير
    if (!clearAll && session && newSession && user && newUser) {
      if (session.access_token === newSession.access_token && user.id === newUser.id) {
        return;
      }
    }

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
  }, [session, user]);

  // دالة تسجيل الخروج وحذف البيانات
  const signOutAndClearState = useCallback(async () => {
    setIsExplicitSignOut(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
      }
    } catch (error) {
    }
    
    updateAuthState(null, null, true);
  }, [updateAuthState]);

  // دالة تحديث البيانات
  const refreshData = useCallback(async () => {
    if (!user || !session) {
      return;
    }

    setIsLoading(true);
    
    try {
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
      
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

  // تحميل البيانات المحفوظة للـ profile والـ organization
  useEffect(() => {
    if (savedAuthState.session && savedAuthState.user && initialLoadRef.current) {
      
      try {
        // تحميل user profile المحفوظ
        const savedProfile = localStorage.getItem('current_user_profile');
        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          setUserProfile(profile);
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
  }, [savedAuthState.session, savedAuthState.user]);

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

      // إذا كانت هناك جلسة محفوظة، قم بالتحقق من صحتها أولاً
      if (savedAuthState.session) {
        
        try {
          // التحقق من صحة الجلسة المحفوظة
          const isValid = await validateSessionPeriodically(savedAuthState.session);
          if (isValid) {
            // الجلسة صحيحة، يمكن بدء جلب البيانات في الخلفية
            if (savedAuthState.user && !userProfile) {
              refreshData();
            }
          } else {
            updateAuthState(null, null, true);
            setIsLoading(true);
          }
        } catch (error) {
          updateAuthState(null, null, true);
          setIsLoading(true);
        }
      } else {
        setIsLoading(true);
      }

      // 1. Set up the listener with enhanced deduplication
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
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
        } else {
          // debouncing قصير للأحداث الأخرى (50ms)
          authEventTimeoutRef.current = setTimeout(processEvent, 50);
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
            const { data, error } = await supabase.auth.setSession({
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
              } else if (!savedAuthState.session) {
          // 3. If no token and no saved session, check for an existing session in storage.
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          
          if (!initialSession) {
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
      }, [savedAuthState.session]); // فقط الجلسة المحفوظة كـ dependency

  // Effect to fetch user profile and organization with debouncing
  useEffect(() => {
    const fetchUserData = async () => {
      if (user && session) {
        // منع multiple fetches في نفس الوقت
        if (fetchingUserDataRef.current) {
          return;
        }

        // إذا كانت البيانات محملة من localStorage، لا نحتاج لجلبها مرة أخرى فوراً
        if (userProfile && organization && initialLoadRef.current === false) {
          setIsLoading(false);
          return;
        }

        fetchingUserDataRef.current = true;
        setIsLoading(true);
        
        try {
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
          
          // حفظ في localStorage
          if (profile) {
            localStorage.setItem('current_user_profile', JSON.stringify(profile));
          }

          if (profile?.organization_id) {
            const org = await getOrganizationById(profile.organization_id);
            setOrganization(org);
            
            // حفظ في localStorage
            if (org) {
              localStorage.setItem('current_organization', JSON.stringify(org));
            }
          } else {
             setOrganization(null);
             localStorage.removeItem('current_organization');
          }
        } catch (error) {
        } finally {
          setIsLoading(false);
          setIsProcessingToken(false);
          fetchingUserDataRef.current = false;
        }
      } else {
        if (isProcessingToken) {
          return;
        }

        if (!isLoading) return;
        setUserProfile(null);
        setOrganization(null);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, session, isProcessingToken, userProfile, organization]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name: name
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
