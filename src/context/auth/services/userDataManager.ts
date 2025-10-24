/**
 * مدير بيانات المستخدم
 * يتولى جلب وإدارة بيانات المستخدم والمؤسسة
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getOrganizationById } from '@/lib/api/deduplicatedApi';
import { getCurrentUserProfile } from '@/lib/api/users';
import type { UserProfile, Organization, AuthError, UserDataCacheItem } from '../types';
import { 
  saveUserDataToStorage, 
  loadUserDataFromStorage 
} from '../utils/authStorage';
import { 
  createAuthError, 
  handleAuthError, 
  mergeCallCenterData,
  trackPerformance,
  retryOperation 
} from '../utils/authHelpers';
import { AUTH_TIMEOUTS } from '../constants/authConstants';

/**
 * فئة إدارة بيانات المستخدم
 */
export class UserDataManager {
  private userDataCache: Map<string, UserDataCacheItem> = new Map();
  private fetchingUsers: Set<string> = new Set();

  /**
   * جلب بيانات المستخدم مع cache
   */
  async fetchUserData(user: SupabaseUser): Promise<{
    userProfile: UserProfile | null;
    organization: Organization | null;
    error: AuthError | null;
  }> {
    if (!user || !user.id) {
      return {
        userProfile: null,
        organization: null,
        error: createAuthError('معرف المستخدم مطلوب', 'VALIDATION')
      };
    }

    const startTime = performance.now();
    const userId = user.id;

    // منع multiple fetches للمستخدم نفسه
    if (this.fetchingUsers.has(userId)) {
      return new Promise((resolve) => {
        const checkFetching = () => {
          if (!this.fetchingUsers.has(userId)) {
            this.fetchUserData(user).then(resolve);
          } else {
            setTimeout(checkFetching, 100);
          }
        };
        checkFetching();
      });
    }

    // التحقق من cache صالح
    const cached = this.userDataCache.get(userId);
    if (cached && this.isValidCache(cached)) {
      trackPerformance('fetchUserData (cache)', startTime);
      return {
        userProfile: cached.data.userProfile,
        organization: cached.data.organization,
        error: null
      };
    }

    // استخدام البيانات المحفوظة كنقطة بداية سريعة - ولكن فقط إذا كانت تحتوي على صلاحيات
    const savedData = loadUserDataFromStorage();
    if (savedData.userProfile && savedData.userProfile.id === userId) {
      // التحقق من أن البيانات المحفوظة تحتوي على صلاحيات
      const hasValidPermissions = savedData.userProfile.permissions && 
        Object.keys(savedData.userProfile.permissions).length > 0;
      
      // إذا لم تكن هناك صلاحيات صحيحة، اجبر جلب البيانات الجديدة
      if (!hasValidPermissions) {
        if (process.env.NODE_ENV === 'development') {
        }
      } else {
        // التحقق من عمر البيانات المحفوظة قبل التحديث في الخلفية
        const savedTimestamp = savedData.userProfile.updated_at ? 
          new Date(savedData.userProfile.updated_at).getTime() : 0;
        const now = Date.now();
        const dataAge = now - savedTimestamp;
        
        // تحديث في الخلفية فقط إذا كانت البيانات قديمة (أكثر من 10 دقائق)
        if (dataAge > 10 * 60 * 1000) {
          // منع التحديث المتكرر
          const lastBackgroundUpdate = this.backgroundRefreshTimestamps.get(user.id) || 0;
          if (now - lastBackgroundUpdate > 5 * 60 * 1000) { // 5 دقائق بين التحديثات
            this.refreshUserDataInBackground(user);
          }
        }
        
        trackPerformance('fetchUserData (saved)', startTime);
        return {
          userProfile: savedData.userProfile,
          organization: savedData.organization,
          error: null
        };
      }
    }

    // بدء عملية تحميل جديدة
    this.fetchingUsers.add(userId);

    try {
      const result = await this.fetchUserDataFromAPI(user);
      
      // حفظ في cache
      if (result.userProfile) {
        this.userDataCache.set(userId, {
          userId,
          timestamp: Date.now(),
          data: {
            userProfile: result.userProfile,
            organization: result.organization
          }
        });

        // حفظ في localStorage
        saveUserDataToStorage(
          result.userProfile, 
          result.organization, 
          result.userProfile.organization_id
        );
      }

      trackPerformance('fetchUserData (API)', startTime);
      return result;

    } catch (error) {
      const authError = handleAuthError(error);
      
      // استخدام البيانات المحفوظة عند الخطأ
      if (savedData.userProfile && savedData.userProfile.id === userId) {
        return {
          userProfile: savedData.userProfile,
          organization: savedData.organization,
          error: null
        };
      }

      return {
        userProfile: null,
        organization: null,
        error: authError
      };
    } finally {
      this.fetchingUsers.delete(userId);
    }
  }

