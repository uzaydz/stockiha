import { Session } from '@supabase/supabase-js';

const STORAGE_KEY = 'secure_offline_session_v1';
const META_KEY = 'secure_offline_session_meta_v1';
const FALLBACK_KEY_STORAGE = 'secure_offline_session_key_v1';

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

const isBrowser = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV === 'development';

// ⚡ منع التكرار - حفظ آخر جلسة تم حفظها
let lastSavedSessionUserId: string | null = null;
let lastSaveTimestamp = 0;
const MIN_SAVE_INTERVAL = 5000; // 5 ثواني بين كل حفظ

export interface SecureSessionMeta {
  userId?: string | null;
  expiresAt?: number | null;
  storedAt?: number | null;
}

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  return uint8ArrayToBase64(new Uint8Array(buffer));
};

const hasElectronBridge = (): boolean => {
  if (!isBrowser) return false;
  return Boolean((window as any)?.electronAPI?.secureSession);
};

const ensureFallbackKey = (): string | null => {
  if (!isBrowser) return null;
  try {
    let key = localStorage.getItem(FALLBACK_KEY_STORAGE);
    if (!key) {
      if (!window.crypto || !window.crypto.getRandomValues) {
        return null;
      }
      const bytes = window.crypto.getRandomValues(new Uint8Array(32));
      key = uint8ArrayToBase64(bytes);
      localStorage.setItem(FALLBACK_KEY_STORAGE, key);
    }
    return key;
  } catch (error) {
    console.error('[SecureSession] فشل إنشاء المفتاح الاحتياطي:', error);
    return null;
  }
};

const requestDeviceKey = async (): Promise<string | null> => {
  if (!isBrowser) return null;

  if (hasElectronBridge()) {
    try {
      return await window.electronAPI.secureSession.getOrCreateKey();
    } catch (error) {
      console.error('[SecureSession] فشل الحصول على مفتاح من Electron:', error);
      return null;
    }
  }

  return ensureFallbackKey();
};

const importCryptoKey = async (): Promise<CryptoKey | null> => {
  if (!isBrowser || !window.crypto?.subtle || !encoder) {
    return null;
  }

  const rawKey = await requestDeviceKey();
  if (!rawKey) {
    return null;
  }

  try {
    const keyBytes = base64ToUint8Array(rawKey);
    return await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('[SecureSession] فشل في استيراد مفتاح التشفير:', error);
    return null;
  }
};

export const hasStoredSecureSession = (): boolean => {
  if (!isBrowser) return false;
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY) && localStorage.getItem(META_KEY));
  } catch {
    return false;
  }
};

export const getSecureSessionMeta = (): SecureSessionMeta | null => {
  if (!isBrowser) return null;
  try {
    const rawMeta = localStorage.getItem(META_KEY);
    if (!rawMeta) return null;
    return JSON.parse(rawMeta) as SecureSessionMeta;
  } catch (error) {
    return null;
  }
};

const saveSessionMeta = (session: Session) => {
  const meta: SecureSessionMeta = {
    userId: session.user?.id ?? null,
    expiresAt: session.expires_at ?? null,
    storedAt: Date.now()
  };
  localStorage.setItem(META_KEY, JSON.stringify(meta));
};

const saveFallbackSession = (session: Session) => {
  try {
    const serialized = JSON.stringify(session);
    const payload = {
      v: 'plain',
      data: typeof btoa === 'function' ? btoa(serialized) : serialized
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    saveSessionMeta(session);
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('[SecureSession] stored fallback session', {
          userId: session.user?.id,
          expiresAt: session.expires_at
        });
      } catch {}
    }
  } catch (error) {
    console.error('[SecureSession] فشل حفظ جلسة الأوفلاين بالوضع الاحتياطي:', error);
  }
};

