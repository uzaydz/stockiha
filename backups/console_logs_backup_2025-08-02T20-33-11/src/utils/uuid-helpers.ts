/**
 * دالة مساعدة لتحويل UUID بشكل آمن
 * تتعامل مع القيم التي قد تكون "undefined" كنص أو null أو undefined فعلي
 */
export function safeUuidOrNull(value: string | undefined | null): string | null {
  if (!value || 
      value === 'undefined' || 
      value === 'null' || 
      value === 'NULL' ||
      value.trim() === '') {
    return null;
  }
  return value;
}

/**
 * دالة للتحقق من صحة UUID
 */
export function isValidUuid(value: string | undefined | null): boolean {
  if (!value || 
      value === 'undefined' || 
      value === 'null' || 
      value === 'NULL' ||
      value.trim() === '') {
    return false;
  }
  
  // التحقق من تنسيق UUID الصحيح
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * دالة مساعدة لتنظيف معاملات UUID في كائن
 */
export function cleanUuidParams<T extends Record<string, any>>(params: T): T {
  const cleaned = { ...params } as any;
  
  Object.keys(cleaned).forEach(key => {
    if (key.includes('_id') || key.includes('Id')) {
      cleaned[key] = safeUuidOrNull(cleaned[key]);
    }
  });
  
  return cleaned;
} 