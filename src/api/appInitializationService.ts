/**
 * ============================================================================
 * خدمة تهيئة التطبيق الموحدة
 * ============================================================================
 * تستخدم RPC واحد لجلب كل البيانات المطلوبة عند بدء التطبيق
 * تقلل الاستدعاءات من 8 إلى 1 فقط
 * ============================================================================
 */

import { supabase } from '@/lib/supabase-unified';
import { deduplicateRequest } from '@/lib/cache/deduplication';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { categoryImageService } from '@/services/CategoryImageService';

// Helper functions for PowerSync compatibility
const isPowerSyncReady = (): boolean => {
    try {
        const db = powerSyncService.db;
        return !!db;
    } catch {
        return false;
    }
};

const powerSyncQuery = async (sql: string, params: any[] = []): Promise<{ success: boolean; data: any[]; error?: string }> => {
    try {
        // ⚡ استخدام query() بدلاً من getAll() (الـ API الجديد)
        const results = await powerSyncService.query<any>({ sql, params });
        return { success: true, data: results || [] };
    } catch (error: any) {
        console.error('[PowerSync] Query failed:', error);
        return { success: false, data: [], error: error?.message || 'Query failed' };
    }
};

const powerSyncQueryOne = async (sql: string, params: any[] = []): Promise<{ success: boolean; data: any; error?: string }> => {
    try {
        if (!powerSyncService.db) {
            return { success: false, data: null, error: 'PowerSync DB not initialized' };
        }
        // ⚡ استخدام query بدلاً من getAll
        const results = await powerSyncService.query({ sql, params });
        const result = results?.[0] || null;
        return { success: true, data: result };
    } catch (error: any) {
        // ⚡ تجاهل خطأ "Result set is empty" - هذا طبيعي
        if (error?.message?.includes('Result set is empty')) {
            return { success: true, data: null };
        }
        console.error('[PowerSync] QueryOne failed:', error);
        return { success: false, data: null, error: error?.message || 'Query failed' };
    }
};

const powerSyncExecute = async (sql: string, params: any[] = []): Promise<{ success: boolean; changes?: number; error?: string }> => {
    try {
        if (!powerSyncService.db) {
            return { success: false, error: 'PowerSync DB not initialized' };
        }
        await powerSyncService.db.execute(sql, params);
        return { success: true, changes: 0 };
    } catch (error: any) {
        console.error('[PowerSync] Execute failed:', error);
        return { success: false, error: error?.message || 'Execute failed' };
    }
};

