/**
 * 🔌 Supabase PowerSync Connector v2.0
 * يربط PowerSync مع Supabase Backend
 *
 * ⚡ التحسينات في v2.0:
 * - Batch Uploads: تجميع العمليات المتشابهة في طلب واحد
 * - تقليل وقت المزامنة من دقائق إلى ثوانٍ
 * - معالجة أخطاء أفضل لكل دفعة
 */

import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/web';
import { supabase } from '@/lib/supabase-unified';

// ⚡ Configuration for batch processing
const BATCH_CONFIG = {
  /** Maximum records per batch upsert */
  MAX_BATCH_SIZE: 50,
  /** Enable batch processing */
  ENABLE_BATCHING: true,
  /** Log batch details */
  DEBUG_BATCHING: false,
};

export class SupabaseConnector implements PowerSyncBackendConnector {
  private organizationId: string | null = null;

  // ⚡ Cache للـ Credentials لتقليل الطلبات المتكررة
  private credentialsCache: {
    credentials: { endpoint: string; token: string; expiresAt?: Date } | null;
    cachedAt: number;
    organizationId: string | null;
  } = {
      credentials: null,
      cachedAt: 0,
      organizationId: null
    };

  // ⚡ مدة صلاحية الـ cache (5 دقائق)
  private readonly CREDENTIALS_CACHE_TTL = 5 * 60 * 1000;

  // ⚡ منع الطلبات المتزامنة
  private fetchingCredentials: Promise<any> | null = null;

  /**
   * جلب بيانات الاعتماد (Credentials) للاتصال بـ PowerSync
   * ⚡ محسّن: يستخدم cache لتقليل الطلبات المتكررة
   */
  async fetchCredentials() {
    // ⚡ تحقق من الـ cache أولاً
    const now = Date.now();
    if (
      this.credentialsCache.credentials &&
      now - this.credentialsCache.cachedAt < this.CREDENTIALS_CACHE_TTL &&
      this.credentialsCache.credentials.expiresAt &&
      this.credentialsCache.credentials.expiresAt.getTime() > now + 60000 // تبقى صالحة لدقيقة على الأقل
    ) {
      // استخدام الـ cache
      this.organizationId = this.credentialsCache.organizationId;
      return this.credentialsCache.credentials;
    }

    // ⚡ منع الطلبات المتزامنة
    if (this.fetchingCredentials) {
      return this.fetchingCredentials;
    }

    this.fetchingCredentials = this._fetchCredentialsInternal();

    try {
      const result = await this.fetchingCredentials;
      return result;
    } finally {
      this.fetchingCredentials = null;
    }
  }

