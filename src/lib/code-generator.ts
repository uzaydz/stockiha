/**
 * مولد أكواد التفعيل
 * يستخدم لإنشاء أكواد تفعيل عشوائية آمنة بتنسيق XXXX-XXXX-XXXX-XXXX
 */

// الأحرف المستخدمة في توليد الأكواد (تم استبعاد الأحرف المتشابهة مثل 0, O, I, l)
const ALLOWED_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * توليد كود تفعيل عشوائي
 * @returns كود تفعيل بتنسيق XXXX-XXXX-XXXX-XXXX
 */
export function generateActivationCode(): string {
  // توليد 16 حرف عشوائي
  let code = '';
  for (let i = 0; i < 16; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS[randomIndex];
  }
  
  // تنسيق الكود بإضافة الشرطات كل 4 أحرف
  return code.replace(/(.{4})/g, '$1-').slice(0, -1);
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