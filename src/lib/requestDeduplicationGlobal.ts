/**
 * نظام منع التكرار العالمي المتقدم للطلبات
 * يتدخل في جميع طلبات HTTP ويمنع الطلبات المكررة بذكاء
 */

// أنواع الطلبات المختلفة
type RequestType = 'auth' | 'data' | 'api' | 'other';

// إعدادات منع التكرار لكل نوع - محسنة للمنع القوي
const DEDUPLICATION_CONFIG = {
  auth: {
    ttl: 300000, // 5 دقائق للـ Auth requests - منع طويل المدى
    cacheTtl: 900000, // 15 دقيقة للـ Auth cache
    immediateBlockTtl: 5000, // 5 ثوان للمنع الفوري
  },
  data: {
    ttl: 60000, // دقيقة واحدة للبيانات العادية
    cacheTtl: 120000, // دقيقتان للـ cache
    immediateBlockTtl: 2000, // ثانيتان للمنع الفوري
  },
  api: {
    ttl: 30000, // 30 ثانية للـ API calls
    cacheTtl: 60000, // دقيقة واحدة للـ cache
    immediateBlockTtl: 1000, // ثانية واحدة للمنع الفوري
  },
  other: {
    ttl: 15000, // 15 ثانية للطلبات الأخرى
    cacheTtl: 30000, // 30 ثانية للـ cache
    immediateBlockTtl: 1000, // ثانية واحدة للمنع الفوري
  }
};

// خرائط التخزين المؤقت
const pendingRequests = new Map<string, Promise<any>>();
const recentRequests = new Map<string, number>();
const authResponseCache = new Map<string, { response: any; timestamp: number; ttl: number }>();
const requestLogs: Array<{ url: string; method: string; timestamp: number; type: RequestType; blocked: boolean; source: string }> = [];

// إحصائيات النظام
let stats = {
  totalRequests: 0,
  blockedRequests: 0,
  authRequests: 0,
  authBlocked: 0,
  cacheHits: 0,
  lastReset: Date.now()
};

// تحديد نوع الطلب
function getRequestType(url: string): RequestType {
  if (url.includes('/auth/') || url.includes('/users?')) {
    return 'auth';
  }
  if (url.includes('/rest/v1/') || url.includes('/rpc/')) {
    return 'data';
  }
  if (url.includes('/api/')) {
    return 'api';
  }
  return 'other';
}

// إنشاء مفتاح فريد للطلب
function createRequestKey(url: string, method: string = 'GET', body?: any): string {
  const requestType = getRequestType(url);
  
  // مفاتيح خاصة للـ Auth requests
  if (requestType === 'auth') {
    if (url.includes('/auth/v1/user')) {
      return 'AUTH:USER:GLOBAL';
    }
    if (url.includes('/users?') && url.includes('id=eq.')) {
      const match = url.match(/id=eq\.([^&]+)/);
      const userId = match ? match[1] : 'unknown';
      return `AUTH:USER_PROFILE:${userId}`;
    }
  }
  
  // مفاتيح للبيانات العادية
  const urlObj = new URL(url, 'https://example.com');
  const pathname = urlObj.pathname;
  const params = urlObj.searchParams.toString();
  
  let key = `${method}:${pathname}`;
  if (params) {
    key += `:${params}`;
  }
  if (body && typeof body === 'string') {
    key += `:${body.substring(0, 100)}`;
  }
  
  return key;
}

// تنظيف الخرائط من البيانات المنتهية الصلاحية
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  // تنظيف الطلبات الحديثة
  for (const [key, timestamp] of recentRequests.entries()) {
    if (now - timestamp > 300000) { // 5 دقائق
      recentRequests.delete(key);
    }
  }
  
  // تنظيف cache الـ Auth
  for (const [key, entry] of authResponseCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      authResponseCache.delete(key);
    }
  }
  
  // الاحتفاظ بآخر 100 log entry فقط
  if (requestLogs.length > 100) {
    requestLogs.splice(0, requestLogs.length - 100);
  }
}

// إضافة طلب للسجل
function logRequest(url: string, method: string, type: RequestType, blocked: boolean, source: string): void {
  requestLogs.push({
    url: url.replace(/https?:\/\/[^\/]+/, ''), // إزالة domain
    method,
    timestamp: Date.now(),
    type,
    blocked,
    source
  });
  
  // تحديث الإحصائيات
  stats.totalRequests++;
  if (blocked) {
    stats.blockedRequests++;
  }
  if (type === 'auth') {
    stats.authRequests++;
    if (blocked) {
      stats.authBlocked++;
    }
  }
}

// التحقق من إمكانية تنفيذ الطلب - محسن للمنع القوي
function shouldBlockRequest(key: string, type: RequestType): boolean {
  const now = Date.now();
  const config = DEDUPLICATION_CONFIG[type];
  
  // التحقق من الطلبات المعلقة - منع فوري
  if (pendingRequests.has(key)) {
    return true;
  }
  
  // التحقق من الطلبات الحديثة للمنع الفوري
  const lastRequest = recentRequests.get(key);
  if (lastRequest && (now - lastRequest) < config.immediateBlockTtl) {
    return true;
  }
  
  // منع إضافي للـ Auth requests - فترة أطول
  if (type === 'auth') {
    if (lastRequest && (now - lastRequest) < config.ttl) {
      return true;
    }
  }
  
  return false;
}

