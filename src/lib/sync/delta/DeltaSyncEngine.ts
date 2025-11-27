/**
 * DeltaSyncEngine - Main Delta-Based Sync Controller
 * المحرك الرئيسي لنظام المزامنة القائم على العمليات
 *
 * ⚡ تم التحديث: الآن هو المحرك الموحد الوحيد للمزامنة
 * - يدمج وظائف TauriSyncService للمزامنة الشاملة
 * - يدير العمليات المحلية والإرسال للخادم
 * - يدعم Tauri و Electron و Web
 *
 * يدير:
 * - تهيئة الجداول المحلية
 * - المزامنة الأولية والتفاضلية
 * - استقبال التحديثات الفورية
 * - إرسال العمليات المحلية
 * - حل النزاعات
 * - التحقق من صحة البيانات
 */

import { supabase } from '@/lib/supabase-unified';
import { sqliteWriteQueue } from './SQLiteWriteQueue';
import { operationQueue, OperationQueue } from './OperationQueue';
import { outboxManager } from './OutboxManager';
import { batchSender } from './BatchSender';
import { realtimeReceiver } from './RealtimeReceiver';
import { conflictResolver } from './ConflictResolver';
import { mergeStrategy } from './MergeStrategy';
import { stateHashValidator } from './StateHashValidator';
import {
  ServerOperation,
  DeltaSyncStatus,
  DELTA_SYNC_TABLES,
  DELTA_SYNC_CONSTANTS,
  OperationType
} from './types';

// ⚡ استيراد TauriSyncService للمزامنة الشاملة
import {
  isTauriEnvironment,
  fullSync as tauriFullSync,
  getSQLiteStats
} from '../TauriSyncService';

export class DeltaSyncEngine {
  private isInitialized = false;
  private organizationId: string | null = null;
  private deviceId: string;
  private stateCheckInterval: ReturnType<typeof setInterval> | null = null;
  private gapCheckInterval: ReturnType<typeof setInterval> | null = null;

  // ⚡ قفل لمنع المزامنة المزدوجة
  private isFullSyncInProgress = false;
  private lastFullSyncTime = 0;
  private readonly MIN_SYNC_INTERVAL_MS = 5000; // 5 ثواني minimum بين المزامنات

  // ⚡ تعيين أسماء الجداول من Supabase إلى SQLite المحلي
  // فقط الجداول التي لها أسماء مختلفة بين Supabase و SQLite
  private readonly TABLE_NAME_MAP: Record<string, string> = {
    'orders': 'pos_orders',                    // جدول الطلبات
    'order_items': 'pos_order_items',          // عناصر الطلبات
    // ملاحظة: product_categories له نفس الاسم في Supabase و SQLite
  };

  // ⚡ الأعمدة الموجودة فقط محلياً ولا يجب إرسالها لـ Supabase
  private readonly LOCAL_ONLY_COLUMNS: Record<string, string[]> = {
    'orders': [
      'commune', 'wilaya', 'customer_name', 'customer_phone',
      'customer_address', 'order_number', 'total_amount', 'staff_id',
      'synced', 'syncStatus', 'pendingOperation', 'lastSyncAttempt',
      'remote_order_id', 'remote_customer_order_number', 'items'
    ],
    'pos_orders': [
      'commune', 'wilaya', 'customer_name', 'customer_phone',
      'customer_address', 'order_number', 'total_amount', 'staff_id',
      'synced', 'syncStatus', 'pendingOperation', 'lastSyncAttempt',
      'remote_order_id', 'remote_customer_order_number', 'items'
    ]
  };

  // ⚡ تحويل أسماء الأعمدة من SQLite المحلي إلى Supabase
  private readonly COLUMN_NAME_MAP: Record<string, Record<string, string>> = {
    'orders': {
      'total_amount': 'total',
      'staff_id': 'created_by_staff_id',
      'order_number': 'customer_order_number'
    },
    'pos_orders': {
      'total_amount': 'total',
      'staff_id': 'created_by_staff_id',
      'order_number': 'customer_order_number'
    }
  };

  // ⚡ الجداول التي تحتوي على عمود synced
  private readonly TABLES_WITH_SYNCED_COLUMN: string[] = [
    'products', 'customers', 'orders', 'pos_orders', 'invoices',
    'work_sessions', 'repair_orders', 'repair_locations', 'repair_images', 'repair_status_history',
    'pos_order_items', 'order_items', 'staff_members',
    'suppliers', 'supplier_purchases', 'supplier_payments', 'supplier_contacts'
  ];

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  /**
   * ⚡ تحويل اسم الجدول من Supabase إلى SQLite المحلي
   */
  private mapTableName(supabaseTable: string): string {
    return this.TABLE_NAME_MAP[supabaseTable] || supabaseTable;
  }

  /**
   * ⚡ تحويل الـ payload من الصيغة المحلية لصيغة Supabase
   * - حذف الأعمدة المحلية فقط
   * - تحويل أسماء الأعمدة
   * - تخزين البيانات الإضافية في metadata
   */
  private mapPayloadForSupabase(tableName: string, payload: Record<string, any>): Record<string, any> {
    const localOnlyCols = this.LOCAL_ONLY_COLUMNS[tableName] || [];
    const columnMap = this.COLUMN_NAME_MAP[tableName] || {};

    const result: Record<string, any> = {};
    const metadata: Record<string, any> = {};

    for (const [key, value] of Object.entries(payload)) {
      // تخطي الأعمدة المحلية فقط - نحفظها في metadata
      if (localOnlyCols.includes(key)) {
        // حفظ البيانات المهمة في metadata
        if (['customer_name', 'customer_phone', 'customer_address', 'wilaya', 'commune', 'items'].includes(key)) {
          metadata[key] = value;
        }
        continue;
      }

      // تحويل اسم العمود إذا لزم الأمر
      const mappedKey = columnMap[key] || key;
      result[mappedKey] = value;
    }

    // إضافة metadata إذا كانت غير فارغة
    if (Object.keys(metadata).length > 0) {
      // دمج مع metadata الموجودة إن وجدت
      const existingMetadata = result['metadata'] ?
        (typeof result['metadata'] === 'string' ? JSON.parse(result['metadata']) : result['metadata']) : {};
      result['metadata'] = JSON.stringify({ ...existingMetadata, ...metadata });
    }

    return result;
  }

