/**
 * Hook إدارة الجلسة
 * منفصل لتحسين الأداء وسهولة الاستخدام
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { sessionManager } from '../services/sessionManager';
import { isValidSession } from '../types';
import { trackPerformance } from '../../../lib/performance';
import { debounce } from '../../../lib/utils/debounce';
import { 
  sessionMonitor, 
  getCurrentSession, 
  addSessionListener 
} from '../../../lib/session-monitor';

// ✅ ثوابت محسنة لمنع التكرار
const AUTH_TIMEOUTS = {
  DEBOUNCE_DELAY: 1000, // ثانية واحدة
  VALIDATION_INTERVAL: 10 * 60 * 1000, // 10 دقائق
  REFRESH_COOLDOWN: 5 * 60 * 1000 // 5 دقائق
};

export interface UseAuthSessionReturn {
  session: Session | null;
  isValidSession: boolean;
  refreshSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
}

export const useAuthSession = (): UseAuthSessionReturn => {
  const [session, setSession] = useState<Session | null>(null);
  const [isValidSessionState, setIsValidSessionState] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // ✅ مراجع محسنة لمنع التكرار
  const lastValidationRef = useRef<number>(0);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // ✅ التحقق من صحة الجلسة مع debouncing
  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    
    try {
      const isValid = isValidSession(session);
      setIsValidSessionState(isValid);
      return isValid;
    } catch (error) {
      setIsValidSessionState(false);
      return false;
    }
  }, [session, isValidSessionState]);

  // ✅ تجديد الجلسة - يستخدم المراقب الموحد
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false;

    const startTime = performance.now();
    setIsRefreshing(true);

    try {
      // ✅ استخدام المراقب الموحد بدلاً من sessionManager
      const success = await sessionMonitor.manualRefresh();
      
      if (success) {
        const { session: newSession } = getCurrentSession();
        if (newSession) {
          setSession(newSession);
          setIsValidSessionState(true);
        }
      } else {
        setIsValidSessionState(false);
      }
      
      trackPerformance('refreshSession', startTime);
      return success;

    } catch (error) {
      setIsValidSessionState(false);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // ✅ التحقق التلقائي من الجلسة مع debouncing
  const debouncedValidation = useCallback(
    debounce(validateSession, AUTH_TIMEOUTS.DEBOUNCE_DELAY),
    [validateSession]
  );

  // ✅ الحصول على الجلسة الحالية - مع منع التكرار
  const getCurrentSessionData = useCallback(async () => {
    // ✅ تجنب استدعاءات متعددة في فترة قصيرة
    const now = Date.now();
    if (now - lastValidationRef.current < AUTH_TIMEOUTS.DEBOUNCE_DELAY) {
      return;
    }
    
    try {
      // ✅ استخدام المراقب الموحد
      const { session: currentSession, isValid } = getCurrentSession();
      if (currentSession) {
        setSession(currentSession);
        setIsValidSessionState(isValid);
        lastValidationRef.current = now;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [useAuthSession] خطأ في الحصول على الجلسة:', error);
      }
    }
  }, []);

  // ✅ تهيئة المراقب - مرة واحدة فقط
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    // ✅ الحصول على الجلسة الأولية
    getCurrentSessionData();
    
    // ✅ إضافة مستمع للمراقب الموحد
    const removeListener = addSessionListener((newSession, isValid) => {
      setSession(newSession);
      setIsValidSessionState(isValid);
    });
    
    // ✅ حفظ دالة التنظيف
    cleanupRef.current = removeListener;
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []); // dependency array فارغ للتشغيل مرة واحدة فقط

  // ✅ التحقق الدوري من صحة الجلسة - محسن
  useEffect(() => {
    if (!session) return;

    // ✅ تحقق فوري من الصحة
    const immediate = isValidSession(session);
    setIsValidSessionState(immediate);

    // ✅ جدولة التحقق الدوري - كل 10 دقائق
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      debouncedValidation();
    }, AUTH_TIMEOUTS.VALIDATION_INTERVAL);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [session, debouncedValidation]);

  // ✅ مراقبة تغيير رؤية الصفحة - محسن
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        // ✅ عندما تعود الصفحة للظهور، تحقق من الجلسة
        debouncedValidation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, debouncedValidation]);

  // ✅ تنظيف الموارد عند unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    session,
    isValidSession: isValidSessionState,
    refreshSession,
    validateSession
  };
};
