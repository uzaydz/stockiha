/**
 * PermissionsContext - سياق الصلاحيات الموحد
 * تم تحديثه: 2025-12-10 لاستخدام PermissionService الجديد
 * يدعم الأوفلاين الكامل
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkPermission } from '@/components/sidebar/utils';
import { useAuth } from '@/context/AuthContext';
import { loadUserDataFromStorage } from '@/context/auth/utils/authStorage';
import { isAppOnline, markNetworkOffline, markNetworkOnline } from '@/utils/networkStatus';
import { permissionService } from '@/lib/permissions/PermissionService';
import { permissionSyncService } from '@/lib/permissions/PermissionSyncService';
import { PERMISSION_HIERARCHY, isAdminRole } from '@/types/permissions';

// ========================================
// Types
// ========================================
type PermissionMap = Record<string, boolean>;

export interface UnifiedPermissionsData {
  user_id: string;
  auth_user_id: string;
  email: string;
  name: string;
  role: string;
  organization_id: string | null;
  is_active: boolean;
  is_org_admin: boolean;
  is_super_admin: boolean;
  permissions: PermissionMap;
  // Computed
  has_inventory_access?: boolean;
  can_manage_products?: boolean;
  can_view_reports?: boolean;
  can_manage_users?: boolean;
  can_manage_orders?: boolean;
  can_access_pos?: boolean;
  can_manage_settings?: boolean;
}

interface PermissionsContextValue {
  loading: boolean;
  ready: boolean;
  error: string | null;
  data: UnifiedPermissionsData | null;
  has: (permission: string) => boolean;
  anyOf: (perms: string[]) => boolean;
  allOf: (perms: string[]) => boolean;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  role: string | null;
  refresh: () => Promise<void>;
}

export const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

// ========================================
// Constants
// ========================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقائق

let cachedValue: { data: UnifiedPermissionsData | null; ts: number } | null = null;

// ========================================
// Helper Functions
// ========================================

/**
 * تحويل بيانات RPC إلى UnifiedPermissionsData
 */
const parseUnifiedRow = (row: any): UnifiedPermissionsData | null => {
  if (!row) return null;
  return {
    user_id: row.user_id,
    auth_user_id: row.auth_user_id,
    email: row.email || '',
    name: row.name || '',
    role: row.role || 'authenticated',
    organization_id: row.organization_id,
    is_active: row.is_active !== false,
    is_org_admin: !!row.is_org_admin,
    is_super_admin: !!row.is_super_admin,
    permissions: (row.permissions || {}) as PermissionMap,
    has_inventory_access: row.has_inventory_access ?? undefined,
    can_manage_products: row.can_manage_products ?? undefined,
    can_view_reports: row.can_view_reports ?? undefined,
    can_manage_users: row.can_manage_users ?? undefined,
    can_manage_orders: row.can_manage_orders ?? undefined,
    can_access_pos: row.can_access_pos ?? undefined,
    can_manage_settings: row.can_manage_settings ?? undefined,
  };
};

/**
 * التحقق مما إذا كان الخطأ متعلق بالشبكة
 */
const isNetworkError = (err: any): boolean => {
  if (!err) return false;
  const message = String(err.message || err.toString() || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('network disconnected') ||
    message.includes('err_internet_disconnected') ||
    message.includes('net::err') ||
    err.code === 'ERR_NETWORK'
  );
};

/**
 * التحقق من صلاحية أبوية
 */
const checkParentPermission = (permission: string, permissions: PermissionMap): boolean => {
  for (const [parent, children] of Object.entries(PERMISSION_HIERARCHY)) {
    if (children.includes(permission) && permissions[parent] === true) {
      return true;
    }
  }
  return false;
};

