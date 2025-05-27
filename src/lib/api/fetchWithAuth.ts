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
    
    // إضافة رؤوس لتجنب أخطاء CORS و 406
    headers.set('Accept', 'application/json');
    
    // إضافة رؤوس أخرى ضرورية لطلبات Supabase
    if (url.includes('supabase.co')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      // إضافة ApiKey لطلبات Supabase
      if (supabaseAnonKey && !headers.has('ApiKey')) {
        headers.set('ApiKey', supabaseAnonKey);
      }
      
      // إضافة Origin و Referer لتجنب مشاكل CORS
      if (!headers.has('Origin')) {
        headers.set('Origin', supabaseUrl);
      }
    }
    
    // دمج الإعدادات
    const fetchOptions: RequestInit = {
      ...options,
      headers
    };

    // إنشاء وعد مع مهلة
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeout);
    });

    // إنشاء وعد للطلب الفعلي
    const fetchPromise = fetch(url, fetchOptions);

    // استخدام Promise.race للتنافس بين الطلب والمهلة
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
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
        
        // محاولة إعادة الطلب مع رؤوس مختلفة
        const retryHeaders = new Headers(headers);
        retryHeaders.set('Accept', '*/*');
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders
        });
        
        if (retryResponse.ok) {
          return retryResponse;
        }
        
        // إذا فشلت المحاولة الثانية، نرجع خطأ 406
        throw new Error(`رمز الخطأ: ${response.status} - المحتوى غير مقبول. تأكد من تنسيق البيانات.`);
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
