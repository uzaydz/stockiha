// Hook لتطهير حالة المصادقة القديمة ومنع تضارب البيانات
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { goTo } from '@/lib/navigation';

export const useAuthStateCleanup = () => {
  useEffect(() => {
    const cleanupAuthState = async () => {
      try {
        // الحصول على المستخدم الحالي
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          return;
        }

        // تطهير البيانات المتضاربة في localStorage
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        const storedOrgIdAlt = localStorage.getItem('organizationId');
        
        // إذا كان هناك معرفات مؤسسة مختلفة، احتفظ بالأحدث فقط
        if (storedOrgId && storedOrgIdAlt && storedOrgId !== storedOrgIdAlt) {
          localStorage.removeItem('organizationId');
        }

        // تطهير بيانات التخزين المؤقت القديمة
        const keysToClean = [
          'lastLoginRedirect',
          'loginRedirectCount', 
          'authErrorCount',
          'pendingAuth',
          'tempUserData'
        ];
        
        keysToClean.forEach(key => {
          sessionStorage.removeItem(key);
        });

        if (process.env.NODE_ENV === 'development') {
        }

      } catch (err) {
      }
    };

    // تطهير الحالة عند تحميل الصفحة
    cleanupAuthState();

    // إعداد مستمع لتغييرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // انتظار قصير ثم تطهير الحالة
          setTimeout(cleanupAuthState, 1000);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);
};

/**
 * دالة مساعدة لفرض تحديث كامل للصفحة
 * تستخدم عند الحاجة لضمان تزامن كامل للحالة
 */
export const forcePageRefresh = (path: string = '/dashboard') => {
  // تطهير شامل قبل إعادة التوجيه
  sessionStorage.clear();
  
  // استخدام window.location بدلاً من navigate لضمان إعادة تحميل كاملة
  goTo(path, { replace: true });
};

/**
 * دالة للتحقق من تزامن الحالة
 * ترجع true إذا كانت الحالة متزامنة
 */
export const checkAuthStateSync = async (): Promise<boolean> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }

    // التحقق من وجود بيانات المؤسسة في التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    
    if (!storedOrgId) {
      return false;
    }

    // التحقق من تطابق معرف المستخدم
    const userMetadataOrgId = user.user_metadata?.organization_id;
    
    if (userMetadataOrgId && userMetadataOrgId !== storedOrgId) {
      // عدم تطابق - تحديث التخزين المحلي
      localStorage.setItem('bazaar_organization_id', userMetadataOrgId);
    }

    return true;
  } catch (err) {
    return false;
  }
};
