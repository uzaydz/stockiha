/**
 * ⚡ تنظيف sync_outbox للجلسات (staff_work_sessions)
 *
 * المشكلة: sync_outbox يحتوي على payloads قديمة بدون staff_id
 * الحل: حذف العمليات الفاشلة وإعادة إنشائها من القاعدة المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync بالكامل (2025-12-04)
 * ⚠️ لا يستخدم tauriQuery - يستخدم powerSyncService فقط
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export async function cleanupWorkSessionsOutbox(organizationId: string): Promise<{
  success: boolean;
  removed: number;
  recreated: number;
  error?: string;
}> {
  console.log('[CleanupOutbox] 🧹 بدء تنظيف sync_outbox للجلسات...');

  try {
    // ⚡ التأكد من تهيئة PowerSync
    if (!powerSyncService.isAvailable()) {
      await powerSyncService.initialize();
    }

    // 1. البحث عن عمليات staff_work_sessions في sync_outbox
    // ⚡ معالجة حالة عدم وجود الجدول
    let outboxEntries: Array<{ id: string; record_id: string; payload: string }> = [];
    try {
      outboxEntries = await powerSyncService.query<{
        id: string;
        record_id: string;
        payload: string;
      }>({
        sql: `SELECT id, record_id, payload FROM sync_outbox
         WHERE table_name = 'staff_work_sessions' AND status IN ('pending', 'failed')`,
        params: []
      });
    } catch (error: any) {
      // ⚡ إذا كان الجدول غير موجود، نرجع نجاح بدون عمليات
      if (error?.message?.includes('no such table') || error?.message?.includes('does not exist')) {
        console.log('[CleanupOutbox] ℹ️ جدول sync_outbox غير موجود - لا توجد عمليات للتنظيف');
        return {
          success: true,
          removed: 0,
          recreated: 0
        };
      }
      // ⚡ إذا كان خطأ آخر، نرميه
      throw error;
    }

    console.log(`[CleanupOutbox] 📊 وجدنا ${outboxEntries.length} عملية في outbox`);

    let removedCount = 0;
    let recreatedCount = 0;

    // 2. فحص كل عملية
    for (const entry of outboxEntries) {
      try {
        const payload = JSON.parse(entry.payload);

        // إذا كان الـ payload لا يحتوي على staff_id، احذفه
        if (!payload.staff_id || payload.staff_id === '' || payload.staff_id === null) {
          console.log(`[CleanupOutbox] 🗑️ حذف عملية فاشلة: ${entry.record_id.slice(0, 8)} (بدون staff_id)`);

          // حذف من outbox
          await powerSyncService.transaction(async (tx: any) => {
            await tx.execute('DELETE FROM sync_outbox WHERE id = ?', [entry.id]);
          });
          removedCount++;

          // محاولة إعادة إنشاء العملية من القاعدة المحلية
          if (!powerSyncService.db) {
            console.warn('[CleanupOutbox] PowerSync DB not initialized');
            continue;
          }
          const sessions = await powerSyncService.query<any>({
            sql: 'SELECT * FROM staff_work_sessions WHERE id = ?',
            params: [entry.record_id]
          });

          if (sessions.length > 0) {
            const session = sessions[0];

            // تحقق من وجود staff_id
            if (session.staff_id && session.staff_id !== '') {
              console.log(`[CleanupOutbox] ✅ إعادة إنشاء عملية: ${entry.record_id.slice(0, 8)}`);

              // إنشاء payload جديد صحيح
              const newPayload: Record<string, any> = {
                id: session.id,
                organization_id: session.organization_id,
                staff_id: session.staff_id,
                staff_name: session.staff_name,
                opening_cash: session.opening_cash,
                closing_cash: session.closing_cash,
                expected_cash: session.expected_cash,
                cash_difference: session.cash_difference,
                total_sales: session.total_sales,
                total_orders: session.total_orders,
                cash_sales: session.cash_sales,
                card_sales: session.card_sales,
                started_at: session.started_at,
                ended_at: session.ended_at,
                paused_at: session.paused_at,
                resumed_at: session.resumed_at,
                pause_count: session.pause_count,
                total_pause_duration: session.total_pause_duration,
                status: session.status,
                opening_notes: session.opening_notes,
                closing_notes: session.closing_notes,
                created_at: session.created_at,
                updated_at: session.updated_at,
              };

              // إزالة الحقول null
              Object.keys(newPayload).forEach(key => {
                if (newPayload[key] === null || newPayload[key] === undefined) {
                  delete newPayload[key];
                }
              });

              // ⚠️ PowerSync يدير المزامنة تلقائياً - نستخدم INSERT دائماً للجلسات الجديدة
              const operation = 'INSERT';

              // إضافة إلى outbox
              await powerSyncService.transaction(async (tx: any) => {
                await tx.execute(
                  `INSERT INTO sync_outbox (id, table_name, record_id, operation, payload, status, created_at)
                   VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
                  [
                    crypto.randomUUID(),
                    'staff_work_sessions',
                    session.id,
                    operation,
                    JSON.stringify(newPayload)
                  ]
                );
              });

              recreatedCount++;
            } else {
              console.warn(`[CleanupOutbox] ⚠️ لا يمكن إعادة إنشاء ${entry.record_id.slice(0, 8)} - بدون staff_id في القاعدة المحلية`);
            }
          }
        }
      } catch (error) {
        console.error(`[CleanupOutbox] ❌ خطأ في معالجة ${entry.id}:`, error);
      }
    }

    console.log(`[CleanupOutbox] ✅ تم التنظيف: حذف ${removedCount}، إعادة إنشاء ${recreatedCount}`);

    return {
      success: true,
      removed: removedCount,
      recreated: recreatedCount
    };

  } catch (error) {
    console.error('[CleanupOutbox] ❌ خطأ في التنظيف:', error);
    return {
      success: false,
      removed: 0,
      recreated: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
