import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

/**
 * نظام مصادقة Cross-Domain
 * يحل مشكلة تسجيل الدخول المزدوج بين النطاق الرئيسي والنطاقات الفرعية
 */

// مفاتيح localStorage للجلسة
const SESSION_STORAGE_KEY = 'supabase.auth.token';
const CROSS_DOMAIN_SESSION_KEY = 'cross_domain_session';
const SESSION_TRANSFER_KEY = 'session_transfer';

/**
 * حفظ الجلسة مع تشفير للنقل بين النطاقات
 */
export function saveSessionForTransfer(session: Session): string {
  
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
    timestamp: Date.now()
  };
  
  // تشفير بسيط باستخدام base64
  const encodedSession = btoa(JSON.stringify(sessionData));
  
  // حفظ في localStorage مع انتهاء صلاحية
  localStorage.setItem(CROSS_DOMAIN_SESSION_KEY, encodedSession);
  localStorage.setItem(`${CROSS_DOMAIN_SESSION_KEY}_expires`, (Date.now() + 300000).toString()); // 5 دقائق

  return encodedSession;
}

/**
 * استرجاع واستخدام الجلسة المنقولة
 */
export async function retrieveTransferredSession(): Promise<Session | null> {
  try {
    const encodedSession = localStorage.getItem(CROSS_DOMAIN_SESSION_KEY);
    const expiresAt = localStorage.getItem(`${CROSS_DOMAIN_SESSION_KEY}_expires`);

    if (!encodedSession || !expiresAt) {
      return null;
    }
    
    // تحقق من انتهاء الصلاحية
    if (Date.now() > parseInt(expiresAt)) {
      localStorage.removeItem(CROSS_DOMAIN_SESSION_KEY);
      localStorage.removeItem(`${CROSS_DOMAIN_SESSION_KEY}_expires`);
      return null;
    }
    
    // فك التشفير
    const sessionData = JSON.parse(atob(encodedSession));

    // تحقق من صحة البيانات
    if (!sessionData.access_token || !sessionData.user) {
      return null;
    }
    
    // تحقق من أن الجلسة ليست قديمة جداً (أقل من 5 دقائق)
    if (Date.now() - sessionData.timestamp > 300000) {
      localStorage.removeItem(CROSS_DOMAIN_SESSION_KEY);
      localStorage.removeItem(`${CROSS_DOMAIN_SESSION_KEY}_expires`);
      return null;
    }
    
    // تنظيف البيانات المؤقتة
    localStorage.removeItem(CROSS_DOMAIN_SESSION_KEY);
    localStorage.removeItem(`${CROSS_DOMAIN_SESSION_KEY}_expires`);
    
    return sessionData as Session;
  } catch (error) {
    return null;
  }
}

/**
 * تطبيق الجلسة من auth_token في URL
 */
