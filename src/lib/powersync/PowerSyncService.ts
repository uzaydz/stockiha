/**
 * ⚡ PowerSync Service - v5.0 (optimized + config-based)
 * ======================================================
 *
 * التحسينات في v5.0:
 * - استخدام ملف config.ts مركزي لجميع الإعدادات
 * - تقليل السجلات في الإنتاج مع DEBUG_MODE
 * - تحسين TTL للـ cache لتقليل الاستعلامات
 * - تبسيط منطق status listener
 * - إزالة التعقيد الزائد في إدارة الاتصال
 *
 * التحسينات السابقة (v4.0):
 * - دُفعات أسرع عبر INSERT/UPSERT متعدد القيم لكل chunk.
 * - UPSERT آمن: fallback إلى DO NOTHING عند غياب أعمدة قابلة للتحديث.
 * - خيارات أفضل لسلوك الأخطاء في queryOne/query (throw اختياري).
 * - حارس SSR + التحقق من أسماء الجداول/الأعمدة لتقليل مخاطر الحقن.
 */

import { PowerSyncDatabase, type QueryResult } from '@powersync/web';
import PowerSyncSchema from './PowerSyncSchema';
import { getSupabaseConnector } from './SupabaseConnector';
import {
  POWERSYNC_CONFIG,
  GLOBAL_KEYS,
  STORAGE_KEYS,
  debugLog,
  syncErrorLog,
  syncWarnLog,
  needsPowerSync,
  isElectronEnvironment,
} from './config';

const POWERSYNC_GLOBAL_KEY = GLOBAL_KEYS.POWERSYNC_SERVICE;

type Value = unknown;

export interface QueryOptions<T = unknown> {
  /** SQL query string */
  sql: string;
  /** Query parameters */
  params?: readonly Value[];
  /** Throw instead of swallowing errors */
  throwOnError?: boolean;
}

export interface QueryOneOptions<T = unknown> extends QueryOptions<T> {
  /** Throw if result set is empty */
  throwIfEmpty?: boolean;
  /** Default value when null/empty */
  defaultValue?: T | null;
}

export interface MutateOptions<T extends Record<string, Value> = Record<string, Value>> {
  /** Table name */
  table: string;
  /** Operation type */
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  /** Data for INSERT/UPDATE/UPSERT */
  data?: T;
  /** WHERE conditions for UPDATE/DELETE */
  where?: { column: string; value: Value }[];
  /** Conflict resolution for UPSERT */
  onConflict?: string[];
}

export interface MutateBatchOptions<T extends Record<string, Value> = Record<string, Value>> {
  /** Table name */
  table: string;
  /** Operation type */
  operation: 'INSERT' | 'UPSERT' | 'DELETE';
  /** Array of records to process */
  data: T[];
  /** Conflict columns for UPSERT */
  onConflict?: string[];
  /** Chunk size for large batches (default: 100) */
  chunkSize?: number;
}

export interface BatchResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  errorCount: number;
  durationMs: number;
  errors?: Array<{ index: number; error: string }>;
}

