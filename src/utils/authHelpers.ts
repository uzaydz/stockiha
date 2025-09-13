/**
 * مساعدات المصادقة لحل مشاكل رفع الصور
 * يحل مشكلة خطأ 403 "new row violates row-level security policy"
 */

import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * محاولة الحصول على الجلسة من AuthContext أو أي مصدر عام
 */
const getSessionFromContext = (): Session | null => {
  try {
    // فحص window object للمتغيرات العامة
    const globalAuth = (window as any).__BAZAAR_AUTH__;
    if (globalAuth && globalAuth.session) {
      
      return globalAuth.session;
    }
    
    // فحص React context إذا كان متاحاً
    const reactFiber = (document.querySelector('[data-reactroot]') as any)?._reactInternalFiber;
    if (reactFiber) {
      // محاولة العثور على AuthContext في React fiber
      // هذا معقد ولكن يمكن أن يعمل في بعض الحالات
      
    }
    
    return null;
  } catch (error) {
    console.error('❌ خطأ في الحصول على الجلسة من السياق:', error);
    return null;
  }
};

/**
 * فحص الجلسة المخزنة في localStorage
 */
const checkStoredSession = async (): Promise<Session | null> => {
  try {
    // فحص عدة مفاتيح محتملة للجلسة
    const possibleKeys = [
      'bazaar-supabase-auth-unified-v3',
      'bazaar-supabase-auth-unified-main',
      'supabase.auth.token',
      'sb-wrnssatuvmumsczyldth-auth-token' // مفتاح Supabase الافتراضي
    ];
    
    for (const key of possibleKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          
          
          // التحقق من وجود access_token
          if (parsed.access_token || (parsed.session && parsed.session.access_token)) {
            const session = parsed.session || parsed;
            
            // التحقق من انتهاء الصلاحية
            const expiresAt = session.expires_at || 0;
            const now = Math.floor(Date.now() / 1000);
            
            if (expiresAt > now) {
              
              return session;
            } else {
              
              
              // محاولة تجديد الجلسة باستخدام refresh_token
              if (session.refresh_token) {
                try {
                  
                  const { data, error } = await supabase.auth.refreshSession({
                    refresh_token: session.refresh_token
                  });
                  
                  if (!error && data.session) {
                    
                    return data.session;
                  } else {
                    console.warn('⚠️ فشل تجديد الجلسة:', error?.message);
                    
                    // إذا كان refresh_token غير صالح، نظف البيانات المخزنة
                    if (error?.message?.includes('refresh_token_not_found') || 
                        error?.message?.includes('Invalid Refresh Token')) {
                      
                      localStorage.removeItem(key);
                    }
                  }
                } catch (refreshError: any) {
                  console.warn('⚠️ خطأ في تجديد الجلسة:', refreshError);
                  
                  // تنظيف البيانات المخزنة في حالة الخطأ
                  if (refreshError?.message?.includes('refresh_token_not_found') || 
                      refreshError?.message?.includes('Invalid Refresh Token')) {
                    
                    localStorage.removeItem(key);
                  }
                }
              }
            }
          }
        } catch (parseError) {
          console.warn(`❌ خطأ في تحليل الجلسة المخزنة من ${key}:`, parseError);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ خطأ في فحص الجلسة المخزنة:', error);
    return null;
  }
};

/**
 * استعادة الجلسة المخزنة وتطبيقها على Supabase client
 */
const restoreStoredSession = async (session: Session): Promise<{
  isValid: boolean;
  session: Session | null;
  error?: string;
}> => {
  try {
    
    
    // تطبيق الجلسة على Supabase client
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
    
    if (error) {
      console.error('❌ فشل في تطبيق الجلسة المخزنة:', error);
      return {
        isValid: false,
        session: null,
        error: 'فشل في استعادة الجلسة المخزنة'
      };
    }
    
    if (data.session) {
      
      return {
        isValid: true,
        session: data.session
      };
    }
    
    return {
      isValid: false,
      session: null,
      error: 'فشل في استعادة الجلسة'
    };
    
  } catch (error: any) {
    console.error('❌ خطأ في استعادة الجلسة:', error);
    return {
      isValid: false,
      session: null,
      error: error.message || 'خطأ في استعادة الجلسة'
    };
  }
};

/**
 * التحقق من صحة جلسة المصادقة الحالية
 */
export const validateCurrentSession = async (): Promise<{
  isValid: boolean;
  session: Session | null;
  error?: string;
}> => {
  try {
    
    
    // محاولة الحصول على الجلسة من عدة مصادر
    const { data: { session }, error } = await supabase.auth.getSession();
    
    
    
    if (error) {
      console.error('❌ خطأ في الحصول على الجلسة:', error);
      
      // محاولة بديلة - التحقق من localStorage
      const storedSession = await checkStoredSession();
      if (storedSession) {
        
        return await restoreStoredSession(storedSession);
      }
      
      return {
        isValid: false,
        session: null,
        error: error.message
      };
    }

    if (!session) {
      console.warn('⚠️ لا توجد جلسة من getSession، فحص مصادر أخرى...');
      
      // محاولة بديلة - فحص AuthContext أو localStorage
      const storedSession = await checkStoredSession();
      if (storedSession) {
        
        return await restoreStoredSession(storedSession);
      }
      
      // محاولة أخيرة - التحقق من المستخدم الحالي
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user && !userError) {
          
          // في هذه الحالة، المستخدم مصادق لكن الجلسة مفقودة
          return {
            isValid: false,
            session: null,
            error: 'جلسة مفقودة رغم وجود مستخدم مصادق - يرجى إعادة تسجيل الدخول'
          };
        }
      } catch (userError) {
        console.error('❌ خطأ في فحص المستخدم:', userError);
      }
      
      return {
        isValid: false,
        session: null,
        error: 'لا توجد جلسة نشطة'
      };
    }

    // التحقق من انتهاء صلاحية الـ token
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    
    if (expiresAt <= now) {
      console.warn('انتهت صلاحية الـ token، محاولة التجديد...');
      
      try {
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          return {
            isValid: false,
            session: null,
            error: 'فشل في تجديد الجلسة'
          };
        }
        
        return {
          isValid: true,
          session: refreshedSession
        };
      } catch (refreshError) {
        return {
          isValid: false,
          session: null,
          error: 'خطأ في تجديد الجلسة'
        };
      }
    }

    return {
      isValid: true,
      session
    };
  } catch (error: any) {
    console.error('خطأ في validateCurrentSession:', error);
    return {
      isValid: false,
      session: null,
      error: error.message || 'خطأ غير متوقع'
    };
  }
};

