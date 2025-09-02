import type { Plugin } from 'vite';

/**
 * Middleware خاص للتوافق مع إنستغرام
 * يتعامل مع المتصفحات الداخلية لوسائل التواصل الاجتماعي
 */

// قائمة User Agents الخاصة بإنستغرام وفيسبوك
const SOCIAL_MEDIA_USER_AGENTS = [
  'Instagram',
  'FBAN',
  'FBAV', 
  'FacebookBot',
  'facebookexternalhit',
  'WhatsApp',
  'LinkedInBot',
  'TwitterBot',
  'TelegramBot'
];

/**
 * فحص ما إذا كان الطلب قادم من متصفح وسائل التواصل الاجتماعي
 */
function isSocialMediaBrowser(userAgent: string): boolean {
  if (!userAgent) return false;
  
  return SOCIAL_MEDIA_USER_AGENTS.some(agent => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );
}

/**
 * إنشاء CSP مخفف لوسائل التواصل الاجتماعي
 */
function createSocialMediaCSP(): string {
  return [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.yalidine.app",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // السماح الكامل بالتحميل في iframe لوسائل التواصل الاجتماعي
    "frame-ancestors *"
  ].join('; ');
}

/**
 * Plugin للتوافق مع إنستغرام
 */
export function instagramCompatibilityPlugin(): Plugin {
  return {
    name: 'instagram-compatibility',
    enforce: 'pre', // تشغيل قبل plugins الأمان الأخرى
    
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const userAgent = req.headers['user-agent'] || '';
        const isSocialMedia = isSocialMediaBrowser(userAgent);
        
        if (isSocialMedia) {
          // إعدادات مخففة لوسائل التواصل الاجتماعي
          res.setHeader('X-Frame-Options', 'ALLOWALL');
          res.setHeader('Content-Security-Policy', createSocialMediaCSP());
          
          // إزالة headers قد تتعارض مع وسائل التواصل الاجتماعي
          res.removeHeader('X-Content-Type-Options');
          res.removeHeader('X-XSS-Protection');
          res.removeHeader('Referrer-Policy');
          
          // إضافة headers خاصة بوسائل التواصل الاجتماعي
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          
          console.log(`🔗 [Instagram Compatibility] طلب من: ${userAgent.slice(0, 50)}...`);
        }
        
        next();
      });
    },
  };
}

/**
 * دالة مساعدة لإضافة الـ middleware في Express/Node.js
 */
export function instagramCompatibilityMiddleware() {
  return (req: any, res: any, next: any) => {
    const userAgent = req.headers['user-agent'] || '';
    const isSocialMedia = isSocialMediaBrowser(userAgent);
    
    if (isSocialMedia) {
      // إعدادات متوافقة مع إنستغرام
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', createSocialMediaCSP());
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // تسجيل للمراقبة
      console.log(`📱 [Instagram Request] من: ${userAgent.slice(0, 100)}`);
    }
    
    next();
  };
}

export default instagramCompatibilityPlugin;
