import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase';
import { getOrganizationBySubdomain } from '@/lib/api/tenant';
import { getCacheData, setCacheData, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTenant, setIsTenant] = useState(false);
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(() => 
    extractSubdomain(window.location.hostname)
  );
  const [organization, setOrganization] = useState<AuthContextType['organization']>(null);
  
  // منع تسجيل رسالة التهيئة المتكررة - تسجيل مرة واحدة فقط
  useEffect(() => {
    
  }, []);

  // تحسين وظيفة تحميل بيانات المؤسسة باستخدام useCallback والتخزين المؤقت
  const loadOrganizationData = useCallback(async (subdomain: string | null) => {
    
    
    try {
      // محاولة الحصول على البيانات من التخزين المؤقت أولاً
      const cacheKey = subdomain 
        ? `organization:subdomain:${subdomain}`
        : `organization:default`;
      
      const cachedData = await getCacheData<AuthContextType['organization']>(cacheKey, LONG_CACHE_TTL);
      if (cachedData) {
        
        setOrganization(cachedData);
        setIsTenant(true);
        return true;
      }
      
      const supabaseClient = await getSupabaseClient();
      
      let organizationData = null;
      
      // إذا كان النطاق الفرعي غير محدد (النطاق الرئيسي)
      if (!subdomain) {
        
        const defaultOrgId = getDefaultOrganizationId();
        
        if (defaultOrgId) {
          // استخدام المعرف المخزن أو الافتراضي لجلب بيانات المؤسسة
          const { data, error } = await supabaseClient
            .from('organizations')
            .select('id, name, subscription_tier, subscription_status, created_at')
            .eq('id', defaultOrgId)
            .single();
            
          if (!error && data) {
            
            organizationData = data;
            localStorage.setItem('bazaar_organization_id', data.id);
          } else {
            console.error('خطأ في جلب المؤسسة الافتراضية:', error);
          }
        }
      } else {
        // البحث عن المؤسسة باستخدام النطاق الفرعي
        
        
        const { data, error } = await supabaseClient
          .from('organizations')
          .select('id, name, subscription_tier, subscription_status, created_at')
          .eq('subdomain', subdomain)
          .single();
          
        if (error) {
          console.error('خطأ في جلب بيانات المؤسسة باستخدام النطاق الفرعي:', error);
        } else {
          organizationData = data;
          
          localStorage.setItem('bazaar_organization_id', data.id);
        }
      }
      
      if (!organizationData) {
        
        const organizationId = localStorage.getItem('bazaar_organization_id');
        
        if (organizationId) {
          
          
          const { data, error } = await supabaseClient
            .from('organizations')
            .select('id, name, subscription_tier, subscription_status, created_at')
            .eq('id', organizationId)
            .single();
            
          if (error) {
            console.error('خطأ في جلب بيانات المؤسسة من التخزين المحلي:', error);
          } else {
            organizationData = data;
            
          }
        }
      }
      
      // إذا وجدنا المؤسسة، نقوم بتحميل المعلومات الإضافية
      if (organizationData) {
        // جلب معلومات الاشتراك
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
        } catch (e) {
          
        }
        
        // تعيين بيانات المؤسسة
        const orgData = {
          id: organizationData.id,
          name: organizationData.name,
          subscription_tier: organizationData.subscription_tier || 'free',
          subscription_status: organizationData.subscription_status || 'inactive',
          subscription_id: subscription_id,
          created_at: organizationData.created_at
        };
        
        // تخزين البيانات مؤقتًا لتقليل الاستعلامات المستقبلية
        await setCacheData(cacheKey, orgData, true);
        
        setOrganization(orgData);
        setIsTenant(true);
        return true;
      } else {
        setOrganization(null);
        setIsTenant(false);
        return false;
      }
    } catch (error) {
      console.error('استثناء في loadOrganizationData:', error);
      setOrganization(null);
      setIsTenant(false);
      return false;
    }
  }, []);

  // منع تنفيذ التحقق من الجلسة بشكل متكرر
  useEffect(() => {
    let isActive = true;
    
    // التحقق من الجلسة النشطة عند تحميل المكون
    const getInitialSession = async () => {
      if (!isActive) return;
      
      
      try {
        // مسح أي عدادات اكتشاف حلقة موجودة
        sessionStorage.removeItem('lastLoginRedirect');
        sessionStorage.setItem('loginRedirectCount', '0');
        
        setLoading(true); // التأكد من تعيين التحميل إلى true قبل التحقق من الجلسة
        const supabaseClient = await getSupabaseClient();
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        
        if (!isActive) return;
        
        // إضافة تأخير صغير للتأكد من تحديث الحالة بشكل صحيح
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!isActive) return;
        
        // Store session in localStorage for backup recovery
        if (session) {
          try {
            // Only store minimal info to avoid security issues
            localStorage.setItem('authSessionExists', 'true');
            localStorage.setItem('authSessionLastUpdated', new Date().toString());
          } catch (error) {
            console.error('خطأ في تخزين معلومات الجلسة:', error);
          }
        } else {
          localStorage.removeItem('authSessionExists');
          localStorage.removeItem('authSessionLastUpdated');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if user is a tenant
        if (session?.user) {
          
          
          const isTenantUser = session.user.user_metadata?.isTenant === true;
          
          setIsTenant(isTenantUser);
          
          // جلب بيانات المؤسسة بعد تحديث بيانات المستخدم
          await loadOrganizationData(currentSubdomain);
        }
      } catch (error) {
        console.error("خطأ أثناء الحصول على الجلسة:", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    getInitialSession();
    
    // Check URL for force param to clear any cached session state
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force') === 'true') {
      
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      sessionStorage.removeItem('lastLoginRedirect');
      sessionStorage.setItem('loginRedirectCount', '0');
    }

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isActive) return;
        
        
        setLoading(true); // Set loading to true during auth state change
        
        // Add a small delay to ensure state updates properly
        setTimeout(async () => {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Store session in localStorage for backup recovery
          if (session) {
            try {
              // Only store minimal info to avoid security issues
              localStorage.setItem('authSessionExists', 'true');
              localStorage.setItem('authSessionLastUpdated', new Date().toString());
            } catch (error) {
              console.error('خطأ في تخزين معلومات الجلسة:', error);
            }
          } else {
            localStorage.removeItem('authSessionExists');
            localStorage.removeItem('authSessionLastUpdated');
          }
          
          // Check if user is a tenant
          if (session?.user) {
            
            const isTenantUser = session.user.user_metadata?.isTenant === true;
            
            setIsTenant(isTenantUser);
            
            // جلب بيانات المؤسسة بعد تحديث بيانات المستخدم
            await loadOrganizationData(currentSubdomain);
          } else {
            setIsTenant(false);
            setOrganization(null);
          }
          
          
          setLoading(false);
        }, 300); // Increase delay to ensure React state updates correctly
      }
    );

    return () => {
      isActive = false;
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

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
  const refreshOrganizationData = useCallback(async () => {
    return await loadOrganizationData(currentSubdomain);
  }, [currentSubdomain, loadOrganizationData]);

  const signIn = useCallback(async (email: string, password: string) => {
    
    try {
      setLoading(true); // Set loading to true during sign in
      
      
      // Clear any existing session data first to avoid conflicts
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      
      const supabaseClient = await getSupabaseClient();
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("فشل تسجيل الدخول:", error.message);
        setLoading(false); // Reset loading state on error
        return { success: false, error };
      }

      
      
      
      // Ensure proper state update sequence with a delay 
      // This is critical to prevent redirect loops
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update session and user state
      
      setSession(data.session);
      setUser(data.user);
      
      // Store session in localStorage for backup recovery
      if (data.session) {
        try {
          // Only store minimal info to avoid security issues
          localStorage.setItem('authSessionExists', 'true');
          localStorage.setItem('authSessionLastUpdated', new Date().toString());
        } catch (error) {
          console.error('خطأ في تخزين معلومات الجلسة:', error);
        }
      }
      
      // Check if user is a tenant
      if (data.user) {
        
        const isTenantUser = data.user.user_metadata?.isTenant === true;
        
        setIsTenant(isTenantUser);
        
        // جلب بيانات المؤسسة بعد تسجيل الدخول
        await loadOrganizationData(currentSubdomain);
      }
      
      // Add a small delay to ensure state updates correctly before returning
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoading(false);
      
      return { success: true, error: null };
    } catch (error) {
      console.error('خطأ أثناء تسجيل الدخول:', error);
      setLoading(false); // Reset loading state on error
      return { success: false, error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const supabaseClient = await getSupabaseClient();
      // تحقق مما إذا كان التسجيل من خلال صفحة المتجر (النطاق الفرعي)
      if (currentSubdomain) {
        // التسجيل من خلال صفحة المتجر يسمح فقط بإنشاء حسابات العملاء
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role: 'customer', // تعيين دور المستخدم كعميل وليس كموظف
            },
          },
        });

        if (error) {
          return { success: false, error };
        }

        // If email confirmation is enabled, user will not be signed in automatically
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          
          // جلب بيانات المؤسسة بعد التسجيل
          await loadOrganizationData(currentSubdomain);
        }

        return { success: true, error: null };
      } else {
        // التسجيل العادي (ليس من خلال صفحة المتجر)
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (error) {
          return { success: false, error };
        }

        // If email confirmation is enabled, user will not be signed in automatically
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          
          // جلب بيانات المؤسسة بعد التسجيل
          await loadOrganizationData(currentSubdomain);
        }

        return { success: true, error: null };
      }
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabaseClient = await getSupabaseClient();
      await supabaseClient.auth.signOut();
      setSession(null);
      setUser(null);
      setIsTenant(false);
      setOrganization(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  // استخدام useMemo لمنع إعادة إنشاء سياق المصادقة في كل عملية رندر
  const value = useMemo(() => ({
    session,
    user,
    organization,
    signIn,
    signUp,
    signOut,
    loading,
    isTenant,
    currentSubdomain,
    refreshOrganizationData,
  }), [
    session,
    user,
    organization,
    signIn,
    signUp,
    signOut,
    loading,
    isTenant,
    currentSubdomain,
    refreshOrganizationData,
  ]);

  // استخدام useMemo لتجنب عمليات إعادة الرندر غير الضرورية
  return useMemo(() => (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  ), [value, children]);
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 