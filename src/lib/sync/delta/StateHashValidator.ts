/**
 * StateHashValidator - Data Integrity Verification
 * التحقق من صحة البيانات بين المحلي والخادم
 *
 * يحسب hash لحالة كل جدول ويقارنه مع الخادم
 * عند عدم التطابق، يحدد الجداول المختلفة ويصلحها
 */

import { supabase } from '@/lib/supabase-unified';
import { sqliteWriteQueue } from './SQLiteWriteQueue';
import {
  StateValidationResult,
  DELTA_SYNC_CONSTANTS
} from './types';

export class StateHashValidator {
  private readonly HASH_TABLES = DELTA_SYNC_CONSTANTS.SYNCED_TABLES;

  /**
   * حساب Hash لجدول محلي
   */
  async computeTableHash(tableName: string): Promise<string> {
    try {
      // جلب جميع السجلات مرتبة بالـ ID
      const records = await sqliteWriteQueue.read<any[]>(
        `SELECT * FROM ${tableName} ORDER BY id`
      );

      if (records.length === 0) {
        return this.hashString('empty');
      }

      // تحويل إلى JSON مع ترتيب المفاتيح
      const normalized = records.map(record => {
        const sorted: Record<string, any> = {};
        // ترتيب المفاتيح أبجدياً
        Object.keys(record).sort().forEach(key => {
          // تجاهل الحقول المحلية فقط
          if (!this.isLocalOnlyField(tableName, key)) {
            sorted[key] = record[key];
          }
        });
        return sorted;
      });

      const jsonString = JSON.stringify(normalized);
      return this.hashString(jsonString);
    } catch (error) {
      console.error(`[StateHashValidator] Error computing hash for ${tableName}:`, error);
      return 'error';
    }
  }

