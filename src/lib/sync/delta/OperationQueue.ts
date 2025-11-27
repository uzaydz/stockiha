/**
 * OperationQueue - Ordered Operation Processing
 * يضمن تطبيق العمليات بالترتيب الصحيح حسب server_seq
 *
 * ⚡ المرحلة الثانية: تحسين Gap Recovery مع logging أفضل
 *
 * المشكلة: Realtime قد يسلم العمليات بترتيب خاطئ
 * الحل: Buffer + Gap Detection + Recovery
 */

import {
  ServerOperation,
  QueuedOperation,
  GapCheckResult,
  DELTA_SYNC_CONSTANTS
} from './types';

export type GapRecoveryCallback = (gapStart: number, gapEnd: number) => Promise<void>;

// ⚡ إحصائيات الفجوات للتشخيص
interface GapStats {
  totalGapsDetected: number;
  totalGapsRecovered: number;
  totalGapsSkipped: number;
  lastGapAt: string | null;
}

export class OperationQueue {
  private buffer: Map<number, QueuedOperation> = new Map();
  private expectedSeq: number = 0;
  private onGapRecovery: GapRecoveryCallback | null = null;
  private isRecovering = false;

  // ⚡ إحصائيات
  private gapStats: GapStats = {
    totalGapsDetected: 0,
    totalGapsRecovered: 0,
    totalGapsSkipped: 0,
    lastGapAt: null
  };

  private readonly MAX_BUFFER_SIZE = DELTA_SYNC_CONSTANTS.MAX_BUFFER_SIZE;
  private readonly MAX_WAIT_MS = DELTA_SYNC_CONSTANTS.MAX_WAIT_MS;

  /**
   * تهيئة الـ Queue بآخر server_seq مُطبَّق
   */
  async initialize(lastAppliedSeq: number): Promise<void> {
    this.expectedSeq = lastAppliedSeq + 1;
    this.buffer.clear();
    console.log(`[OperationQueue] Initialized, expecting seq ${this.expectedSeq}`);
  }

  /**
   * تعيين callback لاسترجاع العمليات المفقودة
   */
  setGapRecoveryCallback(callback: GapRecoveryCallback): void {
    this.onGapRecovery = callback;
  }

  /**
   * إضافة عملية للـ Buffer
   * تُرجع العمليات الجاهزة للتطبيق بالترتيب
   */
  async enqueue(op: ServerOperation): Promise<ServerOperation[]> {
    const seq = op.server_seq;

    // 1. إذا كانت قديمة (مُطبَّقة سابقاً) - تجاهل
    if (seq < this.expectedSeq) {
      console.log(`[OperationQueue] Skipping old operation seq=${seq}, expected=${this.expectedSeq}`);
      return [];
    }

    // 2. إذا كانت مكررة في الـ buffer - تجاهل
    if (this.buffer.has(seq)) {
      console.log(`[OperationQueue] Duplicate operation seq=${seq}, ignoring`);
      return [];
    }

    // 3. إذا كانت هي المتوقعة بالضبط
    if (seq === this.expectedSeq) {
      return this.flushReady(op);
    }

    // 4. إذا كانت مستقبلية - Buffer
    console.log(`[OperationQueue] Buffering future operation seq=${seq}, expected=${this.expectedSeq}`);
    this.buffer.set(seq, {
      serverSeq: seq,
      operation: op,
      receivedAt: Date.now()
    });

    // 5. تحقق من حجم الـ Buffer
    if (this.buffer.size > this.MAX_BUFFER_SIZE) {
      console.warn(`[OperationQueue] Buffer overflow (${this.buffer.size}), triggering gap recovery`);
      await this.triggerGapRecovery();
    }

    return [];
  }

  /**
   * إخراج العمليات المتتالية الجاهزة
   */
  private flushReady(firstOp: ServerOperation): ServerOperation[] {
    const ready: ServerOperation[] = [firstOp];
    this.expectedSeq++;

    // استمر في إخراج العمليات المتتالية من الـ Buffer
    while (this.buffer.has(this.expectedSeq)) {
      const buffered = this.buffer.get(this.expectedSeq)!;
      ready.push(buffered.operation);
      this.buffer.delete(this.expectedSeq);
      this.expectedSeq++;
    }

    if (ready.length > 1) {
      console.log(`[OperationQueue] Flushed ${ready.length} operations, now expecting seq ${this.expectedSeq}`);
    }

    return ready;
  }

  /**
   * فحص العمليات المعلقة لفترة طويلة
   */
  checkStaleOperations(): GapCheckResult {
    if (this.buffer.size === 0) {
      return { hasGap: false, gapStart: 0, gapEnd: 0 };
    }

    const now = Date.now();
    const sortedSeqs = Array.from(this.buffer.keys()).sort((a, b) => a - b);
    const minSeq = sortedSeqs[0];
    const oldestEntry = this.buffer.get(minSeq);

    // تحقق إذا كانت أقدم عملية منتظرة لفترة طويلة
    if (oldestEntry && (now - oldestEntry.receivedAt) > this.MAX_WAIT_MS) {
      return {
        hasGap: true,
        gapStart: this.expectedSeq,
        gapEnd: minSeq - 1
      };
    }

    return { hasGap: false, gapStart: 0, gapEnd: 0 };
  }

