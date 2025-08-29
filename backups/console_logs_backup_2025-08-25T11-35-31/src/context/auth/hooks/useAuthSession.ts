/**
 * Hook إدارة الجلسة
 * منفصل لتحسين الأداء وسهولة الاستخدام
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import type { UseAuthSessionReturn, AuthError } from '../types';
import { sessionManager } from '../services/sessionManager';
import { isValidSession } from '../types';
import { trackPerformance, debounce } from '../utils/authHelpers';
import { AUTH_TIMEOUTS } from '../constants/authConstants';

export const useAuthSession = (): UseAuthSessionReturn => {
  const [session, setSession] = useState<Session | null>(null);
  const [isValidSessionState, setIsValidSessionState] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const lastValidationRef = useRef<number>(0);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * التحقق من صحة الجلسة
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    const startTime = performance.now();
    
    try {
      if (!session) {
        setIsValidSessionState(false);
        return false;
      }

      // منع التحقق المتكرر
      const now = Date.now();
      if (now - lastValidationRef.current < 30000) { // 30 ثانية
        return isValidSessionState;
      }

      const isValid = await sessionManager.validateSessionWithRefresh(session);
      setIsValidSessionState(isValid);
      lastValidationRef.current = now;

      trackPerformance('validateSession', startTime);
      return isValid;

    } catch (error) {
      setIsValidSessionState(false);
      return false;
    }
  }, [session, isValidSessionState]);

  /**
   * تجديد الجلسة
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false;

    const startTime = performance.now();
    setIsRefreshing(true);

    try {
      const { session: newSession, error } = await sessionManager.refreshSession();
      
      if (error || !newSession) {
        setIsValidSessionState(false);
        return false;
      }

      setSession(newSession);
      setIsValidSessionState(true);
      
      trackPerformance('refreshSession', startTime);
      return true;

    } catch (error) {
      setIsValidSessionState(false);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  /**
   * التحقق التلقائي من الجلسة مع debouncing
   */
  const debouncedValidation = useCallback(
    debounce(validateSession, AUTH_TIMEOUTS.DEBOUNCE_DELAY),
    [validateSession]
  );

  /**
   * الحصول على الجلسة الحالية - مع منع التكرار
   */
  const getCurrentSession = useCallback(async () => {
    // تجنب استدعاءات متعددة في فترة قصيرة
    const now = Date.now();
    if (now - lastValidationRef.current < 1000) { // ثانية واحدة
      return;
    }
    
    try {
      const { session: currentSession } = await sessionManager.getCurrentSession();
      if (currentSession) {
        setSession(currentSession);
        setIsValidSessionState(isValidSession(currentSession));
        lastValidationRef.current = now;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [useAuthSession] خطأ في الحصول على الجلسة:', error);
      }
    }
  }, []);

  /**
   * مراقبة تغييرات الجلسة - مرة واحدة فقط
   */
  useEffect(() => {
    let mounted = true;
    
    const initSession = async () => {
      if (mounted) {
        await getCurrentSession();
      }
    };
    
    initSession();
    
    return () => {
      mounted = false;
    };
  }, []); // dependency array فارغ للتشغيل مرة واحدة فقط

  /**
   * التحقق الدوري من صحة الجلسة
   */
  useEffect(() => {
    if (!session) return;

    // تحقق فوري من الصحة
    const immediate = isValidSession(session);
    setIsValidSessionState(immediate);

    // جدولة التحقق الدوري
    const scheduleValidation = () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      validationTimeoutRef.current = setTimeout(() => {
        debouncedValidation();
        scheduleValidation(); // جدولة التحقق التالي
      }, 5 * 60 * 1000); // كل 5 دقائق
    };

    scheduleValidation();

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [session, debouncedValidation]);

  /**
   * مراقبة تغيير رؤية الصفحة
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        // عندما تعود الصفحة للظهور، تحقق من الجلسة
        debouncedValidation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, debouncedValidation]);

  /**
   * تنظيف الموارد عند unmount
   */
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
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