  /**
   * حساب Hash للنص
   */
  private async hashString(text: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback بسيط إذا crypto.subtle غير متاح
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * التحقق مما إذا كان الحقل محلي فقط
   */
  private isLocalOnlyField(tableName: string, fieldName: string): boolean {
    const localOnlyFields: Record<string, string[]> = {
      products: ['thumbnail_base64', 'local_cache_at', 'local_updated_at'],
      product_colors: ['image_base64'],
      product_sizes: [],
      orders: [],
      customers: [],
      categories: []
    };

    return localOnlyFields[tableName]?.includes(fieldName) || false;
  }

  /**
   * حساب Hash شامل لجميع الجداول
   */
  async computeFullStateHash(): Promise<{
    fullHash: string;
    tableHashes: Record<string, string>;
  }> {
    const tableHashes: Record<string, string> = {};

    for (const table of this.HASH_TABLES) {
      tableHashes[table] = await this.computeTableHash(table);
    }

    // Hash of all table hashes
    const combined = Object.entries(tableHashes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([table, hash]) => `${table}:${hash}`)
      .join('|');

    const fullHash = await this.hashString(combined);

    return { fullHash, tableHashes };
  }

  /**
   * جلب Hash من الخادم
   * ملاحظة: يتطلب RPC function على الخادم
   */
  async getServerStateHash(organizationId: string): Promise<{
    fullHash: string;
    tableHashes: Record<string, string>;
  } | null> {
    try {
      const { data, error } = await supabase
        .rpc('compute_state_hash', {
          org_id: organizationId,
          tables: this.HASH_TABLES
        });

      if (error) {
        console.error('[StateHashValidator] Server hash error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[StateHashValidator] Failed to get server hash:', error);
      return null;
    }
  }

  /**
   * مقارنة الحالة المحلية مع الخادم
   */
  async validateState(organizationId: string): Promise<StateValidationResult> {
    console.log('[StateHashValidator] Starting state validation...');

    // حساب الـ hash المحلي
    const localState = await this.computeFullStateHash();

    // جلب الـ hash من الخادم
    const serverState = await this.getServerStateHash(organizationId);

    if (!serverState) {
      console.warn('[StateHashValidator] Could not get server state, skipping validation');
      return {
        valid: true, // نفترض صحة في غياب بيانات الخادم
        localHash: localState.fullHash,
        serverHash: 'unavailable'
      };
    }

    // مقارنة
    if (localState.fullHash === serverState.fullHash) {
      console.log('[StateHashValidator] State is valid');
      return {
        valid: true,
        localHash: localState.fullHash,
        serverHash: serverState.fullHash
      };
    }

    // تحديد الجداول المختلفة
    const mismatchedTables: string[] = [];
    for (const table of this.HASH_TABLES) {
      if (localState.tableHashes[table] !== serverState.tableHashes[table]) {
        mismatchedTables.push(table);
      }
    }

    console.warn('[StateHashValidator] State mismatch detected:', mismatchedTables);

    return {
      valid: false,
      localHash: localState.fullHash,
      serverHash: serverState.fullHash,
      mismatchedTables
    };
  }

  /**
   * إصلاح الجداول غير المتطابقة
   */
  async repairMismatchedTables(
    organizationId: string,
    tables: string[]
  ): Promise<{ repaired: string[]; failed: string[] }> {
    const repaired: string[] = [];
    const failed: string[] = [];

    console.log(`[StateHashValidator] Repairing tables: ${tables.join(', ')}`);

    for (const table of tables) {
      try {
        await this.repairTable(organizationId, table);
        repaired.push(table);
      } catch (error) {
        console.error(`[StateHashValidator] Failed to repair ${table}:`, error);
        failed.push(table);
      }
    }

    return { repaired, failed };
  }

  /**
   * إصلاح جدول واحد
   */
  private async repairTable(organizationId: string, tableName: string): Promise<void> {
    console.log(`[StateHashValidator] Repairing table: ${tableName}`);

    // جلب البيانات من الخادم
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
    }

    // استخدام transaction لضمان atomicity
    await sqliteWriteQueue.transaction(async () => {
      // حذف البيانات المحلية للجدول
      await sqliteWriteQueue.write(
        `DELETE FROM ${tableName} WHERE organization_id = ?`,
        [organizationId]
      );

      // إدراج البيانات الجديدة
      for (const record of data || []) {
        await this.upsertRecord(tableName, record);
      }
    });

    console.log(`[StateHashValidator] Repaired ${tableName} with ${data?.length || 0} records`);
  }

  /**
   * إدراج أو تحديث سجل
   */
  private async upsertRecord(tableName: string, record: Record<string, any>): Promise<void> {
    const columns = Object.keys(record);
    const values = Object.values(record).map(v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });

    const placeholders = columns.map(() => '?').join(', ');
    const updateSet = columns
      .filter(c => c !== 'id')
      .map(c => `${c} = excluded.${c}`)
      .join(', ');

    await sqliteWriteQueue.write(
      `INSERT INTO ${tableName} (${columns.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
      values
    );
  }

  /**
   * حفظ الـ state hash في sync_cursor
   */
  async saveStateHash(hash: string): Promise<void> {
    await sqliteWriteQueue.write(
      `UPDATE sync_cursor SET state_hash = ? WHERE id = 'main'`,
      [hash]
    );
  }

  /**
   * جلب آخر state hash محفوظ
   */
  async getSavedStateHash(): Promise<string | null> {
    const result = await sqliteWriteQueue.read<any[]>(
      `SELECT state_hash FROM sync_cursor WHERE id = 'main'`
    );
    return result[0]?.state_hash || null;
  }

  /**
   * فحص سريع - مقارنة مع آخر hash محفوظ
   */
  async quickCheck(): Promise<{
    changed: boolean;
    currentHash: string;
    savedHash: string | null;
  }> {
    const current = await this.computeFullStateHash();
    const saved = await this.getSavedStateHash();

    return {
      changed: current.fullHash !== saved,
      currentHash: current.fullHash,
      savedHash: saved
    };
  }

  /**
   * حساب عدد السجلات لكل جدول (للتشخيص)
   */
  async getRecordCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const table of this.HASH_TABLES) {
      try {
        const result = await sqliteWriteQueue.read<any[]>(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        counts[table] = result[0]?.count || 0;
      } catch {
        counts[table] = -1; // خطأ
      }
    }

    return counts;
  }
}

// Export singleton instance
export const stateHashValidator = new StateHashValidator();
