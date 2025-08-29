
// 🚀 Service Worker الموحد والمحسن - يحل جميع مشاكل الكاش
// Version: 4.0.0 - نظام كاش موحد ومتوافق

const CACHE_VERSION = 'bazaar-unified-v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// إعدادات الكاش المتقدمة - موحدة مع React Query
const CACHE_CONFIG = {
  // الملفات الثابتة - سنة واحدة
  static: {
    maxAge: 31536000, // 1 year
    patterns: [/\.(css|js|woff2|woff|ttf|eot|json|ico)$/],
    cache: STATIC_CACHE,
    strategy: 'cache-first'
  },

  // الصور - 6 أشهر
  images: {
    maxAge: 15552000, // 6 months
    patterns: [/\.(jpg|jpeg|png|gif|webp|svg|avif|webp)$/],
    cache: IMAGE_CACHE,
    strategy: 'cache-first'
  },

  // HTML - ساعة واحدة (للسماح بالتحديثات)
  html: {
    maxAge: 3600, // 1 hour
    patterns: [/\.html$/, /^\/$/],
    cache: DYNAMIC_CACHE,
    strategy: 'network-first'
  },

  // API - 5 دقائق (للبيانات المتغيرة)
  api: {
    maxAge: 300, // 5 minutes
    patterns: [/\/api\//, /supabase\.co/, /vercel\.app/],
    cache: API_CACHE,
    strategy: 'stale-while-revalidate'
  }
};

// الملفات الحرجة للتحميل الفوري
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('🔧 تثبيت Service Worker الموحد...');

  event.waitUntil(
    Promise.all([
      // تخزين الأصول الحرجة
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(CRITICAL_ASSETS).catch(error => {
          console.warn('⚠️ فشل تخزين بعض الأصول الحرجة:', error);
          // محاولة تخزين كل ملف بشكل منفصل
          return Promise.allSettled(
            CRITICAL_ASSETS.map(asset => cache.add(asset))
          );
        });
      })
    ]).then(() => {
      console.log('✅ تم تثبيت Service Worker الموحد');
      return self.skipWaiting();
    }).catch(error => {
      console.error('❌ خطأ في تثبيت Service Worker:', error);
    })
  );
});

// تفعيل Service Worker - تنظيف شامل
self.addEventListener('activate', event => {
  console.log('🚀 تفعيل Service Worker الموحد...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // حذف جميع الكاش القديم (من الإصدارات السابقة)
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('🗑️ حذف كاش قديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ تم تنظيف جميع الكاش القديم');
      return self.clients.claim();
    }).catch(error => {
      console.error('❌ خطأ في تنظيف الكاش:', error);
    })
  );
});

// معالج الطلبات المحسن والموحد
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات غير GET
  if (request.method !== 'GET') {
    return;
  }

  // تجاهل طلبات localhost في التطوير
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // تحديد استراتيجية الكاش المناسبة
  const cacheStrategy = getCacheStrategy(url);

  switch (cacheStrategy.strategy) {
    case 'cache-first':
      event.respondWith(handleCacheFirst(request, cacheStrategy));
      break;
    case 'network-first':
      event.respondWith(handleNetworkFirst(request, cacheStrategy));
      break;
    case 'stale-while-revalidate':
      event.respondWith(handleStaleWhileRevalidate(request, cacheStrategy));
      break;
    default:
      // للطلبات الأخرى، استخدم network-first
      event.respondWith(handleNetworkFirst(request, { cache: DYNAMIC_CACHE, maxAge: 3600 }));
  }
});

// تحديد استراتيجية الكاش
function getCacheStrategy(url) {
  const pathname = url.pathname;

  for (const [type, config] of Object.entries(CACHE_CONFIG)) {
    if (config.patterns.some(pattern => pattern.test(pathname))) {
      return config;
    }
  }

  // الافتراضي للطلبات الأخرى
  return { cache: DYNAMIC_CACHE, maxAge: 3600, strategy: 'network-first' };
}

