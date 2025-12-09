/**
 * ⚡ أداة تشخيص شاملة للمزامنة
 * تجمع كل مشاكل المزامنة في مكان واحد
 */

import { sqliteWriteQueue } from './core/SQLiteWriteQueue';
import { outboxManager } from './queue/OutboxManager';
import { SYNC_CONFIG, getServerTableName } from './config';

export interface SyncIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'outbox' | 'data' | 'schema' | 'network' | 'config';
  table: string;
  recordId?: string;
  message: string;
  details?: string;
  suggestion?: string;
  timestamp: string;
}

export interface SyncDiagnosticsReport {
  timestamp: string;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  issues: SyncIssue[];
  stats: {
    outbox: {
      total: number;
      pending: number;
      sending: number;
      failed: number;
      byTable: Record<string, number>;
    };
    unsynced: {
      orders: number;
      orderItems: number;
      products: number;
      customers: number;
      invoices: number;
      workSessions: number;
    };
    discarded: number;
  };
}

class SyncDiagnosticsService {
  private organizationId: string | null = null;

  setOrganizationId(orgId: string) {
    this.organizationId = orgId;
  }

  /**
   * ⚡ تشغيل تشخيص شامل وإرجاع تقرير كامل
   */
  async runFullDiagnostics(): Promise<SyncDiagnosticsReport> {
    const issues: SyncIssue[] = [];
    const timestamp = new Date().toISOString();

    console.log('%c[SyncDiagnostics] 🔍 بدء التشخيص الشامل...', 'color: #9C27B0; font-weight: bold');

    // 1. فحص Outbox
    const outboxIssues = await this.checkOutboxIssues();
    issues.push(...outboxIssues);

    // 2. فحص البيانات غير المتزامنة
    const unsyncedIssues = await this.checkUnsyncedData();
    issues.push(...unsyncedIssues);

    // 3. فحص العمليات المحذوفة
    const discardedIssues = this.checkDiscardedOperations();
    issues.push(...discardedIssues);

    // 4. فحص مشاكل البيانات (null values, missing relations)
    const dataIssues = await this.checkDataIntegrity();
    issues.push(...dataIssues);

    // 5. جمع الإحصائيات
    const stats = await this.collectStats();

    const report: SyncDiagnosticsReport = {
      timestamp,
      summary: {
        totalIssues: issues.length,
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        info: issues.filter(i => i.type === 'info').length,
      },
      issues,
      stats,
    };

    console.log('%c[SyncDiagnostics] ✅ اكتمل التشخيص', 'color: #4CAF50; font-weight: bold');
    console.log(`📊 المشاكل: ${report.summary.errors} خطأ، ${report.summary.warnings} تحذير، ${report.summary.info} معلومات`);

    return report;
  }

  /**
   * فحص مشاكل Outbox
   */
  private async checkOutboxIssues(): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    try {
      const detailed = await outboxManager.getDetailedPending(100);

      for (const op of detailed) {
        // العمليات الفاشلة
        if (op.status === 'failed') {
          issues.push({
            id: op.id,
            type: 'error',
            category: 'outbox',
            table: op.table_name,
            recordId: op.record_id,
            message: `عملية فاشلة: ${op.operation} على ${op.table_name}`,
            details: op.last_error || 'خطأ غير معروف',
            suggestion: this.getSuggestionForError(op.last_error || ''),
            timestamp: op.created_at,
          });
        }

        // العمليات العالقة في sending
        if (op.status === 'sending') {
          const createdAt = new Date(op.created_at).getTime();
          const now = Date.now();
          const stuckMinutes = Math.floor((now - createdAt) / 60000);

          if (stuckMinutes > 5) {
            issues.push({
              id: op.id,
              type: 'warning',
              category: 'outbox',
              table: op.table_name,
              recordId: op.record_id,
              message: `عملية عالقة منذ ${stuckMinutes} دقيقة`,
              details: `العملية في حالة "قيد الإرسال" لفترة طويلة`,
              suggestion: 'جرب إعادة تشغيل التطبيق أو انقر على "إصلاح"',
              timestamp: op.created_at,
            });
          }
        }

        // العمليات مع محاولات كثيرة
        if (op.retry_count >= 3) {
          issues.push({
            id: op.id,
            type: 'warning',
            category: 'outbox',
            table: op.table_name,
            recordId: op.record_id,
            message: `عملية فشلت ${op.retry_count} مرات`,
            details: op.last_error || 'فشل متكرر',
            suggestion: 'قد تكون هناك مشكلة في البيانات أو الاتصال',
            timestamp: op.created_at,
          });
        }
      }
    } catch (error) {
      console.error('[SyncDiagnostics] خطأ في فحص Outbox:', error);
    }

