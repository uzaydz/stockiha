import { ServerResponse } from 'http';

// دالة مساعدة لضبط headers CORS
export function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-Content-Type-Options');
}

// دالة مساعدة لضبط headers الأمان
export function setSecurityHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// دالة مساعدة لضبط headers المحتوى
export function setContentHeaders(res: ServerResponse, contentType: string, cacheControl?: string) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Vary', 'Accept-Encoding');
  
  if (cacheControl) {
    res.setHeader('Cache-Control', cacheControl);
  }
}

// دالة مساعدة لضبط جميع headers الأساسية
export function setBasicHeaders(res: ServerResponse) {
  setCorsHeaders(res);
  setSecurityHeaders(res);
}
