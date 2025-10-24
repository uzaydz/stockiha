/**
 * خدمة إدارة الصلاحيات
 * توفر واجهة موحدة للتعامل مع صلاحيات المستخدم
 */

import { supabase } from '@/lib/supabase';
import type { UnifiedPermissionsData, PermissionMap } from '../types';

export class PermissionsService {
  private cache: Map<string, UnifiedPermissionsData> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 دقائق

  /**
   * جلب الصلاحيات الموحدة للمستخدم الحالي
   */
  async fetchUnified(): Promise<UnifiedPermissionsData> {
    try {
      // التحقق من الكاش أولاً
      const cacheKey = 'unified_permissions';
      const cached = this.cache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // جلب البيانات من قاعدة البيانات
      const { data, error } = await supabase.rpc('get_user_with_permissions_unified', {
        p_auth_user_id: null,
        p_include_subscription_data: true,
        p_calculate_permissions: true,
      });
      
      if (error) {
        throw new Error(`فشل في جلب الصلاحيات: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('لم يتم العثور على صلاحيات للمستخدم');
      }

      const permissionsData: UnifiedPermissionsData = {
        user_id: data[0].user_id,
        organization_id: data[0].organization_id,
        permissions: (data[0].permissions as PermissionMap) || {},
        role: data[0].role || 'user',
        subscription_tier: data[0].subscription_tier,
        subscription_status: data[0].subscription_status,
        last_updated: new Date().toISOString(),
      };

      // حفظ في الكاش
      this.cache.set(cacheKey, permissionsData);
      
      return permissionsData;
    } catch (error) {
      console.error('خطأ في جلب الصلاحيات:', error);
      throw error;
    }
  }

  /**
   * التحقق من صلاحية معينة
   */
  hasPermission(permissions: PermissionMap, permission: string): boolean {
    return permissions[permission] === true;
  }

  /**
   * التحقق من عدة صلاحيات
   */
  hasAnyPermission(permissions: PermissionMap, permissionList: string[]): boolean {
    return permissionList.some(permission => this.hasPermission(permissions, permission));
  }

  /**
   * التحقق من جميع الصلاحيات
   */
  hasAllPermissions(permissions: PermissionMap, permissionList: string[]): boolean {
    return permissionList.every(permission => this.hasPermission(permissions, permission));
  }

  /**
   * جلب الصلاحيات الافتراضية
   */
  getDefaultPermissions(): PermissionMap {
    return {
      'read:profile': true,
      'update:profile': true,
      'read:organization': false,
      'update:organization': false,
      'manage:users': false,
      'manage:settings': false,
    };
  }

  /**
   * التحقق من صحة الكاش
   */
  private isCacheValid(data: UnifiedPermissionsData): boolean {
    const now = Date.now();
    const lastUpdated = new Date(data.last_updated).getTime();
    return (now - lastUpdated) < this.cacheTimeout;
  }

  /**
   * مسح الكاش
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * مسح كاش محدد
   */
  clearCacheForUser(userId: string): void {
    const cacheKey = `user_${userId}_permissions`;
    this.cache.delete(cacheKey);
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const permissionsService = new PermissionsService();