/**
 * إنشاء عميل Supabase مصادق عليه للاستخدام في رفع الملفات
 */
export const createAuthenticatedClient = async () => {
  const { isValid, session, error } = await validateCurrentSession();
  
  if (!isValid || !session) {
    // رسالة واضحة للمستخدم عن الحاجة لإعادة تسجيل الدخول
    const userFriendlyError = error?.includes('refresh_token_not_found') || 
                             error?.includes('Invalid Refresh Token') ||
                             error?.includes('منتهية الصلاحية')
      ? 'انتهت صلاحية جلسة تسجيل الدخول. يرجى تحديث الصفحة وتسجيل الدخول مرة أخرى.'
      : 'يجب تسجيل الدخول أولاً لرفع الصور.';
    
    throw new Error(userFriendlyError);
  }

  // إنشاء نسخة من العميل مع تطبيق الـ session
  const client = supabase;
  
  // تحديث headers للتأكد من تطبيق المصادقة
  if (session.access_token) {
    (client as any).rest.headers = {
      ...(client as any).rest.headers,
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
    };
  }

  return {
    client,
    session
  };
};

/**
 * دالة مساعدة لرفع الملفات مع معالجة أخطاء المصادقة
 */
export const uploadFileWithAuth = async (
  bucketName: string,
  filePath: string,
  file: File,
  options?: {
    cacheControl?: string;
    upsert?: boolean;
    contentType?: string;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  publicUrl?: string;
}> => {
  try {
    const { client, session } = await createAuthenticatedClient();
    

    const { data, error } = await client.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: options?.cacheControl || '31536000',
        upsert: options?.upsert || false,
        contentType: options?.contentType || file.type
      });

    if (error) {
      console.error('خطأ في رفع الملف:', error);
      
      // معالجة أخطاء محددة
      let errorMessage = 'فشل في رفع الملف';
      
      if (error.message?.includes('Policy') || 
          error.message?.includes('row-level security') || 
          error.message?.includes('RLS')) {
        errorMessage = 'ليس لديك صلاحية لرفع الملفات. يرجى تسجيل الدخول مرة أخرى.';
      } else if (error.message?.includes('Unauthorized') || 
                 error.message?.includes('401') || 
                 error.message?.includes('403')) {
        errorMessage = 'غير مخول لرفع الملفات. يرجى تسجيل الدخول مرة أخرى.';
      } else if (error.message?.includes('size')) {
        errorMessage = 'حجم الملف كبير جداً.';
      } else if (error.message?.includes('Duplicate')) {
        errorMessage = 'اسم الملف موجود بالفعل.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    // الحصول على الرابط العام
    const { data: urlData } = client.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      data,
      publicUrl: urlData.publicUrl
    };
    
  } catch (error: any) {
    console.error('خطأ في uploadFileWithAuth:', error);
    return {
      success: false,
      error: error.message || 'خطأ غير متوقع في رفع الملف'
    };
  }
};

