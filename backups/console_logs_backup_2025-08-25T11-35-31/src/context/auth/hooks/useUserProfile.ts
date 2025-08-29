/**
 * Hook إدارة ملف المستخدم
 * منفصل لتحسين الأداء وسهولة الاستخدام
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import type { UserProfile, UseUserProfileReturn, AuthError } from '../types';
import { userDataManager } from '../services/userDataManager';
import { trackPerformance, debounce, handleAuthError } from '../utils/authHelpers';
import { AUTH_TIMEOUTS } from '../constants/authConstants';

interface UseUserProfileProps {
  user: SupabaseUser | null;
  enabled?: boolean;
}

export const useUserProfile = ({ user, enabled = true }: UseUserProfileProps): UseUserProfileReturn => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  /**
   * جلب بيانات المستخدم
   */
  const fetchUserProfile = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!user || !enabled || fetchingRef.current) {
      return;
    }

    // منع الطلبات المتكررة
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < AUTH_TIMEOUTS.DEBOUNCE_DELAY) {
      return;
    }

    const startTime = performance.now();
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await userDataManager.fetchUserData(user);
      
      if (result.error) {
        setError(result.error);
        setUserProfile(null);
      } else {
        setUserProfile(result.userProfile);
        setError(null);
      }

      lastFetchRef.current = now;
      trackPerformance('fetchUserProfile', startTime);

    } catch (err) {
      const authError = handleAuthError(err);
      setError(authError);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [user, enabled]);

  /**
   * تحديث ملف المستخدم
   */
  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!user || !userProfile) {
      return false;
    }

    const startTime = performance.now();
    setError(null);

    try {
      const result = await userDataManager.updateUserProfile(user.id, updates);
      
      if (result.error) {
        setError(result.error);
        return false;
      }

      // تحديث الحالة المحلية
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      
      trackPerformance('updateProfile', startTime);
      return true;

    } catch (err) {
      const authError = handleAuthError(err);
      setError(authError);
      return false;
    }
  }, [user, userProfile]);

  /**
   * إعادة جلب البيانات
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchUserProfile(true);
  }, [fetchUserProfile]);

  /**
   * تنظيف البيانات
   */
  const clearProfile = useCallback((): void => {
    setUserProfile(null);
    setError(null);
    setIsLoading(false);
    
    if (user) {
      userDataManager.clearUserCache(user.id);
    }
  }, [user]);

  /**
   * جلب البيانات عند تغيير المستخدم (مع منع التكرار)
   */
  useEffect(() => {
    if (user && enabled) {
      // منع التكرار: التحقق من وجود البيانات بالفعل
      if (!userProfile || userProfile.id !== user.id) {
        fetchUserProfile();
      }
    } else {
      clearProfile();
    }
  }, [user?.id, enabled]); // إزالة fetchUserProfile و clearProfile من dependencies

  /**
   * تنظيف cache منتهي الصلاحية دورياً
   */
  useEffect(() => {
    const cleanup = setInterval(() => {
      userDataManager.cleanExpiredCache();
    }, 5 * 60 * 1000); // كل 5 دقائق

    return () => clearInterval(cleanup);
  }, []);

  /**
   * مراقبة تغيير رؤية الصفحة
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && enabled && userProfile) {
        // تحديث البيانات عند عودة الصفحة للظهور
        const timeSinceLastFetch = Date.now() - lastFetchRef.current;
        if (timeSinceLastFetch > AUTH_TIMEOUTS.VISIBILITY_DELAY) {
          fetchUserProfile();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, enabled, userProfile, fetchUserProfile]);

  /**
   * تنظيف الموارد عند unmount
   */
  useEffect(() => {
    return () => {
      fetchingRef.current = false;
    };
  }, []);

  return {
    userProfile,
    isLoading,
    error,
    refetch,
    updateProfile
  };
};
