/**
 * قاعدة بيانات موحدة - تدعم كل من SQLite و IndexedDB
 * للانتقال التدريجي من IndexedDB إلى SQLite
 */

import { sqliteDB, isElectron } from './sqliteAPI';
import { inventoryDB } from '@/database/localDb';

/**
 * نوع قاعدة البيانات المستخدمة
 */
export type DatabaseType = 'sqlite' | 'indexeddb';

/**
 * مدير قاعدة البيانات الموحدة
 */
class UnifiedDatabaseManager {
  private dbType: DatabaseType;

  constructor() {
    // إذا كان Electron متوفر، استخدم SQLite، وإلا IndexedDB
    this.dbType = isElectron() ? 'sqlite' : 'indexeddb';
    console.log(`[UnifiedDB] Using ${this.dbType.toUpperCase()} database`);
  }

  /**
   * تهيئة قاعدة البيانات
   */
  async initialize(organizationId: string): Promise<{ success: boolean; type: DatabaseType }> {
    try {
      if (this.dbType === 'sqlite') {
        const result = await sqliteDB.initialize(organizationId);
        return { success: result.success, type: 'sqlite' };
      } else {
        // IndexedDB تهيئ تلقائياً
        return { success: true, type: 'indexeddb' };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Initialize failed:', error);
      return { success: false, type: this.dbType };
    }
  }

  /**
   * الحصول على نوع قاعدة البيانات المستخدمة
   */
  getDatabaseType(): DatabaseType {
    return this.dbType;
  }

  /**
   * فحص إذا كان SQLite مستخدم
   */
  isSQLite(): boolean {
    return this.dbType === 'sqlite';
  }

  /**
   * الحصول على الواجهة المناسبة
   */
  getSQLiteAPI() {
    if (this.dbType !== 'sqlite') {
      throw new Error('SQLite not available');
    }
    return sqliteDB;
  }

  getIndexedDBAPI() {
    if (this.dbType !== 'indexeddb') {
      throw new Error('IndexedDB not available');
    }
    return inventoryDB;
  }

  /**
   * إضافة منتج - واجهة موحدة
   */
  async addProduct(product: any): Promise<{ success: boolean }> {
    try {
      if (this.dbType === 'sqlite') {
        const result = await sqliteDB.upsertProduct(product);
        return { success: result.success };
      } else {
        await inventoryDB.products.put(product);
        return { success: true };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Add product failed:', error);
      return { success: false };
    }
  }

  /**
   * البحث عن منتجات - واجهة موحدة
   */
  async searchProducts(query: string, options?: any): Promise<{ success: boolean; data: any[] }> {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteDB.searchProducts(query, options);
      } else {
        // بحث بسيط في IndexedDB
        const products = await inventoryDB.products
          .where('name')
          .startsWithIgnoreCase(query)
          .limit(options?.limit || 50)
          .toArray();

        return { success: true, data: products };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Search products failed:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * الحصول على منتج بالـ ID - واجهة موحدة
   */
  async getProductById(id: string): Promise<any | null> {
    try {
      if (this.dbType === 'sqlite') {
        const result = await sqliteDB.queryOne('SELECT * FROM products WHERE id = ?', { id });
        return result.data || null;
      } else {
        return await inventoryDB.products.get(id) || null;
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Get product failed:', error);
      return null;
    }
  }

  /**
   * حذف منتج - واجهة موحدة
   */
  async deleteProduct(id: string): Promise<{ success: boolean }> {
    try {
      if (this.dbType === 'sqlite') {
        const result = await sqliteDB.delete('products', id);
        return { success: result.success };
      } else {
        await inventoryDB.products.delete(id);
        return { success: true };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Delete product failed:', error);
      return { success: false };
    }
  }

  /**
   * إضافة طلب POS - واجهة موحدة
   */
  async addPOSOrder(order: any, items: any[]): Promise<{ success: boolean }> {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteDB.addPOSOrder(order, items);
      } else {
        // إضافة للـ IndexedDB
        await inventoryDB.posOrders.add(order);
        for (const item of items) {
          await inventoryDB.posOrderItems.add(item);
        }
        return { success: true };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Add POS order failed:', error);
      return { success: false };
    }
  }

  /**
   * الحصول على إحصائيات - واجهة موحدة
   */
  async getStatistics(dateFrom: string, dateTo: string): Promise<{
    success: boolean;
    data?: any;
  }> {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteDB.getStatistics(dateFrom, dateTo);
      } else {
        // حساب الإحصائيات من IndexedDB
        const orders = await inventoryDB.posOrders
          .where('created_at')
          .between(dateFrom, dateTo, true, true)
          .toArray();

        const stats = {
          total_orders: orders.length,
          total_sales: orders.reduce((sum, o) => sum + o.total_amount, 0),
          total_paid: orders.reduce((sum, o) => sum + o.paid_amount, 0),
          average_order_value: orders.length > 0
            ? orders.reduce((sum, o) => sum + o.total_amount, 0) / orders.length
            : 0,
          unique_customers: new Set(orders.map(o => o.customer_id).filter(Boolean)).size
        };

        return { success: true, data: stats };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Get statistics failed:', error);
      return { success: false };
    }
  }

  /**
   * تنظيف البيانات القديمة - واجهة موحدة
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<{ success: boolean }> {
    try {
      if (this.dbType === 'sqlite') {
        const result = await sqliteDB.cleanupOldData(daysToKeep);
        return { success: result.success };
      } else {
        // تنظيف IndexedDB
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffISO = cutoffDate.toISOString();

        await inventoryDB.posOrders
          .where('created_at')
          .below(cutoffISO)
          .and(order => order.synced === true)
          .delete();

        await inventoryDB.invoices
          .where('created_at')
          .below(cutoffISO)
          .and(invoice => invoice.synced === true)
          .delete();

        return { success: true };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Cleanup failed:', error);
      return { success: false };
    }
  }

  /**
   * ضغط قاعدة البيانات - واجهة موحدة
   */
  async vacuum(): Promise<{ success: boolean; saved?: number }> {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteDB.vacuum();
      } else {
        // IndexedDB لا يدعم vacuum
        return { success: true, saved: 0 };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Vacuum failed:', error);
      return { success: false };
    }
  }

  /**
   * الحصول على حجم قاعدة البيانات
   */
  async getSize(): Promise<{ success: boolean; size?: number }> {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteDB.getSize();
      } else {
        // تقدير حجم IndexedDB
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const sizeMB = (estimate.usage || 0) / (1024 * 1024);
          return { success: true, size: parseFloat(sizeMB.toFixed(2)) };
        }
        return { success: false, size: 0 };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Get size failed:', error);
      return { success: false, size: 0 };
    }
  }

  /**
   * نسخ احتياطي
   */
  async backup(destinationPath: string): Promise<{ success: boolean }> {
    try {
      if (this.dbType === 'sqlite') {
        const result = await sqliteDB.backup(destinationPath);
        return { success: result.success };
      } else {
        // IndexedDB backup غير مدعوم مباشرة
        console.warn('[UnifiedDB] Backup not supported for IndexedDB');
        return { success: false };
      }
    } catch (error: any) {
      console.error('[UnifiedDB] Backup failed:', error);
      return { success: false };
    }
  }
}

// تصدير singleton
export const unifiedDB = new UnifiedDatabaseManager();

// تصدير للاستخدام المباشر أيضاً
export { sqliteDB, inventoryDB };