// معالج Cache First مع Expires Headers
async function handleCacheFirst(request, strategy) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // التحقق من انتهاء صلاحية الكاش
      const cacheDate = cachedResponse.headers.get('sw-cache-date');
      if (cacheDate) {
        const age = (Date.now() - parseInt(cacheDate)) / 1000;
        if (age < strategy.maxAge) {
          return cachedResponse;
        }
      } else {
        // إذا لم يكن هناك تاريخ، تحقق من تاريخ الاستجابة
        const responseDate = cachedResponse.headers.get('date');
        if (responseDate) {
          const age = (Date.now() - new Date(responseDate).getTime()) / 1000;
          if (age < strategy.maxAge) {
            return cachedResponse;
          }
        }
      }
    }

    const response = await fetch(request);

    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(strategy.cache);

      // إضافة headers للتحكم في الكاش
      const modifiedResponse = new Response(responseClone.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cache-date': Date.now().toString(),
          'sw-cache-strategy': 'cache-first'
        }
      });

      await cache.put(request, modifiedResponse.clone());
      return modifiedResponse;
    }

    return response;
  } catch (error) {
    console.error('❌ خطأ في Cache First:', error);
    return caches.match(request);
  }
}

// معالج Network First
async function handleNetworkFirst(request, strategy) {
  try {
    const response = await fetch(request);

    if (response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(strategy.cache);

      const modifiedResponse = new Response(responseClone.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cache-date': Date.now().toString(),
          'sw-cache-strategy': 'network-first'
        }
      });

      await cache.put(request, modifiedResponse.clone());
      return modifiedResponse;
    }

    return response;
  } catch (error) {
    console.error('❌ خطأ في Network First:', error);
    // إذا فشل الشبكة، جرب الكاش
    return caches.match(request) || caches.match('/');
  }
}

// معالج Stale While Revalidate - محسن
async function handleStaleWhileRevalidate(request, strategy) {
  try {
    const cachedResponse = await caches.match(request);
    let shouldUpdateCache = true;

    // التحقق من عمر الكاش
    if (cachedResponse) {
      const cacheDate = cachedResponse.headers.get('sw-cache-date');
      if (cacheDate) {
        const age = (Date.now() - parseInt(cacheDate)) / 1000;
        if (age < strategy.maxAge) {
          shouldUpdateCache = false;
        }
      }
    }

    // تحديث الكاش في الخلفية
    if (shouldUpdateCache) {
      fetch(request).then(response => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(strategy.cache).then(cache => {
            const modifiedResponse = new Response(responseClone.body, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                ...Object.fromEntries(response.headers.entries()),
                'sw-cache-date': Date.now().toString(),
                'sw-cache-strategy': 'stale-while-revalidate'
              }
            });
            cache.put(request, modifiedResponse);
          });
        }
      }).catch(() => {
        // تجاهل أخطاء التحديث
      });
    }

    return cachedResponse;
  } catch (error) {
    console.error('❌ خطأ في Stale While Revalidate:', error);
    return caches.match(request);
  }
}

// رسائل من العميل - محسنة ومتوافقة مع نظام الكاش الموحد
self.addEventListener('message', event => {
  const { data, ports } = event;

  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data && data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      if (ports && ports[0]) {
        ports[0].postMessage(stats);
      }
    });
  }

  if (data && data.type === 'CLEAR_CACHE') {
    clearAllCache().then(result => {
      if (ports && ports[0]) {
        ports[0].postMessage({ type: 'CACHE_CLEARED', result });
      }
    });
  }

  if (data && data.type === 'INVALIDATE_CACHE_PATTERN') {
    invalidateCachePattern(data.pattern).then(result => {
      if (ports && ports[0]) {
        ports[0].postMessage({ type: 'CACHE_INVALIDATED', result });
      }
    });
  }

  // رسائل من نظام الكاش الموحد
  if (data && data.type === 'CACHE_UPDATE') {
    handleCacheUpdate(data.key, data.data).then(result => {
      if (ports && ports[0]) {
        ports[0].postMessage({ type: 'CACHE_UPDATE_RESPONSE', result });
      }
    });
  }

  if (data && data.type === 'CACHE_DELETE') {
    handleCacheDelete(data.key).then(result => {
      if (ports && ports[0]) {
        ports[0].postMessage({ type: 'CACHE_DELETE_RESPONSE', result });
      }
    });
  }

  if (data && data.type === 'UNIFIED_CACHE_SYNC') {
    syncWithUnifiedCache().then(result => {
      if (ports && ports[0]) {
        ports[0].postMessage({ type: 'UNIFIED_CACHE_SYNC_RESPONSE', result });
      }
    });
  }
});