  /**
   * ⚡ الدالة الداخلية لجلب Credentials
   */
  private async _fetchCredentialsInternal() {
    console.log('[SupabaseConnector] 🔐 Fetching credentials...');
    console.log('[SupabaseConnector] 📡 PowerSync URL:', import.meta.env.VITE_POWERSYNC_URL || 'NOT SET');

    try {
      // جلب الجلسة الحالية من Supabase
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('[SupabaseConnector] Session error:', error);
        throw error;
      }

      if (!session) {
        console.warn('[SupabaseConnector] No active session');
        throw new Error('No active Supabase session');
      }

      // جلب organization_id من metadata أو من الجدول
      this.organizationId = await this.getOrganizationId(session.user.id);

      // PowerSync Endpoint - يجب تعيينه في env
      const endpoint = import.meta.env.VITE_POWERSYNC_URL || '';

      if (!endpoint) {
        console.error('[SupabaseConnector] PowerSync endpoint not configured');
        throw new Error('PowerSync endpoint (VITE_POWERSYNC_URL) not configured');
      }

      console.log('[SupabaseConnector] ✅ Credentials fetched successfully');
      console.log('[SupabaseConnector] Organization ID:', this.organizationId);

      // ⚡ DEBUG: فحص وجود البيانات في Supabase
      if (this.organizationId) {
        try {
          const { count: productsCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', this.organizationId);

          const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', this.organizationId);

          console.log('[SupabaseConnector] 📊 Supabase Data Check:', {
            organizationId: this.organizationId,
            productsInSupabase: productsCount || 0,
            customersInSupabase: customersCount || 0
          });

          if (productsCount === 0 && customersCount === 0) {
            console.warn('[SupabaseConnector] ⚠️ No data found in Supabase for this organization!');
            console.warn('[SupabaseConnector] ⚠️ If you expect data, check organization_id in your tables');
          }
        } catch (e) {
          console.warn('[SupabaseConnector] Could not check Supabase data:', e);
        }
      }

      // ⚡ DEBUG: فحص سجل المستخدم في جدول users - هذا ضروري لـ Sync Rules!
      try {
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('id, auth_user_id, organization_id, email, name')
          .eq('auth_user_id', session.user.id)
          .single();

        if (userError || !userRecord) {
          throw new Error('User record not found in users table for auth_user_id');
        }

        console.log('[SupabaseConnector] ✅ User record found:', {
          id: userRecord.id,
          auth_user_id: userRecord.auth_user_id,
          organization_id: userRecord.organization_id,
          email: userRecord.email
        });

        if (!userRecord.organization_id) {
          throw new Error('User record is missing organization_id');
        }
      } catch (e: any) {
        console.error('[SupabaseConnector] ⚠️ CRITICAL user lookup failed:', e?.message || e);
        throw e;
      }

      // ⚡ DEBUG: فحص محتوى JWT Token
      try {
        const tokenParts = session.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));

          // ⚡ فحص شامل للـ organization_id في جميع المواقع الممكنة
          const orgIdLocations = {
            root: payload.organization_id,
            user_metadata: payload.user_metadata?.organization_id,
            app_metadata: payload.app_metadata?.organization_id,
          };

          const foundOrgId = orgIdLocations.root || orgIdLocations.user_metadata || orgIdLocations.app_metadata;

          console.log('[SupabaseConnector] 🔍 JWT Token FULL payload:', payload);
          console.log('[SupabaseConnector] 🔍 organization_id locations:', orgIdLocations);
          console.log('[SupabaseConnector] 🔍 Found organization_id:', foundOrgId || '❌ NOT FOUND IN TOKEN');

          // ⚡ DEBUG: فحص sub (user_id) - هذا ما يستخدمه PowerSync في request.user_id()
          console.log('[SupabaseConnector] 🔍 JWT sub (user_id for PowerSync):', payload.sub);
          console.log('[SupabaseConnector] 🔍 IMPORTANT: PowerSync uses `request.user_id()` which maps to JWT `sub` field');
          console.log('[SupabaseConnector] 🔍 Sync Rules parameter: SELECT organization_id as org_id FROM users WHERE auth_user_id = request.user_id()');
          console.log('[SupabaseConnector] 🔍 Expected match: users.auth_user_id should equal:', payload.sub);

          if (!foundOrgId) {
            console.error('[SupabaseConnector] ⚠️ WARNING: organization_id NOT in JWT Token!');
            console.error('[SupabaseConnector] ⚠️ PowerSync Sync Rules require organization_id in token_parameters');
            console.error('[SupabaseConnector] ⚠️ Make sure Custom Access Token Hook is ENABLED in Supabase Dashboard');
          } else if (!this.organizationId) {
            this.organizationId = foundOrgId;
          }
        }
      } catch (e) {
        console.warn('[SupabaseConnector] Could not decode JWT:', e);
      }

      const credentials = {
        endpoint,
        token: session.access_token,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      };

      // ⚡ تخزين في الـ cache
      this.credentialsCache = {
        credentials,
        cachedAt: Date.now(),
        organizationId: this.organizationId
      };

      return credentials;
    } catch (error) {
      console.error('[SupabaseConnector] Failed to fetch credentials:', error);
      throw error;
    }
  }

  /**
   * رفع البيانات المحلية إلى Supabase (Upload Local Changes)
   *
   * ⚡ v2.0: Batch Processing
   * - تجميع عمليات PUT/PATCH حسب الجدول
   * - إرسال دفعات بدلاً من عمليات فردية
   * - تقليل عدد HTTP requests بشكل كبير
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const startTime = Date.now();
    console.log('[SupabaseConnector] 📤 Starting upload (v2.0 batch mode)...');

    try {
      // جلب المعاملة التالية من PowerSync CRUD Queue
      const transaction = await database.getNextCrudTransaction();

      if (!transaction) {
        console.log('[SupabaseConnector] No transactions to upload');
        return;
      }

      const totalOps = transaction.crud.length;
      console.log(`[SupabaseConnector] Processing ${totalOps} operations...`);

      // ⚡ استخدام Batch Processing إذا كان مفعلاً
      if (BATCH_CONFIG.ENABLE_BATCHING && totalOps > 1) {
        await this.processBatchOperations(transaction.crud);
      } else {
        // Fallback للمعالجة الفردية
        await this.processSequentialOperations(transaction.crud);
      }

      // إكمال المعاملة
      await transaction.complete();

      const duration = Date.now() - startTime;
      console.log(`[SupabaseConnector] ✅ Upload completed in ${duration}ms (${totalOps} ops)`);

    } catch (error) {
      console.error('[SupabaseConnector] ❌ Upload failed:', error);
      // لا نرمي الخطأ - نسمح لـ PowerSync بالاستمرار
    }
  }

  /**
   * ⚡ معالجة العمليات بشكل متسلسل (الطريقة القديمة)
   * ⚡ v2.1: ترتيب العمليات لضمان الجداول الأساسية قبل التابعة
   */
  private async processSequentialOperations(operations: CrudEntry[]): Promise<void> {
    const errors: Array<{ operation: CrudEntry; error: any }> = [];

    // ⚡ v2.1: ترتيب العمليات - الجداول التابعة في النهاية
    // ⚠️ customer_debts ليس جدولاً - هي RPC function تحسب الديون من orders
    const dependentTables = ['order_items', 'product_colors', 'product_sizes', 'loss_items', 'return_items', 'invoice_items'];

    const sortedOperations = [...operations].sort((a, b) => {
      const aIsDependent = dependentTables.includes(a.table);
      const bIsDependent = dependentTables.includes(b.table);

      if (aIsDependent && !bIsDependent) return 1;  // a بعد b
      if (!aIsDependent && bIsDependent) return -1; // a قبل b
      return 0; // نفس الترتيب
    });

    for (const operation of sortedOperations) {
      try {
        await this.processCrudOperation(operation);
      } catch (opError: any) {
        console.error(`[SupabaseConnector] ❌ Operation failed:`, {
          table: operation.table,
          op: operation.op,
          id: operation.id,
          error: opError?.message || opError
        });
        errors.push({ operation, error: opError });
      }
    }

    if (errors.length > 0) {
      console.warn(`[SupabaseConnector] ⚠️ ${errors.length}/${operations.length} operations failed`);
    }
  }

  /**
   * ⚡ معالجة العمليات بشكل مجمّع (Batch Processing)
   * تجميع العمليات حسب الجدول ونوع العملية
   *
   * ⚡ v2.1: ترتيب المزامنة لحل مشكلة Foreign Key
   * - الجداول الأساسية أولاً (orders, customers, products)
   * - ثم الجداول التابعة (order_items, product_colors, etc.)
   */
  private async processBatchOperations(operations: CrudEntry[]): Promise<void> {
    // 1. تصنيف العمليات حسب الجدول والنوع
    const batches = this.groupOperationsByTableAndType(operations);

    if (BATCH_CONFIG.DEBUG_BATCHING) {
      console.log('[SupabaseConnector] 📦 Batches created:', {
        totalOperations: operations.length,
        batchCount: Object.keys(batches).length,
        breakdown: Object.entries(batches).map(([key, ops]) => ({
          key,
          count: ops.length
        }))
      });
    }

    // ⚡ v2.1: ترتيب الجداول حسب الأولوية (الأساسية أولاً، ثم التابعة)
    // الجداول التابعة يجب أن تُزامن بعد الجداول الأساسية
    // ⚠️ customer_debts ليس جدولاً - هي RPC function تحسب الديون من orders
    const dependentTables = ['order_items', 'product_colors', 'product_sizes', 'loss_items', 'return_items', 'invoice_items'];

    // فصل الدفعات إلى أساسية وتابعة
    const primaryBatches: Array<[string, CrudEntry[]]> = [];
    const dependentBatches: Array<[string, CrudEntry[]]> = [];

    for (const [batchKey, batchOps] of Object.entries(batches)) {
      const [table] = batchKey.split(':');
      if (dependentTables.includes(table)) {
        dependentBatches.push([batchKey, batchOps]);
      } else {
        primaryBatches.push([batchKey, batchOps]);
      }
    }

    const errors: Array<{ batch: string; error: any }> = [];

    // 2. معالجة الجداول الأساسية أولاً (متوازية)
    if (primaryBatches.length > 0) {
      console.log(`[SupabaseConnector] 📦 Phase 1: Processing ${primaryBatches.length} primary batches...`);
      const primaryPromises: Promise<void>[] = [];

      for (const [batchKey, batchOps] of primaryBatches) {
        const [table, opType] = batchKey.split(':');
        const chunks = this.chunkArray(batchOps, BATCH_CONFIG.MAX_BATCH_SIZE);

        for (const chunk of chunks) {
          const promise = this.processBatch(table, opType as 'PUT' | 'PATCH' | 'DELETE', chunk)
            .catch((error) => {
              errors.push({ batch: `${batchKey}[${chunk.length}]`, error });
            });
          primaryPromises.push(promise);
        }
      }

      await Promise.all(primaryPromises);
    }

    // 3. ثم معالجة الجداول التابعة (بعد اكتمال الأساسية)
    if (dependentBatches.length > 0) {
      console.log(`[SupabaseConnector] 📦 Phase 2: Processing ${dependentBatches.length} dependent batches...`);
      const dependentPromises: Promise<void>[] = [];

      for (const [batchKey, batchOps] of dependentBatches) {
        const [table, opType] = batchKey.split(':');
        const chunks = this.chunkArray(batchOps, BATCH_CONFIG.MAX_BATCH_SIZE);

        for (const chunk of chunks) {
          const promise = this.processBatch(table, opType as 'PUT' | 'PATCH' | 'DELETE', chunk)
            .catch((error) => {
              errors.push({ batch: `${batchKey}[${chunk.length}]`, error });
            });
          dependentPromises.push(promise);
        }
      }

      await Promise.all(dependentPromises);
    }

    if (errors.length > 0) {
      console.warn(`[SupabaseConnector] ⚠️ ${errors.length} batches failed:`, errors);
    } else {
      console.log(`[SupabaseConnector] ✅ All ${Object.keys(batches).length} batches completed`);
    }
  }

  /**
   * ⚡ تجميع العمليات حسب الجدول ونوع العملية
   */
  private groupOperationsByTableAndType(operations: CrudEntry[]): Record<string, CrudEntry[]> {
    const batches: Record<string, CrudEntry[]> = {};

    for (const op of operations) {
      const opTypeStr = op.op === UpdateType.PUT ? 'PUT' :
        op.op === UpdateType.PATCH ? 'PATCH' :
          op.op === UpdateType.DELETE ? 'DELETE' : 'UNKNOWN';

      const key = `${op.table}:${opTypeStr}`;

      if (!batches[key]) {
        batches[key] = [];
      }
      batches[key].push(op);
    }

    return batches;
  }

  /**
   * ⚡ معالجة دفعة واحدة
   */
  private async processBatch(
    table: string,
    opType: 'PUT' | 'PATCH' | 'DELETE',
    operations: CrudEntry[]
  ): Promise<void> {
    const supabaseTable = this.mapTableName(table);

    if (operations.length === 0) return;

    if (BATCH_CONFIG.DEBUG_BATCHING) {
      console.log(`[SupabaseConnector] 📦 Processing batch: ${table}:${opType} (${operations.length} records)`);
    }

    switch (opType) {
      case 'PUT':
        await this.batchUpsert(supabaseTable, table, operations);
        break;

      case 'PATCH':
        // PATCH لا يمكن تجميعه بسهولة، نعالجه فردياً
        for (const op of operations) {
          await this.processCrudOperation(op);
        }
        break;

      case 'DELETE':
        await this.batchDelete(supabaseTable, operations);
        break;
    }
  }

  /**
   * ⚡ Batch Upsert - إدراج/تحديث مجمّع
   */
  private async batchUpsert(
    supabaseTable: string,
    originalTable: string,
    operations: CrudEntry[]
  ): Promise<void> {
    // تجهيز البيانات
    const records = operations.map(op => {
      const opData = (op as any).opData || (op as any).data || {};
      const cleanData = this.cleanDataForTable(originalTable, {
        id: op.id,
        ...opData,
        organization_id: opData.organization_id || this.organizationId,
      });
      return cleanData;
    });

    if (records.length === 0) return;

    // إرسال Upsert مجمّع
    const { error } = await supabase
      .from(supabaseTable)
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error(`[SupabaseConnector] ❌ Batch upsert failed on ${supabaseTable}:`, {
        error: error.message,
        code: error.code,
        recordCount: records.length
      });
      throw error;
    }

    console.log(`[SupabaseConnector] ✅ Batch upsert: ${supabaseTable} (${records.length} records)`);
  }

  /**
   * ⚡ Batch Delete - حذف مجمّع
   */
  private async batchDelete(
    supabaseTable: string,
    operations: CrudEntry[]
  ): Promise<void> {
    const ids = operations.map(op => op.id);

    if (ids.length === 0) return;

    const { error } = await supabase
      .from(supabaseTable)
      .delete()
      .in('id', ids);

    if (error) {
      console.error(`[SupabaseConnector] ❌ Batch delete failed on ${supabaseTable}:`, {
        error: error.message,
        code: error.code,
        idCount: ids.length
      });
      throw error;
    }

    console.log(`[SupabaseConnector] ✅ Batch delete: ${supabaseTable} (${ids.length} records)`);
  }

  /**
   * ⚡ تقسيم مصفوفة إلى أجزاء
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * معالجة عملية CRUD واحدة
   */
  private async processCrudOperation(operation: CrudEntry): Promise<void> {
    const { op, table, id } = operation;
    // ⚡ PowerSync يخزن البيانات في opData وليس data
    const opData = (operation as any).opData || (operation as any).data || {};

    console.log(`[SupabaseConnector] Processing ${op} on ${table} (id: ${id})`);

    try {
      switch (op) {
        case UpdateType.PUT:
          // INSERT أو UPDATE - نمرر id مع البيانات
          await this.upsertRecord(table, { id, ...opData });
          break;

        case UpdateType.PATCH:
          // UPDATE جزئي
          await this.updateRecord(table, id, opData);
          break;

        case UpdateType.DELETE:
          // DELETE
          await this.deleteRecord(table, id);
          break;

        default:
          console.warn(`[SupabaseConnector] Unknown operation: ${op}`);
      }
    } catch (error) {
      console.error(
        `[SupabaseConnector] Failed to process ${op} on ${table}:`,
        error
      );
      throw error;
    }
  }

  /**
   * إدراج أو تحديث سجل (Upsert)
   */
  private async upsertRecord(table: string, data: any): Promise<void> {
    // ⚡ حماية من البيانات الفارغة
    if (!data || typeof data !== 'object') {
      console.error(`[SupabaseConnector] No data for upsert on ${table}`);
      return;
    }

    // نسخ البيانات وإزالة الحقول الداخلية لـ PowerSync
    const { _synced, _syncError, _localId, ...cleanData } = data;

    // ⚡ رفع الصور Base64 إلى Storage قبل المزامنة
    const dataWithUploadedImages = await this.uploadBase64Images(table, cleanData);

    // ⚡ تنظيف البيانات حسب الجدول
    const recordData = this.cleanDataForTable(table, {
      ...dataWithUploadedImages,
      organization_id: dataWithUploadedImages.organization_id || this.organizationId,
    });

    // تحويل اسم الجدول إلى اسم Supabase
    const supabaseTable = this.mapTableName(table);

    // ⚡ Debug: طباعة البيانات للتصحيح
    if (table === 'orders' || table === 'order_items') {
      console.log(`[SupabaseConnector] 🔍 ${table} data BEFORE clean:`, JSON.stringify(cleanData, null, 2).slice(0, 500));
      console.log(`[SupabaseConnector] 🔍 ${table} data AFTER clean:`, JSON.stringify(recordData, null, 2).slice(0, 500));
    }

    console.log(`[SupabaseConnector] Upserting to ${supabaseTable}:`, {
      id: recordData.id,
      keys: Object.keys(recordData).slice(0, 15)
    });

    const { error } = await supabase.from(supabaseTable).upsert(recordData, {
      onConflict: 'id',
    });

    if (error) {
      console.error(`[SupabaseConnector] Upsert error on ${table}:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`[SupabaseConnector] ✅ Upserted ${table}/${data.id}`);
  }

  /**
   * تحديث سجل (Update)
   */
  private async updateRecord(table: string, id: string, data: any): Promise<void> {
    // ⚡ حماية من البيانات الفارغة
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      console.warn(`[SupabaseConnector] No data for update on ${table}/${id}`);
      return;
    }

    // ⚡ رفع الصور Base64 إلى Storage قبل المزامنة
    const dataWithUploadedImages = await this.uploadBase64Images(table, { ...data, id });

    // ⚡ تنظيف البيانات حسب الجدول
    const recordData = this.cleanDataForTable(table, dataWithUploadedImages);

    const supabaseTable = this.mapTableName(table);

    const { error } = await supabase
      .from(supabaseTable)
      .update(recordData)
      .eq('id', id);

    if (error) {
      console.error(`[SupabaseConnector] Update error on ${table}:`, error);
      throw error;
    }

    console.log(`[SupabaseConnector] ✅ Updated ${table}/${id}`);
  }

  /**
   * حذف سجل (Delete)
   */
  private async deleteRecord(table: string, id: string): Promise<void> {
    const supabaseTable = this.mapTableName(table);

    const { error } = await supabase.from(supabaseTable).delete().eq('id', id);

    if (error) {
      console.error(`[SupabaseConnector] Delete error on ${table}:`, error);
      throw error;
    }

    console.log(`[SupabaseConnector] ✅ Deleted ${table}/${id}`);
  }

  /**
   * ⚡ تنظيف البيانات حسب الجدول - إزالة الحقول غير الموجودة في Supabase
   */
  private cleanDataForTable(table: string, data: any): any {
    // الجداول التي لا تحتوي على updated_at
    const tablesWithoutUpdatedAt = ['order_items', 'pos_order_items'];

    const cleaned = { ...data };

    // إضافة updated_at فقط للجداول التي تدعمه
    if (!tablesWithoutUpdatedAt.includes(table)) {
      cleaned.updated_at = new Date().toISOString();
    }

    // ⚡ تنظيف جدول orders
    if (table === 'orders') {
      // customer_order_number في Supabase هو integer، لكن PowerSync يرسله كـ string
      // إذا لم يكن رقماً صحيحاً، نحذفه (لا نضيف local_order_number لأنه غير موجود في Supabase)
      if (cleaned.customer_order_number !== undefined) {
        const numValue = parseInt(cleaned.customer_order_number, 10);
        if (isNaN(numValue) || String(numValue) !== String(cleaned.customer_order_number)) {
          delete cleaned.customer_order_number;
        } else {
          cleaned.customer_order_number = numValue;
        }
      }

      // order_number أيضاً قد يكون string
      if (cleaned.order_number !== undefined) {
        const numValue = parseInt(cleaned.order_number, 10);
        if (isNaN(numValue) || String(numValue) !== String(cleaned.order_number)) {
          delete cleaned.order_number;
        } else {
          cleaned.order_number = numValue;
        }
      }

      // حذف الحقول غير الموجودة في Supabase
      delete cleaned.local_order_number;
    }

    // ⚡ تنظيف جدول order_items
    if (table === 'order_items') {
      // إضافة slug إذا لم يكن موجوداً (مطلوب في Supabase)
      if (!cleaned.slug && cleaned.product_id) {
        cleaned.slug = `item-${cleaned.product_id}-${Date.now()}`;
      }
      // إضافة name إذا لم يكن موجوداً
      if (!cleaned.name && cleaned.product_name) {
        cleaned.name = cleaned.product_name;
      }
    }

    // ⚡ تنظيف جدول product_categories
    if (table === 'product_categories') {
      // image_base64 هو للتخزين المحلي فقط - لا يجب مزامنته
      // سيتم رفع الصورة في cleanDataForTableAsync
      delete cleaned.image_base64;
    }

    // ⚡ تنظيف جدول products
    if (table === 'products') {
      // image_base64 و images_base64 للتخزين المحلي فقط
      // سيتم رفع الصور في cleanDataForTableAsync
      delete cleaned.image_base64;
      delete cleaned.images_base64;
    }

    return cleaned;
  }

  /**
   * ⚡ رفع صور Base64 إلى Supabase Storage وإرجاع URLs
   * يُستدعى قبل المزامنة لرفع الصور المحفوظة محلياً
   * ⚠️ لا نرفع إذا كان هناك image_url موجود بالفعل في السيرفر
   */
  private async uploadBase64Images(table: string, data: any): Promise<any> {
    const result = { ...data };

    try {
      // رفع صورة الفئة
      if (table === 'product_categories' && data.image_base64) {
        // ⚡ تحقق أولاً: هل يوجد image_url في السيرفر؟
        let hasExistingImageUrl = !!data.image_url;

        if (!hasExistingImageUrl && data.id) {
          try {
            const { data: existing } = await supabase
              .from('product_categories')
              .select('image_url')
              .eq('id', data.id)
              .single();
            hasExistingImageUrl = !!(existing?.image_url);
          } catch {
            // تجاهل - السجل قد لا يكون موجوداً بعد
          }
        }

        // ⚡ فقط نرفع إذا لم يكن هناك image_url موجود
        if (!hasExistingImageUrl) {
          console.log(`[SupabaseConnector] 🖼️ Uploading category image for ${data.id}...`);
          const uploadedUrl = await this.uploadBase64ToStorage(
            data.image_base64,
            'categories',
            data.id
          );
          if (uploadedUrl) {
            result.image_url = uploadedUrl;
            console.log(`[SupabaseConnector] ✅ Category image uploaded: ${uploadedUrl.slice(0, 50)}...`);
          }
        } else {
          // ⚡ إزالة image_base64 من البيانات لعدم الحاجة لها
          delete result.image_base64;
        }
      }

      // رفع صورة المنتج الرئيسية
      if (table === 'products' && data.image_base64 && !data.image_url) {
        console.log(`[SupabaseConnector] 🖼️ Uploading product image for ${data.id}...`);
        const uploadedUrl = await this.uploadBase64ToStorage(
          data.image_base64,
          'products',
          data.id
        );
        if (uploadedUrl) {
          result.image_url = uploadedUrl;
          console.log(`[SupabaseConnector] ✅ Product image uploaded: ${uploadedUrl.slice(0, 50)}...`);
        }
      }

      // رفع صور المنتج الإضافية
      if (table === 'products' && data.images_base64) {
        console.log(`[SupabaseConnector] 🖼️ Uploading additional product images for ${data.id}...`);
        try {
          const base64Images = typeof data.images_base64 === 'string'
            ? JSON.parse(data.images_base64)
            : data.images_base64;

          if (Array.isArray(base64Images) && base64Images.length > 0) {
            const uploadedUrls: string[] = [];
            const existingUrls = data.images ?
              (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : [];

            for (let i = 0; i < base64Images.length; i++) {
              const base64 = base64Images[i];
              if (base64 && base64.startsWith('data:')) {
                const url = await this.uploadBase64ToStorage(
                  base64,
                  'products',
                  `${data.id}-${i}`
                );
                if (url) uploadedUrls.push(url);
              }
            }

            if (uploadedUrls.length > 0) {
              result.images = JSON.stringify([...existingUrls, ...uploadedUrls]);
              console.log(`[SupabaseConnector] ✅ ${uploadedUrls.length} additional images uploaded`);
            }
          }
        } catch (e) {
          console.warn('[SupabaseConnector] Failed to parse images_base64:', e);
        }
      }
    } catch (error) {
      console.error('[SupabaseConnector] Error uploading base64 images:', error);
    }

    return result;
  }

  /**
   * ⚡ رفع صورة Base64 واحدة إلى Supabase Storage
   */
  private async uploadBase64ToStorage(
    base64Data: string,
    folder: string,
    fileId: string
  ): Promise<string | null> {
    try {
      // استخراج نوع الملف والبيانات
      const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        console.warn('[SupabaseConnector] Invalid base64 format');
        return null;
      }

      const [, extension, data] = matches;
      const fileName = `${fileId}-${Date.now()}.${extension === 'jpeg' ? 'jpg' : extension}`;
      const filePath = `${folder}/${fileName}`;

      // تحويل Base64 إلى Blob
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${extension}` });

      // رفع إلى Storage - استخدام bucket الصحيح
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, blob, {
          contentType: `image/${extension}`,
          upsert: true
        });

      if (uploadError) {
        console.error('[SupabaseConnector] Storage upload error:', uploadError);
        return null;
      }

      // جلب الرابط العام
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (error) {
      console.error('[SupabaseConnector] Error in uploadBase64ToStorage:', error);
      return null;
    }
  }

  /**
   * تحويل اسم الجدول من PowerSync إلى Supabase
   * (في حالتنا: الأسماء متطابقة بالفعل)
   */
  private mapTableName(table: string): string {
    // PowerSync Schema و Supabase متطابقان
    // لكن يمكن إضافة تحويلات خاصة إذا لزم الأمر
    const mapping: Record<string, string> = {
      // مثال: 'local_table_name': 'supabase_table_name'
    };

    return mapping[table] || table;
  }

  /**
   * جلب organization_id للمستخدم الحالي
   * ⚡ v3.1: يدعم الوضع أوفلاين - يستخدم الـ cache المحلي أولاً
   */
  private async getOrganizationId(userId: string): Promise<string> {
    // ⚡ 1. تحقق من الـ cache أولاً (للعمل أوفلاين)
    const cachedOrgId = this.getOrganizationIdFromCache();
    if (cachedOrgId) {
      console.log(`[SupabaseConnector] ✅ Organization ID (from cache): ${cachedOrgId}`);
      return cachedOrgId;
    }

    // ⚡ 2. تحقق من أننا أونلاين قبل محاولة الاتصال بـ Supabase
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      console.warn('[SupabaseConnector] ⚠️ Offline - cannot fetch organization_id from server');
      throw new Error('Offline - organization_id not available in cache');
    }

    try {
      // ⚡ 3. جلب من جدول users باستخدام auth_user_id لأن userId هو معرف Supabase Auth
      const { data, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', userId)
        .single();

      if (error || !data?.organization_id) {
        // محاولة احتياطية باستخدام id
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (fallbackError || !fallbackData?.organization_id) {
          throw new Error('User record missing organization_id (auth_user_id/id lookup)');
        }

        console.log(`[SupabaseConnector] Organization ID (fallback): ${fallbackData.organization_id}`);
        // ⚡ حفظ في الـ cache للاستخدام أوفلاين
        this.saveOrganizationIdToCache(fallbackData.organization_id);
        return fallbackData.organization_id;
      }

      console.log(`[SupabaseConnector] Organization ID: ${data.organization_id}`);
      // ⚡ حفظ في الـ cache للاستخدام أوفلاين
      this.saveOrganizationIdToCache(data.organization_id);
      return data.organization_id;
    } catch (error) {
      console.error('[SupabaseConnector] Error getting organization_id:', error);

      // ⚡ 4. محاولة أخيرة من الـ cache في حالة فشل الاتصال
      const lastResortOrgId = this.getOrganizationIdFromCache();
      if (lastResortOrgId) {
        console.log(`[SupabaseConnector] ✅ Organization ID (last resort cache): ${lastResortOrgId}`);
        return lastResortOrgId;
      }

      throw error;
    }
  }

  /**
   * ⚡ جلب organization_id من الـ cache المحلي
   */
  private getOrganizationIdFromCache(): string | null {
    try {
      // ⚡ محاولة 1: من localStorage
      const cached = localStorage.getItem('currentOrganizationId')
        || localStorage.getItem('bazaar_organization_id')
        || localStorage.getItem('organizationId');

      if (cached && cached !== 'undefined' && cached !== 'null') {
        return cached;
      }

      // ⚡ محاولة 2: من بيانات المستخدم المحفوظة
      const userDataStr = localStorage.getItem('bazaar_user_data')
        || localStorage.getItem('userData')
        || localStorage.getItem('auth_user');

      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          if (userData?.organization_id) {
            return userData.organization_id;
          }
          if (userData?.user?.organization_id) {
            return userData.user.organization_id;
          }
        } catch {
          // تجاهل خطأ التحليل
        }
      }

      // ⚡ محاولة 3: من credentialsCache
      if (this.credentialsCache.organizationId) {
        return this.credentialsCache.organizationId;
      }

      return null;
    } catch (error) {
      console.warn('[SupabaseConnector] Error reading organization_id from cache:', error);
      return null;
    }
  }

  /**
   * ⚡ حفظ organization_id في الـ cache المحلي
   */
  private saveOrganizationIdToCache(organizationId: string): void {
    try {
      localStorage.setItem('currentOrganizationId', organizationId);
      localStorage.setItem('bazaar_organization_id', organizationId);
    } catch (error) {
      console.warn('[SupabaseConnector] Error saving organization_id to cache:', error);
    }
  }

  /**
   * معالجة أخطاء الاتصال
   */
  private handleConnectionError(error: any): void {
    if (error?.message?.includes('JWT')) {
      console.error('[SupabaseConnector] JWT token expired or invalid');
      // يمكن إضافة منطق لتحديث التوكن
    } else if (error?.message?.includes('network')) {
      console.error('[SupabaseConnector] Network error - offline mode');
      // PowerSync سيعيد المحاولة تلقائياً
    } else {
      console.error('[SupabaseConnector] Unknown error:', error);
    }
  }
}

// ⚡ تعريف global key للـ Singleton (حماية من Hot Reload)
const CONNECTOR_GLOBAL_KEY = '__SUPABASE_CONNECTOR_INSTANCE__';

// ⚡ تعريف النوع للـ window
declare global {
  interface Window {
    [CONNECTOR_GLOBAL_KEY]?: SupabaseConnector;
  }
}

// تصدير Singleton
let connectorInstance: SupabaseConnector | null = null;

export function getSupabaseConnector(): SupabaseConnector {
  // ⚡ أولاً: تحقق من وجود instance في window (للحماية من Hot Reload)
  if (typeof window !== 'undefined' && window[CONNECTOR_GLOBAL_KEY]) {
    connectorInstance = window[CONNECTOR_GLOBAL_KEY];
    return connectorInstance;
  }

  // ⚡ ثانياً: أنشئ instance جديدة إذا لم تكن موجودة
  if (!connectorInstance) {
    connectorInstance = new SupabaseConnector();

    // ⚡ حفظ في window للحماية من Hot Reload
    if (typeof window !== 'undefined') {
      window[CONNECTOR_GLOBAL_KEY] = connectorInstance;
    }
  }

  return connectorInstance;
}

export default getSupabaseConnector();
