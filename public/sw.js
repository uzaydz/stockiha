// Service Worker لتحسين الأداء والتخزين المؤقت
const CACHE_NAME = 'bazaar-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// الملفات الحرجة للتخزين المؤقت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/store.html',
  '/src/index.css',
  '/src/main.tsx',
  '/src/store-main.tsx',
  '/fonts/tajawal-regular.woff2',
  '/fonts/tajawal-medium.woff2',
  '/fonts/tajawal-bold.woff2',
  '/assets/react-core-CQ_KtV-u.js',
  '/assets/main-BoN-3Mza.js',
  '/assets/index-KdHpbJPa.js',
  '/assets/css/index-DzXS1-O1.css'
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
        return self.clients.claim();
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

            // احفظ الملف في الكاش
            caches.open(cacheName)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('Service Worker: Cached new asset', event.request.url);
              });

            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Network fetch failed', error);

            // للصفحات، أعد صفحة غير متصلة بالإنترنت
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }

            throw error;
          });
      })
  );
});

// معالجة الرسائل
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
