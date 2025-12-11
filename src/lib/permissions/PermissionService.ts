/**
 * خدمة الصلاحيات الموحدة
 * Single Source of Truth للتحقق من الصلاحيات
 * تدعم العمل Online و Offline
 * تاريخ الإنشاء: 2025-12-10
 */

import {
  Permission,
  UserRole,
  PERMISSION_HIERARCHY,
  ROLE_PERMISSIONS,
  UserPermissionData,
  isAdminRole,
  expandPermissions
} from '@/types/permissions';

// ========================================
// Constants
// ========================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقائق
const STORAGE_KEY_PROFILE = 'userprofile';
const STORAGE_KEY_ORG_ID = 'currentOrganizationId';
const STORAGE_KEY_BAZAAR_ORG = 'bazaar_organization_id';

// ========================================
// PermissionService Class
// ========================================
class PermissionService {
  private static instance: PermissionService;
  private cachedData: UserPermissionData | null = null;
  private cacheExpiry: number = 0;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Initialize from localStorage on creation
    this.loadFromLocalStorage();
  }

  /**
   * Singleton instance
   */
  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  // ========================================
  // Core Permission Check Methods
  // ========================================

  /**
   * فحص صلاحية معينة - الطريقة الرئيسية
   */
  hasPermission(permission: Permission | string): boolean {
    const data = this.getCurrentPermissions();
    if (!data) {
      console.warn('[PermissionService] No permission data available');
      return false;
    }

    // المستخدم غير نشط
    if (!data.isActive) {
      return false;
    }

    // Super Admin لديه جميع الصلاحيات
    if (data.isSuperAdmin) {
      return true;
    }

    // Org Admin لديه جميع الصلاحيات في المؤسسة
    if (data.isOrgAdmin) {
      return true;
    }

    // Admin / Owner roles
    if (isAdminRole(data.role)) {
      return true;
    }

    // التحقق من الصلاحية المباشرة
    if (data.permissions[permission] === true) {
      return true;
    }

    // التحقق من الصلاحيات الأبوية
    return this.checkParentPermission(permission, data.permissions);
  }

  /**
   * فحص أي صلاحية من قائمة
   */
  hasAnyPermission(permissions: (Permission | string)[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * فحص جميع الصلاحيات
   */
  hasAllPermissions(permissions: (Permission | string)[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * الحصول على جميع الصلاحيات الفعلية (المباشرة + الموروثة)
   */
  getEffectivePermissions(): Record<string, boolean> {
    const data = this.getCurrentPermissions();
    if (!data) return {};

    // Admin roles لديهم جميع الصلاحيات
    if (data.isSuperAdmin || data.isOrgAdmin || isAdminRole(data.role)) {
      const allPerms: Record<string, boolean> = {};
      for (const perm of Object.values(Permission)) {
        allPerms[perm] = true;
      }
      return allPerms;
    }

    return expandPermissions(data.permissions);
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * التحقق من الصلاحيات الأبوية
   */
  private checkParentPermission(
    permission: Permission | string,
    userPermissions: Record<string, boolean>
  ): boolean {
    for (const [parent, children] of Object.entries(PERMISSION_HIERARCHY)) {
      if (children.includes(permission as string) && userPermissions[parent] === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * الحصول على الصلاحيات الحالية (من Cache أو localStorage)
   */
  getCurrentPermissions(): UserPermissionData | null {
    // التحقق من الكاش
    if (this.cachedData && Date.now() < this.cacheExpiry) {
      return this.cachedData;
    }

    // تحميل من localStorage
    const loaded = this.loadFromLocalStorage();
    if (loaded) {
      this.cachedData = loaded;
      this.cacheExpiry = Date.now() + CACHE_TTL_MS;
      return loaded;
    }

    return null;
  }

  // ========================================
  // Storage Methods
  // ========================================

  /**
   * القراءة من localStorage
   */
  loadFromLocalStorage(): UserPermissionData | null {
    try {
      const userProfileStr = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (!userProfileStr) return null;

      const profile = JSON.parse(userProfileStr);
      if (!profile || !profile.id) return null;

      const orgId = localStorage.getItem(STORAGE_KEY_ORG_ID)
        || localStorage.getItem(STORAGE_KEY_BAZAAR_ORG)
        || profile.organization_id;

      // تحويل الصلاحيات من أي شكل
      let permissions: Record<string, boolean> = {};
      if (profile.permissions) {
        if (typeof profile.permissions === 'string') {
          try {
            permissions = JSON.parse(profile.permissions);
          } catch {
            permissions = {};
          }
        } else if (typeof profile.permissions === 'object') {
          permissions = profile.permissions;
        }
      }

      const data: UserPermissionData = {
        userId: profile.id || '',
        authUserId: profile.auth_user_id || profile.id || '',
        email: profile.email || '',
        name: profile.name || '',
        organizationId: orgId || null,
        role: profile.role || UserRole.AUTHENTICATED,
        permissions,
        isOrgAdmin: profile.is_org_admin === true || profile.isOrgAdmin === true,
        isSuperAdmin: profile.is_super_admin === true || profile.isSuperAdmin === true,
        isActive: profile.is_active !== false && profile.isActive !== false
      };

      return data;
    } catch (error) {
      console.error('[PermissionService] Error loading from localStorage:', error);
      return null;
    }
  }

  /**
   * الحفظ في localStorage
   */
  saveToLocalStorage(data: UserPermissionData): void {
    try {
      const existing = localStorage.getItem(STORAGE_KEY_PROFILE);
      const profile = existing ? JSON.parse(existing) : {};

      const updated = {
        ...profile,
        id: data.userId || profile.id,
        auth_user_id: data.authUserId || profile.auth_user_id,
        email: data.email || profile.email,
        name: data.name || profile.name,
        organization_id: data.organizationId || profile.organization_id,
        role: data.role || profile.role,
        permissions: data.permissions,
        is_org_admin: data.isOrgAdmin,
        is_super_admin: data.isSuperAdmin,
        is_active: data.isActive
      };

      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));

      // تحديث الكاش
      this.cachedData = data;
      this.cacheExpiry = Date.now() + CACHE_TTL_MS;

      // إخطار المستمعين
      this.notifyListeners();
    } catch (error) {
      console.error('[PermissionService] Error saving to localStorage:', error);
    }
  }

  /**
   * تحميل الصلاحيات من SQLite (للأوفلاين)
   */
  async loadFromSQLite(authUserId: string): Promise<UserPermissionData | null> {
    try {
      // التحقق من وجود Electron API
      if (!window.electronAPI?.db) {
        return null;
      }

      const orgId = localStorage.getItem(STORAGE_KEY_ORG_ID)
        || localStorage.getItem(STORAGE_KEY_BAZAAR_ORG);

      let sql = 'SELECT * FROM user_permissions WHERE auth_user_id = ?';
      const params: string[] = [authUserId];

      if (orgId) {
        sql += ' AND organization_id = ?';
        params.push(orgId);
      }

      sql += ' ORDER BY updated_at DESC LIMIT 1';

      const result = await window.electronAPI.db.queryOne(sql, params);
      const rec = result?.data;

      if (!rec) {
        return null;
      }

      // تحويل الصلاحيات
      let permissions: Record<string, boolean> = {};
      if (rec.permissions) {
        if (typeof rec.permissions === 'string') {
          try {
            permissions = JSON.parse(rec.permissions);
          } catch {
            permissions = {};
          }
        } else {
          permissions = rec.permissions;
        }
      }

      const data: UserPermissionData = {
        userId: rec.user_id || authUserId,
        authUserId: rec.auth_user_id || authUserId,
        email: rec.email || '',
        name: rec.name || '',
        organizationId: rec.organization_id || null,
        role: rec.role || UserRole.AUTHENTICATED,
        permissions,
        isOrgAdmin: rec.is_org_admin === 1 || rec.is_org_admin === true,
        isSuperAdmin: rec.is_super_admin === 1 || rec.is_super_admin === true,
        isActive: rec.is_active !== 0 && rec.is_active !== false,
        lastSyncedAt: rec.last_synced_at || rec.updated_at
      };

      console.log('[PermissionService] Loaded from SQLite:', {
        authUserId,
        role: data.role,
        permCount: Object.keys(permissions).length
      });

      return data;
    } catch (error) {
      console.error('[PermissionService] Error loading from SQLite:', error);
      return null;
    }
  }

  /**
   * حفظ الصلاحيات في SQLite
   */
  async saveToSQLite(data: UserPermissionData): Promise<boolean> {
    try {
      if (!window.electronAPI?.db) {
        return false;
      }

      const id = `${data.organizationId || 'global'}:${data.authUserId}`;
      const now = new Date().toISOString();
      const permissionsJson = JSON.stringify(data.permissions || {});

      const sql = `
        INSERT OR REPLACE INTO user_permissions (
          id, auth_user_id, user_id, email, name, role, organization_id,
          is_active, is_org_admin, is_super_admin, permissions,
          last_synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        data.authUserId,
        data.userId,
        data.email || '',
        data.name || '',
        data.role,
        data.organizationId || null,
        data.isActive ? 1 : 0,
        data.isOrgAdmin ? 1 : 0,
        data.isSuperAdmin ? 1 : 0,
        permissionsJson,
        now,
        now,
        now
      ];

      const result = await window.electronAPI.db.execute(sql, params);

      if (result?.success) {
        console.log('[PermissionService] Saved to SQLite:', {
          authUserId: data.authUserId,
          role: data.role,
          permCount: Object.keys(data.permissions).length
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PermissionService] Error saving to SQLite:', error);
      return false;
    }
  }

  // ========================================
  // Cache Management
  // ========================================

  /**
   * مسح الكاش
   */
  clearCache(): void {
    this.cachedData = null;
    this.cacheExpiry = 0;
    this.notifyListeners();
  }

  /**
   * تحديث البيانات
   */
  updatePermissions(data: UserPermissionData): void {
    this.cachedData = data;
    this.cacheExpiry = Date.now() + CACHE_TTL_MS;
    this.saveToLocalStorage(data);
    this.notifyListeners();
  }

  // ========================================
  // Event Listeners
  // ========================================

  /**
   * إضافة مستمع لتغييرات الصلاحيات
   */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * إخطار المستمعين
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[PermissionService] Listener error:', error);
      }
    });
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * التحقق من أن المستخدم مدير
   */
  isAdmin(): boolean {
    const data = this.getCurrentPermissions();
    if (!data) return false;
    return data.isSuperAdmin || data.isOrgAdmin || isAdminRole(data.role);
  }

  /**
   * التحقق من أن المستخدم Super Admin
   */
  isSuperAdmin(): boolean {
    return this.getCurrentPermissions()?.isSuperAdmin === true;
  }

  /**
   * التحقق من أن المستخدم Org Admin
   */
  isOrgAdmin(): boolean {
    return this.getCurrentPermissions()?.isOrgAdmin === true;
  }

  /**
   * الحصول على الدور الحالي
   */
  getRole(): string | null {
    return this.getCurrentPermissions()?.role || null;
  }

  /**
   * الحصول على organization_id الحالي
   */
  getOrganizationId(): string | null {
    return this.getCurrentPermissions()?.organizationId || null;
  }

  /**
   * التحقق من جاهزية الخدمة
   */
  isReady(): boolean {
    return this.getCurrentPermissions() !== null;
  }
}

// ========================================
// Export Singleton
// ========================================
export const permissionService = PermissionService.getInstance();
export default permissionService;

// ========================================
// Type Declaration for Window
// ========================================
declare global {
  interface Window {
    electronAPI?: {
      db?: {
        queryOne: (sql: string, params?: any[]) => Promise<{ data: any }>;
        query: (sql: string, params?: any[]) => Promise<{ data: any[] }>;
        execute: (sql: string, params?: any[]) => Promise<{ success: boolean; changes?: number; error?: string }>;
      };
    };
  }
}
