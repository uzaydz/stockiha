import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from '@/lib/supabase-unified';
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { checkUserRequires2FA } from '@/lib/api/authHelpers';
import { ensureUserOrganizationLink } from '@/lib/api/auth-helpers';
import { loadSecureSession, saveSecureSession } from '@/context/auth/utils/secureSessionStorage';
import { loadAuthFromStorage, loadOfflineAuthSnapshot, saveOfflineAuthSnapshot } from '@/context/auth/utils/authStorage';
import { offlineSubscriptionService } from '@/api/offlineSubscriptionService';
import TwoFactorLoginForm from './TwoFactorLoginForm';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, Loader2 } from 'lucide-react';

// Debug logging removed for production
const loginFormDebugLog = (message: string, data?: any) => {
  // No-op
};

const ensureGlobalDB = async (): Promise<boolean> => {
  console.log('[OfflineAuth] 🗄️ ensureGlobalDB - بدء التهيئة...');
  try {
    const sqliteAvailable = isSQLiteAvailable();
    console.log('[OfflineAuth] 🗄️ isSQLiteAvailable:', sqliteAvailable);

    if (sqliteAvailable) {
      console.log('[OfflineAuth] 🗄️ جاري استدعاء sqliteDB.initialize("global")...');
      const res = await sqliteDB.initialize('global');
      console.log('[OfflineAuth] 🗄️ نتيجة التهيئة:', { success: res?.success, error: res?.error });
      return Boolean(res?.success);
    } else {
      console.log('[OfflineAuth] ❌ SQLite غير متاح!');
    }
  } catch (e) {
    console.error('[OfflineAuth] ❌ خطأ في تهيئة قاعدة البيانات:', e);
    loginFormDebugLog('⚠️ فشل تهيئة قاعدة بيانات global للأوفلاين:', e);
  }
  return false;
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
  algo?: 'sha256' | 'raw';
  fallbackHash?: string;
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

const encodeSalted = (salt: string, password: string): Uint8Array => {
  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  if (enc) {
    return enc.encode(`${salt}:${password}`);
  }
  const fallback: number[] = [];
  const raw = `${salt}:${password}`;
  for (let i = 0; i < raw.length; i += 1) {
    fallback.push(raw.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(fallback);
};

const computeHashes = async (password: string, salt: string): Promise<{ sha?: string; raw: string }> => {
  try {
    const data = encodeSalted(salt, password);
    let sha: string | undefined;
    try {
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const digest = await window.crypto.subtle.digest('SHA-256', data as BufferSource);
        sha = bufferToHex(digest);
      }
    } catch { }
    const raw = bufferToHex(data);
    return { sha, raw };
  } catch {
    return { raw: '' };
  }
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

const writeOfflineCredentialStore = (_store: Record<string, OfflineCredentialRecord>) => {
  // تم إيقاف التخزين في localStorage لبيانات الاعتماد. سنستخدم SQLite فقط.
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
    const initialized = await ensureGlobalDB();
    if (!initialized) {
      loginFormDebugLog('⚠️ SQLite غير متاح لحفظ بيانات الاعتماد');
      return;
    }

    const salt = generateSalt();
    const { sha, raw } = await computeHashes(password, salt);
    const hash = sha ?? raw;
    if (!hash) {
      console.error('[OfflineAuth] ⚠️ فشل في إنشاء hash لكلمة المرور الأوفلاين');
      return;
    }

    const algo = sha ? 'sha256' : 'raw';

    // 🔍 تسجيل تشخيصي للحفظ
    console.log('%c[OfflineAuth] 💾 ═══ حفظ بيانات الاعتماد للأوفلاين ═══', 'color: #4CAF50; font-weight: bold');
    console.log('[OfflineAuth] 📧 البريد:', normalizedEmail);
    console.log('[OfflineAuth] 🧂 Salt:', salt.slice(0, 20) + '... (طول: ' + salt.length + ')');
    console.log('[OfflineAuth] 📝 الخوارزمية:', algo);
    console.log('[OfflineAuth] 🔑 Hash الرئيسي:', hash.slice(0, 20) + '... (طول: ' + hash.length + ')');
    console.log('[OfflineAuth] 🔑 Fallback Hash:', raw?.slice(0, 20) + '... (طول: ' + raw?.length + ')');
    console.log('[OfflineAuth] 🔐 crypto.subtle متاح:', Boolean(window.crypto?.subtle));

    const now = new Date().toISOString();
    const rec = {
      id: normalizedEmail,
      email: email,
      email_lower: normalizedEmail,
      salt,
      hash,
      algo,
      fallback_hash: raw,
      user_id: null,
      organization_id: localStorage.getItem('bazaar_organization_id') || null,
      created_at: now,
      updated_at: now
    } as any;

    const result = await sqliteDB.upsert('user_credentials', rec);
    console.log('[OfflineAuth] ✅ نتيجة الحفظ:', result.success ? 'نجاح' : 'فشل', { changes: result.changes });
    loginFormDebugLog('💾 تم حفظ بيانات تسجيل الدخول للأوفلاين في SQLite:', {
      email: normalizedEmail,
      success: result.success,
      changes: result.changes
    });
  } catch (error) {
    loginFormDebugLog('❌ خطأ في حفظ بيانات تسجيل الدخول للأوفلاين:', error);
  }
};

const verifyOfflineCredentials = async (email: string, password: string): Promise<boolean> => {
  // 🔍 تشخيص مبكر جداً - بداية الدالة
  console.log('%c[OfflineAuth] 🚀 ═══ بدء verifyOfflineCredentials ═══', 'color: #FF5722; font-weight: bold');
  console.log('[OfflineAuth] 📧 البريد المدخل:', email);
  console.log('[OfflineAuth] 🔑 كلمة المرور موجودة:', Boolean(password));

  if (!email || !password) {
    console.log('[OfflineAuth] ❌ البريد أو كلمة المرور فارغة!');
    return false;
  }
  if (typeof window === 'undefined') {
    console.log('[OfflineAuth] ❌ window غير معرف!');
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  console.log('[OfflineAuth] 📧 البريد بعد التطبيع:', normalizedEmail);

  // 🔍 تشخيص ensureGlobalDB
  console.log('[OfflineAuth] ⏳ جاري تهيئة SQLite...');
  const initialized = await ensureGlobalDB();
  console.log('[OfflineAuth] 🗄️ نتيجة تهيئة SQLite:', initialized);

  if (!initialized) {
    console.log('%c[OfflineAuth] ❌ فشل تهيئة SQLite!', 'color: #f44336; font-weight: bold');
    loginFormDebugLog('❌ فشل تهيئة SQLite للتحقق من بيانات الاعتماد');
    return false;
  }

  // قراءة السجل من SQLite
  console.log('[OfflineAuth] ⏳ جاري البحث عن السجل في user_credentials...');
  let res = await sqliteDB.queryOne('SELECT * FROM user_credentials WHERE email_lower = ?', [normalizedEmail]);
  console.log('[OfflineAuth] 📋 نتيجة الاستعلام:', { success: res?.success, hasData: Boolean(res?.data), error: res?.error });

  if (!res.success || !res.data) {
    // محاولة ترحيل بيانات الاعتماد القديمة من localStorage إلى SQLite لمرة واحدة
    const legacyStore = readOfflineCredentialStore();
    const legacy = legacyStore[normalizedEmail];
    if (legacy?.salt && legacy?.hash) {
      try {
        const now = new Date().toISOString();
        const migrated = {
          id: normalizedEmail,
          email,
          email_lower: normalizedEmail,
          salt: legacy.salt,
          hash: legacy.hash,
          algo: legacy.algo ?? null,
          fallback_hash: legacy.fallbackHash ?? null,
          user_id: null,
          organization_id: localStorage.getItem('bazaar_organization_id') || null,
          created_at: now,
          updated_at: now
        } as any;
        const up = await sqliteDB.upsert('user_credentials', migrated);
        loginFormDebugLog('🔄 تم ترحيل بيانات الاعتماد من التخزين القديم إلى SQLite', { success: up.success, changes: up.changes });
        // إعادة القراءة بعد الترحيل
        res = await sqliteDB.queryOne('SELECT * FROM user_credentials WHERE email_lower = ?', [normalizedEmail]);
      } catch (mErr) {
        loginFormDebugLog('⚠️ فشل ترحيل بيانات الاعتماد القديمة:', mErr);
      }
    }
    if (!res.success || !res.data) {
      loginFormDebugLog('❌ لا توجد بيانات محفوظة لهذا البريد الإلكتروني في SQLite');
      return false;
    }
  }

  const record: any = res.data;
  const { sha, raw } = await computeHashes(password, record.salt);

  // 🔍 تشخيص مفصل للمقارنة
  console.log('%c[OfflineAuth] 🔐 ═══ تشخيص التحقق من كلمة المرور ═══', 'color: #9C27B0; font-weight: bold');
  console.log('[OfflineAuth] 📧 البريد:', normalizedEmail);
  console.log('[OfflineAuth] 🧂 Salt المخزن:', record.salt?.slice(0, 20) + '...');
  console.log('[OfflineAuth] 📝 الخوارزمية المخزنة:', record.algo || 'غير محدد');
  console.log('[OfflineAuth] 🔑 Hash المخزن:', record.hash?.slice(0, 20) + '... (طول: ' + record.hash?.length + ')');
  console.log('[OfflineAuth] 🔑 Hash المحسوب SHA:', sha ? sha.slice(0, 20) + '... (طول: ' + sha?.length + ')' : 'فشل الحساب');
  console.log('[OfflineAuth] 🔑 Hash المحسوب Raw:', raw?.slice(0, 20) + '... (طول: ' + raw?.length + ')');
  console.log('[OfflineAuth] 🔑 Fallback Hash المخزن:', record.fallback_hash ? record.fallback_hash.slice(0, 20) + '... (طول: ' + record.fallback_hash?.length + ')' : 'لا يوجد');

  let isValid = false;
  let matchReason = '';

  // 1. مقارنة SHA المحسوب مع Hash المخزن
  if (sha && record.hash === sha) {
    isValid = true;
    matchReason = 'SHA مع Hash الرئيسي';
  }

  // 2. مقارنة Raw المحسوب مع Hash المخزن (للتوافق مع التخزين القديم)
  if (!isValid && record.hash === raw) {
    isValid = true;
    matchReason = 'Raw مع Hash الرئيسي';
  }

  // 3. مقارنة مع fallback_hash
  if (!isValid && record.fallback_hash) {
    if (record.fallback_hash === raw) {
      isValid = true;
      matchReason = 'Raw مع Fallback Hash';
    }
    if (!isValid && sha && record.fallback_hash === sha) {
      isValid = true;
      matchReason = 'SHA مع Fallback Hash';
    }
  }

  // 4. ⚡ إصلاح: إذا الخوارزمية المخزنة هي 'raw' لكن نحن نقارن بـ SHA
  if (!isValid && record.algo === 'raw' && raw) {
    // الخوارزمية المخزنة هي raw، لذلك نقارن raw فقط
    if (record.hash === raw) {
      isValid = true;
      matchReason = 'Raw مع Raw (algo=raw)';
    }
  }

  // 5. ⚡ إصلاح: إذا الخوارزمية المخزنة هي 'sha256' لكن crypto.subtle غير متاح
  if (!isValid && record.algo === 'sha256' && !sha && record.fallback_hash) {
    // SHA غير متاح الآن، لكن لدينا fallback_hash من وقت التخزين
    // نحسب raw ونقارنه مع fallback_hash
    if (record.fallback_hash === raw) {
      isValid = true;
      matchReason = 'Raw مع Fallback (crypto.subtle غير متاح)';
    }
  }

  console.log('[OfflineAuth] ✅ النتيجة:', isValid ? `صحيح (${matchReason})` : '❌ غير صحيح');
  if (!isValid) {
    console.log('%c[OfflineAuth] ⚠️ تفاصيل الفشل:', 'color: #f44336; font-weight: bold');
    console.log('  - Hash المخزن ≠ SHA المحسوب:', record.hash !== sha);
    console.log('  - Hash المخزن ≠ Raw المحسوب:', record.hash !== raw);
    if (record.fallback_hash) {
      console.log('  - Fallback ≠ SHA:', record.fallback_hash !== sha);
      console.log('  - Fallback ≠ Raw:', record.fallback_hash !== raw);
    }
  }

  loginFormDebugLog('🔐 نتيجة التحقق من كلمة المرور (SQLite):', {
    isValid,
    matchReason,
    hasStoredHash: Boolean(record.hash),
    hasComputedSHA: Boolean(sha),
    hasComputedRaw: Boolean(raw)
  });

  if (isValid) {
    try {
      // تحديث last_success_at
      await sqliteDB.execute('UPDATE user_credentials SET last_success_at = ?, updated_at = ? WHERE id = ?', [new Date().toISOString(), new Date().toISOString(), record.id]);
    } catch { }
  }

  return isValid;
};

const LoginForm = () => {
  const { signIn, currentSubdomain, updateAuthState, forceUpdateAuthState, user, userProfile, organization, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMounted = useRef(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('جاري تسجيل الدخول...');
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    loginFormDebugLog('🔄 محاولة تسجيل الدخول الأوفلاين', { email: normalizedEmail });

    // 🔒 مسح علامة explicit logout عند محاولة تسجيل الدخول الأوفلاين
    try {
      localStorage.removeItem('bazaar_explicit_logout');
      if (process.env.NODE_ENV === 'development') {
        console.log('[LoginForm] ✅ تم مسح علامة explicit logout');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[LoginForm] فشل في مسح علامة explicit logout:', error);
      }
    }

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
          token_type: 'bearer',
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

      // التحقق من صلاحية الاشتراك أوفلاين
      if (offlineUser.app_metadata?.organization_id) {
        const subStatus = await offlineSubscriptionService.checkSubscriptionStatus(offlineUser.app_metadata.organization_id as string);
        if (!subStatus.isValid) {
          toast.error(`عذراً، اشتراكك منتهي الصلاحية (${subStatus.reason}). يرجى الاتصال بالإنترنت لتجديد الاشتراك.`);
          loginFormDebugLog('🚫 تم منع الدخول بسبب انتهاء الاشتراك (أوفلاين)', subStatus);
          return false;
        }
      }

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

    // استعادة البريد الإلكتروني المحفوظ إذا كان المستخدم قد فعّل خيار "تذكرني"
    const savedEmail = localStorage.getItem('bazaar_remember_email');
    const isRemembered = localStorage.getItem('bazaar_remember_me') === 'true';

    if (savedEmail && isRemembered) {
      setEmail(savedEmail);
      setRememberMe(true);
      loginFormDebugLog('📧 تم استعادة البريد الإلكتروني المحفوظ:', savedEmail);
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

  // تنظيف isMounted عند unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
              } catch { }
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

              // ✅ حفظ أو حذف البريد الإلكتروني حسب اختيار "تذكرني" (CAPTCHA retry)
              try {
                if (rememberMe) {
                  localStorage.setItem('bazaar_remember_email', normalizedEmail);
                  localStorage.setItem('bazaar_remember_me', 'true');
                  loginFormDebugLog('📧 تم حفظ البريد الإلكتروني (تذكرني مفعّل - CAPTCHA retry)');
                } else {
                  localStorage.removeItem('bazaar_remember_email');
                  localStorage.removeItem('bazaar_remember_me');
                  loginFormDebugLog('🗑️ تم حذف البريد الإلكتروني المحفوظ (تذكرني غير مفعّل - CAPTCHA retry)');
                }
              } catch (rememberErr) {
                loginFormDebugLog('⚠️ فشل في حفظ/حذف خيار تذكرني (CAPTCHA retry):', rememberErr);
              }

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
      } catch { }
      try {
        await saveSecureSession(data.session);
      } catch (secureError) {
        loginFormDebugLog('⚠️ فشل حفظ الجلسة الآمنة بعد تسجيل الدخول المباشر:', secureError);
      }
      saveOfflineAuthSnapshot(data.session, data.user);
      // ✅ حفظ بيانات الاعتماد للأوفلاين بعد نجاح التسجيل المباشر أيضاً
      try {
        await saveOfflineCredentials(normalizedEmail, loginPassword);
        loginFormDebugLog('💾 تم حفظ بيانات الاعتماد للأوفلاين بعد تسجيل الدخول المباشر');
      } catch (credErr) {
        loginFormDebugLog('⚠️ فشل حفظ بيانات الاعتماد للأوفلاين بعد التسجيل المباشر:', credErr);
      }

      // ✅ حفظ أو حذف البريد الإلكتروني حسب اختيار "تذكرني"
      try {
        if (rememberMe) {
          localStorage.setItem('bazaar_remember_email', normalizedEmail);
          localStorage.setItem('bazaar_remember_me', 'true');
          loginFormDebugLog('📧 تم حفظ البريد الإلكتروني (تذكرني مفعّل)');
        } else {
          localStorage.removeItem('bazaar_remember_email');
          localStorage.removeItem('bazaar_remember_me');
          loginFormDebugLog('🗑️ تم حذف البريد الإلكتروني المحفوظ (تذكرني غير مفعّل)');
        }
      } catch (rememberErr) {
        loginFormDebugLog('⚠️ فشل في حفظ/حذف خيار تذكرني:', rememberErr);
      }

      loginFormDebugLog('📁 حالة التخزين بعد حفظ الجلسة', getOfflineStorageSnapshot());

      // انتظار تحديث AuthContext وتحميل البيانات
      setLoadingMessage('جاري تحديث حالة المصادقة...');
      await new Promise(resolve => setTimeout(resolve, 300)); // انتظار محسن

      // انتظار إضافي لضمان تحميل userProfile
      setLoadingMessage('جاري تحميل بيانات المستخدم...');
      await new Promise(resolve => setTimeout(resolve, 500)); // انتظار محسن لتحميل البيانات

      // التحقق من ربط المستخدم بالمؤسسة مع مهلة زمنية وعدم حظر التوجيه
      setLoadingMessage('جاري التحقق من بيانات المؤسسة...');
      loginFormDebugLog('🔗 التحقق من ربط المستخدم بالمؤسسة مع مهلة زمنية');

      try {
        const linkPromise = ensureUserOrganizationLink(data.user.id, 2, 800);
        const timedOut = new Promise<{ success: false; error: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'timeout' }), 2000)
        );
        const linkResult: any = await Promise.race([linkPromise, timedOut]);

        if (!linkResult?.success) {
          loginFormDebugLog('⚠️ لم يكتمل ربط المؤسسة أو فشل/انتهت المهلة:', linkResult?.error);
          // حالة خاصة: المستخدم غير مرتبط بأي مؤسسة -> وجّهه للإعداد
          if (linkResult?.error?.includes?.('غير مرتبط بأي مؤسسة')) {
            try { await supabase.auth.signOut(); } catch { }
            toast.error('حسابك غير مرتبط بأي مؤسسة. سيتم توجيهك لإعداد المؤسسة.');
            setIsLoading(false);
            navigate('/setup-organization');
            return;
          }
          // غير ذلك: نتابع التوجيه ونحاول الربط في الخلفية بدون إيقاف المستخدم
          setTimeout(() => { void ensureUserOrganizationLink(data.user.id, 2, 800); }, 0);
        } else {
          loginFormDebugLog('✅ تم ربط المستخدم بالمؤسسة بنجاح:', linkResult.organizationId);
        }
      } catch (orgError) {
        // لا نمنع التوجيه بسبب مشاكل ثانوية
        loginFormDebugLog('⚠️ تخطي خطأ ربط المؤسسة والمتابعة:', orgError);
      }

      // انتظار مختصر لضمان حفظ البيانات في Supabase
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!isMounted.current) {
        loginFormDebugLog('🛑 تم إلغاء التوجيه المباشر لأن المكون غير مثبت');
        return;
      }

      // إيقاف حالة التحميل قبل التوجيه
      try {
        console.log('[LoginForm] pre-navigate state', {
          isLoading,
          authLoading,
          userId: user?.id,
          orgId: organization?.id,
          currentHref: window.location.href,
          currentHash: window.location.hash
        });
      } catch { }
      
      setIsLoading(false);

      // سجل بعد تغيير حالة التحميل
      try {
        console.log('[LoginForm] setIsLoading(false) applied');
      } catch { }

      // التحقق مرة أخرى قبل التوجيه النهائي
      if (window.location.pathname.includes('/staff-login')) {
        loginFormDebugLog('🚫 تم إلغاء التوجيه لأننا بالفعل في staff-login');
        return;
      }

      // استخدام React Router للتنقل بدلاً من window.location
      // هذا يضمن التنقل السلس بدون إعادة تحميل كاملة
      navigate('/dashboard');
      try {
        console.log('[LoginForm] navigate("/dashboard") called');
        setTimeout(() => {
          try { console.log('[LoginForm] post-navigate location', { href: window.location.href, hash: window.location.hash }); } catch { }
        }, 200);
      } catch { }
      return;
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
      if (isMounted.current) {
        toast.success('تم تسجيل الدخول بنجاح');
      }

      // تنظيف البيانات المحفوظة
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('loginRedirectCount');

      loginFormDebugLog('تم تنظيف البيانات المحفوظة');

      if (!isMounted.current) return; // الخروج إذا تم إلغاء التركيب

      // 🎯 تحسين: انتظار قصير ومحسن لـ AuthContext
      loginFormDebugLog('انتظار اكتمال عمليات AuthContext...');
      setLoadingMessage('جاري تحميل بيانات المستخدم والمؤسسة...');

      // انتظار محسن لـ AuthContext مع فحص دوري
      const maxWaitTime = 8000; // 8 ثوانٍ حد أقصى (مخفض من 15)
      const checkInterval = 100; // فحص كل 100ms (محسن من 200ms)
      let waitTime = 0;

      if (!isMounted.current) return;
      while (authLoading && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;

        if (waitTime % 500 === 0) { // كل نصف ثانية
          const secondsWaited = Math.floor(waitTime / 1000);
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

      // ✅ FIX: Check if StaffLoginRedirect intercepted us
      const lastStaffRedirect = sessionStorage.getItem('staff_last_redirect_time');
      const isStaffRedirectRecent = lastStaffRedirect && (Date.now() - parseInt(lastStaffRedirect)) < 5000;
      const isStaffLoginPage = window.location.pathname.includes('/staff-login');

      if (isStaffRedirectRecent || isStaffLoginPage) {
        loginFormDebugLog('🚫 تم إيقاف التوجيه إلى لوحة التحكم لأن المستخدم موجه إلى staff-login');
        if (isMounted.current) {
          setIsLoading(false);
          return;
        }
      }

      if (!isMounted.current) return;

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 font-tajawal selection:bg-orange-500/20">
      {/* Left Side - Visual & Brand (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 flex-col justify-between p-12 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '15s' }} />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-orange-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '20s', animationDelay: '2s' }} />
        </div>

        {/* Brand Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">سطوكيها</span>
        </motion.div>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 max-w-lg"
        >
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            أدر تجارتك <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200">
              بذكاء واحترافية
            </span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            المنصة المتكاملة لإدارة المخزون، المبيعات، والعملاء. صممت لتنمو مع طموحك وتسهل عليك اتخاذ القرارات الصحيحة.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3">
            {['إدارة مخزون ذكية', 'تقارير فورية', 'دعم فني متواصل'].map((feature, idx) => (
              <div key={idx} className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full text-sm text-white/90">
                {feature}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer/Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl max-w-md">
            <div className="flex -space-x-3 space-x-reverse shrink-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="User" className="w-full h-full" />
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-3 h-3 text-orange-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-slate-300">انضم إلى أكثر من <span className="text-white font-bold">2,000+</span> شركة تثق بنا</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 relative">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-6 left-6 right-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">سطوكيها</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-right space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">تسجيل الدخول</h2>
            <p className="text-slate-500 dark:text-slate-400">
              مرحباً بعودتك! الرجاء إدخال بياناتك للمتابعة
            </p>
          </div>

          {currentSubdomain && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 bg-blue-100 dark:bg-blue-800/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">أنت تسجل الدخول إلى</p>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-300">{currentSubdomain}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">البريد الإلكتروني</Label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoComplete="username"
                  className="h-12 pr-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl transition-all"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">كلمة المرور</Label>
                <a href="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors">
                  نسيت كلمة المرور؟
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-12 pr-10 pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl transition-all"
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer group select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center ${rememberMe ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600 bg-transparent group-hover:border-orange-400'}`}>
                    {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <span className="mr-2 text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">تذكرني على هذا الجهاز</span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  <span>{loadingMessage}</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-5 h-5 mr-2" />
                </>
              )}
            </Button>
          </form>

          {!currentSubdomain && (
            <div className="pt-6 text-center border-t border-slate-100 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                ليس لديك حساب مؤسسة بعد؟
              </p>
              <a
                href="/tenant/signup"
                className="inline-flex items-center justify-center w-full px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:border-orange-500 hover:text-orange-500 dark:hover:border-orange-500 dark:hover:text-orange-500 transition-all duration-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
              >
                <span>إنشاء حساب جديد</span>
              </a>
            </div>
          )}
        </motion.div>

        <div className="absolute bottom-6 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            © 2025 Stockiha. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