const powerSyncUpsert = async (table: string, data: any): Promise<{ success: boolean; changes?: number; error?: string }> => {
    try {
        // ⚡ استخدام transaction مع tx.execute للجداول المحلية
        // mutate API لا يعمل مع الجداول المحلية (يعاملها كـ view)
        const id = data.id || data.cache_key || crypto.randomUUID();
        const dataWithId = {
            ...data,
            id: data.id || id,
            updated_at: new Date().toISOString()
        };

        await powerSyncService.transaction(async (tx) => {
            const columns = Object.keys(dataWithId);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => dataWithId[col]);

            // استخدام INSERT OR REPLACE بدلاً من ON CONFLICT للتوافق مع الجداول المحلية
            await tx.execute(
                `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                values
            );
        });

        return { success: true, changes: 1 };
    } catch (error: any) {
        console.error('[PowerSync] Upsert failed:', error);
        return { success: false, error: error?.message || 'Upsert failed' };
    }
};

const scheduleIdle = (task: () => void | Promise<void>, delayMs: number = 0, timeoutMs: number = 15000): void => {
    const schedule = () => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => void task(), { timeout: timeoutMs });
        } else {
            setTimeout(() => void task(), Math.min(timeoutMs, 15000));
        }
    };

    if (delayMs > 0) {
        setTimeout(schedule, delayMs);
    } else {
        schedule();
    }
};

const scheduleBackgroundProductSync = (organizationId: string): void => {
    scheduleIdle(async () => {
        const status = powerSyncService.syncStatus;
        if (status.hasSynced) {
            return;
        }
        if (!isPowerSyncReady()) {
            return;
        }
        try {
            const { ensureProductsInSQLite } = await import('./productSyncUtils');
            const productSyncResult = await ensureProductsInSQLite(organizationId);
            if (productSyncResult.needed && productSyncResult.success) {
                console.log('[AppInitialization] 📥 Products synced in background:', productSyncResult);
                window.dispatchEvent(new CustomEvent('products-updated'));
            }
        } catch (e) {
            console.warn('[AppInitialization] ⚠️ Background product sync failed:', e);
        }
    }, 8000, 15000);
};

// Cache helpers using PowerSync
const setAppInitCache = async (params: {
    id: string;
    userId?: string | null;
    organizationId?: string | null;
    data: any;
}): Promise<{ success: boolean; changes?: number; error?: string }> => {
    try {
        const now = new Date().toISOString();
        // ⚠️ PowerSync Schema uses cache_key and cache_value, not id and data
        return await powerSyncUpsert('app_init_cache', {
            cache_key: params.id,
            cache_value: JSON.stringify(params.data),
            organization_id: params.organizationId ?? null,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            created_at: now,
            updated_at: now
        });
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to set cache' };
    }
};

const getAppInitCacheById = async (id: string): Promise<{ success: boolean; data?: any | null; error?: string }> => {
    try {
        // ⚠️ PowerSync Schema uses cache_key and cache_value, not id and data
        const res = await powerSyncQueryOne('SELECT cache_value FROM app_init_cache WHERE cache_key = ?', [id]);
        if (!res.success) return { success: false, error: res.error };
        const raw = res.data?.cache_value;
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return { success: true, data: parsed ?? null };
        } catch {
            return { success: true, data: raw ?? null };
        }
    } catch (error: any) {
        // Handle case where table doesn't exist or column doesn't exist
        if (error?.message?.includes('no such table') || error?.message?.includes('no such column')) {
            return { success: false, error: 'Cache table not available' };
        }
        return { success: false, error: error?.message || 'Failed to get cache' };
    }
};

const getLatestAppInitCacheByUserOrg = async (
    userId?: string | null,
    organizationId?: string | null
): Promise<{ success: boolean; data?: any | null; error?: string }> => {
    try {
        // ⚠️ PowerSync Schema uses cache_key and cache_value, not id and data
        // Also, app_init_cache doesn't have user_id column, only organization_id
        const res = await powerSyncQueryOne(
            `SELECT cache_value FROM app_init_cache
       WHERE organization_id = ?
       ORDER BY updated_at DESC LIMIT 1`,
            [organizationId ?? null]
        );
        if (!res.success) return { success: false, error: res.error };
        const raw = res.data?.cache_value;
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return { success: true, data: parsed ?? null };
        } catch {
            return { success: true, data: raw ?? null };
        }
    } catch (error: any) {
        // Handle case where table doesn't exist or column doesn't exist
        if (error?.message?.includes('no such table') || error?.message?.includes('no such column')) {
            return { success: false, error: 'Cache table not available' };
        }
        return { success: false, error: error?.message || 'Failed to get cache' };
    }
};

// ============================================================================
// واجهات البيانات
// ============================================================================

export interface UserWithPermissions {
    id: string;
    auth_user_id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    organization_id: string;
    is_active: boolean;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
    permissions: string[];
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    address?: string;
    logo_url?: string;
    is_active: boolean;
    subscription_plan?: string;
    subscription_status?: string;
    trial_ends_at?: string;
    created_at: string;
    updated_at: string;
}

export interface OrganizationSettings {
    id: string;
    organization_id: string;
    currency?: string;
    timezone?: string;
    language?: string;
    tax_rate?: number;
    enable_inventory?: boolean;
    enable_pos?: boolean;
    enable_online_store?: boolean;
    created_at: string;
    updated_at: string;
}

export interface POSSettings {
    id: string;
    organization_id: string;
    enable_barcode_scanner?: boolean;
    enable_receipt_printer?: boolean;
    default_payment_method?: string;
    auto_print_receipt?: boolean;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    organization_id: string;
    is_active: boolean;
    created_at: string;
}

export interface Subcategory {
    id: string;
    name: string;
    slug: string;
    category_id: string;
    organization_id: string;
    is_active: boolean;
    created_at: string;
}

export interface Employee {
    id: string;
    auth_user_id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    avatar_url?: string;
}

export interface ConfirmationAgent {
    id: string;
    user_id: string;
    agent_type: string;
    agent_data: any;
    is_active: boolean;
    created_at: string;
}

export interface ExpenseCategory {
    id: string;
    name: string;
    description?: string;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

export interface AppInitializationData {
    user: UserWithPermissions;
    organization: Organization;
    organization_settings: OrganizationSettings | null;
    pos_settings: POSSettings | null;
    categories: Category[];
    subcategories: Subcategory[];
    employees: Employee[];
    confirmation_agents: ConfirmationAgent[];
    expense_categories: ExpenseCategory[];
    timestamp: number;
}

// ============================================================================
// Cache للبيانات
// ============================================================================

interface CachedData {
    data: AppInitializationData;
    timestamp: number;
}

const cache = new Map<string, CachedData>();
const CACHE_DURATION = 60 * 60 * 1000; // ⚡ ساعة واحدة بدلاً من 5 دقائق (توفير 90% من الاستدعاءات)

// Offline persistent cache now stored in SQLite (app_init_cache table)

const buildOfflineKey = (userId?: string, organizationId?: string) => {
    // ⚡ Fix Cache Miss: Resolve userId from storage if missing
    const resolvedUserId = userId ||
        (typeof localStorage !== 'undefined' ? (localStorage.getItem('auth_user_id') || localStorage.getItem('bazaar_user_id')) : undefined) ||
        'current';

    // ⚡ Fix Cache Miss: Resolve organizationId from storage if missing
    const resolvedOrgId = organizationId ||
        (typeof localStorage !== 'undefined' ? (localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id')) : undefined) ||
        'default';

    return `app-init:${resolvedUserId}:${resolvedOrgId}`;
};

/**
 * مسح الـ cache
 */
export const clearAppInitializationCache = () => {
    cache.clear();
    console.log('🗑️ [AppInitialization] تم مسح الـ cache');
};

/**
 * الحصول على البيانات من الـ cache
 */
const getCachedData = (userId: string): AppInitializationData | null => {
    const cached = cache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ [AppInitialization] استخدام البيانات من الـ cache');
        return cached.data;
    }
    return null;
};

/**
 * حفظ البيانات في الـ cache
 */
const setCachedData = (userId: string, data: AppInitializationData) => {
    cache.set(userId, {
        data,
        timestamp: Date.now()
    });
};

/**
 * بناء بيانات التهيئة من جداول SQLite عند عدم وجود cache
 * يستخدم كـ fallback في وضع Offline
 * ⚡ v4.2: تحسين الأداء بتشغيل الاستعلامات بالتوازي
 */
const buildAppDataFromSQLiteTables = async (
    organizationId: string | undefined,
    userId: string | undefined
): Promise<AppInitializationData | null> => {
    try {
        if (!organizationId) {
            console.warn('[AppInitialization] لا يمكن بناء البيانات بدون organization_id');
            return null;
        }

        const startTime = performance.now();

        // ⚡ v4.3: جلب البيانات الأساسية فقط (يوفر ~600ms)
        // تأجيل البيانات الثانوية (الفئات، الموظفين) للخلفية
        const [
            orgResult,
            authResult,
            staffResult
        ] = await Promise.all([
            // جلب بيانات المؤسسة
            powerSyncQuery('SELECT * FROM organizations WHERE id = ? LIMIT 1', [organizationId]),
            // محاولة جلب بيانات المستخدم من local_auth_data
            userId ? powerSyncQuery('SELECT * FROM local_auth_data WHERE auth_user_id = ? LIMIT 1', [userId])
                .catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: false, data: [] }),
            // محاولة جلب بيانات المستخدم من pos_staff_sessions
            userId ? powerSyncQuery('SELECT * FROM pos_staff_sessions WHERE user_id = ? LIMIT 1', [userId])
                : Promise.resolve({ success: false, data: [] })
        ]);

        // ⚡ جلب البيانات الثانوية في الخلفية (لا تحجب التهيئة)
        let categoriesResult = { success: false, data: [] as any[] };
        let subcategoriesResult = { success: false, data: [] as any[] };
        let employeesResult = { success: false, data: [] as any[] };

        // تأجيل جلب الفئات والفئات الفرعية والموظفين
        setTimeout(async () => {
            try {
                const [cats, subcats, emps] = await Promise.all([
                    powerSyncQuery('SELECT * FROM product_categories WHERE organization_id = ? AND is_active = 1 LIMIT 50', [organizationId]),
                    powerSyncQuery('SELECT * FROM product_subcategories WHERE organization_id = ? LIMIT 100', [organizationId]),
                    powerSyncQuery('SELECT * FROM pos_staff_sessions WHERE organization_id = ? AND is_active = 1 LIMIT 20', [organizationId])
                ]);

                // يمكن تحديث Context هنا إذا لزم الأمر
                if (cats.success || subcats.success || emps.success) {
                    window.dispatchEvent(new CustomEvent('app-init-secondary-data-loaded', {
                        detail: { categories: cats.data, subcategories: subcats.data, employees: emps.data }
                    }));
                }
            } catch (e) {
                console.warn('[AppInitialization] ⚠️ Failed to load secondary data:', e);
            }
        }, 100); // تأجيل 100ms

        let organization: Organization | null = null;
        if (orgResult.success && orgResult.data?.[0]) {
            const org = orgResult.data[0];
            organization = {
                id: org.id,
                name: org.name || '',
                slug: org.slug || '',
                email: org.email,
                phone: org.phone,
                address: org.address,
                logo_url: org.logo_url,
                is_active: org.is_active !== 0,
                subscription_plan: org.subscription_plan,
                subscription_status: org.subscription_status,
                trial_ends_at: org.trial_ends_at,
                created_at: org.created_at || new Date().toISOString(),
                updated_at: org.updated_at || new Date().toISOString()
            };
        }

        // تحويل بيانات المستخدم
        let user: UserWithPermissions | null = null;

        if (userId) {
            // أولاً: من local_auth_data
            if (authResult.success && authResult.data?.[0]) {
                const authData = authResult.data[0];
                user = {
                    id: authData.id || authData.auth_user_id,
                    auth_user_id: authData.auth_user_id,
                    name: authData.name || authData.email || '',
                    email: authData.email || '',
                    role: authData.role || 'admin',
                    organization_id: organizationId,
                    is_active: true,
                    created_at: authData.created_at || new Date().toISOString(),
                    updated_at: authData.updated_at || new Date().toISOString(),
                    permissions: []
                };
            }

            // ثانياً: من pos_staff_sessions
            if (!user && staffResult.success && staffResult.data?.[0]) {
                const emp = staffResult.data[0];
                let permissions: string[] = [];
                try {
                    if (emp.permissions) {
                        permissions = typeof emp.permissions === 'string'
                            ? JSON.parse(emp.permissions)
                            : emp.permissions;
                    }
                } catch { }

                user = {
                    id: emp.id,
                    auth_user_id: emp.user_id || emp.id,
                    name: emp.name || emp.email || '',
                    email: emp.email || '',
                    phone: emp.phone,
                    role: emp.role || 'admin',
                    organization_id: organizationId,
                    is_active: emp.is_active !== 0,
                    avatar_url: emp.avatar_url || emp.avatarUrl,
                    created_at: emp.created_at || new Date().toISOString(),
                    updated_at: emp.updated_at || new Date().toISOString(),
                    permissions
                };
            }

            // ⚡ جلب الصلاحيات في الخلفية (لا يحجز التهيئة)
            if (user) {
                powerSyncQuery('SELECT * FROM user_permissions WHERE auth_user_id = ? LIMIT 1', [userId])
                    .then(permResult => {
                        if (permResult.success && permResult.data?.[0] && user) {
                            const perm = permResult.data[0];
                            try {
                                const parsedPerms = perm.permissions
                                    ? (typeof perm.permissions === 'string' ? JSON.parse(perm.permissions) : perm.permissions)
                                    : [];
                                user.permissions = Array.isArray(parsedPerms) ? parsedPerms : [];
                            } catch { }
                        }
                    })
                    .catch(() => { /* تجاهل الخطأ */ });
            }
        }

        // إذا لم نجد المستخدم، نستخدم بيانات من localStorage
        if (!user) {
            const storedName = localStorage.getItem('user_name') || localStorage.getItem('bazaar_user_name');
            const storedEmail = localStorage.getItem('user_email') || localStorage.getItem('bazaar_user_email');
            const storedUserId = userId || localStorage.getItem('auth_user_id') || localStorage.getItem('bazaar_user_id');

            user = {
                id: storedUserId || crypto.randomUUID(),
                auth_user_id: storedUserId || crypto.randomUUID(),
                name: storedName || 'مستخدم',
                email: storedEmail || '',
                role: 'admin',
                organization_id: organizationId,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                permissions: []
            };
        }

        // إذا لم نجد المؤسسة، نستخدم بيانات من localStorage
        if (!organization) {
            const storedOrgName = localStorage.getItem('organization_name') || localStorage.getItem('bazaar_organization_name');

            organization = {
                id: organizationId,
                name: storedOrgName || 'المؤسسة',
                slug: organizationId,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }

        // تحويل الفئات
        const categories: Category[] = (categoriesResult.data || []).map((c: any) => ({
            id: c.id,
            name: c.name || '',
            slug: c.slug || '',
            description: c.description,
            organization_id: c.organization_id,
            is_active: c.is_active !== 0,
            created_at: c.created_at || new Date().toISOString()
        }));

        // تحويل الفئات الفرعية
        const subcategories: Subcategory[] = (subcategoriesResult.data || []).map((s: any) => ({
            id: s.id,
            name: s.name || '',
            slug: s.slug || '',
            category_id: s.category_id,
            organization_id: s.organization_id,
            is_active: s.is_active !== 0,
            created_at: s.created_at || new Date().toISOString()
        }));

        // تحويل الموظفين
        const employees: Employee[] = (employeesResult.data || []).map((e: any) => ({
            id: e.id,
            auth_user_id: e.user_id || e.id,
            name: e.name || e.email || '',
            email: e.email || '',
            role: e.role || 'staff',
            is_active: e.is_active !== 0,
            avatar_url: e.avatar_url || e.avatarUrl
        }));

        const elapsed = Math.round(performance.now() - startTime);
        console.log(`📊 [AppInitialization] SQLite data built in ${elapsed}ms:`, {
            hasOrganization: !!organization,
            hasUser: !!user,
            categories: categories.length,
            subcategories: subcategories.length,
            employees: employees.length
        });

        return {
            user,
            organization,
            organization_settings: null,
            pos_settings: null,
            categories,
            subcategories,
            employees,
            confirmation_agents: [],
            expense_categories: [],
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('[AppInitialization] خطأ في بناء البيانات من SQLite:', error);
        return null;
    }
};

/**
 * ⚡ Optimistic Load: جلب البيانات الأساسية فوراً من LocalStorage
 * هذا يحل مشكلة Waterfall Initialization
 */
export const getOptimisticData = (): AppInitializationData | null => {
    try {
        if (typeof window === 'undefined') return null;

        const userId = localStorage.getItem('auth_user_id') || localStorage.getItem('bazaar_user_id');
        const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');

        if (!userId || !orgId) return null;

        // 1. محاولة استرجاع الكاش الكامل من الذاكرة إذا وجد
        const cached = getCachedData(userId);
        if (cached) return cached;

        // 2. بناء بيانات "هيكل عظمي" (Skeleton) من البيانات المخزنة محلياً بسرعة فائقة
        const userName = localStorage.getItem('user_name') || localStorage.getItem('bazaar_user_name') || 'مستخدم';
        const userEmail = localStorage.getItem('user_email') || localStorage.getItem('bazaar_user_email') || '';
        const orgName = localStorage.getItem('organization_name') || localStorage.getItem('bazaar_organization_name') || 'المؤسسة';

        // هذه البيانات تكفي لرسم الهيكل (Shell)
        return {
            timestamp: Date.now(),
            user: {
                id: userId,
                auth_user_id: userId,
                name: userName,
                email: userEmail,
                role: 'admin',
                organization_id: orgId,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                permissions: [] // سيتم تحميلها لاحقاً
            },
            organization: {
                id: orgId,
                name: orgName,
                slug: orgId,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            organization_settings: null,
            pos_settings: null,
            categories: [], // سيتم تحميلها لاحقاً
            subcategories: [],
            employees: [],
            confirmation_agents: [],
            expense_categories: []
        };
    } catch (e) {
        return null;
    }
};

// ============================================================================
// الدالة الرئيسية
// ============================================================================

/**
 * جلب كل بيانات تهيئة التطبيق في استدعاء واحد
 * 
 * @param userId - معرف المستخدم (اختياري - يستخدم المستخدم الحالي افتراضياً)
 * @param organizationId - معرف المؤسسة (اختياري)
 * @param forceRefresh - إجبار تحديث البيانات وتجاهل الـ cache
 * @returns بيانات تهيئة التطبيق الكاملة
 */
export const getAppInitializationData = async (
    userId?: string,
    organizationId?: string,
    forceRefresh: boolean = false
): Promise<AppInitializationData> => {
    const startTime = performance.now();
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    try {
        // 1️⃣ محاولة الحصول على البيانات من الـ Memory cache
        if (!forceRefresh && userId) {
            const cachedData = getCachedData(userId);
            if (cachedData) {
                const duration = performance.now() - startTime;
                console.log(`⚡ [AppInitialization] تم جلب البيانات من الـ cache في ${duration.toFixed(2)}ms`);
                return cachedData;
            }
        }

        // 2️⃣ ⚡ LOCAL-FIRST: قراءة من PowerSync أولاً (حتى لو Online!)
        // هذا يوفر 80% من استدعاءات Supabase ويحسن الأداء بشكل كبير
        if (!forceRefresh && isPowerSyncReady()) {
            const initOrgId = organizationId || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || undefined;
            if (initOrgId) {
                // PowerSync doesn't need explicit initialization per org

                // محاولة جلب البيانات المحفوظة
                // ⚡ FIX: Use the improved key builder that auto-resolves missing IDs
                const key = buildOfflineKey(userId, organizationId);
                const byId = await getAppInitCacheById(key);

                if (byId.success && byId.data) {
                    const duration = performance.now() - startTime;
                    console.log(`⚡ [AppInitialization] LOCAL-FIRST: تم جلب البيانات من SQLite في ${duration.toFixed(2)}ms`);

                    // ✅ حفظ في Memory cache
                    const localData = byId.data as AppInitializationData;
                    if (localData.user?.auth_user_id) {
                        setCachedData(localData.user.auth_user_id, localData);
                    }

                    // ⚡ تحديث في الخلفية إذا Online (بدون انتظار)
                    if (isOnline) {
                        scheduleIdle(() => {
                            refreshAppDataInBackground(userId, organizationId, initOrgId).catch(err => {
                                console.warn('[AppInitialization] ⚠️ Background refresh failed:', err);
                            });
                        }, 1500, 15000);

                        // ⚡ فحص المنتجات الناقصة بعد هدوء الإقلاع لتجنب مزامنة مزدوجة
                        scheduleBackgroundProductSync(initOrgId!);
                    }

                    return localData;
                }

                // محاولة جلب آخر نسخة
                const latest = await getLatestAppInitCacheByUserOrg(userId || null, initOrgId || null);
                if (latest.success && latest.data) {
                    const duration = performance.now() - startTime;
                    console.log(`⚡ [AppInitialization] LOCAL-FIRST: تم جلب آخر نسخة من SQLite في ${duration.toFixed(2)}ms`);

                    const localData = latest.data as AppInitializationData;
                    if (localData.user?.auth_user_id) {
                        setCachedData(localData.user.auth_user_id, localData);
                    }

                    // ⚡ تحديث في الخلفية إذا Online
                    if (isOnline) {
                        scheduleIdle(() => {
                            refreshAppDataInBackground(userId, organizationId, initOrgId).catch(() => { });
                        }, 1500, 15000);

                        // ⚡ فحص المنتجات الناقصة بعد هدوء الإقلاع لتجنب مزامنة مزدوجة
                        scheduleBackgroundProductSync(initOrgId!);
                    }

                    return localData;
                }

                // 🔄 Fallback: بناء بيانات التهيئة من جداول SQLite مباشرة
                const fallbackData = await buildAppDataFromSQLiteTables(initOrgId, userId);
                if (fallbackData) {
                    const duration = performance.now() - startTime;
                    console.log(`⚡ [AppInitialization] LOCAL-FIRST: تم بناء البيانات من SQLite في ${duration.toFixed(2)}ms`);

                    // ⚡ تحديث في الخلفية إذا Online
                    if (isOnline) {
                        scheduleIdle(() => {
                            refreshAppDataInBackground(userId, organizationId, initOrgId).catch(() => { });
                        }, 1500, 15000);
                    }

                    return fallbackData;
                }
            }
        }

        // 3️⃣ إذا لم توجد بيانات محلية و Offline، ارمِ خطأ
        if (!isOnline) {
            throw new Error('لا توجد بيانات محفوظة متاحة في وضع Offline');
        }

        // 4️⃣ جلب البيانات من السيرفر (فقط إذا لم تُوجد محلياً)
        console.log('🚀 [AppInitialization] لا توجد بيانات محلية - جلب من السيرفر...');

        const { data, error } = await deduplicateRequest(
            `app-init-${userId || 'current'}-${organizationId || 'default'}`,
            async () => {
                return await (supabase.rpc as any)('get_app_initialization_data', {
                    p_user_id: userId || null,
                    p_organization_id: organizationId || null
                });
            }
        );

        if (error) {
            console.error('❌ [AppInitialization] خطأ في جلب البيانات:', error);
            throw error;
        }

        if (!data) {
            throw new Error('لم يتم العثور على بيانات');
        }

        // 3️⃣ تحويل البيانات إلى الصيغة المطلوبة
        const appData: AppInitializationData = typeof data === 'string'
            ? JSON.parse(data)
            : data;

        // 4️⃣ حفظ البيانات في الـ cache
        if (appData.user?.auth_user_id) {
            setCachedData(appData.user.auth_user_id, appData);
        }

        // 4.1️⃣ حفظ نسخة للأوفلاين في PowerSync
        try {
            const cacheId = buildOfflineKey(appData.user?.auth_user_id || userId, organizationId);
            if (isPowerSyncReady()) {
                const initOrgId = appData.organization?.id || organizationId || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || undefined;
                if (initOrgId) {
                    // PowerSync doesn't need explicit initialization

                    // ✅ PowerSync يدير المزامنة تلقائياً
                    // لا حاجة لإصلاح يدوي - PowerSync يتتبع الحالة عبر ps_crud
                    console.log('[AppInitialization] ℹ️ PowerSync manages sync state automatically');

                    // 📥 فحص المنتجات بعد هدوء الإقلاع لتجنب مزامنة مزدوجة
                    scheduleBackgroundProductSync(initOrgId);

                    // ⚠️ تم إزالة مزامنة العملاء والطلبات من هنا
                    // السبب: TauriSyncService/DeltaSyncEngine يقوم بالمزامنة التدريجية تلقائياً
                    // هذا يمنع التكرار والتداخل ويحسن الأداء
                    //
                    // المسؤوليات:
                    // - TauriSyncService: المزامنة الرئيسية للعملاء والطلبات (عبر DeltaSyncEngine)
                    // - AppInitializationService: تهيئة البيانات الأساسية فقط (موردين، إصلاحات، ديون، موظفين)

                    try {
                        // 🔧 فحص إذا كانت هذه أول مرة بعد التحديث v1.0.20+
                        // لضمان جلب جميع العملاء المفقودين مرة واحدة (يُنفذ مرة واحدة فقط)
                        if (isPowerSyncReady()) {
                            const SYNC_FIX_VERSION = 'v1.0.20_customers_sync_fix';
                            const syncFixApplied = localStorage.getItem(SYNC_FIX_VERSION);

                            if (!syncFixApplied) {
                                console.log('[AppInitialization] 🔧 First run after sync fix - PowerSync handles sync automatically');
                                localStorage.setItem(SYNC_FIX_VERSION, new Date().toISOString());
                            }
                        }

                        // 📥 مزامنة الموردين
                        if (!powerSyncService.db) {
                            console.warn('[AppInitialization] PowerSync DB not initialized');
                        } else {
                            const suppliersCount = await powerSyncQuery('SELECT COUNT(*) as count FROM suppliers WHERE organization_id = ?', [initOrgId]);
                            const hasSuppliers = (suppliersCount.data?.[0]?.count || 0) > 0;

                            if (!hasSuppliers) {
                                console.log('[AppInitialization] 📥 Syncing suppliers...');
                                const { getSuppliers } = await import('./supplierService');
                                await getSuppliers(initOrgId); // هذا سيحفظ محلياً تلقائياً
                                console.log('[AppInitialization] ✅ Suppliers synced');
                            }
                        }

                        // ✅ جميع البيانات تُزامن تلقائياً عبر PowerSync Sync Rules
                        // الجداول المتزامنة: products, orders, customers, suppliers, pos_staff_sessions, staff_work_sessions, expenses, etc.
                        console.log('[AppInitialization] ℹ️ All data synced automatically via PowerSync Sync Rules');

                        // 📥 pos_staff_sessions يتم مزامنتها تلقائياً عبر PowerSync
                        // لا حاجة لمزامنة يدوية - PowerSync يقوم بذلك عبر Sync Rules
                        console.log('[AppInitialization] ℹ️ Staff sessions synced automatically via PowerSync');

                        // 🖼️ تحميل صور الفئات للأوفلاين (في الخلفية وبشكل كسول)
                        scheduleIdle(async () => {
                            try {
                                console.log('[AppInitialization] 🖼️ Caching category images for offline...');
                                const cacheResult = await categoryImageService.cacheAllCategoryImages(initOrgId!);
                                if (cacheResult.cached > 0) {
                                    console.log(`[AppInitialization] ✅ Category images cached: ${cacheResult.cached} cached, ${cacheResult.skipped} skipped`);
                                }
                            } catch (e) {
                                console.warn('[AppInitialization] ⚠️ Failed to cache category images:', e);
                            }
                        }, 5000, 20000);
                    } catch (syncError) {
                        console.warn('[AppInitialization] ⚠️ Failed to sync customers/orders/suppliers/repairs/debts/staff:', syncError);
                    }
                }
                // ✅ pos_staff_sessions و users يتم مزامنتهم تلقائياً عبر PowerSync Sync Rules
                // لا حاجة لحفظ يدوي - البيانات تُزامن تلقائياً من Supabase
                console.log('[AppInitialization] ℹ️ Staff and users synced automatically via PowerSync');
                await setAppInitCache({
                    id: cacheId,
                    userId: appData.user?.auth_user_id || userId || null,
                    organizationId: appData.organization?.id || organizationId || null,
                    data: appData
                });
            }
        } catch { }

        const duration = performance.now() - startTime;
        console.log(`✅ [AppInitialization] تم جلب البيانات بنجاح في ${duration.toFixed(2)}ms`);
        console.log('📊 [AppInitialization] إحصائيات البيانات:', {
            categories: appData.categories?.length || 0,
            subcategories: appData.subcategories?.length || 0,
            employees: appData.employees?.length || 0,
            confirmationAgents: appData.confirmation_agents?.length || 0,
            hasOrganizationSettings: !!appData.organization_settings,
            hasPOSSettings: !!appData.pos_settings
        });

        return appData;

    } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`❌ [AppInitialization] فشل جلب البيانات بعد ${duration.toFixed(2)}ms:`, error);

        // ✅ Offline fallback: حاول إرجاع النسخة الأخيرة المخزنة من SQLite عند انقطاع الشبكة
        try {
            const msg = (error as any)?.message ? String((error as any).message).toLowerCase() : '';
            const looksLikeNetwork =
                msg.includes('network disconnected') ||
                msg.includes('failed to fetch') ||
                msg.includes('network error') ||
                msg.includes('timeout') ||
                msg.includes('offline');

            if (looksLikeNetwork) {
                if (isPowerSyncReady()) {
                    const initOrgId = organizationId || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || undefined;
                    if (initOrgId) {
                        // PowerSync doesn't need explicit initialization
                    }
                    const key = buildOfflineKey(userId, organizationId);
                    const byId = await getAppInitCacheById(key);
                    if (byId.success && byId.data) {
                        console.warn('⚠️ [AppInitialization] استخدام بيانات التهيئة المحفوظة (PowerSync) بسبب انقطاع الشبكة');
                        return byId.data as AppInitializationData;
                    }
                    const latest = await getLatestAppInitCacheByUserOrg(userId || null, initOrgId || null);
                    if (latest.success && latest.data) {
                        console.warn('⚠️ [AppInitialization] استخدام آخر نسخة محفوظة من بيانات التهيئة (PowerSync)');
                        return latest.data as AppInitializationData;
                    }

                    // 🔄 Fallback النهائي: بناء البيانات من جداول PowerSync
                    console.log('🔄 [AppInitialization] محاولة بناء البيانات من جداول PowerSync (catch fallback)...');
                    const fallbackData = await buildAppDataFromSQLiteTables(initOrgId, userId);
                    if (fallbackData) {
                        console.warn('⚠️ [AppInitialization] تم بناء البيانات من PowerSync بسبب انقطاع الشبكة');
                        return fallbackData;
                    }
                }
            }
        } catch { }

        throw error;
    }
};

/**
 * جلب بيانات تهيئة التطبيق مع إعادة المحاولة
 */
export const getAppInitializationDataWithRetry = async (
    userId?: string,
    organizationId?: string,
    maxRetries: number = 3
): Promise<AppInitializationData> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 [AppInitialization] محاولة ${attempt}/${maxRetries}`);
            return await getAppInitializationData(userId, organizationId, attempt > 1);
        } catch (error) {
            lastError = error as Error;
            console.warn(`⚠️ [AppInitialization] فشلت المحاولة ${attempt}/${maxRetries}:`, error);

            if (attempt < maxRetries) {
                // انتظار قبل إعادة المحاولة (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`⏳ [AppInitialization] انتظار ${delay}ms قبل إعادة المحاولة...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('فشل جلب بيانات التطبيق بعد عدة محاولات');
};

/**
 * تحديث جزء معين من البيانات في الـ cache
 */
export const updateCachedData = (
    userId: string,
    updates: Partial<AppInitializationData>
) => {
    const cached = cache.get(userId);
    if (cached) {
        cached.data = {
            ...cached.data,
            ...updates
        };
        cached.timestamp = Date.now();
        console.log('🔄 [AppInitialization] تم تحديث الـ cache');
    }
};

/**
 * إعادة تحميل البيانات وتحديث الـ cache
 */
export const refreshAppInitializationData = async (
    userId?: string,
    organizationId?: string
): Promise<AppInitializationData> => {
    console.log('🔄 [AppInitialization] إعادة تحميل البيانات...');
    return await getAppInitializationData(userId, organizationId, true);
};

/**
 * ⚡ تحديث البيانات في الخلفية (بدون حظر UI)
 * يُستدعى بعد تحميل البيانات المحلية لضمان تحديثها
 */
const refreshAppDataInBackground = async (
    userId?: string,
    organizationId?: string,
    initOrgId?: string
): Promise<void> => {
    try {
        // تحقق من آخر وقت تحديث
        const lastRefreshKey = `app_init_last_refresh_${organizationId || 'default'}`;
        const lastRefresh = localStorage.getItem(lastRefreshKey);
        const now = Date.now();

        // ⚡ لا تحدث إذا تم التحديث منذ أقل من 30 دقيقة (بدلاً من 5 دقائق)
        if (lastRefresh && (now - parseInt(lastRefresh)) < 30 * 60 * 1000) {
            console.log('[AppInitialization] ⏭️ Background refresh skipped - recent update exists');
            return;
        }

        // ⚡ لا تحدث إذا كانت الصفحة مخفية
        if (typeof document !== 'undefined' && document.hidden) {
            console.log('[AppInitialization] ⏭️ Background refresh skipped - page is hidden');
            return;
        }

        console.log('[AppInitialization] 🔄 Background refresh starting...');

        // جلب البيانات من السيرفر
        const { data, error } = await (supabase.rpc as any)('get_app_initialization_data', {
            p_user_id: userId || null,
            p_organization_id: organizationId || null
        });

        if (error) {
            console.warn('[AppInitialization] ⚠️ Background refresh failed:', error);
            return;
        }

        if (!data) return;

        const appData: AppInitializationData = typeof data === 'string' ? JSON.parse(data) : data;

        // تحديث Memory cache
        if (appData.user?.auth_user_id) {
            setCachedData(appData.user.auth_user_id, appData);
        }

        // تحديث PowerSync cache
        if (isPowerSyncReady() && initOrgId) {
            const cacheId = buildOfflineKey(appData.user?.auth_user_id || userId, organizationId);
            await setAppInitCache({
                id: cacheId,
                userId: appData.user?.auth_user_id || userId || null,
                organizationId: appData.organization?.id || organizationId || null,
                data: appData
            });
        }

        // حفظ وقت التحديث
        localStorage.setItem(lastRefreshKey, now.toString());

        console.log('[AppInitialization] ✅ Background refresh completed');
    } catch (error) {
        console.warn('[AppInitialization] ⚠️ Background refresh error:', error);
    }
};
