/**
 * مجموعة من الدوال المساعدة لإدارة slug للمنتجات
 */

// قاموس ترجمة الأحرف العربية إلى اللاتينية
const ARABIC_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
  'ة': 'h', 'ء': 'a'
};

/**
 * تحويل النص العربي إلى slug صالح
 * @param text - النص المراد تحويله
 * @returns slug منظف وجاهز للاستخدام
 */
export const generateSlugFromText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .trim()
    // تحويل الأحرف العربية إلى لاتينية
    .replace(/[\u0600-\u06FF\u0750-\u077F]/g, (match) => {
      return ARABIC_TO_LATIN[match] || match;
    })
    // إزالة جميع الرموز الخاصة ما عدا الحروف والأرقام والمسافات والشرطات
    .replace(/[^a-z0-9\s-]/g, '')
    // استبدال المسافات المتعددة بشرطة واحدة
    .replace(/\s+/g, '-')
    // استبدال الشرطات المتعددة بشرطة واحدة
    .replace(/-+/g, '-')
    // إزالة الشرطات من البداية والنهاية
    .replace(/^-+|-+$/g, '');
};

/**
 * تنظيف slug مدخل يدوياً
 * @param slug - Slug المدخل من المستخدم
 * @returns slug منظف
 */
export const cleanSlug = (slug: string): string => {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .toLowerCase()
    .trim()
    // إزالة جميع الرموز ما عدا الحروف اللاتينية والأرقام والشرطات
    .replace(/[^a-z0-9-]/g, '')
    // استبدال الشرطات المتعددة بشرطة واحدة
    .replace(/-+/g, '-')
    // إزالة الشرطات من البداية والنهاية
    .replace(/^-+|-+$/g, '');
};

/**
 * التحقق من صحة slug
 * @param slug - Slug المراد التحقق منه
 * @returns true إذا كان slug صحيح
 */
export const isValidSlug = (slug: string): boolean => {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // يجب أن يحتوي على أحرف لاتينية صغيرة وأرقام وشرطات فقط
  // ولا يبدأ أو ينتهي بشرطة
  // ولا يحتوي على شرطات متتالية
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 1;
};

/**
 * إنشاء slug فريد بإضافة رقم إذا لزم الأمر
 * @param baseSlug - Slug الأساسي
 * @param existingSlugs - قائمة بالslugs الموجودة
 * @returns slug فريد
 */
export const generateUniqueSlug = (baseSlug: string, existingSlugs: string[] = []): string => {
  const cleanedSlug = cleanSlug(baseSlug) || 'product';
  
  if (!existingSlugs.includes(cleanedSlug)) {
    return cleanedSlug;
  }

  let counter = 1;
  let uniqueSlug = `${cleanedSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${cleanedSlug}-${counter}`;
  }
  
  return uniqueSlug;
};

/**
 * إنشاء slug من اسم المنتج مع ضمان الفرادة
 * @param productName - اسم المنتج
 * @param existingSlugs - قائمة بالslugs الموجودة
 * @returns slug فريد مولد من اسم المنتج
 */
export const generateProductSlug = (productName: string, existingSlugs: string[] = []): string => {
  const baseSlug = generateSlugFromText(productName);
  
  if (!baseSlug) {
    // إذا فشل إنشاء slug من الاسم، استخدم timestamp
    return generateUniqueSlug(`product-${Date.now()}`, existingSlugs);
  }
  
  return generateUniqueSlug(baseSlug, existingSlugs);
};

/**
 * تحويل slug إلى عنوان قابل للقراءة
 * @param slug - Slug المراد تحويله
 * @returns عنوان قابل للقراءة
 */
export const slugToTitle = (slug: string): string => {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * إنشاء رابط المنتج كاملاً
 * @param slug - Slug المنتج
 * @param baseUrl - الرابط الأساسي (اختياري)
 * @returns رابط المنتج كاملاً
 */
export const getProductUrl = (slug: string, baseUrl: string = ''): string => {
  if (!slug) {
    return '';
  }

  const cleanedSlug = cleanSlug(slug);
  if (!cleanedSlug) {
    return '';
  }

  return `${baseUrl}/product/${cleanedSlug}`;
};

/**
 * استخراج slug من رابط المنتج
 * @param url - رابط المنتج
 * @returns slug المنتج
 */
export const extractSlugFromUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const match = url.match(/\/product\/([^\/\?#]+)/);
  return match ? match[1] : '';
};