// ========================================
// Provider Component
// ========================================
export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UnifiedPermissionsData | null>(null);
  const fetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const maxRetries = 3;

  // تهيئة PermissionSyncService مع cleanup
  useEffect(() => {
    permissionSyncService.initialize();

    // ⚡ Cleanup عند unmount لتجنب memory leaks
    return () => {
      permissionSyncService.cleanup();
    };
  }, []);

  // الحصول على organization_id
  const getCurrentOrgId = useCallback((): string | null => {
    return localStorage.getItem('currentOrganizationId')
      || localStorage.getItem('bazaar_organization_id')
      || null;
  }, []);

  // حفظ الصلاحيات محلياً
  const saveLocal = useCallback(async (perm: UnifiedPermissionsData) => {
    if (!perm || !perm.auth_user_id) return;

    // حفظ عبر PermissionService
    permissionService.saveToLocalStorage({
      userId: perm.user_id,
      authUserId: perm.auth_user_id,
      email: perm.email,
      name: perm.name,
      organizationId: perm.organization_id,
      role: perm.role,
      permissions: perm.permissions,
      isOrgAdmin: perm.is_org_admin,
      isSuperAdmin: perm.is_super_admin,
      isActive: perm.is_active
    });

    // حفظ في SQLite
    await permissionService.saveToSQLite({
      userId: perm.user_id,
      authUserId: perm.auth_user_id,
      email: perm.email,
      name: perm.name,
      organizationId: perm.organization_id,
      role: perm.role,
      permissions: perm.permissions,
      isOrgAdmin: perm.is_org_admin,
      isSuperAdmin: perm.is_super_admin,
      isActive: perm.is_active
    });
  }, []);

  // تحميل الصلاحيات المحلية
  const loadLocal = useCallback(async (authId?: string): Promise<UnifiedPermissionsData | null> => {
    if (!authId) return null;

    // محاولة التحميل من SQLite
    const sqliteData = await permissionService.loadFromSQLite(authId);
    if (sqliteData) {
      return {
        user_id: sqliteData.userId,
        auth_user_id: sqliteData.authUserId,
        email: sqliteData.email || '',
        name: sqliteData.name || '',
        role: sqliteData.role as string,
        organization_id: sqliteData.organizationId,
        is_active: sqliteData.isActive,
        is_org_admin: sqliteData.isOrgAdmin,
        is_super_admin: sqliteData.isSuperAdmin,
        permissions: sqliteData.permissions
      };
    }

    // Fallback إلى localStorage
    const localData = permissionService.loadFromLocalStorage();
    if (localData && localData.authUserId === authId) {
      return {
        user_id: localData.userId,
        auth_user_id: localData.authUserId,
        email: localData.email || '',
        name: localData.name || '',
        role: localData.role as string,
        organization_id: localData.organizationId,
        is_active: localData.isActive,
        is_org_admin: localData.isOrgAdmin,
        is_super_admin: localData.isSuperAdmin,
        permissions: localData.permissions
      };
    }

    // ❌ إذا كنا أوفلاين ولا توجد صلاحيات محفوظة = لا نسمح بالوصول
    // الصلاحيات يجب أن تكون محفوظة من جلسة أونلاين سابقة
    if (!navigator.onLine) {
      console.warn('[PermissionsContext] Offline with no cached permissions - access denied');
      // لا نُرجع صلاحيات افتراضية - يجب الاتصال بالإنترنت أولاً
    }

    return null;
  }, [getCurrentOrgId]);

  // جلب الصلاحيات من السيرفر
  const fetchUnified = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    const isOnline = isAppOnline();

    try {
      // استخدام الكاش إذا كان حديثاً
      const now = Date.now();
      if (cachedValue && now - cachedValue.ts < CACHE_TTL_MS) {
        setData(cachedValue.data);
        setReady(true);
        markNetworkOnline();
        return;
      }

      // إذا كنا أوفلاين
      if (!isOnline) {
        markNetworkOffline({ force: true });
        const saved = loadUserDataFromStorage();
        const fallbackAuthId = user?.id || saved?.userProfile?.id || null;
        const local = await loadLocal(fallbackAuthId || undefined);

        if (local) {
          setData(local);
          setReady(true);
          setError('network_offline');
          return;
        }

        throw new Error('network_offline');
      }

      // التحقق من الجلسة
      let sessionReady = false;
      if (user?.id) {
        sessionReady = true;
      } else {
        for (let i = 0; i < 3; i++) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              sessionReady = true;
              break;
            }
          } catch { }
          if (i < 2) await new Promise(r => setTimeout(r, 500 + (i * 200)));
        }
      }

      if (!sessionReady) {
        const local = await loadLocal(user?.id);
        if (local) {
          setData(local);
          setReady(true);
          return;
        }

        retryCountRef.current++;
        if (retryCountRef.current < maxRetries) {
          setTimeout(() => {
            if (!fetchingRef.current) fetchUnified();
          }, 2000);
        }
        return;
      }

      // استدعاء RPC
      const { data: rows, error: rpcError } = await supabase.rpc('get_user_with_permissions_unified', {
        p_auth_user_id: user?.id || null,
        p_include_subscription_data: false,
        p_calculate_permissions: true
      });

      if (rpcError) {
        console.error('[PermissionsContext] RPC error:', rpcError.message);
        const local = await loadLocal(user?.id);
        if (local) {
          setData(local);
          setReady(true);
          return;
        }
        throw new Error(rpcError.message);
      }

      const row = Array.isArray(rows) ? rows[0] : rows;
      const parsed = parseUnifiedRow(row);

      if (!parsed || !parsed.auth_user_id) {
        const local = await loadLocal(user?.id);
        if (local) {
          setData(local);
          setReady(true);
          return;
        }
        throw new Error('No valid permissions data');
      }

      // إضافة صلاحيات كاملة للمديرين
      if (parsed.is_org_admin || parsed.is_super_admin) {
        parsed.has_inventory_access = true;
        parsed.can_manage_products = true;
        parsed.permissions = {
          ...parsed.permissions,
          viewInventory: true,
          manageInventory: true,
          manageProducts: true,
          viewProducts: true,
          editProducts: true,
          deleteProducts: true,
          addProducts: true
        };
      }

      setData(parsed);
      await saveLocal(parsed);
      cachedValue = { data: parsed, ts: Date.now() };
      setReady(true);
      setError(null);
      retryCountRef.current = 0;
      markNetworkOnline();

    } catch (e: any) {
      console.error('[PermissionsContext] Error:', e?.message);

      if (isNetworkError(e)) {
        markNetworkOffline({ force: true });
      }

      setError(isNetworkError(e) ? 'network_offline' : e?.message);

      // Fallback إلى البيانات المحلية
      const local = await loadLocal(user?.id);
      if (local) {
        setData(local);
        setReady(true);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id, loadLocal, saveLocal]);

  // تأثير لجلب الصلاحيات عند تغيير المستخدم
  useEffect(() => {
    if (user?.id && lastFetchedUserIdRef.current === user.id) return;

    cachedValue = null;
    setData(null);
    setReady(false);
    setError(null);

    if (user) {
      lastFetchedUserIdRef.current = user.id;
      fetchUnified();
    } else {
      lastFetchedUserIdRef.current = null;
    }
  }, [user?.id, fetchUnified]);

  // دالة has - التحقق من صلاحية واحدة
  const has = useCallback((permission: string): boolean => {
    if (!data) return false;

    // Super Admin / Org Admin لديهم جميع الصلاحيات
    if (data.is_super_admin || data.is_org_admin) return true;

    // Admin / Owner roles
    if (isAdminRole(data.role)) return true;

    // الصلاحيات المحسوبة
    const computed: Record<string, boolean | undefined> = {
      manageProducts: data.can_manage_products || data.permissions?.manageProducts,
      manageOrders: data.can_manage_orders || data.permissions?.manageOrders,
      accessPOS: data.can_access_pos || data.permissions?.accessPOS,
      manageUsers: data.can_manage_users || data.permissions?.manageUsers,
      manageSettings: data.can_manage_settings || data.permissions?.manageSettings,
      viewInventory: data.has_inventory_access || data.permissions?.viewInventory,
      viewReports: data.can_view_reports || data.permissions?.viewReports
    };

    if (computed[permission] === true) return true;

    // التحقق المباشر
    if (data.permissions?.[permission] === true) return true;

    // التحقق من الصلاحيات الأبوية
    if (checkParentPermission(permission, data.permissions)) return true;

    // Fallback للتوافق مع الكود القديم
    return checkPermission(permission, data.permissions);
  }, [data]);

  // دالة anyOf - التحقق من أي صلاحية
  const anyOf = useCallback((perms: string[]): boolean => {
    return perms.some(has);
  }, [has]);

  // دالة allOf - التحقق من جميع الصلاحيات
  const allOf = useCallback((perms: string[]): boolean => {
    return perms.every(has);
  }, [has]);

  // دالة refresh - تحديث الصلاحيات
  const refresh = useCallback(async () => {
    cachedValue = null;
    permissionService.clearCache();
    await fetchUnified();
  }, [fetchUnified]);

  // القيمة النهائية للسياق
  const value: PermissionsContextValue = useMemo(() => ({
    loading,
    ready,
    error,
    data,
    has,
    anyOf,
    allOf,
    isOrgAdmin: !!data?.is_org_admin,
    isSuperAdmin: !!data?.is_super_admin,
    role: data?.role || null,
    refresh
  }), [loading, ready, error, data, has, anyOf, allOf, refresh]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

// ========================================
// Hook
// ========================================
export const usePermissionsContext = (): PermissionsContextValue => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissionsContext must be used within PermissionsProvider');
  }
  return ctx;
};