// إحصائيات الكاش
async function getCacheStats() {
  const stats = {
    version: CACHE_VERSION,
    caches: {}
  };

  try {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      if (cacheName.includes(CACHE_VERSION)) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        stats.caches[cacheName] = {
          entries: keys.length,
          urls: keys.map(req => req.url).slice(0, 10) // أول 10 URLs فقط
        };
      }
    }
  } catch (error) {
    stats.error = error.message;
  }

  return stats;
}

// مسح جميع الكاش
async function clearAllCache() {
  try {
    const cacheNames = await caches.keys();
    const results = [];

    for (const cacheName of cacheNames) {
      if (cacheName.includes(CACHE_VERSION)) {
        const deleted = await caches.delete(cacheName);
        results.push({ cacheName, deleted });
      }
    }

    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// إبطال كاش معين بنمط
async function invalidateCachePattern(pattern) {
  try {
    const cacheNames = await caches.keys();
    const results = [];

    for (const cacheName of cacheNames) {
      if (cacheName.includes(CACHE_VERSION)) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        let deletedCount = 0;
        for (const request of keys) {
          if (request.url.includes(pattern)) {
            await cache.delete(request);
            deletedCount++;
          }
        }

        results.push({ cacheName, deletedCount });
      }
    }

    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// معالجة تحديثات الكاش من نظام الكاش الموحد
async function handleCacheUpdate(key, data) {
  try {
    // تحديد الكاش المناسب بناءً على نوع البيانات
    let targetCache = DYNAMIC_CACHE;

    if (key.includes('api') || key.includes('supabase')) {
      targetCache = API_CACHE;
    } else if (key.includes('static') || key.includes('assets')) {
      targetCache = STATIC_CACHE;
    }

    const cache = await caches.open(targetCache);

    // إنشاء Response مع metadata
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'sw-cache-date': Date.now().toString(),
        'sw-cache-source': 'unified-cache-manager',
        'sw-cache-key': key
      }
    });

    // محاولة إنشاء URL مناسب للكاش
    const cacheUrl = `https://unified-cache/${key}`;
    await cache.put(cacheUrl, response);

    return { success: true, cache: targetCache, key };
  } catch (error) {
    console.error('❌ خطأ في تحديث الكاش:', error);
    return { success: false, error: error.message };
  }
}

// معالجة حذف الكاش من نظام الكاش الموحد
async function handleCacheDelete(key) {
  try {
    const results = [];

    // البحث عن المفتاح في جميع الكاشات
    for (const cacheName of [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE]) {
      try {
        const cache = await caches.open(cacheName);
        const cacheUrl = `https://unified-cache/${key}`;

        const deleted = await cache.delete(cacheUrl);
        if (deleted) {
          results.push({ cache: cacheName, deleted: true });
        }
      } catch (error) {
        // تجاهل أخطاء الكاشات غير الموجودة
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error('❌ خطأ في حذف الكاش:', error);
    return { success: false, error: error.message };
  }
}

// مزامنة مع نظام الكاش الموحد
async function syncWithUnifiedCache() {
  try {
    // إرسال إشارة إلى العميل للمزامنة
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'UNIFIED_CACHE_SYNC_REQUEST',
          timestamp: Date.now()
        });
      });
    });

    return { success: true, message: 'تم إرسال طلب المزامنة' };
  } catch (error) {
    console.error('❌ خطأ في المزامنة:', error);
    return { success: false, error: error.message };
  }
}

// تنظيف دوري للكاش القديم
setInterval(async () => {
  try {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      if (!cacheName.includes(CACHE_VERSION)) {
        await caches.delete(cacheName);
      }
    }
  } catch (error) {
    // تجاهل الأخطاء
  }
}, 24 * 60 * 60 * 1000); // كل 24 ساعة

// تنظيف إضافي للمدخلات القديمة في الكاش الموحد
setInterval(async () => {
  try {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // أسبوع

    for (const cacheName of [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE]) {
      try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        for (const request of keys) {
          try {
            const response = await cache.match(request);
            if (response) {
              const cacheDate = response.headers.get('sw-cache-date');
              if (cacheDate && (now - parseInt(cacheDate)) > maxAge) {
                await cache.delete(request);
              }
            }
          } catch (error) {
            // تجاهل الأخطاء الفردية
          }
        }
      } catch (error) {
        // تجاهل أخطاء الكاشات
      }
    }
  } catch (error) {
    // تجاهل الأخطاء العامة
  }
}, 60 * 60 * 1000); // كل ساعة

console.log('🚀 Service Worker الموحد جاهز - يحل جميع مشاكل الكاش!');
