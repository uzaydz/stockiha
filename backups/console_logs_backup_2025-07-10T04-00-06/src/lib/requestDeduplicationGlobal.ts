/**
 * نظام منع التكرار العالمي المتقدم للطلبات
 * يتدخل في جميع طلبات HTTP ويمنع الطلبات المكررة بذكاء
 */

// تم إزالة console-manager - نستخدم console عادي

// أنواع الطلبات المختلفة
type RequestType = 'auth' | 'data' | 'api' | 'other';

// إعدادات النظام العامة
const SYSTEM_CONFIG = {
  enablePeriodicLogs: false, // تعطيل الطباعة الدورية للإحصائيات
  logLevel: 'minimal', // minimal, normal, verbose
  enableConsoleBlocking: true, // منع الطلبات من الظهور في الكونسول
  enableAggressiveDeduplication: false, // تعطيل منع التكرار المكثف مؤقتاً
  enableGlobalInterception: false // تعطيل اعتراض عالمي شامل مؤقتاً
};

// إعدادات منع التكرار لكل نوع - محسنة للمنع القوي جداً
const DEDUPLICATION_CONFIG = {
  auth: {
    ttl: 1800000, // 30 دقيقة للـ Auth requests - منع طويل المدى جداً
    cacheTtl: 3600000, // ساعة واحدة للـ Auth cache
    immediateBlockTtl: 30000, // 30 ثانية للمنع الفوري
  },
  data: {
    ttl: 300000, // 5 دقائق للبيانات العادية
    cacheTtl: 600000, // 10 دقائق للـ cache
    immediateBlockTtl: 15000, // 15 ثانية للمنع الفوري
  },
  api: {
    ttl: 180000, // 3 دقائق للـ API calls
    cacheTtl: 360000, // 6 دقائق للـ cache
    immediateBlockTtl: 10000, // 10 ثوان للمنع الفوري
  },
  other: {
    ttl: 120000, // دقيقتان للطلبات الأخرى
    cacheTtl: 240000, // 4 دقائق للـ cache
    immediateBlockTtl: 8000, // 8 ثوان للمنع الفوري
  }
};

// خرائط التخزين المؤقت
const pendingRequests = new Map<string, Promise<any>>();
const recentRequests = new Map<string, number>();
const authResponseCache = new Map<string, { response: any; timestamp: number; ttl: number }>();
const requestLogs: Array<{ url: string; method: string; timestamp: number; type: RequestType; blocked: boolean; source: string }> = [];
const blockedUrls = new Set<string>(); // قائمة بالـ URLs المحظورة
const globalRequestTracker = new Map<string, number>(); // تتبع عالمي للطلبات

// إحصائيات النظام
let stats = {
  totalRequests: 0,
  blockedRequests: 0,
  authRequests: 0,
  authBlocked: 0,
  cacheHits: 0,
  globalInterceptions: 0,
  lastReset: Date.now()
};

// معرفات خاصة للطلبات المتكررة الشائعة
const COMMON_DUPLICATE_PATTERNS = [
  // 'product_categories?select=*&order=name.asc', // تم تعطيل منع التكرار للفئات
  'organizations?select=id&subdomain=eq',
  'organization_settings?organization_id=eq',
  'organizations?select=id%2Corganization_settings',
  'online_orders?select=*',
  'orders?select=*&organization_id=eq'
];

