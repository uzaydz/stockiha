/**
 * 🔧 خدمة المزامنة الشاملة المحسنة
 * Enhanced Complete Sync Service
 *
 * ⚡ تم التحديث لاستخدام Tauri SQL مباشرة + Delta Sync كـ fallback
 *
 * تشمل:
 * - مزامنة جلسات العمل (Work Sessions)
 * - مزامنة خدمات التصليح (Repairs)
 * - مزامنة الاشتراكات (Subscriptions)
 * - مزامنة الألوان والمقاسات (Colors & Sizes)
 */

import { supabase } from '@/lib/supabase';
import { syncLockManager } from '@/lib/sync';
import { syncPendingWorkSessions } from '@/api/localWorkSessionService';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { tauriQuery, tauriUpsert } from '@/lib/db/tauriSqlClient';
import type { LocalWorkSession, LocalRepairOrder } from '@/database/localDb';

// فحص بيئة Tauri
const isTauriEnv = (): boolean => {
  try {
    // @ts-ignore
    if ((import.meta as any).env?.TAURI) return true;
  } catch {}
  if (typeof window === 'undefined') return false;
  const w: any = window as any;
  if (typeof w.__TAURI_IPC__ === 'function') return true;
  if (!!w.__TAURI__) return true;
  if (typeof w.isTauri === 'boolean' && w.isTauri) return true;
  return false;
};

// ===== مزامنة جلسات العمل =====

/**
 * مزامنة جلسات العمل من السيرفر إلى القاعدة المحلية
 */
export async function syncWorkSessionsFromServer(organizationId: string): Promise<{
    success: boolean;
    count: number;
    error?: string;
}> {
    try {
        console.log('[SyncService] 🔄 بدء مزامنة جلسات العمل من السيرفر...');

        // جلب جلسات العمل من السيرفر
        const { data: sessions, error } = await (supabase as any)
            .from('staff_work_sessions')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(100); // آخر 100 جلسة

        if (error) {
            // ⚡ التعامل مع خطأ "الجدول غير موجود" بدون إظهار خطأ
            const errorCode = error.code || '';
            const errorMsg = error.message || '';
            if (errorCode === '42P01' || errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
                console.log('[SyncService] ℹ️ جدول staff_work_sessions غير موجود على السيرفر - تخطي');
                return { success: true, count: 0 };
            }
            console.error('[SyncService] ❌ خطأ في جلب جلسات العمل:', error);
            return { success: false, count: 0, error: error.message };
        }

        if (!sessions || sessions.length === 0) {
            console.log('[SyncService] ℹ️ لا توجد جلسات عمل');
            return { success: true, count: 0 };
        }

        // ⚡ حفظ في القاعدة المحلية
        console.log('[SyncService] 💾 حفظ', sessions.length, 'جلسة في القاعدة المحلية...');

        for (const session of sessions) {
            try {
                const localSession = {
                    ...session,
                    pause_count: (session as any).pause_count || 0,
                    total_pause_duration: (session as any).total_pause_duration || 0,
                    synced: true,
                    syncStatus: undefined,
                    pendingOperation: undefined,
                };

                if (window.electronAPI?.db) {
                    await window.electronAPI.db.upsert('work_sessions', localSession);
                } else if (isTauriEnv()) {
                    // ⚡ استخدام Tauri SQL مباشرة
                    await tauriUpsert(organizationId, 'work_sessions', localSession);
                } else {
                    await deltaWriteService.saveFromServer('work_sessions', localSession as any);
                }
            } catch (err) {
                console.error('[SyncService] ⚠️ فشل حفظ جلسة:', session.id, err);
            }
        }

        console.log(`[SyncService] ✅ تم مزامنة ${sessions.length} جلسة عمل`);
        return { success: true, count: sessions.length };

    } catch (error: any) {
        console.error('[SyncService] ❌ خطأ في syncWorkSessionsFromServer:', error);
        return { success: false, count: 0, error: error.message };
    }
}

// ===== مزامنة خدمات التصليح =====

/**
 * مزامنة خدمات التصليح من السيرفر إلى القاعدة المحلية
 */
