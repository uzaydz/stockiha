
// 🚀 Service Worker المحسن للأداء وExpires Headers
// Version: 2.0.0

const CACHE_NAME = 'bazaar-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';
const IMAGE_CACHE = 'images-v2';

// الملفات الحرجة للتخزين المؤقت
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/fonts/tajawal-regular.woff2',
  '/fonts/tajawal-medium.woff2',
  '/fonts/tajawal-bold.woff2'
];

// الملفات الثابتة
const STATIC_ASSETS = [
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('🔧 تثبيت Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // تخزين الأصول الحرجة
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(CRITICAL_ASSETS);
      }),
      // تخزين الأصول الثابتة
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(STATIC_ASSETS);
      })
    ]).then(() => {
      console.log('✅ تم تخزين الأصول الحرجة');
      return self.skipWaiting();
    })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 تفعيل Service Worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // حذف الكاش القديم
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️  حذف كاش قديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ تم تنظيف الكاش القديم');
      return self.clients.claim();
    })
  );
});

// معالج الطلبات المحسن
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل طلبات POST لتجنب الأخطاء
  if (request.method !== 'GET') {
    return;
  }
  
  // استراتيجية Cache First للخطوط والأصول الثابتة
  if (request.destination === 'font' || 
      url.pathname.includes('/fonts/') ||
      url.pathname.includes('/assets/') ||
      url.pathname.match(/\.(css|js|woff2|woff|ttf|eot)$/)) {
    
    event.respondWith(handleCacheFirst(request));
    return;
  }
  
  // استراتيجية Cache First للصور
  if (request.destination === 'image' || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    
    event.respondWith(handleImageCache(request));
    return;
  }
  
  // استراتيجية Network First للصفحات
  if (request.destination === 'document') {
    event.respondWith(handleNetworkFirst(request));
    return;
  }
  
  // استراتيجية Stale While Revalidate للـ API
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(handleStaleWhileRevalidate(request));
    return;
  }
});

// معالج Cache First
async function handleCacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await fetch(request);
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    return caches.match(request);
  }
}

// معالج الصور
async function handleImageCache(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await fetch(request);
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(IMAGE_CACHE);
      await cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    return caches.match(request);
  }
}

// معالج Network First
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    return caches.match(request) || caches.match('/');
  }
}

// معالج Stale While Revalidate
async function handleStaleWhileRevalidate(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then(response => {
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(request, responseClone);
        });
      }
      return response;
    }).catch(() => null);
    
    return cachedResponse || fetchPromise;
  } catch (error) {
    return caches.match(request);
  }
}

// رسائل من العميل
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