// إضافة قواعد خاصة لصفحة شراء المنتج
const PRODUCT_PAGE_DEDUPLICATION_RULES = [
  // قاعدة للولايات العامة
  {
    pattern: /yalidine_provinces_global\?select=id.*name.*is_deliverable/,
    category: 'PRODUCT_PAGE:PROVINCES_GLOBAL',
    cacheTTL: 30 * 60 * 1000, // 30 دقيقة
    description: 'قائمة الولايات العامة'
  },
  
  // قاعدة لشركات الشحن
  {
    pattern: /shipping_providers\?select=code.*name&id=eq\.\d+/,
    category: 'PRODUCT_PAGE:SHIPPING_PROVIDER',
    cacheTTL: 30 * 60 * 1000, // 30 دقيقة
    description: 'معلومات شركة الشحن'
  },
  
  // قاعدة لإعدادات المنتج
  {
    pattern: /products\?select=shipping_clone_id.*purchase_page_config&id=eq\.[^&]+/,
    category: 'PRODUCT_PAGE:PRODUCT_CONFIG',
    cacheTTL: 15 * 60 * 1000, // 15 دقيقة
    description: 'إعدادات شحن المنتج'
  },
  
  // قاعدة لمعلومات الشحن للمنتج
  {
    pattern: /products\?select=shipping_provider_id.*shipping_method_type&id=eq\.[^&]+/,
    category: 'PRODUCT_PAGE:PRODUCT_SHIPPING',
    cacheTTL: 15 * 60 * 1000, // 15 دقيقة
    description: 'معلومات الشحن للمنتج'
  },
  
  // قاعدة لنسخ شركات الشحن
  {
    pattern: /shipping_provider_clones\?select=.*&id=eq\.\d+/,
    category: 'PRODUCT_PAGE:SHIPPING_CLONE',
    cacheTTL: 20 * 60 * 1000, // 20 دقيقة
    description: 'نسخة شركة الشحن'
  },
  
  // قاعدة لقائمة نسخ شركات الشحن النشطة
  {
    pattern: /shipping_provider_clones\?select=id&organization_id=eq\.[^&]+&is_active=eq\.true/,
    category: 'PRODUCT_PAGE:ACTIVE_SHIPPING_CLONES',
    cacheTTL: 20 * 60 * 1000, // 20 دقيقة
    description: 'قائمة نسخ الشحن النشطة'
  },
  
  // قاعدة للخدمات
  {
    pattern: /services\?select=\*&organization_id=eq\.[^&]+/,
    category: 'PRODUCT_PAGE:SERVICES',
    cacheTTL: 20 * 60 * 1000, // 20 دقيقة  
    description: 'قائمة الخدمات'
  },
  
  // قاعدة لإعدادات شركة الشحن
  {
    pattern: /shipping_provider_settings\?select=provider_id&organization_id=eq\.[^&]+&is_enabled=eq\.true/,
    category: 'PRODUCT_PAGE:SHIPPING_SETTINGS',
    cacheTTL: 25 * 60 * 1000, // 25 دقيقة
    description: 'إعدادات شركة الشحن'
  },
  
  // قاعدة للمستخدمين
  {
    pattern: /users\?select=\*&organization_id=eq\.[^&]+/,
    category: 'PRODUCT_PAGE:USERS',
    cacheTTL: 15 * 60 * 1000, // 15 دقيقة
    description: 'قائمة المستخدمين'
  },
  
  // قاعدة للطلبات
  {
    pattern: /orders\?select=\*.*order_items.*&organization_id=eq\.[^&]+&order=created_at\.desc/,
    category: 'PRODUCT_PAGE:ORDERS',
    cacheTTL: 5 * 60 * 1000, // 5 دقائق
    description: 'قائمة الطلبات'
  },
  
  // قاعدة لقائمة المنتجات
  {
    pattern: /products\?select=\*.*product_colors.*product_sizes.*&organization_id=eq\.[^&]+&is_active=eq\.true/,
    category: 'PRODUCT_PAGE:PRODUCTS_LIST',
    cacheTTL: 10 * 60 * 1000, // 10 دقائق
    description: 'قائمة المنتجات النشطة'
  },

  // أنماط الاستعلامات الشائعة التي يمكن إلغاء تكرارها
  {
    name: 'organization-by-id',
    pattern: /organizations\?select=.*&id=eq\.[^&]+/,
    ttl: 10 * 60 * 1000, // 10 دقائق
    description: 'استعلامات المؤسسة بواسطة المعرف'
  },
  {
    name: 'shipping-provider-settings',
    pattern: /shipping_provider_settings\?select=.*&organization_id=eq\.[^&]+&is_enabled=eq\.true/,
    ttl: 15 * 60 * 1000, // 15 دقيقة
    description: 'إعدادات مزودي الشحن النشطة'
  },
];

// تحديد نوع الطلب بدقة أكبر
function getRequestType(url: string): RequestType {
  if (url.includes('/auth/') || url.includes('/users?') || url.includes('user')) {
    return 'auth';
  }
  if (url.includes('/rest/v1/') || url.includes('/rpc/') || url.includes('supabase.co')) {
    return 'data';
  }
  // استثناء خاص لطلبات الشحن وياليدين - تصنيفها كـ "other" بدلاً من "api"
  if (url.includes('/yalidine-api/') || 
      url.includes('/api/yalidine') || 
      url.includes('yalidine') || 
      url.includes('shipping-proxy') || 
      url.includes('/functions/v1/shipping') ||
      url.includes('supabase.co/functions/v1/shipping')) {
    return 'other';
  }
  if (url.includes('/api/')) {
    return 'api';
  }
  return 'other';
}