export async function applyTokenFromUrl(authToken: string): Promise<boolean> {
  try {
    
    // تحقق من أن الـ token ليس مقطوعاً
    if (authToken.length < 100) {
      return false;
    }
    
    // فك تشفير البيانات
    let tokenData;
    try {
      tokenData = JSON.parse(atob(authToken));
    } catch (parseError) {
      return false;
    }

    // تحقق من صحة البيانات
    if (!tokenData.access_token || !tokenData.user_id) {
      return false;
    }
    
    // تحقق من أن التوقيت ليس قديماً جداً (أقل من 5 دقائق)
    if (Date.now() - tokenData.timestamp > 300000) {
      return false;
    }
    
    // تطبيق الجلسة على Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });
    
    if (error) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * تطبيق الجلسة المنقولة على Supabase
 */
export async function applyTransferredSession(): Promise<boolean> {
  try {
    const transferredSession = await retrieveTransferredSession();
    
    if (!transferredSession) {
      return false;
    }
    
    // تطبيق الجلسة على Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: transferredSession.access_token,
      refresh_token: transferredSession.refresh_token
    });
    
    if (error) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * توجيه آمن مع نقل الجلسة
 */
export async function redirectWithSession(targetUrl: string, sessionToTransfer?: Session | null): Promise<void> {
  try {

    let session = sessionToTransfer;
    
    // إذا لم يتم تمرير جلسة، حاول الحصول عليها من Supabase
    if (!session) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      session = currentSession;
    }
    
    let finalUrl = targetUrl;
    
    if (session) {
      
             // طريقة 1: حفظ في localStorage (للنطاقات نفس المجال)
       saveSessionForTransfer(session);
       
       // طريقة إضافية: حفظ في sessionStorage أيضاً
       try {
         const sessionKey = 'cross_domain_session_backup';
         const sessionBackup = {
           access_token: session.access_token,
           refresh_token: session.refresh_token,
           user_id: session.user.id,
           timestamp: Date.now()
         };
         sessionStorage.setItem(sessionKey, btoa(JSON.stringify(sessionBackup)));
       } catch (error) {
       }
      
      // طريقة 2: إضافة access_token في URL (آمن للنطاقات المختلفة)
      const urlParams = new URLSearchParams();
      urlParams.set('transfer_session', 'true');
      urlParams.set('timestamp', Date.now().toString());
      
      // إضافة token مختصر في URL (فقط للنطاقات الفرعية)
      if (session.access_token) {
        // تشفير token للأمان
        const tokenData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          user_id: session.user.id,
          timestamp: Date.now()
        };
        
        const encodedToken = btoa(JSON.stringify(tokenData));
        
        // تقسيم البيانات إذا كانت طويلة جداً
        if (encodedToken.length > 1500) {
          // لا نضع token في URL إذا كان طويلاً جداً
                 } else {
           urlParams.set('auth_token', encodedToken);
         }
      }
      
      const separator = targetUrl.includes('?') ? '&' : '?';
      finalUrl = `${targetUrl}${separator}${urlParams.toString()}`;
      
    } else {
      
      // حتى بدون جلسة، أضف معامل transfer للمحاولة
      const urlParams = new URLSearchParams();
      urlParams.set('transfer_session', 'true');
      urlParams.set('timestamp', Date.now().toString());
      
      const separator = targetUrl.includes('?') ? '&' : '?';
      finalUrl = `${targetUrl}${separator}${urlParams.toString()}`;
    }

    // التوجيه
    window.location.replace(finalUrl);
  } catch (error) {
    // التوجيه العادي كـ fallback
    window.location.replace(targetUrl);
  }
}

/**
 * فحص وتطبيق الجلسة المنقولة عند تحميل الصفحة
 */
export async function checkAndApplyTransferredSession(): Promise<boolean> {
  try {
    // فحص المعاملات في URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasTransferSession = urlParams.get('transfer_session') === 'true';
    const authToken = urlParams.get('auth_token');

    if (!hasTransferSession) {
      return false;
    }

    let applied = false;
    
    // طريقة 1: محاولة استخدام auth_token من URL
    if (authToken) {
      
      applied = await applyTokenFromUrl(authToken);
      
      if (applied) {
      } else {
      }
    }
    
    // طريقة 2: محاولة استخدام localStorage (fallback)
    if (!applied) {
      applied = await applyTransferredSession();
      
      if (applied) {
      } else {
      }
    }
    
    // تنظيف المعاملات من URL
    urlParams.delete('transfer_session');
    urlParams.delete('timestamp');
    urlParams.delete('auth_token');
    
    const cleanUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
    window.history.replaceState({}, '', cleanUrl);

    if (applied) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * تحسين إعدادات Supabase للدعم cross-domain
 */
export function configureCrossDomainAuth() {
  // إعداد domain للـ cookies (إذا كان ممكناً)
  try {
    const hostname = window.location.hostname;
    
    // استخراج النطاق الأساسي
    const baseDomains = ['ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev'];
    let baseDomain = null;
    
    for (const domain of baseDomains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        baseDomain = domain;
        break;
      }
    }
    
    if (baseDomain) {
      // محاولة تعيين domain للـ cookies
      document.cookie = `supabase_domain=${baseDomain}; domain=.${baseDomain}; path=/; max-age=86400`;
    }
  } catch (error) {
  }
}

/**
 * فحص صحة الجلسة الحالية
 */
export async function validateCurrentSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return false;
    }
    
    // فحص إضافي للتأكد من صحة الجلسة
    const { data: user, error: userError } = await supabase.auth.getUser();
    
    return !userError && !!user;
  } catch (error) {
    return false;
  }
}

/**
 * مساعد لتوليد URL للنطاق الفرعي
 */
export function generateSubdomainUrl(subdomain: string, path: string = '/dashboard'): string {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // للتطوير المحلي
  if (hostname === 'localhost') {
    return `${protocol}//${subdomain}.localhost${port ? `:${port}` : ''}${path}`;
  }
  
  // للإنتاج
  const baseDomains = ['ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev'];
  
  for (const domain of baseDomains) {
    if (hostname === domain || hostname === `www.${domain}`) {
      return `${protocol}//${subdomain}.${domain}${path}`;
    }
  }
  
  // fallback
  return `${protocol}//${subdomain}.${hostname}${path}`;
}
