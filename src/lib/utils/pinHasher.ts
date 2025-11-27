/**
 * pinHasher.ts - خوارزمية موحدة لتشفير PIN الموظفين
 * 
 * ⚠️ هام: يجب استخدام هذا الملف فقط لكل عمليات تشفير PIN
 * لضمان التوافق بين الحفظ والتحقق
 */

// TextEncoder للتشفير
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/**
 * تحويل Uint8Array إلى Base64
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' 
    ? btoa(binary) 
    : Buffer.from(binary, 'binary').toString('base64');
}

/**
 * تحويل Base64 إلى Uint8Array
 */
export function fromBase64(b64: string): Uint8Array {
  const binary = typeof atob === 'function' 
    ? atob(b64) 
    : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * توليد salt عشوائي
 * @param length طول الـ salt بالـ bytes (افتراضي 16)
 * @returns salt بصيغة Base64
 */
export function generateSalt(length: number = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return toBase64(arr);
  }
  // fallback للبيئات القديمة
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return toBase64(arr);
}

/**
 * تشفير PIN باستخدام SHA-256
 * @param pin رمز PIN
 * @param salt الـ salt (Base64)
 * @returns hash بصيغة Base64
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  // الصيغة الموحدة: salt:pin
  const combined = `${salt}:${pin}`;
  
  try {
    // استخدام Web Crypto API (الأسرع والأكثر أماناً)
    if (typeof crypto !== 'undefined' && crypto.subtle && textEncoder) {
      const data = textEncoder.encode(combined);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return toBase64(new Uint8Array(digest));
    }
  } catch (err) {
    console.warn('[pinHasher] crypto.subtle غير متاح، استخدام fallback');
  }
  
  // Fallback: hash بسيط (أقل أماناً لكن يعمل)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // تحويل لـ 32bit integer
  }
  // تحويل لـ string وإضافة padding
  return `fallback_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/**
 * التحقق من PIN
 * @param pin رمز PIN المدخل
 * @param storedHash الـ hash المخزن
 * @param salt الـ salt المخزن
 * @returns هل PIN صحيح؟
 */
export async function verifyPin(pin: string, storedHash: string, salt: string): Promise<boolean> {
  if (!pin || !storedHash || !salt) {
    console.warn('[pinHasher] verifyPin: بيانات ناقصة');
    return false;
  }
  
  const computedHash = await hashPin(pin, salt);
  const isMatch = computedHash === storedHash;
  
  // تسجيل تشخيصي
  console.log('[pinHasher] 🔐 التحقق من PIN:', {
    saltPreview: salt.slice(0, 10) + '...',
    storedHashPreview: storedHash.slice(0, 15) + '...',
    computedHashPreview: computedHash.slice(0, 15) + '...',
    isMatch,
  });
  
  return isMatch;
}

/**
 * توليد hash جديد لـ PIN
 * @param pin رمز PIN
 * @returns كائن يحتوي على hash و salt
 */
export async function createPinHash(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = generateSalt(16);
  const hash = await hashPin(pin, salt);
  
  console.log('[pinHasher] 🔑 تم إنشاء hash جديد:', {
    saltLength: salt.length,
    hashLength: hash.length,
  });
  
  return { hash, salt };
}

/**
 * التحقق من صلاحية PIN (4-6 أرقام)
 */
export function isValidPin(pin: string): boolean {
  if (!pin) return false;
  return /^\d{4,6}$/.test(pin);
}

/**
 * فحص توافق الـ hash (هل هو بالصيغة الجديدة أم القديمة)
 */
export function isNewHashFormat(hash: string): boolean {
  // الصيغة الجديدة هي Base64 (حوالي 44 حرف)
  // الصيغة القديمة hex (64 حرف) أو fallback
  if (!hash) return false;
  if (hash.startsWith('fallback_')) return true; // fallback format
  // Base64 عادة 44 حرف لـ SHA-256
  return hash.length === 44 || (hash.length > 20 && hash.length < 50);
}