// تحسين إنشاء مفتاح الطلب مع معالجة خاصة للطلبات الشائعة
function createRequestKey(url: string, options?: RequestInit): string {
  try {
    const mainUrlObj = new URL(url);
    let pathAndQuery = `${mainUrlObj.pathname}${mainUrlObj.search}`;
    
    // إزالة المعاملات الديناميكية المختلفة
    pathAndQuery = pathAndQuery
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?Z\b/g, '[TIMESTAMP]')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]')
      .replace(/\b\d{13,}\b/g, '[TIMESTAMP_MS]')
      .replace(/\b_\d+$/g, '')
      .replace(/[&?]_=\d+/g, '');

    // تطبيق قواعد صفحة شراء المنتج
    for (const rule of PRODUCT_PAGE_DEDUPLICATION_RULES) {
      if (rule.pattern.test(pathAndQuery)) {
        return `${rule.category}:${btoa(pathAndQuery).substring(0, 20)}`;
      }
    }

    // معالجة خاصة للـ Auth requests
    if (url.includes('/auth/') || url.includes('/users?') || url.includes('user')) {
      if (url.includes('/auth/v1/user')) {
        return 'AUTH:USER:GLOBAL';
      }
      if (url.includes('/users?') && url.includes('id=eq.')) {
        const match = url.match(/id=eq\.([^&]+)/);
        const userId = match ? match[1] : 'unknown';
        return `AUTH:USER_PROFILE:${userId}`;
      }
    }
    
    // معالجة خاصة للبيانات (الفئات مستثناة من منع التكرار)
    if (url.includes('product_categories')) {
      // إنشاء مفتاح فريد لكل طلب فئات لضمان عدم الحجب
      const timestamp = Date.now();
      const orgMatch = url.match(/organization_id=eq\.([^&]+)/);
      const orgId = orgMatch ? orgMatch[1] : 'global';
      return `DATA:CATEGORIES:${orgId}:${timestamp}`;
    }
    if (url.includes('organization_settings')) {
      const orgMatch = url.match(/organization_id=eq\.([^&]+)/);
      const orgId = orgMatch ? orgMatch[1] : 'global';
      return `DATA:ORG_SETTINGS:${orgId}`;
    }
    if (url.includes('organizations?')) {
      if (url.includes('subdomain=eq')) {
        const subdomainMatch = url.match(/subdomain=eq\.([^&]+)/);
        const subdomain = subdomainMatch ? subdomainMatch[1] : 'unknown';
        return `DATA:ORG_LOOKUP:${subdomain}`;
      }
      return `DATA:ORGANIZATIONS:LOOKUP`;
    }
    if (url.includes('online_orders')) {
      const orgMatch = url.match(/organization_id=eq\.([^&]+)/);
      const orgId = orgMatch ? orgMatch[1] : 'global';
      return `DATA:ONLINE_ORDERS:${orgId}`;
    }
    if (url.includes('orders?')) {
      const orgMatch = url.match(/organization_id=eq\.([^&]+)/);
      const orgId = orgMatch ? orgMatch[1] : 'global';
      return `DATA:ORDERS:${orgId}`;
    }
    
    // مفاتيح للبيانات العادية مع تبسيط أكثر
    const parsedUrlForParams = new URL(url, 'https://example.com');
    const pathname = parsedUrlForParams.pathname;
    const params = parsedUrlForParams.searchParams.toString();
    
    let key = `${options?.method || 'GET'}:${pathname}`;
    if (params) {
      // تقليل طول الـ params للمفاتيح الأساسية
      const shortParams = params.length > 30 ? params.substring(0, 30) + '...' : params;
      key += `:${shortParams}`;
    }
    
    return key;
  } catch (error) {
    return `FALLBACK:${btoa(url).substring(0, 30)}`;
  }
}

// منع عرض الطلبات في الكونسول
function hideRequestFromConsole(url: string): void {
  if (!SYSTEM_CONFIG.enableConsoleBlocking) return;
  
  // إضافة الـ URL للقائمة المحظورة
  blockedUrls.add(url);
  
  // إضافة للمتغير العالمي للطلبات المحظورة
  if (typeof window !== 'undefined') {
    if (!(window as any).__BAZAAR_REQUEST_BLOCKED_URLS__) {
      (window as any).__BAZAAR_REQUEST_BLOCKED_URLS__ = [];
    }
    (window as any).__BAZAAR_REQUEST_BLOCKED_URLS__.push(url);
  }
}

