/**
 * مولد أكواد التفعيل الآمن
 *
 * يستخدم Web Crypto API لتوليد أكواد عشوائية آمنة
 * بتنسيق XXXX-XXXX-XXXX-XXXX
 *
 * 🔒 تحسينات الأمان:
 * - استخدام crypto.getRandomValues() بدلاً من Math.random()
 * - حماية ضد هجمات التخمين
 * - تحقق من قوة الكود
 */

// الأحرف المستخدمة في توليد الأكواد (تم استبعاد الأحرف المتشابهة مثل 0, O, I, l, 1)
const ALLOWED_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CHAR_SET_SIZE = ALLOWED_CHARS.length; // 32 حرف

// طول الكود بدون الشرطات
const CODE_LENGTH = 16;

// حد أقصى لمحاولات توليد كود فريد
const MAX_GENERATION_ATTEMPTS = 100;

/**
 * توليد رقم عشوائي آمن في نطاق معين
 * @param max الحد الأقصى (غير شامل)
 * @returns رقم عشوائي آمن
 */
function getSecureRandomInt(max: number): number {
  // استخدام Web Crypto API للحصول على عشوائية آمنة
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);

  // تحويل الرقم العشوائي إلى نطاق محدد بدون تحيز
  // نستخدم rejection sampling لتجنب modulo bias
  const maxUint32 = 0xFFFFFFFF;
  const limit = maxUint32 - (maxUint32 % max);

  let value = randomBuffer[0];
  while (value >= limit) {
    crypto.getRandomValues(randomBuffer);
    value = randomBuffer[0];
  }

  return value % max;
}

/**
 * توليد سلسلة عشوائية آمنة
 * @param length طول السلسلة
 * @returns سلسلة عشوائية
 */
function generateSecureRandomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = getSecureRandomInt(CHAR_SET_SIZE);
    result += ALLOWED_CHARS[randomIndex];
  }
  return result;
}

/**
 * التحقق من قوة الكود (تجنب الأنماط الضعيفة)
 * @param code الكود بدون شرطات
 * @returns true إذا كان الكود قوياً
 */
function isStrongCode(code: string): boolean {
  // التحقق من عدم وجود نفس الحرف 4 مرات متتالية
  if (/(.)\1{3,}/.test(code)) {
    return false;
  }

  // التحقق من عدم وجود تسلسل تصاعدي أو تنازلي
  for (let i = 0; i < code.length - 3; i++) {
    const chars = code.slice(i, i + 4);
    const isSequential = chars.split('').every((char, idx, arr) => {
      if (idx === 0) return true;
      const prevIdx = ALLOWED_CHARS.indexOf(arr[idx - 1]);
      const currIdx = ALLOWED_CHARS.indexOf(char);
      return currIdx === prevIdx + 1 || currIdx === prevIdx - 1;
    });
    if (isSequential) return false;
  }

  // التحقق من وجود تنوع كافٍ (على الأقل 8 أحرف مختلفة)
  const uniqueChars = new Set(code.split(''));
  if (uniqueChars.size < 8) {
    return false;
  }

  return true;
}

/**
 * توليد كود تفعيل عشوائي آمن
 * @returns كود تفعيل بتنسيق XXXX-XXXX-XXXX-XXXX
 * @throws Error إذا فشل في توليد كود قوي
 */
export function generateActivationCode(): string {
  let attempts = 0;
  let code: string;

  // محاولة توليد كود قوي
  do {
    code = generateSecureRandomString(CODE_LENGTH);
    attempts++;

    if (attempts >= MAX_GENERATION_ATTEMPTS) {
      // في حالة فشل التوليد، نستخدم الكود الأخير مع تحذير
      console.warn('[CodeGenerator] Failed to generate strong code after max attempts');
      break;
    }
  } while (!isStrongCode(code));

  // تنسيق الكود بإضافة الشرطات كل 4 أحرف
  return code.replace(/(.{4})/g, '$1-').slice(0, -1);
}

/**
 * حساب انتروبيا الكود (قياس العشوائية)
 * @param code الكود
 * @returns قيمة الانتروبيا بالبت
 */
export function calculateCodeEntropy(code: string): number {
  const cleanCode = code.replace(/-/g, '');
  // الانتروبيا = log2(عدد الأحرف الممكنة) * طول الكود
  return Math.log2(CHAR_SET_SIZE) * cleanCode.length;
}

/**
 * التحقق من أن الكود يتمتع بانتروبيا كافية
 * @param code الكود
 * @param minEntropy الحد الأدنى للانتروبيا (افتراضي 60 بت)
 * @returns true إذا كانت الانتروبيا كافية
 */
export function hasMinimumEntropy(code: string, minEntropy: number = 60): boolean {
  return calculateCodeEntropy(code) >= minEntropy;
}

/**
 * توليد مجموعة من أكواد التفعيل العشوائية
 * @param count عدد الأكواد المطلوب توليدها
 * @returns مصفوفة من أكواد التفعيل
 */
export function generateMultipleActivationCodes(count: number): string[] {
  const codes: string[] = [];
  const uniqueCodes = new Set<string>();
  
  // التأكد من عدم تكرار الأكواد
  while (uniqueCodes.size < count) {
    const code = generateActivationCode();
    uniqueCodes.add(code);
  }
  
  return Array.from(uniqueCodes);
}

/**
 * التحقق من صحة تنسيق كود التفعيل
 * @param code الكود المراد التحقق منه
 * @returns صحيح إذا كان التنسيق صحيحاً
 */
export function isValidActivationCodeFormat(code: string): boolean {
  // التحقق من تنسيق الكود: XXXX-XXXX-XXXX-XXXX
  const regex = /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;
  return regex.test(code);
}

/**
 * التحقق من أن الكود يستخدم فقط الأحرف المسموح بها
 * @param code الكود المراد التحقق منه
 * @returns صحيح إذا كانت جميع الأحرف مسموح بها
 */
export function hasOnlyAllowedChars(code: string): boolean {
  const cleanCode = code.replace(/-/g, '');
  for (let i = 0; i < cleanCode.length; i++) {
    if (!ALLOWED_CHARS.includes(cleanCode[i])) {
      return false;
    }
  }
  return true;
}

/**
 * تنسيق كود تفعيل (إضافة الشرطات)
 * @param code الكود بدون تنسيق
 * @returns الكود بعد التنسيق
 */
export function formatActivationCode(code: string): string {
  const cleanCode = code.replace(/-/g, '').toUpperCase();
  if (cleanCode.length !== 16) {
    throw new Error('يجب أن يكون الكود مكوناً من 16 حرفاً');
  }
  
  return cleanCode.replace(/(.{4})/g, '$1-').slice(0, -1);
}
