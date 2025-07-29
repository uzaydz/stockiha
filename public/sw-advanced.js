// 🚀 Service Worker المتقدم مع Expires Headers
// Version: 3.0.0 - محسن للأداء والـ Caching

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// إعدادات Expires Headers (بالثواني)
const CACHE_STRATEGIES = {
  // الملفات الثابتة - سنة واحدة
  static: {
    maxAge: 31536000, // 1 year
    patterns: [/\.(?:js|css|woff2|woff|ttf|eot)$/],
    cache: STATIC_CACHE
  },
  
  // الصور - 6 أشهر
  images: {
    maxAge: 15552000, // 6 months
    patterns: [/\.(?:jpg|jpeg|png|gif|webp|svg|ico)$/],
    cache: IMAGE_CACHE
  },
  
  // HTML - ساعة واحدة
  html: {
    maxAge: 3600, // 1 hour
    patterns: [/\.html$/, /\/$/],
    cache: DYNAMIC_CACHE
  },
  
  // API - 5 دقائق
  api: {
    maxAge: 300, // 5 minutes
    patterns: [/\/api\//, /supabase\.co/],
    cache: API_CACHE
  }
};

// الملفات الحرجة
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/fonts/tajawal-regular.woff2',
  '/fonts/tajawal-medium.woff2',
  '/fonts/tajawal-bold.woff2'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('🔧 تثبيت Service Worker المتقدم...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CRITICAL_ASSETS))
      .then(() => {
        console.log('✅ تم تخزين الأصول الحرجة');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ خطأ في تثبيت Service Worker:', error);
      })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 تفعيل Service Worker المتقدم...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('🗑️ حذف كاش قديم:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ تم تنظيف الكاش القديم');
        return self.clients.claim();
      })
  );
});

// معالج الطلبات المحسن
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل طلبات غير GET
  if (request.method !== 'GET') {
    return;
  }
  
  // تجاهل طلبات التطوير
  if (url.hostname === 'localhost' && url.port === '8080') {
    event.respondWith(handleNetworkFirst(request));
    return;
  }
  
  // تحديد استراتيجية التخزين المؤقت
  const strategy = getStrategy(url.pathname);
  
  switch (strategy.cache) {
    case STATIC_CACHE:
      event.respondWith(handleCacheFirst(request, strategy));
      break;
    case IMAGE_CACHE:
      event.respondWith(handleCacheFirst(request, strategy));
      break;
    case API_CACHE:
      event.respondWith(handleStaleWhileRevalidate(request, strategy));
      break;
    case DYNAMIC_CACHE:
      event.respondWith(handleNetworkFirst(request, strategy));
      break;
    default:
      event.respondWith(handleNetworkFirst(request));
  }
});

// تحديد استراتيجية التخزين المؤقت
function getStrategy(pathname) {
  for (const [key, strategy] of Object.entries(CACHE_STRATEGIES)) {
    if (strategy.patterns.some(pattern => pattern.test(pathname))) {
      return strategy;
    }
  }
  return { cache: DYNAMIC_CACHE, maxAge: 3600 };
}

// معالج Cache First مع Expires Headers
async function handleCacheFirst(request, strategy) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // التحقق من انتهاء صلاحية الكاش
      const cacheDate = new Date(cachedResponse.headers.get('date') || Date.now());
      const now = new Date();
      const ageInSeconds = (now - cacheDate) / 1000;
      
      if (ageInSeconds < strategy.maxAge) {
        console.log('✅ Cache hit:', request.url);
        return cachedResponse;
      }
    }
    
    const response = await fetch(request);
    
    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(strategy.cache);
      
      // إضافة Expires Headers
      const modifiedResponse = new Response(responseClone.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Cache-Control': `public, max-age=${strategy.maxAge}`,
          'Expires': new Date(Date.now() + strategy.maxAge * 1000).toUTCString(),
          'Date': new Date().toUTCString()
        }
      });
      
      await cache.put(request, modifiedResponse.clone());
      console.log('💾 Cached:', request.url);
      return modifiedResponse;
    }
    
    return response;
  } catch (error) {
    console.error('❌ Cache First error:', error);
    return caches.match(request);
  }
}

// معالج Network First
async function handleNetworkFirst(request, strategy) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200 && strategy) {
      const responseClone = response.clone();
      const cache = await caches.open(strategy.cache);
      
      // إضافة Expires Headers
      const modifiedResponse = new Response(responseClone.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Cache-Control': `public, max-age=${strategy.maxAge}`,
          'Expires': new Date(Date.now() + strategy.maxAge * 1000).toUTCString(),
          'Date': new Date().toUTCString()
        }
      });
      
      await cache.put(request, modifiedResponse.clone());
      console.log('🌐 Network first cached:', request.url);
      return modifiedResponse;
    }
    
    return response;
  } catch (error) {
    console.error('❌ Network First error:', error);
    return caches.match(request) || caches.match('/');
  }
}

// معالج Stale While Revalidate
async function handleStaleWhileRevalidate(request, strategy) {
  try {
    const cachedResponse = await caches.match(request);
    
    // تحديث الكاش في الخلفية
    const fetchPromise = fetch(request).then(response => {
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(strategy.cache).then(cache => {
          const modifiedResponse = new Response(responseClone.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'Cache-Control': `public, max-age=${strategy.maxAge}`,
              'Expires': new Date(Date.now() + strategy.maxAge * 1000).toUTCString(),
              'Date': new Date().toUTCString()
            }
          });
          
          cache.put(request, modifiedResponse);
          console.log('🔄 Stale while revalidate updated:', request.url);
        });
      }
      return response;
    }).catch(() => null);
    
    return cachedResponse || fetchPromise;
  } catch (error) {
    console.error('❌ Stale While Revalidate error:', error);
    return caches.match(request);
  }
}

// رسائل من العميل
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

// إحصائيات الكاش
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }
  
  return stats;
}

// تنظيف الكاش القديم
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => !name.includes(CACHE_VERSION));
  
  return Promise.all(oldCaches.map(name => caches.delete(name)));
}

// تشغيل تنظيف دوري
setInterval(cleanupOldCaches, 24 * 60 * 60 * 1000); // كل 24 ساعة

console.log('🚀 Service Worker المتقدم جاهز مع Expires Headers!'); 