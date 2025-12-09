import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkPermission } from '@/components/sidebar/utils';
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
  const retryCountRef = useRef(0); // ⚡ عداد لمنع infinite loop
  const maxRetries = 3; // ⚡ الحد الأقصى لعدد المحاولات

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

  const saveLocal = useCallback(async (perm: UnifiedPermissionsData) => {
    try {
      if (!perm || !perm.auth_user_id) {
        console.warn('[PermissionsContext] Cannot save: invalid perm data', perm);
        return;
      }
      
      const id = `${perm.organization_id || 'global'}:${perm.auth_user_id}`;
      const now = new Date().toISOString();
      
      // استخدام INSERT OR REPLACE للإدراج/التحديث في SQLite
      if (window.electronAPI?.db) {
        const permissionsJson = JSON.stringify(perm.permissions || {});

        // استخدام INSERT OR REPLACE بدلاً من upsert (غير موجودة في API)
        const sql = `
          INSERT OR REPLACE INTO user_permissions (
            id, auth_user_id, user_id, email, name, role, organization_id,
            is_active, is_org_admin, is_super_admin, permissions,
            has_inventory_access, can_manage_products, can_view_reports,
            can_manage_users, can_manage_orders, can_access_pos, can_manage_settings,
            created_at, updated_at, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          id,
          perm.auth_user_id,
          perm.user_id,
          perm.email,
          perm.name,
          perm.role,
          perm.organization_id || null,
          perm.is_active ? 1 : 0,
          perm.is_org_admin ? 1 : 0,
          perm.is_super_admin ? 1 : 0,
          permissionsJson,
          perm.has_inventory_access ? 1 : 0,
          perm.can_manage_products ? 1 : 0,
          perm.can_view_reports ? 1 : 0,
          perm.can_manage_users ? 1 : 0,
          perm.can_manage_orders ? 1 : 0,
          perm.can_access_pos ? 1 : 0,
          perm.can_manage_settings ? 1 : 0,
          now,
          now,
          now
        ];

        // استخدام execute بدلاً من query لأن INSERT لا يرجع بيانات
        // @ts-ignore - execute exists in runtime but TypeScript may not recognize it
        const result = await window.electronAPI.db.execute(sql, params);

        if (process.env.NODE_ENV === 'development') {
          console.log('[PermissionsContext] ✅ Saved to SQLite', {
            success: result.success,
            changes: result.changes,
            permCount: Object.keys(perm.permissions || {}).length,
            role: perm.role,
            isOrgAdmin: perm.is_org_admin,
            organizationId: perm.organization_id
          });
        }

        if (!result.success) {
          console.error('[PermissionsContext] ❌ Failed to save to SQLite:', result.error);
        }
      }
    } catch (err) {
      console.error('[PermissionsContext] Failed to save to SQLite:', err);
    }
  }, []);

  // استخدام useRef للاحتفاظ بالقيم الديناميكية لمنع Stale Closure
  const organizationIdRef = useRef<string | null>(null);

  // تحديث ref عند تغيير المؤسسة
  useEffect(() => {
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
    organizationIdRef.current = orgId;
  }, []);

  // إضافة دالة مساعدة للحصول على orgId الحالي
  const getCurrentOrgId = useCallback((): string | null => {
    // محاولة الحصول من ref أولاً
    if (organizationIdRef.current) {
      return organizationIdRef.current;
    }
    // Fallback لـ localStorage
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
    organizationIdRef.current = orgId;
    return orgId;
  }, []);

  const loadLocal = useCallback(async (authId?: string, forceOrgId?: string | null): Promise<UnifiedPermissionsData | null> => {
    try {
      if (!authId) return null;

      // استخدام SQLite API مباشرة
      if (window.electronAPI?.db) {
        // استخدام forceOrgId إذا تم تمريره، وإلا استخدام getCurrentOrgId
        const orgId = forceOrgId !== undefined ? forceOrgId : getCurrentOrgId();

        let sql = 'SELECT * FROM user_permissions WHERE auth_user_id = ?';
        const params: any[] = [authId];

        if (orgId) {
          sql += ' AND organization_id = ?';
          params.push(orgId);
        }

        sql += ' LIMIT 1';

        const result = await window.electronAPI.db.queryOne(sql, params);
        const rec = result.data;

        if (!rec) {
          // تقليل التحذير: فقط في الوضع غير المتصل أو بعد محاولات متعددة
          // لأن عدم وجود صلاحيات في SQLite في المرة الأولى هو سلوك متوقع

          // عندما نكون في وضع غير متصل ولا توجد أذونات في SQLite،
          // نوفر مجموعة أذونات افتراضية للسماح بالوصول الأساسي
          if (!navigator.onLine || !window.navigator.onLine) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PermissionsContext] No permissions in SQLite (offline mode)', { authId, orgId });
            }
            if (process.env.NODE_ENV === 'development') {
              console.log('[PermissionsContext] Offline with no SQLite permissions, providing default offline permissions');
            }

            // توفير أذونات افتراضية للوضع غير المتصل
            const defaultOfflinePermissions = {
              // أذونات العرض الأساسية
              viewDashboard: true,
              viewProducts: true,
              viewOrders: true,
              viewCustomers: true,
              viewDebts: true,
              viewFinancialReports: true,
              canViewInvoices: true,
              canViewReturns: true,
              canViewLosses: true,
              // أذونات الإدارة الأساسية
              manageProducts: true,
              manageOrders: true,
              manageCustomers: true,
              recordDebtPayments: true,
              canManageInvoices: true,
              processPayments: true,
            };

            return {
              user_id: authId,
              auth_user_id: authId,
              email: '',
              name: '',
              organization_id: orgId || '',
              role: 'employee',
              is_active: true,
              is_org_admin: false,
              is_super_admin: false,
              permissions: defaultOfflinePermissions,
            };
          }

          return null;
        }

        const perms = typeof rec.permissions === 'string' ? JSON.parse(rec.permissions) : rec.permissions || {};
        const row = {
          user_id: rec.user_id || authId,
          auth_user_id: rec.auth_user_id || authId,
          email: rec.email || '',
          name: rec.name || '',
          role: rec.role || 'authenticated',
          organization_id: rec.organization_id || null,
          is_active: rec.is_active === 1 || rec.is_active === true || rec.is_active === undefined,
          is_org_admin: rec.is_org_admin === 1 || rec.is_org_admin === true,
          is_super_admin: rec.is_super_admin === 1 || rec.is_super_admin === true,
          permissions: perms,
          has_inventory_access: rec.has_inventory_access === 1 || rec.has_inventory_access === true,
          can_manage_products: rec.can_manage_products === 1 || rec.can_manage_products === true,
          can_view_reports: rec.can_view_reports === 1 || rec.can_view_reports === true,
          can_manage_users: rec.can_manage_users === 1 || rec.can_manage_users === true,
          can_manage_orders: rec.can_manage_orders === 1 || rec.can_manage_orders === true,
          can_access_pos: rec.can_access_pos === 1 || rec.can_access_pos === true,
          can_manage_settings: rec.can_manage_settings === 1 || rec.can_manage_settings === true,
        };

        console.log('[PermissionsContext] Loaded from SQLite', { permCount: Object.keys(perms).length, role: row.role });
        return parseUnifiedRow(row);
      }

      return null;
    } catch (err) {
      console.error('[PermissionsContext] Failed to load from SQLite:', err);
      return null;
    }
  }, [getCurrentOrgId]);

  const fetchUnified = useCallback(async () => {
    if (fetchingRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PermissionsContext] ⏸️ Already fetching, skipping...');
      }
      return;
    }
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    if (process.env.NODE_ENV === 'development') {
      console.log('[PermissionsContext] 🔍 fetchUnified started');
    }

    const isOnline = isAppOnline();

    if (process.env.NODE_ENV === 'development') {
      console.log('[PermissionsContext] 🌐 Network status:', { isOnline });
    }

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
        if (process.env.NODE_ENV === 'development') {
          console.log('[PermissionsContext] ✅ Using cached permissions');
        }
        setData(cachedValue.data);
        setReady(true);
        markNetworkOnline();
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[PermissionsContext] 💾 No valid cache, checking online status...', { isOnline });
      }

      if (!isOnline) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PermissionsContext] 📴 Offline mode detected, loading from SQLite...');
        }
        markNetworkOffline({ force: true });
        const saved = loadUserDataFromStorage();
        const fallbackAuthId = user?.id || saved?.userProfile?.id || null;
        const local = await loadLocal(fallbackAuthId || undefined);
        if (local) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PermissionsContext] ✅ Loaded permissions from SQLite (offline)');
          }
          setData(local);
          setReady(true);
          setError(null);
          return;
        }
        if (saved?.userProfile) {
          const fallback = parseUnifiedRow({
            user_id: saved.userProfile.id,
            auth_user_id: saved.userProfile.id,
            email: saved.userProfile.email,
            name: saved.userProfile.name,
            role: saved.userProfile.role,
            organization_id: saved.userProfile.organization_id,
            is_active: true,
            is_org_admin: ['org_admin', 'admin', 'owner'].includes(saved.userProfile.role as any),
            is_super_admin: saved.userProfile.role === 'super_admin',
            permissions: saved.userProfile.permissions || {}
          });
          setData(fallback);
          try {
            // حفظ محلي لضمان توفره لاحقاً
            if (fallback) {
              await saveLocal(fallback);
              const savedUserData = loadUserDataFromStorage();
              if (savedUserData.userProfile) {
                const updatedProfile = {
                  ...savedUserData.userProfile,
                  permissions: fallback.permissions,
                  is_org_admin: fallback.is_org_admin,
                  is_super_admin: fallback.is_super_admin,
                  role: fallback.role || savedUserData.userProfile.role
                } as any;
                localStorage.setItem('userprofile', JSON.stringify(updatedProfile));
              }
            }
          } catch {}
          setReady(true);
          setError(null);
          return;
        }
        throw new Error('network_offline');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[PermissionsContext] ✅ Online mode confirmed, proceeding to session check...');
      }

      {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PermissionsContext] 🔐 Checking session readiness...');
        }
        let sessionReady = false;

        // ⚡ في Tauri: إذا كان user موجود في AuthContext، نعتبر Session جاهزة
        if (user && user.id) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PermissionsContext] ✅ User found in AuthContext, skipping session check');
          }
          sessionReady = true;
        } else {
          // محاولة جلب session من Supabase (للحالات الأخرى)
          for (let i = 0; i < 5; i++) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (process.env.NODE_ENV === 'development') {
                console.log(`[PermissionsContext] 🔐 Session check attempt ${i + 1}/5:`, {
                  hasSession: !!session,
                  hasAccessToken: !!(session as any)?.access_token
                });
              }
              if (session && (session as any).access_token) {
                sessionReady = true;
                if (process.env.NODE_ENV === 'development') {
                  console.log('[PermissionsContext] ✅ Session found on attempt', i + 1);
                }
                break;
              }
            } catch (err) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`[PermissionsContext] ⚠️ Session check error (attempt ${i + 1}):`, err);
              }
            }
            // زيادة الانتظار تدريجياً: 500ms, 700ms, 1000ms, 1500ms, 2000ms
            if (i < 4) {
              await new Promise(r => setTimeout(r, 500 + (i * 300)));
            }
          }
        }

        if (!sessionReady) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[PermissionsContext] ⚠️ Session not ready after 5 attempts, using fallback');
          }

          // ⚡ زيادة عداد المحاولات
          retryCountRef.current += 1;

          const saved = loadUserDataFromStorage();
          const fallbackAuthId = user?.id || saved?.userProfile?.id || '';
          const local = await loadLocal(fallbackAuthId);

          if (local) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PermissionsContext] ✅ Loaded from local storage (session not ready)');
            }
            setData(local);
            setReady(true);
            setError(null);
            retryCountRef.current = 0; // إعادة تعيين العداد عند النجاح
          } else {
            // ⚡ محاولة إنشاء fallback من user metadata
            if (user && user.id) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[PermissionsContext] 🔧 Creating fallback from user metadata');
              }
              const userMetadata = (user.user_metadata as any) || {};
              const fallback: UnifiedPermissionsData = {
                user_id: user.id,
                auth_user_id: user.id,
                email: user.email || '',
                name: userMetadata.name || user.email || '',
                role: userMetadata.role || saved?.userProfile?.role || 'authenticated',
                organization_id: userMetadata.organization_id || saved?.userProfile?.organization_id || null,
                is_active: true,
                is_org_admin: false,
                is_super_admin: false,
                permissions: {},
              };
              setData(fallback);
              setReady(true);
              setError(null);

              // حفظ في SQLite للمحاولات القادمة
              try {
                await saveLocal(fallback);
              } catch {}

              retryCountRef.current = 0; // إعادة تعيين العداد
            } else {
              // ⚡ التحقق من عدد المحاولات لمنع infinite loop
              if (retryCountRef.current < maxRetries) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`[PermissionsContext] ⚠️ No local data found, retry ${retryCountRef.current + 1}/${maxRetries} in 3s`);
                }
                setTimeout(() => {
                  if (!fetchingRef.current) { void fetchUnified(); }
                }, 3000);
              } else {
                if (process.env.NODE_ENV === 'development') {
                  console.error('[PermissionsContext] ❌ Max retries reached, stopping');
                }
                setError('Failed to load permissions after multiple attempts');
                setReady(false);
                retryCountRef.current = 0; // إعادة تعيين للمحاولة القادمة
              }
            }
          }
          return;
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('[PermissionsContext] ✅ Session is ready, proceeding to RPC call');
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[PermissionsContext] 📡 Calling RPC: get_user_with_permissions_unified', { userId: user?.id });
      }

      const { data: rows, error: rpcError } = await supabase.rpc('get_user_with_permissions_unified', {
        p_auth_user_id: user?.id || null, // ⚡ تمرير ID المستخدم صراحةً لضمان العمل
        p_include_subscription_data: false,
        p_calculate_permissions: true
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[PermissionsContext] 📡 RPC response:', { hasRows: !!rows, rowCount: Array.isArray(rows) ? rows.length : 0, error: rpcError?.message });
      }

      if (rpcError) {
        // محاولة التحميل من SQLite كـ Fallback
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PermissionsContext] RPC error, trying SQLite fallback:', rpcError.message);
        }
        const saved = loadUserDataFromStorage();
        const fallbackAuthId = user?.id || saved?.userProfile?.id || '';
        const local = await loadLocal(fallbackAuthId);
        if (local) {
          setData(local);
          setReady(true);
          setError(null);
          fetchingRef.current = false;
          setLoading(false);
          return;
        }
        throw new Error(rpcError.message);
      }

      const row = Array.isArray(rows) ? rows[0] : rows;
      const parsed = parseUnifiedRow(row);

      // ✅ التحقق من صحة البيانات قبل المعالجة
      if (!parsed || !parsed.auth_user_id) {
        // تقليل logs في حالة عدم وجود user - هذا سلوك متوقع في بعض الحالات
        if (process.env.NODE_ENV === 'development' && user?.id) {
          console.warn('[PermissionsContext] No valid data received from RPC for user', user.id);
        }
        
        // ⚡ محاولة التحميل من SQLite كـ Fallback فوراً
        const saved = loadUserDataFromStorage();
        const fallbackAuthId = user?.id || saved?.userProfile?.id || '';
        const local = await loadLocal(fallbackAuthId);
        
        if (local) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PermissionsContext] ✅ Loaded local permissions (RPC returned empty)');
          }
          setData(local);
          setReady(true);
          setError(null);
          retryCountRef.current = 0;
          fetchingRef.current = false;
          setLoading(false);
          return;
        }

        // ⚡ إنشاء fallback من user metadata إذا لم توجد بيانات محلية
        if (user && user.id) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PermissionsContext] 🔧 Creating fallback from user metadata (RPC empty & no local)');
          }
          const userMetadata = (user.user_metadata as any) || {};
          const fallback: UnifiedPermissionsData = {
            user_id: user.id,
            auth_user_id: user.id,
            email: user.email || '',
            name: userMetadata.name || saved?.userProfile?.name || user.email || '',
            role: userMetadata.role || saved?.userProfile?.role || 'authenticated',
            organization_id: userMetadata.organization_id || saved?.userProfile?.organization_id || null,
            is_active: true,
            is_org_admin: Boolean(['org_admin', 'admin', 'owner'].includes(saved?.userProfile?.role as any)),
            is_super_admin: Boolean(saved?.userProfile?.role === 'super_admin'),
            permissions: (saved?.userProfile?.permissions || {}) as PermissionMap,
          };
          
          setData(fallback);
          setReady(true);
          setError(null);
          retryCountRef.current = 0;

          // حفظ في SQLite للمحاولات القادمة
          try {
            await saveLocal(fallback);
          } catch {}

          fetchingRef.current = false;
          setLoading(false);
          return;
        }

        // ⚡ آخر حل: throw error فقط إذا لم يكن هناك user
        throw new Error('No valid permissions data received');
      }

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
      try { 
        await saveLocal(parsed); 
        // حفظ الصلاحيات في localStorage أيضاً لضمان توفرها عند إعادة التحميل
        const savedUserData = loadUserDataFromStorage();
        if (savedUserData.userProfile && parsed) {
          const updatedProfile = {
            ...savedUserData.userProfile,
            permissions: parsed.permissions,
            is_org_admin: parsed.is_org_admin,
            is_super_admin: parsed.is_super_admin,
            role: parsed.role || savedUserData.userProfile.role
          } as any;
          localStorage.setItem('userprofile', JSON.stringify(updatedProfile));
          console.log('[PermissionsContext] Saved permissions to localStorage', {
            permissionsCount: Object.keys(parsed.permissions || {}).length,
            isOrgAdmin: parsed.is_org_admin,
            role: parsed.role
          });
        }
      } catch {}
      cachedValue = { data: parsed, ts: Date.now() };
      setReady(true);
      setError(null);
      retryCountRef.current = 0; // ⚡ إعادة تعيين العداد عند النجاح
      markNetworkOnline();
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[PermissionsContext] ❌ Error in fetchUnified:', {
          message: e?.message,
          isNetworkError: isNetworkError(e),
          stack: e?.stack?.substring(0, 200)
        });
      }
      if (isNetworkError(e)) {
        markNetworkOffline({ force: true });
      }
      const message = isNetworkError(e) ? 'network_offline' : e?.message || 'Failed to load permissions';
      setError(message);

      try {
        const saved = loadUserDataFromStorage();
        const fallbackAuthId = user?.id || saved?.userProfile?.id || '';
        const local = await loadLocal(fallbackAuthId);
        if (local) {
          setData(local);
          cachedValue = null;
          setReady(true);
          retryCountRef.current = 0; // ⚡ إعادة تعيين العداد
          if (isNetworkError(e)) {
            setError('network_offline');
          }
          return;
        }
        const fallbackProfile = saved?.userProfile;
        const permissions = (fallbackProfile?.permissions || {}) as any;
        const fallback: UnifiedPermissionsData = {
          user_id: fallbackProfile?.id || user?.id || '',
          auth_user_id: fallbackProfile?.id || user?.id || '',
          email: fallbackProfile?.email || user?.email || '',
          name: fallbackProfile?.name || (user?.user_metadata as any)?.name || user?.email || '',
          role: fallbackProfile?.role || (user?.user_metadata as any)?.role || user?.role || 'authenticated',
          organization_id: fallbackProfile?.organization_id || (user?.user_metadata as any)?.organization_id || null,
          is_active: true,
          is_org_admin: Boolean(['org_admin', 'admin', 'owner'].includes((fallbackProfile?.role as any) || '')),
          is_super_admin: Boolean(fallbackProfile?.role === 'super_admin'),
          has_inventory_access: permissions.viewInventory || false,
          can_manage_products: permissions.manageProducts || false,
          can_view_reports: permissions.viewReports || false,
          can_manage_users: permissions.manageUsers || false,
          can_manage_orders: permissions.manageOrders || false,
          can_access_pos: permissions.accessPOS || false,
          can_manage_settings: permissions.manageSettings || false,
          permissions: permissions,
        };
        setData(fallback);
        try {
          await saveLocal(fallback);
          const savedUserData = loadUserDataFromStorage();
          if (savedUserData.userProfile) {
            const updatedProfile = {
              ...savedUserData.userProfile,
              permissions: fallback.permissions,
              is_org_admin: fallback.is_org_admin,
              is_super_admin: fallback.is_super_admin,
              role: fallback.role || savedUserData.userProfile.role
            } as any;
            localStorage.setItem('userprofile', JSON.stringify(updatedProfile));
          }
        } catch {}
        cachedValue = null;
        setReady(true);
        retryCountRef.current = 0; // ⚡ إعادة تعيين العداد
        if (isNetworkError(e)) {
          setError('network_offline');
        }
      } catch (metaError) {
        // ⚡ في حالة فشل كل شيء، لا نفعل شيء (setReady سيبقى false)
        if (process.env.NODE_ENV === 'development') {
          console.error('[PermissionsContext] ⚠️ All fallback methods failed:', metaError);
        }
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]);

  // ⚡ استخدام ref لتتبع آخر userId تم جلب الصلاحيات له
  const lastFetchedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // ⚡ تجنب الاستدعاء المكرر لنفس المستخدم
    if (user?.id && lastFetchedUserIdRef.current === user.id) {
      console.log('[PermissionsContext] ⏭️ Already fetched for this user, skipping...');
      return;
    }

    // Clear cache on user change
    cachedValue = null;
    setData(null);
    setReady(false);
    setError(null);
    if (user) {
      console.log('[PermissionsContext] 🚀 Starting to fetch permissions for user:', user.id);
      lastFetchedUserIdRef.current = user.id;
      fetchUnified();
    } else {
      console.log('[PermissionsContext] ⏸️ No user, skipping permissions fetch');
      lastFetchedUserIdRef.current = null;
    }
  // ⚡ إزالة fetchUnified من dependencies لمنع الاستدعاءات المكررة
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const has = useCallback((permission: string) => {
    if (!data) {
      return false;
    }
    
    if (data.is_super_admin) {
      return true;
    }
    
    if (data.is_org_admin) {
      return true;
    }
    
    // دعم الدور الإداري/المالك كصلاحية كاملة للتوافق مع PermissionGuard
    if (data.role === 'admin' || data.role === 'owner') {
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
    
    if (computed[permission] === true) {
      return true;
    }
    
    // تحقق مباشر + عبر خريطة التصحيح الموحدة
    const direct = data.permissions?.[permission] === true;
    const mapped = checkPermission(permission, data.permissions);
    const result = Boolean(direct || mapped);
    return result;
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
