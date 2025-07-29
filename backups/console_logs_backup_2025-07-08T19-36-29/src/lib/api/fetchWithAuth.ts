import { supabase } from '@/lib/supabase';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * وظيفة مساعدة للإتصال بالخادم مع إرفاق توكن المصادقة
 */
export async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
  // تعيين المهلة الافتراضية (15 ثانية)
  const timeout = options.timeout || 15000;

  try {
    // التحقق من حالة الاتصال بالإنترنت
    if (!navigator.onLine) {
      // السماح لبعض الطلبات المحلية بالمرور (مثل طلبات IndexedDB)
      if (url.startsWith('/api/local') || url.includes('localhost')) {
        return await fetch(url, options);
      }
      throw new Error('NETWORK_OFFLINE');
    }

    // الحصول على جلسة المستخدم الحالية
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('يرجى تسجيل الدخول للمتابعة');
    }

    // إضافة رمز الوصول إلى رأس الطلب إذا كان المستخدم مسجل الدخول
    const headers = new Headers(options.headers || {});
    
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    // إضافة رؤوس محسنة لتجنب أخطاء CORS و 406
    headers.set('Accept', 'application/json, text/plain, */*');
    headers.set('Accept-Language', 'ar,en;q=0.9');
    headers.set('Accept-Encoding', 'gzip, deflate, br');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Pragma', 'no-cache');
    
    // إضافة رؤوس أخرى ضرورية لطلبات Supabase
    if (url.includes('supabase.co')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      // إضافة ApiKey لطلبات Supabase
      if (supabaseAnonKey && !headers.has('ApiKey')) {
        headers.set('ApiKey', supabaseAnonKey);
      }
      
      // إضافة رؤوس Supabase المطلوبة
      headers.set('X-Client-Info', 'bazaar-console-connect/1.0.0');
      headers.set('Prefer', 'return=representation');
      
      // إضافة Origin و Referer لتجنب مشاكل CORS
      if (!headers.has('Origin')) {
        headers.set('Origin', window.location.origin);
      }
      
      if (!headers.has('Referer')) {
        headers.set('Referer', window.location.href);
      }
    }
    
    // دمج الإعدادات
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // إضافة credentials للطلبات المتقاطعة
      mode: 'cors' // تأكيد وضع CORS
    };

    // إنشاء وعد مع مهلة
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeout);
    });

    // إنشاء وعد للطلب الفعلي
    const fetchPromise = fetch(url, fetchOptions);

    // استخدام Promise.race للتنافس بين الطلب والمهلة
    let response = await Promise.race([fetchPromise, timeoutPromise]);
    
    // التعامل مع خطأ 401 (غير مصرح)
    if (response.status === 401) {
      // يمكن تنفيذ عملية تسجيل الخروج هنا
      localStorage.removeItem('token');
      
      // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
      window.location.href = '/login';
    }
    
    // التحقق من الاستجابة
    if (!response.ok) {
      // معالجة خاصة لأخطاء 406
      if (response.status === 406) {
        
        // محاولة إعادة الطلب مع رؤوس مبسطة
        const retryHeaders = new Headers();
        retryHeaders.set('Authorization', `Bearer ${session.access_token}`);
        retryHeaders.set('Accept', '*/*');
        retryHeaders.set('Content-Type', 'application/json');
        
        if (url.includes('supabase.co')) {
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
          if (supabaseAnonKey) {
            retryHeaders.set('ApiKey', supabaseAnonKey);
          }
        }
        
        try {
          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
            mode: 'cors'
          });
          
          if (retryResponse.ok) {
            return retryResponse;
          }
          
          // إذا فشلت المحاولة الثانية، جرب بدون رؤوس إضافية
          const simpleRetryResponse = await fetch(url, {
            method: options.method || 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Accept': 'application/json'
            }
          });
          
          if (simpleRetryResponse.ok) {
            return simpleRetryResponse;
          }
          
        } catch (retryError) {
        }
        
        // إذا فشلت جميع المحاولات، نرجع خطأ 406
        throw new Error(`خطأ 406 - المحتوى غير مقبول. تأكد من تنسيق البيانات والرؤوس المطلوبة.`);
      }
      
      // رمي خطأ للحالات الأخرى
      throw new Error(`رمز الخطأ: ${response.status} - ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    // معالجة الأخطاء المختلفة
    if (error instanceof Error) {
      if (error.message === 'NETWORK_OFFLINE') {
        // إنشاء استجابة وهمية لحالة عدم الاتصال
        return new Response(
          JSON.stringify({ 
            error: 'offline_mode', 
            message: 'التطبيق في وضع عدم الاتصال. ستتم مزامنة البيانات عند استعادة الاتصال.' 
          }), 
          { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (error.message === 'REQUEST_TIMEOUT') {
        // إنشاء استجابة لحالة انتهاء المهلة
        return new Response(
          JSON.stringify({ 
            error: 'timeout', 
            message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى لاحقاً.' 
          }), 
          { 
            status: 408, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // إعادة رمي الخطأ الأصلي للمعالجة المخصصة لاحقاً
    throw error;
  }
}
