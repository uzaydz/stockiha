/**
 * أدوات مساعدة لمزامنة المنتجات
 * توفر واجهة سهلة لتحميل المنتجات من السيرفر إلى SQLite
 *
 * ⚡ إصلاح: الآن يقارن عدد المنتجات مع السيرفر لاكتشاف المنتجات الناقصة
 */

import { syncProductsFromServer } from './syncService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { supabase } from '@/lib/supabase-unified';

// ⚡ Cache لعدد الكيانات على السيرفر (لتقليل الاستدعاءات - استدعاء RPC واحد بدلاً من متعددة)
interface EntityCountsCache {
  counts: {
    products: number;
    customers: number;
    orders: number;
    product_categories: number;
  };
  timestamp: number;
  orgId: string;
}
let entityCountsCache: EntityCountsCache | null = null;
const SERVER_COUNT_CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

// ⚡ v2.0: منع تكرار المزامنة المتزامنة
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 5000; // 5 ثوانٍ بين كل مزامنة

/**
 * فحص عدد المنتجات المحلية في SQLite
 * ⚡ v2.0: نحسب المنتجات النشطة فقط للمقارنة مع السيرفر RPC
 * لأن RPC يحسب المنتجات النشطة فقط
 */
export const getLocalProductsCount = async (organizationId: string): Promise<number> => {
  try {
    if (!powerSyncService.db) {
      console.warn('[productSyncUtils] PowerSync DB not initialized');
      return 0;
    }

    // ⚡ v2.0: نحسب المنتجات النشطة فقط (للمقارنة الصحيحة مع RPC)
    const activeResult = await powerSyncService.query<any>({
      sql: 'SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)',
      params: [organizationId]
    });
    const activeCount = activeResult?.[0]?.count || 0;

    // ⚡ DEBUG: عرض تفاصيل أكثر (مرة واحدة فقط)
    const totalResult = await powerSyncService.query<any>({
      sql: 'SELECT COUNT(*) as count FROM products WHERE organization_id = ?',
      params: [organizationId]
    });
    const totalCount = totalResult?.[0]?.count || 0;
    const inactiveCount = totalCount - activeCount;

    if (inactiveCount > 0) {
      console.log('[ProductSyncUtils] 📊 Local products count:', {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount
      });
    }

    // نُرجع عدد المنتجات النشطة فقط
    return activeCount;
  } catch (error) {
    console.error('[ProductSyncUtils] Error counting products:', error);
    return 0;
  }
};

/**
 * ⚡ جلب عدد الكيانات من السيرفر باستخدام RPC موحد (استدعاء واحد بدلاً من متعددة)
 */
