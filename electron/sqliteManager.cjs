/**
 * مدير قاعدة بيانات SQLite للتطبيق
 * يحل محل IndexedDB بنظام أقوى وأسرع
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class SQLiteManager {
  constructor(app) {
    this.app = app;
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
    this.currentOrganizationId = null;
    // Cache table columns to avoid repeated PRAGMA calls
    this._tableColumnsCache = new Map();
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
          this.createTables();
          this.createIndexes();
          this.enableFullTextSearch();
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

      this.createTables();
      this.createIndexes();
      this.enableFullTextSearch();

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
        image_thumbnail TEXT,
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
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        organization_id TEXT NOT NULL,
        staff_id TEXT,
        work_session_id TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
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
        email TEXT,
        phone TEXT,
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
        customer_id TEXT,
        total_amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        organization_id TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        local_created_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جدول عناصر الفواتير
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
    `);

    // جدول ديون العملاء
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customer_debts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'unpaid',
        organization_id TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
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

    console.log('[SQLite] All tables created');
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

      CREATE INDEX IF NOT EXISTS idx_orders_org ON pos_orders(organization_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON pos_orders(customer_id) WHERE customer_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_date ON pos_orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_sync ON pos_orders(synced, sync_status);
      CREATE INDEX IF NOT EXISTS idx_orders_session ON pos_orders(work_session_id) WHERE work_session_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_order_items_order ON pos_order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON pos_order_items(product_id);

      CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_customers_debt ON customers(total_debt) WHERE total_debt > 0;

      CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id) WHERE customer_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_debts_customer ON customer_debts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_debts_org ON customer_debts(organization_id);

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
      const results = stmt.all(...params);

      return { success: true, data: results };
    } catch (error) {
      console.error('[SQLite] Search failed:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // إضافة منتج
  addProduct(product) {
    product.name_normalized = this.normalizeArabicText(product.name);
    if (product.metadata && typeof product.metadata === 'object') {
      product.metadata = JSON.stringify(product.metadata);
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