  /**
   * الحصول على أو إنشاء device ID
   */
  private getOrCreateDeviceId(): string {
    const storageKey = 'delta_sync_device_id';
    let deviceId = localStorage.getItem(storageKey);

    if (!deviceId) {
      deviceId = `device_${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, deviceId);
    }

    return deviceId;
  }

  /**
   * تهيئة المحرك
   */
  async initialize(organizationId: string): Promise<void> {
    if (this.isInitialized && this.organizationId === organizationId) {
      console.log('[DeltaSyncEngine] Already initialized');
      return;
    }

    console.log(`[DeltaSyncEngine] Initializing for org ${organizationId}...`);
    this.organizationId = organizationId;

    try {
      // ⚡ 0. تعيين organizationId لـ SQLiteWriteQueue (مطلوب لتهيئة DB في Tauri)
      sqliteWriteQueue.setOrganizationId(organizationId);

      // 1. إنشاء الجداول المحلية
      await this.ensureTables();

      // 2. تهيئة outbox manager
      await outboxManager.initialize();

      // 3. إعادة العمليات المعلقة للحالة الصحيحة
      await outboxManager.requeueStuck();

      // 3.5 ⚡ تنظيف العمليات القديمة التي تحتوي على أعمدة غير صالحة
      await this.cleanupInvalidOutboxEntries();

      // 🔍 DEBUG: طباعة حالة الـ Outbox عند التهيئة
      const outboxStats = await outboxManager.getStats();
      console.log('[DeltaSyncEngine] 📊 Outbox Stats at init:', JSON.stringify(outboxStats, null, 2));

      // 4. جلب آخر server_seq مُطبَّق
      const cursor = await this.getSyncCursor();
      const lastSeq = cursor.last_server_seq;

      // 5. تهيئة الـ Operation Queue
      await operationQueue.initialize(lastSeq);

      // 6. تعيين callback لـ gap recovery
      operationQueue.setGapRecoveryCallback(async (start, end) => {
        await this.fillGap(start, end);
      });

      // 7. التحقق من Initial Sync
      if (lastSeq === 0) {
        console.log('[DeltaSyncEngine] No previous sync, performing initial sync...');
        await this.performInitialSync();
      } else {
        // جلب أي عمليات فاتتنا أثناء offline
        await this.catchUp();
      }

      // 8. بدء Realtime subscription
      await realtimeReceiver.subscribe(organizationId, (op) => {
        this.handleIncomingOperation(op);
      });

      // 9. بدء إرسال الـ Outbox
      batchSender.start(organizationId);

      // 10. فحص دوري للـ State Hash
      this.stateCheckInterval = setInterval(
        () => this.periodicStateCheck(),
        DELTA_SYNC_CONSTANTS.STATE_CHECK_INTERVAL_MS
      );

      // 11. فحص دوري للـ gaps
      this.gapCheckInterval = setInterval(async () => {
        const ready = await operationQueue.periodicGapCheck();
        for (const op of ready) {
          await this.processOperation(op);
        }
      }, 5000);

      this.isInitialized = true;
      console.log('[DeltaSyncEngine] Initialized successfully');
    } catch (error) {
      console.error('[DeltaSyncEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * إنشاء الجداول المحلية
   */
  private async ensureTables(): Promise<void> {
    console.log(`[DeltaSyncEngine] 🔧 Creating sync tables for org: ${this.organizationId?.slice(0, 8)}...`);

    for (const [name, sql] of Object.entries(DELTA_SYNC_TABLES)) {
      try {
        await sqliteWriteQueue.write(sql);
        console.log(`[DeltaSyncEngine] ✅ Table ${name} ready`);
      } catch (error) {
        console.error(`[DeltaSyncEngine] ❌ Error creating table ${name}:`, error);
      }
    }

    // ⚡ Migration: إضافة عمود next_retry_at لدعم Exponential Backoff
    // التحقق من وجود العمود قبل محاولة إضافته لتجنب خطأ duplicate column
    try {
      const columns = await sqliteWriteQueue.read<any[]>(
        `PRAGMA table_info(sync_outbox)`
      );
      const hasNextRetryAt = columns.some((col: any) => col.name === 'next_retry_at');

      if (!hasNextRetryAt) {
        await sqliteWriteQueue.write(
          `ALTER TABLE sync_outbox ADD COLUMN next_retry_at TEXT`
        );
        console.log('[DeltaSyncEngine] ✅ Added next_retry_at column to sync_outbox');
      }
    } catch (error: any) {
      // خطأ في الترحيل - نعرضه في السجل
      const errorMsg = error?.message || String(error);
      if (!errorMsg.includes('duplicate column') && !errorMsg.includes('already exists')) {
        console.warn('[DeltaSyncEngine] ⚠️ Migration warning:', errorMsg);
      }
    }

    // تأكد من وجود صف في sync_cursor
    try {
      await sqliteWriteQueue.write(
        `INSERT OR IGNORE INTO sync_cursor (id, last_server_seq, last_sync_at) VALUES ('main', 0, NULL)`
      );
      console.log('[DeltaSyncEngine] ✅ sync_cursor initialized');
    } catch (error) {
      console.error('[DeltaSyncEngine] ❌ Error initializing sync_cursor:', error);
    }
  }

  /**
   * جلب sync cursor
   */
  private async getSyncCursor(): Promise<{
    last_server_seq: number;
    last_sync_at: string | null;
    state_hash: string | null;
  }> {
    const result = await sqliteWriteQueue.read<any[]>(
      `SELECT * FROM sync_cursor WHERE id = 'main'`
    );

    return result[0] || { last_server_seq: 0, last_sync_at: null, state_hash: null };
  }

  /**
   * ⚡ تنظيف العمليات المعلقة التي تحتوي على أعمدة غير صالحة
   * يُنفذ عند التهيئة لإصلاح العمليات القديمة
   */
  private async cleanupInvalidOutboxEntries(): Promise<void> {
    // الأعمدة غير الصالحة لجدول orders
    const invalidOrderColumns = [
      'commune', 'wilaya', 'customer_name', 'customer_phone',
      'customer_address', 'order_number', 'total_amount', 'staff_id',
      'synced', 'syncStatus', 'pendingOperation', 'lastSyncAttempt',
      'remote_order_id', 'remote_customer_order_number', 'items'
    ];

    try {
      // 1. محاولة تنظيف وإصلاح الـ payloads
      const cleaned = await outboxManager.cleanInvalidPayloads('orders', invalidOrderColumns);
      if (cleaned > 0) {
        console.log(`[DeltaSyncEngine] ✅ Cleaned ${cleaned} invalid order payloads`);
      }

      // 2. حذف العمليات الفاشلة التي تجاوزت الحد الأقصى
      const stats = await outboxManager.getStats();
      if (stats.failed > 0) {
        console.log(`[DeltaSyncEngine] 🗑️ Removing ${stats.failed} permanently failed operations`);
        await sqliteWriteQueue.write(
          `DELETE FROM sync_outbox WHERE status = 'failed' AND retry_count >= 5`
        );
      }

      // 3. حذف العمليات القديمة جداً (أكثر من 24 ساعة)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oldOpsResult = await sqliteWriteQueue.write<any>(
        `DELETE FROM sync_outbox WHERE created_at < ? AND status != 'sending'`,
        [oneDayAgo]
      );
      if (oldOpsResult?.changes > 0) {
        console.log(`[DeltaSyncEngine] 🗑️ Removed ${oldOpsResult.changes} old stale operations`);
      }
    } catch (error) {
      console.error('[DeltaSyncEngine] Error cleaning invalid payloads:', error);
    }
  }

  /**
   * المزامنة الأولية الكاملة
   */
  async performInitialSync(): Promise<void> {
    if (!this.organizationId) {
      throw new Error('Not initialized');
    }

    console.log('[DeltaSyncEngine] Starting initial sync...');

    // جلب جميع العمليات من الخادم
    // @ts-ignore - operations_log غير موجود في Supabase types
    const { data: operations, error } = await supabase
      .from('operations_log' as any)
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_valid', true)
      .order('server_seq', { ascending: true });

    if (error) {
      console.error('[DeltaSyncEngine] Initial sync fetch error:', error);
      // Fallback: جلب البيانات مباشرة من الجداول
      await this.fallbackInitialSync();
      return;
    }

    if (!operations || operations.length === 0) {
      console.log('[DeltaSyncEngine] No operations found, fetching data directly...');
      await this.fallbackInitialSync();
      return;
    }

    // تجميع حالة كل سجل
    const recordStates = this.buildRecordStates(operations as unknown as ServerOperation[]);

    // تطبيق الحالة النهائية
    await sqliteWriteQueue.transaction(async () => {
      for (const [key, state] of recordStates) {
        if (state.finalState === 'deleted') {
          // حذف وتسجيل في tombstones
          await sqliteWriteQueue.write(
            `DELETE FROM ${state.tableName} WHERE id = ?`,
            [state.recordId]
          );
          await sqliteWriteQueue.write(
            `INSERT OR REPLACE INTO sync_tombstones (id, table_name, record_id, deleted_at, server_seq)
             VALUES (?, ?, ?, ?, ?)`,
            [key, state.tableName, state.recordId, new Date().toISOString(), state.latestSeq]
          );
        } else if (state.latestData) {
          // إدراج/تحديث
          await this.upsertRecord(state.tableName, state.latestData);
        }

        // تسجيل كمُطبَّقة
        await this.markOperationApplied(state.latestSeq, key, state.tableName);
      }

      // تحديث الـ Cursor
      const maxSeq = Math.max(...Array.from(recordStates.values()).map(s => s.latestSeq), 0);
      await this.updateSyncCursor(maxSeq);
    });

    // حساب وحفظ State Hash
    const { fullHash } = await stateHashValidator.computeFullStateHash();
    await stateHashValidator.saveStateHash(fullHash);

    console.log(`[DeltaSyncEngine] Initial sync completed. ${recordStates.size} records processed.`);
  }

  /**
   * Fallback: جلب البيانات مباشرة من الجداول
   * ⚡ يدعم الجداول الرئيسية والفرعية
   */
  private async fallbackInitialSync(): Promise<void> {
    if (!this.organizationId) return;

    console.log('[DeltaSyncEngine] Using fallback initial sync...');

    // ⚡ 1. مزامنة الجداول الرئيسية (لديها organization_id)
    for (const table of DELTA_SYNC_CONSTANTS.SYNCED_TABLES) {
      try {
        // @ts-ignore - بعض الجداول قد لا تكون في Supabase types
        const { data, error } = await supabase
          .from(table as any)
          .select('*')
          .eq('organization_id', this.organizationId);

        if (error) {
          console.error(`[DeltaSyncEngine] Error fetching ${table}:`, error);
          continue;
        }

        for (const record of data || []) {
          // ⚡ إضافة synced: 1 فقط للجداول التي تدعمه
          const recordToSave = this.TABLES_WITH_SYNCED_COLUMN.includes(table)
            ? { ...record, synced: 1 }
            : record;
          await this.upsertRecord(table, recordToSave);
        }

        console.log(`[DeltaSyncEngine] Synced ${data?.length || 0} records from ${table}`);
      } catch (error) {
        console.error(`[DeltaSyncEngine] Error in fallback sync for ${table}:`, error);
      }
    }

    // ⚡ 2. مزامنة جداول المنتجات الفرعية (product_colors, product_sizes, product_images)
    // هذه الجداول ترتبط بـ product_id وليس organization_id مباشرة
    try {
      // جلب IDs المنتجات المحلية
      const localProducts = await sqliteWriteQueue.read<any[]>(
        `SELECT id FROM products WHERE organization_id = ?`,
        [this.organizationId]
      );
      const productIds = localProducts.map(p => p.id);
      console.log(`[DeltaSyncEngine] 🔍 DEBUG: Found ${productIds.length} local products for variants sync`);

      if (productIds.length > 0) {
        // مزامنة product_colors
        const { data: colors, error: colorsError } = await supabase
          .from('product_colors')
          .select('*')
          .in('product_id', productIds);

        if (colorsError) {
          console.error('[DeltaSyncEngine] ❌ Error fetching colors:', colorsError);
        } else {
          console.log(`[DeltaSyncEngine] 🎨 DEBUG: Fetched ${colors?.length || 0} colors from Supabase`);
          for (const record of colors || []) {
            await this.upsertRecord('product_colors', record);
          }
          console.log(`[DeltaSyncEngine] ✅ Synced ${colors?.length || 0} records from product_colors`);
        }

        // مزامنة product_sizes
        const { data: sizes, error: sizesError } = await supabase
          .from('product_sizes')
          .select('*')
          .in('product_id', productIds);

        if (sizesError) {
          console.error('[DeltaSyncEngine] ❌ Error fetching sizes:', sizesError);
        } else {
          console.log(`[DeltaSyncEngine] 📏 DEBUG: Fetched ${sizes?.length || 0} sizes from Supabase`);
          for (const record of sizes || []) {
            await this.upsertRecord('product_sizes', record);
          }
          console.log(`[DeltaSyncEngine] ✅ Synced ${sizes?.length || 0} records from product_sizes`);
        }

        // مزامنة product_images
        const { data: images, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .in('product_id', productIds);

        if (imagesError) {
          console.error('[DeltaSyncEngine] ❌ Error fetching images:', imagesError);
        } else {
          for (const record of images || []) {
            await this.upsertRecord('product_images', record);
          }
          console.log(`[DeltaSyncEngine] ✅ Synced ${images?.length || 0} records from product_images`);
        }

        // ⚡ مزامنة product_advanced_settings
        const { data: advSettings, error: advError } = await supabase
          .from('product_advanced_settings')
          .select('*')
          .in('product_id', productIds);

        if (advError) {
          console.error('[DeltaSyncEngine] ❌ Error fetching advanced settings:', advError);
        } else {
          for (const record of advSettings || []) {
            await this.upsertRecord('product_advanced_settings', record);
          }
          console.log(`[DeltaSyncEngine] ✅ Synced ${advSettings?.length || 0} records from product_advanced_settings`);
        }

        // ⚡ مزامنة product_marketing_settings
        const { data: mktSettings, error: mktError } = await supabase
          .from('product_marketing_settings')
          .select('*')
          .in('product_id', productIds);

        if (mktError) {
          console.error('[DeltaSyncEngine] ❌ Error fetching marketing settings:', mktError);
        } else {
          for (const record of mktSettings || []) {
            await this.upsertRecord('product_marketing_settings', record);
          }
          console.log(`[DeltaSyncEngine] ✅ Synced ${mktSettings?.length || 0} records from product_marketing_settings`);
        }

        // ⚡ مزامنة product_wholesale_tiers
        const { data: wsTiers, error: wsError } = await supabase
          .from('product_wholesale_tiers')
          .select('*')
          .in('product_id', productIds);

        if (wsError) {
          console.error('[DeltaSyncEngine] ❌ Error fetching wholesale tiers:', wsError);
        } else {
          for (const record of wsTiers || []) {
            await this.upsertRecord('product_wholesale_tiers', record);
          }
          console.log(`[DeltaSyncEngine] ✅ Synced ${wsTiers?.length || 0} records from product_wholesale_tiers`);
        }

        // 🔍 DEBUG: التحقق من البيانات المحلية بعد المزامنة
        const localColors = await sqliteWriteQueue.read<any[]>(`SELECT COUNT(*) as count FROM product_colors`);
        const localSizes = await sqliteWriteQueue.read<any[]>(`SELECT COUNT(*) as count FROM product_sizes`);
        console.log(`[DeltaSyncEngine] 🔍 DEBUG: Local colors after sync: ${localColors[0]?.count || 0}, sizes: ${localSizes[0]?.count || 0}`);
      }
    } catch (error) {
      console.error(`[DeltaSyncEngine] Error syncing product child tables:`, error);
    }

    // تحديث cursor إلى أحدث seq
    const latestSeq = await realtimeReceiver.getLatestServerSeq();
    await this.updateSyncCursor(latestSeq);
  }

  /**
   * بناء حالة السجلات من العمليات
   */
  private buildRecordStates(operations: ServerOperation[]): Map<string, {
    tableName: string;
    recordId: string;
    finalState: 'exists' | 'deleted';
    latestData: any;
    latestSeq: number;
  }> {
    const states = new Map();

    for (const op of operations) {
      const key = `${op.table_name}:${op.record_id}`;

      if (op.operation === 'DELETE') {
        states.set(key, {
          tableName: op.table_name,
          recordId: op.record_id,
          finalState: 'deleted',
          latestData: null,
          latestSeq: op.server_seq
        });
      } else if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
        const existing = states.get(key);
        if (!existing || existing.finalState === 'deleted' || op.server_seq > existing.latestSeq) {
          states.set(key, {
            tableName: op.table_name,
            recordId: op.record_id,
            finalState: 'exists',
            latestData: op.payload,
            latestSeq: op.server_seq
          });
        }
      } else if (op.operation === 'DELTA') {
        const existing = states.get(key);
        if (existing && existing.finalState === 'exists' && existing.latestData) {
          // تطبيق الـ DELTA على البيانات
          existing.latestData = this.applyDeltaToData(existing.latestData, op.payload);
          existing.latestSeq = op.server_seq;
        }
      }
    }

    return states;
  }

  /**
   * اللحاق بالعمليات الفائتة
   */
  async catchUp(): Promise<void> {
    const cursor = await this.getSyncCursor();
    const operations = await realtimeReceiver.fetchOperationsSince(cursor.last_server_seq);

    if (operations.length > 0) {
      console.log(`[DeltaSyncEngine] Catching up with ${operations.length} operations`);

      for (const op of operations) {
        await this.handleIncomingOperation(op);
      }
    }
  }

  /**
   * معالجة عملية واردة من Realtime
   */
  private async handleIncomingOperation(op: ServerOperation): Promise<void> {
    // التحقق من التكرار
    if (await this.isOperationApplied(op.server_seq)) {
      return;
    }

    // إضافة للـ Queue (للترتيب)
    const readyOps = await operationQueue.enqueue(op);

    // معالجة العمليات الجاهزة
    for (const readyOp of readyOps) {
      await this.processOperation(readyOp);
    }
  }

  /**
   * معالجة عملية واحدة
   */
  private async processOperation(op: ServerOperation): Promise<void> {
    try {
      // اكتشاف التعارضات
      const conflict = await conflictResolver.detectConflict(op);

      if (conflict) {
        const resolution = await conflictResolver.resolve(conflict);

        if (resolution.discardLocal && conflict.localOperation) {
          await conflictResolver.discardLocalOperation(conflict.localOperation.id);
        }

        if (!resolution.applyServer) {
          if (resolution.mergedData) {
            await this.upsertRecord(op.table_name, resolution.mergedData);
          }
          await this.markOperationApplied(op.server_seq, op.id, op.table_name);
          await this.updateSyncCursor(op.server_seq);
          return;
        }
      }

      // تطبيق العملية
      await this.applyOperation(op);

      // تسجيل كمُطبَّقة
      await this.markOperationApplied(op.server_seq, op.id, op.table_name);

      // تحديث الـ Cursor
      await this.updateSyncCursor(op.server_seq);
    } catch (error) {
      console.error(`[DeltaSyncEngine] Error processing operation ${op.server_seq}:`, error);
    }
  }

  /**
   * تطبيق عملية على SQLite
   * ⚡ يستخدم mapTableName لتحويل أسماء الجداول
   */
  private async applyOperation(op: ServerOperation): Promise<void> {
    if (!op.is_valid) {
      console.warn(`[DeltaSyncEngine] Skipping invalid operation: ${op.invalidated_reason}`);
      return;
    }

    // ⚡ تحويل اسم الجدول للمحلي
    const localTableName = this.mapTableName(op.table_name);

    switch (op.operation) {
      case 'INSERT':
        await this.upsertRecord(op.table_name, op.payload);
        break;

      case 'UPDATE':
        const merged = await mergeStrategy.merge(op.table_name, op.payload, 'UPDATE');
        await this.upsertRecord(op.table_name, merged);
        break;

      case 'DELETE':
        await sqliteWriteQueue.write(
          `DELETE FROM ${localTableName} WHERE id = ?`,
          [op.record_id]
        );
        await sqliteWriteQueue.write(
          `INSERT OR REPLACE INTO sync_tombstones VALUES (?, ?, ?, ?, ?)`,
          [
            `${op.table_name}:${op.record_id}`,
            op.table_name,
            op.record_id,
            new Date().toISOString(),
            op.server_seq
          ]
        );
        break;

      case 'DELTA':
        await this.applyDelta(op.table_name, op.record_id, op.payload);
        break;
    }
  }

  /**
   * تطبيق DELTA على سجل
   * ⚡ يستخدم mapTableName لتحويل أسماء الجداول
   */
  private async applyDelta(tableName: string, recordId: string, delta: any): Promise<void> {
    // ⚡ تحويل اسم الجدول للمحلي
    const localTableName = this.mapTableName(tableName);

    // التحقق من وجود السجل
    const existing = await sqliteWriteQueue.read<any[]>(
      `SELECT * FROM ${localTableName} WHERE id = ?`,
      [recordId]
    );

    if (existing.length === 0) {
      console.warn(`[DeltaSyncEngine] Cannot apply DELTA to non-existent record ${recordId}`);
      return;
    }

    // بناء UPDATE
    const updates: string[] = [];
    const values: any[] = [];

    for (const [field, change] of Object.entries(delta)) {
      if (typeof change === 'number') {
        updates.push(`${field} = ${field} + ?`);
        values.push(change);
      }
    }

    if (updates.length > 0) {
      values.push(recordId);
      await sqliteWriteQueue.write(
        `UPDATE ${localTableName} SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  /**
   * تطبيق DELTA على بيانات في الذاكرة
   */
  private applyDeltaToData(data: any, delta: any): any {
    const result = { ...data };
    for (const [field, change] of Object.entries(delta)) {
      if (typeof change === 'number' && typeof result[field] === 'number') {
        result[field] = result[field] + change;
      }
    }
    return result;
  }

  /**
   * UPSERT سجل
   * ⚡ يستخدم mapTableName لتحويل أسماء الجداول
   */
  private async upsertRecord(tableName: string, data: Record<string, any>): Promise<void> {
    // ⚡ تحويل اسم الجدول للمحلي
    const localTableName = this.mapTableName(tableName);

    const columns = Object.keys(data);
    const values = columns.map(c => {
      const v = data[c];
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
      `INSERT INTO ${localTableName} (${columns.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
      values
    );
  }

  /**
   * تحديث سجل موجود (UPDATE حقيقي بدون INSERT)
   * ⚡ يُستخدم عند تحديث بيانات جزئية لتجنب أخطاء NOT NULL
   */
  private async updateRecord(tableName: string, recordId: string, data: Record<string, any>): Promise<void> {
    // ⚡ تحويل اسم الجدول للمحلي
    const localTableName = this.mapTableName(tableName);

    // استبعاد id من البيانات المُحدَّثة
    const { id: _id, ...updateData } = data;

    const columns = Object.keys(updateData);
    if (columns.length === 0) return;

    const values = columns.map(c => {
      const v = updateData[c];
      if (v === null || v === undefined) return null;
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });

    const setClause = columns.map(c => `${c} = ?`).join(', ');
    values.push(recordId); // للـ WHERE clause

    await sqliteWriteQueue.write(
      `UPDATE ${localTableName} SET ${setClause} WHERE id = ?`,
      values
    );
  }

  /**
   * ⚡ جلب العمليات المفقودة - محسّن مع حد للفجوة ومعالجة الأخطاء
   */
  private async fillGap(startSeq: number, endSeq: number): Promise<void> {
    const gapSize = endSeq - startSeq + 1;

    console.log(`%c[DeltaSyncEngine] 🔄 Gap detected: seq ${startSeq} to ${endSeq} (${gapSize} operations)`, 'color: #FF9800; font-weight: bold');

    // ⚡ فحص حجم الفجوة
    if (gapSize > DELTA_SYNC_CONSTANTS.MAX_GAP_SIZE) {
      console.warn(`%c[DeltaSyncEngine] ⚠️ Gap too large (${gapSize} > ${DELTA_SYNC_CONSTANTS.MAX_GAP_SIZE}), triggering partial resync`, 'color: #f44336; font-weight: bold');
      
      // تخطي الفجوة وإعادة ضبط الـ Queue
      const skippedOps = operationQueue.skipGap();
      console.log(`[DeltaSyncEngine] Skipped gap, processing ${skippedOps.length} buffered operations`);
      
      for (const op of skippedOps) {
        await this.processOperation(op);
      }
      
      // ⚡ حفظ في localStorage للتشخيص
      this.logGapSkipped(startSeq, endSeq, 'gap_too_large');
      return;
    }

    // ⚡ محاولة جلب العمليات المفقودة
    try {
      console.log(`[DeltaSyncEngine] 📥 Fetching ${gapSize} missing operations...`);
      
      const operations = await realtimeReceiver.fetchMissingOperations(startSeq, endSeq);

      if (operations.length === 0) {
        console.warn(`[DeltaSyncEngine] ⚠️ No operations found for gap ${startSeq}-${endSeq}, skipping`);
        
        // تخطي الفجوة
        const skippedOps = operationQueue.skipGap();
        for (const op of skippedOps) {
          await this.processOperation(op);
        }
        
        this.logGapSkipped(startSeq, endSeq, 'no_operations_found');
        return;
      }

      console.log(`%c[DeltaSyncEngine] ✅ Fetched ${operations.length}/${gapSize} operations`, 'color: #4CAF50');

      // معالجة العمليات المسترجعة
      const readyOps = await operationQueue.processRecoveredOperations(operations);
      
      for (const op of readyOps) {
        await this.processOperation(op);
      }

      console.log(`%c[DeltaSyncEngine] ✅ Gap recovery complete, processed ${readyOps.length} operations`, 'color: #4CAF50; font-weight: bold');

    } catch (error) {
      console.error(`%c[DeltaSyncEngine] ❌ Gap recovery failed:`, 'color: #f44336', error);
      
      // ⚡ Fallback: تخطي الفجوة
      console.log(`[DeltaSyncEngine] 🔄 Falling back to skip gap`);
      const skippedOps = operationQueue.skipGap();
      
      for (const op of skippedOps) {
        await this.processOperation(op);
      }
      
      this.logGapSkipped(startSeq, endSeq, 'fetch_failed');
    }
  }

  /**
   * ⚡ تسجيل الفجوات المتخطاة للتشخيص
   */
  private logGapSkipped(startSeq: number, endSeq: number, reason: string): void {
    try {
      const skippedGaps = JSON.parse(localStorage.getItem('skipped_gaps') || '[]');
      skippedGaps.push({
        startSeq,
        endSeq,
        size: endSeq - startSeq + 1,
        reason,
        timestamp: new Date().toISOString()
      });
      
      // نحتفظ بآخر 50 فجوة فقط
      if (skippedGaps.length > 50) skippedGaps.shift();
      
      localStorage.setItem('skipped_gaps', JSON.stringify(skippedGaps));
    } catch { }
  }

  /**
   * التحقق من تطبيق العملية
   */
  private async isOperationApplied(serverSeq: number): Promise<boolean> {
    const result = await sqliteWriteQueue.read<any[]>(
      `SELECT 1 FROM applied_operations WHERE server_seq = ?`,
      [serverSeq]
    );
    return result.length > 0;
  }

  /**
   * تسجيل عملية كمُطبَّقة
   */
  private async markOperationApplied(serverSeq: number, operationId: string, tableName: string): Promise<void> {
    await sqliteWriteQueue.write(
      `INSERT OR IGNORE INTO applied_operations (server_seq, operation_id, applied_at, table_name)
       VALUES (?, ?, ?, ?)`,
      [serverSeq, operationId, new Date().toISOString(), tableName]
    );
  }

  /**
   * تحديث sync cursor
   */
  private async updateSyncCursor(serverSeq: number): Promise<void> {
    await sqliteWriteQueue.write(
      `UPDATE sync_cursor SET last_server_seq = ?, last_sync_at = ? WHERE id = 'main'`,
      [serverSeq, new Date().toISOString()]
    );
  }

  /**
   * فحص دوري للـ State Hash
   */
  private async periodicStateCheck(): Promise<void> {
    if (!this.organizationId) return;

    try {
      const result = await stateHashValidator.validateState(this.organizationId);

      if (!result.valid && result.mismatchedTables) {
        console.warn('[DeltaSyncEngine] State mismatch detected:', result.mismatchedTables);

        if (result.mismatchedTables.length <= 2) {
          await stateHashValidator.repairMismatchedTables(this.organizationId, result.mismatchedTables);
        } else {
          console.warn('[DeltaSyncEngine] Too many mismatched tables, full resync recommended');
        }
      }
    } catch (error) {
      console.error('[DeltaSyncEngine] State check error:', error);
    }
  }

  // =====================
  // Public API
  // =====================

  /**
   * كتابة محلية + إضافة للـ Outbox
   */
  async localWrite(
    tableName: string,
    operation: OperationType,
    recordId: string,
    data: any
  ): Promise<void> {
    // ⚡ تحويل اسم الجدول للمحلي
    const localTableName = this.mapTableName(tableName);

    // تطبيق محلياً فوراً
    if (operation === 'DELETE') {
      await sqliteWriteQueue.write(
        `DELETE FROM ${localTableName} WHERE id = ?`,
        [recordId]
      );
    } else if (operation === 'DELTA') {
      await this.applyDelta(tableName, recordId, data);
    } else if (operation === 'UPDATE') {
      // ⚡ استخدام UPDATE حقيقي لتجنب أخطاء NOT NULL على الأعمدة الإجبارية
      await this.updateRecord(tableName, recordId, data);
    } else {
      // INSERT أو أي عملية أخرى تستخدم UPSERT
      await this.upsertRecord(tableName, { id: recordId, ...data });
    }

    // ⚡ تحويل الـ payload للصيغة الصحيحة لـ Supabase قبل إضافته للـ Outbox
    const mappedPayload = this.mapPayloadForSupabase(tableName, data);

    // إضافة للـ Outbox (نحتفظ باسم الجدول الأصلي للـ Supabase)
    await outboxManager.add({
      tableName,
      operation,
      recordId,
      payload: mappedPayload
    });
  }

  /**
   * كتابة محلية فقط (بدون إضافة للـ Outbox)
   * ⚡ يُستخدم عند تحديث حالة المزامنة بعد نجاح الإرسال للسيرفر
   */
  async localWriteOnly(
    tableName: string,
    operation: OperationType,
    recordId: string,
    data: any
  ): Promise<void> {
    // ⚡ تحويل اسم الجدول للمحلي
    const localTableName = this.mapTableName(tableName);

    // تطبيق محلياً فقط (بدون Outbox)
    if (operation === 'DELETE') {
      await sqliteWriteQueue.write(
        `DELETE FROM ${localTableName} WHERE id = ?`,
        [recordId]
      );
    } else if (operation === 'DELTA') {
      await this.applyDelta(tableName, recordId, data);
    } else if (operation === 'UPDATE') {
      // ⚡ استخدام UPDATE حقيقي لتجنب أخطاء NOT NULL
      await this.updateRecord(tableName, recordId, data);
    } else {
      await this.upsertRecord(tableName, { id: recordId, ...data });
    }
  }

  /**
   * DELTA للمخزون
   */
  async stockDelta(
    tableName: string,
    recordId: string,
    field: string,
    change: number
  ): Promise<void> {
    await this.localWrite(tableName, 'DELTA', recordId, { [field]: change });
  }

  /**
   * مزامنة كاملة يدوية
   * ⚡ موحّد: يستخدم TauriSyncService في Tauri، و fallback للمزامنة الأساسية
   * ⚡ يمنع المزامنة المزدوجة باستخدام قفل داخلي
   */
  async fullSync(): Promise<void> {
    if (!this.organizationId) {
      throw new Error('Not initialized');
    }

    // ⚡ منع المزامنة المزدوجة
    if (this.isFullSyncInProgress) {
      console.log('[DeltaSyncEngine] ⏳ Full sync already in progress, skipping...');
      return;
    }

    // ⚡ منع المزامنة المتكررة جداً (minimum 5 ثواني بين المزامنات)
    const timeSinceLastSync = Date.now() - this.lastFullSyncTime;
    if (timeSinceLastSync < this.MIN_SYNC_INTERVAL_MS) {
      console.log(`[DeltaSyncEngine] ⏳ Too soon since last sync (${timeSinceLastSync}ms), skipping...`);
      return;
    }

    this.isFullSyncInProgress = true;
    console.log('[DeltaSyncEngine] Starting full sync...');
    const startTime = Date.now();

    try {
      // ⚡ تنظيف العمليات المعلقة القديمة أولاً
      await this.cleanupInvalidOutboxEntries();

      // ⚡ في بيئة Tauri، استخدم TauriSyncService للمزامنة الشاملة
      if (isTauriEnvironment()) {
        console.log('[DeltaSyncEngine] 🦀 Tauri detected - using TauriSyncService for comprehensive sync...');

        try {
          const result = await tauriFullSync(this.organizationId);
          const duration = Date.now() - startTime;

          if (result.success) {
            console.log('[DeltaSyncEngine] ✅ Tauri full sync completed successfully', {
              duration: duration + 'ms',
              products: result.results.products.count,
              customers: result.results.customers.count,
              orders: result.results.orders.count,
              invoices: result.results.invoices.count,
              uploaded: result.results.uploaded.uploaded
            });
          } else {
            console.warn('[DeltaSyncEngine] ⚠️ Tauri full sync completed with some errors', {
              duration: duration + 'ms',
              results: result.results
            });
          }

          // تحديث cursor بعد المزامنة الناجحة
          await this.updateSyncCursor(Date.now());
          return;
        } catch (tauriError) {
          console.warn('[DeltaSyncEngine] ⚠️ Tauri sync failed, falling back to Delta sync...', tauriError);
          // استمر للمزامنة الأساسية
        }
      }

      // ⚡ المزامنة الأساسية (للـ Electron و Web)
      console.log('[DeltaSyncEngine] 🔄 Using Delta-based sync...');

      // إيقاف Realtime مؤقتاً
      await realtimeReceiver.unsubscribe();

      // مسح العمليات المُطبَّقة
      await sqliteWriteQueue.write(`DELETE FROM applied_operations`);
      await sqliteWriteQueue.write(`UPDATE sync_cursor SET last_server_seq = 0 WHERE id = 'main'`);

      // إعادة تهيئة queue
      await operationQueue.reset(0);

      // إعادة المزامنة
      await this.performInitialSync();

      // إعادة Realtime
      await realtimeReceiver.subscribe(this.organizationId, (op) => {
        this.handleIncomingOperation(op);
      });

      const duration = Date.now() - startTime;
      console.log(`[DeltaSyncEngine] ✅ Full sync completed in ${duration}ms`);
    } finally {
      // ⚡ دائماً أزل القفل وحدّث الوقت
      this.isFullSyncInProgress = false;
      this.lastFullSyncTime = Date.now();
    }
  }

  /**
   * ⚡ الحصول على إحصائيات SQLite (للـ Tauri)
   */
  async getSQLiteStats(): Promise<{
    products: { total: number; unsynced: number };
    customers: { total: number; unsynced: number };
    orders: { total: number; unsynced: number };
    invoices: { total: number; unsynced: number };
  } | null> {
    if (!this.organizationId || !isTauriEnvironment()) {
      return null;
    }

    try {
      return await getSQLiteStats(this.organizationId);
    } catch (error) {
      console.error('[DeltaSyncEngine] Error getting SQLite stats:', error);
      return null;
    }
  }

  /**
   * إيقاف المحرك
   */
  async stop(): Promise<void> {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }

    if (this.gapCheckInterval) {
      clearInterval(this.gapCheckInterval);
      this.gapCheckInterval = null;
    }

    batchSender.stop();
    await realtimeReceiver.unsubscribe();

    this.isInitialized = false;
    console.log('[DeltaSyncEngine] Stopped');
  }

  /**
   * الحصول على الحالة
   */
  async getStatus(): Promise<DeltaSyncStatus> {
    const cursor = await this.getSyncCursor();
    const pendingCount = await outboxManager.getPendingCount();
    const queueStats = operationQueue.getStats();

    return {
      isInitialized: this.isInitialized,
      isOnline: navigator.onLine,
      organizationId: this.organizationId,
      deviceId: this.deviceId,
      lastServerSeq: cursor.last_server_seq,
      pendingOutboxCount: pendingCount,
      bufferSize: queueStats.bufferSize,
      lastSyncAt: cursor.last_sync_at,
      lastError: null,
      isTauri: isTauriEnvironment()
    };
  }

  /**
   * ⚡ التحقق من بيئة التشغيل
   */
  isTauriEnvironment(): boolean {
    return isTauriEnvironment();
  }
}

// Export singleton instance
export const deltaSyncEngine = new DeltaSyncEngine();

// ⚡ Dev tools - إتاحة في window للاختبار والتشخيص
if (typeof window !== 'undefined') {
  (window as any).deltaSync = {
    engine: deltaSyncEngine,
    getStatus: () => deltaSyncEngine.getStatus(),
    fullSync: () => deltaSyncEngine.fullSync(),
    getSQLiteStats: () => deltaSyncEngine.getSQLiteStats(),
    isTauri: () => deltaSyncEngine.isTauriEnvironment()
  };

  if (import.meta.env.DEV) {
    console.log('[DeltaSyncEngine] 🛠️ Dev tools available: window.deltaSync');
  }
}
