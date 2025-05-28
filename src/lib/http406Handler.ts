/**
 * معالج شامل لأخطاء 406 في التطبيق
 */

// تتبع الطلبات التي فشلت بخطأ 406
const failed406Requests = new Set<string>();
const retryAttempts = new Map<string, number>();

/**
 * تهيئة معالج أخطاء 406 العام
 */
export const initHttp406Handler = () => {
  // اعتراض جميع طلبات fetch
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const requestKey = `${init?.method || 'GET'}_${url}`;
    
    try {
      const response = await originalFetch(input, init);
      
      // إذا نجح الطلب، احذف من قائمة الفشل
      if (response.ok) {
        failed406Requests.delete(requestKey);
        retryAttempts.delete(requestKey);
        return response;
      }
      
      // معالجة خطأ 406
      if (response.status === 406) {
        console.warn(`خطأ 406 في الطلب: ${url}`);
        
        const currentAttempts = retryAttempts.get(requestKey) || 0;
        
        // إذا لم نحاول إعادة الطلب بعد، أو حاولنا أقل من 3 مرات
        if (currentAttempts < 3) {
          retryAttempts.set(requestKey, currentAttempts + 1);
          
          // إعادة الطلب مع رؤوس مبسطة
          const retryInit = {
            ...init,
            headers: {
              'Accept': '*/*',
              'Content-Type': 'application/json',
              // نسخ الرؤوس المهمة فقط
              ...(init?.headers && typeof init.headers === 'object' ? 
                Object.fromEntries(
                  Object.entries(init.headers).filter(([key]) => 
                    ['Authorization', 'ApiKey', 'X-Client-Info'].includes(key)
                  )
                ) : {}
              )
            }
          };
          
          console.log(`إعادة محاولة الطلب (${currentAttempts + 1}/3): ${url}`);
          
          // تأخير قصير قبل إعادة المحاولة
          await new Promise(resolve => setTimeout(resolve, 500 * (currentAttempts + 1)));
          
          return window.fetch(input, retryInit);
        } else {
          // إذا فشلت جميع المحاولات
          failed406Requests.add(requestKey);
          console.error(`فشل الطلب نهائياً بعد 3 محاولات: ${url}`);
        }
      }
      
      return response;
    } catch (error) {
      console.error(`خطأ في الطلب: ${url}`, error);
      throw error;
    }
  };
  
  // مراقبة أخطاء الشبكة غير المعالجة
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error && error.toString().includes('406')) {
      console.warn('خطأ 406 غير معالج:', error);
      
      // إظهار رسالة للمستخدم
      showUser406Message();
    }
  });
  
  // مراقبة أخطاء وحدة التحكم
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('406') || message.includes('Not Acceptable')) {
      showUser406Message();
    }
    originalConsoleError.apply(console, args);
  };
  
  console.log('تم تهيئة معالج أخطاء 406');
};

/**
 * إظهار رسالة للمستخدم عند حدوث خطأ 406
 */
let user406MessageShown = false;
const showUser406Message = () => {
  if (user406MessageShown) return;
  
  user406MessageShown = true;
  
  // إنشاء عنصر تنبيه
  const alertDiv = document.createElement('div');
  alertDiv.className = 'fixed top-4 right-4 z-50 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded shadow-lg max-w-md';
  alertDiv.innerHTML = `
    <div class="flex items-center">
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <div>
        <div class="font-medium">مشكلة مؤقتة في التحميل</div>
        <div class="text-sm">يتم حل المشكلة تلقائياً. إذا استمرت، يرجى تحديث الصفحة.</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-orange-600 hover:text-orange-800">
        ×
      </button>
    </div>
  `;
  
  document.body.appendChild(alertDiv);
  
  // إزالة الرسالة تلقائياً بعد 10 ثوانٍ
  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
    user406MessageShown = false;
  }, 10000);
};

/**
 * الحصول على إحصائيات أخطاء 406
 */
export const get406Stats = () => {
  return {
    failedRequests: Array.from(failed406Requests),
    retryAttempts: Object.fromEntries(retryAttempts),
    totalFailed: failed406Requests.size
  };
};

/**
 * إعادة تعيين إحصائيات أخطاء 406
 */
export const reset406Stats = () => {
  failed406Requests.clear();
  retryAttempts.clear();
  user406MessageShown = false;
};

/**
 * فحص ما إذا كان هناك طلبات فاشلة بخطأ 406
 */
export const hasFailed406Requests = () => {
  return failed406Requests.size > 0;
};

/**
 * إعادة محاولة جميع الطلبات الفاشلة
 */
export const retryFailed406Requests = () => {
  if (failed406Requests.size > 0) {
    console.log(`إعادة محاولة ${failed406Requests.size} طلب فاشل`);
    
    // إعادة تحميل الصفحة كحل أخير
    window.location.reload();
  }
}; 