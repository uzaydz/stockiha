import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getOrganizationBySubdomain } from '@/lib/api/tenant';

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
  refreshOrganizationData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// تحديد ما إذا كان النطاق هو النطاق الرئيسي
const isMainDomain = (hostname: string): boolean => {
  // اعتبار www.ktobi.online هو النطاق الرئيسي
  return hostname === 'www.ktobi.online' || hostname === 'ktobi.online';
};

// استخراج النطاق الفرعي من اسم المضيف
const extractSubdomain = (hostname: string) => {
  console.log('اكتشاف النطاق الفرعي - اسم المضيف:', hostname);
  
  // اختبار ما إذا كان النطاق الرئيسي
  if (isMainDomain(hostname)) {
    console.log('تم اكتشاف النطاق الرئيسي، لا يوجد نطاق فرعي');
    return null;
  }
  
  // تقسيم اسم المضيف إلى أجزاء
  const hostParts = hostname.split('.');
  console.log('أجزاء اسم المضيف:', hostParts);
  
  // إذا كان لدينا أكثر من جزئين، الجزء الأول هو النطاق الفرعي
  if (hostParts.length > 2) {
    const subdomain = hostParts[0];
    console.log('تم اكتشاف النطاق الفرعي:', subdomain);
    
    // لا نعتبر 'www' كنطاق فرعي حقيقي
    if (subdomain === 'www') {
      console.log('تجاهل www كنطاق فرعي');
      return null;
    }
    
    return subdomain;
  }
  
  return null;
};

