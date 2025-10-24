import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from '@/lib/supabase-unified';
import { checkUserRequires2FA } from '@/lib/api/authHelpers';
import { ensureUserOrganizationLink } from '@/lib/api/auth-helpers';
import { loadSecureSession, saveSecureSession } from '@/context/auth/utils/secureSessionStorage';
import { loadAuthFromStorage, loadOfflineAuthSnapshot, saveOfflineAuthSnapshot } from '@/context/auth/utils/authStorage';
import TwoFactorLoginForm from './TwoFactorLoginForm';

// إضافة دالة console مخصصة لـ LoginForm
const loginFormDebugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      if (data !== undefined) {
        console.log(`[LoginForm] ${message}`, data);
      } else {
        console.log(`[LoginForm] ${message}`);
      }
    } catch {
      // ignore console errors
    }
  }
};

const getOfflineStorageSnapshot = () => {
  if (typeof window === 'undefined') return null;
  try {
    const securePayload = localStorage.getItem('secure_offline_session_v1');
    const authState = localStorage.getItem('bazaar_auth_state');
    const meta = localStorage.getItem('secure_offline_session_meta_v1');
    return {
      hasSecureSessionKey: Boolean(securePayload),
      securePayloadLength: securePayload?.length ?? 0,
      hasAuthState: Boolean(authState),
      authStateLength: authState?.length ?? 0,
      sessionMetaRaw: meta,
      sessionMeta: meta ? JSON.parse(meta) : null
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
};

const reconstructOfflineUser = (snapshotUser: Partial<SupabaseUser> | null): SupabaseUser | null => {
  if (!snapshotUser || !snapshotUser.id) return null;

  const nowIso = new Date().toISOString();

  return {
    id: snapshotUser.id,
    app_metadata: snapshotUser.app_metadata ?? {},
    user_metadata: snapshotUser.user_metadata ?? {},
    aud: snapshotUser.aud ?? 'authenticated',
    email: snapshotUser.email ?? null,
    phone: (snapshotUser as any).phone ?? null,
    created_at: snapshotUser.created_at ?? nowIso,
    updated_at: snapshotUser.updated_at ?? nowIso,
    last_sign_in_at: (snapshotUser as any).last_sign_in_at ?? nowIso,
    role: snapshotUser.role ?? 'authenticated',
    email_confirmed_at: (snapshotUser as any).email_confirmed_at ?? null,
    phone_confirmed_at: (snapshotUser as any).phone_confirmed_at ?? null,
    confirmed_at: (snapshotUser as any).confirmed_at ?? null,
    factors: (snapshotUser as any).factors ?? [],
    identities: (snapshotUser as any).identities ?? [],
    is_anonymous: (snapshotUser as any).is_anonymous ?? false,
    raw_user_meta_data: (snapshotUser as any).raw_user_meta_data ?? {},
    raw_app_meta_data: (snapshotUser as any).raw_app_meta_data ?? {},
    // حقول إضافية محتملة في SupabaseUser
    banned_until: (snapshotUser as any).banned_until ?? null,
    recovery_sent_at: (snapshotUser as any).recovery_sent_at ?? null
  } as SupabaseUser;
};

const OFFLINE_CREDENTIALS_KEY = 'bazaar_offline_credentials_v1';

type OfflineCredentialRecord = {
  salt: string;
  hash: string;
  updatedAt: number;
};

const bufferToHex = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const generateSalt = (): string => {
  if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  }
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(bytes);
};

const readOfflineCredentialStore = (): Record<string, OfflineCredentialRecord> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OFFLINE_CREDENTIALS_KEY);
    const store = raw ? JSON.parse(raw) as Record<string, OfflineCredentialRecord> : {};
    
    loginFormDebugLog('📖 قراءة بيانات تسجيل الدخول الأوفلاين:', {
      hasRawData: Boolean(raw),
      rawDataLength: raw?.length || 0,
      storeKeys: Object.keys(store),
      storeSize: Object.keys(store).length
    });
    
    return store;
  } catch (error) {
    loginFormDebugLog('⚠️ فشل قراءة بيانات تسجيل الدخول الأوفلاين:', error);
    return {};
  }
};

const writeOfflineCredentialStore = (store: Record<string, OfflineCredentialRecord>) => {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(store);
    localStorage.setItem(OFFLINE_CREDENTIALS_KEY, serialized);
    
    loginFormDebugLog('💾 كتابة بيانات تسجيل الدخول الأوفلاين:', {
      storeKeys: Object.keys(store),
      storeSize: Object.keys(store).length,
      serializedLength: serialized.length
    });
  } catch (error) {
    loginFormDebugLog('⚠️ فشل حفظ بيانات تسجيل الدخول الأوفلاين:', error);
  }
};