// محاكاة response من الـ cache
function createCachedResponse(cachedData: any, url: string): Response {
  const responseBody = JSON.stringify(cachedData);
  const response = new Response(responseBody, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'HIT',
      'X-Deduplication': 'true'
    }
  });
  
  // إضافة خصائص إضافية للـ response
  Object.defineProperty(response, 'url', { value: url, writable: false });
  
  return response;
}

// تدخل في window.fetch
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || 'GET';
  const body = init?.body;
  
  const requestType = getRequestType(url);
  const key = createRequestKey(url, method, typeof body === 'string' ? body : undefined);
  const config = DEDUPLICATION_CONFIG[requestType];
  
  // التحقق من الـ cache للـ Auth requests
  if (requestType === 'auth' && method === 'GET') {
    const cached = authResponseCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      stats.cacheHits++;
      logRequest(url, method, requestType, true, 'fetch-cache');
      console.log(`🎯 استخدام Auth Cache للطلب: ${key}`);
      return createCachedResponse(cached.response, url);
    }
  }
  
  // التحقق من إمكانية منع الطلب
  if (shouldBlockRequest(key, requestType)) {
    logRequest(url, method, requestType, true, 'fetch-block');
    
    if (requestType === 'auth') {
      console.log(`🚫 منع طلب Auth مكرر: ${key}`);
    }
    
    // انتظار الطلب المعلق إن وجد
    if (pendingRequests.has(key)) {
      try {
        const result = await pendingRequests.get(key);
        return createCachedResponse(result, url);
      } catch (error) {
        console.warn('فشل في انتظار الطلب المعلق:', error);
        // في حالة فشل الطلب المعلق، نسمح بطلب جديد
      }
    }
    
    // للـ Auth requests، محاولة إرجاع من الـ cache أولاً
    if (requestType === 'auth') {
      const cached = authResponseCache.get(key);
      if (cached) {
        console.log(`🎯 استخدام Auth Cache للطلب المحظور: ${key}`);
        return createCachedResponse(cached.response, url);
      }
    }
    
    // إرجاع response فارغ للطلبات المحظورة
    return new Response('{}', { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', 'X-Blocked': 'true' } 
    });
  }
  
  // تسجيل وقت الطلب
  recentRequests.set(key, Date.now());
  logRequest(url, method, requestType, false, 'fetch');
  
  // تنفيذ الطلب مع منع التكرار
  const requestPromise = originalFetch.call(this, input, init).then(async (response) => {
    // حفظ الاستجابة في الـ cache للـ Auth requests
    if (requestType === 'auth' && response.ok && method === 'GET') {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        authResponseCache.set(key, {
          response: data,
          timestamp: Date.now(),
          ttl: config.cacheTtl
        });
        console.log(`💾 حفظ Auth Response في Cache: ${key}`);
      } catch (error) {
        console.warn('فشل في حفظ Auth response:', error);
      }
    }
    
    return response;
  }).finally(() => {
    // إزالة الطلب من المعلقة
    pendingRequests.delete(key);
  });
  
  // إضافة الطلب للمعلقة
  pendingRequests.set(key, requestPromise);
  
  return requestPromise;
};

// تدخل في XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
  this._deduplicationUrl = url.toString();
  this._deduplicationMethod = method;
  return originalXHROpen.call(this, method, url, ...args);
};

XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
  const url = this._deduplicationUrl;
  const method = this._deduplicationMethod || 'GET';
  
  if (url) {
    const requestType = getRequestType(url);
    const key = createRequestKey(url, method, typeof body === 'string' ? body : undefined);
    
    // التحقق من منع التكرار
    if (shouldBlockRequest(key, requestType)) {
      logRequest(url, method, requestType, true, 'xhr-block');
      
      // محاكاة استجابة فورية
      setTimeout(() => {
        Object.defineProperty(this, 'readyState', { value: 4, writable: false });
        Object.defineProperty(this, 'status', { value: 200, writable: false });
        Object.defineProperty(this, 'responseText', { value: '{}', writable: false });
        
        if (this.onreadystatechange) {
          this.onreadystatechange.call(this);
        }
      }, 0);
      
      return;
    }
    
    // تسجيل الطلب
    recentRequests.set(key, Date.now());
    logRequest(url, method, requestType, false, 'xhr');
  }
  
  return originalXHRSend.call(this, body);
};

// تدخل في globalThis.fetch إذا كان مختلفاً
if (globalThis.fetch && globalThis.fetch !== window.fetch) {
  const originalGlobalFetch = globalThis.fetch;
  globalThis.fetch = window.fetch;
  console.log('🔄 تم توحيد globalThis.fetch مع window.fetch');
}