export async function syncRepairsFromServer(organizationId: string): Promise<{
    success: boolean;
    count: number;
    error?: string;
}> {
    try {
        console.log('[SyncService] 🔄 بدء مزامنة خدمات التصليح من السيرفر...');

        // جلب خدمات التصليح من السيرفر
        const { data: repairs, error } = await supabase
            .from('repair_orders')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(200); // آخر 200 خدمة

        if (error) {
            console.error('[SyncService] ❌ خطأ في جلب خدمات التصليح:', error);
            return { success: false, count: 0, error: error.message };
        }

        if (!repairs || repairs.length === 0) {
            console.log('[SyncService] ℹ️ لا توجد خدمات تصليح');
            return { success: true, count: 0 };
        }

        // ⚡ حفظ في القاعدة المحلية
        console.log('[SyncService] 💾 حفظ', repairs.length, 'خدمة تصليح في القاعدة المحلية...');

        for (const repair of repairs) {
            try {
                const localRepair = {
                    ...repair,
                    customer_name_lower: repair.customer_name?.toLowerCase(),
                    device_type_lower: (repair as any).device_type?.toLowerCase(),
                    synced: true,
                    syncStatus: undefined,
                    pendingOperation: undefined,
                };

                if (window.electronAPI?.db) {
                    await window.electronAPI.db.upsert('repairs', localRepair);
                } else if (isTauriEnv()) {
                    // ⚡ استخدام Tauri SQL مباشرة
                    await tauriUpsert(organizationId, 'repairs', localRepair);
                } else {
                    await deltaWriteService.saveFromServer('repairs', localRepair as any);
                }
            } catch (err) {
                console.error('[SyncService] ⚠️ فشل حفظ خدمة تصليح:', repair.id, err);
            }
        }

        console.log(`[SyncService] ✅ تم مزامنة ${repairs.length} خدمة تصليح`);
        return { success: true, count: repairs.length };

    } catch (error: any) {
        console.error('[SyncService] ❌ خطأ في syncRepairsFromServer:', error);
        return { success: false, count: 0, error: error.message };
    }
}

/**
 * مزامنة خدمات التصليح المعلقة إلى السيرفر
 * ⚡ تم التحديث لاستخدام Delta Sync
 */
export async function syncPendingRepairs(): Promise<{ synced: number; failed: number }> {
    const result = await syncLockManager.withLock('orders', async () => {
        try {
            console.log('[SyncService] 🔄 Starting repairs sync...');

            const orgId = localStorage.getItem('currentOrganizationId') ||
                localStorage.getItem('bazaar_organization_id') || '';

            // ⚡ جلب خدمات التصليح غير المتزامنة
            let allRepairs: LocalRepairOrder[] = [];

            if (window.electronAPI?.db) {
                const result = await window.electronAPI.db.query('SELECT * FROM repair_orders WHERE organization_id = ? AND (pending_operation IS NULL OR pending_operation != \'delete\') ORDER BY created_at DESC', [orgId]);
                allRepairs = result.data || [];
            } else if (isTauriEnv()) {
                const result = await tauriQuery(orgId, 'SELECT * FROM repair_orders WHERE organization_id = ? AND (pending_operation IS NULL OR pending_operation != \'delete\') ORDER BY created_at DESC', [orgId]);
                allRepairs = result.data || [];
            } else {
                allRepairs = await deltaWriteService.getAll<LocalRepairOrder>('repair_orders', orgId);
            }

            const unsyncedRepairs = allRepairs.filter(r => !r.synced && r.synced !== 1);

            if (unsyncedRepairs.length === 0) {
                console.log('[SyncService] ✅ No unsynced repairs');
                return { synced: 0, failed: 0 };
            }

            console.log(`[SyncService] 📦 Found ${unsyncedRepairs.length} unsynced repairs`);

            let synced = 0;
            let failed = 0;

            for (const repair of unsyncedRepairs) {
                try {
                    const operation = repair.pendingOperation || 'create';

                    if (operation === 'create' || operation === 'update') {
                        // تنظيف البيانات
                        const { synced: _, syncStatus: __, pendingOperation: ___, ...cleanRepair } = repair as any;

                        const { error } = await supabase
                            .from('repair_orders')
                            .upsert(cleanRepair);

                        if (error) {
                            console.error('[SyncService] ❌ Failed to sync repair:', error);
                            failed++;
                        } else {
                            // ⚡ تحديث الحالة المحلية باستخدام Delta Sync
                            await deltaWriteService.update('repair_orders', repair.id, {
                                synced: true,
                                syncStatus: undefined,
                                pendingOperation: undefined,
                            });
                            synced++;
                        }
                    } else if (operation === 'delete') {
                        const { error } = await supabase
                            .from('repair_orders')
                            .delete()
                            .eq('id', repair.id);

                        if (!error) {
                            await deltaWriteService.delete('repair_orders', repair.id);
                            synced++;
                        } else {
                            failed++;
                        }
                    }
                } catch (error) {
                    console.error('[SyncService] ❌ Error syncing repair:', repair.id, error);
                    failed++;
                }
            }

            console.log(`[SyncService] ✅ Repairs sync completed: ${synced} synced, ${failed} failed`);
            return { synced, failed };

        } catch (error) {
            console.error('[SyncService] ❌ Repairs sync error:', error);
            return { synced: 0, failed: 0 };
        }
    }, 60000);

    return result || { synced: 0, failed: 0 };
}

// ===== مزامنة الاشتراكات =====

