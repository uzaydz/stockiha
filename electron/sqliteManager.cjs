/**
 * مدير قاعدة بيانات SQLite للتطبيق
 * يحل محل IndexedDB بنظام أقوى وأسرع
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// استيراد better-sqlite3 مع دعم التطبيق المُحزّم
let Database;
try {
  // إضافة app/node_modules إلى مسارات البحث العامة
  const appPath = path.join(__dirname, '..');
  const appNodeModules = path.join(appPath, 'node_modules');
  
  if (fs.existsSync(appNodeModules)) {
    // إضافة إلى Module.globalPaths لضمان أن جميع require تجده
    const Module = require('module');
    if (!Module.globalPaths.includes(appNodeModules)) {
      Module.globalPaths.unshift(appNodeModules);
      console.log('[SQLiteManager] Added to Module.globalPaths:', appNodeModules);
    }
  }
  
  Database = require('better-sqlite3');
  console.log('[SQLiteManager] ✅ better-sqlite3 loaded successfully');
} catch (err) {
  console.error('[SQLiteManager] ❌ Failed to load better-sqlite3:', err);
  throw new Error('Cannot load better-sqlite3: ' + err.message);
}

class SQLiteManager {
  constructor(app) {
    this.app = app;
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
    this.currentOrganizationId = null;
    // Cache table columns to avoid repeated PRAGMA calls
    this._tableColumnsCache = new Map();
    this._cacheMaxSize = 50; // حد أقصى لعدد الجداول في الذاكرة
    this._cacheAccessTimestamps = new Map(); // تتبع آخر وصول لكل جدول

    // تنظيف دوري للذاكرة كل 5 دقائق
    this._cleanupInterval = setInterval(() => {
      this._cleanupStaleCache();
    }, 5 * 60 * 1000);
  }

  /**
   * تنظيف الـ cache القديم غير المستخدم
   */
  _cleanupStaleCache() {
    try {
      // إذا تجاوز الحد الأقصى، احذف الأقدم
      if (this._tableColumnsCache.size > this._cacheMaxSize) {
        const now = Date.now();
        const entries = Array.from(this._cacheAccessTimestamps.entries())
          .sort((a, b) => a[1] - b[1]); // ترتيب حسب الأقدم

        // احذف النصف الأقدم
        const toDelete = Math.floor(entries.length / 2);
        for (let i = 0; i < toDelete; i++) {
          const [table] = entries[i];
          this._tableColumnsCache.delete(table);
          this._cacheAccessTimestamps.delete(table);
        }

        console.log(`[SQLite] ♻️ Cleaned up ${toDelete} stale cache entries`);
      }
    } catch (error) {
      console.warn('[SQLite] Cache cleanup warning:', error?.message || error);
    }
  }

  /**
   * تحديث timestamp الوصول للـ cache
   */
  _touchCache(table) {
    this._cacheAccessTimestamps.set(table, Date.now());
  }

  /**
   * تهيئة قاعدة البيانات
   */
  initialize(organizationId) {
    try {
      if (this.isInitialized && this.currentOrganizationId === organizationId) {
        console.log(`[SQLite] Database already initialized for org: ${organizationId}`);
        // تأكد من تشغيل الترقيات/إنشاء الجداول حتى في حال كانت القاعدة مفتوحة بالفعل
        try {
          if (organizationId === 'global') {
            this.createGlobalTables();
          } else {
            this.createTables();
            this.createIndexes();
            this.enableFullTextSearch();
          }
        } catch (e) {
          console.warn('[SQLite] Warning while ensuring schema on already-open DB:', e?.message || e);
        }
        return { success: true, path: this.dbPath, size: this.getDatabaseSize() };
      }

      // إغلاق القاعدة السابقة إن وجدت
      if (this.db) {
        this.db.close();
      }

      const userDataPath = this.app.getPath('userData');
      const dbDirectory = path.join(userDataPath, 'databases');

      if (!fs.existsSync(dbDirectory)) {
        fs.mkdirSync(dbDirectory, { recursive: true });
      }

      this.dbPath = path.join(dbDirectory, `stockiha_${organizationId}.db`);

      console.log(`[SQLite] Initializing database at: ${this.dbPath}`);

      this.db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        fileMustExist: false
      });

      // تحسينات الأداء
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -64000');
      this.db.pragma('temp_store = MEMORY');
      this.db.pragma('mmap_size = 268435456');
      this.db.pragma('page_size = 4096');
      this.db.pragma('foreign_keys = ON');

      // في قاعدة "global" نستخدم مخططاً مصغّراً خاصاً لتخزين الجلسة فقط
      if (organizationId === 'global') {
        try {
          this.createGlobalTables();
        } catch (e) {
          console.warn('[SQLite] Warning while creating global schema:', e?.message || e);
        }
      } else {
        this.createTables();
        this.migrateSchema(); // إضافة الأعمدة الناقصة
        this.createIndexes();
        this.enableFullTextSearch();
      }

      this.isInitialized = true;
      this.currentOrganizationId = organizationId;

      console.log(`[SQLite] Database initialized successfully`);

      return { success: true, path: this.dbPath, size: this.getDatabaseSize() };
    } catch (error) {
      console.error('[SQLite] Failed to initialize:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * إنشاء جميع الجداول
   */
  createTables() {
    // جدول المنتجات
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_normalized TEXT,
        sku TEXT,
        barcode TEXT,
        price REAL NOT NULL DEFAULT 0,
        cost REAL DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        category_id TEXT,
        is_active INTEGER DEFAULT 1,
        thumbnail_image TEXT,
        image_thumbnail TEXT,
        images TEXT,
        description TEXT,
        organization_id TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT NOT NULL,
        server_updated_at TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول العناوين (addresses)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        name TEXT,
        street_address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        phone TEXT,
        is_default INTEGER,
        organization_id TEXT NOT NULL
      );
    `);

    // جدول صلاحيات المستخدم المخزن محلياً
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT NOT NULL,
        user_id TEXT,
        email TEXT,
        name TEXT,
        role TEXT,
        organization_id TEXT,
        is_active INTEGER,
        is_org_admin INTEGER,
        is_super_admin INTEGER,
        permissions TEXT,
        has_inventory_access INTEGER,
        can_manage_products INTEGER,
        can_view_reports INTEGER,
        can_manage_users INTEGER,
        can_manage_orders INTEGER,
        can_access_pos INTEGER,
        can_manage_settings INTEGER,
        created_at TEXT,
        updated_at TEXT,
        last_updated TEXT
      );
    `);

    // جدول إعدادات نقاط البيع (POS Settings)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pos_settings (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        store_name TEXT,
        store_address TEXT,
        store_phone TEXT,
        store_email TEXT,
        receipt_header TEXT,
        receipt_footer TEXT,
        receipt_logo_url TEXT,
        receipt_show_logo INTEGER,
        receipt_show_barcode INTEGER,
        receipt_show_qr INTEGER,
        receipt_paper_size TEXT,
        receipt_font_size TEXT,
        receipt_font_family TEXT,
        auto_print_receipt INTEGER,
        print_copies INTEGER,
        tax_enabled INTEGER,
        tax_rate REAL,
        tax_number TEXT,
        currency TEXT,
        currency_symbol TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER,
        pending_sync INTEGER
      );
    `);

    // جدول طلبات POS
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pos_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_name_lower TEXT,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        organization_id TEXT NOT NULL,
        staff_id TEXT,
        work_session_id TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        last_sync_attempt TEXT,
        error TEXT,
        remote_order_id TEXT,
        remote_customer_order_number INTEGER,
        local_created_at TEXT NOT NULL,
        server_created_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول عناصر الطلب
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pos_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE
      );
    `);

    // جدول العملاء
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_normalized TEXT,
        name_lower TEXT,
        email TEXT,
        email_lower TEXT,
        phone TEXT,
        phone_digits TEXT,
        total_debt REAL DEFAULT 0,
        organization_id TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول الفواتير
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL,
        invoice_number_lower TEXT,
        remote_invoice_id TEXT,
        customer_name TEXT,
        customer_name_lower TEXT,
        customer_id TEXT,
        total_amount REAL NOT NULL,
        invoice_date TEXT,
        due_date TEXT,
        status TEXT DEFAULT 'pending',
        source_type TEXT,
        payment_method TEXT,
        payment_status TEXT,
        notes TEXT,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        subtotal_amount REAL DEFAULT 0,
        shipping_amount REAL,
        discount_type TEXT,
        discount_percentage REAL,
        tva_rate REAL,
        amount_ht REAL,
        amount_tva REAL,
        amount_ttc REAL,
        organization_id TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_created_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول عناصر الفواتير
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        product_id TEXT,
        type TEXT DEFAULT 'product',
        sku TEXT,
        barcode TEXT,
        tva_rate REAL,
        unit_price_ht REAL,
        unit_price_ttc REAL,
        total_ht REAL,
        total_tva REAL,
        total_ttc REAL,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
    `);

    // جدول ديون العملاء
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customer_debts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'unpaid',
        order_id TEXT,
        order_number TEXT,
        total_amount REAL,
        paid_amount REAL,
        remaining_amount REAL,
        due_date TEXT,
        notes TEXT,
        organization_id TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);

    // جدول طلبات الإصلاح
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS repair_orders (
        id TEXT PRIMARY KEY,
        repair_number TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        device_type TEXT,
        issue_description TEXT,
        status TEXT DEFAULT 'pending',
        total_cost REAL DEFAULT 0,
        organization_id TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        local_created_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول صور الإصلاح
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS repair_images (
        id TEXT PRIMARY KEY,
        repair_id TEXT NOT NULL,
        image_data TEXT,
        image_type TEXT DEFAULT 'webp',
        file_size INTEGER,
        is_thumbnail INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        uploaded_to_server INTEGER DEFAULT 0,
        server_url TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (repair_id) REFERENCES repair_orders(id) ON DELETE CASCADE
      );
    `);

    // جدول PINs الموظفين
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS staff_pins (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        permissions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول صف المزامنة
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        object_type TEXT NOT NULL,
        object_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        priority INTEGER DEFAULT 2,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول اشتراكات المؤسسة (organization_subscriptions)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS organization_subscriptions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        plan_id TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        amount REAL,
        currency TEXT,
        is_auto_renew INTEGER,
        updated_at TEXT,
        created_at TEXT
      );
    `);

    // حالة الترخيص والساعة الآمنة (org-level)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_license_state (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        secure_anchor_ms INTEGER DEFAULT 0,
        last_device_time_ms INTEGER DEFAULT 0,
        last_server_time_ms INTEGER,
        last_observed_device_time_ms INTEGER DEFAULT 0,
        last_secure_ms INTEGER DEFAULT 0,
        tamper_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_app_license_state_org ON app_license_state(organization_id);
    `);

    // جدول جلسات العمل
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        staff_name TEXT,
        organization_id TEXT NOT NULL,
        
        -- معلومات النقد
        opening_cash REAL DEFAULT 0,
        closing_cash REAL,
        expected_cash REAL,
        cash_difference REAL,
        
        -- إحصائيات المبيعات
        total_sales REAL DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        cash_sales REAL DEFAULT 0,
        card_sales REAL DEFAULT 0,
        
        -- التواريخ والأوقات
        started_at TEXT NOT NULL,
        ended_at TEXT,
        paused_at TEXT,
        resumed_at TEXT,
        
        -- معلومات الإيقاف المؤقت
        pause_count INTEGER DEFAULT 0,
        total_pause_duration INTEGER DEFAULT 0,
        
        -- الحالة
        status TEXT DEFAULT 'active',
        
        -- ملاحظات
        opening_notes TEXT,
        closing_notes TEXT,
        
        -- حقول المزامنة
        synced INTEGER DEFAULT 0,
        syncStatus TEXT,
        pendingOperation TEXT,
        
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        -- Legacy fields for backward compatibility
        opening_balance REAL,
        closing_balance REAL,
        opened_at TEXT,
        closed_at TEXT
      );
    `);
    
    // إضافة الأعمدة الجديدة للجداول الموجودة (migration)
    const addColumnIfNotExists = (table, column, type, defaultValue = null) => {
      try {
        const columns = this.db.prepare(`PRAGMA table_info(${table})`).all();
        const exists = columns.some(col => col.name === column);
        if (!exists) {
          const defaultClause = defaultValue !== null ? ` DEFAULT ${defaultValue}` : '';
          this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
          console.log(`✅ [SQLite] أضيف عمود ${column} إلى جدول ${table}`);
          // Invalidate cached columns for this table so upsert sees the new column
          try { this._tableColumnsCache.delete(table); } catch {}
        }
      } catch (err) {
        console.warn(`⚠️ [SQLite] تحذير عند إضافة عمود ${column}:`, err.message);
      }
    };
    
    // Migration للأعمدة الجديدة في customer_debts
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='customer_debts'`).get()) {
      addColumnIfNotExists('customer_debts', 'discount', 'REAL', 0);
      addColumnIfNotExists('customer_debts', 'subtotal', 'REAL');
    }

    // Migration لجدول organization_subscriptions لإضافة trial/grace/source
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='organization_subscriptions'`).get()) {
      addColumnIfNotExists('organization_subscriptions', 'trial_end_date', 'TEXT');
      addColumnIfNotExists('organization_subscriptions', 'grace_end_date', 'TEXT');
      addColumnIfNotExists('organization_subscriptions', 'source', 'TEXT');
    }

    // Migration لجدول app_license_state لإضافة أعمدة المراقبة
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='app_license_state'`).get()) {
      addColumnIfNotExists('app_license_state', 'last_observed_device_time_ms', 'INTEGER', 0);
      addColumnIfNotExists('app_license_state', 'last_secure_ms', 'INTEGER', 0);
    }
    
    // Migration للأعمدة الجديدة في work_sessions
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='work_sessions'`).get()) {
      addColumnIfNotExists('work_sessions', 'opening_cash', 'REAL', 0);
      addColumnIfNotExists('work_sessions', 'closing_cash', 'REAL');
      addColumnIfNotExists('work_sessions', 'expected_cash', 'REAL');
      addColumnIfNotExists('work_sessions', 'cash_difference', 'REAL');
      addColumnIfNotExists('work_sessions', 'total_sales', 'REAL', 0);
      addColumnIfNotExists('work_sessions', 'total_orders', 'INTEGER', 0);
      addColumnIfNotExists('work_sessions', 'cash_sales', 'REAL', 0);
      addColumnIfNotExists('work_sessions', 'card_sales', 'REAL', 0);
      addColumnIfNotExists('work_sessions', 'started_at', 'TEXT');
      addColumnIfNotExists('work_sessions', 'ended_at', 'TEXT');
      addColumnIfNotExists('work_sessions', 'paused_at', 'TEXT');
      addColumnIfNotExists('work_sessions', 'resumed_at', 'TEXT');
      addColumnIfNotExists('work_sessions', 'pause_count', 'INTEGER', 0);
      addColumnIfNotExists('work_sessions', 'total_pause_duration', 'INTEGER', 0);
      addColumnIfNotExists('work_sessions', 'opening_notes', 'TEXT');
      addColumnIfNotExists('work_sessions', 'closing_notes', 'TEXT');
      addColumnIfNotExists('work_sessions', 'syncStatus', 'TEXT');
      addColumnIfNotExists('work_sessions', 'pendingOperation', 'TEXT');
      // Compatibility snake_case columns used by some query paths
      addColumnIfNotExists('work_sessions', 'sync_status', 'TEXT');
      addColumnIfNotExists('work_sessions', 'pending_operation', 'TEXT');
      
      // نسخ البيانات من الأعمدة القديمة إلى الجديدة إذا لزم الأمر
      try {
        this.db.exec(`
          UPDATE work_sessions 
          SET 
            opening_cash = COALESCE(opening_cash, opening_balance, 0),
            closing_cash = COALESCE(closing_cash, closing_balance),
            started_at = COALESCE(started_at, opened_at, created_at),
            ended_at = COALESCE(ended_at, closed_at),
            status = CASE 
              WHEN status = 'open' THEN 'active'
              WHEN status = 'closed' THEN 'closed'
              ELSE status
            END
          WHERE started_at IS NULL OR opening_cash IS NULL
        `);
      } catch (err) {
        console.warn('⚠️ [SQLite] تحذير عند نسخ البيانات:', err.message);
      }
    }

    // Migration لجدول pos_orders لإضافة pending_operation وأعمدة شائعة الاستخدام
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='pos_orders'`).get()) {
      addColumnIfNotExists('pos_orders', 'order_number', 'TEXT');
      addColumnIfNotExists('pos_orders', 'pending_operation', 'TEXT');
      addColumnIfNotExists('pos_orders', 'payment_status', 'TEXT');
      addColumnIfNotExists('pos_orders', 'subtotal', 'REAL');
      addColumnIfNotExists('pos_orders', 'discount', 'REAL');
      addColumnIfNotExists('pos_orders', 'amount_paid', 'REAL');
      addColumnIfNotExists('pos_orders', 'remaining_amount', 'REAL');
      addColumnIfNotExists('pos_orders', 'consider_remaining_as_partial', 'INTEGER');
      addColumnIfNotExists('pos_orders', 'remote_order_id', 'TEXT');
      addColumnIfNotExists('pos_orders', 'remote_customer_order_number', 'INTEGER');
      addColumnIfNotExists('pos_orders', 'total', 'REAL');
      addColumnIfNotExists('pos_orders', 'last_sync_attempt', 'TEXT');
      addColumnIfNotExists('pos_orders', 'error', 'TEXT');
      addColumnIfNotExists('pos_orders', 'customer_name_lower', 'TEXT');
    }
    
    // Migration لجدول pos_order_items
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='pos_order_items'`).get()) {
      addColumnIfNotExists('pos_order_items', 'synced', 'INTEGER', 0);
    }

    // Migration لجدول products لضمان وجود أعمدة المزامنة
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='products'`).get()) {
      addColumnIfNotExists('products', 'sync_status', 'TEXT');
      addColumnIfNotExists('products', 'pending_operation', 'TEXT');
      addColumnIfNotExists('products', 'local_updated_at', 'TEXT');
      addColumnIfNotExists('products', 'server_updated_at', 'TEXT');
      addColumnIfNotExists('products', 'metadata', 'TEXT');
    }

    // Migration لجدول customers لضمان وجود أعمدة المزامنة
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='customers'`).get()) {
      addColumnIfNotExists('customers', 'sync_status', 'TEXT');
      addColumnIfNotExists('customers', 'pending_operation', 'TEXT');
      addColumnIfNotExists('customers', 'local_updated_at', 'TEXT');
      addColumnIfNotExists('customers', 'name_lower', 'TEXT');
      addColumnIfNotExists('customers', 'email_lower', 'TEXT');
      addColumnIfNotExists('customers', 'phone_digits', 'TEXT');
      // Backfill lowercased/search columns for existing rows
      try {
        this.db.exec(`
          UPDATE customers 
          SET 
            name_lower = COALESCE(name_lower, LOWER(name)),
            email_lower = COALESCE(email_lower, LOWER(email)),
            phone_digits = COALESCE(
              phone_digits,
              REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(phone, ''), ' ', ''), '-', ''), '(', ''), ')', '')
            )
          WHERE name IS NOT NULL AND (
            name_lower IS NULL OR email_lower IS NULL OR phone_digits IS NULL
          );
        `);
      } catch (e) {
        console.warn('[SQLite] Backfill customers lower fields warning:', e?.message || e);
      }
    }

    // Migration لجدول customer_debts لضمان وجود pending_operation
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='customer_debts'`).get()) {
      addColumnIfNotExists('customer_debts', 'pending_operation', 'TEXT');
      addColumnIfNotExists('customer_debts', 'customer_name', 'TEXT');
      addColumnIfNotExists('customer_debts', 'order_id', 'TEXT');
      addColumnIfNotExists('customer_debts', 'order_number', 'TEXT');
      addColumnIfNotExists('customer_debts', 'total_amount', 'REAL');
      addColumnIfNotExists('customer_debts', 'paid_amount', 'REAL');
      addColumnIfNotExists('customer_debts', 'remaining_amount', 'REAL');
      addColumnIfNotExists('customer_debts', 'due_date', 'TEXT');
      addColumnIfNotExists('customer_debts', 'notes', 'TEXT');
    }

    // Migration لجدول invoices لإضافة جميع الأعمدة الجديدة
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'`).get()) {
      addColumnIfNotExists('invoices', 'invoice_number_lower', 'TEXT');
      addColumnIfNotExists('invoices', 'remote_invoice_id', 'TEXT');
      addColumnIfNotExists('invoices', 'customer_name', 'TEXT');
      addColumnIfNotExists('invoices', 'customer_name_lower', 'TEXT');
      addColumnIfNotExists('invoices', 'invoice_date', 'TEXT');
      addColumnIfNotExists('invoices', 'due_date', 'TEXT');
      addColumnIfNotExists('invoices', 'source_type', 'TEXT');
      addColumnIfNotExists('invoices', 'payment_method', 'TEXT');
      addColumnIfNotExists('invoices', 'payment_status', 'TEXT');
      addColumnIfNotExists('invoices', 'notes', 'TEXT');
      addColumnIfNotExists('invoices', 'tax_amount', 'REAL', 0);
      addColumnIfNotExists('invoices', 'discount_amount', 'REAL', 0);
      addColumnIfNotExists('invoices', 'subtotal_amount', 'REAL', 0);
      addColumnIfNotExists('invoices', 'shipping_amount', 'REAL');
      addColumnIfNotExists('invoices', 'discount_type', 'TEXT');
      addColumnIfNotExists('invoices', 'discount_percentage', 'REAL');
      addColumnIfNotExists('invoices', 'tva_rate', 'REAL');
      addColumnIfNotExists('invoices', 'amount_ht', 'REAL');
      addColumnIfNotExists('invoices', 'amount_tva', 'REAL');
      addColumnIfNotExists('invoices', 'amount_ttc', 'REAL');
      addColumnIfNotExists('invoices', 'pending_operation', 'TEXT');
      addColumnIfNotExists('invoices', 'local_created_at', 'TEXT');
    }

    // Migration لجدول invoice_items لإضافة جميع الأعمدة الجديدة
    if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='invoice_items'`).get()) {
      addColumnIfNotExists('invoice_items', 'name', 'TEXT');
      addColumnIfNotExists('invoice_items', 'description', 'TEXT');
      addColumnIfNotExists('invoice_items', 'total_price', 'REAL');
      addColumnIfNotExists('invoice_items', 'type', 'TEXT', "'product'");
      addColumnIfNotExists('invoice_items', 'sku', 'TEXT');
      addColumnIfNotExists('invoice_items', 'barcode', 'TEXT');
      addColumnIfNotExists('invoice_items', 'tva_rate', 'REAL');
      addColumnIfNotExists('invoice_items', 'unit_price_ht', 'REAL');
      addColumnIfNotExists('invoice_items', 'unit_price_ttc', 'REAL');
      addColumnIfNotExists('invoice_items', 'total_ht', 'REAL');
      addColumnIfNotExists('invoice_items', 'total_tva', 'REAL');
      addColumnIfNotExists('invoice_items', 'total_ttc', 'REAL');
      addColumnIfNotExists('invoice_items', 'synced', 'INTEGER', 0);
      
      // Backfill name from product_name if it exists
      try {
        this.db.exec(`
          UPDATE invoice_items
          SET name = COALESCE(name, product_name)
          WHERE product_name IS NOT NULL AND name IS NULL;
        `);
      } catch (e) {
        console.warn('[SQLite] Backfill invoice_items.name warning:', e?.message || e);
      }
    }

    // Backfill pos_orders.customer_name_lower for existing rows
    try {
      if (this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='pos_orders'`).get()) {
        this.db.exec(`
          UPDATE pos_orders
          SET customer_name_lower = COALESCE(customer_name_lower, LOWER(customer_name))
          WHERE customer_name IS NOT NULL AND customer_name_lower IS NULL;
        `);
      }
    } catch (e) {
      console.warn('[SQLite] Backfill pos_orders.customer_name_lower warning:', e?.message || e);
    }

    // جداول إرجاعات المنتجات (product_returns, return_items)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS product_returns (
        id TEXT PRIMARY KEY,
        return_number TEXT NOT NULL,
        return_number_lower TEXT,
        remote_return_id TEXT,
        original_order_id TEXT,
        original_order_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        customer_name_lower TEXT,
        customer_phone TEXT,
        return_type TEXT,
        return_reason TEXT,
        return_reason_description TEXT,
        original_total REAL,
        return_amount REAL,
        refund_amount REAL,
        restocking_fee REAL,
        status TEXT,
        processed_by TEXT,
        processed_at TEXT,
        approved_by TEXT,
        approved_at TEXT,
        refund_method TEXT,
        notes TEXT,
        organization_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS return_items (
        id TEXT PRIMARY KEY,
        return_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT,
        product_sku TEXT,
        return_quantity INTEGER,
        return_unit_price REAL,
        total_return_amount REAL,
        condition_status TEXT,
        resellable INTEGER,
        inventory_returned INTEGER,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // جداول الخسائر (loss_declarations, loss_items)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS loss_declarations (
        id TEXT PRIMARY KEY,
        loss_number TEXT NOT NULL,
        loss_number_lower TEXT,
        remote_loss_id TEXT,
        loss_type TEXT,
        loss_category TEXT,
        loss_description TEXT,
        incident_date TEXT,
        reported_by TEXT,
        status TEXT,
        approved_by TEXT,
        approved_at TEXT,
        total_cost_value REAL,
        total_selling_value REAL,
        total_items_count INTEGER,
        notes TEXT,
        organization_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS loss_items (
        id TEXT PRIMARY KEY,
        loss_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT,
        product_sku TEXT,
        lost_quantity INTEGER,
        unit_cost_price REAL,
        unit_selling_price REAL,
        total_cost_value REAL,
        total_selling_value REAL,
        loss_condition TEXT,
        inventory_adjusted INTEGER,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // جداول الفئات والفئات الفرعية
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT,
        icon TEXT,
        image_url TEXT,
        is_active INTEGER,
        type TEXT,
        organization_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS product_subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT,
        is_active INTEGER,
        organization_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE
      );
    `);

    // جدول الموظفين/المستخدمين المحلي
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        role TEXT,
        is_active INTEGER,
        organization_id TEXT,
        permissions TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // جداول الكاش للأوفلاين (بدلاً من IndexedDB/localforage)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_init_cache (
        id TEXT PRIMARY KEY, -- key: app-init:{userId}:{organizationId}
        user_id TEXT,
        organization_id TEXT,
        data TEXT NOT NULL, -- JSON
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pos_offline_cache (
        id TEXT PRIMARY KEY, -- cache key
        organization_id TEXT,
        page INTEGER,
        page_limit INTEGER,
        search TEXT,
        category_id TEXT,
        data TEXT NOT NULL, -- JSON
        timestamp TEXT NOT NULL
      );
    `);

    // تخزين عام (Key-Value) للجلسة وغيرها: auth_storage
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_storage (
        id TEXT PRIMARY KEY, -- storage key
        value TEXT NOT NULL, -- stringified JSON
        updated_at TEXT NOT NULL
      );
    `);

    // جدول المخزون (inventory)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        organization_id TEXT
      );
    `);

    // جدول المعاملات (transactions)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        quantity INTEGER NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        source_id TEXT,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 🔒 جدول التضاربات (conflicts) - لتسجيل ومتابعة جميع التضاربات أثناء المزامنة
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL, -- 'product', 'customer', 'invoice', 'order'
        entity_id TEXT NOT NULL,

        -- النسخ المتضاربة
        local_version TEXT NOT NULL,     -- JSON
        server_version TEXT NOT NULL,    -- JSON

        -- تفاصيل التضارب
        conflict_fields TEXT NOT NULL,   -- JSON array of field names
        severity INTEGER NOT NULL,       -- 0-100

        -- الحل
        resolution TEXT NOT NULL,        -- 'server_wins', 'client_wins', 'merge', 'manual'
        resolved_version TEXT NOT NULL,  -- JSON
        resolved_by TEXT,                -- user ID (for manual resolutions)

        -- Timestamps
        detected_at TEXT NOT NULL,
        resolved_at TEXT NOT NULL,
        user_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,

        local_timestamp TEXT NOT NULL,
        server_timestamp TEXT NOT NULL,

        -- ملاحظات اختيارية
        notes TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SQLite] All tables created');
  }

  /**
   * إنشاء جداول مبسطة خاصة بقاعدة "global" فقط
   * تستخدم لتخزين جلسة Supabase وبعض الكاشات الخفيفة
   */
  createGlobalTables() {
    // auth_storage فقط كافٍ لعملية تسجيل الدخول/الجلسة
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_storage (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_auth_storage_updated ON auth_storage(updated_at);
    `);

    // اختياري: app_init_cache للقراءة الاحتياطية إن لزم
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_init_cache (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        organization_id TEXT,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // حالة الترخيص والساعة الآمنة (Sticky Clock)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_license_state (
        id TEXT PRIMARY KEY,              -- organization_id أو 'global'
        organization_id TEXT,
        secure_anchor_ms INTEGER DEFAULT 0,
        last_device_time_ms INTEGER DEFAULT 0,
        last_server_time_ms INTEGER,
        tamper_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_app_license_state_org ON app_license_state(organization_id);
    `);

    // تخزين بيانات الاعتماد للأوفلاين (حسب البريد الإلكتروني)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id TEXT PRIMARY KEY,
        email TEXT,
        email_lower TEXT UNIQUE,
        salt TEXT NOT NULL,
        hash TEXT NOT NULL,
        algo TEXT,
        fallback_hash TEXT,
        user_id TEXT,
        organization_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_success_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_user_credentials_email_lower ON user_credentials(email_lower);
    `);

    console.log('[SQLite] Global tables created');
  }

  /**
   * ترحيل schema - إضافة أعمدة جديدة للجداول الموجودة
   */
  migrateSchema() {
    try {
      // التحقق من وجود عمود thumbnail_image
      const columnsResult = this.db.prepare("PRAGMA table_info(products)").all();
      const hasThumbColumn = columnsResult.some(col => col.name === 'thumbnail_image');
      const hasImagesColumn = columnsResult.some(col => col.name === 'images');

      let columnsAdded = false;

      // إضافة عمود thumbnail_image إذا لم يكن موجوداً
      if (!hasThumbColumn) {
        console.log('[SQLite] Adding thumbnail_image column to products table');
        this.db.exec(`ALTER TABLE products ADD COLUMN thumbnail_image TEXT`);
        columnsAdded = true;
      }

      // إضافة عمود images إذا لم يكن موجوداً
      if (!hasImagesColumn) {
        console.log('[SQLite] Adding images column to products table');
        this.db.exec(`ALTER TABLE products ADD COLUMN images TEXT`);
        columnsAdded = true;
      }

      // 🔥 CRITICAL FIX: Clear the column cache so upsert sees the new columns
      if (columnsAdded) {
        this._tableColumnsCache.delete('products');
        console.log('[SQLite] ✅ Cleared products table column cache - new columns will be recognized');
      }

      console.log('[SQLite] Schema migration completed');
    } catch (error) {
      console.warn('[SQLite] Schema migration warning:', error?.message || error);
    }
  }

  /**
   * إنشاء الفهارس
   */
  createIndexes() {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE category_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, organization_id);
      CREATE INDEX IF NOT EXISTS idx_products_sync ON products(synced, pending_operation);
      -- ⚡ فهرس مركّب لفرز المنتجات حسب الاسم (تحسين 50-200%)
      CREATE INDEX IF NOT EXISTS idx_products_org_name ON products(organization_id, name_normalized);

      CREATE INDEX IF NOT EXISTS idx_orders_org ON pos_orders(organization_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON pos_orders(customer_id) WHERE customer_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_date ON pos_orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_sync ON pos_orders(synced, sync_status);
      CREATE INDEX IF NOT EXISTS idx_orders_session ON pos_orders(work_session_id) WHERE work_session_id IS NOT NULL;
      -- ⚡ فهرس مركّب لفلترة الطلبات حسب التاريخ والحالة
      CREATE INDEX IF NOT EXISTS idx_orders_org_date_status ON pos_orders(organization_id, created_at, status);
      -- ⚡ فهرس مركّب للبحث عن الطلبات باسم العميل
      CREATE INDEX IF NOT EXISTS idx_orders_org_customer_name_lower ON pos_orders(organization_id, customer_name_lower);

      CREATE INDEX IF NOT EXISTS idx_order_items_order ON pos_order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON pos_order_items(product_id);

      CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_customers_debt ON customers(total_debt) WHERE total_debt > 0;
      -- ⚡ فهارس بحث سريعة للعملاء
      CREATE INDEX IF NOT EXISTS idx_customers_org_name_lower ON customers(organization_id, name_lower);
      CREATE INDEX IF NOT EXISTS idx_customers_org_email_lower ON customers(organization_id, email_lower);
      CREATE INDEX IF NOT EXISTS idx_customers_org_phone_digits ON customers(organization_id, phone_digits);

      CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id) WHERE customer_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_debts_customer ON customer_debts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_debts_org ON customer_debts(organization_id);
      CREATE INDEX IF NOT EXISTS idx_debts_order ON customer_debts(order_id);
      CREATE INDEX IF NOT EXISTS idx_debts_status ON customer_debts(status);

      CREATE INDEX IF NOT EXISTS idx_repairs_org ON repair_orders(organization_id);
      CREATE INDEX IF NOT EXISTS idx_repairs_customer ON repair_orders(customer_id) WHERE customer_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_repair_images_repair ON repair_images(repair_id);

      CREATE INDEX IF NOT EXISTS idx_staff_pins_org ON staff_pins(organization_id, is_active);

      CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority, created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_object ON sync_queue(object_type, object_id);

      CREATE INDEX IF NOT EXISTS idx_sessions_org ON work_sessions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON work_sessions(status);

      CREATE INDEX IF NOT EXISTS idx_product_returns_org ON product_returns(organization_id);
      CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
      CREATE INDEX IF NOT EXISTS idx_loss_declarations_org ON loss_declarations(organization_id);
      CREATE INDEX IF NOT EXISTS idx_loss_items_loss ON loss_items(loss_id);

      CREATE INDEX IF NOT EXISTS idx_user_permissions_auth ON user_permissions(auth_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_permissions_org ON user_permissions(organization_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_auth_org ON user_permissions(auth_user_id, organization_id);

      -- فهارس الفئات
      CREATE INDEX IF NOT EXISTS idx_categories_org ON product_categories(organization_id);
      CREATE INDEX IF NOT EXISTS idx_categories_slug ON product_categories(slug);
      CREATE INDEX IF NOT EXISTS idx_subcategories_org ON product_subcategories(organization_id);
      CREATE INDEX IF NOT EXISTS idx_subcategories_category ON product_subcategories(category_id);
      CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
      CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
      CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);

      -- فهارس جداول الكاش
      CREATE INDEX IF NOT EXISTS idx_app_init_cache_user_org ON app_init_cache(user_id, organization_id);
      CREATE INDEX IF NOT EXISTS idx_pos_offline_cache_org ON pos_offline_cache(organization_id);
      CREATE INDEX IF NOT EXISTS idx_auth_storage_updated ON auth_storage(updated_at);

      -- ⚡ فهارس المخزون والمعاملات (تحسينات جديدة)
      CREATE INDEX IF NOT EXISTS idx_inventory_product_variant ON inventory(product_id, variant_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(product_id, synced);
      CREATE INDEX IF NOT EXISTS idx_transactions_product_sync ON transactions(product_id, synced, timestamp);

      -- 🔒 فهارس جدول التضاربات (conflicts)
      CREATE INDEX IF NOT EXISTS idx_conflicts_entity ON conflicts(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_conflicts_org ON conflicts(organization_id);
      CREATE INDEX IF NOT EXISTS idx_conflicts_detected ON conflicts(detected_at);
      CREATE INDEX IF NOT EXISTS idx_conflicts_resolution ON conflicts(resolution);
      CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON conflicts(severity);

      -- فهارس الاشتراكات
      CREATE INDEX IF NOT EXISTS idx_org_subs_end ON organization_subscriptions(organization_id, end_date);
      CREATE INDEX IF NOT EXISTS idx_org_subs_status ON organization_subscriptions(organization_id, status);
    `);

    console.log('[SQLite] All indexes created');
  }

  /**
   * تفعيل البحث النصي الكامل
   */
  enableFullTextSearch() {
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS products_fts
        USING fts5(id UNINDEXED, name, sku, barcode, content=products, content_rowid=rowid);

        CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
          INSERT INTO products_fts(rowid, id, name, sku, barcode)
          VALUES (new.rowid, new.id, new.name, new.sku, new.barcode);
        END;

        CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products BEGIN
          UPDATE products_fts SET name = new.name, sku = new.sku, barcode = new.barcode WHERE rowid = new.rowid;
        END;

        CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
          DELETE FROM products_fts WHERE rowid = old.rowid;
        END;

        CREATE VIRTUAL TABLE IF NOT EXISTS customers_fts
        USING fts5(id UNINDEXED, name, phone, content=customers, content_rowid=rowid);

        CREATE TRIGGER IF NOT EXISTS customers_fts_insert AFTER INSERT ON customers BEGIN
          INSERT INTO customers_fts(rowid, id, name, phone) VALUES (new.rowid, new.id, new.name, new.phone);
        END;

        CREATE TRIGGER IF NOT EXISTS customers_fts_update AFTER UPDATE ON customers BEGIN
          UPDATE customers_fts SET name = new.name, phone = new.phone WHERE rowid = new.rowid;
        END;

        CREATE TRIGGER IF NOT EXISTS customers_fts_delete AFTER DELETE ON customers BEGIN
          DELETE FROM customers_fts WHERE rowid = old.rowid;
        END;
      `);
      console.log('[SQLite] FTS enabled');
    } catch (error) {
      console.error('[SQLite] FTS error:', error);
    }
  }

  /**
   * دوال عامة للعمليات CRUD
   */

  // INSERT or UPDATE
  upsert(table, data) {
    try {
      // معالجة خاصة لجدول products - حفظ colors/sizes/images في metadata
      if (table === 'products' && data) {
        const extraFields = {};
        if (data.colors) extraFields.colors = data.colors;
        if (data.sizes) extraFields.sizes = data.sizes;
        if (data.images) extraFields.images = data.images;
        if (data.variants) extraFields.variants = data.variants;
        if (data.product_colors) extraFields.product_colors = data.product_colors;
        if (data.product_sizes) extraFields.product_sizes = data.product_sizes;
        if (data.product_images) extraFields.product_images = data.product_images;

        if (Object.keys(extraFields).length > 0) {
          // دمج مع metadata الموجود
          let metadata = {};
          if (data.metadata && typeof data.metadata === 'object') {
            metadata = { ...data.metadata };
          } else if (data.metadata && typeof data.metadata === 'string') {
            try {
              metadata = JSON.parse(data.metadata);
            } catch (e) {
              metadata = {};
            }
          }

          metadata = { ...metadata, ...extraFields };
          data.metadata = JSON.stringify(metadata);

          console.log(`[SQLite] حفظ منتج مع بيانات إضافية:`, {
            productId: data.id,
            productName: data.name,
            extraFieldsKeys: Object.keys(extraFields),
            hasColors: !!extraFields.colors,
            hasSizes: !!extraFields.sizes,
            hasImages: !!extraFields.images,
            hasVariants: !!extraFields.variants
          });
        }

        // تطبيع اسم المنتج للبحث العربي
        if (data.name) {
          data.name_normalized = this.normalizeArabicText(data.name);
        }
      }

      // helper: camelCase -> snake_case
      const toSnake = (s) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

      // Ensure columns cache is present
      // Special-case: ensure id exists for pos_settings using organization_id
      if (table === 'pos_settings' && data && data.id == null && data.organization_id) {
        data = { id: data.organization_id, ...data };
      }

      // Normalize values for SQLite binding
      const normalizeValue = (v) => {
        if (v === undefined) return null;
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (typeof v === 'object' && v !== null && !Buffer.isBuffer(v)) {
          try { return JSON.stringify(v); } catch { return String(v); }
        }
        return v;
      };

      // Filter keys to existing columns to avoid "no such column" errors
      if (!this._tableColumnsCache.has(table)) {
        const cols = this.db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
        this._tableColumnsCache.set(table, cols);
        this._touchCache(table);
      } else {
        // تحديث timestamp الوصول
        this._touchCache(table);
      }
      const tableColumns = this._tableColumnsCache.get(table) || [];
      // Map camelCase keys to snake_case if needed, and include only known columns
      const entries = Object.entries(data || {});
      const mapped = entries.map(([k, v]) => {
        if (tableColumns.includes(k)) return [k, v];
        const sk = toSnake(k);
        if (tableColumns.includes(sk)) return [sk, v];
        return null;
      }).filter(Boolean);

      // Auto-fill organization_id if required and not provided
      const safeObj = Object.fromEntries(mapped);

      // 🖼️ Debug logging for image fields in products table
      if (table === 'products' && (data.thumbnail_image || data.images)) {
        console.log('🖼️ [SQLite upsert] Saving product with images:', {
          productId: data.id,
          productName: data.name,
          thumbnail_image_input: data.thumbnail_image,
          thumbnail_image_mapped: safeObj.thumbnail_image,
          images_input: data.images,
          images_mapped: safeObj.images,
          tableColumns_includes_thumbnail: tableColumns.includes('thumbnail_image'),
          tableColumns_includes_images: tableColumns.includes('images'),
          totalColumns: tableColumns.length
        });
      }
      if (tableColumns.includes('organization_id') && safeObj.organization_id == null && this.currentOrganizationId) {
        safeObj.organization_id = this.currentOrganizationId;
      }

      // Special fallbacks for pos_orders required columns
      if (table === 'pos_orders') {
        const nowISO = new Date().toISOString();
        const raw = data || {};
        // order_number
        if (tableColumns.includes('order_number')) {
          if (!safeObj.order_number) {
            const ln = raw.local_order_number_str || raw.localOrderNumberStr || (raw.local_order_number != null ? String(raw.local_order_number) : null) || (safeObj.local_order_number != null ? String(safeObj.local_order_number) : null);
            const rn = raw.remote_customer_order_number != null ? String(raw.remote_customer_order_number) : (raw.remoteCustomerOrderNumber != null ? String(raw.remoteCustomerOrderNumber) : null) || (safeObj.remote_customer_order_number != null ? String(safeObj.remote_customer_order_number) : null);
            const cn = raw.customer_order_number != null ? String(raw.customer_order_number) : (raw.customerOrderNumber != null ? String(raw.customerOrderNumber) : null);
            const on = raw.order_number || raw.orderNumber || null;
            const idStr = raw.id || safeObj.id ? String(raw.id || safeObj.id) : null;
            safeObj.order_number = on || ln || rn || cn || idStr || nowISO.replace(/\D/g, '').slice(-12);
          }
        }
        // total_amount & paid_amount
        if (tableColumns.includes('total_amount') && safeObj.total_amount == null) {
          safeObj.total_amount = raw.total ?? raw.subtotal ?? safeObj.total ?? safeObj.subtotal ?? 0;
        }
        if (tableColumns.includes('paid_amount') && safeObj.paid_amount == null) {
          safeObj.paid_amount = raw.amount_paid ?? raw.amountPaid ?? safeObj.amount_paid ?? safeObj.total ?? 0;
        }
        // timestamps
        if (tableColumns.includes('created_at') && !safeObj.created_at) {
          safeObj.created_at = nowISO;
        }
        if (tableColumns.includes('updated_at') && !safeObj.updated_at) {
          safeObj.updated_at = safeObj.created_at || nowISO;
        }
        if (tableColumns.includes('local_created_at') && !safeObj.local_created_at) {
          safeObj.local_created_at = safeObj.created_at || nowISO;
        }
        // status fallback
        if (tableColumns.includes('status') && !safeObj.status) {
          safeObj.status = 'pending_sync';
        }
      }

      // Special fallbacks for invoices table
      if (table === 'invoices') {
        const nowISO = new Date().toISOString();
        // timestamps
        if (tableColumns.includes('created_at') && !safeObj.created_at) {
          safeObj.created_at = nowISO;
        }
        if (tableColumns.includes('updated_at') && !safeObj.updated_at) {
          safeObj.updated_at = safeObj.created_at || nowISO;
        }
        if (tableColumns.includes('local_created_at') && !safeObj.local_created_at) {
          safeObj.local_created_at = safeObj.created_at || nowISO;
        }
      }

      const safeData = Object.fromEntries(Object.entries(safeObj).map(([k, v]) => [k, normalizeValue(v)]));

      const keys = Object.keys(safeData);
      if (keys.length === 0) {
        return { success: true, changes: 0 };
      }

      const placeholders = keys.map(k => `@${k}`).join(', ');
      const updates = keys.map(k => `${k} = @${k}`).join(', ');

      const stmt = this.db.prepare(`
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT(id) DO UPDATE SET ${updates}
      `);

      const result = stmt.run(safeData);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error(`[SQLite] Upsert failed for ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  // دالة مساعدة لاستعادة البيانات من metadata
  restoreMetadataFields(row) {
    if (!row) return row;

    // 🖼️ Debug: Log image data for first product in results
    if (row.thumbnail_image || row.images) {
      console.log('🖼️ [SQLite query] Product with images retrieved:', {
        id: row.id,
        name: row.name,
        thumbnail_image: row.thumbnail_image,
        has_images_column: !!row.images
      });
    }

    // إذا كان الصف يحتوي على metadata
    if (row.metadata && typeof row.metadata === 'string') {
      try {
        const metadata = JSON.parse(row.metadata);
        const restoredFields = [];

        // استعادة الحقول المحفوظة في metadata
        if (metadata.colors) {
          row.colors = metadata.colors;
          restoredFields.push('colors');
        }
        if (metadata.sizes) {
          row.sizes = metadata.sizes;
          restoredFields.push('sizes');
        }
        if (metadata.images) {
          row.images = metadata.images;
          restoredFields.push('images');
        }
        if (metadata.variants) {
          row.variants = metadata.variants;
          restoredFields.push('variants');
        }
        if (metadata.product_colors) {
          row.product_colors = metadata.product_colors;
          restoredFields.push('product_colors');
        }
        if (metadata.product_sizes) {
          row.product_sizes = metadata.product_sizes;
          restoredFields.push('product_sizes');
        }
        if (metadata.product_images) {
          row.product_images = metadata.product_images;
          restoredFields.push('product_images');
        }

        // Log فقط إذا تم استعادة حقول
        if (restoredFields.length > 0) {
          console.log(`[SQLite] استعادة بيانات إضافية من metadata:`, {
            productId: row.id,
            productName: row.name,
            restoredFields: restoredFields
          });
        }
      } catch (e) {
        console.error(`[SQLite] فشل parsing metadata للمنتج ${row.id}:`, e.message);
      }
    }

    return row;
  }

  // SELECT
  query(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      let result;
      if (Array.isArray(params)) {
        // Positional parameters
        result = stmt.all(...params);
      } else {
        // Named parameters or no params
        result = stmt.all(params);
      }

      // استعادة البيانات من metadata للمنتجات
      if (sql.includes('FROM products') || sql.includes('from products')) {
        result = result.map(row => this.restoreMetadataFields(row));
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('[SQLite] Query failed:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // SELECT ONE
  queryOne(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      let result;
      if (Array.isArray(params)) {
        result = stmt.get(...params);
      } else {
        result = stmt.get(params);
      }

      // استعادة البيانات من metadata للمنتجات
      if (result && (sql.includes('FROM products') || sql.includes('from products'))) {
        result = this.restoreMetadataFields(result);
      }

      return { success: true, data: result || null };
    } catch (error) {
      console.error('[SQLite] QueryOne failed:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  // DELETE
  delete(table, id) {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`);
      const result = stmt.run(id);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error(`[SQLite] Delete failed for ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  // EXECUTE (for UPDATE/INSERT/DELETE statements)
  execute(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      let result;
      if (Array.isArray(params)) {
        // Positional parameters
        result = stmt.run(...params);
      } else {
        // Named parameters or no params
        result = stmt.run(params);
      }
      return { success: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    } catch (error) {
      console.error('[SQLite] Execute failed:', error);
      return { success: false, error: error.message, changes: 0 };
    }
  }

  // البحث السريع باستخدام FTS
  search(table, query, options = {}) {
    const { limit = 50, offset = 0, organizationId } = options;

    try {
      const ftsTable = `${table}_fts`;
      let sql = `
        SELECT t.* FROM ${table} t
        INNER JOIN ${ftsTable} fts ON t.id = fts.id
        WHERE fts.${ftsTable} MATCH ?
      `;

      const params = [this.prepareFTSQuery(query)];

      if (organizationId) {
        sql += ` AND t.organization_id = ?`;
        params.push(organizationId);
      }

      sql += ` ORDER BY rank LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const stmt = this.db.prepare(sql);
      let results = stmt.all(...params);

      // استعادة البيانات من metadata للمنتجات
      if (table === 'products') {
        results = results.map(row => this.restoreMetadataFields(row));
      }

      return { success: true, data: results };
    } catch (error) {
      console.error('[SQLite] Search failed:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // إضافة منتج
  addProduct(product) {
    product.name_normalized = this.normalizeArabicText(product.name);

    // حفظ الحقول الإضافية (colors, sizes, images, variants) في metadata
    const extraFields = {};
    if (product.colors) extraFields.colors = product.colors;
    if (product.sizes) extraFields.sizes = product.sizes;
    if (product.images) extraFields.images = product.images;
    if (product.variants) extraFields.variants = product.variants;
    if (product.product_colors) extraFields.product_colors = product.product_colors;
    if (product.product_sizes) extraFields.product_sizes = product.product_sizes;
    if (product.product_images) extraFields.product_images = product.product_images;

    // دمج extraFields مع metadata الموجود
    let metadata = {};
    if (product.metadata && typeof product.metadata === 'object') {
      metadata = { ...product.metadata };
    } else if (product.metadata && typeof product.metadata === 'string') {
      try {
        metadata = JSON.parse(product.metadata);
      } catch (e) {
        metadata = {};
      }
    }

    // إضافة extraFields إلى metadata
    if (Object.keys(extraFields).length > 0) {
      metadata = { ...metadata, ...extraFields };
    }

    // تحويل metadata إلى string
    if (Object.keys(metadata).length > 0) {
      product.metadata = JSON.stringify(metadata);

      // Log للمنتجات التي تحتوي على بيانات إضافية
      if (Object.keys(extraFields).length > 0) {
        console.log(`[SQLite] حفظ منتج مع بيانات إضافية:`, {
          productId: product.id,
          productName: product.name,
          extraFieldsKeys: Object.keys(extraFields),
          hasColors: !!extraFields.colors,
          hasSizes: !!extraFields.sizes,
          hasImages: !!extraFields.images,
          hasVariants: !!extraFields.variants
        });
      }
    }

    return this.upsert('products', product);
  }

  // إضافة طلب POS (مع معاملة transaction)
  addPOSOrder(order, items) {
    const transaction = this.db.transaction((order, items) => {
      // إضافة الطلب
      const orderStmt = this.db.prepare(`
        INSERT INTO pos_orders (
          id, order_number, customer_id, customer_name, total_amount,
          paid_amount, payment_method, status, organization_id,
          staff_id, work_session_id, synced, sync_status,
          local_created_at, created_at, updated_at
        ) VALUES (
          @id, @order_number, @customer_id, @customer_name, @total_amount,
          @paid_amount, @payment_method, @status, @organization_id,
          @staff_id, @work_session_id, @synced, @sync_status,
          @local_created_at, @created_at, @updated_at
        )
      `);
      orderStmt.run(order);

      // إضافة العناصر
      const itemStmt = this.db.prepare(`
        INSERT INTO pos_order_items (
          id, order_id, product_id, product_name, quantity,
          unit_price, subtotal, discount, created_at
        ) VALUES (
          @id, @order_id, @product_id, @product_name, @quantity,
          @unit_price, @subtotal, @discount, @created_at
        )
      `);

      const updateStockStmt = this.db.prepare(`
        UPDATE products
        SET stock_quantity = stock_quantity - ?,
            updated_at = ?,
            local_updated_at = ?,
            synced = 0,
            pending_operation = 'update'
        WHERE id = ?
      `);

      for (const item of items) {
        itemStmt.run(item);
        updateStockStmt.run(
          item.quantity,
          new Date().toISOString(),
          new Date().toISOString(),
          item.product_id
        );
      }
    });

    try {
      transaction(order, items);
      return { success: true };
    } catch (error) {
      console.error('[SQLite] Add POS order failed:', error);
      return { success: false, error: error.message };
    }
  }

  // إحصائيات سريعة
  getStatistics(organizationId, dateFrom, dateTo) {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          SUM(paid_amount) as total_paid,
          AVG(total_amount) as average_order_value,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM pos_orders
        WHERE organization_id = ?
          AND created_at BETWEEN ? AND ?
          AND status = 'completed'
      `);

      const stats = stmt.get(organizationId, dateFrom, dateTo);
      return { success: true, data: stats };
    } catch (error) {
      console.error('[SQLite] Statistics failed:', error);
      return { success: false, error: error.message };
    }
  }

  // تنظيف البيانات القديمة
  cleanupOldData(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    const transaction = this.db.transaction(() => {
      const ordersDeleted = this.db.prepare(`
        DELETE FROM pos_orders WHERE synced = 1 AND created_at < ?
      `).run(cutoffISO);

      const invoicesDeleted = this.db.prepare(`
        DELETE FROM invoices WHERE synced = 1 AND created_at < ?
      `).run(cutoffISO);

      return {
        ordersDeleted: ordersDeleted.changes,
        invoicesDeleted: invoicesDeleted.changes
      };
    });

    try {
      const result = transaction();
      console.log('[SQLite] Cleanup completed:', result);
      return { success: true, ...result };
    } catch (error) {
      console.error('[SQLite] Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ضغط قاعدة البيانات
  vacuum() {
    try {
      const before = this.getDatabaseSize();
      this.db.exec('VACUUM');
      const after = this.getDatabaseSize();

      console.log(`[SQLite] Vacuum: ${before}MB -> ${after}MB (saved ${(before - after).toFixed(2)}MB)`);
      return { success: true, before, after, saved: before - after };
    } catch (error) {
      console.error('[SQLite] Vacuum failed:', error);
      return { success: false, error: error.message };
    }
  }

  // حجم قاعدة البيانات
  getDatabaseSize() {
    try {
      const stats = fs.statSync(this.dbPath);
      return parseFloat((stats.size / (1024 * 1024)).toFixed(2));
    } catch (error) {
      return 0;
    }
  }

  // نسخ احتياطي
  backup(destinationPath) {
    try {
      fs.copyFileSync(this.dbPath, destinationPath);
      console.log(`[SQLite] Backup: ${destinationPath}`);
      return { success: true, path: destinationPath };
    } catch (error) {
      console.error('[SQLite] Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // استعادة
  restore(backupPath) {
    try {
      this.close();
      fs.copyFileSync(backupPath, this.dbPath);
      this.db = new Database(this.dbPath);
      console.log(`[SQLite] Restored from: ${backupPath}`);
      return { success: true };
    } catch (error) {
      console.error('[SQLite] Restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // 🔒 Conflict Resolution API
  // ========================================

  /**
   * تسجيل تضارب
   * @param {Object} conflictEntry - بيانات التضارب
   */
  logConflict(conflictEntry) {
    try {
      const {
        id,
        entityType,
        entityId,
        localVersion,
        serverVersion,
        conflictFields,
        severity,
        resolution,
        resolvedVersion,
        resolvedBy,
        detectedAt,
        resolvedAt,
        userId,
        organizationId,
        localTimestamp,
        serverTimestamp,
        notes
      } = conflictEntry;

      const stmt = this.db.prepare(`
        INSERT INTO conflicts (
          id, entity_type, entity_id,
          local_version, server_version,
          conflict_fields, severity,
          resolution, resolved_version, resolved_by,
          detected_at, resolved_at,
          user_id, organization_id,
          local_timestamp, server_timestamp,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        id,
        entityType,
        entityId,
        JSON.stringify(localVersion),
        JSON.stringify(serverVersion),
        JSON.stringify(conflictFields),
        severity,
        resolution,
        JSON.stringify(resolvedVersion),
        resolvedBy || null,
        detectedAt,
        resolvedAt,
        userId,
        organizationId,
        localTimestamp,
        serverTimestamp,
        notes || null
      );

      console.log(`[SQLite] Conflict logged: ${entityType}/${entityId} - ${resolution}`);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('[SQLite] Log conflict failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * جلب سجل التضاربات لكيان معين
   * @param {string} entityType - نوع الكيان
   * @param {string} entityId - معرف الكيان
   */
  getConflictHistory(entityType, entityId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM conflicts
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY detected_at DESC
      `);

      const rows = stmt.all(entityType, entityId);

      // تحويل JSON strings إلى objects
      const conflicts = rows.map(row => ({
        ...row,
        localVersion: JSON.parse(row.local_version),
        serverVersion: JSON.parse(row.server_version),
        conflictFields: JSON.parse(row.conflict_fields),
        resolvedVersion: JSON.parse(row.resolved_version)
      }));

      return { success: true, data: conflicts };
    } catch (error) {
      console.error('[SQLite] Get conflict history failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * جلب كل التضاربات لمنظمة معينة
   * @param {string} organizationId - معرف المنظمة
   * @param {Object} options - خيارات الفلترة
   */
  getConflicts(organizationId, options = {}) {
    try {
      const {
        entityType,
        resolution,
        minSeverity,
        dateFrom,
        dateTo,
        limit = 100,
        offset = 0
      } = options;

      let query = `SELECT * FROM conflicts WHERE organization_id = ?`;
      const params = [organizationId];

      if (entityType) {
        query += ` AND entity_type = ?`;
        params.push(entityType);
      }

      if (resolution) {
        query += ` AND resolution = ?`;
        params.push(resolution);
      }

      if (minSeverity !== undefined) {
        query += ` AND severity >= ?`;
        params.push(minSeverity);
      }

      if (dateFrom) {
        query += ` AND detected_at >= ?`;
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ` AND detected_at <= ?`;
        params.push(dateTo);
      }

      query += ` ORDER BY detected_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);

      // تحويل JSON strings إلى objects
      const conflicts = rows.map(row => ({
        ...row,
        localVersion: JSON.parse(row.local_version),
        serverVersion: JSON.parse(row.server_version),
        conflictFields: JSON.parse(row.conflict_fields),
        resolvedVersion: JSON.parse(row.resolved_version)
      }));

      return { success: true, data: conflicts, count: conflicts.length };
    } catch (error) {
      console.error('[SQLite] Get conflicts failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * إحصائيات التضاربات
   * @param {string} organizationId - معرف المنظمة
   * @param {string} dateFrom - تاريخ البداية
   * @param {string} dateTo - تاريخ النهاية
   */
  getConflictStatistics(organizationId, dateFrom, dateTo) {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as total_conflicts,
          entity_type,
          resolution,
          COUNT(*) as count,
          AVG(severity) as avg_severity,
          MAX(severity) as max_severity
        FROM conflicts
        WHERE organization_id = ?
          AND detected_at BETWEEN ? AND ?
        GROUP BY entity_type, resolution
      `);

      const stats = stmt.all(organizationId, dateFrom, dateTo);

      // إحصائيات عامة
      const totalStmt = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          AVG(severity) as avg_severity,
          COUNT(DISTINCT entity_id) as affected_entities
        FROM conflicts
        WHERE organization_id = ?
          AND detected_at BETWEEN ? AND ?
      `);

      const total = totalStmt.get(organizationId, dateFrom, dateTo);

      return {
        success: true,
        data: {
          summary: total,
          byEntityAndResolution: stats
        }
      };
    } catch (error) {
      console.error('[SQLite] Get conflict statistics failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * حذف التضاربات القديمة
   * @param {number} daysToKeep - عدد الأيام للاحتفاظ
   */
  cleanupOldConflicts(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffISO = cutoffDate.toISOString();

      const stmt = this.db.prepare(`
        DELETE FROM conflicts WHERE detected_at < ?
      `);

      const result = stmt.run(cutoffISO);

      console.log(`[SQLite] Cleaned up ${result.changes} old conflicts`);
      return { success: true, deleted: result.changes };
    } catch (error) {
      console.error('[SQLite] Cleanup old conflicts failed:', error);
      return { success: false, error: error.message };
    }
  }

  // دوال مساعدة
  normalizeArabicText(text) {
    if (!text) return '';
    return text
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي')
      .toLowerCase()
      .trim();
  }

  prepareFTSQuery(query) {
    return query
      .split(/\s+/)
      .filter(Boolean)
      .map(word => `${word}*`)
      .join(' OR ');
  }

  // إغلاق قاعدة البيانات
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('[SQLite] Database closed');
    }
  }
}

module.exports = { SQLiteManager };