export interface WatchOptions<T = unknown> {
  /** Callback when data changes */
  onResult: (data: T[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Throttle updates (ms) */
  throttleMs?: number;
}

export interface SyncStatus {
  connected: boolean;
  hasSynced: boolean;
  lastSyncedAt: Date | null;
  uploading: boolean;
  downloading: boolean;
  pendingChanges: number;
}

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const isValidIdentifier = (value: string) => /^[A-Za-z_][A-Za-z0-9_.]*$/.test(value);

const assertIdentifier = (value: string, kind: 'table' | 'column') => {
  if (!isValidIdentifier(value)) {
    throw new Error(`Invalid ${kind} name "${value}"`);
  }
};

const sanitizeColumns = (columns: string[]): string[] => {
  columns.forEach((col) => assertIdentifier(col, 'column'));
  return columns;
};

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export class PowerSyncService {
  private static instance: PowerSyncService;

  // ⚡ Database instance - public للوصول المباشر
  public db: PowerSyncDatabase | null = null;

  // ⚡ Connector for Supabase
  private connector = getSupabaseConnector();

  // ⚡ State flags
  public isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private isSafariEnv = false;
  private initAttempts = 0;
  private readonly MAX_INIT_ATTEMPTS = 3;
  private hasFatalError = false;

  // ⚡ Active watchers for cleanup
  private activeWatchers: Map<string, () => void> = new Map();

  // ⚡ Cleanup handler reference
  private beforeUnloadHandler: (() => void) | null = null;

  // ⚡ v4.4: Status listener cleanup reference
  private statusListenerUnsubscribe: (() => void) | null = null;

  // ⚠️ Deprecation warning guard
  private hasWarnedDeprecatedWriteTx = false;
  // ⚡ Cache لعدد العمليات المعلقة (مع timestamp لمنع الاستعلامات المتكررة)
  private pendingChangesCache = 0;
  private pendingChangesCacheTime = 0;
  private readonly PENDING_CACHE_TTL = POWERSYNC_CONFIG.PENDING_CACHE_TTL;

  /**
   * 🔍 Helper logger (concise prefix) - يستخدم DEBUG_MODE من config
   */
  private log(scope: string, message: string, extra?: any) {
    debugLog(scope, message, extra);
  }

  private constructor() {
    if (POWERSYNC_CONFIG.DEBUG_MODE) {
      console.log('[PowerSyncService] ✨ Creating new instance (v5.0)');
    }

    // ⚡ Hot Reload handling
    if (typeof window !== 'undefined' && (import.meta as any)?.hot) {
      (import.meta as any).hot.accept(() => {
        debugLog('HotReload', '⚡ Hot Reload accepted');
      });
    }

    // ⚡ Setup beforeunload handler to release locks
    this.setupBeforeUnloadHandler();
  }

  /**
   * 🔄 Get singleton instance
   */
  static getInstance(): PowerSyncService {
    // Check window first (HMR protection)
    if (typeof window !== 'undefined' && (window as any)[POWERSYNC_GLOBAL_KEY]) {
      PowerSyncService.instance = (window as any)[POWERSYNC_GLOBAL_KEY] as PowerSyncService;
      return PowerSyncService.instance;
    }

    if (!PowerSyncService.instance) {
      PowerSyncService.instance = new PowerSyncService();

      if (typeof window !== 'undefined') {
        (window as any)[POWERSYNC_GLOBAL_KEY] = PowerSyncService.instance;
      }
    }

    return PowerSyncService.instance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 Initialization
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🚀 Initialize PowerSync Database
   * ⚡ محسّن: يمنع التهيئة المتكررة بشكل فعال
   * ⚡ v5.2: يدعم الويب (wa-sqlite WASM) و Electron (better-sqlite3)
   */
  async initialize(): Promise<void> {
    // ⚡ تحقق سريع أولاً - إذا كان مُهيأ بالفعل، أرجع فوراً
    if (this.isInitialized && this.db) {
      return;
    }

    this.log('init', 'initialize() called', { isInitialized: this.isInitialized, hasDb: !!this.db });

    // ⚡ إذا كان هناك خطأ فادح، لا تحاول مرة أخرى
    if (this.hasFatalError) {
      console.warn('[PowerSyncService] ⚠️ Skipping init due to previous fatal error');
      return;
    }

    // ⚡ إذا وصلنا للحد الأقصى من المحاولات
    if (this.initAttempts >= this.MAX_INIT_ATTEMPTS) {
      console.warn('[PowerSyncService] ⚠️ Max init attempts reached, skipping');
      this.hasFatalError = true;
      return;
    }

    // ⚡ إذا كانت هناك تهيئة جارية، انتظرها بدلاً من بدء واحدة جديدة
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initAttempts++;
    this.initPromise = this._doInitialize();

    try {
      await this.initPromise;
      // ⚡ نجاح! إعادة تعيين العداد
      this.initAttempts = 0;
      // ⚡ لا نعيد تعيين initPromise بعد النجاح - نحتفظ به للاستدعاءات المستقبلية
    } catch (error: any) {
      // ⚡ فشل - إعادة تعيين initPromise للسماح بمحاولة جديدة
      this.initPromise = null;
      // ⚡ تحقق من خطأ WASM
      if (error?.message?.includes('Out of bounds') ||
        error?.message?.includes('Aborted') ||
        error?.message?.includes('RuntimeError')) {
        console.error('[PowerSyncService] ❌ Fatal WASM error - marking as unrecoverable');
        this.hasFatalError = true;
      }
      throw error;
    }
  }

  private async _doInitialize(): Promise<void> {
    if (!isBrowser()) {
      console.warn('[PowerSyncService] Skipping initialize: non-browser environment');
      this.isInitialized = false;
      this.db = null;
      return;
    }

    // ⚡ تحقق من وجود خطأ فادح سابق
    if (this.hasFatalError) {
      console.warn('[PowerSyncService] ⚠️ Skipping init - previous fatal error');
      return;
    }

    console.log('[PowerSyncService] 🚀 Initializing PowerSync v4.0...', { attempt: this.initAttempts });

    try {
      // 1. Environment Detection
      const userAgent = navigator.userAgent || '';

      // ⚡ كشف Electron (استخدم الدالة المركزية لتجنب false-positives من إضافات المتصفح)
      const isElectron = isElectronEnvironment();

      // ⚡ كشف Safari (WebKit بدون Chrome)
      const isSafari = !isElectron && (
        /^((?!chrome|android).)*safari/i.test(userAgent) ||
        (userAgent.includes('AppleWebKit') && !userAgent.includes('Chrome'))
      );

      this.isSafariEnv = isSafari;

      console.log('[PowerSyncService] 🌍 Environment:', {
        isElectron,
        isSafari,
        userAgent: userAgent.substring(0, 100)
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // 🚀 ELECTRON: الإعدادات المثالية - Chromium V8 يدعم كل شيء!
      // ═══════════════════════════════════════════════════════════════════════════
      if (isElectron) {
        // ⚠️ في وضع التطوير (Vite dev server)، Workers لا تعمل بسبب ES module format
        // في الإنتاج (built app)، يمكن تفعيل Workers
        const isDev = import.meta.env.DEV;
        const useWorkers = !isDev; // تعطيل workers في التطوير فقط

        console.log('[PowerSyncService] ⚡ ELECTRON DETECTED - Using optimal Chromium configuration');
        console.log(`[PowerSyncService] ${useWorkers ? '✅' : '⚠️'} WebWorkers: ${useWorkers ? 'ENABLED' : 'DISABLED (dev mode)'}`);
        console.log('[PowerSyncService] ✅ MultiTabs: ENABLED');
        console.log('[PowerSyncService] ✅ IDBBatchAtomicVFS: ENABLED (best performance)');

        // Electron يستخدم Chromium V8 - لا مشاكل WASM أو Workers!
        this.db = new PowerSyncDatabase({
          schema: PowerSyncSchema,
          database: {
            dbFilename: 'stockiha_powersync_electron.db',
          },
          flags: {
            enableMultiTabs: useWorkers && typeof SharedWorker !== 'undefined',
            disableSSRWarning: true,
            useWebWorker: useWorkers, // ✅ Workers في الإنتاج، معطلة في التطوير
          },
        });

        console.log('[PowerSyncService] 🎉 Electron PowerSync initialized successfully');
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // ⚠️ SAFARI: إعدادات محدودة بسبب WebKit
      // ═══════════════════════════════════════════════════════════════════════════
      else if (isSafari) {
        console.log('[PowerSyncService] ⚠️ Safari: Using limited configuration');
        console.log('[PowerSyncService] ❌ WebWorkers: DISABLED (WebKit JIT issues)');
        console.log('[PowerSyncService] ❌ MultiTabs: DISABLED');

        // Safari يتطلب تعطيل workers بسبب مشاكل WebKit JIT
        this.db = new PowerSyncDatabase({
          schema: PowerSyncSchema,
          database: {
            dbFilename: 'stockiha_powersync_webkit.db',
          },
          flags: {
            enableMultiTabs: false,
            disableSSRWarning: true,
            useWebWorker: false, // ❌ تعطيل workers لتجنب JIT crash
          },
        });
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // 🌐 WEB (Chrome/Firefox): الإعدادات الكاملة
      // ═══════════════════════════════════════════════════════════════════════════
      else {
        // ملاحظة مهمة: في Vite dev server قد يتم تحميل worker كـ module،
        // وهذا يكسر بعض عمال PowerSync الذين يعتمدون على importScripts().
        // لذلك نعطل WebWorkers في التطوير لتجنب crash متكرر + retry loops.
        const isDev = import.meta.env.DEV;
        const useWorkers = !isDev;

        console.log('[PowerSyncService] 🌐 Web Browser: Using full configuration');
        console.log(`[PowerSyncService] ${useWorkers ? '✅' : '⚠️'} WebWorkers: ${useWorkers ? 'ENABLED' : 'DISABLED (dev mode)'}`);
        console.log(`[PowerSyncService] ${useWorkers ? '✅' : '⚠️'} MultiTabs: ${useWorkers ? 'ENABLED' : 'DISABLED (depends on workers)'}`);

        const createWebDb = (workersEnabled: boolean) =>
          new PowerSyncDatabase({
            database: {
              dbFilename: 'stockiha_powersync_v4.db',
            },
            schema: PowerSyncSchema,
            flags: {
              enableMultiTabs: workersEnabled && typeof SharedWorker !== 'undefined',
              disableSSRWarning: true,
              useWebWorker: workersEnabled,
            },
          });

        try {
          this.db = createWebDb(useWorkers);
        } catch (e: any) {
          const msg = String(e?.message || e);
          // Fallback: إذا فشل إنشاء DB بالـ worker (مثل importScripts/module issue) نرجع للوضع بدون worker.
          if (useWorkers && msg.includes('importScripts')) {
            console.warn('[PowerSyncService] ⚠️ WebWorker init failed, falling back to no-worker mode:', msg);
            this.db = createWebDb(false);
          } else {
            throw e;
          }
        }
      }

      // Wait for database to be ready with timeout
      const readyTimeout = 30000; // 30 seconds
      await Promise.race([
        this.db.waitForReady(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database ready timeout')), readyTimeout)
        )
      ]);

      console.log('[PowerSyncService] ✅ Database ready');

      // 4. Apply PRAGMA Optimizations (safe ones only)
      await this.applyPragmaOptimizations();

      // ⚡ v4.1: قراءة organization_id من قاعدة البيانات المحلية وحفظه في localStorage
      await this.cacheOrganizationIdFromLocalDb();

      // 5. Connect to Backend (قد يفشل أوفلاين - وهذا مقبول)
      await this.connectToBackend();

      this.isInitialized = true;
      console.log('[PowerSyncService] ✅ PowerSync v4.0 initialized successfully');

    } catch (error: any) {
      console.error('[PowerSyncService] ❌ Initialization failed:', error);

      // ⚡ تحقق من خطأ WASM
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Out of bounds') ||
        errorMsg.includes('Aborted') ||
        errorMsg.includes('RuntimeError') ||
        errorMsg.includes('call_indirect')) {
        console.error('[PowerSyncService] ❌ Fatal WASM error detected');
        this.hasFatalError = true;

        // ⚡ محاولة إعادة تعيين قاعدة البيانات للتنظيف
        if (this.initAttempts < this.MAX_INIT_ATTEMPTS) {
          console.log('[PowerSyncService] 🔄 Attempting database reset...');
          await this.resetDatabase();
        }
      }

      this.isInitialized = false;
      this.db = null;
      throw error;
    }
  }

  /**
   * 🔒 Setup beforeunload handler to properly release database locks
   * This prevents database lock issues after page refresh
   */
  private setupBeforeUnloadHandler(): void {
    if (typeof window === 'undefined') return;

    this.beforeUnloadHandler = () => {
      // Synchronously cleanup what we can
      this.cleanupWatchers();
    };

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * ⚡ v4.3: قراءة organization_id من قاعدة البيانات المحلية وحفظه في localStorage
   * محسّن: استخدام localStorage cache أولاً، ثم استعلامات بسيطة (يوفر ~90% من الوقت)
   */
  private async cacheOrganizationIdFromLocalDb(): Promise<void> {
    if (!this.db) return;

    const startTime = performance.now();

    try {
      // ⚡ 1. تحقق من localStorage أولاً (0ms تقريباً)
      const cachedOrgId = localStorage.getItem(STORAGE_KEYS.ORG_ID);
      if (cachedOrgId && cachedOrgId !== 'undefined' && cachedOrgId !== 'null') {
        debugLog('init', `✅ Using cached org ID from localStorage: ${cachedOrgId} (0ms)`);
        return; // ✅ خروج فوري!
      }

      // ⚡ 2. إذا لم يكن موجوداً، ابحث في جدول users أولاً (الأسرع)
      const usersResult = await this.db.getAll<{ organization_id: string }>(
        `SELECT organization_id FROM users WHERE organization_id IS NOT NULL LIMIT 1`
      );

      if (usersResult && usersResult.length > 0 && usersResult[0].organization_id) {
        const orgId = usersResult[0].organization_id;
        localStorage.setItem(STORAGE_KEYS.ORG_ID, orgId);
        localStorage.setItem(STORAGE_KEYS.ORG_ID_ALT, orgId);
        const elapsed = Math.round(performance.now() - startTime);
        debugLog('init', `✅ Cached organization_id from users: ${orgId} (${elapsed}ms)`);
        return;
      }

      // ⚡ 3. Fallback لجدول organizations
      const orgsResult = await this.db.getAll<{ id: string }>(
        `SELECT id FROM organizations LIMIT 1`
      );

      if (orgsResult && orgsResult.length > 0 && orgsResult[0].id) {
        const orgId = orgsResult[0].id;
        localStorage.setItem(STORAGE_KEYS.ORG_ID, orgId);
        localStorage.setItem(STORAGE_KEYS.ORG_ID_ALT, orgId);
        const elapsed = Math.round(performance.now() - startTime);
        debugLog('init', `✅ Cached organization_id from organizations: ${orgId} (${elapsed}ms)`);
        return;
      }

      const elapsed = Math.round(performance.now() - startTime);
      debugLog('init', `ℹ️ No organization_id found in local database (${elapsed}ms, first sync needed)`);
    } catch (error) {
      const elapsed = Math.round(performance.now() - startTime);
      syncWarnLog('init', `⚠️ Failed to cache org ID after ${elapsed}ms:`, error);
    }
  }

  /**
   * ⚡ Fallback لقراءة organization_id في حالة فشل UNION
   */
  private async cacheOrganizationIdFallback(): Promise<void> {
    if (!this.db) return;

    try {
      // جلب من جميع الجداول بالتوازي
      const [usersResult, orgsResult, productsResult] = await Promise.all([
        this.db.getAll<{ organization_id: string }>(
          `SELECT organization_id FROM users WHERE organization_id IS NOT NULL LIMIT 1`
        ).catch(() => []),
        this.db.getAll<{ id: string }>(
          `SELECT id FROM organizations LIMIT 1`
        ).catch(() => []),
        this.db.getAll<{ organization_id: string }>(
          `SELECT organization_id FROM products WHERE organization_id IS NOT NULL LIMIT 1`
        ).catch(() => [])
      ]);

      const orgId = usersResult?.[0]?.organization_id
        || orgsResult?.[0]?.id
        || productsResult?.[0]?.organization_id;

      if (orgId) {
        localStorage.setItem(STORAGE_KEYS.ORG_ID, orgId);
        localStorage.setItem(STORAGE_KEYS.ORG_ID_ALT, orgId);
        debugLog('init', `✅ Cached organization_id (fallback): ${orgId}`);
      }
    } catch (error) {
      syncWarnLog('init', '⚠️ Fallback organization_id query failed:', error);
    }
  }

  /**
   * 🔧 Apply PRAGMA optimizations (safe ones only for Web/IndexedDB)
   * ⚡ v4.2: تحسينات شاملة للأداء
   */
  private async applyPragmaOptimizations(): Promise<void> {
    if (!this.db) return;

    console.log('[PowerSyncService] 🔧 Applying PRAGMA optimizations...');

    // ⚡ تنفيذ جميع PRAGMA في دفعة واحدة لتقليل round-trips
    const pragmas = [
      // 🚀 WAL mode - أسرع للقراءة والكتابة المتزامنة
      { sql: 'PRAGMA journal_mode = WAL', name: 'WAL mode', critical: true },
      // 🚀 Synchronous NORMAL - توازن بين الأداء والأمان
      { sql: 'PRAGMA synchronous = NORMAL', name: 'Synchronous NORMAL', critical: true },
      // 🚀 Cache أكبر (32MB) - يحسن الاستعلامات المتكررة
      { sql: 'PRAGMA cache_size = -32000', name: 'Cache size (32MB)', critical: false },
      // 🚀 Temp store في الذاكرة
      { sql: 'PRAGMA temp_store = MEMORY', name: 'Temp store', critical: false },
      // 🚀 تفعيل memory-mapped I/O (256MB) - يحسن قراءة الملفات الكبيرة
      { sql: 'PRAGMA mmap_size = 268435456', name: 'Memory-mapped I/O (256MB)', critical: false },
      // 🚀 Page size أكبر للقراءة الفعالة
      { sql: 'PRAGMA page_size = 4096', name: 'Page size (4KB)', critical: false },
    ];

    let appliedCount = 0;
    const startTime = performance.now();

    for (const pragma of pragmas) {
      try {
        await this.db.execute(pragma.sql);
        appliedCount++;
        // فقط تسجيل الـ critical pragmas
        if (pragma.critical) {
          console.log(`[PowerSyncService] ✅ ${pragma.name} applied`);
        }
      } catch (error) {
        // فقط تحذير للـ critical pragmas
        if (pragma.critical) {
          console.warn(`[PowerSyncService] ⚠️ ${pragma.name} not supported`);
        }
      }
    }

    // 🚀 ANALYZE و OPTIMIZE لتحسين query planning
    try {
      await this.db.execute('PRAGMA optimize');
      console.log('[PowerSyncService] ✅ Query optimizer updated');
    } catch {
      // ANALYZE قد لا يكون متاحاً
    }

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[PowerSyncService] ✅ PRAGMA optimizations applied (${appliedCount}/${pragmas.length}) in ${elapsed}ms`);
  }

  /**
   * 🔍 Check if service has fatal error
   */
  hasFatalWasmError(): boolean {
    return this.hasFatalError;
  }

  /**
   * ⚡ تشخيص مفصل للمزامنة - يُشغّل بعد الاتصال للتحقق من البيانات
   */
  private async runSyncDiagnostics(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('[PowerSyncService] 🔍 Running sync diagnostics...');

      // 1. التحقق من حالة المزامنة
      const status = (this.db as any).currentStatus || {};
      console.log('[PowerSyncService] 📊 Sync status:', {
        connected: status.connected ?? 'unknown',
        hasSynced: status.hasSynced ?? 'unknown',
        lastSyncedAt: status.lastSyncedAt || 'never',
        dataFlowStatus: status.dataFlowStatus || 'unknown'
      });

      if (!status.connected) {
        console.log('[PowerSyncService] ℹ️ Diagnostics skipped - not connected');
        return;
      }

      // 2. انتظار قليلاً للمزامنة الأولى قبل الفحص المكلف
      if (!status.hasSynced) {
        console.log('[PowerSyncService] ⏳ Waiting for initial sync (max 10s)...');
        await new Promise<void>((resolve) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.log('[PowerSyncService] ⏱️ Initial sync timeout - continuing...');
              resolve();
            }
          }, 10000);

          // استمع للتغييرات في الحالة
          const checkSync = setInterval(async () => {
            const newStatus = (this.db as any).currentStatus || {};
            if (newStatus.hasSynced && !resolved) {
              resolved = true;
              clearTimeout(timeout);
              clearInterval(checkSync);
              console.log('[PowerSyncService] ✅ Initial sync completed!');
              resolve();
            }
          }, 500);
        });
      }

      // 3. عدد البيانات في الجداول الرئيسية (بعد الانتظار)
      const tables = ['products', 'customers', 'orders', 'users', 'organizations'];
      const counts: Record<string, number> = {};

      for (const table of tables) {
        try {
          const result = await this.db.getAll<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${table}`
          );
          counts[table] = result[0]?.count || 0;
        } catch (e) {
          counts[table] = -1; // خطأ
        }
      }

      console.log('[PowerSyncService] 📊 Local data counts:', counts);

      // 4. التحقق من أن الـ sync rules تعمل
      if (counts.products === 0 && counts.customers === 0 && counts.users === 0) {
        console.warn('[PowerSyncService] ⚠️ CRITICAL: No data synced from server!');
        console.warn('[PowerSyncService] ⚠️ Possible causes:');
        console.warn('[PowerSyncService]   1. Sync Rules not deployed on PowerSync Dashboard');
        console.warn('[PowerSyncService]   2. Parameter query not matching (organization_id)');
        console.warn('[PowerSyncService]   3. JWT token missing required claims');
        console.warn('[PowerSyncService]   4. First sync may take a moment - wait and retry');
      } else {
        console.log('[PowerSyncService] ✅ Data is being synced successfully!');
      }

    } catch (error) {
      console.warn('[PowerSyncService] ⚠️ Diagnostics failed:', error);
    }
  }

  private shouldRunDiagnostics(): boolean {
    if ((import.meta as any).env?.DEV) return true;
    try {
      return localStorage.getItem('powersync_diagnostics') === '1';
    } catch {
      return false;
    }
  }

  private scheduleDiagnostics(): void {
    if (!this.shouldRunDiagnostics()) return;
    const run = () => {
      this.runSyncDiagnostics().catch(err => {
        console.warn('[PowerSyncService] ⚠️ Background diagnostics failed:', err);
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(run, { timeout: 15000 });
    } else {
      setTimeout(run, 15000);
    }
  }

  /**
   * ⚡ DEBUG: فحص البيانات بعد المزامنة
   */
  private async debugCheckDataAfterSync(): Promise<void> {
    if (!this.db) return;

    try {
      const tables = ['products', 'customers', 'orders', 'users'];
      const counts: Record<string, number> = {};

      for (const table of tables) {
        try {
          const result = await this.db.getAll<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${table}`
          );
          counts[table] = result[0]?.count || 0;
        } catch (e) {
          counts[table] = -1;
        }
      }

      console.log('[PowerSync] 📊 Data after sync:', counts);

      // ⚡ إذا لا تزال فارغة، هناك مشكلة
      if (counts.products === 0 && counts.users === 0) {
        console.warn('[PowerSync] ⚠️ Still no data after hasSynced=true!');
        console.warn('[PowerSync] 🔍 Checking sync buckets...');

        // فحص الـ buckets
        try {
          const buckets = await this.db.getAll<any>(
            `SELECT * FROM ps_oplog LIMIT 10`
          );
          console.log('[PowerSync] 📦 OpLog entries:', buckets.length);
        } catch (e) {
          console.log('[PowerSync] ℹ️ OpLog check skipped:', (e as any)?.message);
        }
      }
    } catch (error) {
      console.warn('[PowerSync] ⚠️ Debug check failed:', error);
    }
  }



  /**
   * 🔌 Connect to PowerSync Backend
   * ⚡ v4.1: يدعم الوضع أوفلاين - إذا فشل الاتصال، يستمر بدون مزامنة
   */
  private async connectToBackend(): Promise<void> {
    if (!this.db) return;

    const powerSyncUrl = (import.meta as any).env?.VITE_POWERSYNC_URL || '';

    if (!powerSyncUrl) {
      console.warn('[PowerSyncService] ⚠️ VITE_POWERSYNC_URL not set - offline mode only');
      return; // ⚡ لا نرمي خطأ - نستمر في الوضع أوفلاين
    }

    // ⚡ تحقق من الاتصال بالإنترنت أولاً
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      console.log('[PowerSyncService] 📴 Offline mode - skipping backend connection');
      return; // ⚡ نستمر بدون اتصال
    }

    console.log('[PowerSyncService] 🔄 Connecting to PowerSync Backend...');

    try {
      await this.connector.fetchCredentials();

      // محاولات مع backoff بسيط لتقليل فشل الاتصال الأولي
      const attemptConnect = async (timeoutMs: number, attemptNumber: number) => {
        const startTime = performance.now();
        console.log(`[PowerSyncService] 🔄 Attempting connect() (attempt ${attemptNumber}) with timeout: ${timeoutMs}ms`);

        const connectPromise = this.db!.connect(this.connector);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(async () => {
            try {
              // مهم: Promise.race لا يلغي connectPromise، لذا نفصل هنا لإلغاء المحاولة فعلياً
              await this.db!.disconnect();
            } catch {
              // ignore
            }
            reject(new Error(`Connection timeout after ${timeoutMs}ms`));
          }, timeoutMs)
        );

        try {
          await Promise.race([connectPromise, timeoutPromise]);
          const elapsed = Math.round(performance.now() - startTime);
          console.log(`[PowerSyncService] ✅ Connected successfully in ${elapsed}ms (attempt ${attemptNumber})`);
        } catch (error: any) {
          const elapsed = Math.round(performance.now() - startTime);
          const prefix = attemptNumber === 1 ? '⚠️' : '❌';
          console.warn(`[PowerSyncService] ${prefix} Connection failed after ${elapsed}ms (attempt ${attemptNumber}):`, error?.message);
          throw error;
        }
      };

      try {
        // الشبكات البطيئة (3G/4G) تحتاج وقتاً أكبر لتأسيس WebSocket/TLS
        await attemptConnect(15000, 1);
      } catch (firstErr) {
        console.warn('[PowerSyncService] ⚠️ First connection attempt failed, retrying with longer timeout...');
        await attemptConnect(30000, 2);
      }

      // ⚡ DEBUG: التحقق من الحالة الفعلية بعد connect()
      const dbStatus = this.db!.currentStatus || {}; // ⚡ FIX: Handle null currentStatus
      const isActuallyConnected = this.db!.connected;
      console.log('[PowerSyncService] 🔍 After connect() - db.connected:', isActuallyConnected);
      console.log('[PowerSyncService] 🔍 After connect() - db.currentStatus:', {
        connected: dbStatus?.connected,
        hasSynced: dbStatus?.hasSynced,
        lastSyncedAt: dbStatus?.lastSyncedAt,
        dataFlow: (dbStatus as any)?.dataFlowStatus,
      });

      if (!isActuallyConnected) {
        console.warn('[PowerSyncService] ⚠️ Backend connection not established - continuing in offline mode');
        console.warn('[PowerSyncService] 🔍 Possible causes:');
        console.warn('[PowerSyncService]   1. PowerSync Backend rejected the connection');
        console.warn('[PowerSyncService]   2. Sync Rules parameter query returned no results');
        console.warn('[PowerSyncService]   3. JWT token is invalid or expired');
        console.warn('[PowerSyncService]   4. Network issue prevented connection');
        console.log('[PowerSyncService] 📴 Database is available for offline use');

        // ⚡ Don't attempt waitForFirstSync if not connected - it will fail
        // Just continue in offline mode with local database
      } else {
        console.log('[PowerSyncService] ✅ Connected to PowerSync Backend');
      }

      this.setupStatusListener();

      // ⚡ v4.2: تأجيل التشخيص للخلفية وبشكل كسول لتقليل عبء الإقلاع
      this.scheduleDiagnostics();


    } catch (error: any) {
      // ⚡ v4.1: لا نرمي الخطأ - نستمر في الوضع أوفلاين
      console.warn('[PowerSyncService] ⚠️ Connection failed (offline mode):', error?.message);
      console.log('[PowerSyncService] 📴 Continuing in offline mode - local data available');
      // ⚠️ لا نمسح this.db - نحتفظ بقاعدة البيانات المحلية
      // ⚠️ لا نعيد تعيين isInitialized - قاعدة البيانات جاهزة للاستخدام المحلي
    }
  }

  // ⚡ تتبع حالة الاتصال لتقليل الـ logs المتكررة
  private lastStatusLog: { connected: boolean; time: number; loggedDisconnect: boolean } = {
    connected: false,
    time: 0,
    loggedDisconnect: false
  };

  // ⚡ Auto-reconnect configuration - يستخدم القيم من config
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = POWERSYNC_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // ⚡ تتبع محلي لـ lastSyncedAt (لحل مشكلة undefined)
  private localLastSyncedAt: Date | null = null;

  // ⚡ تأخير تسجيل الانقطاع لتجنب التذبذب السريع - من config
  private disconnectLogTimer: NodeJS.Timeout | null = null;
  private _offlineDebounceTimer: NodeJS.Timeout | null = null;
  private readonly DISCONNECT_LOG_DELAY = POWERSYNC_CONFIG.DISCONNECT_LOG_DELAY;

  // ⚡ v5.0: منع تكرار الـ logs بشكل صارم - من config
  private lastStatusChangeLog = 0;
  private readonly STATUS_CHANGE_LOG_INTERVAL = POWERSYNC_CONFIG.STATUS_CHANGE_LOG_INTERVAL;
  private hasLoggedFirstSync = false;
  private lastDebugCheckTime = 0;
  private readonly DEBUG_CHECK_INTERVAL = POWERSYNC_CONFIG.DEBUG_CHECK_INTERVAL;
  private lastLoggedStatus: { connected: boolean; hasSynced: boolean } | null = null;

  /**
   * 📊 Setup status listener
   * ⚡ محسّن: يتجاهل الانقطاعات القصيرة (< 2 ثانية) ويقلل الـ logs المتكررة
   * ⚡ v4.4: يحفظ reference للـ cleanup
   */
  private setupStatusListener(): void {
    if (!this.db) return;

    // ⚡ v4.4: Cleanup previous listener if exists
    if (this.statusListenerUnsubscribe) {
      this.statusListenerUnsubscribe();
      this.statusListenerUnsubscribe = null;
    }

    this.statusListenerUnsubscribe = this.db.registerListener({
      statusChanged: (status) => {
        const now = Date.now();

        // ⚡ v4.5: تجاهل الـ events المتكررة تماماً
        const currentStatus = { connected: status.connected, hasSynced: status.hasSynced };
        const isSameStatus = this.lastLoggedStatus &&
          this.lastLoggedStatus.connected === currentStatus.connected &&
          this.lastLoggedStatus.hasSynced === currentStatus.hasSynced;

        // ⚡ v4.6: تجاهل التذبذب السريع (debounce) - انتظار 500ms قبل تسجيل OFFLINE
        const connectionChanged = this.lastLoggedStatus?.connected !== status.connected;

        if (connectionChanged) {
          // إذا انتقلنا من ONLINE إلى OFFLINE، ننتظر 500ms للتأكد
          if (this.lastLoggedStatus?.connected === true && status.connected === false) {
            // تأجيل تسجيل OFFLINE
            if (!this._offlineDebounceTimer) {
              this._offlineDebounceTimer = setTimeout(() => {
                this._offlineDebounceTimer = null;
                // تحقق مرة أخرى بعد التأخير
                if (this.db && !this.db.connected) {
                  this.lastStatusChangeLog = Date.now();
                  this.lastLoggedStatus = { connected: false, hasSynced: status.hasSynced };
                  console.log('[PowerSync] 🔍 Connection: 🔴 OFFLINE');
                }
              }, 500);
            }
          } else if (status.connected) {
            // إذا عدنا ONLINE، ألغِ timer الـ OFFLINE وسجّل فوراً
            if (this._offlineDebounceTimer) {
              clearTimeout(this._offlineDebounceTimer);
              this._offlineDebounceTimer = null;
            }
            // فقط سجّل إذا كنا offline فعلاً سابقاً
            if (this.lastLoggedStatus?.connected === false) {
              this.lastStatusChangeLog = now;
              this.lastLoggedStatus = currentStatus;
              console.log('[PowerSync] 🔍 Connection: 🟢 ONLINE');
            } else if (this.lastLoggedStatus === undefined) {
              // أول مرة
              this.lastStatusChangeLog = now;
              this.lastLoggedStatus = currentStatus;
              console.log('[PowerSync] 🔍 Connection: 🟢 ONLINE');
            }
          }
        }

        // ⚡ تحديث lastSyncedAt المحلي عند المزامنة الناجحة
        if (status.hasSynced) {
          this.localLastSyncedAt = status.lastSyncedAt || new Date();

          // ⚡ v4.5: تسجيل Sync confirmed مرة واحدة فقط في حياة الـ instance
          if (!this.hasLoggedFirstSync) {
            this.hasLoggedFirstSync = true;
            console.log('[PowerSync] ✅ First sync confirmed!');
          }

          // ⚡ v4.5: فحص البيانات مرة واحدة فقط كل 60 ثانية (وليس عند كل status change)
          if (!isSameStatus && (now - this.lastDebugCheckTime > this.DEBUG_CHECK_INTERVAL)) {
            this.lastDebugCheckTime = now;
            this.debugCheckDataAfterSync();
          }
        }


        // ⚡ v4.5: إدارة timers فقط (بدون logs إضافية - تم التسجيل أعلاه)
        if (status.connected) {
          if (this.disconnectLogTimer) {
            clearTimeout(this.disconnectLogTimer);
            this.disconnectLogTimer = null;
          }
          this.lastStatusLog = { connected: true, time: now, loggedDisconnect: false };
          this.reconnectAttempts = 0;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        } else {
          // ⚡ الانقطاع: ننتظر قبل التسجيل لتجنب التذبذب
          if (!this.disconnectLogTimer && this.lastStatusLog.connected) {
            this.disconnectLogTimer = setTimeout(() => {
              this.disconnectLogTimer = null;
              if (this.db && !this.db.connected) {
                const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
                this.lastStatusLog = { connected: false, time: Date.now(), loggedDisconnect: true };
                if (isOnline) {
                  this.scheduleReconnect();
                }
              }
            }, this.DISCONNECT_LOG_DELAY);
          }
        }

        // ⚡ إرسال الحدث دائماً (للمكونات التي تحتاجه)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('powersync-status-changed', { detail: status })
          );
        }
      },
    });
  }

  /**
   * ⚡ جدولة إعادة الاتصال التلقائي
   * محسّن: يتجاهل أخطاء WebSocket المتكررة ويجدد Token قبل الاتصال
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.log('[PowerSync] ⏹️ Max reconnect attempts reached, will retry on next user action');
      }
      return;
    }

    // Exponential backoff: 2s, 4s, 8s, 16s, 30s
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    // ⚡ تقليل الـ logs: فقط في المحاولة الأولى والأخيرة
    if (this.reconnectAttempts === 1 || this.reconnectAttempts === this.MAX_RECONNECT_ATTEMPTS) {
      console.log(`[PowerSync] 🔄 Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s`);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        // ⚡ تحقق من الاتصال بالإنترنت أولاً
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          console.log('[PowerSync] 📴 Still offline, skipping reconnect');
          return;
        }

        if (this.db && !this.db.connected) {
          // ⚡ مسح cache الـ credentials لإجبار تجديد Token
          (this.connector as any).credentialsCache = {
            credentials: null,
            cachedAt: 0,
            organizationId: null
          };

          await this.connector.fetchCredentials();
          await this.db.connect(this.connector);
          console.log('[PowerSync] ✅ Reconnected successfully');
          this.reconnectAttempts = 0; // إعادة تعيين العداد عند النجاح
        }
      } catch (error: any) {
        // ⚡ تقليل تكرار الـ logs لأخطاء WebSocket الشائعة
        const errorMsg = error?.message || '';
        const isCommonError = errorMsg.includes('bad response') ||
          errorMsg.includes('WebSocket') ||
          errorMsg.includes('closed');

        if (!isCommonError || this.reconnectAttempts === this.MAX_RECONNECT_ATTEMPTS) {
          console.warn('[PowerSync] ⚠️ Reconnect failed:', errorMsg);
        }

        // جدولة محاولة أخرى
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect();
        } else {
          // ⚡ إعادة تعيين العداد بعد فترة للسماح بمحاولات جديدة لاحقاً
          setTimeout(() => {
            this.reconnectAttempts = 0;
          }, 60000); // إعادة المحاولة بعد دقيقة
        }
      }
    }, delay);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📖 READ API (New v4.0)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ⚡ Query - Execute a read query
   */
  async query<T = unknown>(options: QueryOptions<T>): Promise<T[]> {
    const db = await this.ensureDb();
    if (!db) return [];

    try {
      const t0 = performance.now();
      this.log('query', 'start', { sql: options.sql, paramsCount: options.params?.length ?? 0 });
      const result = await db.getAll<T>(options.sql, options.params ? [...options.params] : []);
      const elapsed = Math.round(performance.now() - t0);
      this.log('query', 'success', { rows: Array.isArray(result) ? result.length : 0, ms: elapsed });
      return result;
    } catch (error: any) {
      if (options.throwOnError) throw error;
      console.error('[PowerSyncService] Query failed:', {
        message: error?.message,
        sql: options.sql,
        paramsCount: options.params?.length ?? 0
      });
      return [];
    }
  }

  /**
   * ⚡ QueryOne - Get single record
   */
  async queryOne<T = unknown>(options: QueryOneOptions<T>): Promise<T | null> {
    const db = await this.ensureDb();
    if (!db) return options.defaultValue ?? null;

    try {
      const t0 = performance.now();
      this.log('queryOne', 'start', { sql: options.sql, paramsCount: options.params?.length ?? 0, throwIfEmpty: options.throwIfEmpty });
      const result = await db.get<T>(options.sql, options.params ? [...options.params] : []);
      const elapsed = Math.round(performance.now() - t0);
      this.log('queryOne', 'success', { hasResult: result != null, ms: elapsed });
      if (result == null && options.throwIfEmpty) {
        throw new Error('Result set is empty');
      }
      return result ?? options.defaultValue ?? null;
    } catch (error: any) {
      if (error?.message?.includes('Result set is empty') && !options.throwIfEmpty) {
        return options.defaultValue ?? null;
      }
      if (options.throwOnError || options.throwIfEmpty) throw error;
      console.error('[PowerSyncService] QueryOne failed:', {
        message: error?.message,
        sql: options.sql,
        paramsCount: options.params?.length ?? 0
      });
      return options.defaultValue ?? null;
    }
  }

  /**
   * ⚡ Count - Get count of records
   */
  async count(table: string, where?: string, params?: readonly Value[]): Promise<number> {
    const sql = where
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;

    const result = await this.queryOne<{ count: number }>({ sql, params });
    return result?.count || 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ WRITE API (New v4.0)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ⚡ Mutate - Execute write operations
   */
  async mutate<T extends Record<string, Value>>(options: MutateOptions<T>): Promise<boolean> {
    const db = await this.ensureDb();
    if (!db) return false;

    try {
      this.log('mutate', 'start', { table: options.table, operation: options.operation });
      await db.writeTransaction(async (tx) => {
        const { table, operation, data, where, onConflict } = options;
        assertIdentifier(table, 'table');

        switch (operation) {
          case 'INSERT': {
            if (!data) throw new Error('Data required for INSERT');
            const columns = sanitizeColumns(Object.keys(data));
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => (data as any)[col]);
            this.log('mutate', 'INSERT sql', { table, columns });
            await tx.execute(
              `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
            break;
          }

          case 'UPDATE': {
            if (!data || !where?.length) throw new Error('Data and where required for UPDATE');
            const columns = sanitizeColumns(Object.keys(data));
            const setClause = columns.map(k => `${k} = ?`).join(', ');
            const whereClause = where.map(w => {
              assertIdentifier(w.column, 'column');
              return `${w.column} = ?`;
            }).join(' AND ');
            const values = [...columns.map(col => (data as any)[col]), ...where.map(w => w.value)];
            this.log('mutate', 'UPDATE sql', { table, columns, whereCount: where.length });
            await tx.execute(
              `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`,
              values
            );
            break;
          }

          case 'DELETE': {
            if (!where?.length) throw new Error('Where required for DELETE');
            const whereClause = where.map(w => {
              assertIdentifier(w.column, 'column');
              return `${w.column} = ?`;
            }).join(' AND ');
            const values = where.map(w => w.value);
            this.log('mutate', 'DELETE sql', { table, whereCount: where.length });
            await tx.execute(`DELETE FROM ${table} WHERE ${whereClause}`, values);
            break;
          }

          case 'UPSERT': {
            if (!data) throw new Error('Data required for UPSERT');
            const columns = sanitizeColumns(Object.keys(data));
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => (data as any)[col]);
            const conflictColumns = (onConflict && onConflict.length ? onConflict : ['id']).map(col => {
              assertIdentifier(col, 'column');
              return col;
            });
            const updateColumns = columns
              .filter(c => !conflictColumns.includes(c));
            const updateClause = updateColumns.length
              ? updateColumns.map(c => `${c} = excluded.${c}`).join(', ')
              : null;
            this.log('mutate', 'UPSERT sql', { table, columns, conflictColumns, hasUpdate: !!updateClause });
            const sql = updateClause
              ? `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
                 ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateClause}`
              : `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
                 ON CONFLICT (${conflictColumns.join(', ')}) DO NOTHING`;

            await tx.execute(sql, values);
            break;
          }
        }
      });

      return true;
    } catch (error: any) {
      console.error(`[PowerSyncService] Mutate ${options.operation} failed:`, error?.message);
      return false;
    }
  }

  /**
   * ⚡ Execute raw SQL (for complex operations)
   */
  async execute(sql: string, params: readonly Value[] = []): Promise<QueryResult> {
    const db = await this.ensureDb();
    if (!db) throw new Error('Database not available');

    return db.execute(sql, [...params]);
  }

  /**
   * ⚡ Mutate Batch - Execute bulk write operations (v4.0)
   *
   * Uses multi-value INSERT/UPSERT per chunk for high throughput.
   */
  async mutateBatch<T extends Record<string, Value>>(options: MutateBatchOptions<T>): Promise<BatchResult> {
    const startTime = Date.now();
    const { table, operation, data, onConflict = ['id'], chunkSize = 100 } = options;

    const result: BatchResult = {
      success: false,
      totalCount: data.length,
      successCount: 0,
      errorCount: 0,
      durationMs: 0,
      errors: [] as Array<{ index: number; error: string }>,
    };

    const db = await this.ensureDb();
    if (!db) {
      result.durationMs = Date.now() - startTime;
      return result;
    }

    if (data.length === 0) {
      result.success = true;
      result.durationMs = Date.now() - startTime;
      return result;
    }

    assertIdentifier(table, 'table');
    const conflictColumns = (onConflict && onConflict.length ? onConflict : ['id']).map(col => {
      assertIdentifier(col, 'column');
      return col;
    });

    this.log('mutateBatch', 'start', { table, operation, total: data.length, chunkSize });

    try {
      // Split into chunks for large datasets
      const chunks = chunkArray(data, chunkSize);

      await db.writeTransaction(async (tx) => {
        let globalIndex = 0;

        for (const chunk of chunks) {
          this.log('mutateBatch', 'chunk', { table, operation, chunkSize: chunk.length, globalIndex });
          try {
            switch (operation) {
              case 'INSERT': {
                const { sql, values } = this.buildInsertStatement(table, chunk);
                await tx.execute(sql, values);
                result.successCount += chunk.length;
                break;
              }

              case 'UPSERT': {
                const { sql, values } = this.buildUpsertStatement(table, chunk, conflictColumns);
                await tx.execute(sql, values);
                result.successCount += chunk.length;
                break;
              }

              case 'DELETE': {
                const ids = chunk.map((record: any) => record?.id).filter(Boolean);
                if (!ids.length) {
                  throw new Error('DELETE requires id field');
                }
                const placeholders = ids.map(() => '?').join(', ');
                await tx.execute(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
                result.successCount += ids.length;
                break;
              }
            }
          } catch (error: any) {
            result.errorCount += chunk.length;
            result.errors!.push({
              index: globalIndex,
              error: error?.message || 'Unknown error'
            });
            this.log('mutateBatch', 'chunk error', { table, operation, chunkSize: chunk.length, error: error?.message });
          } finally {
            globalIndex += chunk.length;
          }
        }
      });

      result.success = result.errorCount === 0;

    } catch (error: any) {
      console.error(`[PowerSyncService] ❌ mutateBatch failed:`, error?.message);
      result.errorCount = result.totalCount - result.successCount;
    }

    result.durationMs = Date.now() - startTime;

    console.log(`[PowerSyncService] ${result.success ? '✅' : '⚠️'} mutateBatch completed:`, {
      table,
      operation,
      total: result.totalCount,
      success: result.successCount,
      errors: result.errorCount,
      duration: `${result.durationMs}ms`
    });

    return result;
  }

  /**
   * ⚡ Helper: build multi-value INSERT statement
   */
  private buildInsertStatement<T extends Record<string, Value>>(table: string, records: T[]): { sql: string; values: Value[] } {
    const columns = this.collectColumns(records);
    const placeholders = `(${columns.map(() => '?').join(', ')})`;
    const values: Value[] = [];
    const rows: string[] = [];

    for (const record of records) {
      rows.push(placeholders);
      for (const col of columns) {
        values.push((record as any)[col] ?? null);
      }
    }

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${rows.join(', ')}`;
    return { sql, values };
  }

  /**
   * ⚡ Helper: build multi-value UPSERT statement
   */
  private buildUpsertStatement<T extends Record<string, Value>>(table: string, records: T[], conflictColumns: string[]): { sql: string; values: Value[] } {
    const columns = this.collectColumns(records);
    const placeholders = `(${columns.map(() => '?').join(', ')})`;
    const values: Value[] = [];
    const rows: string[] = [];

    for (const record of records) {
      rows.push(placeholders);
      for (const col of columns) {
        values.push((record as any)[col] ?? null);
      }
    }

    const updatable = columns.filter((c) => !conflictColumns.includes(c));
    const updateClause = updatable.length
      ? `DO UPDATE SET ${updatable.map((c) => `${c} = excluded.${c}`).join(', ')}`
      : 'DO NOTHING';

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${rows.join(', ')}
                 ON CONFLICT (${conflictColumns.join(', ')}) ${updateClause}`;

    return { sql, values };
  }

  /**
   * ⚡ Helper: collect unique columns preserving order
   */
  private collectColumns<T extends Record<string, Value>>(records: T[]): string[] {
    const ordered = new Set<string>();
    for (const record of records) {
      Object.keys(record).forEach((key) => {
        assertIdentifier(key, 'column');
        if (!ordered.has(key)) {
          ordered.add(key);
        }
      });
    }
    return Array.from(ordered);
  }

  /**
   * ⚡ Transaction - Execute multiple operations atomically
   */
  async transaction(callback: (tx: any) => Promise<void>): Promise<void> {
    const db = await this.ensureDb();
    if (!db) throw new Error('Database not available');

    this.log('transaction', 'start');
    await db.writeTransaction(callback);
    this.log('transaction', 'end');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 👁️ WATCH API (New v4.0)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ⚡ Watch - Subscribe to query changes
   */
  watch<T = unknown>(query: QueryOptions, options: WatchOptions<T>): () => void {
    if (!this.db) {
      console.warn('[PowerSyncService] Cannot watch - database not initialized');
      return () => { };
    }

    const watchId = `${query.sql}|${JSON.stringify(query.params || [])}`;
    this.log('watch', 'start', { watchId });

    // Cleanup existing watcher
    const existing = this.activeWatchers.get(watchId);
    if (existing) {
      existing();
    }

    let lastUpdate = 0;
    const throttleMs = options.throttleMs ?? 100;

    const abortController = new AbortController();

    this.db.watch(
      query.sql,
      query.params ? [...query.params] : [],
      {
        onResult: (result) => {
          const now = Date.now();
          if (now - lastUpdate >= throttleMs) {
            lastUpdate = now;
            options.onResult((result as any)?.rows?._array || []);
          }
        },
        onError: (error) => {
          options.onError?.(error);
        }
      },
      { signal: abortController.signal }
    );

    const cleanup = () => {
      abortController.abort();
      this.activeWatchers.delete(watchId);
      this.log('watch', 'cleanup', { watchId });
    };

    this.activeWatchers.set(watchId, cleanup);

    return cleanup;
  }

  /**
   * ⚡ Cleanup all watchers
   * ⚡ v4.4: يشمل cleanup للـ statusListener, beforeUnloadHandler, و timers
   */
  cleanupWatchers(): void {
    // Cleanup active watchers
    this.activeWatchers.forEach(unsubscribe => unsubscribe());
    this.activeWatchers.clear();

    // ⚡ v4.4: Cleanup status listener
    if (this.statusListenerUnsubscribe) {
      this.statusListenerUnsubscribe();
      this.statusListenerUnsubscribe = null;
    }

    // ⚡ v4.4: Cleanup beforeunload handler
    if (this.beforeUnloadHandler && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    // ⚡ v4.4: Cleanup timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.disconnectLogTimer) {
      clearTimeout(this.disconnectLogTimer);
      this.disconnectLogTimer = null;
    }
    // ⚡ v4.6: Cleanup offline debounce timer
    if (this._offlineDebounceTimer) {
      clearTimeout(this._offlineDebounceTimer);
      this._offlineDebounceTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📚 PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 📦 Get PowerSync Database
   */
  getDatabase(): PowerSyncDatabase | null {
    return this.db;
  }

  /**
   * ✅ Check if ready
   * ⚡ v5.2: يعمل في الويب (WASM) و Electron (better-sqlite3)
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * ✅ Check if available
   * ⚡ v5.2: يعمل في الويب (WASM) و Electron (better-sqlite3)
   */
  isAvailable(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * ✅ Check if sync enabled
   * ⚡ v5.2: يعمل في الويب (WASM) و Electron (better-sqlite3)
   */
  isSyncEnabled(): boolean {
    return this.isInitialized && this.db !== null && !!(import.meta as any).env?.VITE_POWERSYNC_URL;
  }

  /**
   * ⚡ v5.2: هل نحن في بيئة Electron؟
   */
  isElectron(): boolean {
    return isElectronEnvironment();
  }

  /**
   * ⚡ v5.2: هل ندعم العمل أوفلاين؟ (نعم في كل البيئات)
   */
  isOfflineCapable(): boolean {
    return true; // PowerSync مفعّل في الويب و Electron
  }

  /**
   * 📊 Get sync status
   * 🔧 Fix: تحقق من TTL قبل استدعاء الدالة لتقليل الـ overhead
   * ⚡ Fixed: Handle null currentStatus safely
   */
  get syncStatus(): SyncStatus {
    // تحديث العدّاد بشكل غير متزامن فقط إذا انتهت صلاحية الـ cache
    if (this.db && (Date.now() - this.pendingChangesCacheTime >= this.PENDING_CACHE_TTL)) {
      void this.updatePendingChangesCount();
    }

    if (!this.db) {
      return {
        connected: false,
        hasSynced: false,
        lastSyncedAt: this.localLastSyncedAt, // ⚡ استخدام القيمة المحلية
        uploading: false,
        downloading: false,
        pendingChanges: this.pendingChangesCache,
      };
    }

    // ⚡ FIX: Safely access currentStatus - may be null during initialization
    const status = (this.db as any).currentStatus as any || {};
    return {
      connected: status.connected || false,
      hasSynced: status.hasSynced || false,
      // ⚡ استخدام القيمة من SDK أو القيمة المحلية كـ fallback
      lastSyncedAt: status.lastSyncedAt || this.localLastSyncedAt || null,
      uploading: status?.dataFlowStatus?.uploading || false,
      downloading: status?.dataFlowStatus?.downloading || false,
      pendingChanges: this.pendingChangesCache,
    };
  }

  /**
   * 🔄 Force sync
   */
  async forceSync(): Promise<void> {
    try {
      if (!this.db) {
        await this.initialize();
      }

      if (!this.db) {
        throw new Error('Database not available');
      }

      // تجديد الاعتمادات بضبط الزمن
      try {
        await this.connector.fetchCredentials();
      } catch (error: any) {
        const message = error?.message || String(error);
        // إذا لم تكن هناك جلسة مصادقة، لا نعتبرها خطأ "مزمنة" (توقف فقط)
        if (message.includes('No active Supabase session') || message.includes('No active session')) {
          console.warn('[PowerSyncService] ⚠️ Skipping sync: no active Supabase session');
          await this.disconnect();
          return;
        }
        throw error;
      }

      // إعادة الاتصال مع انتظار قصير
      await this.db.connect(this.connector);
      await this.db.waitForReady();
      await this.updatePendingChangesCount();

      console.log('[PowerSyncService] ✅ Sync completed');
    } catch (error) {
      console.error('[PowerSyncService] ❌ Sync failed:', error);
      throw error;
    }
  }

  /**
   * 📤 Check pending uploads
   */
  async hasPendingUploads(): Promise<boolean> {
    if (!this.db) return false;
    try {
      const result = await this.db.execute('SELECT COUNT(*) as count FROM ps_crud');
      const count = (result as any).rows?._array?.[0]?.count || 0;
      this.pendingChangesCache = count;
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * 📊 Get pending changes count
   */
  async getPendingChangesCount(): Promise<number> {
    if (!this.db) return 0;
    try {
      const result = await this.db.execute('SELECT COUNT(*) as count FROM ps_crud');
      const count = (result as any).rows?._array?.[0]?.count || 0;
      this.pendingChangesCache = count;
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * 🔌 Reconnect
   */
  async reconnect(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('[PowerSyncService] 🔄 Reconnecting...');
      try {
        await this.connector.fetchCredentials();
      } catch (error: any) {
        const message = error?.message || String(error);
        if (message.includes('No active Supabase session') || message.includes('No active session')) {
          console.warn('[PowerSyncService] ⚠️ Skipping reconnect: no active Supabase session');
          await this.disconnect();
          return;
        }
        throw error;
      }
      await this.db.disconnect();
      await this.db.connect(this.connector);
      console.log('[PowerSyncService] ✅ Reconnected');
    } catch (error) {
      console.error('[PowerSyncService] ❌ Reconnect failed:', error);
    }
  }

  /**
   * 🚫 Disconnect
   */
  async disconnect(): Promise<void> {
    if (!this.db) return;

    console.log('[PowerSyncService] 🔌 Disconnecting...');
    this.cleanupWatchers();
    try {
      await this.db.disconnect();
      console.log('[PowerSyncService] ✅ Disconnected');
    } catch (error) {
      console.warn('[PowerSyncService] Disconnect error:', error);
    }
  }

  /**
   * 🗑️ Clear all data and reinitialize
   */
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    console.warn('[PowerSyncService] ⚠️ Clearing all local data...');
    const previousDb = this.db; // ⚡ Keep reference to restore on failure
    this.cleanupWatchers();

    // ⚡ FIX: Reset initialization state to allow fresh start
    this.isInitialized = false;
    this.initPromise = null;

    try {
      await this.db.disconnectAndClear();
      this.db = null;
      console.log('[PowerSyncService] ✅ All data cleared');

      // Reinitialize after clearing
      console.log('[PowerSyncService] 🔄 Reinitializing...');
      await this.initialize();

      if (!this.db) {
        throw new Error('Reinitialization failed - database is null');
      }
      console.log('[PowerSyncService] ✅ Reinitialization completed successfully');
    } catch (error) {
      console.error('[PowerSyncService] Failed to clear data:', error);
      // ⚡ FIX: Restore db if reinitialization failed to keep offline capability
      if (!this.db && previousDb) {
        console.warn('[PowerSyncService] ⚠️ Restoring previous database instance for offline use');
        this.db = previousDb;
        this.isInitialized = true;
      }
    }
  }

  /**
   * 🔄 Reset database (clear and reinitialize)
   * Use this when database is locked or corrupted
   */
  async resetDatabase(): Promise<boolean> {
    console.warn('[PowerSyncService] ⚠️ Resetting database...');

    try {
      // 1. Cleanup watchers
      this.cleanupWatchers();

      // 2. Disconnect if connected
      if (this.db) {
        try {
          await this.db.disconnectAndClear();
        } catch (e) {
          console.warn('[PowerSyncService] Disconnect error (expected):', e);
        }
      }

      // 3. Reset state
      this.db = null;
      this.isInitialized = false;
      this.hasFatalError = false;
      this.initAttempts = 0;
      this.initPromise = null;

      // 4. Clear IndexedDB directly as fallback
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        try {
          const databases = await indexedDB.databases();
          if (databases) {
            for (const db of databases) {
              if (db.name?.includes('stockiha_powersync') || db.name?.includes('powersync')) {
                console.log(`[PowerSyncService] Deleting IndexedDB: ${db.name}`);
                indexedDB.deleteDatabase(db.name);
              }
            }
          }
        } catch (e) {
          console.warn('[PowerSyncService] IndexedDB cleanup error:', e);
        }
      }

      // 5. Wait a bit for locks to release
      await new Promise(resolve => setTimeout(resolve, 500));

      // 6. Reinitialize
      console.log('[PowerSyncService] 🔄 Reinitializing after reset...');
      await this.initialize();

      console.log('[PowerSyncService] ✅ Database reset complete');
      return true;
    } catch (error) {
      console.error('[PowerSyncService] ❌ Reset failed:', error);
      return false;
    }
  }

  /**
   * ⚡ Wait for initialization
   */
  async waitForInitialization(timeoutMs: number = 10000): Promise<boolean> {
    this.log('waitForInitialization', 'start', { isInitialized: this.isInitialized, hasDb: !!this.db, timeoutMs });
    if (this.isInitialized && this.db) {
      return true;
    }

    if (this.initPromise) {
      try {
        await Promise.race([
          this.initPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);
        const ready = this.isInitialized && this.db !== null;
        this.log('waitForInitialization', 'done', { ready });
        return ready;
      } catch {
        this.log('waitForInitialization', 'failed/timeout');
        return false;
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔍 DIAGNOSTICS API (delegated)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🔍 تشخيص شامل لحالة المزامنة (يستدعي PowerSyncDiagnostics)
   */
  async diagnoseSync(): Promise<any> {
    this.log('diagnoseSync', 'start');
    try {
      const diagnostics = await import('./PowerSyncDiagnostics');
      if ((diagnostics as any)?.runFullDiagnostics) {
        return (diagnostics as any).runFullDiagnostics();
      }
    } catch (error) {
      console.error('[PowerSyncService] Diagnosis import failed:', error);
    }

    return { recommendation: 'Diagnostics module unavailable' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ LEGACY API (Deprecated - للتوافق فقط)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @deprecated Use query() or db.getAll() instead
   */
  async getAll<T = unknown>(sql: string, params: readonly Value[] = []): Promise<T[]> {
    console.warn('[PowerSyncService] getAll is deprecated. Use query().');
    return this.query<T>({ sql, params });
  }

  /**
   * @deprecated Use queryOne() or db.get() instead
   */
  async get<T = unknown>(sql: string, params: readonly Value[] = []): Promise<T | null> {
    console.warn('[PowerSyncService] get is deprecated. Use queryOne().');
    return this.queryOne<T>({ sql, params });
  }

  /**
   * @deprecated Use transaction() instead
   */
  async writeTransaction(callback: (tx: any) => Promise<void>): Promise<void> {
    if (!this.hasWarnedDeprecatedWriteTx) {
      this.hasWarnedDeprecatedWriteTx = true;
      // سجل التحذير مرة واحدة مع stack لمعرفة من يستدعيه
      console.warn('[PowerSyncService] writeTransaction is deprecated. Use transaction().', {
        stack: new Error().stack
      });
    }
    return this.transaction(callback);
  }

  /**
   * @deprecated Use query/mutate with proper error handling
   */
  async safeExecute<T>(operation: () => Promise<T>, defaultValue: T): Promise<T> {
    console.warn('[PowerSyncService] safeExecute is deprecated. Use query/mutate with error handling.');
    const ready = await this.waitForInitialization(5000);
    if (!ready || !this.db) return defaultValue;

    try {
      return await operation();
    } catch {
      return defaultValue;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async ensureDb(): Promise<PowerSyncDatabase | null> {
    // ⚡ تحقق من خطأ فادح سابق
    if (this.hasFatalError) {
      this.log('ensureDb', 'skipping - fatal error occurred');
      return null;
    }

    if (this.db && this.isInitialized) {
      return this.db;
    }

    // ⚡ تحقق من الحد الأقصى للمحاولات
    if (this.initAttempts >= this.MAX_INIT_ATTEMPTS) {
      this.log('ensureDb', 'skipping - max attempts reached');
      return null;
    }

    // ⚡ إذا كانت هناك محاولة تهيئة جارية، انتظرها
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // تجاهل - سيتم التعامل معه في initialize()
      }
      return this.db;
    }

    this.log('ensureDb', 'db missing, calling initialize()');
    try {
      await this.initialize();
    } catch (error) {
      this.log('ensureDb', 'initialize failed', { error });
    }
    return this.db;
  }

  /**
   * 🔢 تحديث عدّاد العمليات المعلقة وتخزينه
   * ⚡ v4.2: يستخدم TTL cache لتقليل الاستعلامات المتكررة
   */
  private async updatePendingChangesCount(): Promise<void> {
    if (!this.db) return;

    // ⚡ تحقق من TTL لتجنب الاستعلامات المتكررة
    const now = Date.now();
    if (now - this.pendingChangesCacheTime < this.PENDING_CACHE_TTL) {
      return; // لا تزال القيمة صالحة
    }

    try {
      const result = await this.db.execute('SELECT COUNT(*) as count FROM ps_crud');
      this.pendingChangesCache = (result as any).rows?._array?.[0]?.count || 0;
      this.pendingChangesCacheTime = now;
    } catch {
      // تجاهل الخطأ - مجرد مقياس
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const powerSyncService = PowerSyncService.getInstance();
export default powerSyncService;

/**
 * ⚡ دالة مساعدة لقراءة organization_id من أي مصدر متاح
 * تُستخدم من أي مكان في التطبيق للحصول على organization_id
 *
 * ترتيب الأولوية:
 * 1. localStorage (أسرع)
 * 2. قاعدة البيانات المحلية (PowerSync)
 * 3. null إذا لم يتوفر
 */
export async function getOrganizationId(): Promise<string | null> {
  // ⚡ 1. تحقق من localStorage أولاً (أسرع)
  const cached = localStorage.getItem(STORAGE_KEYS.ORG_ID)
    || localStorage.getItem(STORAGE_KEYS.ORG_ID_ALT);

  if (cached && cached !== 'undefined' && cached !== 'null') {
    return cached;
  }

  // ⚡ 2. محاولة القراءة من قاعدة البيانات المحلية
  if (powerSyncService.db && powerSyncService.isInitialized) {
    try {
      // محاولة من جدول users
      const userResult = await powerSyncService.db.getAll<{ organization_id: string }>(
        `SELECT organization_id FROM users WHERE organization_id IS NOT NULL LIMIT 1`
      );
      if (userResult?.[0]?.organization_id) {
        localStorage.setItem(STORAGE_KEYS.ORG_ID, userResult[0].organization_id);
        return userResult[0].organization_id;
      }

      // محاولة من جدول organizations
      const orgResult = await powerSyncService.db.getAll<{ id: string }>(
        `SELECT id FROM organizations LIMIT 1`
      );
      if (orgResult?.[0]?.id) {
        localStorage.setItem(STORAGE_KEYS.ORG_ID, orgResult[0].id);
        return orgResult[0].id;
      }
    } catch (error) {
      syncWarnLog('getOrganizationId', 'Error reading from local DB:', error);
    }
  }

  return null;
}

/**
 * ⚡ دالة متزامنة (sync) لقراءة organization_id من الـ cache فقط
 * للاستخدام في الأماكن التي لا تدعم async
 */
export function getOrganizationIdSync(): string | null {
  const cached = localStorage.getItem(STORAGE_KEYS.ORG_ID)
    || localStorage.getItem(STORAGE_KEYS.ORG_ID_ALT);

  if (cached && cached !== 'undefined' && cached !== 'null') {
    return cached;
  }

  return null;
}