// تنظيف الخرائط من البيانات المنتهية الصلاحية
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  // تنظيف الطلبات الحديثة
  const keysToDeleteRecent: string[] = [];
  recentRequests.forEach((timestamp, key) => {
    if (now - timestamp > 900000) { // 15 دقيقة
      keysToDeleteRecent.push(key);
    }
  });
  keysToDeleteRecent.forEach(key => recentRequests.delete(key));
  
  // تنظيف cache الـ Auth
  const keysToDeleteAuth: string[] = [];
  authResponseCache.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      keysToDeleteAuth.push(key);
    }
  });
  keysToDeleteAuth.forEach(key => authResponseCache.delete(key));
  
  // تنظيف التتبع العالمي
  const keysToDeleteGlobal: string[] = [];
  globalRequestTracker.forEach((timestamp, key) => {
    if (now - timestamp > 600000) { // 10 دقائق
      keysToDeleteGlobal.push(key);
    }
  });
  keysToDeleteGlobal.forEach(key => globalRequestTracker.delete(key));
  
  // الاحتفاظ بآخر 30 log entry فقط
  if (requestLogs.length > 30) {
    requestLogs.splice(0, requestLogs.length - 30);
  }
  
  // تنظيف قائمة الـ URLs المحظورة
  if (blockedUrls.size > 50) {
    const urlsArray = Array.from(blockedUrls);
    blockedUrls.clear();
    // الاحتفاظ بآخر 25 فقط
    urlsArray.slice(-25).forEach(url => blockedUrls.add(url));
  }
}

// إضافة طلب للسجل
function logRequest(url: string, method: string, type: RequestType, blocked: boolean, source: string): void {
  // تسجيل مبسط للغاية في البيئة الإنتاجية
  if (SYSTEM_CONFIG.logLevel === 'minimal') {
    // فقط عدد الطلبات
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
    return;
  }
  
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

// التحقق من إمكانية تنفيذ الطلب - محسن للمنع المكثف
function shouldBlockRequest(key: string, type: RequestType, url: string): boolean {
  const now = Date.now();
  const config = DEDUPLICATION_CONFIG[type];
  
  // استثناء خاص للفئات - لا نحجب طلبات الفئات أبداً
  if (url.includes('product_categories')) {
    return false;
  }
  
  // استثناء خاص لطلبات الشحن وياليدين - لا نحجب طلبات الشحن أبداً
  if (url.includes('/yalidine-api/') || 
      url.includes('/api/yalidine') || 
      url.includes('yalidine') || 
      url.includes('shipping-proxy') || 
      url.includes('/functions/v1/shipping') ||
      url.includes('supabase.co/functions/v1/shipping')) {
    return false;
  }
  
  // تحقق من قواعد صفحة شراء المنتج أولاً
  for (const rule of PRODUCT_PAGE_DEDUPLICATION_RULES) {
    if (key.startsWith(rule.category)) {
      const lastRequest = recentRequests.get(key);
      if (lastRequest && (now - lastRequest) < rule.cacheTTL) {
        hideRequestFromConsole(url);
        stats.globalInterceptions++;
        if (SYSTEM_CONFIG.logLevel === 'verbose') {
        }
        return true;
      }
      break; // وجدنا القاعدة المناسبة، لا نحتاج للمتابعة
    }
  }
  
  // تحقق خاص للطلبات المتكررة الشائعة - منع فوري وقوي
  for (const pattern of COMMON_DUPLICATE_PATTERNS) {
    if (url.includes(pattern)) {
      const lastRequest = recentRequests.get(key);
      if (lastRequest && (now - lastRequest) < config.immediateBlockTtl * 3) { // ثلاثة أضعاف الوقت للطلبات الشائعة
        hideRequestFromConsole(url);
        stats.globalInterceptions++;
        if (SYSTEM_CONFIG.logLevel === 'verbose' || process.env.NODE_ENV === 'development') {
        }
        return true;
      }
      
      // فحص إضافي للطلبات الشائعة من التتبع العالمي
      const globalLast = globalRequestTracker.get(key);
      if (globalLast && (now - globalLast) < config.immediateBlockTtl * 2) {
        hideRequestFromConsole(url);
        stats.globalInterceptions++;
        return true;
      }
    }
  }
  
  // التحقق من الطلبات المعلقة - منع فوري مع أولوية عالية
  if (pendingRequests.has(key)) {
    hideRequestFromConsole(url);
    stats.globalInterceptions++;
    if (process.env.NODE_ENV === 'development') {
    }
    return true;
  }
  
  // التحقق من التتبع العالمي
  const globalLastRequest = globalRequestTracker.get(key);
  if (globalLastRequest && (now - globalLastRequest) < config.immediateBlockTtl) {
    hideRequestFromConsole(url);
    stats.globalInterceptions++;
    return true;
  }
  
  // التحقق من الطلبات الحديثة للمنع الفوري
  const lastRequest = recentRequests.get(key);
  if (lastRequest && (now - lastRequest) < config.immediateBlockTtl) {
    hideRequestFromConsole(url);
    return true;
  }
  
  // منع إضافي للـ Auth requests - فترة أطول بكثير
  if (type === 'auth') {
    if (lastRequest && (now - lastRequest) < config.ttl) {
      hideRequestFromConsole(url);
      return true;
    }
  }
  
  // منع إضافي للبيانات - فحص أكثر دقة
  if (type === 'data') {
    if (lastRequest && (now - lastRequest) < config.ttl) {
      hideRequestFromConsole(url);
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
      'X-Deduplication': 'true',
      'X-Request-Blocked': 'true'
    }
  });
  
  // إضافة خصائص إضافية للـ response
  Object.defineProperty(response, 'url', { value: url, writable: false });
  
  return response;
}

