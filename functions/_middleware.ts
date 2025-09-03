// 🚀 Cloudflare Pages Functions - Advanced Security & Performance Middleware
// يتم تشغيل هذا الملف على كل طلب قبل معالجة الصفحات

interface Env {
  ENVIRONMENT: string;
}

// 🔒 Security Headers المتقدمة - A+ Grade
function getSecurityHeaders(nonce: string): Record<string, string> {
  return {
    // Content Security Policy محسنة مع دعم inline scripts المطلوبة
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'sha256-vRKmGhO0Jt0ZJLajz37rSXGS0J2GkdjuvALzlXD9Ymg=' 'sha256-HEP/a7uzebOhHt9bVmS6zyymv90YmGWEAkZHYjfdd6g=' 'sha256-oToowZlM1h/gvo9UizVDTa7MltyVSmKouu4seQ8jBtw=' 'sha256-gkpPSL93wBndrOdeNSZNvORHPYYQJFZFeuGGo/EZIOI=' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://js.sentry-cdn.com https://static.cloudflareinsights.com https://www.gstatic.com https://www.google.com 'unsafe-inline'`,
      `script-src-elem 'self' 'sha256-vRKmGhO0Jt0ZJLajz37rSXGS0J2GkdjuvALzlXD9Ymg=' 'sha256-HEP/a7uzebOhHt9bVmS6zyymv90YmGWEAkZHYjfdd6g=' 'sha256-oToowZlM1h/gvo9UizVDTa7MltyVSmKouu4seQ8jBtw=' 'sha256-gkpPSL93wBndrOdeNSZNvORHPYYQJFZFeuGGo/EZIOI=' https://static.cloudflareinsights.com https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://js.sentry-cdn.com https://www.gstatic.com https://www.google.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net", // unsafe-inline ضروري للـ CSS الديناميكي
      "img-src 'self' data: https: blob: https://*.supabase.co https://*.cloudflareinsights.com https://www.gravatar.com https://*.gravatar.com",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.yalidine.app https://procolis.com https://www.google-analytics.com https://region1.google-analytics.com https://stats.g.doubleclick.net https://sentry.io https://*.sentry.io https://cloudflareinsights.com https://*.cloudflareinsights.com https://cloudflare-dns.com",
      "frame-src 'self' https://www.facebook.com https://connect.facebook.net https://www.google.com https://www.gstatic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://api.yalidine.app",
      "frame-ancestors 'self' https://www.instagram.com https://*.instagram.com https://www.facebook.com https://*.facebook.com",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
      "report-uri /api/csp-report"
    ].join('; '),
  
    // Security Headers الأساسية
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()',
    
    // HSTS للأمان
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Cross-Origin Headers محسنة لدعم الصور الخارجية
    'Cross-Origin-Embedder-Policy': 'unsafe-none', // السماح بتحميل الموارد الخارجية
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin', // السماح بالموارد من مصادر مختلفة
    
    // Additional Security Headers
    'X-Robots-Tag': 'index, follow',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Expect-CT': 'max-age=86400, enforce',
    'X-DNS-Prefetch-Control': 'on'
    // إزالة Feature-Policy لتجنب التضارب مع Permissions-Policy
  };
}

// 🚀 Performance Headers
const PERFORMANCE_HEADERS = {
  'Vary': 'Accept-Encoding, Accept, User-Agent',
  'Accept-CH': 'DPR, Width, Viewport-Width',
  'Server-Timing': 'cf-cache;desc="Cloudflare Cache Status"'
};

// 🛡️ Rate Limiting باستخدام Cloudflare KV (اختياري)
const RATE_LIMITS = {
  '/api/': { requests: 100, window: 60 }, // 100 طلب في الدقيقة للـ API
  '/': { requests: 300, window: 60 }      // 300 طلب في الدقيقة للصفحات العامة
};

// 🔍 Bot Detection
const SUSPICIOUS_USER_AGENTS = [
  'curl', 'wget', 'python-requests', 'scrapy', 'bot', 'crawler'
];

// 🔐 Generate CSP nonce for better security
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  next: (request?: Request) => Promise<Response>;
}): Promise<Response> {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const nonce = generateNonce();
  
  // 🚫 Block suspicious requests
  const userAgent = request.headers.get('User-Agent')?.toLowerCase() || '';
  const isSuspicious = SUSPICIOUS_USER_AGENTS.some(agent => 
    userAgent.includes(agent.toLowerCase())
  );
  
  if (isSuspicious && !url.pathname.startsWith('/api/')) {
    return new Response('Access Denied', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // 🔒 Enhanced security for API endpoints
  if (url.pathname.startsWith('/api/')) {
    // تحقق من Origin للـ API requests
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    
    // السماح للطلبات من النطاقات المصرح بها فقط
    const allowedOrigins = [
      'https://stockiha.com',
      'https://www.stockiha.com',
      'https://stockiha.pages.dev',
      'http://localhost:8080',
      'http://localhost:3000'
    ];
    
    const isAllowedOrigin = origin && allowedOrigins.some(allowed => 
      origin.startsWith(allowed)
    );
    
    const isAllowedReferer = referer && allowedOrigins.some(allowed => 
      referer.startsWith(allowed)
    );
    
    // للـ development، السماح بـ localhost
    const isDevelopment = url.hostname.includes('localhost') || 
                         url.hostname.includes('127.0.0.1');
    
    if (!isDevelopment && !isAllowedOrigin && !isAllowedReferer) {
      return new Response('Unauthorized Origin', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  // 🛡️ Rate Limiting محسن مع fallback آمن
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  const getRateLimitForPath = (pathname: string) => {
    if (pathname.startsWith('/api/auth/login')) {
      return { requests: 5, window: 300000 }; // 5 محاولات/5 دقائق
    } else if (pathname.startsWith('/api/auth/register')) {
      return { requests: 3, window: 3600000 }; // 3 حسابات/ساعة
    } else if (pathname.startsWith('/api/auth/reset')) {
      return { requests: 3, window: 3600000 }; // 3 إعادة تعيين/ساعة
    } else if (pathname.startsWith('/api/orders')) {
      return { requests: 10, window: 300000 }; // 10 طلبات/5 دقائق
    } else if (pathname.startsWith('/api/users')) {
      return { requests: 2, window: 3600000 }; // 2 مستخدم/ساعة
    } else if (pathname.startsWith('/api/')) {
      return { requests: 60, window: 60000 }; // 60 طلب/دقيقة
    } else {
      return { requests: 200, window: 60000 }; // 200 طلب/دقيقة للصفحات
    }
  };

  // تطبيق Rate limiting
  const rateLimit = getRateLimitForPath(url.pathname);
  const rateLimitKey = `${clientIP}:${url.pathname.split('/')[1]}:${Math.floor(Date.now() / rateLimit.window)}`;

  // استخدام نظام memory-based آمن مع تنظيف تلقائي
  const rateLimitMap = globalThis.rateLimitMap || new Map();
  globalThis.rateLimitMap = rateLimitMap;

  const currentRequests = rateLimitMap.get(rateLimitKey) || 0;

  if (currentRequests >= rateLimit.requests) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded', 
        type: url.pathname.startsWith('/api/auth/') ? 'authentication' : 'general',
        retryAfter: Math.ceil(rateLimit.window / 1000)
      }), 
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimit.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + Math.ceil(rateLimit.window / 1000)),
          'Retry-After': Math.ceil(rateLimit.window / 1000).toString(),
          'X-RateLimit-Source': 'memory-fallback'
        }
      }
    );
  }

  rateLimitMap.set(rateLimitKey, currentRequests + 1);

  // تنظيف البيانات القديمة كل 1000 طلب (0.1% من الطلبات)
  if (Math.random() < 0.001) {
    const cutoff = Date.now() - 3600000; // ساعة واحدة
    let cleaned = 0;
    for (const [key] of rateLimitMap.entries()) {
      // استخراج timestamp من المفتاح
      const parts = key.split(':');
      const keyTime = parseInt(parts[parts.length - 1]) * rateLimit.window;
      if (keyTime < cutoff) {
        rateLimitMap.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`Rate limiter cleanup: removed ${cleaned} old entries`);
    }
  }

  // 🚀 Process the request
  const response = await next(request);
  
  // 🔄 Transform HTML to inject nonce
  let body: BodyInit | null = response.body;
  const contentType = response.headers.get('Content-Type');
  
  if (contentType && contentType.includes('text/html') && response.body) {
    const htmlText = await new Response(response.body).text();
    const transformedHtml = htmlText.replace(/\{\{CSP_NONCE\}\}/g, nonce);
    body = transformedHtml;
  }
  
  // 📊 Add performance and security headers
  const newResponse = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
  
  // إضافة Security Headers مع Nonce
  const securityHeaders = getSecurityHeaders(nonce);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  
  // إضافة Performance Headers
  Object.entries(PERFORMANCE_HEADERS).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  
  // 🔒 Advanced Security Headers (إزالة Feature-Policy لتجنب التضارب)
  newResponse.headers.set('X-Robots-Tag', 'index, follow');
  newResponse.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  newResponse.headers.set('Expect-CT', 'max-age=86400, enforce');
  
  // 🛡️ Rate Limit Headers محدثة
  const remainingRequests = Math.max(0, rateLimit.requests - currentRequests - 1);
  newResponse.headers.set('X-RateLimit-Limit', rateLimit.requests.toString());
  newResponse.headers.set('X-RateLimit-Remaining', remainingRequests.toString());
  newResponse.headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + Math.ceil(rateLimit.window / 1000)));
  newResponse.headers.set('X-RateLimit-Window', Math.ceil(rateLimit.window / 1000).toString());
  newResponse.headers.set('X-RateLimit-Source', 'memory-fallback');
  
  // 🎯 Cache headers حسب نوع المحتوى
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.match(/\.(js|css|woff2|woff|png|jpg|jpeg|webp|svg)$/)) {
    // ملفات ثابتة - تخزين طويل المدى
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (url.pathname.startsWith('/api/')) {
    // API - عدم التخزين
    newResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    newResponse.headers.set('Pragma', 'no-cache');
    newResponse.headers.set('Expires', '0');
  } else {
    // صفحات HTML - تخزين قصير
    newResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  }
  
  // 🔧 CORS محدود للـ API endpoints (A+ Grade)
  if (url.pathname.startsWith('/api/')) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = [
      'https://stockiha.com',
      'https://www.stockiha.com',
      'https://stockiha.pages.dev',
      'https://aaa75b28.stockiha.pages.dev'
    ];
    
    // للـ development
    const isDev = url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1');
    
    if (origin && (allowedOrigins.includes(origin) || isDev)) {
      newResponse.headers.set('Access-Control-Allow-Origin', origin);
    } else if (isDev) {
      newResponse.headers.set('Access-Control-Allow-Origin', '*'); // فقط للـ development
    }
    
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-ID, X-API-TOKEN');
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    newResponse.headers.set('Access-Control-Max-Age', '86400');
  }
  
  // ⚡ Server timing للتحليل
  const cfCacheStatus = response.headers.get('CF-Cache-Status');
  if (cfCacheStatus) {
    newResponse.headers.set('Server-Timing', 
      `cf-cache;desc="${cfCacheStatus}", cf-ray;desc="${response.headers.get('CF-Ray')}"`
    );
  }
  
  return newResponse;
}

// 🔧 Handle OPTIONS requests for CORS (A+ Grade)
export async function onRequestOptions(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request } = context;
  const origin = request.headers.get('Origin');
  const nonce = generateNonce();
  
  const allowedOrigins = [
    'https://stockiha.com',
    'https://www.stockiha.com', 
    'https://stockiha.pages.dev',
    'https://aaa75b28.stockiha.pages.dev'
  ];
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-ID, X-API-TOKEN',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
  
  // CORS محدود
  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  }
  
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      ...getSecurityHeaders(nonce)
    }
  });
}