export const getServerEntityCounts = async (organizationId: string): Promise<EntityCountsCache['counts'] | null> => {
  try {
    // استخدام Cache إذا كان صالحاً
    const now = Date.now();
    if (
      entityCountsCache &&
      entityCountsCache.orgId === organizationId &&
      (now - entityCountsCache.timestamp) < SERVER_COUNT_CACHE_TTL
    ) {
      console.log('[ProductSyncUtils] 📊 Using cached entity counts');
      return entityCountsCache.counts;
    }

    // ⚡ استخدام RPC موحد بدلاً من استدعاءات متعددة
    const { data, error } = await supabase.rpc('get_entity_counts', {
      p_organization_id: organizationId
    });

    if (error) {
      console.warn('[ProductSyncUtils] Error fetching entity counts via RPC:', error);

      // ⚡ Fallback: استعلام مباشر لجدول المنتجات فقط
      console.log('[ProductSyncUtils] 📊 Trying direct count query as fallback...');
      const { count: productsCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (!countError && productsCount !== null) {
        const fallbackCounts = {
          products: productsCount,
          customers: 0,
          orders: 0,
          product_categories: 0
        };

        // حفظ في Cache (مع TTL أقصر للـ fallback)
        entityCountsCache = {
          counts: fallbackCounts,
          timestamp: now,
          orgId: organizationId
        };

        console.log('[ProductSyncUtils] 📊 Fetched products count via fallback:', productsCount);
        return fallbackCounts;
      }

      return null;
    }

    const counts = {
      products: data?.products || 0,
      customers: data?.customers || 0,
      orders: data?.orders || 0,
      product_categories: data?.product_categories || 0
    };

    // حفظ في Cache
    entityCountsCache = {
      counts,
      timestamp: now,
      orgId: organizationId
    };

    console.log('[ProductSyncUtils] 📊 Fetched entity counts via RPC:', counts);
    return counts;
  } catch (error) {
    console.warn('[ProductSyncUtils] Error fetching entity counts:', error);
    return null;
  }
};

/**
 * ⚡ جلب عدد المنتجات من السيرفر (يستخدم RPC الموحد)
 */
export const getServerProductsCount = async (organizationId: string): Promise<number> => {
  const counts = await getServerEntityCounts(organizationId);
  return counts?.products || 0;
};

/**
 * ⚡ مسح cache عدد الكيانات
 */
export const clearEntityCountsCache = () => {
  entityCountsCache = null;
};

/**
 * ⚡ v2.0: الحصول على حالة المزامنة الحالية
 */
export const getSyncStatus = () => ({
  isSyncing,
  lastSyncTime,
  cooldownRemaining: Math.max(0, SYNC_COOLDOWN - (Date.now() - lastSyncTime))
});

/**
 * ⚡ v2.0: إعادة تعيين حالة المزامنة (للتصحيح فقط)
 */
export const resetSyncState = () => {
  isSyncing = false;
  lastSyncTime = 0;
  console.log('[ProductSyncUtils] 🔄 Sync state reset');
};

/**
 * فحص إذا كانت SQLite فارغة من المنتجات
 */
export const isSQLiteEmpty = async (organizationId: string): Promise<boolean> => {
  const count = await getLocalProductsCount(organizationId);
  return count === 0;
};

/**
 * ⚡ تحميل المنتجات من السيرفر إلى SQLite إذا كانت فارغة أو ناقصة
 *
 * الإصلاح الرئيسي: الآن يقارن عدد المنتجات مع السيرفر!
 * - إذا فارغ → يحمل
 * - إذا الفرق > 5 منتجات أو > 20% → يحمل
 * - إذا لم يتم التحديث منذ 24 ساعة → يحمل
 *
 * v2.0: منع تكرار المزامنة المتزامنة
 */
export const ensureProductsInSQLite = async (organizationId: string): Promise<{
  needed: boolean;
  success: boolean;
  count: number;
  error?: string;
  reason?: string;
}> => {
  // ⚡ v2.0: منع تكرار المزامنة المتزامنة
  const now = Date.now();
  if (isSyncing) {
    console.log('[ProductSyncUtils] ⏳ Sync already in progress - skipping');
    return { needed: false, success: true, count: 0, reason: 'sync_in_progress' };
  }

  if (now - lastSyncTime < SYNC_COOLDOWN) {
    console.log('[ProductSyncUtils] ⏳ Sync cooldown active - skipping');
    return { needed: false, success: true, count: 0, reason: 'cooldown' };
  }

  try {
    const localCount = await getLocalProductsCount(organizationId);

    // ⚡ فحص آخر مزامنة للمنتجات
    const lastSyncKey = `products_last_sync_${organizationId}`;
    const lastSync = localStorage.getItem(lastSyncKey);
    const now = Date.now();
    const hoursSinceLastSync = lastSync ? (now - parseInt(lastSync)) / (1000 * 60 * 60) : Infinity;

    // إذا فارغ، حمل فوراً
    if (localCount === 0) {
      console.log('[ProductSyncUtils] 📥 SQLite empty - downloading products...');
      isSyncing = true;
      try {
        const savedCount = await syncProductsFromServer(organizationId);
        localStorage.setItem(lastSyncKey, now.toString());
        lastSyncTime = now;
        // مسح cache السيرفر
        entityCountsCache = null;
        return { needed: true, success: savedCount > 0, count: savedCount, reason: 'empty' };
      } finally {
        isSyncing = false;
      }
    }

    // ⚡ مقارنة مع السيرفر (فقط إذا Online)
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    if (isOnline) {
      const serverCount = await getServerProductsCount(organizationId);
      const diff = serverCount - localCount;
      const absDiff = Math.abs(diff);
      const diffPercentage = serverCount > 0 ? (diff / serverCount) * 100 : 0;
      const absDiffPercentage = Math.abs(diffPercentage);

      console.log('[ProductSyncUtils] 📊 Products comparison:', {
        local: localCount,
        server: serverCount,
        diff,
        diffPercentage: diffPercentage.toFixed(1) + '%',
        hoursSinceLastSync: hoursSinceLastSync.toFixed(1)
      });

      // ⚡ إصلاح v2: فحص الفرق المطلق (سواء كان محلي > سيرفر أو العكس)
      // إذا الفرق المطلق > 3 أو > 10%، أعد المزامنة
      if (absDiff > 3 || absDiffPercentage > 10) {
        if (diff > 0) {
          console.log(`[ProductSyncUtils] 📥 Missing ${diff} products locally - syncing...`);
        } else {
          console.log(`[ProductSyncUtils] 🗑️ Local has ${absDiff} orphaned products - forcing full sync...`);
        }
        isSyncing = true;
        try {
          const savedCount = await syncProductsFromServer(organizationId);
          localStorage.setItem(lastSyncKey, now.toString());
          lastSyncTime = now;
          entityCountsCache = null;
          return {
            needed: true,
            success: savedCount > 0,
            count: savedCount,
            reason: diff > 0 ? 'missing_products' : 'orphaned_products'
          };
        } finally {
          isSyncing = false;
        }
      }

      // ⚡ إذا لم يتم التحديث منذ 24 ساعة، حدث في الخلفية
      if (hoursSinceLastSync > 24) {
        console.log('[ProductSyncUtils] 📥 Last sync > 24h ago - syncing in background...');
        // لا ننتظر - نعود فوراً بالبيانات المحلية
        // ⚡ v2.0: نضع القفل للمزامنة الخلفية أيضاً
        if (!isSyncing) {
          isSyncing = true;
          syncProductsFromServer(organizationId).then(() => {
            localStorage.setItem(lastSyncKey, Date.now().toString());
            lastSyncTime = Date.now();
            entityCountsCache = null;
          }).catch(() => {}).finally(() => {
            isSyncing = false;
          });
        }
        return { needed: false, success: true, count: localCount, reason: 'background_refresh' };
      }
    }

    // ✅ البيانات كافية
    return { needed: false, success: true, count: localCount, reason: 'sufficient' };
  } catch (error: any) {
    console.error('[ProductSyncUtils] ❌ Error ensuring products:', error);
    return {
      needed: true,
      success: false,
      count: 0,
      error: error?.message || 'Unknown error'
    };
  }
};

/**
 * إعادة تحميل المنتجات من السيرفر (حتى لو كانت موجودة)
 * مفيد لتحديث البيانات المحلية
 * ⚡ v2.0: يستخدم نفس آلية القفل لمنع التكرار
 */
export const forceReloadProducts = async (organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  // ⚡ v2.0: فحص القفل
  if (isSyncing) {
    console.log('[ProductSyncUtils] ⏳ Sync already in progress - skipping force reload');
    return { success: false, count: 0, error: 'sync_in_progress' };
  }

  console.log('[ProductSyncUtils] 🔄 Force reloading products from server...');
  isSyncing = true;
  try {
    const savedCount = await syncProductsFromServer(organizationId);
    lastSyncTime = Date.now();
    entityCountsCache = null;
    return {
      success: savedCount > 0,
      count: savedCount
    };
  } finally {
    isSyncing = false;
  }
};