/**
 * التحقق من حالة المصادقة وعرض معلومات التشخيص
 */
export const debugAuthState = async (): Promise<void> => {
  try {
    console.group('🔍 تشخيص حالة المصادقة');
    
    // 1. فحص الجلسة الحالية
    const { data: { session }, error } = await supabase.auth.getSession();
    
    
    
    if (session) {
      
      
      
      
    }
    
    // 2. فحص المستخدم الحالي
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    
    
    // 3. فحص headers العميل
    
    
    // 4. فحص localStorage للجلسات المخزنة
    
    const possibleKeys = [
      'bazaar-supabase-auth-unified-v3',
      'bazaar-supabase-auth-unified-main',
      'supabase.auth.token',
      'sb-wrnssatuvmumsczyldth-auth-token'
    ];
    
    for (const key of possibleKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          
        } catch (e) {
          
        }
      } else {
        
      }
    }
    
    // 5. فحص AuthContext من window object (إذا كان متاحاً)
    
    
    
    
    // 6. فحص cookies
    
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && (name.includes('supabase') || name.includes('auth') || name.includes('bazaar'))) {
        
      }
    });
    
    console.groupEnd();
  } catch (error) {
    console.error('خطأ في تشخيص حالة المصادقة:', error);
  }
};

/**
 * إعادة تهيئة المصادقة - مفيد عند حدوث مشاكل
 */
export const reinitializeAuth = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    
    
    // محاولة تحديث الجلسة
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session) {
      return {
        success: false,
        message: 'فشل في إعادة تهيئة المصادقة. يرجى تسجيل الدخول مرة أخرى.'
      };
    }
    
    // تحديث headers العميل
    if (session.access_token) {
      (supabase as any).rest.headers = {
        ...(supabase as any).rest.headers,
        'Authorization': `Bearer ${session.access_token}`
      };
    }
    
    return {
      success: true,
      message: 'تم إعادة تهيئة المصادقة بنجاح'
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'خطأ في إعادة تهيئة المصادقة'
    };
  }
};

/**
 * دالة مساعدة للتحقق من الصلاحيات قبل رفع الملفات
 */
export const checkUploadPermissions = async (bucketName: string): Promise<{
  canUpload: boolean;
  message: string;
}> => {
  try {
    const { isValid, session } = await validateCurrentSession();
    
    if (!isValid || !session) {
      return {
        canUpload: false,
        message: 'يجب تسجيل الدخول أولاً'
      };
    }
    
    // محاولة رفع ملف اختبار صغير
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const testPath = `test/${session.user.id}/permission-test-${Date.now()}.txt`;
    
    const { client } = await createAuthenticatedClient();
    
    const { error } = await client.storage
      .from(bucketName)
      .upload(testPath, testFile);
    
    if (error) {
      if (error.message?.includes('Policy') || 
          error.message?.includes('row-level security') ||
          error.message?.includes('Unauthorized')) {
        return {
          canUpload: false,
          message: 'ليس لديك صلاحية للرفع في هذا المجلد'
        };
      }
      
      return {
        canUpload: false,
        message: `خطأ في اختبار الصلاحيات: ${error.message}`
      };
    }
    
    // حذف الملف الاختباري
    await client.storage.from(bucketName).remove([testPath]);
    
    return {
      canUpload: true,
      message: 'لديك صلاحية للرفع'
    };
    
  } catch (error: any) {
    return {
      canUpload: false,
      message: `خطأ في فحص الصلاحيات: ${error.message}`
    };
  }
};
