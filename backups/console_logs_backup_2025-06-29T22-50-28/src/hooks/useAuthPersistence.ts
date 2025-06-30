import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook لضمان استمرارية حالة المصادقة عند إعادة تحميل الصفحة
 */
export const useAuthPersistence = () => {
  const { user, session, loading } = useAuth();
  const [hasValidSavedState, setHasValidSavedState] = useState(false);
  const [wasRecentlyAuthenticated, setWasRecentlyAuthenticated] = useState(false);

  // فحص البيانات المحفوظة في localStorage
  const checkSavedAuthState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('bazaar_auth_state');
      if (!savedState) return false;

      const authState = JSON.parse(savedState);
      
      // التحقق من انتهاء صلاحية التوكن
      const expiresAt = authState.session?.expires_at;
      if (expiresAt) {
        const expirationTime = expiresAt * 1000;
        const now = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 دقائق buffer
        
        if (now >= (expirationTime - bufferTime)) {
          return false; // منتهي الصلاحية
        }
      }

      // التحقق من أن البيانات لا تتجاوز 24 ساعة
      const savedTimestamp = authState.timestamp || 0;
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - savedTimestamp > maxAge) {
        return false; // قديمة جداً
      }

      return true; // البيانات صالحة
    } catch {
      return false;
    }
  }, []);

  // مراقبة تغييرات حالة المصادقة وحفظها
  useEffect(() => {
    if (user && session && !loading) {
      // تسجيل نجاح استعادة الجلسة

      // حفظ علامة أن المستخدم مسجل دخول
      sessionStorage.setItem('user_authenticated', 'true');
      localStorage.setItem('last_auth_check', Date.now().toString());
      setHasValidSavedState(true);
    } else if (!loading && !user) {
      // مسح علامات المصادقة عند عدم وجود مستخدم
      sessionStorage.removeItem('user_authenticated');
      setHasValidSavedState(false);
    }
  }, [user, session, loading]);

  // فحص البيانات المحفوظة عند التحميل الأولي
  useEffect(() => {
    const isValidSavedState = checkSavedAuthState();
    setHasValidSavedState(isValidSavedState);
    
    if (isValidSavedState) {
    }
  }, [checkSavedAuthState]);

  // التحقق من حالة المصادقة عند تحميل الصفحة
  const checkAuthOnPageLoad = useCallback(() => {
    const wasAuthenticated = sessionStorage.getItem('user_authenticated');
    const lastAuthCheck = localStorage.getItem('last_auth_check');
    
    if (wasAuthenticated && lastAuthCheck) {
      const timeSinceLastCheck = Date.now() - parseInt(lastAuthCheck);
      const maxAge = 30 * 60 * 1000; // 30 دقيقة
      
      if (timeSinceLastCheck < maxAge) {
        return true; // المستخدم كان مصادقاً مؤخراً
      } else {
        sessionStorage.removeItem('user_authenticated');
        localStorage.removeItem('last_auth_check');
      }
    }
    
    return false;
  }, []);

  // فحص الحالة عند التحميل الأولي
  useEffect(() => {
    const wasRecent = checkAuthOnPageLoad();
    setWasRecentlyAuthenticated(wasRecent);
    
    if (wasRecent && !user && !loading) {
    }
  }, [checkAuthOnPageLoad, user, loading]);

  // إيقاف was_recently عندما يصبح المستخدم مصادق بنجاح
  useEffect(() => {
    if (user && session && wasRecentlyAuthenticated) {
      setWasRecentlyAuthenticated(false);
      // تحديث timestamp للمصادقة الحالية
      localStorage.setItem('last_auth_check', Date.now().toString());
    }
  }, [user, session, wasRecentlyAuthenticated]);

  return {
    wasRecentlyAuthenticated: wasRecentlyAuthenticated && !user && !loading, // فقط إذا لم يكن المستخدم مسجل دخول حالياً وليس في حالة تحميل
    isAuthenticated: !!user && !!session,
    isLoading: loading,
    hasValidSavedState
  };
};
