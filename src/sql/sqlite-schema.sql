-- بنية قاعدة بيانات SQLite للعمل دون اتصال

-- جدول سجل المزامنة
CREATE TABLE IF NOT EXISTS "sync_log" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "table_name" TEXT NOT NULL,
  "record_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "timestamp" TEXT NOT NULL,
  "synced" INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idx_sync_log_synced" ON "sync_log" ("synced");
CREATE INDEX IF NOT EXISTS "idx_sync_log_table" ON "sync_log" ("table_name");

-- جدول المستخدمين (مبسط)
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT,
  "full_name" TEXT,
  "avatar_url" TEXT,
  "role" TEXT,
  "created_at" TEXT DEFAULT (datetime('now')),
  "updated_at" TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");

-- جدول التصنيفات
CREATE TABLE IF NOT EXISTS "categories" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "parent_id" TEXT,
  "created_at" TEXT DEFAULT (datetime('now')),
  "updated_at" TEXT DEFAULT (datetime('now')),
  FOREIGN KEY ("parent_id") REFERENCES "categories" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_categories_parent" ON "categories" ("parent_id");

-- جدول المنتجات
CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" REAL,
  "stock_quantity" INTEGER DEFAULT 0,
  "category_id" TEXT,
  "image_url" TEXT,
  "barcode" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TEXT DEFAULT (datetime('now')),
  "updated_at" TEXT DEFAULT (datetime('now')),
  FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products" ("category_id");
CREATE INDEX IF NOT EXISTS "idx_products_barcode" ON "products" ("barcode");

-- جدول العملاء
CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "created_at" TEXT DEFAULT (datetime('now')),
  "updated_at" TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_customers_phone" ON "customers" ("phone");

-- جدول المبيعات (الفواتير)
CREATE TABLE IF NOT EXISTS "sales" (
  "id" TEXT PRIMARY KEY,
  "customer_id" TEXT,
  "user_id" TEXT,
  "total_amount" REAL NOT NULL,
  "discount" REAL DEFAULT 0,
  "tax" REAL DEFAULT 0,
  "payment_method" TEXT,
  "payment_status" TEXT DEFAULT 'pending',
  "notes" TEXT,
  "created_at" TEXT DEFAULT (datetime('now')),
  "updated_at" TEXT DEFAULT (datetime('now')),
  FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_sales_customer" ON "sales" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_sales_user" ON "sales" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_sales_created_at" ON "sales" ("created_at");

-- جدول تفاصيل المبيعات
CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" TEXT PRIMARY KEY,
  "sale_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" REAL NOT NULL,
  "discount" REAL DEFAULT 0,
  "created_at" TEXT DEFAULT (datetime('now')),
  "updated_at" TEXT DEFAULT (datetime('now')),
  FOREIGN KEY ("sale_id") REFERENCES "sales" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sale_items_sale" ON "sale_items" ("sale_id");
CREATE INDEX IF NOT EXISTS "idx_sale_items_product" ON "sale_items" ("product_id");

-- جدول المخزون والحركات
CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" TEXT PRIMARY KEY,
  "product_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "movement_type" TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', 'return'
  "reference_id" TEXT, -- معرف المرجع مثل رقم الفاتورة
  "notes" TEXT,
  "user_id" TEXT,
  "created_at" TEXT DEFAULT (datetime('now')),
  FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_inventory_product" ON "inventory_movements" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_movement_type" ON "inventory_movements" ("movement_type");
CREATE INDEX IF NOT EXISTS "idx_inventory_created_at" ON "inventory_movements" ("created_at"); 