/**
 * مزامنة الاشتراكات من السيرفر إلى القاعدة المحلية
 */
export async function syncSubscriptionsFromServer(organizationId: string): Promise<{
    success: boolean;
    subscription?: any;
    error?: string;
}> {
    try {
        console.log('[SyncService] 🔄 بدء مزامنة الاشتراكات من السيرفر...');

        // جلب الاشتراك النشط من السيرفر
        const { data: subscriptions, error } = await supabase
            .from('organization_subscriptions')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[SyncService] ❌ خطأ في جلب الاشتراكات:', error);
            return { success: false, error: error.message };
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log('[SyncService] ℹ️ لا يوجد اشتراك');
            return { success: true };
        }

        const subscription = subscriptions[0];

        // ⚡ حفظ في القاعدة المحلية باستخدام Delta Sync
        try {
            await deltaWriteService.saveFromServer('organization_subscriptions' as any, {
                ...subscription,
                last_check: new Date().toISOString(),
                synced: true,
            });

            console.log('[SyncService] ✅ تم مزامنة الاشتراك');
            return { success: true, subscription };

        } catch (err) {
            console.error('[SyncService] ⚠️ فشل حفظ الاشتراك:', err);
            return { success: false, error: 'Failed to save subscription locally' };
        }

    } catch (error: any) {
        console.error('[SyncService] ❌ خطأ في syncSubscriptionsFromServer:', error);
        return { success: false, error: error.message };
    }
}

// ===== مزامنة الألوان والمقاسات =====

/**
 * مزامنة ألوان المنتجات من السيرفر
 */
/**
 * مزامنة ألوان المنتجات من السيرفر
 */
export async function syncProductColorsFromServer(organizationId: string): Promise<{
    success: boolean;
    count: number;
    error?: string;
}> {
    try {
        console.log('[SyncService] 🔄 بدء مزامنة ألوان المنتجات من السيرفر...');

        // جلب الألوان من السيرفر
        const { data: colors, error } = await supabase
            .from('product_colors')
            .select(`
        *,
        product:products!inner(organization_id)
      `)
            .eq('product.organization_id', organizationId);

        if (error) {
            console.error('[SyncService] ❌ خطأ في جلب الألوان:', error);
            return { success: false, count: 0, error: error.message };
        }

        if (!colors || colors.length === 0) {
            console.log('[SyncService] ℹ️ لا توجد ألوان');
            return { success: true, count: 0 };
        }

        console.log(`[SyncService] 📦 تم جلب ${colors.length} لون`);

        // ⚡ حفظ الألوان في القاعدة المحلية
        let savedCount = 0;
        const productsWithVariants = new Set<string>();

        for (const color of colors) {
            try {
                // تنظيف البيانات قبل الحفظ
                const { product, ...colorData } = color;
                await deltaWriteService.saveFromServer('product_colors', {
                    ...colorData,
                    organization_id: organizationId, // ضمان وجود organization_id
                    synced: true
                });
                productsWithVariants.add(color.product_id);
                savedCount++;
            } catch (err) {
                console.error('[SyncService] ⚠️ فشل حفظ لون:', color.id, err);
            }
        }

        // تحديث flag has_variants للمنتجات
        if (productsWithVariants.size > 0) {
            const updates = Array.from(productsWithVariants).map(id =>
                deltaWriteService.updateLocalOnly('products', id, { has_variants: true })
            );
            await Promise.allSettled(updates);
        }

        console.log(`[SyncService] ✅ تم حفظ ${savedCount} لون محلياً`);
        return { success: true, count: savedCount };

    } catch (error: any) {
        console.error('[SyncService] ❌ خطأ في syncProductColorsFromServer:', error);
        return { success: false, count: 0, error: error.message };
    }
}

/**
 * مزامنة مقاسات المنتجات من السيرفر
 */
