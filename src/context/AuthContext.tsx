import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase';
import { getOrganizationBySubdomain } from '@/lib/api/tenant';
import { getCacheData, setCacheData, LONG_CACHE_TTL, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';
import { withCache } from '@/lib/cache/storeCache';
import { getCurrentUserProfile } from '@/lib/api/users';
import { setUserContext, logError, setTag } from '../sentry';

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
  // Add other profile fields as needed
  [key: string]: any; // Allow other properties
}

export interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  userProfile: UserProfile | null;
  isLoadingUserProfile: boolean;
  organization: {
    id: string;
    name: string;
    subscription_tier: string;
    subscription_status: string;
    subscription_id: string | null;
    created_at: string;
  } | null;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    error: Error | null;
  }>;
  signUp: (email: string, password: string, name: string) => Promise<{
    success: boolean;
    error: Error | null;
  }>;
  signOut: () => Promise<void>;
  loading: boolean;
  isLoadingOrganization: boolean;
  isTenant: boolean;
  currentSubdomain: string | null;
  refreshOrganizationData: () => Promise<boolean>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState<boolean>(true);
  const [isTenant, setIsTenant] = useState(false);
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(() => 
    extractSubdomain(window.location.hostname)
  );
  const [organization, setOrganization] = useState<AuthContextType['organization']>(null);
  
  useEffect(() => {
    // console.log("AuthContext initialized");
  }, []);

  // Load User Profile - Depends on user.id now
  useEffect(() => {
    const loadUserProfile = async () => {
      const currentUserId = user?.id; // Get the ID

      if (currentUserId) {
        setIsLoadingUserProfile(true);
        const cacheKey = `user_profile:${currentUserId}`;
        try {
          const profile = await withCache<UserProfile | null>(
            cacheKey,
            async () => {
              // getCurrentUserProfile internally uses supabase.auth.getUser(), 
              // which should be in sync with the `user` state from onAuthStateChange
              const fetchedProfile = await getCurrentUserProfile(); 
              return fetchedProfile as UserProfile | null;
            },
            DEFAULT_CACHE_TTL, 
            true 
          );
          setUserProfile(profile);
        } catch (error) {
          console.error("Error loading user profile:", error);
          setUserProfile(null); 
        } finally {
          setIsLoadingUserProfile(false);
        }
      } else {
        setUserProfile(null);
        // If there's no user, profile is not loading, or already loaded as null.
        // Set to false to ensure any loading indicators are hidden.
        setIsLoadingUserProfile(false); 
      }
    };

    loadUserProfile();
  }, [user?.id]); // Dependency changed to user?.id

  // تحسين وظيفة تحميل بيانات المؤسسة باستخدام useCallback والتخزين المؤقت
  const loadOrganizationData = useCallback(async (subdomain: string | null) => {
    setIsLoadingOrganization(true);
    const cacheKey = subdomain 
      ? `organization_auth_context:${subdomain}`
      : `organization_auth_context:default`;
    
    try {
      const orgDetails = await withCache<AuthContextType['organization'] | null>(
        cacheKey,
        async () => {
          const supabaseClient = await getSupabaseClient();
          let organizationData: any = null; 

          if (!subdomain) {
            const defaultOrgId = getDefaultOrganizationId();
            if (defaultOrgId) {
              const { data, error } = await supabaseClient
                .from('organizations')
                .select('id, name, subscription_tier, subscription_status, created_at')
                .eq('id', defaultOrgId)
                .single();
              if (!error && data) {
                organizationData = data;
                localStorage.setItem('bazaar_organization_id', data.id);
              } else if (error && error.code !== 'PGRST116') {
                console.error('خطأ في جلب المؤسسة الافتراضية:', error);
              }
            }
          } else {
            const { data, error } = await supabaseClient
              .from('organizations')
              .select('id, name, subscription_tier, subscription_status, created_at')
              .eq('subdomain', subdomain)
              .single();
            if (!error && data) {
              organizationData = data;
              localStorage.setItem('bazaar_organization_id', data.id);
            } else if (error && error.code !== 'PGRST116') {
              console.error('خطأ في جلب بيانات المؤسسة باستخدام النطاق الفرعي:', error);
            }
          }

          if (!organizationData) {
            const storedOrgId = localStorage.getItem('bazaar_organization_id');
            if (storedOrgId) {
              const { data, error } = await supabaseClient
                .from('organizations')
                .select('id, name, subscription_tier, subscription_status, created_at')
                .eq('id', storedOrgId)
                .single();
              if (!error && data) {
                organizationData = data;
              } else if (error && error.code !== 'PGRST116') {
                console.error('خطأ في جلب بيانات المؤسسة من التخزين المحلي ID:', error);
              }
            }
          }

          if (organizationData) {
            let subscription_id = null;
            try {
              const { data: subscriptionData } = await supabaseClient
                .from('organization_subscriptions')
                .select('id')
                .eq('organization_id', organizationData.id)
                .eq('status', 'active')
                .limit(1)
                .single();
              if (subscriptionData) {
                subscription_id = subscriptionData.id;
              }
            } catch (e: any) { 
              if (e?.code !== 'PGRST116') {
                console.error('Error fetching subscription for org:', e);
              }
            }
            
            return {
              id: organizationData.id,
              name: organizationData.name,
              subscription_tier: organizationData.subscription_tier || 'free',
              subscription_status: organizationData.subscription_status || 'inactive',
              subscription_id: subscription_id,
              created_at: organizationData.created_at
            };
          }
          return null; 
        },
        LONG_CACHE_TTL, 
        true
      );

      if (orgDetails) {
        setOrganization(orgDetails);
        setIsTenant(true);
      } else {
        setOrganization(null);
        setIsTenant(false);
      }
      return !!orgDetails;
    } catch (error) {
      console.error("Error in loadOrganizationData:", error);
      setOrganization(null);
      setIsTenant(false);
      return false;
    } finally {
      setIsLoadingOrganization(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true); // Set loading true when this effect runs
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting initial session state:", error);
          // Potentially set user/session to null explicitly if error indicates auth failure
        }
        // Update session and user states once after getting the initial session.
        // onAuthStateChange will handle subsequent changes.
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (error) {
        console.error("Critical error in getInitialSession:", error);
      } finally {
        // setLoading(false); // Defer this to onAuthStateChange INITIAL_SESSION or first SIGNED_IN
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Update user and session state based on auth events
        setSession(session);
        setUser(session?.user ?? null);

        // Handle organization loading based on event and session state
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          // INITIAL_SESSION is crucial for setting loading(false) after the first auth check
          if (loading && (event === 'INITIAL_SESSION' || session?.user)) {
             setLoading(false);
          }
          await loadOrganizationData(currentSubdomain);
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null); // Clear profile on sign out
          await loadOrganizationData(currentSubdomain); // Re-check org for public view
          if (loading) setLoading(false); // Also handle if initial load results in signed out
        }
        // If there's no session at all on initial check, ensure loading is false.
        if (event === 'INITIAL_SESSION' && !session && loading) {
            setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrganizationData, currentSubdomain]); // Removed loading from here as it caused loop
  
  // تنفيذ التحقق من النطاق الفرعي مرة واحدة فقط
  useEffect(() => {
    let isActive = true;
    
    const validateSubdomain = async () => {
      if (!currentSubdomain || !isActive) return;
      
      
      if (currentSubdomain) {
        try {
          
          const organization = await getOrganizationBySubdomain(currentSubdomain);
          
          
          // If the subdomain doesn't exist, redirect to the main domain
          // Only redirect if we're in production and not on localhost
          if (!organization && !window.location.hostname.includes('localhost')) {
            
            
            // Only redirect if not in the middle of a login flow
            // Check if current path is not login or auth related
            const authPaths = ['/login', '/signup', '/tenant/signup', '/auth'];
            const currentPath = window.location.pathname;
            const isAuthPath = authPaths.some(path => currentPath.startsWith(path));
            
            // Check for redirect loop and prevent it
            const lastRedirectTime = sessionStorage.getItem('lastSubdomainRedirect');
            const currentTime = Date.now();
            
            // If we've redirected in the last 10 seconds, don't redirect again
            if (lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 10000) {
              
              return;
            }
            
            if (!isAuthPath) {
              // Store the redirect time to prevent loops
              sessionStorage.setItem('lastSubdomainRedirect', currentTime.toString());
              window.location.href = `${window.location.protocol}//${window.location.hostname.split('.').slice(1).join('.')}`;
            } else {
              
            }
          }
        } catch (error) {
          console.error('خطأ في التحقق من صحة النطاق الفرعي:', error);
        }
      }
    };

    if (currentSubdomain) {
      validateSubdomain();
    }

    return () => {
      isActive = false;
    };
  }, [currentSubdomain]);

  // تحميل بيانات المؤسسة مرة واحدة عند تعيين النطاق الفرعي
  useEffect(() => {
    let isActive = true;
    
    // تحميل بيانات المؤسسة فقط بعد تعيين النطاق الفرعي وعند تغييره
    const loadOrgData = async () => {
      if (!isActive) return;
      await loadOrganizationData(currentSubdomain);
    };
    
    loadOrgData();
    
    return () => {
      isActive = false;
    };
  }, [currentSubdomain, loadOrganizationData]);

  // تحسين وظائف المصادقة باستخدام useCallback لمنع إعادة الإنشاء غير الضرورية
  const refreshOrganizationData = useCallback(async (): Promise<boolean> => {
    const success = await loadOrganizationData(currentSubdomain);
    return success;
  }, [loadOrganizationData, currentSubdomain]);

  // تحديث معلومات المستخدم في Sentry
  useEffect(() => {
    if (user && userProfile) {
      setUserContext({
        id: user.id,
        email: user.email,
        role: userProfile.role,
      });
      
      if (organization) {
        setTag('organization_id', organization.id);
        setTag('organization_name', organization.name);
        setTag('subscription_tier', organization.subscription_tier);
      }
    } else {
      setUserContext(null);
    }
  }, [user, userProfile, organization]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoadingOrganization(true); // Indicate loading process starts
    setLoading(true); 
    try {
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      const supabaseClient = await getSupabaseClient();
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        logError(error, { 
          action: 'signIn',
          email 
        });
        return { success: false, error };
      }
      // onAuthStateChange will handle setting user, session, and loading states.
      // It will also trigger loadOrganizationData and loadUserProfile indirectly.
      return { success: true, error: null };
    } catch (error) {
      logError(error as Error, { 
        action: 'signIn',
        email 
      });
      return { success: false, error: error as Error };
    } finally {
       // setLoading(false); // Let onAuthStateChange handle this
       // setIsLoadingOrganization(false); // Let loadOrganizationData handle this
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    setIsLoadingOrganization(true);
    try {
      const supabaseClient = await getSupabaseClient();
      const role = currentSubdomain ? 'customer' : 'owner'; // Example: tenant signup = customer, main signup = owner
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
            role: role,
          },
        },
      });
      if (error) {
        logError(error, {
          action: 'signUp',
          email
        });
        return { success: false, error };
      }
      // onAuthStateChange will handle setting user, session, and loading states.
      return { success: true, error: null };
    } catch (error) {
      logError(error as Error, {
        action: 'signUp',
        email
      });
      return { success: false, error: error as Error };
    } finally {
       // setLoading(false);
       // setIsLoadingOrganization(false);
    }
  }, [currentSubdomain]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // Clear local states
      setUser(null);
      setSession(null);
      setUserProfile(null);
      // Organization might persist if it's a public tenant page, so reload it
      await loadOrganizationData(currentSubdomain); 
    } catch (error) {
      console.error("Error signing out:", error);
      // Optionally, handle sign-out errors (e.g., display a message to the user)
    }
  }, [loadOrganizationData, currentSubdomain]);

  // استخدام useMemo لمنع إعادة إنشاء سياق المصادقة في كل عملية رندر
  const authContextValue = useMemo(() => ({
    session,
    user,
    userProfile,
    isLoadingUserProfile,
    organization,
    signIn,
    signUp,
    signOut,
    loading,
    isLoadingOrganization,
    isTenant,
    currentSubdomain,
    refreshOrganizationData,
  }), [
    session, user, userProfile, isLoadingUserProfile, organization,
    signIn, signUp, signOut, loading, isLoadingOrganization,
    isTenant, currentSubdomain, refreshOrganizationData
  ]);

  console.log("AuthContext value in AuthProvider:", authContextValue); // Log the context value

  // Ensure all states are updated before rendering children
  if (loading || isLoadingUserProfile || isLoadingOrganization) {
    // Optionally, render a global loading indicator or null
    // For now, we'll let children render and handle their own loading states based on context
    // return <GlobalLoadingScreen />; // Example if you have one
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error("useAuth: AuthContext is undefined. This usually means you are trying to use useAuth outside of an AuthProvider.");
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 