import { getAppInitData } from './appInitializer';

// نظام منع الطلبات المتكررة
let isRequestBlockingEnabled = false;

interface BlockedRequestInfo {
  url: string;
  timestamp: number;
  method: string;
  source: 'fetch' | 'supabase';
}

let blockedRequests: BlockedRequestInfo[] = [];
let originalFetch: typeof fetch;
let originalSupabaseFrom: any = null;
let originalSupabaseRpc: any = null;

/**
 * اعتراض طلبات fetch العادية
 */
function interceptFetchRequests() {
  if (typeof window === 'undefined' || originalFetch) return;
  
  originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    
    if (shouldBlockRequest(url)) {
      blockedRequests.push({
        url,
        timestamp: Date.now(),
        method,
        source: 'fetch'
      });
      
      console.log(`🚫 [RequestBlocker] منع طلب fetch #${blockedRequests.length}: ${method} ${url}`);
      
      // إرجاع استجابة مزيفة
      const fakeData = getFakeDataFromUrl(url);
      return new Response(JSON.stringify(fakeData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // تنفيذ الطلب العادي
    return originalFetch.call(this, input, init);
  };
}

/**
 * اعتراض طلبات Supabase client
 */
function interceptSupabaseRequests() {
  if (typeof window === 'undefined') return;

  try {
    // تأجيل البحث عن Supabase لضمان تحميله
    setTimeout(() => {
      // البحث في modules المحملة
      const modules = (window as any).__modules__ || {};
      const webpackModules = (window as any).__webpack_require__ ? 
        Object.values((window as any).__webpack_require__.cache || {}) : [];
      
      // البحث عن Supabase client في الوحدات
      let supabaseClient = null;
      
      // البحث في النوافذ العامة
      const globalLocations = [
        (window as any).supabase,
        (window as any).supabaseClient,
        (window as any).__SUPABASE_CLIENT__
      ];
      
      for (const client of globalLocations) {
        if (client && typeof client.from === 'function') {
          supabaseClient = client;
          break;
        }
      }
      
      // البحث في الوحدات المحملة
      if (!supabaseClient) {
        for (const moduleInfo of webpackModules) {
          if (moduleInfo && typeof moduleInfo === 'object' && 'exports' in moduleInfo) {
            const exports = (moduleInfo as any).exports;
            if (exports && typeof exports.from === 'function') {
              supabaseClient = exports;
              break;
            }
            // البحث العميق في exports
            if (exports && typeof exports === 'object') {
              for (const key in exports) {
                const value = exports[key];
                if (value && typeof value.from === 'function') {
                  supabaseClient = value;
                  break;
                }
              }
              if (supabaseClient) break;
            }
          }
        }
      }
      
      if (supabaseClient && !originalSupabaseFrom) {
        console.log('🚫 [RequestBlocker] تم اكتشاف Supabase client - بدء الاعتراض');
        
        // حفظ الوظائف الأصلية
        originalSupabaseFrom = supabaseClient.from.bind(supabaseClient);
        originalSupabaseRpc = supabaseClient.rpc ? supabaseClient.rpc.bind(supabaseClient) : null;
        
        // اعتراض from() للجداول العادية
        supabaseClient.from = function(table: string) {
          const query = originalSupabaseFrom(table);
          return interceptQuery(query, table, 'table');
        };
        
        // اعتراض rpc() للدوال
        if (originalSupabaseRpc) {
          supabaseClient.rpc = function(fn: string, params?: any) {
            const query = originalSupabaseRpc(fn, params);
            return interceptQuery(query, fn, 'rpc');
          };
        }
        
        console.log('🚫 [RequestBlocker] تم تفعيل اعتراض Supabase بنجاح');
      }
    }, 500); // انتظار نصف ثانية لضمان تحميل Supabase
    
  } catch (error) {
    console.warn('🚫 [RequestBlocker] خطأ في اعتراض Supabase:', error);
  }
}

/**
 * اعتراض استعلامات Supabase
 */
function interceptQuery(query: any, tableName: string, type: 'table' | 'rpc') {
  if (!query) return query;
  
  // حفظ الوظائف الأصلية
  const originalSelect = query.select?.bind(query);
  const originalEq = query.eq?.bind(query);
  const originalLimit = query.limit?.bind(query);
  const originalOrder = query.order?.bind(query);
  const originalThen = query.then?.bind(query);
  
  // اعتراض سلسلة الاستعلام
  ['select', 'eq', 'limit', 'order', 'neq', 'in', 'gte', 'lte'].forEach(method => {
    if (query[method]) {
      const original = query[method].bind(query);
      query[method] = function(...args: any[]) {
        const result = original(...args);
        return interceptQuery(result, tableName, type);
      };
    }
  });
  
  // اعتراض التنفيذ النهائي
  if (originalThen) {
    query.then = function(resolve: any, reject: any) {
      const url = `${type}/${tableName}`;
      
      if (shouldBlockRequest(url)) {
        blockedRequests.push({
          url,
          timestamp: Date.now(),
          method: 'GET',
          source: 'supabase'
        });
        
        console.log(`🚫 [RequestBlocker] منع طلب Supabase #${blockedRequests.length}: ${url}`);
        
        // إرجاع بيانات مزيفة من AppInitializer
        const fakeData = getFakeDataFromAppInitializer(tableName);
        if (resolve) {
          resolve({ data: fakeData, error: null });
        }
        return Promise.resolve({ data: fakeData, error: null });
      }
      
      // تنفيذ الطلب العادي
      return originalThen(resolve, reject);
    };
  }
  
  return query;
}

/**
 * الحصول على بيانات مزيفة من AppInitializer
 */
function getFakeDataFromAppInitializer(tableName: string): any {
  const appData = getAppInitData();
  if (!appData) return [];
  
  switch (tableName) {
    case 'organizations':
      return [appData.organization];
    
    case 'organization_settings':
      return appData.organization.settings ? [appData.organization.settings] : [];
    
    case 'product_categories':
      return appData.categories || [];
    
    case 'products':
      return appData.products || [];
    
    case 'store_settings':
      return appData.storeSettings || [];
    
    case 'customer_testimonials':
      return appData.testimonials || [];
    
    case 'get_store_init_data':
      return appData;
    
    default:
      console.log(`🚫 [RequestBlocker] جدول غير معروف: ${tableName} - إرجاع مصفوفة فارغة`);
      return [];
  }
}

/**
 * الحصول على بيانات مزيفة من URL
 */
function getFakeDataFromUrl(url: string): any {
  // استخراج اسم الجدول من URL
  const match = url.match(/\/rest\/v1\/(\w+)/);
  if (match) {
    return getFakeDataFromAppInitializer(match[1]);
  }
  
  // RPC functions
  if (url.includes('/rpc/')) {
    const rpcMatch = url.match(/\/rpc\/(\w+)/);
    if (rpcMatch) {
      return getFakeDataFromAppInitializer(rpcMatch[1]);
    }
  }
  
  return {};
}

/**
 * تحديد ما إذا كان يجب حجب الطلب
 */
function shouldBlockRequest(url: string): boolean {
  if (!isRequestBlockingEnabled) return false;
  
  // التحقق من وجود AppInitializer data
  const appData = getAppInitData();
  if (!appData) return false;
  
  // قائمة أنماط URL المحجوبة
  const blockedPatterns = [
    '/rest/v1/organizations',
    '/rest/v1/organization_settings',
    '/rest/v1/product_categories',
    '/rest/v1/products',
    '/rest/v1/store_settings',
    '/rest/v1/customer_testimonials',
    '/rest/v1/rpc/get_store_init_data',
    // أنماط إضافية
    'select=*&subdomain=eq',
    'organization_id=eq.560e2c06-d13c-4853-abcf-d41f017469cf',
    'is_active=eq.true',
    'is_featured=eq.true'
  ];
  
  // فحص الأنماط
  for (const pattern of blockedPatterns) {
    if (url.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * تهيئة نظام منع الطلبات
 */
export function initializeRequestBlocker() {
  if (typeof window === 'undefined') return;
  
  console.log('🚫 [RequestBlocker] تم تفعيل نظام منع الطلبات المتكررة');
  isRequestBlockingEnabled = true;
  blockedRequests = [];
  
  // اعتراض fetch العادي
  interceptFetchRequests();
  
  // اعتراض Supabase client
  interceptSupabaseRequests();
  
  // إضافة دوال مساعدة للـ console
  if (typeof window !== 'undefined') {
    (window as any).getBlockedRequests = () => {
      console.log(`🚫 [RequestBlocker] تم حجب ${blockedRequests.length} طلب:`);
      blockedRequests.forEach((req, i) => {
        console.log(`${i + 1}. [${req.source}] ${req.method} ${req.url}`);
      });
      return blockedRequests;
    };
    
    (window as any).clearBlockedRequests = () => {
      const count = blockedRequests.length;
      blockedRequests = [];
      console.log(`🚫 [RequestBlocker] تم مسح ${count} طلب محجوب`);
    };
  }
}

/**
 * تعطيل نظام منع الطلبات
 */
export function disableRequestBlocker() {
  isRequestBlockingEnabled = false;
  
  // استعادة fetch الأصلي
  if (originalFetch && typeof window !== 'undefined') {
    window.fetch = originalFetch;
  }
  
  console.log('🚫 [RequestBlocker] تم تعطيل نظام منع الطلبات');
}

/**
 * الحصول على إحصائيات الطلبات المحجوبة
 */
export function getBlockedRequestsStats() {
  return {
    total: blockedRequests.length,
    bySource: {
      fetch: blockedRequests.filter(r => r.source === 'fetch').length,
      supabase: blockedRequests.filter(r => r.source === 'supabase').length
    },
    requests: blockedRequests
  };
} 