  /**
   * ⚡ استرجاع العمليات المفقودة - محسّن مع إحصائيات
   */
  private async triggerGapRecovery(): Promise<void> {
    if (this.isRecovering || !this.onGapRecovery) {
      return;
    }

    const gapCheck = this.checkStaleOperations();
    if (!gapCheck.hasGap) {
      return;
    }

    this.isRecovering = true;
    
    // ⚡ تحديث الإحصائيات
    this.gapStats.totalGapsDetected++;
    this.gapStats.lastGapAt = new Date().toISOString();

    const gapSize = gapCheck.gapEnd - gapCheck.gapStart + 1;
    console.log(`%c[OperationQueue] 🔄 Starting gap recovery: ${gapCheck.gapStart}-${gapCheck.gapEnd} (${gapSize} ops)`, 'color: #FF9800; font-weight: bold');

    try {
      await this.onGapRecovery(gapCheck.gapStart, gapCheck.gapEnd);
      this.gapStats.totalGapsRecovered++;
      console.log(`%c[OperationQueue] ✅ Gap recovery completed`, 'color: #4CAF50');
    } catch (error) {
      console.error('%c[OperationQueue] ❌ Gap recovery failed:', 'color: #f44336', error);
      this.gapStats.totalGapsSkipped++;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * معالجة عمليات gap recovery
   * تُستدعى عند استلام العمليات المفقودة من الخادم
   */
  async processRecoveredOperations(operations: ServerOperation[]): Promise<ServerOperation[]> {
    const allReady: ServerOperation[] = [];

    // ترتيب حسب server_seq
    const sorted = [...operations].sort((a, b) => a.server_seq - b.server_seq);

    for (const op of sorted) {
      const ready = await this.enqueue(op);
      allReady.push(...ready);
    }

    return allReady;
  }

  /**
   * ⚡ تخطي gap وإعادة ضبط الـ expectedSeq - محسّن مع إحصائيات
   * يُستخدم عند فشل gap recovery
   */
  skipGap(): ServerOperation[] {
    if (this.buffer.size === 0) {
      return [];
    }

    const sortedSeqs = Array.from(this.buffer.keys()).sort((a, b) => a - b);
    const minSeq = sortedSeqs[0];
    const skippedCount = minSeq - this.expectedSeq;

    console.warn(`%c[OperationQueue] ⏭️ Skipping gap: ${this.expectedSeq} → ${minSeq} (${skippedCount} operations skipped)`, 'color: #FF9800; font-weight: bold');

    // ⚡ تحديث الإحصائيات
    this.gapStats.totalGapsSkipped++;

    // ضبط expectedSeq إلى أقل seq في الـ buffer
    this.expectedSeq = minSeq;

    // إخراج جميع العمليات المتتالية
    const ready: ServerOperation[] = [];
    while (this.buffer.has(this.expectedSeq)) {
      const buffered = this.buffer.get(this.expectedSeq)!;
      ready.push(buffered.operation);
      this.buffer.delete(this.expectedSeq);
      this.expectedSeq++;
    }

    console.log(`[OperationQueue] Flushed ${ready.length} buffered operations after skip`);
    return ready;
  }

  /**
   * مسح الـ buffer بالكامل
   */
  clear(): void {
    this.buffer.clear();
    console.log('[OperationQueue] Buffer cleared');
  }

  /**
   * إعادة ضبط مع seq جديد
   */
  reset(newExpectedSeq: number): void {
    this.buffer.clear();
    this.expectedSeq = newExpectedSeq;
    this.isRecovering = false;
    console.log(`[OperationQueue] Reset to expect seq ${newExpectedSeq}`);
  }

  /**
   * ⚡ الحصول على حالة الـ Queue - محسّن مع إحصائيات الفجوات
   */
  getStats(): {
    expectedSeq: number;
    bufferSize: number;
    oldestBufferedSeq: number | null;
    newestBufferedSeq: number | null;
    isRecovering: boolean;
    gapStats: GapStats;
  } {
    const seqs = Array.from(this.buffer.keys());

    return {
      expectedSeq: this.expectedSeq,
      bufferSize: this.buffer.size,
      oldestBufferedSeq: seqs.length > 0 ? Math.min(...seqs) : null,
      newestBufferedSeq: seqs.length > 0 ? Math.max(...seqs) : null,
      isRecovering: this.isRecovering,
      gapStats: { ...this.gapStats }
    };
  }

  /**
   * ⚡ الحصول على إحصائيات الفجوات فقط
   */
  getGapStats(): GapStats {
    return { ...this.gapStats };
  }

  /**
   * فحص دوري للـ gaps
   * يُفضل تشغيله كل بضع ثواني
   */
  async periodicGapCheck(): Promise<ServerOperation[]> {
    const gapCheck = this.checkStaleOperations();

    if (gapCheck.hasGap) {
      console.log(`[OperationQueue] Periodic check detected gap: ${gapCheck.gapStart}-${gapCheck.gapEnd}`);

      if (this.onGapRecovery) {
        await this.triggerGapRecovery();
      } else {
        // إذا لا يوجد callback، تخطي الـ gap
        return this.skipGap();
      }
    }

    return [];
  }
}

// Export singleton instance
export const operationQueue = new OperationQueue();