// دالة لتحديد معرف المؤسسة الافتراضية للنطاق الرئيسي
const getDefaultOrganizationId = (): string | null => {
  // محاولة استخدام معرف المؤسسة من التخزين المحلي
  const storedOrgId = localStorage.getItem('bazaar_organization_id');
  if (storedOrgId) {
    console.log('استخدام معرف المؤسسة المخزن محلياً:', storedOrgId);
    return storedOrgId;
  }
  
  // إذا كنا على النطاق الرئيسي وليس لدينا معرف مخزن
  // هنا يمكننا تعيين معرف افتراضي أو استراتيجية أخرى
  const defaultOrgId = 'aacf0931-91aa-4da3-94e6-eef5d8956443'; // استبدل بمعرف المؤسسة الصحيح
  console.log('استخدام معرف المؤسسة الافتراضي للنطاق الرئيسي:', defaultOrgId);
  return defaultOrgId;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTenant, setIsTenant] = useState(false);
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(extractSubdomain(window.location.hostname));
  const [organization, setOrganization] = useState<AuthContextType['organization']>(null);

  console.log("تهيئة AuthProvider - النطاق الفرعي الحالي:", currentSubdomain);

  const loadOrganizationData = async (subdomain: string | null) => {
    console.log('جاري جلب بيانات المؤسسة...');
    
    try {
      let organizationData = null;
      
      // إذا كان النطاق الفرعي غير محدد (النطاق الرئيسي)
      if (!subdomain) {
        console.log('نحن على النطاق الرئيسي، جلب المؤسسة الافتراضية...');
        const defaultOrgId = getDefaultOrganizationId();
        
        if (defaultOrgId) {
          // استخدام المعرف المخزن أو الافتراضي لجلب بيانات المؤسسة
          const { data, error } = await supabase
            .from('organizations')
            .select('id, name, subscription_tier, subscription_status, created_at')
            .eq('id', defaultOrgId)
            .single();
            
          if (!error && data) {
            console.log('تم العثور على المؤسسة الافتراضية:', data.name);
            organizationData = data;
            localStorage.setItem('bazaar_organization_id', data.id);
          } else {
            console.error('خطأ في جلب المؤسسة الافتراضية:', error);
          }
        }
      } else {
        // البحث عن المؤسسة باستخدام النطاق الفرعي
        console.log('محاولة العثور على المؤسسة باستخدام النطاق الفرعي:', subdomain);
        
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, subscription_tier, subscription_status, created_at')
          .eq('subdomain', subdomain)
          .single();
          
        if (error) {
          console.error('خطأ في جلب بيانات المؤسسة باستخدام النطاق الفرعي:', error);
        } else {
          organizationData = data;
          console.log('تم العثور على المؤسسة:', data.name);
          localStorage.setItem('bazaar_organization_id', data.id);
        }
      }
      
      if (!organizationData) {
        console.log('تعذر العثور على المؤسسة، جلب المعرف من التخزين المحلي...');
        const organizationId = localStorage.getItem('bazaar_organization_id');
        
        if (organizationId) {
          console.log('معرف المؤسسة من التخزين المحلي:', organizationId);
          
          const { data, error } = await supabase
            .from('organizations')
            .select('id, name, subscription_tier, subscription_status, created_at')
            .eq('id', organizationId)
            .single();
            
          if (error) {
            console.error('خطأ في جلب بيانات المؤسسة من التخزين المحلي:', error);
          } else {
            organizationData = data;
            console.log('تم العثور على بيانات المؤسسة من التخزين المحلي:', data.name);
          }
        }
      }
      
      // إذا وجدنا المؤسسة، نقوم بتحميل المعلومات الإضافية
      if (organizationData) {
        // جلب معلومات الاشتراك
        let subscription_id = null;
        try {
          const { data: subscriptionData } = await supabase
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
          console.log('ليس لدى المؤسسة اشتراك نشط');
        }
        
        // تعيين بيانات المؤسسة
        setOrganization({
          id: organizationData.id,
          name: organizationData.name,
          subscription_tier: organizationData.subscription_tier || 'free',
          subscription_status: organizationData.subscription_status || 'inactive',
          subscription_id: subscription_id,
          created_at: organizationData.created_at
        });
        
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
  };

  useEffect(() => {
    // Check for active session on component mount
    const getInitialSession = async () => {
      console.log("جاري التحقق من الجلسة الحالية...");
      try {
        // Clear any existing loop detection counters
        sessionStorage.removeItem('lastLoginRedirect');
        sessionStorage.setItem('loginRedirectCount', '0');
        
        setLoading(true); // Ensure loading is set to true before checking session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("نتيجة الجلسة:", session ? "موجودة" : "غير موجودة");
        
        // Add a small delay to ensure state updates properly
        await new Promise(resolve => setTimeout(resolve, 300));
        
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
          console.log("بيانات المستخدم:", session.user);
          console.log("البيانات الوصفية للمستخدم:", session.user.user_metadata);
          const isTenantUser = session.user.user_metadata?.isTenant === true;
          console.log("هل المستخدم مسؤول متعدد النطاقات؟", isTenantUser);
          setIsTenant(isTenantUser);
          
          // جلب بيانات المؤسسة بعد تحديث بيانات المستخدم
          await loadOrganizationData(currentSubdomain);
        }
      } catch (error) {
        console.error('خطأ في الحصول على الجلسة الأولية:', error);
      } finally {
        // Add a small delay before setting loading to false to ensure state is updated
        setTimeout(() => {
          setLoading(false);
          console.log("تم الانتهاء من التحقق من الجلسة، حالة التحميل:", false);
        }, 300);
      }
    };

    getInitialSession();
    
    // Check URL for force param to clear any cached session state
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force') === 'true') {
      console.log("تم اكتشاف معلمة إجبارية، مسح بيانات الجلسة");
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      sessionStorage.removeItem('lastLoginRedirect');
      sessionStorage.setItem('loginRedirectCount', '0');
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("تغيير حالة المصادقة - نوع الحدث:", _event);
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
            console.log("تغيير حالة المصادقة - بيانات المستخدم:", session.user);
            const isTenantUser = session.user.user_metadata?.isTenant === true;
            console.log("تغيير حالة المصادقة - هل المستخدم مسؤول متعدد النطاقات؟", isTenantUser);
            setIsTenant(isTenantUser);
            
            // جلب بيانات المؤسسة بعد تحديث بيانات المستخدم
            await loadOrganizationData(currentSubdomain);
          } else {
            setIsTenant(false);
            setOrganization(null);
          }
          
          console.log("تغيير حالة المصادقة - تحديث حالة التحميل إلى:", false);
          setLoading(false);
        }, 300); // Increase delay to ensure React state updates correctly
      }
    );

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check subdomain validity
  useEffect(() => {
    const validateSubdomain = async () => {
      console.log("التحقق من صحة النطاق الفرعي:", currentSubdomain);
      if (currentSubdomain) {
        try {
          console.log("البحث عن مؤسسة بالنطاق الفرعي:", currentSubdomain);
          const organization = await getOrganizationBySubdomain(currentSubdomain);
          console.log("نتيجة البحث عن المؤسسة:", organization);
          
          // If the subdomain doesn't exist, redirect to the main domain
          // Only redirect if we're in production and not on localhost
          if (!organization && !window.location.hostname.includes('localhost')) {
            console.log("النطاق الفرعي غير صالح، إعادة التوجيه إلى النطاق الرئيسي");
            
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
              console.log("تم منع إعادة التوجيه المتكررة");
              return;
            }
            
            if (!isAuthPath) {
              // Store the redirect time to prevent loops
              sessionStorage.setItem('lastSubdomainRedirect', currentTime.toString());
              window.location.href = `${window.location.protocol}//${window.location.hostname.split('.').slice(1).join('.')}`;
            } else {
              console.log("لا يتم إعادة التوجيه لأننا في صفحة مصادقة:", currentPath);
            }
          }
        } catch (error) {
          console.error('خطأ في التحقق من صحة النطاق الفرعي:', error);
        }
      }
    };

    // Prevent validation from running too frequently
    const timer = setTimeout(() => {
      validateSubdomain();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentSubdomain]);

  // دالة لتحديث بيانات المؤسسة - يمكن استدعاؤها من أي مكان في التطبيق
  const refreshOrganizationData = async () => {
    console.log("تحديث بيانات المؤسسة...");
    await loadOrganizationData(currentSubdomain);
  };

  // تحميل بيانات المؤسسة عند بدء التطبيق
  useEffect(() => {
    // محاولة تحميل بيانات المؤسسة من التخزين المحلي عند بدء التطبيق
    if (!organization) {
      console.log("تحميل بيانات المؤسسة عند بدء التطبيق");
      loadOrganizationData(currentSubdomain);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("محاولة تسجيل الدخول لـ:", email);
    try {
      setLoading(true); // Set loading to true during sign in
      console.log("تعيين حالة التحميل إلى true قبل تسجيل الدخول");
      
      // Clear any existing session data first to avoid conflicts
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("فشل تسجيل الدخول:", error.message);
        setLoading(false); // Reset loading state on error
        return { success: false, error };
      }

      console.log("تم تسجيل الدخول بنجاح، بيانات الجلسة:", data.session);
      console.log("بيانات المستخدم:", data.user);
      
      // Ensure proper state update sequence with a delay 
      // This is critical to prevent redirect loops
      console.log("انتظار قبل تحديث الحالة");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update session and user state
      console.log("تحديث بيانات الجلسة والمستخدم");
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
        console.log("البيانات الوصفية للمستخدم بعد تسجيل الدخول:", data.user.user_metadata);
        const isTenantUser = data.user.user_metadata?.isTenant === true;
        console.log("هل المستخدم مسؤول متعدد النطاقات؟", isTenantUser);
        setIsTenant(isTenantUser);
        
        // جلب بيانات المؤسسة بعد تسجيل الدخول
        await loadOrganizationData(currentSubdomain);
      }
      
      // Add a small delay to ensure state updates correctly before returning
      console.log("انتظار إضافي قبل العودة من دالة تسجيل الدخول");
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("تحديث حالة التحميل إلى false بعد تسجيل الدخول الناجح");
      setLoading(false);
      
      return { success: true, error: null };
    } catch (error) {
      console.error('خطأ أثناء تسجيل الدخول:', error);
      setLoading(false); // Reset loading state on error
      return { success: false, error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // تحقق مما إذا كان التسجيل من خلال صفحة المتجر (النطاق الفرعي)
      if (currentSubdomain) {
        // التسجيل من خلال صفحة المتجر يسمح فقط بإنشاء حسابات العملاء
        const { data, error } = await supabase.auth.signUp({
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
        const { data, error } = await supabase.auth.signUp({
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
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setIsTenant(false);
      setOrganization(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    loading,
    isTenant,
    currentSubdomain,
    organization,
    refreshOrganizationData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 