const hashOfflinePassword = async (password: string, salt: string): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const encode = () => {
    if (encoder) {
      return encoder.encode(`${salt}:${password}`);
    }
    const fallback: number[] = [];
    const raw = `${salt}:${password}`;
    for (let i = 0; i < raw.length; i += 1) {
      fallback.push(raw.charCodeAt(i) & 0xff);
    }
    return new Uint8Array(fallback);
  };

  if (!window.crypto?.subtle) {
    loginFormDebugLog('⚠️ استخدام خوارزمية بديلة مبسطة لحساب كلمة المرور الأوفلاين');
    try {
      const data = encode();
      return bufferToHex(data);
    } catch (error) {
      loginFormDebugLog('⚠️ فشل في الحساب البديل لكلمة المرور الأوفلاين:', error);
      return null;
    }
  }

  try {
    const data = encode();
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return bufferToHex(digest);
  } catch (error) {
    loginFormDebugLog('⚠️ فشل حساب تجزئة كلمة المرور الأوفلاين:', error);
    return null;
  }
};

const saveOfflineCredentials = async (email: string, password: string): Promise<void> => {
  if (!email || !password) return;
  if (typeof window === 'undefined') return;

  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    const salt = generateSalt();
    const hash = await hashOfflinePassword(password, salt);
    if (!hash) {
      loginFormDebugLog('⚠️ فشل في إنشاء hash لكلمة المرور الأوفلاين');
      return;
    }

    const store = readOfflineCredentialStore();
    store[normalizedEmail] = {
      salt,
      hash,
      updatedAt: Date.now()
    };
    writeOfflineCredentialStore(store);
    
    // تسجيل لحفظ البيانات للأوفلاين
    loginFormDebugLog('💾 تم حفظ بيانات تسجيل الدخول للأوفلاين:', {
      email: normalizedEmail,
      hasSalt: Boolean(salt),
      hasHash: Boolean(hash),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    loginFormDebugLog('❌ خطأ في حفظ بيانات تسجيل الدخول للأوفلاين:', error);
  }
};

const verifyOfflineCredentials = async (email: string, password: string): Promise<boolean> => {
  if (!email || !password) return false;
  if (typeof window === 'undefined') return false;

  const normalizedEmail = email.toLowerCase().trim();
  const store = readOfflineCredentialStore();
  const record = store[normalizedEmail];

  loginFormDebugLog('🔍 التحقق من بيانات تسجيل الدخول الأوفلاين:', {
    email: normalizedEmail,
    hasRecord: Boolean(record),
    recordKeys: record ? Object.keys(record) : null
  });

  if (!record) {
    loginFormDebugLog('❌ لا توجد بيانات محفوظة لهذا البريد الإلكتروني');
    return false;
  }

  const hash = await hashOfflinePassword(password, record.salt);
  if (!hash) {
    loginFormDebugLog('❌ فشل في إنشاء hash للتحقق');
    return false;
  }

  const isValid = hash === record.hash;
  loginFormDebugLog('🔐 نتيجة التحقق من كلمة المرور:', {
    isValid,
    hasStoredHash: Boolean(record.hash),
    hasComputedHash: Boolean(hash)
  });

  return isValid;
};

const LoginForm = () => {
  const { signIn, currentSubdomain, updateAuthState, forceUpdateAuthState, user, userProfile, organization, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('جاري تسجيل الدخول...');
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // حالات المصادقة الثنائية
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    userId: string;
    userName: string;
    email: string;
  } | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const isUserOffline = () => typeof navigator !== 'undefined' && navigator ? !navigator.onLine : false;

  const isNetworkError = (error: unknown): boolean => {
    if (!error) return false;
    const message = typeof error === 'string'
      ? error
      : (error as any)?.message || '';
    const name = (error as any)?.name || '';
    const status = (error as any)?.status;

    const lowerMessage = message.toLowerCase();

    if (status === 0) return true;
    if (lowerMessage.includes('network') || lowerMessage.includes('offline') || lowerMessage.includes('failed to fetch') || lowerMessage.includes('disconnected')) {
      return true;
    }

    if (name && typeof name === 'string' && name.toLowerCase() === 'typeerror' && lowerMessage.includes('fetch')) {
      return true;
    }

    return false;
  };

  const attemptOfflineLogin = async (normalizedEmail: string, loginPassword: string): Promise<boolean> => {
    loginFormDebugLog('🔁 محاولة تسجيل الدخول في وضع عدم الاتصال', {
      email: normalizedEmail
    });
    setLoadingMessage('محاولة استخدام البيانات المحفوظة بدون إنترنت...');

    try {
      const storedAuth = loadAuthFromStorage();
      const offlineSnapshot = loadOfflineAuthSnapshot();
      const secureSession = await loadSecureSession();
      let offlineSession = secureSession;
      let offlineUser = (offlineSession?.user ?? storedAuth.user) as SupabaseUser | null;

      // 🚨 إصلاح مهم: محاولة تحميل البيانات من جميع المصادر المحتملة
      if (!offlineSession && !offlineUser) {
        // محاولة تحميل البيانات من localStorage مباشرة
        try {
          const rawAuthState = localStorage.getItem('bazaar_auth_state');
          if (rawAuthState) {
            const authState = JSON.parse(rawAuthState);
            if (authState.user) {
              offlineUser = authState.user;
              loginFormDebugLog('🔄 تم تحميل المستخدم من auth state مباشرة', {
                userId: authState.user.id,
                userEmail: authState.user.email
              });
            }
          }
        } catch (authStateError) {
          loginFormDebugLog('⚠️ فشل تحميل auth state مباشرة:', authStateError);
        }
      }

      loginFormDebugLog('📦 بيانات الأوفلاين المحملة', {
        hasSecureSession: Boolean(secureSession),
        hasStoredUser: Boolean(storedAuth.user),
        hasSessionMeta: Boolean(storedAuth.sessionMeta),
        sessionMeta: storedAuth.sessionMeta,
        hasOfflineSnapshot: Boolean(offlineSnapshot),
        snapshotHasUser: Boolean(offlineSnapshot?.user),
        snapshotHasSessionMeta: Boolean(offlineSnapshot?.sessionMeta),
        // فحص بيانات تسجيل الدخول الأوفلاين
        hasOfflineCredentials: Boolean(localStorage.getItem(OFFLINE_CREDENTIALS_KEY)),
        // فحص إضافي للمفاتيح المهمة
        hasSecureOfflineSession: Boolean(localStorage.getItem('secure_offline_session_v1')),
        hasSecureOfflineMeta: Boolean(localStorage.getItem('secure_offline_session_meta_v1')),
        hasBazaarOfflineSnapshot: Boolean(localStorage.getItem('bazaar_offline_auth_snapshot_v1'))
      });

      if (!offlineUser && offlineSnapshot?.user) {
        offlineUser = reconstructOfflineUser(offlineSnapshot.user);
        loginFormDebugLog('📄 استخدام snapshot للأوفلاين', {
          snapshotUserId: offlineSnapshot.user?.id,
          snapshotEmail: offlineSnapshot.user?.email
        });
      }

      // 🚨 إصلاح إضافي: محاولة إعادة بناء المستخدم من البيانات المحفوظة
      if (!offlineUser) {
        // محاولة إعادة بناء المستخدم من البيانات المحفوظة في secure session
        if (secureSession?.user) {
          offlineUser = secureSession.user;
          loginFormDebugLog('🔄 استخدام المستخدم من secure session', {
            userId: secureSession.user.id,
            userEmail: secureSession.user.email
          });
        }
        
        // محاولة إعادة بناء المستخدم من البيانات المحفوظة في storedAuth
        if (!offlineUser && storedAuth.user) {
          offlineUser = storedAuth.user;
          loginFormDebugLog('🔄 استخدام المستخدم من storedAuth', {
            userId: storedAuth.user.id,
            userEmail: storedAuth.user.email
          });
        }
      }

      if (!offlineUser) {
        toast.error('لا يوجد جلسة محفوظة للاستخدام بدون إنترنت على هذا الجهاز. يرجى تسجيل الدخول مع الاتصال بالإنترنت أولاً.');
        loginFormDebugLog('⭕ لا يوجد مستخدم محفوظ للأوفلاين');
        return false;
      }

      if (!offlineSession) {
        const meta = storedAuth.sessionMeta || offlineSnapshot?.sessionMeta;
        const expiresAtSeconds = meta?.expiresAt ?? Math.floor(Date.now() / 1000) + (60 * 60 * 12);
        offlineSession = {
          access_token: `offline-${offlineUser.id}`,
          refresh_token: `offline-refresh-${offlineUser.id}`,
          expires_in: Math.max(0, expiresAtSeconds - Math.floor(Date.now() / 1000)),
          expires_at: expiresAtSeconds,
          token_type: 'offline',
          user: offlineUser,
          provider_token: null,
          provider_refresh_token: null
        } as Session;
        loginFormDebugLog('🛠️ بناء جلسة أوفلاين احتياطية', {
          expiresAtSeconds,
          generatedAccessToken: offlineSession.access_token
        });
        try {
          await saveSecureSession(offlineSession);
          loginFormDebugLog('💾 تم حفظ الجلسة الاحتياطية في التخزين الآمن');
        } catch (sessionSaveError) {
          loginFormDebugLog('⚠️ فشل حفظ جلسة الأوفلاين الاحتياطية:', sessionSaveError);
        }
      }

      saveOfflineAuthSnapshot(offlineSession, offlineUser);

      // 🚨 إصلاح مهم: التأكد من حفظ البيانات في جميع التخزينات المطلوبة
      try {
        await saveSecureSession(offlineSession);
        loginFormDebugLog('💾 تم حفظ الجلسة في secure storage للأوفلاين');
      } catch (secureError) {
        loginFormDebugLog('⚠️ فشل حفظ الجلسة في secure storage للأوفلاين:', secureError);
      }

      if (!offlineUser.email || offlineUser.email.toLowerCase().trim() !== normalizedEmail) {
        toast.error('هذا البريد غير مرتبط بحساب محفوظ للاستخدام بدون إنترنت.');
        loginFormDebugLog('⭕ البريد الإلكتروني لا يطابق المستخدم المحفوظ', {
          storedEmail: offlineUser.email,
          attemptedEmail: normalizedEmail
        });
        return false;
      }

      const credentialsValid = await verifyOfflineCredentials(normalizedEmail, loginPassword);
      if (!credentialsValid) {
        toast.error('كلمة المرور غير متطابقة مع البيانات المحفوظة. يرجى التحقق من كلمة المرور أو تسجيل الدخول مع الاتصال بالإنترنت.');
        loginFormDebugLog('⭕ كلمة المرور الأوفلاين غير متطابقة');
        return false;
      }

      if (offlineSession.expires_at && (offlineSession.expires_at * 1000) <= Date.now()) {
        toast.error('انتهت صلاحية الجلسة المحفوظة، يرجى الاتصال بالإنترنت لتجديدها أو تسجيل الدخول مرة أخرى.');
        loginFormDebugLog('⭕ الجلسة المحفوظة منتهية الصلاحية', {
          expiresAt: offlineSession.expires_at,
          now: Math.floor(Date.now() / 1000)
        });
        return false;
      }

      loginFormDebugLog('✅ سيتم تفعيل جلسة الأوفلاين', {
        sessionExpiresAt: offlineSession.expires_at,
        userId: offlineUser.id
      });

      // 🚨 إصلاح مهم: حفظ البيانات مرة أخرى قبل التفعيل لضمان الاستمرارية
      try {
        saveOfflineAuthSnapshot(offlineSession, offlineUser);
        await saveSecureSession(offlineSession);
        loginFormDebugLog('💾 تم إعادة حفظ البيانات للأوفلاين قبل التفعيل');
      } catch (saveError) {
        loginFormDebugLog('⚠️ فشل إعادة حفظ البيانات للأوفلاين:', saveError);
      }

      loginFormDebugLog('📁 حالة التخزين قبل تفعيل جلسة الأوفلاين', getOfflineStorageSnapshot());

      await forceUpdateAuthState(offlineSession, offlineUser);
      loginFormDebugLog('📁 حالة التخزين بعد تفعيل جلسة الأوفلاين', getOfflineStorageSnapshot());
      
      // إضافة رسالة نجاح خاصة بالأوفلاين
      toast.success('تم تسجيل الدخول بنجاح باستخدام البيانات المحفوظة (وضع الأوفلاين)');
      
      await handleSuccessfulLogin();
      return true;
    } catch (offlineError) {
      loginFormDebugLog('❌ فشل تسجيل الدخول في وضع عدم الاتصال:', offlineError);
      toast.error('تعذر تسجيل الدخول بدون إنترنت، يرجى إعادة المحاولة مع اتصال بالإنترنت.');
      return false;
    }
  };

  const attemptOfflineFallback = async (
    error: unknown,
    normalizedEmail: string,
    loginPassword: string
  ): Promise<'success' | 'attempted' | 'skipped'> => {
    const shouldAttempt = isUserOffline() || isNetworkError(error);
    if (!shouldAttempt) {
      return 'skipped';
    }

    const offlineSuccess = await attemptOfflineLogin(normalizedEmail, loginPassword);
    return offlineSuccess ? 'success' : 'attempted';
  };

  // Get redirect path on component mount
  useEffect(() => {
    const savedRedirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (savedRedirectPath) {
      setRedirectPath(savedRedirectPath);
    }
  }, []);

  // 🎉 عرض رسالة الترحيب من التسجيل
  useEffect(() => {
    if (location.state?.message) {
      setTimeout(() => {
        toast.info(location.state.message);
      }, 500);
      // تنظيف الرسالة بعد عرضها
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    loginFormDebugLog('=== بدء عملية تسجيل الدخول من النموذج ===', {
      email,
      timestamp: new Date().toISOString(),
      currentSubdomain,
      currentPath: window.location.pathname,
      hostname: window.location.hostname
    });
    
    loginFormDebugLog('🔐 حالة التخزين الحالية قبل تسجيل الدخول', getOfflineStorageSnapshot());
    
    setIsLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    // Clear any previous error states or redirect counts
    sessionStorage.removeItem('lastLoginRedirect');
    sessionStorage.setItem('loginRedirectCount', '0');
    
    loginFormDebugLog('تم مسح بيانات إعادة التوجيه السابقة');

    try {
      if (isUserOffline()) {
        loginFormDebugLog('🟠 الجهاز في وضع عدم الاتصال - محاولة استخدام الجلسة المحفوظة');
        await attemptOfflineLogin(normalizedEmail, password);
        return;
      }

      // 🔧 إصلاح خاص لمشكلة تسجيل الدخول
      // تجاوز فحص 2FA المعقد والانتقال مباشرة لتسجيل الدخول

      // محاولة تسجيل الدخول المباشر أولاً
      try {
        loginFormDebugLog('محاولة تسجيل الدخول المباشر');
        await proceedWithDirectLogin(email, password);
        return;
      } catch (directLoginError) {
        loginFormDebugLog('❌ فشل تسجيل الدخول المباشر:', directLoginError);
      }

      // إذا فشل التسجيل المباشر، استخدم الطريقة التقليدية
      loginFormDebugLog('محاولة تسجيل الدخول بالطريقة التقليدية');
      
      const hostname = window.location.hostname;
      let domain: string | undefined;
      let subdomain: string | undefined;
      let organizationId: string | undefined;

      // التعامل مع localhost ونطاقات الـ IP المحلية كنطاقات عامة
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^localhost:\d+$/) || hostname.match(/^127\.0\.0\.1:\d+$/);
      
      loginFormDebugLog('تحليل النطاق:', { hostname, isLocalhost });
      
      if (isLocalhost) {
        domain = 'localhost';
        if (currentSubdomain) {
          subdomain = currentSubdomain;
        }
      } else {
        const publicDomains = ['ktobi.online', 'stockiha.com', 'stockiha.pages.dev'];
        const isPublicDomain = publicDomains.some(pd => hostname === pd || hostname === `www.${pd}`);
        
        if (!isPublicDomain) {
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www') {
            subdomain = parts[0];
          } else {
            domain = hostname;
          }
        } else {
          if (currentSubdomain) {
            subdomain = currentSubdomain;
          }
        }
      }

      // الحصول على معرف المؤسسة من التخزين المحلي إذا كان متوفراً
      organizationId = localStorage.getItem('bazaar_organization_id') || undefined;
      
      loginFormDebugLog('معلومات النطاق المحللة:', {
        domain,
        subdomain,
        organizationId,
        storedOrgId: localStorage.getItem('bazaar_organization_id')
      });

      // محاولات متعددة للتحقق من المستخدم
      let twoFactorCheck = await checkUserRequires2FA(email, organizationId, domain, subdomain);

      if (!twoFactorCheck.exists) {
        // محاولة 2: بدون organizationId
        if (organizationId) {
          localStorage.removeItem('bazaar_organization_id');
          twoFactorCheck = await checkUserRequires2FA(email, undefined, domain, subdomain);
          
          if (!twoFactorCheck.exists) {
            // محاولة 3: كنطاق عام
            twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
          }
        } else {
          twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
        }
      }

      // إذا فشلت جميع المحاولات، جرب التسجيل المباشر مع تجاهل الفحص
      if (!twoFactorCheck.exists) {
        if (twoFactorCheck.error && twoFactorCheck.error.includes('الوضع الآمن')) {
          toast.info(twoFactorCheck.error, { duration: 4000 });
          await proceedWithLogin(email, password);
          return;
        } else {
          // 🔧 محاولة أخيرة: تسجيل دخول مباشر بدون فحص 2FA
          try {
            await proceedWithDirectLogin(email, password);
            return;
          } catch (finalError) {
            toast.error('المستخدم غير موجود أو بيانات تسجيل الدخول غير صحيحة');
            setIsLoading(false);
            return;
          }
        }
      }

      // حفظ معرف المؤسسة الصحيح إذا وُجد
      if (twoFactorCheck.organization_id) {
        localStorage.setItem('bazaar_organization_id', twoFactorCheck.organization_id);
      }

      // عرض رسالة إيجابية إذا كان هناك تحذير (الوضع الآمن)
      if (twoFactorCheck.error && twoFactorCheck.error.includes('الوضع الآمن')) {
        toast.info(twoFactorCheck.error, { duration: 4000 });
      }

      if (twoFactorCheck.requires_2fa) {
        // المستخدم يحتاج للمصادقة الثنائية
        setTwoFactorData({
          userId: twoFactorCheck.user_id!,
          userName: twoFactorCheck.user_name || 'المستخدم',
          email: email
        });
        setPendingCredentials({ email, password });
        setShow2FA(true);
        setIsLoading(false);
        return;
      }

      // إذا لم يكن يحتاج للمصادقة الثنائية، متابعة تسجيل الدخول العادي
      await proceedWithLogin(email, password);
    } catch (error) {
      loginFormDebugLog('❌ خطأ في عملية تسجيل الدخول:', error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setLoadingMessage('جاري تسجيل الدخول...');
      loginFormDebugLog('=== انتهاء عملية تسجيل الدخول من النموذج ===');
    }
  };

  // 🔧 دالة تسجيل دخول مباشر بدون فحص 2FA
  const proceedWithDirectLogin = async (loginEmail: string, loginPassword: string) => {
    loginFormDebugLog('=== بدء تسجيل الدخول المباشر ===', {
      email: loginEmail,
      timestamp: new Date().toISOString()
    });
    const normalizedEmail = loginEmail.toLowerCase().trim();
    
    try {
      // استخدام Supabase مباشرة بدون فحوصات معقدة
      loginFormDebugLog('محاولة المصادقة مع Supabase');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: loginPassword
      });

      if (error) {
        loginFormDebugLog('❌ خطأ في المصادقة:', {
          message: error.message,
          status: error.status
        });
        
        // معالجة أخطاء محددة مع رسائل واضحة
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('بيانات تسجيل الدخول غير صحيحة');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('يرجى تأكيد بريدك الإلكتروني أولاً');
        } else if (error.message?.includes('Too many requests')) {
          throw new Error('محاولات كثيرة، يرجى المحاولة لاحقاً');
        } else if (error.message?.includes('captcha')) {
          // معالجة خاصة لخطأ CAPTCHA - محاولة إعادة تسجيل الدخول
          loginFormDebugLog('🔄 خطأ CAPTCHA مكتشف، محاولة إعادة تسجيل الدخول');
          
          try {
            // محاولة إعادة تسجيل الدخول مع تأخير قصير
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: loginPassword
            });
            
            if (retryError) {
              throw new Error('فشل في التحقق من الأمان، يرجى المحاولة مرة أخرى');
            }
            
                          if (retryData.session && retryData.user) {
                loginFormDebugLog('✅ نجح إعادة تسجيل الدخول بعد خطأ CAPTCHA');
                
                // ⚡ تحديث AuthContext + تعيين الجلسة مباشرة على Supabase
                loginFormDebugLog('⚡ تحديث AuthContext وتعيين الجلسة بعد إعادة المحاولة...');
                updateAuthState(retryData.session, retryData.user);
                try {
                  await supabase.auth.setSession(retryData.session);
                } catch {}
                // انتظار بسيط بعد التعيين
                await new Promise(resolve => setTimeout(resolve, 150));
                try {
                  await saveSecureSession(retryData.session);
                } catch (secureError) {
                  loginFormDebugLog('⚠️ فشل حفظ الجلسة الآمنة بعد إعادة المحاولة:', secureError);
                }
                saveOfflineAuthSnapshot(retryData.session, retryData.user as SupabaseUser);

                // تحديث معرف المؤسسة إذا كان متاحاً
                try {
                  const { data: userData } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', retryData.user.id)
                    .single();
                    
                  if (userData?.organization_id) {
                    localStorage.setItem('bazaar_organization_id', userData.organization_id);
                  }
                } catch (orgError) {
                  loginFormDebugLog('❌ خطأ في جلب معرف المؤسسة:', orgError);
                }
                
                await saveOfflineCredentials(normalizedEmail, loginPassword);
                await handleSuccessfulLogin();
                return;
              }
          } catch (retryError) {
            loginFormDebugLog('❌ فشل إعادة تسجيل الدخول بعد خطأ CAPTCHA:', retryError);
            throw new Error('فشل في التحقق من الأمان، يرجى المحاولة مرة أخرى');
          }
          
          throw new Error('فشل في التحقق من الأمان، يرجى المحاولة مرة أخرى');
        } else if (error.status === 500) {
          // معالجة خطأ الخادم الداخلي
          throw new Error('مشكلة في الخادم، يرجى المحاولة لاحقاً');
        }
        
        // رسالة خطأ عامة لجميع الأخطاء الأخرى
        throw new Error('فشل في تسجيل الدخول، يرجى التحقق من البيانات والمحاولة مرة أخرى');
      }

      if (!data.session || !data.user) {
        loginFormDebugLog('❌ بيانات الجلسة غير متاحة');
        throw new Error('بيانات الجلسة غير متاحة');
      }

      loginFormDebugLog('✅ نجح تسجيل الدخول مع Supabase:', {
        userId: data.user.id,
        userEmail: data.user.email,
        sessionId: data.session.access_token?.substring(0, 20) + '...'
      });

      // ⚡ تحديث AuthContext لضمان مزامنة السياقات الأخرى
      loginFormDebugLog('⚡ تحديث AuthContext بعد نجاح تسجيل الدخول...');
      forceUpdateAuthState(data.session, data.user);
      try {
        await supabase.auth.setSession(data.session);
      } catch {}
      try {
        await saveSecureSession(data.session);
      } catch (secureError) {
        loginFormDebugLog('⚠️ فشل حفظ الجلسة الآمنة بعد تسجيل الدخول المباشر:', secureError);
      }
      saveOfflineAuthSnapshot(data.session, data.user);
      loginFormDebugLog('📁 حالة التخزين بعد حفظ الجلسة', getOfflineStorageSnapshot());

      // انتظار تحديث AuthContext وتحميل البيانات
      setLoadingMessage('جاري تحديث حالة المصادقة...');
      await new Promise(resolve => setTimeout(resolve, 300)); // انتظار محسن
      
      // انتظار إضافي لضمان تحميل userProfile
      setLoadingMessage('جاري تحميل بيانات المستخدم...');
      await new Promise(resolve => setTimeout(resolve, 500)); // انتظار محسن لتحميل البيانات

      // التحقق من ربط المستخدم بالمؤسسة مع إعادة المحاولة
      try {
        setLoadingMessage('جاري التحقق من بيانات المؤسسة...');
        loginFormDebugLog('🔗 التحقق من ربط المستخدم بالمؤسسة مع آلية إعادة المحاولة');
        
        const linkResult = await ensureUserOrganizationLink(data.user.id, 3, 1000);
        
        if (!linkResult.success) {
          loginFormDebugLog('❌ فشل في ربط المستخدم بالمؤسسة:', linkResult.error);
          
          // إذا كان المستخدم غير مرتبط بمؤسسة، وجهه لصفحة إعداد المؤسسة
          if (linkResult.error?.includes('غير مرتبط بأي مؤسسة')) {
            // تسجيل خروج المستخدم أولاً
            await supabase.auth.signOut();
            
            toast.error('حسابك غير مرتبط بأي مؤسسة. سيتم توجيهك لإعداد المؤسسة.');
            navigate('/setup-organization');
            return;
          }
          
          // أخطاء أخرى
          await supabase.auth.signOut();
          throw new Error(linkResult.error || 'فشل في التحقق من بيانات المؤسسة');
        }
        
        loginFormDebugLog('✅ تم ربط المستخدم بالمؤسسة بنجاح:', linkResult.organizationId);
        
      } catch (orgError) {
        loginFormDebugLog('❌ خطأ في التحقق من ربط المؤسسة:', orgError);
        await supabase.auth.signOut();
        throw orgError;
      }

      // حفظ بيانات تسجيل الدخول للأوفلاين
      await saveOfflineCredentials(normalizedEmail, loginPassword);
      loginFormDebugLog('✅ تم حفظ بيانات تسجيل الدخول للأوفلاين');

      setLoadingMessage('تم تسجيل الدخول بنجاح، جاري التحديث...');
      loginFormDebugLog('بدء عملية التوجيه بعد نجاح تسجيل الدخول');
      
      // إخبار AuthContext أن العملية تمت بنجاح (بدون handleSuccessfulLogin لتجنب التكرار)
      loginFormDebugLog('✅ تم التحقق من المصادقة، جاري التوجيه مباشرة');
      
      // تطهير البيانات المخزنة مؤقتاً لضمان البدء بحالة نظيفة
      sessionStorage.clear();
      
      // انتظار مختصر لضمان حفظ البيانات في Supabase
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // استخدام React Router للتنقل بدلاً من window.location
      // هذا يضمن التنقل السلس بدون إعادة تحميل كاملة
      navigate('/dashboard');
      
    } catch (error) {
      loginFormDebugLog('❌ خطأ في تسجيل الدخول المباشر:', error);

      const offlineStatus = await attemptOfflineFallback(error, normalizedEmail, loginPassword);
      if (offlineStatus !== 'skipped') {
        return;
      }
      
      // عرض رسالة خطأ واضحة للمستخدم
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast.error(errorMessage);
      throw error;
    }
  };

  const proceedWithLogin = async (loginEmail: string, loginPassword: string) => {
    try {
      const normalizedEmail = loginEmail.toLowerCase().trim();

      // 🔧 استخدام النظام المحسن لتسجيل الدخول
      const { signIn: improvedSignIn } = await import('@/lib/api/authHelpers');
      const result = await improvedSignIn(loginEmail, loginPassword);

      // حفظ بيانات تسجيل الدخول للأوفلاين حتى لو فشل تسجيل الدخول
      await saveOfflineCredentials(normalizedEmail, loginPassword);
      
      if (result.success) {
        loginFormDebugLog('✅ تم حفظ بيانات تسجيل الدخول للأوفلاين (تسجيل دخول محسن)');
        
        if (result.session) {
          try {
            await saveSecureSession(result.session as Session);
          } catch (secureError) {
            loginFormDebugLog('⚠️ فشل حفظ الجلسة الآمنة بعد تسجيل الدخول المحسن:', secureError);
          }
        }
        loginFormDebugLog('📁 حالة التخزين بعد تسجيل الدخول المحسن', getOfflineStorageSnapshot());

        // 🎯 تبسيط التحقق من الجلسة - إزالة التحقق المعقد
        
        // التوجيه المباشر بدون تعقيدات النطاق الفرعي
        await handleSuccessfulLogin();
      } else {
        // معالجة رسائل الخطأ بشكل أفضل
        let errorMessage = result.error?.message || 'فشل تسجيل الدخول';
        
        // تنظيف رسائل الخطأ من أي إشارات إلى captcha
        if (errorMessage.toLowerCase().includes('captcha')) {
          errorMessage = 'فشل في التحقق من الأمان، يرجى المحاولة مرة أخرى';
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
          errorMessage = 'مشكلة في الخادم، يرجى المحاولة لاحقاً';
        }
        
        toast.error(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      // معالجة الأخطاء العامة
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // تنظيف رسائل الخطأ
        if (errorMessage.toLowerCase().includes('captcha')) {
          errorMessage = 'فشل في التحقق من الأمان، يرجى المحاولة مرة أخرى';
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
          errorMessage = 'مشكلة في الخادم، يرجى المحاولة لاحقاً';
        }
      }
      
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSuccessfulLogin = async () => {
    loginFormDebugLog('=== بدء معالجة نجاح تسجيل الدخول ===');
    
    try {
      toast.success('تم تسجيل الدخول بنجاح');
      
      // تنظيف البيانات المحفوظة
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('loginRedirectCount');
      
      loginFormDebugLog('تم تنظيف البيانات المحفوظة');
      
      // 🎯 تحسين: انتظار قصير ومحسن لـ AuthContext
      loginFormDebugLog('انتظار اكتمال عمليات AuthContext...');
      setLoadingMessage('جاري تحميل بيانات المستخدم والمؤسسة...');
      
      // انتظار محسن لـ AuthContext مع فحص دوري
      const maxWaitTime = 8000; // 8 ثوانٍ حد أقصى (مخفض من 15)
      const checkInterval = 100; // فحص كل 100ms (محسن من 200ms)
      let waitTime = 0;
      
      while (authLoading && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        
        if (waitTime % 500 === 0) { // كل نصف ثانية
          const secondsWaited = Math.floor(waitTime/1000);
          setLoadingMessage(`جاري تحميل البيانات... (${secondsWaited}s)`);
          loginFormDebugLog(`⏳ انتظار AuthContext... ${secondsWaited}s`);
        }
      }
      
      if (authLoading) {
        loginFormDebugLog('⚠️ انتهت مهلة انتظار AuthContext، المتابعة...');
      } else {
        loginFormDebugLog('✅ انتهى AuthContext من التحميل');
        loginFormDebugLog('📊 حالة البيانات:', {
          hasUser: !!user,
          hasUserProfile: !!userProfile,
          hasOrganization: !!organization,
          userEmail: user?.email
        });
      }
      
      setLoadingMessage('جاري الانتقال إلى لوحة التحكم...');
      
      // 🎯 التوجيه بعد اكتمال العمليات
      let posPath = '/dashboard';
      
      if (redirectPath && redirectPath.startsWith('/dashboard')) {
        posPath = redirectPath;
      }

      loginFormDebugLog('التوجيه إلى:', posPath);

      setIsLoading(false);
      navigate(posPath);
      loginFormDebugLog('✅ تم التوجيه بنجاح');
      
    } catch (error) {
      loginFormDebugLog('❌ خطأ في معالجة نجاح تسجيل الدخول:', error);
      
      // رغم الخطأ، نكمل التوجيه
      toast.success('تم تسجيل الدخول بنجاح');
      setIsLoading(false);
      navigate('/dashboard');
      loginFormDebugLog('✅ تم التوجيه رغم الخطأ');
    }
  };

  // دوال التعامل مع المصادقة الثنائية
  const handle2FASuccess = async () => {
    if (!pendingCredentials) return;
    
    setShow2FA(false);
    setIsLoading(true);
    
    // متابعة تسجيل الدخول بعد نجاح المصادقة الثنائية
    await proceedWithLogin(pendingCredentials.email, pendingCredentials.password);
    
    // تنظيف البيانات المؤقتة
    setPendingCredentials(null);
    setTwoFactorData(null);
  };

  const handle2FABack = () => {
    setShow2FA(false);
    setTwoFactorData(null);
    setPendingCredentials(null);
    setIsLoading(false);
  };

  // إذا كنا في وضع المصادقة الثنائية، عرض نموذج المصادقة الثنائية
  if (show2FA && twoFactorData) {
    return (
      <TwoFactorLoginForm
        userId={twoFactorData.userId}
        userName={twoFactorData.userName}
        email={twoFactorData.email}
        onSuccess={handle2FASuccess}
        onBack={handle2FABack}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* شعار أو أيقونة */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 rounded-full mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 bg-clip-text text-transparent">
            مرحباً بعودتك
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            قم بتسجيل الدخول للوصول إلى لوحة التحكم
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">تسجيل الدخول</CardTitle>
            {currentSubdomain && (
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#fc5d41]/10 text-[#fc5d41] dark:bg-[#fc5d41]/20 dark:text-[#fc5d41]">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  مستخدم النطاق {currentSubdomain}
                </span>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني"
                    required
                    autoComplete="username"
                    className="text-right pl-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm"
                    dir="rtl"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                    autoComplete="current-password"
                    className="text-right pl-20 pr-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm"
                    dir="rtl"
                  />
                  {/* أيقونة القفل */}
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  
                  {/* زر إظهار/إخفاء كلمة المرور */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-[#fc5d41]"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      // أيقونة إخفاء كلمة المرور (عين مع خط)
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      // أيقونة إظهار كلمة المرور (عين)
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none rounded-lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loadingMessage}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    تسجيل الدخول
                  </div>
                )}
              </Button>
              
              {/* رابط نسيت كلمة المرور */}
              <div className="text-center">
                <a 
                  href="/forgot-password" 
                  className="text-sm font-medium text-[#fc5d41] hover:text-[#fc5d41]/80 dark:text-[#fc5d41] dark:hover:text-[#fc5d41]/80 transition-colors"
                >
                  نسيت كلمة المرور؟
                </a>
              </div>
            </form>
          </CardContent>
          
          {!currentSubdomain && (
            <CardFooter className="border-t bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg">
              <div className="w-full text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  هل تريد إنشاء نظام خاص بمؤسستك؟
                </p>
                <a 
                  href="/tenant/signup" 
                  className="inline-flex items-center text-sm font-medium text-[#fc5d41] hover:text-[#fc5d41]/80 dark:text-[#fc5d41] dark:hover:text-[#fc5d41]/80 transition-colors group"
                >
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  إنشاء حساب مسؤول مع نطاق فرعي
                </a>
              </div>
            </CardFooter>
          )}
        </Card>
        
        {/* معلومات إضافية في أسفل الصفحة */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 سطوكيها - منصة التجارة الإلكترونية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