// تدخل قوي في window.fetch
const originalFetch = window.fetch;

const enhancedFetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || 'GET';
  const body = init?.body;
  
  // استثناء فوري لطلبات الشحن - تجاوز جميع عمليات التحقق
  if (url.includes('shipping-proxy') || 
      url.includes('/functions/v1/shipping') ||
      url.includes('yalidine') ||
      url.includes('/api/yalidine')) {
    return originalFetch.call(this, input, init);
  }
  
  const requestType = getRequestType(url);
  const key = createRequestKey(url, init);
  const config = DEDUPLICATION_CONFIG[requestType];
  
  // تسجيل في التتبع العالمي
  globalRequestTracker.set(key, Date.now());
  
  // طباعة معلومات التشخيص في بيئة التطوير
  if (SYSTEM_CONFIG.logLevel === 'verbose' || process.env.NODE_ENV === 'development') {
  }
  
  // التحقق من الـ cache للـ Auth requests
  if (requestType === 'auth' && method === 'GET') {
    const cached = authResponseCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      stats.cacheHits++;
      logRequest(url, method, requestType, true, 'fetch-cache');
      if (SYSTEM_CONFIG.logLevel === 'verbose') {
      }
      return createCachedResponse(cached.response, url);
    }
  }
  
  // التحقق من إمكانية منع الطلب
  if (shouldBlockRequest(key, requestType, url)) {
    logRequest(url, method, requestType, true, 'fetch-block');
    
    if (SYSTEM_CONFIG.logLevel === 'verbose' && requestType === 'auth') {
    }
    
    // طباعة رسالة واضحة في بيئة التطوير
    if (process.env.NODE_ENV === 'development') {
    }
    
    // انتظار الطلب المعلق إن وجد
    if (pendingRequests.has(key)) {
      try {
        const result = await pendingRequests.get(key);
        return createCachedResponse(result, url);
      } catch (error) {
        // في حالة فشل الطلب المعلق، نسمح بطلب جديد
      }
    }
    
    // للـ Auth requests، محاولة إرجاع من الـ cache أولاً
    if (requestType === 'auth') {
      const cached = authResponseCache.get(key);
      if (cached) {
        if (SYSTEM_CONFIG.logLevel === 'verbose') {
        }
        return createCachedResponse(cached.response, url);
      }
    }
    
    // إرجاع response فارغ للطلبات المحظورة مع تأثير بصري
    if (process.env.NODE_ENV === 'development') {
    }
    
    return new Response('{}', { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json', 
        'X-Blocked': 'true',
        'X-Deduplication': 'blocked',
        'X-Cache': 'BLOCKED'
      } 
    });
  }
  
  // تسجيل وقت الطلب
  recentRequests.set(key, Date.now());
  logRequest(url, method, requestType, false, 'fetch');
  
  // طباعة رسالة في بيئة التطوير للطلبات المسموحة
  if (process.env.NODE_ENV === 'development') {
  }
  
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
        if (SYSTEM_CONFIG.logLevel === 'verbose') {
        }
      } catch (error) {
        // معالجة صامتة للأخطاء
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

// استبدال window.fetch بالنسخة المحسنة مع تأكيد قوي
window.fetch = enhancedFetch;

// استبدال في globalThis أيضاً للتأكد
if (typeof globalThis !== 'undefined' && globalThis.fetch) {
  globalThis.fetch = enhancedFetch;
}

// اعتراض إضافي لمكتبة Supabase
if (typeof window !== 'undefined') {
  // تأخير للتأكد أن Supabase محمل
  setTimeout(() => {
    // البحث عن نسخ fetch أخرى في الكائنات العالمية
    const globalObjects = [window, globalThis];
    if (typeof global !== 'undefined') globalObjects.push(global);
    
    globalObjects.forEach(obj => {
      if (obj && obj.fetch && obj.fetch !== enhancedFetch) {
        obj.fetch = enhancedFetch;
      }
    });
    
    // اعتراض خاص لمكتبة Supabase إذا كانت متاحة
    if ((window as any).supabase || (globalThis as any).supabase) {
    }
  }, 100);
}

// إضافة رسائل التأكيد
if (process.env.NODE_ENV === 'development') {
}

// تدخل في XMLHttpRequest (اختياري)
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
    // استثناء فوري لطلبات الشحن في XMLHttpRequest
    if (url.includes('shipping-proxy') || 
        url.includes('/functions/v1/shipping') ||
        url.includes('yalidine') ||
        url.includes('/api/yalidine')) {
      return originalXHRSend.call(this, body);
    }
    
    const requestType = getRequestType(url);
    const key = createRequestKey(url, { method });
    
    // تسجيل في التتبع العالمي
    globalRequestTracker.set(key, Date.now());
    
    // التحقق من منع التكرار
    if (shouldBlockRequest(key, requestType, url)) {
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

// تنظيف دوري للبيانات المنتهية الصلاحية
setInterval(cleanupExpiredEntries, 45000); // كل 45 ثانية

// مراقب الأداء لرصد طلبات Supabase - محسن للعرض الواضح
const performanceObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries() as PerformanceResourceTiming[];
  entries.forEach((entry) => {
    if (entry.name.includes('supabase.co')) {
      const url = entry.name;
      const type = getRequestType(url);
      const key = createRequestKey(url);
      
      // إحصائيات مفصلة في بيئة التطوير
      if (process.env.NODE_ENV === 'development') {
        
        // تحقق من الطلبات المكررة
        const now = Date.now();
        const lastRequest = recentRequests.get(key);
        if (lastRequest && (now - lastRequest) < 5000) { // 5 ثوان
        }
      }
      
      // تسجيل الطلب في النظام
      logRequest(url, 'GET', type, false, 'performance-observer');
      recentRequests.set(key, Date.now());
    }
  });
});

