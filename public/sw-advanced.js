/**
 * Advanced Service Worker for Performance Optimization
 * يحسن الأداء من خلال استراتيجيات التخزين المؤقت المتقدمة
 */

const CACHE_NAME = 'stockiha-v1.2.1';
const STATIC_CACHE = 'static-v1.2.1';
const DYNAMIC_CACHE = 'dynamic-v1.2.1';
const IMAGE_CACHE = 'images-v1.2.1';

// ملفات للتخزين المؤقت الفوري
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Critical CSS and JS will be added dynamically
];

// استراتيجيات التخزين المؤقت
const CACHE_STRATEGIES = {
  // Cache First للأصول الثابتة
  CACHE_FIRST: 'cache-first',
  // Network First للبيانات الديناميكية
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate للموارد المتوسطة
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network Only للـ APIs الحساسة
  NETWORK_ONLY: 'network-only'
};

// تكوين استراتيجيات التخزين
const ROUTE_STRATEGIES = [
  {
    pattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  {
    pattern: /\/api\/.*$/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: DYNAMIC_CACHE,
    maxAge: 5 * 60 * 1000 // 5 minutes
  },
  {
    pattern: /\.(?:png|jpg|jpeg|gif|svg|webp|avif)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: IMAGE_CACHE,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // فتح cache للأصول الثابتة
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // تخطي الانتظار للتفعيل الفوري
      self.skipWaiting()
    ])
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // حذف الـ caches القديمة
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (![CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // السيطرة على جميع العملاء
      self.clients.claim()
    ])
  );
});

// معالجة الطلبات
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل طلبات غير HTTP/HTTPS
  if (!request.url.startsWith('http')) return;
  
  // تجاهل طلبات Chrome extension
  if (url.protocol === 'chrome-extension:') return;
  
  // تجاهل POST requests للـ Supabase RPC، Edge Functions وSentry (لتجنب مشاكل الـ caching)
  if (request.method === 'POST' && 
      (url.href.includes('supabase.co/rest/v1/rpc') || 
       url.href.includes('supabase.co/functions/v1/') ||
       url.href.includes('sentry.io'))) {
    event.respondWith(fetch(request));
    return;
  }
  
  // العثور على الاستراتيجية المناسبة
  const routeStrategy = ROUTE_STRATEGIES.find(route => 
    route.pattern.test(url.pathname) || route.pattern.test(request.url)
  );
  
  if (routeStrategy) {
    event.respondWith(handleRequest(request, routeStrategy));
  } else {
    // استراتيجية افتراضية للصفحات
    event.respondWith(handlePageRequest(request));
  }
});

// معالجة طلب بناءً على الاستراتيجية
async function handleRequest(request, strategy) {
  const cache = await caches.open(strategy.cacheName);
  
  switch (strategy.strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cache, strategy.maxAge);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cache, strategy.maxAge);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cache, strategy.maxAge);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    
    default:
      return fetch(request);
  }
}

// Cache First Strategy
async function cacheFirst(request, cache, maxAge) {
  // لا نستخدم cache للـ POST requests
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, serving cached version:', error);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Network First Strategy
async function networkFirst(request, cache, maxAge) {
  try {
    const networkResponse = await fetch(request);
    // لا نقوم بـ cache POST requests
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', error);
    
    // لا نحاول استخدام cache للـ POST requests
    if (request.method !== 'GET') {
      throw error;
    }
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cache, maxAge) {
  // لا نستخدم cache للـ POST requests
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  const cachedResponse = await cache.match(request);
  
  // إرجاع النسخة المخزنة فوراً إذا وجدت
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.warn('[SW] Background fetch failed:', error);
  });
  
  // إذا كانت النسخة المخزنة موجودة وغير منتهية الصلاحية
  if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
    // تشغيل التحديث في الخلفية
    fetchPromise;
    return cachedResponse;
  }
  
  // إذا لم تكن موجودة أو منتهية الصلاحية، انتظر الشبكة
  return fetchPromise;
}

// معالجة طلبات الصفحات
async function handlePageRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.warn('[SW] Page request failed, serving offline page:', error);
    
    // محاولة إرجاع الصفحة الرئيسية من الـ cache
    const cache = await caches.open(STATIC_CACHE);
    const cachedPage = await cache.match('/');
    
    return cachedPage || new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Stockiha</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>🚫 غير متصل</h1>
            <p>يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى</p>
            <button onclick="window.location.reload()">إعادة المحاولة</button>
          </div>
        </body>
      </html>`,
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 503 
      }
    );
  }
}

// فحص انتهاء صلاحية الـ cache
function isExpired(response, maxAge) {
  if (!maxAge) return false;
  
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const date = new Date(dateHeader);
  const now = new Date();
  
  return (now.getTime() - date.getTime()) > maxAge;
}

// رسائل للتواصل مع الصفحة الرئيسية
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearOldCaches().then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

// حساب حجم الـ cache
async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// حذف الـ caches القديمة
async function clearOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (!currentCaches.includes(cacheName)) {
        console.log('[SW] Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

console.log('[SW] Service Worker script loaded successfully!');

// إضافة رسالة تشير لنظام التشخيص المتطور
if (typeof globalThis !== 'undefined') {
  globalThis.postMessage?.({
    type: 'PRODUCTION_DEBUG_AVAILABLE',
    message: 'Use prodDebug.stats() in console for performance data'
  });
} 