// مراقب الأداء لرصد طلبات Supabase
if (typeof PerformanceObserver !== 'undefined') {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('supabase.co')) {
          const requestType = getRequestType(entry.name);
          if (requestType === 'auth') {
            console.log(`📊 رصد طلب Supabase Auth: ${entry.name.split('/').pop()}`);
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.warn('فشل في تفعيل PerformanceObserver:', error);
  }
}

// تنظيف دوري للبيانات المنتهية الصلاحية
setInterval(cleanupExpiredEntries, 60000); // كل دقيقة

// إحصائيات دورية محسنة
setInterval(() => {
  const authBlockPercentage = stats.authRequests > 0 ? Math.round((stats.authBlocked / stats.authRequests) * 100) : 0;
  const totalBlockPercentage = stats.totalRequests > 0 ? Math.round((stats.blockedRequests / stats.totalRequests) * 100) : 0;
  
  if (stats.totalRequests > 0) {
    console.log(`📈 إحصائيات منع التكرار:`);
    console.log(`   📊 المجموع: ${stats.totalRequests} طلب`);
    console.log(`   🚫 محظور: ${stats.blockedRequests} (${totalBlockPercentage}%)`);
    console.log(`   🔐 Auth: ${stats.authBlocked}/${stats.authRequests} محظور (${authBlockPercentage}%)`);
    console.log(`   💾 Cache hits: ${stats.cacheHits}`);
    console.log(`   🔄 معلق: ${pendingRequests.size}, حديث: ${recentRequests.size}, Auth cache: ${authResponseCache.size}`);
  }
}, 30000); // كل 30 ثانية

// وظائف للتشخيص والمراقبة
declare global {
  interface Window {
    deduplicationStats: () => void;
    getAuthCacheStats: () => void;
    getRequestLogs: () => void;
    clearDeduplicationCache: () => void;
    getDeduplicationConfig: () => void;
  }
}

// إحصائيات مفصلة
window.deduplicationStats = () => {
  const now = Date.now();
  const uptime = Math.round((now - stats.lastReset) / 1000);
  
  console.group('📊 إحصائيات نظام منع التكرار العالمي');
  console.log(`⏱️ وقت التشغيل: ${uptime} ثانية`);
  console.log(`📥 إجمالي الطلبات: ${stats.totalRequests}`);
  console.log(`🚫 الطلبات المحظورة: ${stats.blockedRequests} (${Math.round((stats.blockedRequests / stats.totalRequests) * 100)}%)`);
  console.log(`🔐 طلبات Auth: ${stats.authRequests}`);
  console.log(`🚫 Auth محظور: ${stats.authBlocked} (${Math.round((stats.authBlocked / stats.authRequests) * 100)}%)`);
  console.log(`💾 Cache hits: ${stats.cacheHits}`);
  console.log(`🔄 طلبات معلقة: ${pendingRequests.size}`);
  console.log(`⚡ طلبات حديثة: ${recentRequests.size}`);
  console.log(`🗄️ Auth cache: ${authResponseCache.size} entries`);
  console.groupEnd();
};

// إحصائيات الـ Auth Cache
window.getAuthCacheStats = () => {
  console.group('🔐 إحصائيات Auth Cache');
  console.log(`📦 عدد العناصر المحفوظة: ${authResponseCache.size}`);
  
  for (const [key, entry] of authResponseCache.entries()) {
    const age = Math.round((Date.now() - entry.timestamp) / 1000);
    const remaining = Math.round((entry.ttl - (Date.now() - entry.timestamp)) / 1000);
    console.log(`🔑 ${key}: عمر ${age}ث، باقي ${remaining}ث`);
  }
  console.groupEnd();
};

// سجل الطلبات الأخيرة
window.getRequestLogs = () => {
  console.group('📋 سجل الطلبات الأخيرة (آخر 20)');
  const recent = requestLogs.slice(-20);
  
  for (const log of recent) {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const status = log.blocked ? '🚫' : '✅';
    const typeIcon = log.type === 'auth' ? '🔐' : log.type === 'data' ? '📊' : '🌐';
    console.log(`${status} ${typeIcon} [${time}] ${log.method} ${log.url} (${log.source})`);
  }
  console.groupEnd();
};

// مسح الـ cache
window.clearDeduplicationCache = () => {
  pendingRequests.clear();
  recentRequests.clear();
  authResponseCache.clear();
  stats = {
    totalRequests: 0,
    blockedRequests: 0,
    authRequests: 0,
    authBlocked: 0,
    cacheHits: 0,
    lastReset: Date.now()
  };
  console.log('🧹 تم مسح جميع بيانات منع التكرار');
};

// عرض الإعدادات
window.getDeduplicationConfig = () => {
  console.group('⚙️ إعدادات منع التكرار');
  for (const [type, config] of Object.entries(DEDUPLICATION_CONFIG)) {
    console.log(`${type}:`, {
      TTL: `${config.ttl}ms`,
      'Cache TTL': `${config.cacheTtl}ms`,
      'Immediate Block': `${config.immediateBlockTtl}ms`
    });
  }
  console.groupEnd();
};

console.log('🚀 تم تفعيل نظام منع التكرار العالمي المتقدم');
console.log('💡 استخدم deduplicationStats() لعرض الإحصائيات');

export { };
