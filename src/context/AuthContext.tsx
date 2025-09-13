/**
 * AuthContext المحسن - مبسط ومقسم
 * يستخدم المكونات المنفصلة لتحسين الأداء بشكل كبير
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo,
  useRef 
} from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { setCurrentOrganizationId } from '@/lib/requestInterceptor';

// استيراد الأنواع والمكونات المنفصلة
import type { 
  AuthContextType, 
  AuthState, 
  UserProfile, 
  Organization,
  AuthResult 
} from './auth/types';

// استيراد الخدمات
import { authService } from './auth/services/authService';
import { sessionManager } from './auth/services/sessionManager';
import { userDataManager } from './auth/services/userDataManager';
import { subdomainService } from './auth/services/subdomainService';

// استيراد الـ Hooks
import { useAuthSession } from './auth/hooks/useAuthSession';
import { useUserProfile } from './auth/hooks/useUserProfile';
import { useUserOrganization } from './auth/hooks/useUserOrganization';

// استيراد المساعدات
import { 
  loadAuthFromStorage, 
  loadUserDataFromStorage,
  saveAuthToStorage,
  cleanExpiredCache 
} from './auth/utils/authStorage';
import { 
  compareAuthData, 
  debounce 
} from './auth/utils/authHelpers';
import { AUTH_TIMEOUTS } from './auth/constants/authConstants';
import { throttledLog } from '@/lib/utils/duplicateLogger';
import { sessionMonitor, getCurrentSession } from '@/lib/session-monitor';
import { trackPerformance } from '@/lib/performance';

// Cache محسن للجلسة
const sessionCache = new Map<string, { session: Session; timestamp: number }>();
const userCache = new Map<string, { user: SupabaseUser; timestamp: number }>();
const SESSION_CACHE_DURATION = 10 * 60 * 1000; // 10 دقائق
const USER_CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // الحالة الأساسية
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const [isExplicitSignOut, setIsExplicitSignOut] = useState(false);
  const [hasInitialSessionCheck, setHasInitialSessionCheck] = useState(false);
  const [authReady, setAuthReady] = useState(false); // حالة للتأكد من اكتمال فحص المصادقة

  // متغيرات مراقبة تحميل البيانات
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [organizationLoaded, setOrganizationLoaded] = useState(false);
  const [dataLoadingComplete, setDataLoadingComplete] = useState(false);

  // تهيئة الخدمات
  const currentSubdomain = useMemo(() => subdomainService.initialize(), []);
  
  // استخدام الـ Hooks المحسنة
  const { session: hookSession, isValidSession, refreshSession, validateSession } = useAuthSession();
  const { userProfile, isLoading: profileLoading, refetch: refetchProfile } = useUserProfile({
    user,
    enabled: !!user && hasInitialSessionCheck
  });
  const { organization, isLoading: orgLoading, refetch: refetchOrganization } = useUserOrganization({
    userProfile,
    enabled: !!userProfile
  });

  // مراقبة تغيير المؤسسة وتحديث authReady - محسن لإرسال الحدث مرة واحدة فقط
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }

    // تحديث authReady عندما تكون البيانات جاهزة - إرسال الحدث مرة واحدة فقط
    if (userProfile && organization && !profileLoading && !isLoadingProfile && !dataLoadingComplete && !authReady) {
      if (process.env.NODE_ENV === 'development') {
      }
      setDataLoadingComplete(true);
      setAuthReady(true);

      // إرسال حدث لإعلام TenantContext بتحديث المؤسسة - مرة واحدة فقط
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('authOrganizationReady', {
          detail: { organization }
        }));
      }, 50); // تأخير بسيط لضمان اكتمال التحديث
    }
  }, [organization, userProfile, isLoadingProfile, isLoadingOrganization, profileLoading, orgLoading, dataLoadingComplete, authReady]);

  // مراقبة حالة تحميل البيانات وتحديث المتغيرات المناسبة
  useEffect(() => {
    if (user && hasInitialSessionCheck) {
      // بدء تحميل الملف الشخصي
      if (!profileLoaded && !isLoadingProfile && !profileLoading) {
        setIsLoadingProfile(true);
      }
    }
  }, [user, hasInitialSessionCheck, profileLoaded, isLoadingProfile, profileLoading]);

  // تحديث profileLoaded عندما ينتهي تحميل الملف الشخصي
  useEffect(() => {
    if (userProfile && !profileLoading && isLoadingProfile) {
      if (process.env.NODE_ENV === 'development') {
      }
      setProfileLoaded(true);
      setIsLoadingProfile(false);

      // لا نحتاج لإرسال حدث هنا - سيتم إرساله من useEffect الرئيسي
    }
  }, [userProfile, profileLoading, isLoadingProfile]);

  useEffect(() => {
    if (userProfile) {
      // بدء تحميل المؤسسة
      if (!organizationLoaded && !isLoadingOrganization && !orgLoading) {
        setIsLoadingOrganization(true);
      }
    }
  }, [userProfile, organizationLoaded, isLoadingOrganization, orgLoading]);

  // تحديث حالة البيانات المكتملة
  useEffect(() => {
    if (profileLoaded && organizationLoaded && !isLoadingProfile && !isLoadingOrganization) {
      setDataLoadingComplete(true);
    }
  }, [profileLoaded, organizationLoaded, isLoadingProfile, isLoadingOrganization]);

  // الاستماع للأحداث من useUserOrganization - محسن لعدم إرسال حدث متكرر
  useEffect(() => {
    const handleOrganizationLoaded = (event: CustomEvent) => {
      const { organization: loadedOrg } = event.detail;
      if (process.env.NODE_ENV === 'development') {
      }
      setOrganizationLoaded(true);
      setIsLoadingOrganization(false);

      // لا نحتاج لإرسال حدث هنا - سيتم إرساله من useEffect الرئيسي
    };

    window.addEventListener('organizationLoaded', handleOrganizationLoaded as EventListener);

    return () => {
      window.removeEventListener('organizationLoaded', handleOrganizationLoaded as EventListener);
    };
  }, []); // إزالة التبعيات لتجنب إعادة إنشاء المستمع

  // مراجع للتحكم في دورة الحياة ومنع التكرار
  const initializedRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  const initializationInProgressRef = useRef(false);
  const sessionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // دالة مساعدة للحصول على الجلسة من cache
  const getCachedSession = useCallback((userId: string): Session | null => {
    const cached = sessionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < SESSION_CACHE_DURATION) {
      return cached.session;
    }
    return null;
  }, []);

  // دالة مساعدة للحصول على المستخدم من cache
  const getCachedUser = useCallback((userId: string): SupabaseUser | null => {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < USER_CACHE_DURATION) {
      return cached.user;
    }
    return null;
  }, []);

  // دالة مساعدة لحفظ الجلسة في cache
  const cacheSession = useCallback((userId: string, session: Session) => {
    sessionCache.set(userId, { session, timestamp: Date.now() });
  }, []);

  // دالة مساعدة لحفظ المستخدم في cache
  const cacheUser = useCallback((userId: string, user: SupabaseUser) => {
    userCache.set(userId, { user, timestamp: Date.now() });
  }, []);

  /**
   * تحديث حالة المصادقة مع تحسينات
   */
  const updateAuthState = useCallback((
    newSession: Session | null,
    newUser: SupabaseUser | null,
    clearAll: boolean = false
  ) => {
    const startTime = performance.now();

    // منع معالجة متزامنة
    if (isProcessingToken) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    // تحقق من التكرار - مع استثناء للحالات المهمة
    if (!clearAll && !compareAuthData(session, newSession, user, newUser)) {
      trackPerformance('updateAuthState (no change)', startTime);
      return;
    }

    // debouncing ذكي - تجاهل فقط إذا كانت البيانات مختلفة بشكل طفيف
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // إذا كان التحديث مهم (مثل تغيير المستخدم أو الجلسة)، لا نطبق debouncing
    const isImportantUpdate = clearAll ||
      (newUser && user && newUser.id !== user.id) ||
      (newSession && session && newSession.access_token !== session.access_token) ||
      (!newUser && user) || (!newSession && session);

    if (!isImportantUpdate && timeSinceLastUpdate < 500) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    setIsProcessingToken(true);

    try {
      if (clearAll) {
        setSession(null);
        setUser(null);
        setIsExplicitSignOut(true);

        // تنظيف الخدمات
        sessionManager.clearSessionCache();
        userDataManager.clearUserCache();

        // مسح cache
        sessionCache.clear();
        userCache.clear();

        saveAuthToStorage(null, null);
      } else {
        setSession(newSession);
        setUser(newUser);
        setIsExplicitSignOut(false);

        if (newSession && newUser) {
          saveAuthToStorage(newSession, newUser);
          sessionManager.setCachedUser(newUser);

          // حفظ في cache
          cacheSession(newUser.id, newSession);
          cacheUser(newUser.id, newUser);
        }
      }

      lastUpdateRef.current = now;
      trackPerformance('updateAuthState', startTime);

    } finally {
      setTimeout(() => setIsProcessingToken(false), 100);
    }
  }, [session, user, isProcessingToken, cacheSession, cacheUser]);

  /**
   * تحديث إجباري لحالة المصادقة (تجاوز debouncing)
   */
  const forceUpdateAuthState = useCallback((
    newSession: Session | null,
    newUser: SupabaseUser | null,
    clearAll: boolean = false
  ) => {
    const startTime = performance.now();

    if (process.env.NODE_ENV === 'development') {
    }

    setIsProcessingToken(true);

    try {
      if (clearAll) {
        setSession(null);
        setUser(null);
        setIsExplicitSignOut(true);
        // لا نضع authReady هنا - يتم تحديده في مكان آخر

        // تنظيف الخدمات
        sessionManager.clearSessionCache();
        userDataManager.clearUserCache();

        // مسح cache
        sessionCache.clear();
        userCache.clear();

        saveAuthToStorage(null, null);

        // إعادة تعيين متغيرات مراقبة البيانات
        setIsLoadingProfile(false);
        setIsLoadingOrganization(false);
        setProfileLoaded(false);
        setOrganizationLoaded(false);
        setDataLoadingComplete(false);
      } else {
        setSession(newSession);
        setUser(newUser);
        setIsExplicitSignOut(false);
        // لا نضع authReady هنا - يتم تحديده في signIn بعد تحميل البيانات

        if (newSession && newUser) {
          saveAuthToStorage(newSession, newUser);
          sessionManager.setCachedUser(newUser);

          // حفظ في cache
          cacheSession(newUser.id, newSession);
          cacheUser(newUser.id, newUser);
        }
      }

      lastUpdateRef.current = Date.now();
      trackPerformance('forceUpdateAuthState', startTime);

    } finally {
      setTimeout(() => setIsProcessingToken(false), 100);
    }
  }, [cacheSession, cacheUser]);

  /**
   * تهيئة البيانات المحفوظة - محسنة ضد التكرار
   */
  const initializeFromStorage = useCallback(async () => {
    // منع التهيئة المتكررة بشكل أكثر صرامة
    if (initializedRef.current || hasInitialSessionCheck || initializationInProgressRef.current) return;
    
    const startTime = performance.now();

    try {
      initializedRef.current = true; // تعيين مبكر لمنع التكرار
      initializationInProgressRef.current = true;
      
      // تحميل البيانات المحفوظة أولاً (سريع)
      const savedAuth = loadAuthFromStorage();

      if (savedAuth.session && savedAuth.user) {
        // استخدام البيانات المحفوظة للتحميل السريع
        setUser(savedAuth.user);
        setSession(savedAuth.session);

        // حفظ في cache
        cacheSession(savedAuth.user.id, savedAuth.session);
        cacheUser(savedAuth.user.id, savedAuth.user);
        
        setIsLoading(false);
        setHasInitialSessionCheck(true);
        setAuthReady(true); // الآن AuthContext جاهز للاستخدام
        
        if (process.env.NODE_ENV === 'development') {
          throttledLog('✅ [AuthContext] تحميل سريع من البيانات المحفوظة:', savedAuth.user.email);
        }
        
        // التحقق من صحة الجلسة في الخلفية - مع cache
        if (sessionCheckTimeoutRef.current) {
          clearTimeout(sessionCheckTimeoutRef.current);
        }
        
        sessionCheckTimeoutRef.current = setTimeout(async () => {
          try {
            // فحص cache أولاً
            const cachedSession = getCachedSession(savedAuth.user.id);
            if (cachedSession) {
              const isValid = await validateSession();
              if (!isValid) {
                // إذا انتهت صلاحية الجلسة، حاول تجديدها
                const refreshed = await refreshSession();
                if (!refreshed) {
                  setUser(null);
                  setSession(null);
                  setIsLoading(false);
                  setHasInitialSessionCheck(true);
                  
                  // مسح cache
                  sessionCache.delete(savedAuth.user.id);
                  userCache.delete(savedAuth.user.id);
                }
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
            }
          }
        }, 2000); // زيادة من 1000ms إلى 2000ms
        
      } else {

        // إذا كانت صفحة منتج عامة، نتجاوز أي انتظار طويل ونعلن عدم وجود مستخدم بسرعة
        if ((window as any).__PUBLIC_PRODUCT_PAGE__) {
          if (process.env.NODE_ENV === 'development') {
          }
          setUser(null);
          setSession(null);
          setIsLoading(false);
          setHasInitialSessionCheck(true);
          setAuthReady(true); // جاهز للصفحات العامة
          trackPerformance('initializeFromStorage (public-product fast)', startTime);
          return;
        }

        // ⚡ لا توجد بيانات محفوظة - فحص سريع من sessionManager
        // نتحقق من المستخدم أولاً قبل الإعلان عن عدم وجود مستخدم
        if (process.env.NODE_ENV === 'development') {
        }
        
        // فحص سريع (بدون انتظار طويل)
        if (sessionCheckTimeoutRef.current) {
          clearTimeout(sessionCheckTimeoutRef.current);
        }
        
        sessionCheckTimeoutRef.current = setTimeout(async () => {
          try {
            const { user: currentUser, error } = await sessionManager.getCurrentUser();
            
            if (!error && currentUser) {
              // تم العثور على مستخدم
              setUser(currentUser);
              setIsLoading(false);
              setHasInitialSessionCheck(true);
              setAuthReady(true); // الآن جاهز مع المستخدم
              
              // حفظ في cache
              cacheUser(currentUser.id, currentUser);
              
              if (process.env.NODE_ENV === 'development') {
              }
              
              // جلب الجلسة أيضاً - مع cache
              setTimeout(async () => {
                try {
                  const { session } = await sessionManager.getCurrentSession();
                  if (session) {
                    setSession(session);
                    cacheSession(currentUser.id, session);
                  }
                } catch (sessionError) {
                  // تجاهل أخطاء الجلسة
                }
              }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
            } else {
              // لا يوجد مستخدم - الآن يمكن الإعلان عن ذلك بأمان
              setUser(null);
              setSession(null);
              setIsLoading(false);
              setHasInitialSessionCheck(true);
              setAuthReady(true);
              
              trackPerformance('initializeFromStorage (no user)', startTime);
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
            }
            
            setUser(null);
            setSession(null);
            setIsLoading(false);
            setHasInitialSessionCheck(true);
            setAuthReady(true);
          } finally {
            initializationInProgressRef.current = false;
          }
        }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
        
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
      
      setUser(null);
      setSession(null);
      setIsLoading(false);
      setHasInitialSessionCheck(true);
      setAuthReady(true);
      initializationInProgressRef.current = false;
      
      trackPerformance('initializeFromStorage (error)', startTime);
    }
  }, [cacheSession, cacheUser, getCachedSession, validateSession, refreshSession]);

  /**
   * دوال المصادقة المحسنة
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authService.signIn(email, password);

    if (result.success) {
      if (process.env.NODE_ENV === 'development') {
      }

      try {
        // الحصول على المستخدم والجلسة معاً
        const [userResult, sessionResult] = await Promise.all([
          sessionManager.getCurrentUser(),
          sessionManager.getCurrentSession()
        ]);

        if (userResult.user && !userResult.error) {
          // تحديث الحالة الأساسية أولاً
          setUser(userResult.user);
          setSession(sessionResult.session || null);
          setHasInitialSessionCheck(true);

          if (process.env.NODE_ENV === 'development') {
          }

          // انتظار تحميل جميع البيانات قبل إرجاع النتيجة
          try {
            // إعادة تعيين حالة تحميل البيانات
            setIsLoadingProfile(true);
            setIsLoadingOrganization(true);
            setProfileLoaded(false);
            setOrganizationLoaded(false);
            setDataLoadingComplete(false);

            if (process.env.NODE_ENV === 'development') {
            }

            // تحميل البيانات بالتوازي لتوفير الوقت
            const [profileResult, orgResult] = await Promise.all([
              (async () => {
                const result = await refetchProfile();
                setProfileLoaded(true);
                setIsLoadingProfile(false);
                return result;
              })(),
              (async () => {
                const result = await refetchOrganization();
                setOrganizationLoaded(true);
                setIsLoadingOrganization(false);
                return result;
              })()
            ]);

            if (process.env.NODE_ENV === 'development') {
            }

          } catch (dataError) {
            if (process.env.NODE_ENV === 'development') {
            }
            // حتى لو فشل تحميل البيانات الإضافية، نقوم بتنظيف حالة التحميل
            setIsLoadingProfile(false);
            setIsLoadingOrganization(false);
            // لا نضع authReady هنا - سيتم التعامل معه في useEffect
          }

        } else {
          if (process.env.NODE_ENV === 'development') {
          }
          // في حالة فشل الحصول على المستخدم، لا نضع authReady
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
        // في حالة الخطأ، لا نضع authReady
      }
    }

    return result;
  }, [refetchProfile, refetchOrganization]);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<AuthResult> => {
    const result = await authService.signUp(email, password, name, currentSubdomain);
    return result;
  }, [currentSubdomain]);

  const signOut = useCallback(async (): Promise<void> => {

    await authService.signOut();

    // تنظيف الحالة فوراً
    setUser(null);
    setSession(null);
    setIsLoading(false);
    setHasInitialSessionCheck(true);
    setIsExplicitSignOut(true);
    setAuthReady(true); // جاهز بعد تسجيل الخروج

    // إعادة تعيين متغيرات مراقبة البيانات
    setIsLoadingProfile(false);
    setIsLoadingOrganization(false);
    setProfileLoaded(false);
    setOrganizationLoaded(false);
    setDataLoadingComplete(false);

    if (process.env.NODE_ENV === 'development') {
    }
  }, []);

  /**
   * تحديث البيانات
   */
  const refreshData = useCallback(async (): Promise<void> => {
    if (isLoading || isProcessingToken) return;
    
    const startTime = performance.now();
    
    try {
      await Promise.all([
        refetchProfile(),
        refetchOrganization()
      ]);
      
      trackPerformance('refreshData', startTime);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }, [isLoading, isProcessingToken, refetchProfile, refetchOrganization]);

  /**
   * تهيئة عند بدء التشغيل - محسن ومحمي ضد التكرار
   */
  useEffect(() => {
    let mounted = true;
    let initPromise: Promise<void> | null = null;
    
    const initialize = async () => {
      // منع التهيئة المتعددة
      if (!mounted || hasInitialSessionCheck || initializedRef.current || initPromise) {
        return;
      }
      
      initPromise = initializeFromStorage();
      try {
        await initPromise;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
      } finally {
        initPromise = null;
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
      if (initPromise) {
        initPromise = null;
      }
    };
  }, []); // dependency array فارغ - تتم التهيئة مرة واحدة فقط

  /**
   * مزامنة الجلسة مع المراقب الموحد - محسن لمنع الحلقات اللانهائية
   */
  useEffect(() => {
    // ✅ استخدام المراقب الموحد بدلاً من hook منفصل
    const { session: currentSession, isValid } = getCurrentSession();
    
    // فقط إذا كانت الجلسة مختلفة حقاً وليست null
    if (currentSession && currentSession !== session && 
        currentSession.access_token !== session?.access_token) {
      setSession(currentSession);
      
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }, [session?.access_token]); // ✅ تقليل التبعيات

  /**
   * تحديث معرف المؤسسة في المعترض - مع debouncing محسن
   */
  useEffect(() => {
    const currentOrgId = (window as any).__CURRENT_ORG_ID__;
    if (organization?.id && organization.id !== currentOrgId) {
      // debounce محسّن للتحديثات - زيادة من 500ms إلى 2000ms لمنع التحديثات المتكررة
      const timeoutId = setTimeout(() => {
        setCurrentOrganizationId(organization.id);
        (window as any).__CURRENT_ORG_ID__ = organization.id;
        // تخزين كامل بيانات المؤسسة للاستخدام من قبل دوال أخرى
        (window as any).__AUTH_CONTEXT_ORG__ = organization;
        if (process.env.NODE_ENV === 'development') {
        }
      }, 2000); // زيادة التأخير لمنع التحديثات المتكررة

      return () => clearTimeout(timeoutId);
    }
  }, [organization?.id]);

  /**
   * تنظيف cache منتهي الصلاحية دورياً - محسن مع cleanup
   */
  useEffect(() => {
    let cleanupInterval: NodeJS.Timeout | null = null;
    
    // تأخير بسيط لتجنب التداخل مع التهيئة
    const startCleanup = setTimeout(() => {
      cleanupInterval = setInterval(() => {
        try {
          cleanExpiredCache();
          userDataManager.cleanExpiredCache();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
          }
        }
      }, 15 * 60 * 1000); // ✅ زيادة من 10 دقائق إلى 15 دقيقة
    }, 60000); // ✅ زيادة من 30 ثانية إلى دقيقة واحدة

    return () => {
      clearTimeout(startCleanup);
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
    };
  }, []);

  /**
   * تحديد حالة التحميل الذكية - محسنة لتقليل re-renders
   */
  const computedIsLoading = useMemo(() => {
    if (!hasInitialSessionCheck) return true;
    if (isProcessingToken) return true;
    
    // إذا كان هناك مستخدم ولكن لا يوجد userProfile، انتظر قليلاً قبل إظهار التحميل
    if (user && !userProfile && profileLoading) {
      // إذا مر أكثر من ثانيتين على تسجيل الدخول، أظهر التحميل
      const timeSinceAuth = Date.now() - lastUpdateRef.current;
      return timeSinceAuth > 2000;
    }
    
    return false;
  }, [hasInitialSessionCheck, isProcessingToken, user?.id, userProfile?.id, profileLoading]);

  /**
   * قيمة السياق المحسنة - dependencies محسنة لمنع re-renders
   */
  const value = useMemo((): AuthContextType => ({
    // الحالة
    session,
    user,
    userProfile,
    organization,
    currentSubdomain,
    isLoading: computedIsLoading,
    isProcessingToken,
    isExplicitSignOut,
    hasInitialSessionCheck,
    authReady, // حالة للتأكد من جاهزية المصادقة

    // متغيرات مراقبة البيانات الجديدة
    isLoadingProfile,
    isLoadingOrganization,
    profileLoaded,
    organizationLoaded,
    dataLoadingComplete,

    // الأفعال (معظمها مع useCallback ثابت)
    signIn,
    signUp,
    signOut,
    refreshData,
    updateAuthState,
    forceUpdateAuthState, // دالة للتحديث الإجباري
    initialize: initializeFromStorage
  }), [
    // فقط المعرفات والحالات المهمة
    session?.access_token, // بدلاً من session كاملة
    user?.id, // بدلاً من user كامل
    userProfile?.id, // بدلاً من userProfile كامل
    organization?.id, // بدلاً من organization كاملة
    currentSubdomain,
    computedIsLoading,
    isProcessingToken,
    isExplicitSignOut,
    hasInitialSessionCheck,
    authReady, // إضافة authReady للتبعيات

    // متغيرات مراقبة البيانات الجديدة
    isLoadingProfile,
    isLoadingOrganization,
    profileLoaded,
    organizationLoaded,
    dataLoadingComplete,

    // الدوال ثابتة مع useCallback
    signIn,
    signUp,
    signOut,
    refreshData,
    updateAuthState,
    forceUpdateAuthState, // إضافة للتبعيات
    initializeFromStorage
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook محسن لاستخدام السياق
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// تصدير للتوافق مع الإصدار السابق
export type { UserProfile, Organization } from './auth/types';
export { authService, sessionManager, userDataManager, subdomainService } from './auth/services';
export * from './auth/hooks';
