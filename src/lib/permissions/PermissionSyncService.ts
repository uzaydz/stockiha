/**
 * خدمة مزامنة الصلاحيات بين السيرفر والمحلي
 * تتعامل مع الانتقال بين Online و Offline
 * تاريخ الإنشاء: 2025-12-10
 */

import { supabase } from '@/lib/supabase';
import { permissionService } from './PermissionService';
import { UserPermissionData, UserRole } from '@/types/permissions';

// ========================================
// Constants
// ========================================
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 دقائق
const RETRY_DELAY_MS = 30 * 1000; // 30 ثانية
const MAX_RETRIES = 3;

// ========================================
// PermissionSyncService Class
// ========================================
class PermissionSyncService {
  private static instance: PermissionSyncService;
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private retryCount = 0;
  private isInitialized = false;

  // ⚡ v2.0: حفظ references للـ event handlers لإمكانية الإزالة
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  private constructor() {}

  /**
   * Singleton instance
   */
  static getInstance(): PermissionSyncService {
    if (!PermissionSyncService.instance) {
      PermissionSyncService.instance = new PermissionSyncService();
    }
    return PermissionSyncService.instance;
  }

  // ========================================
  // Initialization
  // ========================================

  /**
   * تهيئة الخدمة
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.setupConnectivityListener();
    this.setupVisibilityListener();
    this.startPeriodicSync();
    this.isInitialized = true;

    console.log('[PermissionSyncService] Initialized');
  }

  /**
   * الاستماع لتغييرات الاتصال
   * ⚡ v2.0: حفظ references للإزالة لاحقاً
   */
  private setupConnectivityListener(): void {
    // تأكد من عدم إضافة listeners مكررة
    if (this.onlineHandler) return;

    this.onlineHandler = () => {
      console.log('[PermissionSyncService] Back online - syncing permissions');
      this.retryCount = 0;
      this.syncFromServer();
    };

    this.offlineHandler = () => {
      console.log('[PermissionSyncService] Gone offline - using local permissions');
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  /**
   * الاستماع لتغييرات رؤية الصفحة
   * ⚡ v2.0: حفظ reference للإزالة لاحقاً
   */
  private setupVisibilityListener(): void {
    // تأكد من عدم إضافة listener مكرر
    if (this.visibilityHandler) return;

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        // مزامنة عند العودة للتطبيق
        this.syncFromServer();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * بدء المزامنة الدورية
   */
  startPeriodicSync(intervalMs: number = SYNC_INTERVAL_MS): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncFromServer();
      }
    }, intervalMs);
  }

  /**
   * إيقاف المزامنة الدورية
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * ⚡ v2.0: تنظيف جميع الـ listeners والموارد
   */
  cleanup(): void {
    // إيقاف المزامنة الدورية
    this.stopPeriodicSync();

    // إزالة event listeners
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }

    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    this.isInitialized = false;
    console.log('[PermissionSyncService] Cleaned up');
  }

  // ========================================
  // Sync Methods
  // ========================================

  /**
   * مزامنة الصلاحيات من السيرفر
   */
  async syncFromServer(authUserId?: string): Promise<boolean> {
    if (this.isSyncing) {
      console.log('[PermissionSyncService] Already syncing, skipping...');
      return false;
    }

    if (!navigator.onLine) {
      console.log('[PermissionSyncService] Offline - cannot sync');
      return false;
    }

    this.isSyncing = true;

    try {
      // الحصول على الجلسة الحالية
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user?.id && !authUserId) {
        console.warn('[PermissionSyncService] No authenticated user');
        return false;
      }

      const userId = authUserId || session?.user?.id;

      console.log('[PermissionSyncService] Syncing permissions for user:', userId);

      // استدعاء RPC للحصول على الصلاحيات
      const { data: rows, error } = await supabase.rpc('get_user_with_permissions_unified', {
        p_auth_user_id: userId,
        p_include_subscription_data: false,
        p_calculate_permissions: true
      });

      if (error) {
        console.error('[PermissionSyncService] RPC error:', error.message);
        this.scheduleRetry();
        return false;
      }

      const row = Array.isArray(rows) ? rows[0] : rows;

      if (!row) {
        console.warn('[PermissionSyncService] No permissions data returned');
        return false;
      }

      // تحويل البيانات
      const permissionData: UserPermissionData = {
        userId: row.user_id,
        authUserId: row.auth_user_id,
        email: row.email || '',
        name: row.name || '',
        organizationId: row.organization_id || null,
        role: row.role || UserRole.AUTHENTICATED,
        permissions: row.permissions || {},
        isOrgAdmin: !!row.is_org_admin,
        isSuperAdmin: !!row.is_super_admin,
        isActive: row.is_active !== false,
        lastSyncedAt: new Date().toISOString()
      };

      // إضافة صلاحيات كاملة للمديرين
      if (permissionData.isOrgAdmin || permissionData.isSuperAdmin) {
        permissionData.permissions = {
          ...permissionData.permissions,
          viewInventory: true,
          manageInventory: true,
          manageProducts: true,
          viewProducts: true,
          editProducts: true,
          deleteProducts: true,
          addProducts: true,
          viewOrders: true,
          manageOrders: true,
          viewCustomers: true,
          manageCustomers: true
        };
      }

      // حفظ في localStorage
      permissionService.saveToLocalStorage(permissionData);

      // حفظ في SQLite
      await permissionService.saveToSQLite(permissionData);

      // مسح الكاش لإجبار إعادة القراءة
      permissionService.clearCache();

      console.log('[PermissionSyncService] Synced successfully:', {
        role: permissionData.role,
        isOrgAdmin: permissionData.isOrgAdmin,
        permCount: Object.keys(permissionData.permissions).length
      });

      this.retryCount = 0;
      return true;
    } catch (error) {
      console.error('[PermissionSyncService] Sync error:', error);
      this.scheduleRetry();
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * جدولة إعادة المحاولة
   */
  private scheduleRetry(): void {
    if (this.retryCount >= MAX_RETRIES) {
      console.warn('[PermissionSyncService] Max retries reached');
      return;
    }

    this.retryCount++;
    const delay = RETRY_DELAY_MS * this.retryCount;

    console.log(`[PermissionSyncService] Scheduling retry ${this.retryCount}/${MAX_RETRIES} in ${delay}ms`);

    setTimeout(() => {
      if (navigator.onLine) {
        this.syncFromServer();
      }
    }, delay);
  }

  /**
   * مزامنة إجبارية
   */
  async forceSync(authUserId?: string): Promise<boolean> {
    this.retryCount = 0;
    permissionService.clearCache();
    return this.syncFromServer(authUserId);
  }

  // ========================================
  // Offline Support
  // ========================================

  /**
   * تحميل الصلاحيات للوضع الأوفلاين
   */
  async loadOfflinePermissions(authUserId: string): Promise<UserPermissionData | null> {
    // محاولة التحميل من SQLite أولاً
    const sqliteData = await permissionService.loadFromSQLite(authUserId);
    if (sqliteData) {
      permissionService.updatePermissions(sqliteData);
      return sqliteData;
    }

    // Fallback إلى localStorage
    const localData = permissionService.loadFromLocalStorage();
    if (localData && localData.authUserId === authUserId) {
      return localData;
    }

    // إرجاع صلاحيات افتراضية للأوفلاين
    return this.getDefaultOfflinePermissions(authUserId);
  }

  /**
   * ❌ لا نستخدم صلاحيات افتراضية
   * الصلاحيات يجب أن تكون محفوظة من جلسة أونلاين سابقة
   * إذا لم توجد صلاحيات محفوظة = يجب الاتصال بالإنترنت أولاً
   */
  private getDefaultOfflinePermissions(_authUserId: string): UserPermissionData | null {
    console.warn('[PermissionSyncService] No cached permissions found - user must connect online first');
    // نُرجع null - المستخدم يجب أن يتصل بالإنترنت مرة واحدة على الأقل
    return null;
  }

  // ========================================
  // Status Methods
  // ========================================

  /**
   * التحقق من حالة المزامنة
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * الحصول على آخر وقت مزامنة
   */
  getLastSyncTime(): string | null {
    return permissionService.getCurrentPermissions()?.lastSyncedAt || null;
  }

  /**
   * تدمير الخدمة
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.isInitialized = false;
  }
}

// ========================================
// Export Singleton
// ========================================
export const permissionSyncService = PermissionSyncService.getInstance();
export default permissionSyncService;
