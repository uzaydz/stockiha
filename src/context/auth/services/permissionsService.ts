/**
 * خدمة إدارة الصلاحيات
 *
 * ⚡ تم التحديث لدعم SQLite + Offline-First
 *
 * - تخزين الصلاحيات محلياً في SQLite
 * - العمل بدون إنترنت
 * - المزامنة التلقائية عند الاتصال
 */

import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type { UnifiedPermissionsData, PermissionMap } from '../types';

// نوع بيانات الصلاحيات المحلية
interface LocalPermissionsData {
  id: string;
  user_id: string;
  organization_id: string;
  permissions: string; // JSON string
  role: string;
  subscription_tier?: string;
  subscription_status?: string;
  created_at: string;
  updated_at: string;
  last_server_sync?: string;
}

const getOrgId = (): string => {
  return (
    localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') ||
    ''
  );
};

export class PermissionsService {
  private memoryCache: Map<string, UnifiedPermissionsData> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 دقائق

  /**
   * جلب الصلاحيات الموحدة للمستخدم الحالي
   * - محلياً أولاً (Offline-First)
   * - ثم من السيرفر إذا كنا أونلاين
   */
  async fetchUnified(): Promise<UnifiedPermissionsData> {
    try {
      // التحقق من الكاش في الذاكرة أولاً
      const cacheKey = 'unified_permissions';
      const cached = this.memoryCache.get(cacheKey);

      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // التحقق من الصلاحيات المحلية في SQLite
      const orgId = getOrgId();
      const userId = localStorage.getItem('bazaar_user_id') || '';

      if (orgId && userId) {
        const localPermissions = await this.getLocalPermissions(userId, orgId);
        if (localPermissions) {
          // حفظ في الكاش في الذاكرة
          this.memoryCache.set(cacheKey, localPermissions);

          // محاولة تحديث من السيرفر في الخلفية إذا كنا أونلاين
          if (navigator.onLine) {
            this.syncFromServerBackground();
          }

          return localPermissions;
        }
      }

      // إذا لم تكن متوفرة محلياً، جلب من السيرفر
      if (navigator.onLine) {
        // محاولة الحصول على معرف المستخدم الحالي من Supabase Auth إذا لم يكن متوفراً
        let effectiveUserId = userId;
        if (!effectiveUserId) {
          const { data: { session } } = await supabase.auth.getSession();
          effectiveUserId = session?.user?.id || '';
        }

        const serverData = await this.fetchFromServer(effectiveUserId);
        return serverData;
      }

      // إذا لم نكن متصلين وليس هناك بيانات محلية
      return this.getDefaultUnifiedData();

    } catch (error) {
      console.error('خطأ في جلب الصلاحيات:', error);

      // محاولة استخدام البيانات المحلية كحل احتياطي
      const orgId = getOrgId();
      const userId = localStorage.getItem('bazaar_user_id') || '';

      if (orgId && userId) {
        const localPermissions = await this.getLocalPermissions(userId, orgId);
        if (localPermissions) {
          return localPermissions;
        }
      }

      return this.getDefaultUnifiedData();
    }
  }

  /**
   * جلب الصلاحيات المحلية من SQLite
   */
  private async getLocalPermissions(userId: string, organizationId: string): Promise<UnifiedPermissionsData | null> {
    try {
      const records = await deltaWriteService.getAll<LocalPermissionsData>('permissions' as any, organizationId, {
        where: 'user_id = ?',
        params: [userId],
        limit: 1
      });

      if (records.length > 0) {
        const record = records[0];
        let permissions: PermissionMap = {};

        try {
          permissions = JSON.parse(record.permissions);
        } catch {
          permissions = {};
        }

        return {
          user_id: record.user_id,
          organization_id: record.organization_id,
          permissions,
          role: record.role || 'user',
          subscription_tier: record.subscription_tier,
          subscription_status: record.subscription_status,
          last_updated: record.updated_at,
        };
      }

      return null;
    } catch (error) {
      console.warn('[PermissionsService] Failed to get local permissions:', error);
      return null;
    }
  }

  /**
   * جلب الصلاحيات من السيرفر وحفظها محلياً
   */
  private async fetchFromServer(userId?: string): Promise<UnifiedPermissionsData> {
    const { data, error } = await supabase.rpc('get_user_with_permissions_unified', {
      p_auth_user_id: userId || null,
      p_include_subscription_data: true,
      p_calculate_permissions: true,
    });

    if (error) {
      throw new Error(`فشل في جلب الصلاحيات: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // إذا كان لدينا userId ولكن لم نجد بيانات، قد يكون بسبب مشكلة في المزامنة
      // نعيد كائن فارغ بدلاً من رمي خطأ للسماح بالعمل
      if (userId) {
         console.warn('[PermissionsService] No permissions found for user, returning default');
         return {
            user_id: userId,
            organization_id: '',
            permissions: {},
            role: 'authenticated',
            last_updated: new Date().toISOString()
         };
      }
      throw new Error('لم يتم العثور على صلاحيات للمستخدم');
    }

    const now = new Date().toISOString();
    const permissionsData: UnifiedPermissionsData = {
      user_id: data[0].user_id,
      organization_id: data[0].organization_id,
      permissions: (data[0].permissions as PermissionMap) || {},
      role: data[0].role || 'user',
      subscription_tier: data[0].subscription_tier,
      subscription_status: data[0].subscription_status,
      last_updated: now,
    };

    // حفظ في الكاش في الذاكرة
    this.memoryCache.set('unified_permissions', permissionsData);

    // حفظ محلياً في SQLite
    await this.saveLocalPermissions(permissionsData);

    return permissionsData;
  }

  /**
   * حفظ الصلاحيات محلياً
   */
  private async saveLocalPermissions(data: UnifiedPermissionsData): Promise<void> {
    try {
      const now = new Date().toISOString();
      const recordId = `${data.user_id}_${data.organization_id}`;

      const localRecord: LocalPermissionsData = {
        id: recordId,
        user_id: data.user_id,
        organization_id: data.organization_id,
        permissions: JSON.stringify(data.permissions),
        role: data.role,
        subscription_tier: data.subscription_tier,
        subscription_status: data.subscription_status,
        created_at: now,
        updated_at: now,
        last_server_sync: now,
      };

      await deltaWriteService.saveFromServer('permissions' as any, localRecord);
      console.log('[PermissionsService] ⚡ Saved permissions locally');
    } catch (error) {
      console.error('[PermissionsService] Failed to save local permissions:', error);
    }
  }

  /**
   * مزامنة من السيرفر في الخلفية
   */
  private async syncFromServerBackground(): Promise<void> {
    try {
      await this.fetchFromServer();
    } catch (error) {
      console.warn('[PermissionsService] Background sync failed:', error);
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
   * جلب بيانات موحدة افتراضية
   */
  private getDefaultUnifiedData(): UnifiedPermissionsData {
    return {
      user_id: '',
      organization_id: '',
      permissions: this.getDefaultPermissions(),
      role: 'user',
      last_updated: new Date().toISOString(),
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
    this.memoryCache.clear();
  }

  /**
   * مسح كاش محدد
   */
  clearCacheForUser(userId: string): void {
    const cacheKey = `user_${userId}_permissions`;
    this.memoryCache.delete(cacheKey);
    this.memoryCache.delete('unified_permissions');
  }

  /**
   * فرض إعادة المزامنة من السيرفر
   */
  async forceSync(): Promise<UnifiedPermissionsData> {
    this.clearCache();

    if (navigator.onLine) {
      return await this.fetchFromServer();
    }

    return await this.fetchUnified();
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const permissionsService = new PermissionsService();