  /**
   * إجبار تحديث بيانات المستخدم من API
   */
  async forceRefreshUserData(user: SupabaseUser): Promise<{
    userProfile: UserProfile | null;
    organization: Organization | null;
    error: AuthError | null;
  }> {
    if (!user || !user.id) {
      return {
        userProfile: null,
        organization: null,
        error: createAuthError('معرف المستخدم مطلوب', 'VALIDATION')
      };
    }

    const startTime = performance.now();
    const userId = user.id;

    // مسح cache للمستخدم
    this.userDataCache.delete(userId);
    
    // منع multiple fetches للمستخدم نفسه
    if (this.fetchingUsers.has(userId)) {
      return new Promise((resolve) => {
        const checkFetching = () => {
          if (!this.fetchingUsers.has(userId)) {
            this.forceRefreshUserData(user).then(resolve);
          } else {
            setTimeout(checkFetching, 100);
          }
        };
        checkFetching();
      });
    }

    // بدء عملية تحميل جديدة
    this.fetchingUsers.add(userId);

    try {
      const result = await this.fetchUserDataFromAPI(user);
      
      // حفظ في cache
      if (result.userProfile) {
        this.userDataCache.set(userId, {
          userId,
          timestamp: Date.now(),
          data: {
            userProfile: result.userProfile,
            organization: result.organization
          }
        });

        // حفظ في localStorage
        saveUserDataToStorage(
          result.userProfile, 
          result.organization, 
          result.userProfile.organization_id
        );
      }

      trackPerformance('forceRefreshUserData (API)', startTime);
      return result;

    } catch (error) {
      const authError = handleAuthError(error);
      return {
        userProfile: null,
        organization: null,
        error: authError
      };
    } finally {
      this.fetchingUsers.delete(userId);
    }
  }

  /**
   * جلب بيانات المستخدم من API
   */
  private async fetchUserDataFromAPI(user: SupabaseUser): Promise<{
    userProfile: UserProfile | null;
    organization: Organization | null;
    error: AuthError | null;
  }> {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!isOnline) {
      const savedData = loadUserDataFromStorage();
      if (savedData.userProfile && savedData.userProfile.id === user.id) {
        return {
          userProfile: savedData.userProfile,
          organization: savedData.organization,
          error: null
        };
      }

      return {
        userProfile: null,
        organization: null,
        error: createAuthError('الاتصال غير متاح حالياً', 'NETWORK')
      };
    }

