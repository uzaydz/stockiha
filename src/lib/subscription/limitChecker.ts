/**
 * خدمة التحقق من حدود الاشتراك
 *
 * ⚡ Offline-First: تعمل أوفلاين وأونلاين
 * 🔒 تتحقق من الحدود قبل إنشاء المنتجات والموظفين
 */

import { supabase } from '@/lib/supabase';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { offlineSubscriptionService } from '@/api/offlineSubscriptionService';
import { SubscriptionService } from '@/lib/subscription-service';
import type { LimitCheckResult } from '@/types/subscription';

export interface LimitCheckResponse {
  allowed: boolean;
  currentCount: number;
  maxLimit: number | null;
  remaining: number | undefined;
  unlimited: boolean;
  message: string;
}

/**
 * خدمة التحقق من الحدود - Offline-First
 */
export const limitChecker = {
  /**
   * التحقق من إمكانية إضافة منتج جديد
   * ⚡ يعمل أوفلاين وأونلاين
   */
  async canAddProduct(organizationId: string): Promise<LimitCheckResponse> {
    try {
      // جلب عدد المنتجات الحالي
      const currentCount = await this.getProductCount(organizationId);

      // التحقق من الحد
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      let result: LimitCheckResult;

      if (isOnline) {
        // أونلاين: استخدام RPC function من Supabase
        result = await SubscriptionService.checkProductLimit(organizationId);
      } else {
        // أوفلاين: استخدام البيانات المحلية
        result = await offlineSubscriptionService.checkProductLimitOffline(organizationId, currentCount);
      }

      return {
        allowed: result.allowed,
        currentCount: result.current,
        maxLimit: result.limit,
        remaining: result.remaining,
        unlimited: result.unlimited,
        message: result.allowed
          ? (result.unlimited
              ? 'عدد المنتجات غير محدود'
              : `يمكنك إضافة ${result.remaining} منتج إضافي`)
          : `لقد وصلت للحد الأقصى من المنتجات (${result.limit}). يرجى ترقية خطتك.`
      };
    } catch (error) {
      console.error('[LimitChecker] Error checking product limit:', error);
      // في حالة الخطأ، نسمح بالإضافة مع تحذير
      return {
        allowed: true,
        currentCount: 0,
        maxLimit: null,
        remaining: undefined,
        unlimited: true,
        message: 'تعذر التحقق من الحد - مسموح مؤقتاً'
      };
    }
  },

  /**
   * التحقق من إمكانية إضافة موظف/مستخدم جديد
   * ⚡ يعمل أوفلاين وأونلاين
   */
  async canAddUser(organizationId: string): Promise<LimitCheckResponse> {
    try {
      // جلب عدد المستخدمين الحالي
      const currentCount = await this.getUserCount(organizationId);

      // التحقق من الحد
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      let result: LimitCheckResult;

      if (isOnline) {
        // أونلاين: استخدام RPC function من Supabase
        result = await SubscriptionService.checkUserLimit(organizationId);
      } else {
        // أوفلاين: استخدام البيانات المحلية
        result = await offlineSubscriptionService.checkUserLimitOffline(organizationId, currentCount);
      }

      return {
        allowed: result.allowed,
        currentCount: result.current,
        maxLimit: result.limit,
        remaining: result.remaining,
        unlimited: result.unlimited,
        message: result.allowed
          ? (result.unlimited
              ? 'عدد المستخدمين غير محدود'
              : `يمكنك إضافة ${result.remaining} مستخدم إضافي`)
          : `لقد وصلت للحد الأقصى من المستخدمين (${result.limit}). يرجى ترقية خطتك.`
      };
    } catch (error) {
      console.error('[LimitChecker] Error checking user limit:', error);
      // في حالة الخطأ، نسمح بالإضافة مع تحذير
      return {
        allowed: true,
        currentCount: 0,
        maxLimit: null,
        remaining: undefined,
        unlimited: true,
        message: 'تعذر التحقق من الحد - مسموح مؤقتاً'
      };
    }
  },

  /**
   * التحقق من إمكانية إضافة موظف (باستثناء المدراء)
   * ⚡ يعمل أوفلاين وأونلاين
   */
  async canAddStaff(organizationId: string): Promise<LimitCheckResponse> {
    try {
      // جلب عدد الموظفين الحالي (باستثناء المدراء)
      const currentCount = await this.getStaffCount(organizationId);

      // جلب الحدود
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      let maxStaff: number | null = null;

      if (isOnline) {
        // أونلاين: جلب الحدود من السيرفر
        const limits = await SubscriptionService.getOrganizationLimits(organizationId);
        maxStaff = limits?.max_staff ?? null;
      } else {
        // أوفلاين: جلب الحدود المحلية
        const limits = await offlineSubscriptionService.getLocalLimits(organizationId);
        maxStaff = limits.max_staff ?? null;
      }

      const unlimited = maxStaff === null;
      const allowed = unlimited || currentCount < (maxStaff || 0);
      const remaining = unlimited ? undefined : Math.max(0, (maxStaff || 0) - currentCount);

      return {
        allowed,
        currentCount,
        maxLimit: maxStaff,
        remaining,
        unlimited,
        message: allowed
          ? (unlimited
              ? 'عدد الموظفين غير محدود'
              : `يمكنك إضافة ${remaining} موظف إضافي`)
          : `لقد وصلت للحد الأقصى من الموظفين (${maxStaff}). يرجى ترقية خطتك.`
      };
    } catch (error) {
      console.error('[LimitChecker] Error checking staff limit:', error);
      return {
        allowed: true,
        currentCount: 0,
        maxLimit: null,
        remaining: undefined,
        unlimited: true,
        message: 'تعذر التحقق من الحد - مسموح مؤقتاً'
      };
    }
  },

  /**
   * جلب عدد المنتجات الحالي
   * ⚡ يعمل أوفلاين وأونلاين
   */
  async getProductCount(organizationId: string): Promise<number> {
    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        // أونلاين: جلب من Supabase
        const { count, error } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (error) throw error;
        return count || 0;
      } else {
        // أوفلاين: جلب من PowerSync
        const result = await powerSyncService.getAll<{ count: number }>(
          'SELECT COUNT(*) as count FROM products WHERE organization_id = ?',
          [organizationId]
        );
        return result[0]?.count || 0;
      }
    } catch (error) {
      console.error('[LimitChecker] Error getting product count:', error);
      return 0;
    }
  },

  /**
   * جلب عدد المستخدمين الحالي
   * ⚡ يعمل أوفلاين وأونلاين
   */
  async getUserCount(organizationId: string): Promise<number> {
    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        // أونلاين: جلب من Supabase
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (error) throw error;
        return count || 0;
      } else {
        // أوفلاين: جلب من PowerSync
        const result = await powerSyncService.getAll<{ count: number }>(
          'SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND is_active = 1',
          [organizationId]
        );
        return result[0]?.count || 0;
      }
    } catch (error) {
      console.error('[LimitChecker] Error getting user count:', error);
      return 0;
    }
  },

  /**
   * جلب عدد الموظفين (باستثناء المدراء)
   * ⚡ يعمل أوفلاين وأونلاين
   */
  async getStaffCount(organizationId: string): Promise<number> {
    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        // أونلاين: جلب من Supabase
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .neq('role', 'admin');

        if (error) throw error;
        return count || 0;
      } else {
        // أوفلاين: جلب من PowerSync
        const result = await powerSyncService.getAll<{ count: number }>(
          `SELECT COUNT(*) as count FROM users
           WHERE organization_id = ? AND is_active = 1 AND role != 'admin'`,
          [organizationId]
        );
        return result[0]?.count || 0;
      }
    } catch (error) {
      console.error('[LimitChecker] Error getting staff count:', error);
      return 0;
    }
  }
};

export default limitChecker;
