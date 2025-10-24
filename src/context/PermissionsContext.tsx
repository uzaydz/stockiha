import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { loadUserDataFromStorage } from '@/context/auth/utils/authStorage';
import { isAppOnline, markNetworkOffline, markNetworkOnline } from '@/utils/networkStatus';

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

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedValue: { data: UnifiedPermissionsData | null; ts: number } | null = null;

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UnifiedPermissionsData | null>(null);
  const fetchingRef = useRef(false);

  const parseUnifiedRow = (row: any): UnifiedPermissionsData | null => {
    if (!row) return null;
    return {
      user_id: row.user_id,
      auth_user_id: row.auth_user_id,
      email: row.email,
      name: row.name,
      role: row.role,
      organization_id: row.organization_id,
      is_active: row.is_active,
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

  const fetchUnified = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    const isOnline = isAppOnline();

    const isNetworkError = (err: any) => {
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

    try {
      // Use cache if recent
      const now = Date.now();
      if (cachedValue && now - cachedValue.ts < CACHE_TTL_MS) {
        setData(cachedValue.data);
        setReady(true);
        markNetworkOnline();
        return;
      }

      if (!isOnline) {
        markNetworkOffline({ force: true });
        const saved = loadUserDataFromStorage();
        if (saved?.userProfile) {
          const fallback = parseUnifiedRow({
            user_id: saved.userProfile.id,
            auth_user_id: saved.userProfile.id,
            email: saved.userProfile.email,
            name: saved.userProfile.name,
            role: saved.userProfile.role,
            organization_id: saved.userProfile.organization_id,
            is_active: true,
            is_org_admin: saved.userProfile.role === 'org_admin',
            is_super_admin: saved.userProfile.role === 'super_admin',
            permissions: saved.userProfile.permissions || {}
          });

          setData(fallback);
          setReady(true);
          setError(null);
          return;
        }

        throw new Error('network_offline');
      }

      const { data: rows, error: rpcError } = await supabase.rpc('get_user_with_permissions_unified', {
        p_auth_user_id: null,
        p_include_subscription_data: false,
        p_calculate_permissions: true
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const row = Array.isArray(rows) ? rows[0] : rows;
      const parsed = parseUnifiedRow(row);

      if (parsed?.is_org_admin || parsed?.is_super_admin) {
        parsed.has_inventory_access = true;
        parsed.can_manage_products = true;
        parsed.permissions = {
          ...parsed.permissions,
          viewInventory: true,
          manageInventory: true,
          manageProducts: true,
          viewProducts: true,
          editProducts: true,
          deleteProducts: true
        };
      }

      setData(parsed);
      cachedValue = { data: parsed, ts: Date.now() };
      setReady(true);
      setError(null);
      markNetworkOnline();
    } catch (e: any) {
      if (isNetworkError(e)) {
        markNetworkOffline({ force: true });
      }
      const message = isNetworkError(e) ? 'network_offline' : e?.message || 'Failed to load permissions';
      setError(message);

      if (process.env.NODE_ENV === 'development') {
        console.warn('[PermissionsProvider] Falling back to local metadata with read-only access due to RPC error:', message);
      }

      try {
        const saved = loadUserDataFromStorage();
        const fallbackProfile = saved?.userProfile;
        const fallback: UnifiedPermissionsData = {
          user_id: fallbackProfile?.id || user?.id || '',
          auth_user_id: fallbackProfile?.id || user?.id || '',
          email: fallbackProfile?.email || user?.email || '',
          name: fallbackProfile?.name || (user?.user_metadata as any)?.name || user?.email || '',
          role: fallbackProfile?.role || (user?.user_metadata as any)?.role || user?.role || 'authenticated',
          organization_id: fallbackProfile?.organization_id || (user?.user_metadata as any)?.organization_id || null,
          is_active: true,
          is_org_admin: Boolean(fallbackProfile?.role === 'org_admin'),
          is_super_admin: Boolean(fallbackProfile?.role === 'super_admin'),
          has_inventory_access: fallbackProfile?.permissions?.viewInventory || false,
          can_manage_products: fallbackProfile?.permissions?.manageProducts || false,
          can_view_reports: fallbackProfile?.permissions?.viewReports || false,
          can_manage_users: fallbackProfile?.permissions?.manageUsers || false,
          can_manage_orders: fallbackProfile?.permissions?.manageOrders || false,
          can_access_pos: fallbackProfile?.permissions?.accessPOS || false,
          can_manage_settings: fallbackProfile?.permissions?.manageSettings || false,
          permissions: fallbackProfile?.permissions || {},
        };

        setData(fallback);
        cachedValue = null;
        setReady(true);
        if (isNetworkError(e)) {
          setError('network_offline');
        }
      } catch (metaError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[PermissionsProvider] Failed to build read-only fallback from metadata:', metaError);
        }
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    // Clear cache on user change
    cachedValue = null;
    setData(null);
    setReady(false);
    setError(null);
    if (user) {
      fetchUnified();
    }
  }, [user?.id, fetchUnified]);

  const has = useCallback((permission: string) => {
    console.log('🔍 [PermissionsContext.has] التحقق من الصلاحية:', {
      permission,
      hasData: !!data,
      dataPermissions: data?.permissions,
      dataPermissionsAccessPOS: data?.permissions?.accessPOS,
      dataPermissionsType: typeof data?.permissions,
      canAccessPos: data?.can_access_pos,
    });
    
    if (!data) {
      console.log('❌ [PermissionsContext.has] لا توجد بيانات');
      return false;
    }
    
    if (data.is_super_admin) {
      console.log('✅ [PermissionsContext.has] super admin');
      return true;
    }
    
    if (data.is_org_admin) {
      console.log('✅ [PermissionsContext.has] org admin');
      return true;
    }
    
    // Common computed shortcuts - مع fallback إلى permissions
    const computed: Record<string, boolean | undefined> = {
      manageProducts: data.can_manage_products || (data.permissions?.manageProducts === true),
      manageOrders: data.can_manage_orders || (data.permissions?.manageOrders === true),
      accessPOS: data.can_access_pos || (data.permissions?.accessPOS === true),  // ✅ إضافة fallback
      manageUsers: data.can_manage_users || (data.permissions?.manageUsers === true),
      manageSettings: data.can_manage_settings || (data.permissions?.manageSettings === true),
      viewInventory: data.has_inventory_access || (data.permissions?.viewInventory === true),
    };
    
    console.log('📊 [PermissionsContext.has] computed shortcuts:', computed);
    
    if (computed[permission] === true) {
      console.log('✅ [PermissionsContext.has] من computed shortcuts');
      return true;
    }
    
    const hasPermission = data.permissions?.[permission] === true;
    console.log(hasPermission ? '✅' : '❌', '[PermissionsContext.has] من permissions:', hasPermission);
    
    return hasPermission;
  }, [data]);

  const anyOf = useCallback((perms: string[]) => {
    
    const result = perms.some(has);
    
    return result;
  }, [has]);
  
  const allOf = useCallback((perms: string[]) => {
    
    const result = perms.every(has);
    
    return result;
  }, [has]);

  const refresh = useCallback(async () => {
    cachedValue = null;
    await fetchUnified();
  }, [fetchUnified]);

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
    refresh,
  }), [loading, ready, error, data, has, anyOf, allOf, refresh]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissionsContext = (): PermissionsContextValue => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissionsContext must be used within PermissionsProvider');
  }
  return ctx;
};
