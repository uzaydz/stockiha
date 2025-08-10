import DOMPurify from 'dompurify';

/**
 * تنظيف HTML من أي محتوى ضار
 * @param html - النص HTML المراد تنظيفه
 * @param options - خيارات إضافية للتنظيف
 * @returns HTML نظيف وآمن
 */
export const sanitizeHTML = (html: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
  allowedSchemes?: string[];
}): string => {
  if (!html) return '';
  
  const defaultConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'div', 'span'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style', 'title', 'alt', 'href', 'target'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload', 'onabort', 'onbeforeunload', 'onerror', 'onhashchange', 'onmessage', 'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpopstate', 'onresize', 'onstorage', 'oncontextmenu', 'oninput', 'oninvalid', 'onsearch']
  };

  // دمج الخيارات المخصصة مع الإعدادات الافتراضية
  const config = {
    ...defaultConfig,
    ALLOWED_TAGS: options?.allowedTags || defaultConfig.ALLOWED_TAGS,
    ALLOWED_ATTR: options?.allowedAttributes || defaultConfig.ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: options?.allowedSchemes ? 
      new RegExp(`^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|${options.allowedSchemes.join('|')}):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))`, 'i') :
      defaultConfig.ALLOWED_URI_REGEXP
  };

  return DOMPurify.sanitize(html, config);
};

/**
 * تنظيف النص العادي (بدون HTML)
 * @param text - النص المراد تنظيفه
 * @returns نص نظيف
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/[<>]/g, '') // إزالة علامات HTML
    .replace(/javascript:/gi, '') // إزالة javascript:
    .replace(/on\w+\s*=/gi, '') // إزالة event handlers
    .trim();
};

/**
 * التحقق من وجود محتوى ضار في النص
 * @param text - النص المراد فحصه
 * @returns true إذا كان النص يحتوي على محتوى ضار
 */
export const containsMaliciousContent = (text: string): boolean => {
  if (!text) return false;
  
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(text));
};

/**
 * تنظيف URL للتأكد من أنه آمن
 * @param url - الرابط المراد تنظيفه
 * @returns رابط نظيف أو سلسة فارغة
 */
export const sanitizeURL = (url: string): string => {
  if (!url) return '';
  
  // إزالة javascript: و data: و vbscript:
  const cleanURL = url.replace(/^(javascript|data|vbscript):/gi, '');
  
  // التحقق من أن الرابط يبدأ بـ http أو https
  if (!/^https?:\/\//i.test(cleanURL)) {
    return '';
  }
  
  return cleanURL;
}; 