// بدء مراقبة الطلبات
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    performanceObserver.observe({ entryTypes: ['resource'] });
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
  }
}

// متغير لتتبع آخر إحصائيات مطبوعة
let lastPrintedStats = {
  totalRequests: 0,
  blockedRequests: 0,
  authRequests: 0,
  authBlocked: 0,
  cacheHits: 0
};

// إحصائيات دورية محسنة - تطبع فقط عند التفعيل والتغيير
if (SYSTEM_CONFIG.enablePeriodicLogs) {
  setInterval(() => {
    const authBlockPercentage = stats.authRequests > 0 ? Math.round((stats.authBlocked / stats.authRequests) * 100) : 0;
    const totalBlockPercentage = stats.totalRequests > 0 ? Math.round((stats.blockedRequests / stats.totalRequests) * 100) : 0;
    
    // التحقق من وجود تغيير في الإحصائيات
    const hasChange = stats.totalRequests !== lastPrintedStats.totalRequests ||
                     stats.blockedRequests !== lastPrintedStats.blockedRequests ||
                     stats.authRequests !== lastPrintedStats.authRequests ||
                     stats.authBlocked !== lastPrintedStats.authBlocked ||
                     stats.cacheHits !== lastPrintedStats.cacheHits;
    
    if (stats.totalRequests > 0 && hasChange) {
      
      // تحديث آخر إحصائيات مطبوعة
      lastPrintedStats = {
        totalRequests: stats.totalRequests,
        blockedRequests: stats.blockedRequests,
        authRequests: stats.authRequests,
        authBlocked: stats.authBlocked,
        cacheHits: stats.cacheHits
      };
    }
  }, 30000); // كل 30 ثانية
}

