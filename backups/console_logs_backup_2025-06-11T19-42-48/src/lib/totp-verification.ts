// مكتبة التحقق من TOTP في جانب العميل
// نقل التحقق من قاعدة البيانات إلى JavaScript لضمان دقة التحقق

/**
 * تحويل نص base32 إلى buffer
 */
function base32ToUint8Array(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  // تنظيف النص وتحويله لأحرف كبيرة
  const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  
  // تحويل كل حرف إلى 5 bits
  for (let i = 0; i < cleanBase32.length; i++) {
    const char = cleanBase32[i];
    const value = alphabet.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += value.toString(2).padStart(5, '0');
  }
  
  // تحويل bits إلى bytes
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    bytes.push(parseInt(byte, 2));
  }
  
  return new Uint8Array(bytes);
}

/**
 * تطبيق HMAC-SHA1
 */
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  return crypto.subtle.sign('HMAC', cryptoKey, data);
}

/**
 * تحويل رقم إلى 8 bytes (big-endian)
 */
function numberToUint8Array(num: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, num, false); // big-endian
  return new Uint8Array(buffer);
}

/**
 * توليد رمز TOTP
 */
async function generateTOTP(
  secret: string, 
  timeStep: number = 30, 
  digits: number = 6,
  timestamp?: number
): Promise<string> {
  try {
    // الحصول على الوقت الحالي أو استخدام timestamp محدد
    const now = timestamp || Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / timeStep);
    
    // تحويل المفتاح من base32
    const keyBytes = base32ToUint8Array(secret);
    
    // تحويل counter إلى bytes
    const counterBytes = numberToUint8Array(counter);
    
    // حساب HMAC
    const hmacResult = await hmacSha1(keyBytes, counterBytes);
    const hmacBytes = new Uint8Array(hmacResult);
    
    // Dynamic truncation
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const code = (
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff)
    ) % Math.pow(10, digits);
    
    return code.toString().padStart(digits, '0');
  } catch (error) {
    console.error('خطأ في توليد TOTP:', error);
    throw error;
  }
}

/**
 * التحقق من رمز TOTP
 */
export async function verifyTOTP(
  secret: string, 
  token: string, 
  window: number = 1,
  timeStep: number = 30
): Promise<boolean> {
  try {
    // تنظيف الرمز المدخل
    const cleanToken = token.replace(/\s/g, '');
    
    if (!/^\d{6}$/.test(cleanToken)) {
      console.log('❌ رمز TOTP غير صالح: يجب أن يكون 6 أرقام');
      return false;
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // التحقق من النافذة الزمنية (الحالي + النوافذ السابقة واللاحقة)
    for (let i = -window; i <= window; i++) {
      const testTime = now + (i * timeStep);
      const expectedToken = await generateTOTP(secret, timeStep, 6, testTime);
      
      console.log(`🔍 اختبار الوقت ${testTime} (offset: ${i}): توقع ${expectedToken}, مُدخل ${cleanToken}`);
      
      if (expectedToken === cleanToken) {
        console.log(`✅ تم التحقق بنجاح! offset: ${i}`);
        return true;
      }
    }
    
    console.log('❌ فشل التحقق من TOTP');
    return false;
  } catch (error) {
    console.error('خطأ في التحقق من TOTP:', error);
    return false;
  }
}

/**
 * توليد رمز TOTP للاختبار
 */
export async function generateTestTOTP(secret: string): Promise<string> {
  try {
    return await generateTOTP(secret);
  } catch (error) {
    console.error('خطأ في توليد رمز الاختبار:', error);
    return '';
  }
}

/**
 * التحقق من صحة مفتاح base32
 */
export function isValidBase32Secret(secret: string): boolean {
  try {
    base32ToUint8Array(secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * دالة مساعدة لعرض معلومات debug
 */
export async function debugTOTP(secret: string): Promise<void> {
  try {
    console.log('🔧 معلومات TOTP Debug:');
    console.log('📝 المفتاح:', secret);
    console.log('⏰ الوقت الحالي:', new Date().toISOString());
    console.log('🔢 رمز حالي:', await generateTestTOTP(secret));
    
    // توليد رموز للدقائق القادمة
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 3; i++) {
      const futureTime = now + (i * 30);
      const futureCode = await generateTOTP(secret, 30, 6, futureTime);
      console.log(`🔮 رمز بعد ${i * 30} ثانية:`, futureCode);
    }
  } catch (error) {
    console.error('❌ خطأ في debug:', error);
  }
} 