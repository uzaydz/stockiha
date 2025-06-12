import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from '@/lib/supabase';
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
    console.error('❌ فشل في الحصول على Supabase client:', error);
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
      console.log('✅ [AuthContext] تم حفظ حالة المصادقة في localStorage');
    } else if (forceDelete) {
      // حذف البيانات فقط إذا طُلب ذلك صراحة (مثل تسجيل الخروج)
      localStorage.removeItem('bazaar_auth_state');
      console.log('🗑️ [AuthContext] تم مسح حالة المصادقة من localStorage (مطلوب بالقوة)');
    } else {
      console.log('🛡️ [AuthContext] تجاهل مسح البيانات - لم يُطلب الحذف صراحة');
    }
  } catch (error) {
    console.error('❌ فشل في حفظ حالة المصادقة:', error);
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
        console.log('⏰ [AuthContext] الجلسة المحفوظة منتهية الصلاحية');
        localStorage.removeItem('bazaar_auth_state');
        return { session: null, user: null };
      }
    }

    // التحقق من أن البيانات المحفوظة لا تتجاوز 24 ساعة
    const savedTimestamp = authState.timestamp || 0;
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    if (Date.now() - savedTimestamp > maxAge) {
      console.log('📅 [AuthContext] البيانات المحفوظة قديمة جداً');
      localStorage.removeItem('bazaar_auth_state');
      return { session: null, user: null };
    }

    console.log('📖 [AuthContext] تم استرداد حالة المصادقة المحفوظة');
    return {
      session: authState.session as Session,
      user: authState.session.user as SupabaseUser
    };
  } catch (error) {
    console.error('❌ فشل في استرداد حالة المصادقة:', error);
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
      console.log('🔄 [AuthContext] الجلسة ستنتهي قريباً، محاولة التحديث...');
      
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.refreshSession();
      
      if (error || !data.session) {
        console.warn('❌ [AuthContext] فشل تحديث الجلسة:', error);
        return false;
      }
      
      console.log('✅ [AuthContext] تم تحديث الجلسة بنجاح');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('❌ [AuthContext] خطأ في التحقق من صحة الجلسة:', error);
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // استرداد الحالة المحفوظة كقيم أولية
  const savedAuthState = loadSavedAuthState();
  
  const [session, setSession] = useState<Session | null>(savedAuthState.session);
  const [user, setUser] = useState<SupabaseUser | null>(savedAuthState.user);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState<boolean>(true);
  const [loading, setLoading] = useState(!savedAuthState.session); // إذا كان لدينا جلسة محفوظة، لا نحتاج للتحميل
  const [isLoadingOrganization, setIsLoadingOrganization] = useState<boolean>(true);
  const [isTenant, setIsTenant] = useState(false);
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(() => 
    extractSubdomain(window.location.hostname)
  );
  const [organization, setOrganization] = useState<AuthContextType['organization']>(null);
  
  useEffect(() => {
    console.log("🚀 [AuthContext] تهيئة AuthContext - حالة أولية:", {
      hasSession: !!session,
      hasUser: !!user,
      loading
    });
    
    // إعداد مراقب دوري لصحة الجلسة
    let sessionValidationInterval: NodeJS.Timeout;
    
    if (session) {
      sessionValidationInterval = setInterval(async () => {
        const isValid = await validateSessionPeriodically(session);
        if (!isValid) {
          console.warn('⚠️ [AuthContext] الجلسة غير صالحة، سيتم تسجيل الخروج');
          updateAuthState(null, null, true);
        }
      }, 5 * 60 * 1000); // فحص كل 5 دقائق
    }
    
    return () => {
      if (sessionValidationInterval) {
        clearInterval(sessionValidationInterval);
      }
    };
  }, [session]);

  // دالة محسنة لتحديث الحالة مع الحفظ
  const updateAuthState = useCallback((newSession: Session | null, newUser: SupabaseUser | null, forceUpdate: boolean = false) => {
    console.log('🔄 [AuthContext] تحديث حالة المصادقة:', {
      hasSession: !!newSession,
      hasUser: !!newUser,
      userId: newUser?.id,
      forceUpdate
    });
    
    // إذا لم تكن هناك جلسة أو مستخدم جديد، تحقق من البيانات المحفوظة أولاً
    if (!newSession && !newUser && !forceUpdate) {
      const savedState = loadSavedAuthState();
      if (savedState.session && savedState.user) {
        console.log('🛡️ [AuthContext] تجاهل التحديث الفارغ - لدينا بيانات صالحة محفوظة');
        // استخدام البيانات المحفوظة بدلاً من القيم الفارغة
        setSession(savedState.session);
        setUser(savedState.user);
        return;
      }
    }
    
    setSession(newSession);
    setUser(newUser);
    // تمرير forceUpdate كـ forceDelete لحذف البيانات فقط عند الضرورة
    saveAuthState(newSession, newUser, forceUpdate);
  }, []);

  // Load User Profile - Depends on user.id now with timeout
  useEffect(() => {
    console.log('🔍 [AuthContext] useEffect تحميل البروفايل - بدء التشغيل');
    console.log('🔍 [AuthContext] حالة المستخدم:', { 
      userId: user?.id, 
      email: user?.email,
      hasUser: !!user,
      isLoadingUserProfile 
    });
    
    const loadUserProfile = async () => {
      console.log('📡 [AuthContext] بدء دالة loadUserProfile');
      const currentUserId = user?.id; // Get the ID
      console.log('📡 [AuthContext] معرف المستخدم الحالي:', currentUserId);

      if (currentUserId) {
        console.log('👤 [AuthContext] المستخدم موجود، بدء تحميل البروفايل');
        console.log('📡 [AuthContext] تعيين isLoadingUserProfile = true');
        setIsLoadingUserProfile(true);
        
        try {
          console.log('⏰ [AuthContext] بدء تحميل البروفايل مع timeout قصير جداً...');
          
          // إنشاء بيانات احتياطية فوراً
          const fallbackProfile = {
            id: user.id,
            auth_user_id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || 
                 user.user_metadata?.full_name || 
                 user.email?.split('@')[0] || 'User',
            role: user.user_metadata?.role || 'customer',
            permissions: user.user_metadata?.permissions || {},
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...user.user_metadata
          } as UserProfile;
          
          // تعيين البيانات الاحتياطية فوراً لتجنب التعليق
          console.log('⚡ [AuthContext] تعيين البيانات الاحتياطية فوراً');
          setUserProfile(fallbackProfile);
          setIsLoadingUserProfile(false);
          
                     // محاولة تحديث البيانات في الخلفية مع timeout قصير جداً
           setTimeout(async () => {
             try {
               console.log('🔄 [AuthContext] محاولة تحديث البروفايل في الخلفية مع timeout قصير...');
               
               // timeout قصير جداً للبيانات الحقيقية
               const profilePromise = getCurrentUserProfile();
               const shortTimeoutPromise = new Promise<UserProfile | null>((_, reject) => 
                 setTimeout(() => {
                   console.log('⏰ [AuthContext] انتهت مهلة timeout القصيرة (1.5 ثانية)!');
                   reject(new Error('short-timeout'));
                 }, 1500) // 1.5 ثانية فقط
               );
 
               const realProfile = await Promise.race([profilePromise, shortTimeoutPromise]);
               
               if (realProfile && realProfile.id === user.id) {
                 console.log('✅ [AuthContext] تم تحديث البروفايل بالبيانات الحقيقية');
                 setUserProfile(realProfile as UserProfile);
               } else {
                 console.log('⚠️ [AuthContext] البيانات الحقيقية غير متطابقة، الاحتفاظ بالبيانات الاحتياطية');
               }
             } catch (bgError) {
               console.log('❌ [AuthContext] فشل تحديث البروفايل في الخلفية (timeout أو خطأ):', bgError);
               // لا نفعل شيء - البيانات الاحتياطية موجودة بالفعل
             }
           }, 100); // بدء المحاولة بعد 100ms فقط
           
           // إضافة أمان إضافي - التأكد من إيقاف التحميل حتى لو حدث خطأ ما
           setTimeout(() => {
             if (isLoadingUserProfile) {
               console.log('🔒 [AuthContext] إجبار إيقاف تحميل البروفايل بعد 3 ثواني (أمان إضافي)');
               setIsLoadingUserProfile(false);
             }
           }, 3000);
          
        } catch (error) {
          console.error('❌ [AuthContext] خطأ في تحميل بيانات المستخدم:', error);
          
          // في حالة أي خطأ، استخدم البيانات الأساسية من المصادقة
          if (user) {
            const fallbackProfile = {
              id: user.id,
              auth_user_id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || 
                   user.user_metadata?.full_name || 
                   user.email?.split('@')[0] || 'User',
              role: user.user_metadata?.role || 'customer',
              permissions: user.user_metadata?.permissions || {},
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...user.user_metadata
            } as UserProfile;
            
            console.log('🛡️ [AuthContext] استخدام البيانات الاحتياطية المحسّنة:', fallbackProfile);
            setUserProfile(fallbackProfile);
          } else {
            console.log('❌ [AuthContext] لا يوجد مستخدم، تعيين البروفايل كـ null');
            setUserProfile(null);
          }
          setIsLoadingUserProfile(false);
        }
      } else {
        console.log('❌ [AuthContext] لا يوجد مستخدم، تعيين البروفايل كـ null');
        setUserProfile(null);
        console.log('🏁 [AuthContext] تعيين isLoadingUserProfile = false (لا يوجد مستخدم)');
        setIsLoadingUserProfile(false); 
      }
    };

    console.log('🚀 [AuthContext] استدعاء loadUserProfile()...');
    loadUserProfile();
  }, [user?.id]); // Dependency changed to user?.id

  // تنظيف التخزين المؤقت عند تغيير المستخدم
  useEffect(() => {
    if (user?.id) {
      console.log('🧹 [AuthContext] تنظيف البيانات المؤقتة للمستخدم السابق...');
      // مسح بيانات المستخدمين الآخرين من التخزين المؤقت
      const currentUserId = user.id;
      if (typeof window !== 'undefined') {
        // البحث عن مفاتيح التخزين المؤقت للمستخدمين الآخرين ومسحها
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('user_profile:') && !key.includes(currentUserId)) {
            console.log('🗑️ [AuthContext] مسح بيانات مستخدم آخر:', key);
            localStorage.removeItem(key);
          }
        });
      }
    }
  }, [user?.id]);

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
          const supabaseClient = await ensureClientReady();
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
        LONG_CACHE_TTL
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
      setOrganization(null);
      setIsTenant(false);
      return false;
    } finally {
      setIsLoadingOrganization(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let authListenerData: any = null;

    const initializeAuth = async () => {
      if (!isActive) return;
      
      console.log('🔄 [AuthContext] جلسة محفوظة موجودة، سيتم التحقق من صحتها مع Supabase');
      
      // إعطاء تأخير قصير للسماح للبيانات المحفوظة بالعمل أولاً
      const savedAuthState = loadSavedAuthState();
      if (savedAuthState.session && savedAuthState.user) {
        console.log('⏰ [AuthContext] تأخير التحقق مع Supabase لإعطاء فرصة للبيانات المحفوظة');
        await new Promise(resolve => setTimeout(resolve, 1000)); // تأخير ثانية واحدة
        
        // التحقق مرة أخرى من أن البيانات لا تزال موجودة
        if (!isActive) return;
      }

      try {
        const client = await ensureClientReady();
        
        // إعداد مستمع المصادقة أولاً لتجنب فقدان الأحداث
        const { data: listener } = client.auth.onAuthStateChange(
          async (event, session) => {
            if (!isActive) return;
            
            console.log('🔄 [AuthContext] onAuthStateChange:', {
              event,
              hasSession: !!session,
              userId: session?.user?.id
            });
            
            // تطبيق throttling لتجنب التكرار المفرط
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (!isActive) return;
            
            // حماية خاصة لـ INITIAL_SESSION: تجاهل إذا كانت null ولدينا بيانات صالحة محفوظة
            if (event === 'INITIAL_SESSION' && !session) {
              const savedState = loadSavedAuthState();
              if (savedState.session && savedState.user) {
                console.log('🛡️ [AuthContext] تجاهل INITIAL_SESSION فارغة - لدينا بيانات صالحة محفوظة');
                console.log('🔄 [AuthContext] استخدام البيانات المحفوظة بدلاً من القيم الفارغة');
                // استخدام البيانات المحفوظة
                setSession(savedState.session);
                setUser(savedState.user);
                return;
              }
            }
            
            // استخدام الدالة المحسنة لتحديث الحالة
            updateAuthState(session, session?.user ?? null);

            // Handle organization loading based on event and session state
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              if (session?.user) {
                await loadOrganizationData(currentSubdomain);
              }
              setLoading(false);
            } else if (event === 'SIGNED_OUT') {
              setUserProfile(null);
              await loadOrganizationData(currentSubdomain);
              setLoading(false);
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('🔄 [AuthContext] تم تحديث الرمز المميز');
            }
          }
        );
        
        authListenerData = listener;
        
        // بعد إعداد المستمع، تحقق من الجلسة الحالية
        const { data: { session: initialSession }, error } = await client.auth.getSession();
        
        if (error) {
          console.error('❌ [AuthContext] خطأ في استرداد الجلسة:', error);
          if (isActive) {
            // فحص البيانات المحفوظة مرة أخرى قبل مسح الحالة
            const savedState = loadSavedAuthState();
            if (savedState.session && savedState.user) {
              console.log('🛡️ [AuthContext] خطأ في استرداد الجلسة، لكن لدينا بيانات محفوظة صالحة');
              // الاحتفاظ بالبيانات المحفوظة
              return;
            }
            updateAuthState(null, null);
            setLoading(false);
          }
        } else {
          console.log('📡 [AuthContext] استرداد الجلسة من Supabase:', {
            hasSession: !!initialSession,
            userId: initialSession?.user?.id
          });
          
          if (isActive) {
            updateAuthState(initialSession, initialSession?.user ?? null);
            if (!initialSession) {
              setLoading(false);
            }
          }
        }
      } catch (error) {
        console.error('❌ [AuthContext] خطأ في تهيئة المصادقة:', error);
        if (isActive) {
          // فحص البيانات المحفوظة مرة أخرى قبل مسح الحالة
          const savedState = loadSavedAuthState();
          if (savedState.session && savedState.user) {
            console.log('🛡️ [AuthContext] خطأ في التهيئة، لكن لدينا بيانات محفوظة صالحة');
            // الاحتفاظ بالبيانات المحفوظة
            return;
          }
          updateAuthState(null, null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isActive = false;
      if (authListenerData?.subscription) {
        authListenerData.subscription.unsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // تشغيل مرة واحدة فقط عند التحميل
  
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
    console.log('🔐 [AuthContext] بدء عملية تسجيل الدخول لـ:', email);
    setIsLoadingOrganization(true);
    setLoading(true); 
    
    try {
      // مسح أي بيانات مصادقة قديمة
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      localStorage.removeItem('bazaar_auth_state');
      
      const supabaseClient = await ensureClientReady();
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ [AuthContext] فشل تسجيل الدخول:', error);
        logError(error, { 
          action: 'signIn',
          email 
        });
        updateAuthState(null, null);
        return { success: false, error };
      }

      console.log('✅ [AuthContext] نجح تسجيل الدخول، حفظ البيانات');
      
      // حفظ حالة المصادقة فوراً للحماية من إعادة التحميل
      updateAuthState(data.session, data.user);
      
      // onAuthStateChange will handle the rest including loadOrganizationData
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ [AuthContext] خطأ في تسجيل الدخول:', error);
      logError(error as Error, { 
        action: 'signIn',
        email 
      });
      updateAuthState(null, null);
      return { success: false, error: error as Error };
    } finally {
      setLoading(false);
      setIsLoadingOrganization(false);
    }
  }, [updateAuthState]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    setIsLoadingOrganization(true);
    try {
      const supabaseClient = await ensureClientReady();
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
    console.log('🚪 [AuthContext] بدء عملية تسجيل الخروج');
    try {
      const client = await ensureClientReady();
      await client.auth.signOut();
      
      console.log('✅ [AuthContext] تم تسجيل الخروج بنجاح');
      
      // مسح حالة المصادقة فوراً (مع فرض الحذف)
      updateAuthState(null, null, true);
      setUserProfile(null);
      
      // مسح بيانات إضافية
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      
      // Organization might persist if it's a public tenant page, so reload it
      await loadOrganizationData(currentSubdomain); 
    } catch (error) {
      console.error('❌ [AuthContext] خطأ في تسجيل الخروج:', error);
      // مسح الحالة حتى لو حدث خطأ (مع فرض الحذف)
      updateAuthState(null, null, true);
      setUserProfile(null);
    }
  }, [updateAuthState, loadOrganizationData, currentSubdomain]);

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

  // عرض شاشة التحميل فقط في حالات محددة لتجنب التعليق
  // لا نعرض شاشة التحميل إذا كان isLoadingUserProfile فقط لأننا نحل هذا بطريقة أخرى
  if (loading && !user) {
    // فقط عرض التحميل إذا لم يكن لدينا مستخدم بعد
    console.log('🔄 [AuthContext] عرض شاشة التحميل الأساسية');
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook مع Fast Refresh compatible naming
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// تصدير مع اسم صريح للـ Fast Refresh
export { useAuth };
