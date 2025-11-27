/**
 * ⚡ Delta Sync Scheduler
 * النظام الجديد يعتمد على Event-Driven Sync بدلاً من الفترات الزمنية
 */
import { deltaSyncEngine } from '@/lib/sync';

type SyncResult = { processed: number; failed: number };

let running = false;

/**
 * تشغيل المزامنة مرة واحدة
 */
export async function runSyncSchedulerOnce(): Promise<SyncResult> {
  if (running) return { processed: 0, failed: 0 };
  running = true;
  try {
    // ⚡ استخدام Delta Sync Engine
    const result = await deltaSyncEngine.fullSync();
    return {
      processed: result.success ? 1 : 0,
      failed: result.success ? 0 : 1
    };
  } catch (error) {
    console.error('[syncScheduler] Error:', error);
    return { processed: 0, failed: 1 };
  } finally {
    running = false;
  }
}

/**
 * بدء جدولة المزامنة
 * ⚡ في Delta Sync: المزامنة تعتمد على الأحداث وليس الفترات الزمنية
 */
export function startSyncScheduler(): void {
  // ⚡ Delta Sync لا يحتاج لـ scheduler دوري
  // المزامنة تحدث عند:
  // 1. إنشاء/تحديث/حذف سجل محلي
  // 2. استعادة الاتصال بالشبكة
  // 3. طلب المستخدم يدوياً
  console.log('[syncScheduler] ⚡ Delta Sync mode - event-driven sync enabled');
}

/**
 * إيقاف جدولة المزامنة
 */
export function stopSyncScheduler(): void {
  // ⚡ لا شيء للإيقاف في Delta Sync
  console.log('[syncScheduler] ⚡ Delta Sync mode - no scheduler to stop');
}

/**
 * تشغيل المزامنة فوراً
 */
export async function triggerImmediateSync(): Promise<void> {
  await runSyncSchedulerOnce();
}
