/**
 * 🛡️ إعدادات CSP مركزية وآمنة
 * تم تصميمها لتوفير أقصى حماية مع الحفاظ على وظائف التطبيق
 */

export interface CSPConfig {
  directives: Record<string, string[]>;
  reportUri?: string;
  reportOnly?: boolean;
}

/**
 * 🔒 CSP آمنة للإنتاج - بدون unsafe-inline أو unsafe-eval
 */
export const SECURE_CSP_CONFIG: CSPConfig = {
  directives: {
    'default-src': ["'self'"],
    
    // Scripts: استخدام nonces فقط، بدون unsafe-inline
    'script-src': [
      "'self'",
      "'nonce-{{nonce}}'", // سيتم استبدالها بـ nonce حقيقي
      'https://connect.facebook.net',
      'https://www.googletagmanager.com', 
      'https://www.google-analytics.com',
      'https://js.sentry-cdn.com',
      'https://www.gstatic.com', // Google reCAPTCHA
      'https://www.google.com'    // Google reCAPTCHA
    ],
    
    // إضافة script-src-elem للسكريبتات الخارجية المحملة ديناميكياً
    'script-src-elem': [
      "'self'",
      "'nonce-{{nonce}}'",
      'https://connect.facebook.net',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com', 
      'https://analytics.tiktok.com',
      'https://js.sentry-cdn.com'
    ],
    
    // Styles: نحتاج unsafe-inline للـ CSS المولد ديناميكياً
    'style-src': [
      "'self'",
      "'unsafe-inline'", // ضروري للـ CSS الديناميكي وTailwind
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net'
    ],
    
    // الصور: السماح بجميع المصادر الآمنة
    'img-src': [
      "'self'",
      'data:', // للصور المشفرة base64
      'blob:', // للصور المولدة ديناميكياً
      'https:', // جميع HTTPS domains
      'https://*.supabase.co' // صور Supabase
    ],
    
    // الخطوط
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net'
    ],
    
    // الاتصالات
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co', // WebSocket للـ realtime
      'https://api.yalidine.app',
      'https://api.cloudflare.com', // Cloudflare API للنظام الجديد
      'https://dns.google.com', // Google DNS للتحقق من النطاقات
      'https://analytics.tiktok.com', // TikTok Pixel events
      'https://openrouter.ai', // OpenRouter API للذكاء الاصطناعي
      'https://api.zrexpress.dz', // ZR Express API للشحن
      'https://api.ecotrack.dz', // EcoTrack API للشحن
      'https://*.ecotrack.dz', // جميع نطاقات EcoTrack الفرعية
      'https://www.google-analytics.com',
      'https://stats.g.doubleclick.net',
      'https://region1.google-analytics.com',
      'https://connect.facebook.net', // Facebook Pixel
      'https://www.facebook.com', // Facebook Pixel
      'ws://localhost:*', // للتطوير المحلي
      'http://localhost:*' // للتطوير المحلي
    ],
    
    // الإطارات
    'frame-src': [
      "'self'",
      'https://www.facebook.com',
      'https://connect.facebook.net',
      'https://www.google.com', // Google reCAPTCHA
      'https://www.gstatic.com'
    ],
    
    // منع تحميل objects خطيرة
    'object-src': ["'none'"],
    
    // تقييد base URI
    'base-uri': ["'self'"],
    
    // تقييد form submissions
    'form-action': [
      "'self'",
      'https://api.yalidine.app' // للـ shipping API
    ],
    
    // السماح للإطارات المعتمدة فقط
    'frame-ancestors': [
      "'self'",
      'https://www.instagram.com',
      'https://*.instagram.com',
      'https://www.facebook.com',
      'https://*.facebook.com'
    ],
    
    // ترقية HTTP إلى HTTPS
    'upgrade-insecure-requests': []
  },
  
  // تفعيل التقارير لمراقبة الانتهاكات
  reportUri: '/api/csp-report'
};

/**
 * 🚧 CSP للتطوير - أكثر مرونة مع الحفاظ على الأمان
 */