    try {
      console.log('🔍 [UserDataManager] بدء جلب بيانات المستخدم', { userId: user.id });
      
      // استخدام getUserByAuthId مباشرة للحصول على بيانات المستخدم
      const { getUserByAuthId } = await import('@/lib/api/deduplicatedApi');
      console.log('📦 [UserDataManager] تم استيراد getUserByAuthId');
      
      let profile = await getUserByAuthId(user.id);
      console.log('✅ [UserDataManager] نتيجة getUserByAuthId:', { hasProfile: !!profile });
      
      if (!profile) {
        console.log('⚠️ [UserDataManager] لم يتم العثور على البروفايل، استخدام fallback');
        // fallback للطريقة القديمة
        const profilePromise = getCurrentUserProfile();
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), AUTH_TIMEOUTS.LOADING_TIMEOUT)
        );
        
        profile = await Promise.race([profilePromise, timeoutPromise]);
        console.log('✅ [UserDataManager] نتيجة getCurrentUserProfile:', { hasProfile: !!profile });
        
        if (!profile) {
          throw new Error('لم يتم العثور على بيانات المستخدم');
        }
      }

      if (profile) {
        // دمج بيانات مركز الاتصال
        profile = await mergeCallCenterData(profile);

        let organization = null;
        if (profile.organization_id) {
          try {
            organization = await retryOperation(
              () => getOrganizationById(profile.organization_id!),
              2, // محاولتان فقط للمؤسسة
              1000
            );
          } catch (orgError) {
            // استكمال بدون المؤسسة إذا فشل جلبها
            if (process.env.NODE_ENV === 'development') {
            }
          }
        }

        return {
          userProfile: profile as UserProfile,
          organization,
          error: null
        };
      }

      return {
        userProfile: null,
        organization: null,
        error: createAuthError('لم يتم العثور على بيانات المستخدم', 'VALIDATION')
      };

    } catch (error) {
      throw handleAuthError(error);
    }
  }

  // متغير لمنع التحديث المتكرر في الخلفية
  private backgroundRefreshTimestamps: Map<string, number> = new Map();
  private readonly BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 دقائق لمنع التكرار
  private readonly BACKGROUND_REFRESH_DEBOUNCE = 2 * 60 * 1000; // 2 دقيقة للتأخير

  /**
   * تحديث بيانات المستخدم في الخلفية
   */
  private async refreshUserDataInBackground(user: SupabaseUser): Promise<void> {
    const userId = user.id;
    const now = Date.now();
    const lastRefresh = this.backgroundRefreshTimestamps.get(userId) || 0;
    
    // منع التحديث المتكرر
    if (now - lastRefresh < this.BACKGROUND_REFRESH_INTERVAL) {
      return;
    }
    
    // تأخير إضافي لمنع التحديث المتزامن
    if (now - lastRefresh < this.BACKGROUND_REFRESH_DEBOUNCE) {
      return;
    }
    
    this.backgroundRefreshTimestamps.set(userId, now);
    
    try {
      // تأخير قصير لعدم حجب الواجهة
      setTimeout(async () => {
        const result = await this.fetchUserDataFromAPI(user);
        
        if (result.userProfile) {
          // تحديث cache
          this.userDataCache.set(user.id, {
            userId: user.id,
            timestamp: Date.now(),
            data: {
              userProfile: result.userProfile,
              organization: result.organization
            }
          });

          // تحديث localStorage
          saveUserDataToStorage(
            result.userProfile, 
            result.organization, 
            result.userProfile.organization_id
          );

          if (process.env.NODE_ENV === 'development') {
          }
        }
      }, 1000);
    } catch (error) {
      // تجاهل أخطاء التحديث في الخلفية
    }
  }

  /**
   * تحديث ملف المستخدم
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{
    success: boolean;
    error: AuthError | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        const authError = handleAuthError(error);
        return { success: false, error: authError };
      }

      // تحديث cache
      const cached = this.userDataCache.get(userId);
      if (cached) {
        cached.data.userProfile = { ...cached.data.userProfile, ...updates } as UserProfile;
        cached.timestamp = Date.now();
      }

      // تحديث localStorage
      if (data) {
        const savedData = loadUserDataFromStorage();
        if (savedData.userProfile && savedData.userProfile.id === userId) {
          const updatedProfile = { ...savedData.userProfile, ...updates };
          saveUserDataToStorage(updatedProfile, savedData.organization, updatedProfile.organization_id);
        }
      }

      return { success: true, error: null };

    } catch (error) {
      const authError = handleAuthError(error);
      return { success: false, error: authError };
    }
  }

  /**
   * التحقق من صحة cache
   */
  private isValidCache(cache: UserDataCacheItem): boolean {
    const now = Date.now();
    return (now - cache.timestamp) < AUTH_TIMEOUTS.PROFILE_CACHE_DURATION;
  }

  /**
   * مسح cache المستخدم
   */
  clearUserCache(userId?: string): void {
    if (userId) {
      this.userDataCache.delete(userId);
    } else {
      this.userDataCache.clear();
    }

    if (process.env.NODE_ENV === 'development') {
    }
  }

  /**
   * تنظيف cache منتهي الصلاحية
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.userDataCache.forEach((cache, userId) => {
      if (!this.isValidCache(cache)) {
        keysToDelete.push(userId);
      }
    });

    keysToDelete.forEach(userId => this.userDataCache.delete(userId));

    if (process.env.NODE_ENV === 'development' && keysToDelete.length > 0) {
    }
  }

  /**
   * إحصائيات cache
   */
  getCacheStats() {
    return {
      cacheSize: this.userDataCache.size,
      fetchingUsersCount: this.fetchingUsers.size,
      fetchingUsers: Array.from(this.fetchingUsers)
    };
  }

  /**
   * تنظيف الموارد
   */
  cleanup(): void {
    this.userDataCache.clear();
    this.fetchingUsers.clear();
  }
}

// إنشاء instance مشترك
export const userDataManager = new UserDataManager();
