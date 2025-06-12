import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  getCurrentUserProfile, 
  updateUserProfile, 
  uploadAvatar, 
  updateUserStatus,
  UserProfileData 
} from '@/lib/api/profile';
import { toast } from 'sonner';

interface UseProfileReturn {
  profile: UserProfileData | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfileData>) => Promise<boolean>;
  uploadProfileAvatar: (file: File) => Promise<boolean>;
  updateStatus: (status: 'online' | 'offline' | 'away' | 'busy') => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

export const useProfile = (): UseProfileReturn => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلب بيانات الملف الشخصي
  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const profileData = await getCurrentUserProfile();
      setProfile(profileData);
    } catch (err) {
      const errorMessage = 'فشل في جلب بيانات الملف الشخصي';
      setError(errorMessage);
      console.error('خطأ في جلب الملف الشخصي:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // تحديث بيانات الملف الشخصي
  const updateProfile = useCallback(async (data: Partial<UserProfileData>): Promise<boolean> => {
    if (!profile) return false;

    setIsUpdating(true);
    try {
      const result = await updateUserProfile(data);
      if (result.success && result.data) {
        setProfile(result.data);
        toast.success('تم تحديث الملف الشخصي بنجاح');
        return true;
      } else {
        toast.error(result.error || 'فشل في تحديث الملف الشخصي');
        return false;
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث الملف الشخصي');
      console.error('خطأ في تحديث الملف الشخصي:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [profile]);

  // رفع الصورة الشخصية
  const uploadProfileAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!profile) return false;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return false;
    }

    // التحقق من حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return false;
    }

    setIsUpdating(true);
    try {
      const result = await uploadAvatar(file);
      if (result.success && result.url) {
        setProfile(prev => prev ? { ...prev, avatar_url: result.url! } : null);
        toast.success('تم رفع الصورة بنجاح');
        return true;
      } else {
        toast.error(result.error || 'فشل في رفع الصورة');
        return false;
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء رفع الصورة');
      console.error('خطأ في رفع الصورة:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [profile]);

  // تحديث حالة المستخدم
  const updateStatus = useCallback(async (status: 'online' | 'offline' | 'away' | 'busy'): Promise<boolean> => {
    if (!profile) return false;

    try {
      const result = await updateUserStatus(status);
      if (result.success) {
        setProfile(prev => prev ? {
          ...prev,
          status,
          last_activity_at: new Date().toISOString()
        } : null);
        toast.success('تم تحديث الحالة بنجاح');
        return true;
      } else {
        toast.error(result.error || 'فشل في تحديث الحالة');
        return false;
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث الحالة');
      console.error('خطأ في تحديث الحالة:', err);
      return false;
    }
  }, [profile]);

  // تحديث الملف الشخصي
  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    await loadProfile();
  }, [loadProfile]);

  // تحميل الملف الشخصي عند تغيير المستخدم
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // تحديث حالة المستخدم إلى "متصل" عند تحميل الصفحة
  useEffect(() => {
    if (profile && profile.status !== 'online') {
      updateStatus('online');
    }
  }, [profile, updateStatus]);

  // تحديث حالة المستخدم إلى "غير متصل" عند إغلاق الصفحة
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (profile) {
        // استخدام navigator.sendBeacon للإرسال الموثوق
        navigator.sendBeacon('/api/user/status', JSON.stringify({ status: 'offline' }));
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && profile) {
        updateStatus('away');
      } else if (!document.hidden && profile) {
        updateStatus('online');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile, updateStatus]);

  return {
    profile,
    isLoading,
    isUpdating,
    error,
    updateProfile,
    uploadProfileAvatar,
    updateStatus,
    refreshProfile
  };
}; 