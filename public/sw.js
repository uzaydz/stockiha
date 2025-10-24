// Service Worker لتحسين الأداء والتخزين المؤقت - إصدار محدث لتجنب التضارب
const CACHE_NAME = 'bazaar-v1.0.2';
const STATIC_CACHE = 'static-v1.0.2';
const DYNAMIC_CACHE = 'dynamic-v1.0.2';

// الملفات الحرجة للتخزين المؤقت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/store.html'
];

// قائمة الملفات التي يجب عدم تخزينها مؤقتاً
const NO_CACHE_PATTERNS = [
  '/api/',
  '/yalidine-api/',
  '/_next/',
  '/sw.js',
  '/dashboard/',
  'chrome-extension://',
  'moz-extension://'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        // عدم استخدام skipWaiting لتجنب التحديث المستمر
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        // عدم استخدام clients.claim() لتجنب التحديث المستمر
        return Promise.resolve();
      })
  );
});

// معالجة الطلبات
self.addEventListener('fetch', (event) => {
  // تخطي الطلبات غير GET
  if (event.request.method !== 'GET') {
    return;
  }

  // تخطي طلبات Chrome DevTools
  if (event.request.url.includes('.well-known/appspecific/')) {
    return;
  }

  // تخطي الملفات التي لا يجب تخزينها مؤقتاً
  if (NO_CACHE_PATTERNS.some(pattern => event.request.url.includes(pattern))) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إذا كان الملف موجود في الكاش، أعده
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // إلا، قم بجلب الملف من الشبكة
        return fetch(event.request)
          .then((response) => {
            // تحقق من صحة الاستجابة
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // استنسخ الاستجابة
            const responseToCache = response.clone();

            // قرر الكاش المناسب
            const cacheName = STATIC_ASSETS.some(asset => event.request.url.includes(asset))
              ? STATIC_CACHE
              : DYNAMIC_CACHE;

            // احفظ الملف في الكاش - تحسين لتجنب التضارب
            caches.open(cacheName)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('Service Worker: Cached new asset', event.request.url);
              })
              .catch((error) => {
                console.warn('Service Worker: Failed to cache asset', event.request.url, error);
              });

            return response;
          })
          .catch((error) => {
            console.warn('Service Worker: Network fetch failed', event.request.url, error);

            // للصفحات، أعد صفحة غير متصلة بالإنترنت - تحسين لتجنب الأخطاء
            if (event.request.destination === 'document') {
              return caches.match('/index.html').catch(() => {
                console.warn('Service Worker: No cached index.html found');
                return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
              });
            }

            // للطلبات الأخرى، أعد خطأ بدلاً من رمي exception
            return new Response('Network Error', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// معالجة الرسائل
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // عدم استخدام skipWaiting لتجنب التحديث المستمر
    console.log('Service Worker: Skip waiting requested but ignored to prevent infinite reload');
  }
});