    return issues;
  }

  /**
   * فحص البيانات غير المتزامنة
   */
  private async checkUnsyncedData(): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    if (!this.organizationId) return issues;

    try {
      // فحص الطلبات غير المتزامنة
      // ⚡ v2: استخدام 'synced' بدلاً من '_synced'
      const unsyncedOrders = await sqliteWriteQueue.read<any[]>(`
        SELECT id, order_number, created_at, last_sync_attempt, error
        FROM orders
        WHERE organization_id = '${this.organizationId}'
        AND (synced = 0 OR synced IS NULL)
        LIMIT 50
      `);

      for (const order of unsyncedOrders) {
        // تحقق إذا كان الطلب في Outbox
        const inOutbox = await sqliteWriteQueue.read<any[]>(`
          SELECT id, status, last_error, retry_count
          FROM sync_outbox
          WHERE table_name = 'orders' AND record_id = '${order.id}'
        `);

        if (inOutbox.length === 0) {
          issues.push({
            id: order.id,
            type: 'warning',
            category: 'data',
            table: 'orders',
            recordId: order.id,
            message: `طلب غير متزامن وليس في قائمة الانتظار`,
            details: `رقم الطلب: ${order.order_number || 'غير محدد'}`,
            suggestion: 'انقر على "إصلاح" لإضافة الطلب لقائمة المزامنة',
            timestamp: order.created_at,
          });
        } else if (inOutbox[0].status === 'failed') {
          issues.push({
            id: order.id,
            type: 'error',
            category: 'data',
            table: 'orders',
            recordId: order.id,
            message: `طلب فشل في المزامنة`,
            details: inOutbox[0].last_error || 'خطأ غير معروف',
            suggestion: this.getSuggestionForError(inOutbox[0].last_error || ''),
            timestamp: order.created_at,
          });
        }
      }

      // فحص عناصر الطلبات بدون order_id
      const orphanItems = await sqliteWriteQueue.read<any[]>(`
        SELECT id, order_id, name, created_at
        FROM order_items
        WHERE (order_id IS NULL OR order_id = '')
        LIMIT 20
      `);

      for (const item of orphanItems) {
        issues.push({
          id: item.id,
          type: 'error',
          category: 'data',
          table: 'order_items',
          recordId: item.id,
          message: `عنصر طلب بدون order_id`,
          details: `المنتج: ${item.name || 'غير محدد'}`,
          suggestion: 'هذا العنصر لن يتزامن. قد يحتاج حذف يدوي.',
          timestamp: item.created_at,
        });
      }

      // فحص عناصر طلبات مرتبطة بطلبات غير موجودة
      const orphanedByMissingOrder = await sqliteWriteQueue.read<any[]>(`
        SELECT oi.id, oi.order_id, oi.name, oi.created_at
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE oi.order_id IS NOT NULL
        AND oi.order_id != ''
        AND o.id IS NULL
        LIMIT 20
      `);

      for (const item of orphanedByMissingOrder) {
        issues.push({
          id: item.id,
          type: 'error',
          category: 'data',
          table: 'order_items',
          recordId: item.id,
          message: `عنصر مرتبط بطلب محذوف`,
          details: `order_id: ${item.order_id}`,
          suggestion: 'هذا العنصر يتيم ولن يتزامن.',
          timestamp: item.created_at,
        });
      }

    } catch (error) {
      console.error('[SyncDiagnostics] خطأ في فحص البيانات:', error);
    }

    return issues;
  }

  /**
   * فحص العمليات المحذوفة
   */
  private checkDiscardedOperations(): SyncIssue[] {
    const issues: SyncIssue[] = [];

    try {
      const discarded = JSON.parse(localStorage.getItem('discarded_operations') || '[]');

      for (const op of discarded.slice(-20)) {
        issues.push({
          id: op.id,
          type: 'info',
          category: 'outbox',
          table: op.table_name,
          recordId: op.record_id,
          message: `عملية محذوفة: ${op.operation} على ${op.table_name}`,
          details: op.error || 'تم حذفها بسبب خطأ دائم',
          suggestion: 'هذه العملية لن تتزامن. قد تحتاج لإعادة إنشاء البيانات.',
          timestamp: op.discarded_at,
        });
      }
    } catch (error) {
      console.error('[SyncDiagnostics] خطأ في فحص العمليات المحذوفة:', error);
    }

    return issues;
  }

  /**
   * فحص سلامة البيانات
   */
  private async checkDataIntegrity(): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    if (!this.organizationId) return issues;

    try {
      // فحص الطلبات بدون payment_method
      const ordersWithoutPayment = await sqliteWriteQueue.read<any[]>(`
        SELECT id, global_order_number, created_at
        FROM orders
        WHERE organization_id = '${this.organizationId}'
        AND (payment_method IS NULL OR payment_method = '')
        AND _synced = 0
        LIMIT 10
      `);

      for (const order of ordersWithoutPayment) {
        issues.push({
          id: order.id,
          type: 'warning',
          category: 'data',
          table: 'orders',
          recordId: order.id,
          message: `طلب بدون طريقة دفع`,
          details: `رقم الطلب: ${order.global_order_number || 'غير محدد'}`,
          suggestion: 'سيتم استخدام "cash" كقيمة افتراضية',
          timestamp: order.created_at,
        });
      }

      // فحص عناصر بدون product_id
      const itemsWithoutProduct = await sqliteWriteQueue.read<any[]>(`
        SELECT id, order_id, name, created_at
        FROM order_items
        WHERE (product_id IS NULL OR product_id = '')
        AND _synced = 0
        LIMIT 10
      `);

      for (const item of itemsWithoutProduct) {
        issues.push({
          id: item.id,
          type: 'warning',
          category: 'data',
          table: 'order_items',
          recordId: item.id,
          message: `عنصر بدون product_id`,
          details: `المنتج: ${item.name || 'غير محدد'}`,
          suggestion: 'قد يفشل في المزامنة',
          timestamp: item.created_at,
        });
      }

    } catch (error) {
      console.error('[SyncDiagnostics] خطأ في فحص سلامة البيانات:', error);
    }

    return issues;
  }

  /**
   * جمع الإحصائيات
   */
  private async collectStats(): Promise<SyncDiagnosticsReport['stats']> {
    const outboxStats = await outboxManager.getStats();

    let unsynced = {
      orders: 0,
      orderItems: 0,
      products: 0,
      customers: 0,
      invoices: 0,
      workSessions: 0,
    };

    if (this.organizationId) {
      try {
        // ⚡ v2: استخدام 'synced' بدلاً من '_synced' (متوافق مع tauriSchema)
        const result = await sqliteWriteQueue.read<any[]>(`
          SELECT
            (SELECT COUNT(*) FROM orders WHERE organization_id = '${this.organizationId}' AND (synced = 0 OR synced IS NULL)) as orders,
            (SELECT COUNT(*) FROM order_items WHERE synced = 0) as order_items,
            (SELECT COUNT(*) FROM products WHERE organization_id = '${this.organizationId}' AND synced = 0) as products,
            (SELECT COUNT(*) FROM customers WHERE organization_id = '${this.organizationId}' AND synced = 0) as customers,
            (SELECT COUNT(*) FROM invoices WHERE organization_id = '${this.organizationId}' AND synced = 0) as invoices,
            (SELECT COUNT(*) FROM staff_work_sessions WHERE organization_id = '${this.organizationId}' AND synced = 0) as work_sessions
        `);

        if (result[0]) {
          unsynced = {
            orders: result[0].orders || 0,
            orderItems: result[0].order_items || 0,
            products: result[0].products || 0,
            customers: result[0].customers || 0,
            invoices: result[0].invoices || 0,
            workSessions: result[0].work_sessions || 0,
          };
        }
      } catch (error) {
        console.error('[SyncDiagnostics] خطأ في جمع الإحصائيات:', error);
      }
    }

    const discarded = JSON.parse(localStorage.getItem('discarded_operations') || '[]');

    return {
      outbox: {
        total: outboxStats.total,
        pending: outboxStats.pending,
        sending: outboxStats.sending,
        failed: outboxStats.failed,
        byTable: outboxStats.byTable,
      },
      unsynced,
      discarded: discarded.length,
    };
  }

  /**
   * اقتراح حل بناءً على نوع الخطأ
   */
  private getSuggestionForError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('null value') && errorLower.includes('order_id')) {
      return 'العنصر يفتقد لـ order_id. قد يحتاج لحذف يدوي أو ربط بطلب صحيح.';
    }
    if (errorLower.includes('null value')) {
      return 'هناك حقل مطلوب فارغ. تحقق من البيانات.';
    }
    if (errorLower.includes('foreign key')) {
      return 'السجل المرتبط غير موجود. تأكد من مزامنة الجدول الأب أولاً.';
    }
    if (errorLower.includes('duplicate key') || errorLower.includes('unique')) {
      return 'السجل موجود مسبقاً. قد تحتاج لتحديث بدلاً من إضافة.';
    }
    if (errorLower.includes('network') || errorLower.includes('fetch')) {
      return 'مشكلة في الاتصال. تحقق من الإنترنت وحاول مرة أخرى.';
    }
    if (errorLower.includes('permission') || errorLower.includes('denied')) {
      return 'ليس لديك صلاحية. تحقق من حسابك.';
    }
    if (errorLower.includes('column') && errorLower.includes('does not exist')) {
      return 'عمود غير موجود في السيرفر. قد يحتاج تحديث التطبيق.';
    }

    return 'حاول إعادة المزامنة أو تواصل مع الدعم الفني.';
  }

  /**
   * ⚡ إصلاح تلقائي للمشاكل الشائعة
   */
  async autoFix(): Promise<{ fixed: number; details: string[] }> {
    const details: string[] = [];
    let fixed = 0;

    if (!this.organizationId) {
      return { fixed: 0, details: ['لم يتم تحديد المؤسسة'] };
    }

    try {
      // 1. إعادة العمليات العالقة في sending
      const requeuedStuck = await outboxManager.requeueStuck();
      if (requeuedStuck > 0) {
        details.push(`✅ تم إعادة ${requeuedStuck} عملية عالقة`);
        fixed += requeuedStuck;
      }

      // 2. تنظيف الـ payloads
      const cleanResult = await outboxManager.autoCleanAllPayloads();
      if (cleanResult.cleaned > 0) {
        details.push(`✅ تم تنظيف ${cleanResult.cleaned} payload`);
        fixed += cleanResult.cleaned;
      }

      // 3. إصلاح الطلبات بدون payment_method
      const fixedPayments = await sqliteWriteQueue.write<any>(`
        UPDATE orders
        SET payment_method = 'cash'
        WHERE organization_id = '${this.organizationId}'
        AND (payment_method IS NULL OR payment_method = '')
      `);
      if (fixedPayments?.changes > 0) {
        details.push(`✅ تم إصلاح ${fixedPayments.changes} طلب بدون طريقة دفع`);
        fixed += fixedPayments.changes;
      }

      // 4. إضافة الطلبات غير المتزامنة للـ Outbox
      const unsyncedOrders = await sqliteWriteQueue.read<any[]>(`
        SELECT po.* FROM orders po
        LEFT JOIN sync_outbox so ON so.record_id = po.id AND so.table_name = 'orders'
        WHERE po.organization_id = '${this.organizationId}'
        AND (po._synced = 0 OR po._synced IS NULL)
        AND so.id IS NULL
        LIMIT 20
      `);

      for (const order of unsyncedOrders) {
        await outboxManager.add({
          tableName: 'orders',
          operation: 'INSERT',
          recordId: order.id,
          payload: order,
        });
        fixed++;
      }
      if (unsyncedOrders.length > 0) {
        details.push(`✅ تم إضافة ${unsyncedOrders.length} طلب للمزامنة`);
      }

      // 5. إضافة عناصر الطلبات غير المتزامنة
      const unsyncedItems = await sqliteWriteQueue.read<any[]>(`
        SELECT poi.* FROM order_items poi
        LEFT JOIN sync_outbox so ON so.record_id = poi.id AND so.table_name = 'order_items'
        WHERE poi._synced = 0
        AND poi.order_id IS NOT NULL AND poi.order_id != ''
        AND so.id IS NULL
        LIMIT 50
      `);

      for (const item of unsyncedItems) {
        await outboxManager.add({
          tableName: 'order_items',
          operation: 'INSERT',
          recordId: item.id,
          payload: item,
        });
        fixed++;
      }
      if (unsyncedItems.length > 0) {
        details.push(`✅ تم إضافة ${unsyncedItems.length} عنصر للمزامنة`);
      }

      if (details.length === 0) {
        details.push('✓ لا توجد مشاكل تحتاج إصلاح');
      }

    } catch (error) {
      details.push(`❌ خطأ أثناء الإصلاح: ${error}`);
    }

    return { fixed, details };
  }
}

export const syncDiagnostics = new SyncDiagnosticsService();

// تصدير للاستخدام في window
if (typeof window !== 'undefined') {
  (window as any).syncDiagnostics = syncDiagnostics;
}