export async function syncProductSizesFromServer(organizationId: string): Promise<{
    success: boolean;
    count: number;
    error?: string;
}> {
    try {
        console.log('[SyncService] 🔄 بدء مزامنة مقاسات المنتجات من السيرفر...');

        // جلب المقاسات من السيرفر
        const { data: sizes, error } = await supabase
            .from('product_sizes')
            .select(`
        *,
        product:products!inner(organization_id)
      `)
            .eq('product.organization_id', organizationId);

        if (error) {
            console.error('[SyncService] ❌ خطأ في جلب المقاسات:', error);
            return { success: false, count: 0, error: error.message };
        }

        if (!sizes || sizes.length === 0) {
            console.log('[SyncService] ℹ️ لا توجد مقاسات');
            return { success: true, count: 0 };
        }

        console.log(`[SyncService] 📦 تم جلب ${sizes.length} مقاس`);

        // ⚡ حفظ المقاسات في القاعدة المحلية
        let savedCount = 0;
        const productsWithVariants = new Set<string>();

        for (const size of sizes) {
            try {
                // تنظيف البيانات قبل الحفظ
                const { product, ...sizeData } = size;
                await deltaWriteService.saveFromServer('product_sizes', {
                    ...sizeData,
                    organization_id: organizationId, // ضمان وجود organization_id
                    synced: true
                });
                productsWithVariants.add(size.product_id);
                savedCount++;
            } catch (err) {
                console.error('[SyncService] ⚠️ فشل حفظ مقاس:', size.id, err);
            }
        }

        // تحديث flag has_variants للمنتجات
        if (productsWithVariants.size > 0) {
            const updates = Array.from(productsWithVariants).map(id =>
                deltaWriteService.updateLocalOnly('products', id, { has_variants: true })
            );
            await Promise.allSettled(updates);
        }

        console.log(`[SyncService] ✅ تم حفظ ${savedCount} مقاس محلياً`);
        return { success: true, count: savedCount };

    } catch (error: any) {
        console.error('[SyncService] ❌ خطأ في syncProductSizesFromServer:', error);
        return { success: false, count: 0, error: error.message };
    }
}

// ===== دالة المزامنة الشاملة =====

/**
 * مزامنة شاملة لجميع البيانات
 */
export async function comprehensiveSynchronization(organizationId: string): Promise<{
    success: boolean;
    stats: {
        workSessions: number;
        repairs: number;
        subscriptions: boolean;
        colors: number;
        sizes: number;
    };
    errors: string[];
}> {
    const stats = {
        workSessions: 0,
        repairs: 0,
        subscriptions: false,
        colors: 0,
        sizes: 0,
    };
    const errors: string[] = [];

    try {
        console.log('[SyncService] 🚀 بدء المزامنة الشاملة...');

        // 1. مزامنة جلسات العمل المعلقة (أولاً)
        try {
            await syncPendingWorkSessions();
            console.log('[SyncService] ✅ تم مزامنة جلسات العمل المعلقة');
        } catch (error: any) {
            console.error('[SyncService] ⚠️ خطأ في مزامنة جلسات العمل المعلقة:', error);
            errors.push(`Work Sessions Upload: ${error.message}`);
        }

        // 2. جلب جلسات العمل من السيرفر
        try {
            const result = await syncWorkSessionsFromServer(organizationId);
            if (result.success) {
                stats.workSessions = result.count;
            } else {
                errors.push(`Work Sessions Download: ${result.error}`);
            }
        } catch (error: any) {
            errors.push(`Work Sessions Download: ${error.message}`);
        }

        // 3. مزامنة خدمات التصليح المعلقة
        try {
            const result = await syncPendingRepairs();
            console.log(`[SyncService] ✅ تم مزامنة خدمات التصليح: ${result.synced} نجحت، ${result.failed} فشلت`);
        } catch (error: any) {
            console.error('[SyncService] ⚠️ خطأ في مزامنة خدمات التصليح المعلقة:', error);
            errors.push(`Repairs Upload: ${error.message}`);
        }

        // 4. جلب خدمات التصليح من السيرفر
        try {
            const result = await syncRepairsFromServer(organizationId);
            if (result.success) {
                stats.repairs = result.count;
            } else {
                errors.push(`Repairs Download: ${result.error}`);
            }
        } catch (error: any) {
            errors.push(`Repairs Download: ${error.message}`);
        }

        // 5. جلب الاشتراكات
        try {
            const result = await syncSubscriptionsFromServer(organizationId);
            stats.subscriptions = result.success;
            if (!result.success && result.error) {
                errors.push(`Subscriptions: ${result.error}`);
            }
        } catch (error: any) {
            errors.push(`Subscriptions: ${error.message}`);
        }

        // 6. جلب الألوان
        try {
            const result = await syncProductColorsFromServer(organizationId);
            if (result.success) {
                stats.colors = result.count;
            } else {
                errors.push(`Colors: ${result.error}`);
            }
        } catch (error: any) {
            errors.push(`Colors: ${error.message}`);
        }

        // 7. جلب المقاسات
        try {
            const result = await syncProductSizesFromServer(organizationId);
            if (result.success) {
                stats.sizes = result.count;
            } else {
                errors.push(`Sizes: ${result.error}`);
            }
        } catch (error: any) {
            errors.push(`Sizes: ${error.message}`);
        }

        console.log('[SyncService] ✅ اكتملت المزامنة الشاملة:', stats);

        return {
            success: errors.length === 0,
            stats,
            errors,
        };

    } catch (error: any) {
        console.error('[SyncService] ❌ خطأ في المزامنة الشاملة:', error);
        return {
            success: false,
            stats,
            errors: [...errors, `Global: ${error.message}`],
        };
    }
}
