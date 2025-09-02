// 🔒 Cloudflare Pages Security Middleware
// middleware آمن مع Rate Limiting وحماية متقدمة

// إضافة Types للـ Cloudflare Pages
interface Env {
  [key: string]: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface PagesFunction<Env = any> {
  (context: {
    request: Request;
    env: Env;
    params: Record<string, string>;
    data: Record<string, any>;
    next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    waitUntil: ExecutionContext['waitUntil'];
    passThroughOnException: ExecutionContext['passThroughOnException'];
  }): Response | Promise<Response>;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Rate limiting configuration
const RATE_LIMITS = {
  api: { requests: 100, window: 60000 }, // 100 requests per minute for API
  general: { requests: 300, window: 60000 }, // 300 requests per minute for general
};

// In-memory store (في الإنتاج، استخدم Cloudflare KV أو Durable Objects)
const rateLimitStore: RateLimitStore = {};

function getRateLimitKey(request: Request): string {
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                  request.headers.get('X-Forwarded-For') || 
                  'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  return `${clientIP}:${userAgent.substring(0, 50)}`;
}

function checkRateLimit(key: string, limit: { requests: number; window: number }): boolean {
  const now = Date.now();
  const entry = rateLimitStore[key];

  if (!entry || now > entry.resetTime) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + limit.window
    };
    return true;
  }

  if (entry.count >= limit.requests) {
    return false;
  }

  entry.count++;
  return true;
}

function isValidOrigin(origin: string | null): boolean {
  if (!origin) return true; // Allow requests without origin (like mobile apps)
  
  const allowedOrigins = [
    'https://stockiha.pages.dev',
    'https://96bab160.stockiha.pages.dev', // Previous deployment
    'https://a0effe32.stockiha.pages.dev', // Current deployment
    'https://stockiha.com',
    'https://www.stockiha.com',
    'http://localhost:8080',
    'http://localhost:3000',
  ];
  
  return allowedOrigins.some(allowed => origin.startsWith(allowed));
}

export const onRequest: PagesFunction = async (context) => {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');

  // 🚫 Skip ALL security checks for static assets and main page
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.startsWith('/fonts/') || 
      url.pathname.startsWith('/images/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.ttf') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.ico')) {
    
    // Just pass through without any security checks
    return next();
  }

  // 🛡️ Security checks for non-static requests only
  
  // 1. Origin validation (only for API and form submissions)
  if ((url.pathname.startsWith('/api/') || request.method === 'POST') && !isValidOrigin(origin)) {
    return new Response(JSON.stringify({ error: 'Invalid origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Rate limiting
  const rateLimitKey = getRateLimitKey(request);
  const isApiRequest = url.pathname.startsWith('/api/');
  const limit = isApiRequest ? RATE_LIMITS.api : RATE_LIMITS.general;
  
  if (!checkRateLimit(rateLimitKey, limit)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    });
  }

  // 3. Security headers
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  // 4. CORS headers (محدودة للأمان)
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || 'https://stockiha.com',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  };

  // التعامل مع OPTIONS requests (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, ...securityHeaders },
    });
  }

  // معالجة الطلب
  const response = await next();
  
  // إضافة headers للاستجابة
  Object.entries({ ...corsHeaders, ...securityHeaders }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // إضافة headers مخصصة
  response.headers.set('X-Store-Type', 'dynamic');
  response.headers.set('X-Powered-By', 'Cloudflare Pages');
  
  // إضافة timestamp للـ debugging
  response.headers.set('X-Timestamp', new Date().toISOString());

  return response;
};
