/**
 * PrintHistoryService - سجل عمليات الطباعة
 * 
 * ⚡ المميزات:
 * - حفظ سجل الطباعة في SQLite
 * - إحصائيات الطباعة
 * - إعادة طباعة سريعة
 */

import { isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { sqliteWriteQueue } from '@/lib/sync/delta/SQLiteWriteQueue';

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

class PrintHistoryService {
  private readonly TABLE_NAME = 'print_history';

  /**
   * تهيئة الجدول
   */
  async initTable(): Promise<void> {
    if (!isSQLiteAvailable()) return;

    try {
      await sqliteWriteQueue.write(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          printed_at TEXT NOT NULL,
          product_ids TEXT,
          product_names TEXT,
          total_labels INTEGER DEFAULT 0,
          template_id TEXT,
          label_size TEXT,
          barcode_type TEXT,
          status TEXT DEFAULT 'success'
        )
      `);

      // إنشاء index للبحث السريع
      await sqliteWriteQueue.write(`
        CREATE INDEX IF NOT EXISTS idx_print_history_org 
        ON ${this.TABLE_NAME}(organization_id, printed_at DESC)
      `);
    } catch (error) {
      console.warn('[PrintHistory] فشل إنشاء الجدول:', error);
    }
  }

  /**
   * إضافة سجل طباعة جديد
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
    const id = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalLabels = products.reduce((sum, p) => sum + p.quantity, 0);

    // حفظ في localStorage دائماً
    try {
      const historyKey = `print_history_${orgId}`;
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
      existing.unshift({
        id,
        printed_at: new Date().toISOString(),
        products: products.map(p => ({ id: p.id, name: p.name, qty: p.quantity })),
        total_labels: totalLabels,
        ...settings,
        status
      });
      // الاحتفاظ بآخر 50 سجل فقط
      localStorage.setItem(historyKey, JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      console.warn('[PrintHistory] فشل الحفظ في localStorage');
    }

    // حفظ في SQLite إذا متاح
    if (isSQLiteAvailable()) {
      try {
        await sqliteWriteQueue.write(`
          INSERT INTO ${this.TABLE_NAME} 
          (id, organization_id, printed_at, product_ids, product_names, total_labels, template_id, label_size, barcode_type, status)
          VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          orgId,
          JSON.stringify(products.map(p => p.id)),
          JSON.stringify(products.map(p => p.name)),
          totalLabels,
          settings.templateId,
          settings.labelSize,
          settings.barcodeType,
          status
        ]);
        return id;
      } catch (error) {
        console.warn('[PrintHistory] فشل الحفظ في SQLite:', error);
      }
    }

    return id;
  }

  /**
   * جلب سجل الطباعة
   */
  async getHistory(orgId: string, limit: number = 20): Promise<PrintHistoryItem[]> {
    // محاولة SQLite أولاً
    if (isSQLiteAvailable()) {
      try {
        const result = await sqliteWriteQueue.read<any[]>(`
          SELECT * FROM ${this.TABLE_NAME}
          WHERE organization_id = ?
          ORDER BY printed_at DESC
          LIMIT ?
        `, [orgId, limit]);

        if (result && result.length > 0) {
          return result.map(r => ({
            ...r,
            product_ids: JSON.parse(r.product_ids || '[]'),
            product_names: JSON.parse(r.product_names || '[]')
          }));
        }
      } catch (error) {
        console.warn('[PrintHistory] فشل القراءة من SQLite:', error);
      }
    }

    // Fallback: localStorage
    try {
      const historyKey = `print_history_${orgId}`;
      const data = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return data.slice(0, limit).map((item: any) => ({
        id: item.id,
        organization_id: orgId,
        printed_at: item.printed_at,
        product_ids: item.products?.map((p: any) => p.id) || [],
        product_names: item.products?.map((p: any) => p.name) || [],
        total_labels: item.total_labels,
        template_id: item.templateId,
        label_size: item.labelSize,
        barcode_type: item.barcodeType,
        status: item.status
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * إحصائيات الطباعة
   */
  async getStats(orgId: string): Promise<PrintStats> {
    const history = await this.getHistory(orgId, 100);

    if (history.length === 0) {
      return {
        totalPrints: 0,
        totalLabels: 0,
        lastPrintDate: null,
        mostPrintedProduct: null
      };
    }

    // حساب المنتج الأكثر طباعة
    const productCounts: Record<string, { name: string; count: number }> = {};
    history.forEach(item => {
      item.product_names.forEach((name, idx) => {
        const id = item.product_ids[idx] || name;
        if (!productCounts[id]) {
          productCounts[id] = { name, count: 0 };
        }
        productCounts[id].count++;
      });
    });

    const mostPrinted = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)[0] || null;

    return {
      totalPrints: history.length,
      totalLabels: history.reduce((sum, h) => sum + h.total_labels, 0),
      lastPrintDate: history[0]?.printed_at || null,
      mostPrintedProduct: mostPrinted
    };
  }

  /**
   * مسح السجل
   */
  async clearHistory(orgId: string): Promise<void> {
    // مسح localStorage
    try {
      localStorage.removeItem(`print_history_${orgId}`);
    } catch (e) {}

    // مسح SQLite
    if (isSQLiteAvailable()) {
      try {
        await sqliteWriteQueue.write(`
          DELETE FROM ${this.TABLE_NAME} WHERE organization_id = ?
        `, [orgId]);
      } catch (error) {
        console.warn('[PrintHistory] فشل مسح SQLite:', error);
      }
    }
  }
}

export const printHistoryService = new PrintHistoryService();
