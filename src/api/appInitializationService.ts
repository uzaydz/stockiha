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
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';

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
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

// Offline persistent cache now stored in SQLite (app_init_cache table)

const buildOfflineKey = (userId?: string, organizationId?: string) =>
  `app-init:${userId || 'current'}:${organizationId || 'default'}`;

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

    // جلب بيانات المؤسسة من جدول organizations
    const orgResult = await sqliteDB.query(
      'SELECT * FROM organizations WHERE id = ? LIMIT 1',
      [organizationId]
    );

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

    // جلب بيانات المستخدم من جدول employees أو local_auth_data
    let user: UserWithPermissions | null = null;

    if (userId) {
      // أولاً: محاولة جلب من local_auth_data
      const authResult = await sqliteDB.query(
        'SELECT * FROM local_auth_data WHERE auth_user_id = ? LIMIT 1',
        [userId]
      );

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

      // ثانياً: محاولة جلب من staff_members إذا لم يوجد في local_auth_data
      if (!user) {
        const empResult = await sqliteDB.query(
          'SELECT * FROM staff_members WHERE user_id = ? OR id = ? LIMIT 1',
          [userId, userId]
        );

        if (empResult.success && empResult.data?.[0]) {
          const emp = empResult.data[0];
          let permissions: string[] = [];
          try {
            if (emp.permissions) {
              permissions = typeof emp.permissions === 'string'
                ? JSON.parse(emp.permissions)
                : emp.permissions;
            }
          } catch {}

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
      }

      // ثالثاً: جلب الصلاحيات من جدول user_permissions إذا وجد
      const permResult = await sqliteDB.query(
        'SELECT * FROM user_permissions WHERE auth_user_id = ? LIMIT 1',
        [userId]
      );

      if (permResult.success && permResult.data?.[0] && user) {
        const perm = permResult.data[0];
        try {
          const parsedPerms = perm.permissions
            ? (typeof perm.permissions === 'string' ? JSON.parse(perm.permissions) : perm.permissions)
            : [];
          user.permissions = Array.isArray(parsedPerms) ? parsedPerms : [];
        } catch {}
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

    // جلب الفئات (من جدول product_categories)
    const categoriesResult = await sqliteDB.query(
      'SELECT * FROM product_categories WHERE organization_id = ? AND is_active = 1',
      [organizationId]
    );
    const categories: Category[] = (categoriesResult.data || []).map((c: any) => ({
      id: c.id,
      name: c.name || '',
      slug: c.slug || '',
      description: c.description,
      organization_id: c.organization_id,
      is_active: c.is_active !== 0,
      created_at: c.created_at || new Date().toISOString()
    }));

    // جلب الفئات الفرعية (من جدول product_subcategories)
    const subcategoriesResult = await sqliteDB.query(
      'SELECT * FROM product_subcategories WHERE organization_id = ?',
      [organizationId]
    );
    const subcategories: Subcategory[] = (subcategoriesResult.data || []).map((s: any) => ({
      id: s.id,
      name: s.name || '',
      slug: s.slug || '',
      category_id: s.category_id,
      organization_id: s.organization_id,
      is_active: s.is_active !== 0,
      created_at: s.created_at || new Date().toISOString()
    }));

    // جلب الموظفين (من جدول staff_members)
    const employeesResult = await sqliteDB.query(
      'SELECT * FROM staff_members WHERE organization_id = ? AND is_active = 1',
      [organizationId]
    );
    const employees: Employee[] = (employeesResult.data || []).map((e: any) => ({
      id: e.id,
      auth_user_id: e.user_id || e.id,
      name: e.name || e.email || '',
      email: e.email || '',
      role: e.role || 'staff',
      is_active: e.is_active !== 0,
      avatar_url: e.avatar_url || e.avatarUrl
    }));

    console.log('📊 [AppInitialization] SQLite fallback data:', {
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
  
  try {
    // 1️⃣ محاولة الحصول على البيانات من الـ cache
    if (!forceRefresh && userId) {
      const cachedData = getCachedData(userId);
      if (cachedData) {
        const duration = performance.now() - startTime;
        console.log(`⚡ [AppInitialization] تم جلب البيانات من الـ cache في ${duration.toFixed(2)}ms`);
        return cachedData;
      }
    }

    // 1.5️⃣ فحص حالة الاتصال - إذا offline، استخدم البيانات المحفوظة مباشرة
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (!isOnline && !forceRefresh) {
      console.warn('📴 [AppInitialization] في وضع Offline - استخدام البيانات المحفوظة');
      
      if (isSQLiteAvailable()) {
        const initOrgId = organizationId || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || undefined;
        if (initOrgId) {
          try { await sqliteDB.initialize(initOrgId); } catch {}
        }
        
        const key = buildOfflineKey(userId, organizationId);
        const byId = await sqliteDB.getAppInitCacheById(key);
        if (byId.success && byId.data) {
          const duration = performance.now() - startTime;
          console.log(`✅ [AppInitialization] تم جلب البيانات من SQLite (offline) في ${duration.toFixed(2)}ms`);
          return byId.data as AppInitializationData;
        }
        
        const latest = await sqliteDB.getLatestAppInitCacheByUserOrg(userId || null, initOrgId || null);
        if (latest.success && latest.data) {
          const duration = performance.now() - startTime;
          console.log(`✅ [AppInitialization] تم جلب آخر نسخة من SQLite (offline) في ${duration.toFixed(2)}ms`);
          return latest.data as AppInitializationData;
        }

        // 🔄 Fallback: بناء بيانات التهيئة من جداول SQLite مباشرة
        console.log('🔄 [AppInitialization] بناء بيانات التهيئة من جداول SQLite...');
        const fallbackData = await buildAppDataFromSQLiteTables(initOrgId, userId);
        if (fallbackData) {
          const duration = performance.now() - startTime;
          console.log(`✅ [AppInitialization] تم بناء البيانات من SQLite في ${duration.toFixed(2)}ms`);
          return fallbackData;
        }
      }

      throw new Error('لا توجد بيانات محفوظة متاحة في وضع Offline');
    }

    // 2️⃣ جلب البيانات من قاعدة البيانات باستخدام RPC موحد
    console.log('🚀 [AppInitialization] بدء جلب البيانات من قاعدة البيانات...');
    
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

    // 4.1️⃣ حفظ نسخة للأوفلاين في SQLite
    try {
      const cacheId = buildOfflineKey(appData.user?.auth_user_id || userId, organizationId);
      if (isSQLiteAvailable()) {
        const initOrgId = appData.organization?.id || organizationId || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || undefined;
        if (initOrgId) {
          await sqliteDB.initialize(initOrgId);
          
          // 🔧 إصلاح قيم synced القديمة (true → 1)
          try {
            const tables = ['products', 'customers', 'pos_orders', 'invoices', 'suppliers', 'employees', 'repair_orders', 'customer_debts'];
            for (const table of tables) {
              // 1. إصلاح القيم النصية القديمة
              await sqliteDB.execute(
                `UPDATE ${table} SET synced = 1 WHERE synced = 'true' OR synced = ''`
              );
              // 2. إصلاح السجلات التي ليس لديها عملية معلقة وتظهر كغير متزامنة
              await sqliteDB.execute(
                `UPDATE ${table} SET synced = 1 WHERE (synced = 0 OR synced IS NULL) AND pending_operation IS NULL`
              );
            }
            console.log('[AppInitialization] 🔧 Fixed synced values in tables');
          } catch (fixError) {
            // تجاهل الخطأ - قد لا تكون بعض الجداول موجودة
          }
          
          // 📥 التأكد من تحميل المنتجات إلى SQLite إذا كانت فارغة
          try {
            const { ensureProductsInSQLite } = await import('./productSyncUtils');
            const productSyncResult = await ensureProductsInSQLite(initOrgId);
            if (productSyncResult.needed) {
              console.log('[AppInitialization] 📥 Products sync result:', productSyncResult);
            }
          } catch (productSyncError) {
            console.warn('[AppInitialization] ⚠️ Failed to sync products:', productSyncError);
            // تجاهل الخطأ وعدم إيقاف التهيئة
          }
          
          // 📥 التأكد من تحميل العملاء والطلبات أيضاً
          try {
            const { syncCustomersFromServer, syncOrdersFromServer } = await import('./syncService');
            
            // فحص إذا كانت الجداول فارغة
            const customersCount = await sqliteDB.query('SELECT COUNT(*) as count FROM customers WHERE organization_id = ?', [initOrgId]);
            const ordersCount = await sqliteDB.query('SELECT COUNT(*) as count FROM pos_orders WHERE organization_id = ?', [initOrgId]);
            
            const hasCustomers = (customersCount.data?.[0]?.count || 0) > 0;
            const hasOrders = (ordersCount.data?.[0]?.count || 0) > 0;
            
            if (!hasCustomers) {
              console.log('[AppInitialization] 📥 Syncing customers...');
              const customersResult = await syncCustomersFromServer(initOrgId);
              console.log('[AppInitialization] ✅ Customers synced:', customersResult);
            }
            
            if (!hasOrders) {
              console.log('[AppInitialization] 📥 Syncing orders...');
              const ordersResult = await syncOrdersFromServer(initOrgId);
              console.log('[AppInitialization] ✅ Orders synced:', ordersResult);
            }
            
            // 📥 مزامنة الموردين
            const suppliersCount = await sqliteDB.query('SELECT COUNT(*) as count FROM suppliers WHERE organization_id = ?', [initOrgId]);
            const hasSuppliers = (suppliersCount.data?.[0]?.count || 0) > 0;
            
            if (!hasSuppliers) {
              console.log('[AppInitialization] 📥 Syncing suppliers...');
              const { getSuppliers } = await import('./supplierService');
              await getSuppliers(initOrgId); // هذا سيحفظ محلياً تلقائياً
              console.log('[AppInitialization] ✅ Suppliers synced');
            }

            // 📥 مزامنة طلبات الإصلاح
            const repairsCount = await sqliteDB.query('SELECT COUNT(*) as count FROM repair_orders WHERE organization_id = ?', [initOrgId]);
            const hasRepairs = (repairsCount.data?.[0]?.count || 0) > 0;

            if (!hasRepairs) {
              console.log('[AppInitialization] 📥 Syncing repair orders...');
              // سنقوم بجلب الإصلاحات من السيرفر وحفظها
              const { data: repairs } = await supabase
                .from('repair_orders')
                .select('*')
                .eq('organization_id', initOrgId)
                .limit(500);
              
              if (repairs && repairs.length > 0) {
                // حفظها في SQLite باستخدام DeltaWriteService لكن مباشرة لتجنب الـ Outbox
                const { deltaWriteService } = await import('@/services/DeltaWriteService');
                for (const repair of repairs) {
                   await deltaWriteService.saveFromServer('repair_orders', {
                     ...repair,
                     synced: true
                   });
                }
                console.log(`[AppInitialization] ✅ Synced ${repairs.length} repair orders`);
              }
            }

            // 📥 مزامنة الديون
            const debtsCount = await sqliteDB.query('SELECT COUNT(*) as count FROM customer_debts WHERE organization_id = ?', [initOrgId]);
            const hasDebts = (debtsCount.data?.[0]?.count || 0) > 0;

            if (!hasDebts) {
              console.log('[AppInitialization] 📥 Syncing customer debts...');
              const { data: debts } = await (supabase as any)
                .from('customer_debts')
                .select('*')
                .eq('organization_id', initOrgId)
                .limit(500);
              
              if (debts && debts.length > 0) {
                const { deltaWriteService } = await import('@/services/DeltaWriteService');
                for (const debt of debts) {
                   await deltaWriteService.saveFromServer('customer_debts', {
                     ...debt,
                     synced: true
                   });
                }
                console.log(`[AppInitialization] ✅ Synced ${debts.length} debts`);
              }
            }
          } catch (syncError) {
            console.warn('[AppInitialization] ⚠️ Failed to sync customers/orders/suppliers/repairs/debts:', syncError);
          }
        }
        // حفظ الموظفين في جدول employees للاستخدام الأوفلاين
        try {
          if (Array.isArray(appData.employees)) {
            for (const e of appData.employees) {
              await sqliteDB.upsert('employees', {
                id: e.id || e.auth_user_id || crypto.randomUUID(),
                auth_user_id: e.auth_user_id || e.id || null,
                name: e.name || e.email || '',
                email: e.email || '',
                phone: (e as any).phone || null,
                role: 'employee',
                is_active: (e as any).is_active !== false,
                organization_id: appData.organization?.id || organizationId || null,
                permissions: (e as any).permissions || {},
                created_at: (e as any).created_at || new Date().toISOString(),
                updated_at: (e as any).updated_at || new Date().toISOString(),
                synced: 1, // ✅ متزامن لأننا جلبناه من السيرفر
                sync_status: 'synced'
              });
            }
          }
          // حفظ المستخدم الحالي كـ admin أيضاً للاستخدام الأوفلاين
          if (appData.user) {
            await sqliteDB.upsert('employees', {
              id: appData.user.id || appData.user.auth_user_id,
              auth_user_id: appData.user.auth_user_id || appData.user.id,
              name: appData.user.name || appData.user.email,
              email: appData.user.email,
              phone: (appData.user as any).phone || null,
              role: (appData.user as any).role || 'admin',
              is_active: appData.user.is_active !== false,
              organization_id: appData.organization?.id || organizationId || null,
              permissions: appData.user.permissions || [],
              created_at: appData.user.created_at,
              updated_at: appData.user.updated_at,
              synced: 1, // ✅ متزامن
              sync_status: 'synced'
            });
          }
        } catch {}
        await sqliteDB.setAppInitCache({
          id: cacheId,
          userId: appData.user?.auth_user_id || userId || null,
          organizationId: appData.organization?.id || organizationId || null,
          data: appData
        });
      }
    } catch {}

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
        if (isSQLiteAvailable()) {
          const initOrgId = organizationId || localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || undefined;
          if (initOrgId) {
            try { await sqliteDB.initialize(initOrgId); } catch {}
          }
          const key = buildOfflineKey(userId, organizationId);
          const byId = await sqliteDB.getAppInitCacheById(key);
          if (byId.success && byId.data) {
            console.warn('⚠️ [AppInitialization] استخدام بيانات التهيئة المحفوظة (SQLite) بسبب انقطاع الشبكة');
            return byId.data as AppInitializationData;
          }
          const latest = await sqliteDB.getLatestAppInitCacheByUserOrg(userId || null, initOrgId || null);
          if (latest.success && latest.data) {
            console.warn('⚠️ [AppInitialization] استخدام آخر نسخة محفوظة من بيانات التهيئة (SQLite)');
            return latest.data as AppInitializationData;
          }

          // 🔄 Fallback النهائي: بناء البيانات من جداول SQLite
          console.log('🔄 [AppInitialization] محاولة بناء البيانات من جداول SQLite (catch fallback)...');
          const fallbackData = await buildAppDataFromSQLiteTables(initOrgId, userId);
          if (fallbackData) {
            console.warn('⚠️ [AppInitialization] تم بناء البيانات من SQLite بسبب انقطاع الشبكة');
            return fallbackData;
          }
        }
      }
    } catch {}

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
