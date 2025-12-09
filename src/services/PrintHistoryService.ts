/**
 * ⚡ PrintHistoryService - v3.0 (PowerSync Best Practices 2025)
 * ============================================================
 *
 * سجل عمليات الطباعة:
 * - حفظ سجل الطباعة محلياً
 * - إحصائيات الطباعة
 * - إعادة طباعة سريعة
 *
 * ✅ يستخدم localStorage للتخزين البسيط
 * ✅ لا يحتاج PowerSync (بيانات محلية فقط)
 */

// =====================================================
// Types
// =====================================================

export interface PrintHistoryItem {
  id: string;
  organization_id: string;
  printed_at: string;
  product_ids: string[];
  product_names: string[];
  total_labels: number;
  template_id: string;
  label_size: string;
  barcode_type: string;
  status: 'success' | 'failed' | 'cancelled';
}

export interface PrintStats {
  totalPrints: number;
  totalLabels: number;
  lastPrintDate: string | null;
  mostPrintedProduct: { name: string; count: number } | null;
}

// =====================================================
// PrintHistoryService
// =====================================================

class PrintHistoryServiceClass {
  private readonly STORAGE_PREFIX = 'print_history_';
  private readonly MAX_HISTORY = 50;

  // ========================================
  // 📝 إضافة سجل طباعة
  // ========================================

  /**
   * ⚡ إضافة سجل طباعة جديد
   */
  async addPrintRecord(
    orgId: string,
    products: Array<{ id: string; name: string; quantity: number }>,
    settings: {
      templateId: string;
      labelSize: string;
      barcodeType: string;
    },
    status: 'success' | 'failed' | 'cancelled' = 'success'
  ): Promise<string | null> {
    try {
      const id = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalLabels = products.reduce((sum, p) => sum + p.quantity, 0);

      const record: PrintHistoryItem = {
        id,
        organization_id: orgId,
        printed_at: new Date().toISOString(),
        product_ids: products.map(p => p.id),
        product_names: products.map(p => p.name),
        total_labels: totalLabels,
        template_id: settings.templateId,
        label_size: settings.labelSize,
        barcode_type: settings.barcodeType,
        status
      };

      const history = this.getHistory(orgId);
      history.unshift(record);

      // الاحتفاظ بآخر N سجل فقط
      localStorage.setItem(
        this.STORAGE_PREFIX + orgId,
        JSON.stringify(history.slice(0, this.MAX_HISTORY))
      );

      return id;
    } catch (error) {
      console.warn('[PrintHistory] فشل إضافة السجل:', error);
      return null;
    }
  }

  // ========================================
  // 📖 جلب السجلات
  // ========================================

  /**
   * ⚡ جلب سجل الطباعة
   */
  getHistory(orgId: string, limit?: number): PrintHistoryItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_PREFIX + orgId);
      if (!data) return [];

      const history = JSON.parse(data) as PrintHistoryItem[];
      return limit ? history.slice(0, limit) : history;
    } catch {
      return [];
    }
  }

  /**
   * ⚡ جلب آخر سجل طباعة
   */
  getLastPrint(orgId: string): PrintHistoryItem | null {
    const history = this.getHistory(orgId, 1);
    return history[0] || null;
  }

  // ========================================
  // 📊 الإحصائيات
  // ========================================

  /**
   * ⚡ جلب إحصائيات الطباعة
   */
  getStats(orgId: string): PrintStats {
    const history = this.getHistory(orgId);
    const successfulPrints = history.filter(h => h.status === 'success');

    // عد المنتجات الأكثر طباعة
    const productCounts = new Map<string, { name: string; count: number }>();
    for (const print of successfulPrints) {
      for (let i = 0; i < print.product_names.length; i++) {
        const name = print.product_names[i];
        const existing = productCounts.get(name);
        if (existing) {
          existing.count++;
        } else {
          productCounts.set(name, { name, count: 1 });
        }
      }
    }

    // إيجاد المنتج الأكثر طباعة
    let mostPrinted: { name: string; count: number } | null = null;
    let maxCount = 0;
    productCounts.forEach(item => {
      if (item.count > maxCount) {
        maxCount = item.count;
        mostPrinted = item;
      }
    });

    return {
      totalPrints: successfulPrints.length,
      totalLabels: successfulPrints.reduce((sum, h) => sum + h.total_labels, 0),
      lastPrintDate: successfulPrints[0]?.printed_at || null,
      mostPrintedProduct: mostPrinted
    };
  }

  // ========================================
  // 🗑️ الحذف
  // ========================================

  /**
   * ⚡ حذف سجل طباعة
   */
  deleteRecord(orgId: string, recordId: string): boolean {
    try {
      const history = this.getHistory(orgId);
      const filtered = history.filter(h => h.id !== recordId);

      if (filtered.length === history.length) {
        return false; // لم يتم العثور على السجل
      }

      localStorage.setItem(
        this.STORAGE_PREFIX + orgId,
        JSON.stringify(filtered)
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ⚡ مسح كل السجلات
   */
  clearHistory(orgId: string): void {
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + orgId);
    } catch {
      // تجاهل الأخطاء
    }
  }

  // ========================================
  // 🔧 Helper Methods
  // ========================================

  /**
   * ⚡ تهيئة الخدمة (للتوافق مع الكود القديم)
   */
  async initTable(): Promise<void> {
    // لا يحتاج تهيئة - نستخدم localStorage
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const printHistoryService = new PrintHistoryServiceClass();
export default printHistoryService;