export const saveSecureSession = async (session: Session | null): Promise<void> => {
  if (!isBrowser || !session) return;

  // ⚡ منع التكرار - تجاهل الحفظ إذا كانت نفس الجلسة
  const now = Date.now();
  const userId = session.user?.id;
  if (
    userId === lastSavedSessionUserId &&
    now - lastSaveTimestamp < MIN_SAVE_INTERVAL
  ) {
    // تجاهل الحفظ المتكرر
    return;
  }

  // تحديث المتغيرات
  lastSavedSessionUserId = userId ?? null;
  lastSaveTimestamp = now;

  // إذا لم يتوفر التشفير الحديث نستخدم الوضع الاحتياطي
  if (!encoder || !window.crypto?.subtle) {
    saveFallbackSession(session);
    return;
  }

  const cryptoKey = await importCryptoKey();
  if (!cryptoKey) {
    saveFallbackSession(session);
    return;
  }

  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const serialized = JSON.stringify(session);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoder.encode(serialized)
    );

    const payload = {
      v: 1,
      iv: uint8ArrayToBase64(iv),
      data: arrayBufferToBase64(encrypted)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    saveSessionMeta(session);
    if (isDev) {
      try {
        console.log('[SecureSession] stored encrypted session', {
          userId: session.user?.id,
          expiresAt: session.expires_at
        });
      } catch {}
    }
  } catch (error) {
    console.error('[SecureSession] فشل حفظ الجلسة المشفرة:', error);
    saveFallbackSession(session);
  }
};

export const loadSecureSession = async (): Promise<Session | null> => {
  if (!isBrowser) return null;

  let payload: any = null;
  try {
    const rawPayload = localStorage.getItem(STORAGE_KEY);
    if (!rawPayload) return null;
    payload = JSON.parse(rawPayload);
  } catch (error) {
    console.error('[SecureSession] فشل قراءة بيانات الجلسة:', error);
    return null;
  }

  // الوضع الاحتياطي بدون تشفير
  if (payload?.v === 'plain') {
    try {
      const raw = typeof atob === 'function' && typeof payload.data === 'string'
        ? atob(payload.data)
        : payload.data;
      return JSON.parse(raw) as Session;
    } catch (error) {
      console.error('[SecureSession] فشل في تحميل جلسة الأوفلاين الاحتياطية:', error);
      return null;
    }
  }

  if (!decoder || !window.crypto?.subtle) return null;

  const cryptoKey = await importCryptoKey();
  if (!cryptoKey) return null;

  try {
    if (!payload?.iv || !payload?.data) return null;

    const ivBytes = base64ToUint8Array(payload.iv);
    const encryptedBytes = base64ToUint8Array(payload.data);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      cryptoKey,
      encryptedBytes
    );

    const json = decoder.decode(decrypted);
    return JSON.parse(json) as Session;
  } catch (error) {
    console.error('[SecureSession] فشل في فك تشفير جلسة الأوفلاين:', error);
    return null;
  }
};

export const clearSecureSession = async (): Promise<void> => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(META_KEY);
    if (!hasElectronBridge()) {
      localStorage.removeItem(FALLBACK_KEY_STORAGE);
    }
  } catch (error) {
    console.error('[SecureSession] فشل في حذف بيانات الجلسة الآمنة:', error);
  }

  if (hasElectronBridge()) {
    try {
      await window.electronAPI.secureSession.clearKey();
    } catch (error) {
      console.warn('[SecureSession] فشل حذف المفتاح من Keytar:', error);
    }
  }
};

/**
 * مسح الجلسة الآمنة مع الاحتفاظ ببيانات الأوفلاين
 */
export const clearSecureSessionKeepOffline = async (): Promise<void> => {
  if (!isBrowser) return;
  try {
    // مسح الجلسة الآمنة الحالية فقط، بدون مسح بيانات الأوفلاين
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(META_KEY);
    
    // الاحتفاظ بـ FALLBACK_KEY_STORAGE للأوفلاين إذا لم يكن هناك Electron
    // if (!hasElectronBridge()) {
    //   localStorage.removeItem(FALLBACK_KEY_STORAGE);
    // }
  } catch (error) {
    console.error('[SecureSession] فشل في حذف بيانات الجلسة الآمنة (مع الاحتفاظ بالأوفلاين):', error);
  }

  // لا نمسح المفتاح من Keytar في Electron للأوفلاين
  // if (hasElectronBridge()) {
  //   try {
  //     await window.electronAPI.secureSession.clearKey();
  //   } catch (error) {
  //     console.warn('[SecureSession] فشل حذف المفتاح من Keytar:', error);
  //   }
  // }
};