export const DEVELOPMENT_CSP_CONFIG: CSPConfig = {
  directives: {
    'default-src': ["'self'"],
    
    'script-src': [
      "'self'",
      "'nonce-{{nonce}}'",
      "'unsafe-eval'", // ضروري للـ HMR في التطوير
      'https://connect.facebook.net',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://js.sentry-cdn.com',
      'localhost:*', // للـ HMR
      'ws://localhost:*', // للـ WebSocket HMR
      'http://localhost:*' // للتطوير المحلي
    ],
    
    // إضافة script-src-elem للتطوير أيضاً
    'script-src-elem': [
      "'self'",
      "'nonce-{{nonce}}'",
      "'unsafe-inline'", // للتطوير
      'https://connect.facebook.net',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://analytics.tiktok.com',
      'localhost:*',
      'http://localhost:*'
    ],
    
    'style-src': [
      "'self'",
      "'unsafe-inline'", // ضروري للـ HMR والتطوير
      'https://fonts.googleapis.com'
    ],
    
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'http://localhost:*' // للتطوير المحلي
    ],
    
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com'
    ],
    
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.yalidine.app',
      'https://api.cloudflare.com', // Cloudflare API
      'https://dns.google.com', // Google DNS
      'https://openrouter.ai', // OpenRouter API للذكاء الاصطناعي
      'https://api.zrexpress.dz', // ZR Express API للشحن
      'https://api.ecotrack.dz', // EcoTrack API للشحن
      'https://*.ecotrack.dz', // جميع نطاقات EcoTrack الفرعية
      'https://www.google-analytics.com',
      'https://stats.g.doubleclick.net',
      'https://region1.google-analytics.com',
      'https://connect.facebook.net', // Facebook Pixel
      'https://www.facebook.com', // Facebook Pixel
      'https://analytics.tiktok.com', // TikTok Pixel events
      'ws://localhost:*', // للـ HMR
      'http://localhost:*' // للـ API المحلي
    ],
    
    'frame-src': ["'self'", 'https://www.facebook.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"]
  },
  
  reportOnly: true // في التطوير، نراقب فقط بدون منع
};

/**
 * 🛡️ دالة لتوليد CSP header string
 */
export function generateCSPHeader(config: CSPConfig, nonce?: string): string {
  const directives: string[] = [];
  
  for (const [directive, values] of Object.entries(config.directives)) {
    if (values.length === 0) {
      // للـ directives بدون قيم مثل upgrade-insecure-requests
      directives.push(directive);
    } else {
      // استبدال placeholder بـ nonce حقيقي
      const processedValues = values.map(value => 
        nonce ? value.replace('{{nonce}}', nonce) : value
      );
      directives.push(`${directive} ${processedValues.join(' ')}`);
    }
  }
  
  let cspHeader = directives.join('; ');
  
  // إضافة reporting إذا كان متاحاً
  if (config.reportUri) {
    cspHeader += `; report-uri ${config.reportUri}`;
  }
  
  return cspHeader;
}

/**
 * 🔍 دالة للتحقق من صحة nonce
 */
export function isValidNonce(nonce: string): boolean {
  // Nonce يجب أن يكون base64 وطوله مناسب
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return nonce.length >= 16 && base64Regex.test(nonce);
}

/**
 * 📝 دالة لتوليد CSP للبيئة المحددة
 */
export function getCSPForEnvironment(
  environment: 'development' | 'production',
  nonce?: string
): string {
  const config = environment === 'production' 
    ? SECURE_CSP_CONFIG 
    : DEVELOPMENT_CSP_CONFIG;
  
  return generateCSPHeader(config, nonce);
}

/**
 * 🚨 CSP للطوارئ - عندما تكون هناك مشاكل
 */
export const EMERGENCY_CSP_CONFIG: CSPConfig = {
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https:'],
    'frame-src': ["'self'"],
    'object-src': ["'none'"]
  },
  reportOnly: true
};
