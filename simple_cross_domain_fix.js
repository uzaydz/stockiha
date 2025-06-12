/**
 * إصلاح سريع لمشكلة cross-domain authentication
 * 
 * هذا الـ script يمكن تشغيله في console المتصفح للاختبار
 */

// 1. طريقة بديلة بسيطة: استخدام cookie مشترك للنطاقات الفرعية
function setCrossDomainCookie(name, value, domain) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (5 * 60 * 1000)); // 5 دقائق
  
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; domain=.${domain}; path=/; SameSite=Lax`;
}

function getCrossDomainCookie(name) {
  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');
  
  for(let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') cookie = cookie.substring(1, cookie.length);
    if (cookie.indexOf(nameEQ) === 0) return cookie.substring(nameEQ.length, cookie.length);
  }
  return null;
}

// 2. إصلاح فوري للمشكلة الحالية
async function quickFixCrossDomain() {
  
  // فحص الجلسة الحالية
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    
    // حفظ في cookie للنطاقات الفرعية
    const hostname = window.location.hostname;
    let baseDomain = null;
    
    // تحديد النطاق الأساسي
    if (hostname.includes('localhost')) {
      baseDomain = 'localhost';
    } else if (hostname.includes('stockiha.com')) {
      baseDomain = 'stockiha.com';
    } else if (hostname.includes('ktobi.online')) {
      baseDomain = 'ktobi.online';
    }
    
    if (baseDomain) {
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user_id: session.user.id,
        timestamp: Date.now()
      };
      
      const encodedSession = btoa(JSON.stringify(sessionData));
      setCrossDomainCookie('quick_session', encodedSession, baseDomain);
      
      return true;
    }
  } else {
    return false;
  }
}

// 3. استرجاع الجلسة من cookie
async function restoreFromCookie() {
  
  const cookieSession = getCrossDomainCookie('quick_session');
  
  if (cookieSession) {
    try {
      const sessionData = JSON.parse(atob(cookieSession));

      // تحقق من التوقيت
      if (Date.now() - sessionData.timestamp > 300000) { // 5 دقائق
        return false;
      }
      
      // تطبيق الجلسة
      const { data, error } = await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      });
      
      if (error) {
        return false;
      }

      // حذف الـ cookie بعد الاستخدام
      document.cookie = 'quick_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + window.location.hostname.split('.').slice(-2).join('.') + '; path=/;';
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  return false;
}

// 4. تشغيل تلقائي حسب الصفحة
if (window.location.search.includes('transfer_session=true')) {
  restoreFromCookie().then(success => {
    if (success) {
      // إعادة تحميل الصفحة لتطبيق الجلسة
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
    }
  });
}

// تصدير الدوال للاستخدام اليدوي
window.quickFixCrossDomain = quickFixCrossDomain;
window.restoreFromCookie = restoreFromCookie;