// وظائف للتشخيص والمراقبة
declare global {
  interface Window {
    deduplicationStats: () => void;
    getAuthCacheStats: () => void;
    getRequestLogs: () => void;
    clearDeduplicationCache: () => void;
    getDeduplicationConfig: () => void;
    togglePeriodicLogs: (enabled?: boolean) => void;
    setLogLevel: (level: 'minimal' | 'normal' | 'verbose') => void;
  }
}

// إحصائيات مفصلة
window.deduplicationStats = () => {
  const now = Date.now();
  const uptime = Math.round((now - stats.lastReset) / 1000);
  
};

// إحصائيات الـ Auth Cache
window.getAuthCacheStats = () => {
  
  authResponseCache.forEach((entry, key) => {
    const age = Math.round((Date.now() - entry.timestamp) / 1000);
    const remaining = Math.round((entry.ttl - (Date.now() - entry.timestamp)) / 1000);
  });
};

// سجل الطلبات الأخيرة
window.getRequestLogs = () => {
  const recent = requestLogs.slice(-20);
  
  for (const log of recent) {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const status = log.blocked ? '🚫' : '✅';
    const typeIcon = log.type === 'auth' ? '🔐' : log.type === 'data' ? '📊' : '🌐';
  }
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
    globalInterceptions: 0,
    lastReset: Date.now()
  };
};

// عرض الإعدادات
window.getDeduplicationConfig = () => {
  for (const [type, config] of Object.entries(DEDUPLICATION_CONFIG)) {
  }
};

// تمكين/تعطيل الطباعة الدورية
window.togglePeriodicLogs = (enabled?: boolean) => {
  SYSTEM_CONFIG.enablePeriodicLogs = enabled !== undefined ? enabled : !SYSTEM_CONFIG.enablePeriodicLogs;
};

// تغيير مستوى السجل
window.setLogLevel = (level: 'minimal' | 'normal' | 'verbose') => {
  SYSTEM_CONFIG.logLevel = level;
};

if (SYSTEM_CONFIG.logLevel !== 'minimal') {
}

// دالة لعرض إحصائيات مفصلة ومراقبة شاملة
(window as any).deduplicationStats = () => {

  if (pendingRequests.size > 0) {
    pendingRequests.forEach((_, key) => {
    });
  }
  
  if (recentRequests.size > 0) {
    const now = Date.now();
    const recentArray = Array.from(recentRequests.entries())
      .map(([key, timestamp]) => ({
        key,
        age: Math.round((now - timestamp) / 1000),
        timestamp
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // أظهر آخر 10 فقط
    
    recentArray.forEach(({ key, age }) => {
    });
  }

  authResponseCache.forEach((entry, key) => {
    const age = Math.round((Date.now() - entry.timestamp) / 1000);
    const remaining = Math.round((entry.ttl - (Date.now() - entry.timestamp)) / 1000);
  });
  
  // تحليل الطلبات الشائعة المكررة
  const requestCounts = new Map<string, number>();
  requestLogs.forEach(log => {
    const count = requestCounts.get(log.url) || 0;
    requestCounts.set(log.url, count + 1);
  });
  
  const duplicates = Array.from(requestCounts.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (duplicates.length > 0) {
    duplicates.forEach(([url, count]) => {
    });
  } else {
  }

  return {
    stats,
    pendingCount: pendingRequests.size,
    recentCount: recentRequests.size,
    authCacheCount: authResponseCache.size,
    globalTrackerCount: globalRequestTracker.size,
    duplicatePatterns: duplicates
  };
};

// دالة مراقبة مباشرة للطلبات
(window as any).watchRequests = (duration = 10000) => {
  
  const startStats = { ...stats };
  const startTime = Date.now();
  
  setTimeout(() => {
    const endTime = Date.now();
    const newRequests = stats.totalRequests - startStats.totalRequests;
    const newBlocked = stats.blockedRequests - startStats.blockedRequests;
    
  }, duration);
};

// تفعيل الدوال للاستخدام العالمي
if (process.env.NODE_ENV === 'development') {
}

export { };
