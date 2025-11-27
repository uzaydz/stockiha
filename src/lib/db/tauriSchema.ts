import { tauriExecute, tauriQuery } from './tauriSqlClient';

// إصدار الـ schema - قم بزيادته عند أي تغيير في بنية الجداول
// v20: إضافة أعمدة last_sync_attempt و product_colors و product_sizes لجدول products
// v21: إضافة جدول sync_metadata للتزامن التدريجي (Incremental Sync)
// v22: إضافة عمود last_sync_attempt لجدول customers
// v23: إضافة جداول Retry Logic + Conflict Resolution + Offline Images
// v24: إضافة جدول expense_categories
// v25: إضافة جدول user_credentials لتسجيل الدخول الأوفلاين
// v26: إضافة جدول employees للموظفين
// v27: إضافة جدول sync_outbox لـ Delta Sync
// v28: إضافة عمود additional_images لجدول products
// v29: إضافة جداول الإشعارات للأوفلاين (cached_notifications, notification_sync_queue)
// v30: إضافة عمود wholesale_tiers لجدول products
// v31: إضافة عمود advancedSettings لجدول products
// v32: إضافة أعمدة marketingSettings, special_offers_config, advanced_description, publication_mode, colors
// v33: إضافة جداول product_advanced_settings, product_marketing_settings, product_wholesale_tiers
// v34: إضافة جداول الموردين (suppliers, supplier_contacts, supplier_purchases, supplier_payments)
// v35: إضافة أعمدة created_by و updated_by لجدول suppliers
const SCHEMA_VERSION = 35;

async function exec(orgId: string, sql: string) {
  await tauriExecute(orgId, sql, []);
}

// حفظ وجلب إصدار الـ schema
async function getSchemaVersion(orgId: string): Promise<number> {
  try {
    await exec(orgId, `CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER PRIMARY KEY);`);
    const res = await tauriQuery(orgId, `SELECT version FROM _schema_version LIMIT 1;`, []);
    if (res.success && res.data && res.data.length > 0) {
      return res.data[0].version || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

async function setSchemaVersion(orgId: string, version: number): Promise<void> {
  try {
    await exec(orgId, `DELETE FROM _schema_version;`);
    await tauriExecute(orgId, `INSERT INTO _schema_version (version) VALUES (?);`, [version]);
  } catch (error) {
    console.error('[TauriSQLite] Failed to set schema version:', error);
  }
}

async function columnExists(orgId: string, table: string, column: string): Promise<boolean> {
  try {
    const res = await tauriQuery(orgId, `PRAGMA table_info(${table});`, []);
    if (!res.success || !Array.isArray(res.data)) return false;
    return res.data.some((row: any) => row?.name === column);
  } catch {
    return false;
  }
}

async function tableExists(orgId: string, table: string): Promise<boolean> {
  try {
    const res = await tauriQuery(orgId, `SELECT name FROM sqlite_master WHERE type='table' AND name=?;`, [table]);
    return res.success && res.data && res.data.length > 0;
  } catch {
    return false;
  }
}

async function addColumnIfNotExists(orgId: string, table: string, column: string, definition: string) {
  try {
    const exists = await columnExists(orgId, table, column);
    if (exists) return;
  } catch {}

  try {
    await tauriExecute(orgId, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, []);
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.includes('duplicate column name') || msg.includes('already exists')) {
      return;
    }
    try {
      console.error('[TauriSQLite] addColumnIfNotExists failed:', { table, column, error });
    } catch {}
  }
}

// تتبع الجداول التي تم إعادة بنائها في هذه الجلسة
const rebuiltTablesThisSession = new Set<string>();

// إعادة بناء جدول لتحديث القيود (مثل إزالة NOT NULL)
// forceRebuild = true فقط عند ترقية schema، وليس في كل تشغيل
async function rebuildTableIfNeeded(orgId: string, tableName: string, newTableDef: string, columnsToMigrate: string[], forceRebuild: boolean = false): Promise<void> {
  try {
    // إذا لم يكن هناك ترقية للـ schema، لا حاجة لإعادة البناء
    if (!forceRebuild) return;

    // تجنب إعادة بناء الجدول نفسه مرتين في نفس الجلسة
    const tableKey = `${orgId}:${tableName}`;
    if (rebuiltTablesThisSession.has(tableKey)) return;

    const exists = await tableExists(orgId, tableName);
    if (!exists) return; // الجدول غير موجود، سيتم إنشاؤه لاحقاً

    // تحقق إذا كان الجدول يحتاج لإعادة بناء (مثلاً فحص القيود)
    const res = await tauriQuery(orgId, `PRAGMA table_info(${tableName});`, []);
    if (!res.success || !res.data) return;

    // الأعمدة التي يجب ألا تكون NOT NULL
    const columnsToCheck = [
      'organization_id', 'local_updated_at', 'local_created_at',
      'order_number', 'created_at', 'updated_at',
      'name', 'price', 'product_name', 'unit_price', 'quantity',
      'customer_name', 'total_amount', 'invoice_number', 'amount',
      'staff_id', 'started_at', // أعمدة work_sessions
      'loss_id', 'product_id', 'color_id', 'size_id' // أعمدة loss_items
    ];

    // فحص إذا كانت بعض الأعمدة لها notnull=1 وتحتاج للتحديث
    const hasNotNullConstraints = res.data.some((col: any) =>
      columnsToCheck.includes(col.name) && col.notnull === 1
    );

    if (!hasNotNullConstraints) {
      rebuiltTablesThisSession.add(tableKey);
      return;
    }

    console.log(`[TauriSQLite] إعادة بناء جدول ${tableName} لتحديث القيود...`);

    // إنشاء جدول مؤقت جديد
    const tempTable = `${tableName}_temp_rebuild`;

    // حذف الجدول المؤقت إذا كان موجوداً من محاولة سابقة فاشلة
    try {
      await exec(orgId, `DROP TABLE IF EXISTS ${tempTable};`);
    } catch {}

    await exec(orgId, newTableDef.replace(tableName, tempTable));

    // الحصول على الأعمدة الموجودة فعلياً في الجدول
    const existingCols = res.data.map((col: any) => col.name);
    const colsToMigrate = columnsToMigrate.filter(col => existingCols.includes(col));

    // نسخ البيانات
    const colList = colsToMigrate.join(', ');
    if (colsToMigrate.length > 0) {
      await exec(orgId, `INSERT OR IGNORE INTO ${tempTable} (${colList}) SELECT ${colList} FROM ${tableName};`);
    }

    // حذف الجدول القديم
    await exec(orgId, `DROP TABLE ${tableName};`);

    // إعادة تسمية الجدول المؤقت
    await exec(orgId, `ALTER TABLE ${tempTable} RENAME TO ${tableName};`);

    rebuiltTablesThisSession.add(tableKey);
    console.log(`[TauriSQLite] ✅ تم إعادة بناء جدول ${tableName} بنجاح`);
  } catch (error) {
    console.error(`[TauriSQLite] فشل في إعادة بناء جدول ${tableName}:`, error);
  }
}

export async function ensureTauriSchema(organizationId: string): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    console.log(`[TauriSQLite] ⏳ بدء تهيئة schema للمؤسسة ${organizationId.slice(0, 8)}...`);

    // فحص إصدار الـ schema وإجبار إعادة البناء إذا تغير
    const currentVersion = await getSchemaVersion(organizationId);
    const needsSchemaUpgrade = currentVersion < SCHEMA_VERSION;

    if (needsSchemaUpgrade) {
      console.log(`[TauriSQLite] 🔄 ترقية schema من ${currentVersion} إلى ${SCHEMA_VERSION}...`);
    } else {
      console.log(`[TauriSQLite] ✅ schema في الإصدار الحالي (${SCHEMA_VERSION})`);
    }

    // تعريف جدول المنتجات الجديد بدون قيود NOT NULL للتوافق مع البيانات من الخادم
    const productsTableDef = `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT DEFAULT '',
        name_normalized TEXT,
        sku TEXT,
        barcode TEXT,
        price REAL DEFAULT 0,
        cost REAL DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        category_id TEXT,
        is_active INTEGER DEFAULT 1,
        thumbnail_image TEXT,
        image_thumbnail TEXT,
        images TEXT,
        description TEXT,
        organization_id TEXT DEFAULT '',
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT DEFAULT '',
        server_updated_at TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT '',
        thumbnail_base64 TEXT,
        images_base64 TEXT
      )
    `;

    // إعادة بناء جدول products إذا كان يحتوي على قيود NOT NULL قديمة
    await rebuildTableIfNeeded(organizationId, 'products', productsTableDef, [
      'id', 'name', 'name_normalized', 'sku', 'barcode', 'price', 'cost',
      'stock_quantity', 'category_id', 'is_active', 'thumbnail_image',
      'image_thumbnail', 'images', 'description', 'organization_id',
      'synced', 'sync_status', 'pending_operation', 'local_updated_at',
      'server_updated_at', 'metadata', 'created_at', 'updated_at',
      'thumbnail_base64', 'images_base64'
    ], needsSchemaUpgrade);

    // المنتجات - إنشاء الجدول إذا لم يكن موجوداً
    await exec(organizationId, productsTableDef + ';');

    await addColumnIfNotExists(organizationId, 'products', 'compare_at_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'name_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'nameLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'category', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'subcategory', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'brand', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'features', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'specifications', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'is_digital', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'digital_file_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'digital_file_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'max_downloads', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'download_expiry_days', 'INTEGER');
    // دعم camelCase للتوافق
    await addColumnIfNotExists(organizationId, 'products', 'isDigital', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'digitalFileUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'digitalFileType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'maxDownloads', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'downloadExpiryDays', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'compareAtPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'stockQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'categoryId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'isActive', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'thumbnailImage', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'imageThumbnail', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'localUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'serverUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'thumbnailBase64', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'imagesBase64', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'product_images', 'TEXT'); // ⚡ صور المنتج (JSON array)
    await addColumnIfNotExists(organizationId, 'products', 'productImages', 'TEXT'); // ⚡ camelCase version
    await addColumnIfNotExists(organizationId, 'products', 'nameNormalized', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'short_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'subcategory_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'product_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'unit', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'dimensions', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'has_variants', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'variants', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'min_stock_alert', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'track_inventory', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'allow_backorder', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'is_featured', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'display_order', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'tags', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'seo_title', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'seo_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'is_new', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'isNew', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'new_until', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'newUntil', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'on_sale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'onSale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'sale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'salePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'sale_start', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'saleStart', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'sale_end', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'saleEnd', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'purchase_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'purchasePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'min_stock_level', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'minStockLevel', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'reorder_level', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'reorderLevel', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'reorder_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'reorderQuantity', 'INTEGER');
    // أعمدة إضافية من Supabase للمنتجات
    await addColumnIfNotExists(organizationId, 'products', 'slug', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'hasVariants', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'show_price_on_landing', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'showPriceOnLanding', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'wholesale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'wholesalePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'partial_wholesale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'partialWholesalePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'min_wholesale_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'minWholesaleQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'min_partial_wholesale_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'minPartialWholesaleQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'allow_retail', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'allowRetail', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'allow_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'allowWholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'allow_partial_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'allowPartialWholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'last_inventory_update', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'lastInventoryUpdate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'use_sizes', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'useSizes', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'has_fast_shipping', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'hasFastShipping', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'has_money_back', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'hasMoneyBack', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'has_quality_guarantee', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'hasQualityGuarantee', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'fast_shipping_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'fastShippingText', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'money_back_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'moneyBackText', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'quality_guarantee_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'qualityGuaranteeText', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'is_sold_by_unit', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'isSoldByUnit', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'unit_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'unitType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'use_variant_prices', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'useVariantPrices', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'unit_purchase_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'unitPurchasePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'unit_sale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'unitSalePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'purchase_page_config', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'purchasePageConfig', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_clone_id', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'shippingCloneId', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'name_for_shipping', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'nameForShipping', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'form_template_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'formTemplateId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_provider_id', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'shippingProviderId', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'use_shipping_clone', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'useShippingClone', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_method_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'shippingMethodType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'special_offers_config', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'specialOffersConfig', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'advanced_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'advancedDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'publication_status', 'TEXT DEFAULT "published"');
    await addColumnIfNotExists(organizationId, 'products', 'publicationStatus', 'TEXT DEFAULT "published"');
    await addColumnIfNotExists(organizationId, 'products', 'publish_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'publishAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'published_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'publishedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'isFeatured', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'displayOrder', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'seoTitle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'seoDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'subcategoryId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'productType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'shortDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'minStockAlert', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'trackInventory', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'allowBackorder', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'created_by_user_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'createdByUserId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'updated_by_user_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'updatedByUserId', 'TEXT');
    // أعمدة البحث والفهرسة
    await addColumnIfNotExists(organizationId, 'products', 'sku_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'skuLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'barcode_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'barcodeLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'barcode_digits', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'barcodeDigits', 'TEXT');
    // ⚡ أعمدة البحث المتقدم (للبحث العربي المحسن)
    await addColumnIfNotExists(organizationId, 'products', 'name_search', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'nameSearch', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'sku_search', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'skuSearch', 'TEXT');
    // أعمدة الجملة
    await addColumnIfNotExists(organizationId, 'products', 'is_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'isWholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'wholesale_only', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'wholesaleOnly', 'INTEGER DEFAULT 0');
    // أعمدة المخزون والتتبع
    await addColumnIfNotExists(organizationId, 'products', 'low_stock_threshold', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'lowStockThreshold', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'max_stock_level', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'maxStockLevel', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'track_quantity', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'trackQuantity', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'continue_selling_when_out', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'continueSellingWhenOut', 'INTEGER DEFAULT 0');
    // أعمدة الضريبة
    await addColumnIfNotExists(organizationId, 'products', 'tax_rate', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'taxRate', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'tax_class', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'taxClass', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'tax_included', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'taxIncluded', 'INTEGER DEFAULT 0');
    // أعمدة الشحن
    await addColumnIfNotExists(organizationId, 'products', 'shipping_required', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'shippingRequired', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'shippingWeight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_dimensions', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'shippingDimensions', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'free_shipping', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'freeShipping', 'INTEGER DEFAULT 0');
    // أعمدة إضافية للمتجر الإلكتروني
    await addColumnIfNotExists(organizationId, 'products', 'visibility', 'TEXT DEFAULT "visible"');
    await addColumnIfNotExists(organizationId, 'products', 'available_online', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'availableOnline', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'available_pos', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'availablePos', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'video_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'videoUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'external_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'externalId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'supplier_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'supplierId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'supplier_sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'supplierSku', 'TEXT');
    // أعمدة الحد الأدنى والأقصى للطلب
    await addColumnIfNotExists(organizationId, 'products', 'min_order_quantity', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'minOrderQuantity', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'max_order_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'maxOrderQuantity', 'INTEGER');
    // أعمدة الخصم والعروض
    await addColumnIfNotExists(organizationId, 'products', 'discount_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'discountType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'discount_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'discountValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'discount_start_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'discountStartDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'discount_end_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'discountEndDate', 'TEXT');
    // أعمدة متقدمة
    await addColumnIfNotExists(organizationId, 'products', 'requires_prescription', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'requiresPrescription', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'age_restricted', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'ageRestricted', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'min_age', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'minAge', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'expiry_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'expiryDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'batch_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'batchNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'serial_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'serialNumber', 'TEXT');
    // أعمدة التصنيف والترتيب
    await addColumnIfNotExists(organizationId, 'products', 'sort_order', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'sortOrder', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'rating', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'review_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'reviewCount', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'sales_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'salesCount', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'view_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'viewCount', 'INTEGER DEFAULT 0');
    // أعمدة إضافية للمزامنة مع Supabase
    await addColumnIfNotExists(organizationId, 'products', 'cost_price', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'costPrice', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'min_stock', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'minStock', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'quantity', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'image_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'imageUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'colors', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'sizes', 'TEXT');
    // أعمدة المخزون الفعلي
    await addColumnIfNotExists(organizationId, 'products', 'actual_stock_quantity', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'actualStockQuantity', 'INTEGER DEFAULT 0');
    // أعمدة المزامنة الإضافية (لإصلاح خطأ last_sync_attempt)
    await addColumnIfNotExists(organizationId, 'products', 'last_sync_attempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'lastSyncAttempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'conflict_resolution', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'conflictResolution', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'product_colors', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'product_sizes', 'TEXT');
    // ✅ عمود إصدار المخزون للكشف عن التعارضات
    await addColumnIfNotExists(organizationId, 'products', 'stock_version', 'INTEGER DEFAULT 0');
    // ✅ عمود الصور الإضافية (JSON array of URLs)
    await addColumnIfNotExists(organizationId, 'products', 'additional_images', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'additionalImages', 'TEXT');
    // ✅ عمود تسعيرة الجملة (JSON array of tiers)
    await addColumnIfNotExists(organizationId, 'products', 'wholesale_tiers', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'wholesaleTiers', 'TEXT');
    // ✅ عمود الإعدادات المتقدمة (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'advancedSettings', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'advanced_settings', 'TEXT');
    // ✅ عمود إعدادات التسويق (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'marketingSettings', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'marketing_settings', 'TEXT');
    // ✅ عمود إعدادات العروض الخاصة (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'special_offers_config', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'specialOffersConfig', 'TEXT');
    // ✅ عمود الوصف المتقدم (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'advanced_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'advancedDescription', 'TEXT');
    // ✅ أعمدة النشر
    await addColumnIfNotExists(organizationId, 'products', 'publication_mode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'publish_at', 'TEXT');
    // ✅ عمود الألوان (JSON array) - للتخزين المحلي فقط
    await addColumnIfNotExists(organizationId, 'products', 'colors', 'TEXT');

    // العناوين
    await exec(organizationId, `
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

    // إعدادات POS
    await exec(organizationId, `
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

    await addColumnIfNotExists(organizationId, 'pos_settings', 'store_website', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'store_logo_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receipt_header_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receipt_footer_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'welcome_message', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_qr_code', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_tracking_code', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_customer_info', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_store_logo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_store_info', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_date_time', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_employee_name', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'paper_width', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'paper_size', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printer_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'default_printer', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'auto_cut', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'cash_drawer', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'beep_on_scan', 'INTEGER');
    // دعم camelCase للتوافق
    await addColumnIfNotExists(organizationId, 'pos_settings', 'paperWidth', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'paperSize', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printerType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'defaultPrinter', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'autoCut', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'cashDrawer', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'beepOnScan', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'storeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'storeAddress', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'storePhone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'storeEmail', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'storeWebsite', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'storeLogoUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptHeader', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptFooter', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptLogoUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptShowLogo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptShowBarcode', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptShowQr', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptPaperSize', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptFontSize', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptFontFamily', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'autoPrintReceipt', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printCopies', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'taxEnabled', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'taxRate', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'taxNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'currencySymbol', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'pendingSync', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptHeaderText', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptFooterText', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'welcomeMessage', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showQrCode', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showTrackingCode', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showCustomerInfo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showStoreLogo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showStoreInfo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showDateTime', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showEmployeeName', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'font_size', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'fontSize', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'font_family', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'fontFamily', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'logo_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'logoUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'header_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'headerText', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'footer_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'footerText', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_logo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showLogo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_barcode', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showBarcode', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_qr', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'showQr', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'print_on_sale', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printOnSale', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'print_on_refund', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printOnRefund', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'enable_cash_drawer', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'enableCashDrawer', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'enable_barcode_scanner', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'enableBarcodeScanner', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'low_stock_threshold', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'lowStockThreshold', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'default_payment_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'defaultPaymentMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'line_spacing', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'lineSpacing', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'print_density', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printDensity', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'primary_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'primaryColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'secondary_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'secondaryColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'accent_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'accentColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'text_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'textColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'background_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'backgroundColor', 'TEXT');
    // أعمدة إضافية من Supabase لإعدادات POS
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receipt_template', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receiptTemplate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'header_style', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'headerStyle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'footer_style', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'footerStyle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'item_display_style', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'itemDisplayStyle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'price_position', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'pricePosition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'custom_css', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'customCss', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'tax_label', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'taxLabel', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'currency_position', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'currencyPosition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'allow_price_edit', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'allowPriceEdit', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'require_manager_approval', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'requireManagerApproval', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'business_license', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'businessLicense', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'activity', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'rib', 'TEXT');

    // إعدادات المتجر (Organization Settings)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS organization_settings (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        site_name TEXT,
        default_language TEXT DEFAULT 'ar',
        logo_url TEXT,
        favicon_url TEXT,
        display_text_with_logo INTEGER DEFAULT 0,
        theme_primary_color TEXT DEFAULT '#3B82F6',
        theme_secondary_color TEXT DEFAULT '#10B981',
        theme_mode TEXT DEFAULT 'light',
        custom_css TEXT,
        custom_js TEXT,
        custom_header TEXT,
        custom_footer TEXT,
        enable_registration INTEGER DEFAULT 1,
        enable_public_site INTEGER DEFAULT 1,
        meta_description TEXT,
        meta_keywords TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        pending_sync INTEGER DEFAULT 0,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لإعدادات المتجر - دعم camelCase
    await addColumnIfNotExists(organizationId, 'organization_settings', 'siteName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'defaultLanguage', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'logoUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'faviconUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'displayTextWithLogo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'themePrimaryColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'themeSecondaryColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'themeMode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'customCss', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'customJs', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'customHeader', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'customFooter', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'enableRegistration', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'enablePublicSite', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'metaDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'metaKeywords', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'pendingSync', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_settings', 'pendingOperation', 'TEXT');

    // إعادة بناء جدول pos_orders إذا كان يحتوي على قيود NOT NULL قديمة
    const posOrdersTableDef = `
      CREATE TABLE IF NOT EXISTS pos_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT DEFAULT '',
        customer_id TEXT,
        customer_name TEXT,
        customer_name_lower TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        organization_id TEXT DEFAULT '',
        staff_id TEXT,
        work_session_id TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        last_sync_attempt TEXT,
        error TEXT,
        remote_order_id TEXT,
        remote_customer_order_number INTEGER,
        local_created_at TEXT DEFAULT '',
        server_created_at TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      )
    `;

    await rebuildTableIfNeeded(organizationId, 'pos_orders', posOrdersTableDef, [
      'id', 'order_number', 'customer_id', 'customer_name', 'customer_name_lower',
      'total_amount', 'paid_amount', 'payment_method', 'status', 'organization_id',
      'staff_id', 'work_session_id', 'synced', 'sync_status', 'pending_operation',
      'last_sync_attempt', 'error', 'remote_order_id', 'remote_customer_order_number',
      'local_created_at', 'server_created_at', 'created_at', 'updated_at'
    ]);

    // طلبات POS - تم إزالة قيود NOT NULL للتوافق مع البيانات القادمة من الخادم
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS pos_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT DEFAULT '',
        customer_id TEXT,
        customer_name TEXT,
        customer_name_lower TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        organization_id TEXT DEFAULT '',
        staff_id TEXT,
        work_session_id TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        last_sync_attempt TEXT,
        error TEXT,
        remote_order_id TEXT,
        remote_customer_order_number INTEGER,
        local_created_at TEXT DEFAULT '',
        server_created_at TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      );
    `);

    await addColumnIfNotExists(organizationId, 'pos_orders', 'employee_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'payment_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'subtotal', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'discount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'amount_paid', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'remaining_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'consider_remaining_as_partial', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'total', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'extra_fields', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'created_at_ts', 'INTEGER');
    // دعم الأسماء بـ camelCase للتوافق مع البيانات القادمة من الخادم
    await addColumnIfNotExists(organizationId, 'pos_orders', 'localCreatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'serverCreatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'lastSyncAttempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'remoteOrderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'remoteCustomerOrderNumber', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'workSessionId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'staffId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerNameLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'totalAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'paidAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'paymentMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'orderNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'local_order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'localOrderNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'tax_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'taxAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'discount_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'discountAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shipping_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shippingAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'items', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'receipt_printed', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'receiptPrinted', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customer_phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerPhone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customer_email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerEmail', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'source', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'channel', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'local_order_number_str', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'localOrderNumberStr', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'message', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'payload', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'pending_updates', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'pendingUpdates', 'TEXT');
    // أعمدة إضافية من orders في Supabase
    await addColumnIfNotExists(organizationId, 'pos_orders', 'slug', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'is_online', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'isOnline', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shipping_address_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shippingAddressId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shipping_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shippingMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shipping_cost', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shippingCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'tax', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customer_order_number', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerOrderNumber', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'pos_order_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'posOrderType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'completed_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'completedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customer_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'admin_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'adminNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'call_confirmation_status_id', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'callConfirmationStatusId', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'global_order_number', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'globalOrderNumber', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'created_by_staff_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'createdByStaffId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'created_by_staff_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'createdByStaffName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'employeeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'paymentStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'amountPaid', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'remainingAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'considerRemainingAsPartial', 'INTEGER');
    // أعمدة إضافية للمزامنة مع Supabase orders
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customer_address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'customerAddress', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'commune', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'tracking_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'trackingNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shipping_company', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_orders', 'shippingCompany', 'TEXT');

    // عناصر طلب POS
    await exec(organizationId, `
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
        created_at TEXT NOT NULL
      );
    `);

    // العملاء - تم تغيير organization_id و local_updated_at ليكون لهما قيمة افتراضية
    const customersTableDef = `
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
        organization_id TEXT DEFAULT '',
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT DEFAULT '',
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      )
    `;

    // إعادة بناء الجدول إذا كان يحتوي على قيود NOT NULL قديمة
    await rebuildTableIfNeeded(organizationId, 'customers', customersTableDef, [
      'id', 'name', 'name_normalized', 'name_lower', 'email', 'email_lower',
      'phone', 'phone_digits', 'total_debt', 'organization_id', 'synced',
      'sync_status', 'pending_operation', 'local_updated_at', 'created_at', 'updated_at'
    ]);

    await exec(organizationId, customersTableDef + ';');

    await addColumnIfNotExists(organizationId, 'customers', 'nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'rib', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'localUpdatedAt', 'TEXT');
    // دعم camelCase للتوافق
    await addColumnIfNotExists(organizationId, 'customers', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'nameNormalized', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'nameLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'emailLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'phoneDigits', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'totalDebt', 'REAL');
    await addColumnIfNotExists(organizationId, 'customers', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'company_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'companyName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'city', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'commune', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'postal_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'postalCode', 'TEXT');
    // أعمدة المزامنة التدريجية
    await addColumnIfNotExists(organizationId, 'customers', 'last_sync_attempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'lastSyncAttempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'country', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'is_active', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'customers', 'isActive', 'INTEGER DEFAULT 1');
    // أعمدة إضافية من customers في Supabase
    await addColumnIfNotExists(organizationId, 'customers', 'source', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'credit_limit', 'REAL');
    await addColumnIfNotExists(organizationId, 'customers', 'creditLimit', 'REAL');
    await addColumnIfNotExists(organizationId, 'customers', 'tax_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'taxId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'is_vip', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'isVip', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'discount_rate', 'REAL');
    await addColumnIfNotExists(organizationId, 'customers', 'discountRate', 'REAL');
    await addColumnIfNotExists(organizationId, 'customers', 'loyalty_points', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'loyaltyPoints', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'last_purchase_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'lastPurchaseDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'total_purchases', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'totalPurchases', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'purchase_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'purchaseCount', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'whatsapp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'facebook', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'instagram', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'tags', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'server_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'serverUpdatedAt', 'TEXT');
    // أعمدة إضافية للمزامنة مع Supabase
    await addColumnIfNotExists(organizationId, 'customers', 'total_orders', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'totalOrders', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'total_spent', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'totalSpent', 'REAL DEFAULT 0');

    // الفواتير
    await exec(organizationId, `
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

    await addColumnIfNotExists(organizationId, 'invoices', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'pendingOperation', 'TEXT');
    // أعمدة إضافية للفواتير
    await addColumnIfNotExists(organizationId, 'invoices', 'invoiceNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'invoiceNumberLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'remoteInvoiceId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerNameLower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'totalAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'invoiceDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'dueDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'sourceType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'paymentMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'paymentStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'taxAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'discountAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'subtotalAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'shippingAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'discountType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'discountPercentage', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'tvaRate', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'amountHt', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'amountTva', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'amountTtc', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'localCreatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'server_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'serverUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'local_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'localUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerPhone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerEmail', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerAddress', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerNif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerRc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerNis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_rib', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customerRib', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'order_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'orderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'orderNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'currency', 'TEXT DEFAULT "DZD"');
    await addColumnIfNotExists(organizationId, 'invoices', 'is_paid', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'isPaid', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'paid_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'paidAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'paid_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'paidAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'remaining_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'remainingAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'created_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'createdBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'items', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'printed_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'printedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'print_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'printCount', 'INTEGER DEFAULT 0');
    // أعمدة إضافية للمزامنة مع Supabase
    await addColumnIfNotExists(organizationId, 'invoices', 'subtotal', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'tax', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'discount', 'REAL DEFAULT 0');

    // عناصر الفواتير
    await exec(organizationId, `
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
        synced INTEGER DEFAULT 0
      );
    `);

    // ديون العملاء - تعريف الجدول بدون قيود NOT NULL
    const customerDebtsTableDef = `
      CREATE TABLE IF NOT EXISTS customer_debts (
        id TEXT PRIMARY KEY,
        customer_id TEXT DEFAULT '',
        customer_name TEXT,
        amount REAL DEFAULT 0,
        description TEXT,
        status TEXT DEFAULT 'unpaid',
        order_id TEXT,
        order_number TEXT,
        total_amount REAL,
        paid_amount REAL,
        remaining_amount REAL,
        due_date TEXT,
        notes TEXT,
        organization_id TEXT DEFAULT '',
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      )
    `;

    // إعادة بناء جدول customer_debts إذا كان يحتوي على قيود NOT NULL قديمة
    await rebuildTableIfNeeded(organizationId, 'customer_debts', customerDebtsTableDef, [
      'id', 'customer_id', 'customer_name', 'amount', 'description', 'status',
      'order_id', 'order_number', 'total_amount', 'paid_amount', 'remaining_amount',
      'due_date', 'notes', 'organization_id', 'synced', 'sync_status',
      'pending_operation', 'created_at', 'updated_at'
    ], needsSchemaUpgrade);

    await exec(organizationId, customerDebtsTableDef + ';');

    // أعمدة إضافية لديون العملاء
    await addColumnIfNotExists(organizationId, 'customer_debts', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'customerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'customerName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'orderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'orderNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'totalAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'paidAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'remainingAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'dueDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'invoice_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'invoiceId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'invoice_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'invoiceNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'source', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'source_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'sourceType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'payment_terms', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'paymentTerms', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'reminder_sent', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'reminderSent', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'last_reminder_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'lastReminderDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'is_overdue', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'isOverdue', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'days_overdue', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'daysOverdue', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'created_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'createdBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'updated_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'updatedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'server_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'serverUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'local_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'localUpdatedAt', 'TEXT');
    // أعمدة الطلب الإضافية
    await addColumnIfNotExists(organizationId, 'customer_debts', 'subtotal', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'discount', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'tax', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'shipping', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'items_count', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'itemsCount', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'payment_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'paymentMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'remote_debt_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'remoteDebtId', 'TEXT');

    // مدفوعات ديون العملاء
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS customer_debt_payments (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        applied_by TEXT,
        synced INTEGER DEFAULT 0,
        pending_operation TEXT
      );
    `);

    // رموز PIN للموظفين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS staff_pins (
        id TEXT PRIMARY KEY,
        staff_id TEXT,
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
    
    // إضافة عمود staff_id للجداول الموجودة (migration)
    await addColumnIfNotExists(organizationId, 'staff_pins', 'staff_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_pins', 'staffId', 'TEXT');
    // إنشاء index للبحث السريع
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_staff_pins_org ON staff_pins(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_staff_pins_staff_id ON staff_pins(staff_id);`);
    } catch (e) {
      // الفهرس قد يكون موجوداً
    }

    // ⚡ v25: بيانات اعتماد المستخدمين للأوفلاين
    await exec(organizationId, `
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
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_user_credentials_email_lower ON user_credentials(email_lower);`);

    // صف المزامنة
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        object_type TEXT,
        object_id TEXT,
        operation TEXT,
        data TEXT,
        priority INTEGER DEFAULT 2,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        error TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);
    // أعمدة camelCase للتوافق
    await addColumnIfNotExists(organizationId, 'sync_queue', 'objectType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_queue', 'objectId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_queue', 'lastAttempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_queue', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_queue', 'updatedAt', 'TEXT');

    // حالة الترخيص
    await exec(organizationId, `
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
    `);

    // جلسات العمل - تعريف بدون قيود NOT NULL للتوافق
    const workSessionsTableDef = `
      CREATE TABLE IF NOT EXISTS work_sessions (
        id TEXT PRIMARY KEY,
        staff_id TEXT DEFAULT '',
        staff_name TEXT,
        organization_id TEXT DEFAULT '',
        opening_cash REAL DEFAULT 0,
        closing_cash REAL,
        expected_cash REAL,
        cash_difference REAL,
        total_sales REAL DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        cash_sales REAL DEFAULT 0,
        card_sales REAL DEFAULT 0,
        started_at TEXT DEFAULT '',
        ended_at TEXT,
        paused_at TEXT,
        resumed_at TEXT,
        pause_count INTEGER DEFAULT 0,
        total_pause_duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        opening_notes TEXT,
        closing_notes TEXT,
        synced INTEGER DEFAULT 0,
        syncStatus TEXT,
        pendingOperation TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT '',
        opening_balance REAL,
        closing_balance REAL,
        opened_at TEXT,
        closed_at TEXT,
        extra_fields TEXT
      )
    `;

    // إعادة بناء جدول work_sessions إذا كان يحتوي على قيود NOT NULL
    await rebuildTableIfNeeded(organizationId, 'work_sessions', workSessionsTableDef, [
      'id', 'staff_id', 'staff_name', 'organization_id', 'opening_cash', 'closing_cash',
      'expected_cash', 'cash_difference', 'total_sales', 'total_orders', 'cash_sales',
      'card_sales', 'started_at', 'ended_at', 'paused_at', 'resumed_at', 'pause_count',
      'total_pause_duration', 'status', 'opening_notes', 'closing_notes', 'synced',
      'syncStatus', 'pendingOperation', 'created_at', 'updated_at', 'opening_balance',
      'closing_balance', 'opened_at', 'closed_at', 'extra_fields'
    ], needsSchemaUpgrade);

    await exec(organizationId, workSessionsTableDef + ';');

    await addColumnIfNotExists(organizationId, 'work_sessions', 'extra_fields', 'TEXT');
    await addColumnIfNotExists(organizationId, 'work_sessions', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'work_sessions', 'pending_operation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'work_sessions', 'pendingOperation', 'TEXT');

    // جدول المعاملات للمخزون
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        organization_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // كاش تهيئة التطبيق
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS app_init_cache (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        organization_id TEXT,
        data TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // كاش POS للأوفلاين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS pos_offline_cache (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        page INTEGER NOT NULL,
        page_limit INTEGER NOT NULL,
        search TEXT,
        category_id TEXT,
        data TEXT,
        timestamp TEXT NOT NULL
      );
    `);

    // جداول الفئات والفئات الفرعية
    await exec(organizationId, `
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

    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT,
        is_active INTEGER,
        organization_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // ⚡ v26: جدول الموظفين/المستخدمين المحلي
    await exec(organizationId, `
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
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_employees_auth_user ON employees(auth_user_id);`);
    await addColumnIfNotExists(organizationId, 'employees', 'synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'employees', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'employees', 'pending_operation', 'TEXT');

    // ⚡ v34: جدول الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        name_lower TEXT,
        company_name TEXT,
        email TEXT,
        email_lower TEXT,
        phone TEXT,
        phone_digits TEXT,
        address TEXT,
        website TEXT,
        tax_number TEXT,
        business_type TEXT,
        notes TEXT,
        rating REAL DEFAULT 0,
        supplier_type TEXT DEFAULT 'local',
        supplier_category TEXT DEFAULT 'wholesale',
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name_lower);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_suppliers_synced ON suppliers(synced);`);
    // إضافة أعمدة مفقودة للجداول الموجودة
    await addColumnIfNotExists(organizationId, 'suppliers', 'created_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'suppliers', 'updated_by', 'TEXT');

    // ⚡ جدول جهات اتصال الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_contacts (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        name TEXT NOT NULL,
        position TEXT,
        email TEXT,
        phone TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ⚡ جدول مشتريات الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_purchases (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        purchase_number TEXT NOT NULL,
        purchase_date TEXT NOT NULL,
        due_date TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        balance_due REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        payment_status TEXT DEFAULT 'unpaid',
        payment_terms TEXT,
        notes TEXT,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_purchases_org ON supplier_purchases(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier ON supplier_purchases(supplier_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_purchases_synced ON supplier_purchases(synced);`);

    // ⚡ جدول عناصر مشتريات الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL,
        product_id TEXT,
        description TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total_price REAL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        batch_id TEXT,
        color_id TEXT,
        size_id TEXT,
        variant_type TEXT DEFAULT 'simple',
        variant_display_name TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ⚡ جدول مدفوعات الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        purchase_id TEXT,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        reference_number TEXT,
        notes TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_payments_org ON supplier_payments(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_payments_synced ON supplier_payments(synced);`);

    // جدول اشتراكات المؤسسة
    await exec(organizationId, `
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

    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'billing_cycle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'billingCycle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'trial_ends_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'trialEndsAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'amount_paid', 'REAL');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'amountPaid', 'REAL');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'payment_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'paymentMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'payment_reference', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'paymentReference', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'lifetime_courses_access', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'lifetimeCoursesAccess', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'accessible_courses', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'accessibleCourses', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'courses_access_expires_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'coursesAccessExpiresAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'isAutoRenew', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'planId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'startDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'endDate', 'TEXT');

    // جدول ألوان المنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_colors (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color_code TEXT,
        image_url TEXT,
        quantity INTEGER DEFAULT 0,
        price REAL,
        is_default INTEGER DEFAULT 0,
        barcode TEXT,
        variant_number INTEGER,
        has_sizes INTEGER DEFAULT 0,
        purchase_price REAL,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'product_colors', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'colorCode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'imageUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'isDefault', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_colors', 'variantNumber', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_colors', 'hasSizes', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_colors', 'purchasePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_colors', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_colors', 'organizationId', 'TEXT');

    // جدول أحجام المنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_sizes (
        id TEXT PRIMARY KEY,
        color_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        size_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        price REAL,
        barcode TEXT,
        is_default INTEGER DEFAULT 0,
        purchase_price REAL,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'product_sizes', 'colorId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'sizeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'isDefault', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'purchasePrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_sizes', 'organizationId', 'TEXT');

    // جدول صور المنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'product_images', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'imageUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'sortOrder', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_images', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'image_base64', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'imageBase64', 'TEXT');

    // ✅ جدول الإعدادات المتقدمة للمنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_advanced_settings (
        product_id TEXT PRIMARY KEY,
        use_custom_currency INTEGER DEFAULT 0,
        custom_currency_code TEXT,
        is_base_currency INTEGER DEFAULT 0,
        skip_cart INTEGER DEFAULT 1,
        enable_stock_notification INTEGER DEFAULT 0,
        show_fake_visitor_counter INTEGER DEFAULT 0,
        min_fake_visitors INTEGER DEFAULT 5,
        max_fake_visitors INTEGER DEFAULT 25,
        enable_fake_low_stock INTEGER DEFAULT 0,
        min_fake_stock_threshold INTEGER DEFAULT 1,
        max_fake_stock_threshold INTEGER DEFAULT 5,
        show_stock_countdown INTEGER DEFAULT 0,
        stock_countdown_duration_hours INTEGER DEFAULT 24,
        reset_stock_countdown_on_zero INTEGER DEFAULT 0,
        prevent_exit_popup INTEGER DEFAULT 0,
        show_popularity_badge INTEGER DEFAULT 0,
        popularity_badge_text TEXT,
        enable_gift_wrapping INTEGER DEFAULT 0,
        enable_referral_program INTEGER DEFAULT 0,
        referral_commission_type TEXT,
        referral_commission_value REAL,
        referral_cookie_duration_days INTEGER,
        enable_buyer_discount INTEGER DEFAULT 0,
        buyer_discount_percentage INTEGER DEFAULT 5,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ✅ جدول إعدادات التسويق للمنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_marketing_settings (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        enable_reviews INTEGER DEFAULT 1,
        reviews_verify_purchase INTEGER DEFAULT 0,
        reviews_auto_approve INTEGER DEFAULT 1,
        allow_images_in_reviews INTEGER DEFAULT 1,
        enable_review_replies INTEGER DEFAULT 1,
        review_display_style TEXT DEFAULT 'stars_summary',
        enable_fake_star_ratings INTEGER DEFAULT 0,
        fake_star_rating_value REAL DEFAULT 4.5,
        fake_star_rating_count INTEGER DEFAULT 100,
        enable_fake_purchase_counter INTEGER DEFAULT 0,
        fake_purchase_count INTEGER DEFAULT 50,
        enable_facebook_pixel INTEGER DEFAULT 0,
        facebook_pixel_id TEXT,
        enable_tiktok_pixel INTEGER DEFAULT 0,
        tiktok_pixel_id TEXT,
        enable_snapchat_pixel INTEGER DEFAULT 0,
        snapchat_pixel_id TEXT,
        enable_google_ads_tracking INTEGER DEFAULT 0,
        google_ads_conversion_id TEXT,
        offer_timer_enabled INTEGER DEFAULT 0,
        offer_timer_title TEXT,
        offer_timer_type TEXT,
        offer_timer_end_date TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ✅ جدول أسعار الجملة للمنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_wholesale_tiers (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        min_quantity INTEGER NOT NULL,
        price_per_unit REAL NOT NULL,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // جدول الطلبات عبر الإنترنت (online_orders)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS online_orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        subtotal REAL NOT NULL,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        status TEXT,
        payment_method TEXT,
        payment_status TEXT,
        shipping_address_id TEXT,
        shipping_method TEXT,
        shipping_cost REAL DEFAULT 0,
        notes TEXT,
        employee_id TEXT,
        organization_id TEXT NOT NULL,
        slug TEXT,
        customer_order_number INTEGER,
        form_data TEXT,
        shipping_option TEXT,
        created_from TEXT DEFAULT 'store',
        call_confirmation_status_id INTEGER,
        call_confirmation_notes TEXT,
        call_confirmation_updated_at TEXT,
        call_confirmation_updated_by TEXT,
        metadata TEXT,
        stop_desk_id TEXT,
        yalidine_tracking_id TEXT,
        zrexpress_tracking_id TEXT,
        ecotrack_tracking_id TEXT,
        maystro_tracking_id TEXT,
        shipping_provider TEXT,
        tracking_data TEXT,
        last_status_update TEXT,
        delivered_at TEXT,
        current_location TEXT,
        estimated_delivery_date TEXT,
        assigned_agent_id TEXT,
        agent_priority INTEGER DEFAULT 0,
        call_attempts INTEGER DEFAULT 0,
        last_call_attempt TEXT,
        next_call_scheduled TEXT,
        assignment_timestamp TEXT,
        call_center_priority INTEGER DEFAULT 3,
        call_center_notes TEXT,
        yalidine_label_url TEXT,
        zrexpress_label_url TEXT,
        ecotrack_label_url TEXT,
        maystro_label_url TEXT,
        global_order_number INTEGER,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ online_orders
    await addColumnIfNotExists(organizationId, 'online_orders', 'customerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'paymentMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'paymentStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'shippingAddressId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'shippingMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'shippingCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'online_orders', 'employeeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'customerOrderNumber', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'online_orders', 'formData', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'shippingOption', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'createdFrom', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'callConfirmationStatusId', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'online_orders', 'callConfirmationNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'callConfirmationUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'callConfirmationUpdatedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'stopDeskId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'yalidineTrackingId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'zrexpressTrackingId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'ecotrackTrackingId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'maystroTrackingId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'shippingProvider', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'trackingData', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'lastStatusUpdate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'deliveredAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'currentLocation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'estimatedDeliveryDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'assignedAgentId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'agentPriority', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'online_orders', 'callAttempts', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'online_orders', 'lastCallAttempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'nextCallScheduled', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'assignmentTimestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'callCenterPriority', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'online_orders', 'callCenterNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'yalidineLabelUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'zrexpressLabelUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'ecotrackLabelUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'maystroLabelUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'globalOrderNumber', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'online_orders', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_orders', 'pendingOperation', 'TEXT');

    // جدول عناصر الطلبات عبر الإنترنت
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS online_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT,
        color_id TEXT,
        size_id TEXT,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        color_name TEXT,
        size_name TEXT,
        discount REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    await addColumnIfNotExists(organizationId, 'online_order_items', 'orderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'colorId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'sizeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'productName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'unitPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'totalPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'colorName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'sizeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'online_order_items', 'createdAt', 'TEXT');

    // جدول عناصر طلب POS (تحديث)
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'orderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'productName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'unitPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'color_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'colorId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'size_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'sizeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'color_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'colorName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'size_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'sizeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'total_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'totalPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'createdAt', 'TEXT');
    // أعمدة الجملة والسعر الأصلي
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'is_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'isWholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'original_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'originalPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'variant_info', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'variantInfo', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'barcode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'cost', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'tax_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'taxAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'discount_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'discountAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'discount_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'discountType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'returned_quantity', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'returnedQuantity', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'refund_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'refundAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'image_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'imageUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'thumbnail', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'pending_operation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'pendingOperation', 'TEXT');
    // ⚡ أعمدة مطلوبة لـ Supabase order_items
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'slug', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'is_digital', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'isDigital', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_order_items', 'variant_display_name', 'TEXT');

    // جدول المرتجعات (returns)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS returns (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        original_order_id TEXT,
        original_order_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        return_number TEXT,
        return_type TEXT,
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        refund_amount REAL DEFAULT 0,
        refund_method TEXT,
        reason TEXT,
        notes TEXT,
        created_by TEXT,
        approved_by TEXT,
        rejected_by TEXT,
        processed_by TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        processed_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // جدول مرتجعات المنتجات (product_returns) - مستخدم في syncProductReturns
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_returns (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        return_number TEXT,
        order_id TEXT,
        order_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        product_id TEXT,
        product_name TEXT,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        refund_amount REAL DEFAULT 0,
        refund_method TEXT,
        return_type TEXT DEFAULT 'refund',
        reason TEXT,
        reason_code TEXT,
        condition TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        images TEXT,
        created_by TEXT,
        created_by_name TEXT,
        approved_by TEXT,
        approved_by_name TEXT,
        rejected_by TEXT,
        rejected_by_name TEXT,
        processed_by TEXT,
        processed_by_name TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        processed_at TEXT,
        inventory_updated INTEGER DEFAULT 0,
        inventory_updated_at TEXT,
        inventory_updated_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        local_created_at TEXT,
        local_updated_at TEXT,
        server_updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ product_returns بصيغة camelCase
    await addColumnIfNotExists(organizationId, 'product_returns', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'returnNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'orderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'orderNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customerName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'productName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'colorId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'colorName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'sizeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'sizeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'unitPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'totalAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refundAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refundMethod', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'returnType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reasonCode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'createdBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'createdByName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approvedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approvedByName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'rejectedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'rejectedByName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'processedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'processedByName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approvedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'rejectedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'processedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'inventoryUpdated', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_returns', 'inventoryUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'inventoryUpdatedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'localCreatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'localUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'serverUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'pendingOperation', 'TEXT');
    // أعمدة إضافية لمرتجعات المنتجات
    await addColumnIfNotExists(organizationId, 'product_returns', 'remote_return_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'remoteReturnId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'local_return_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'localReturnId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'subtotal', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'discount', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'tax', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'barcode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'variant_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'variantId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'original_order_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'originalOrderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'original_order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'originalOrderNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'order_item_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'orderItemId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocked', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocked_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restockedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocked_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restockedBy', 'TEXT');
    // أعمدة إضافية لمعلومات العميل في المرتجعات
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customerPhone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customerEmail', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customerAddress', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchange_product_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchangeProductId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchange_product_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchangeProductName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchange_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchangeQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_returns', 'price_difference', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'priceDifference', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'images', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'attachments', 'TEXT');
    // أعمدة سبب الإرجاع
    await addColumnIfNotExists(organizationId, 'product_returns', 'return_reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'returnReason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reason_details', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reasonDetails', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'condition_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'conditionNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refund_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refundStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refund_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refundNotes', 'TEXT');
    // أعمدة إضافية لوصف سبب الإرجاع
    await addColumnIfNotExists(organizationId, 'product_returns', 'return_reason_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'returnReasonDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reason_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reasonDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'admin_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'adminNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'internal_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'internalNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customerNotes', 'TEXT');
    // أعمدة المبالغ الأصلية والرسوم
    await addColumnIfNotExists(organizationId, 'product_returns', 'original_total', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'originalTotal', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'return_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'returnAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocking_fee', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restockingFee', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approved_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approvedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approved_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approvedAt', 'TEXT');

    // جدول عناصر الإرجاع (return_items) - مستخدم في syncProductReturns
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS return_items (
        id TEXT PRIMARY KEY,
        return_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT,
        product_sku TEXT,
        return_quantity INTEGER DEFAULT 1,
        return_unit_price REAL DEFAULT 0,
        total_return_amount REAL DEFAULT 0,
        condition_status TEXT,
        resellable INTEGER DEFAULT 0,
        inventory_returned INTEGER DEFAULT 0,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        notes TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    // أعمدة إضافية لـ return_items بصيغة camelCase
    await addColumnIfNotExists(organizationId, 'return_items', 'returnId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'productName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'productSku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'returnQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'return_items', 'returnUnitPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'totalReturnAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'conditionStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'inventoryReturned', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'return_items', 'colorId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'colorName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'sizeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'sizeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'createdAt', 'TEXT');
    // أعمدة إضافية لعناصر الإرجاع
    await addColumnIfNotExists(organizationId, 'return_items', 'original_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'return_items', 'originalQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'return_items', 'original_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'originalPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'reason_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'reasonCode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'condition_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'conditionNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'refund_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'refundAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'restocking_fee', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'restockingFee', 'REAL');

    // جدول إعلانات الخسائر (losses)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS losses (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        loss_type TEXT,
        loss_date TEXT,
        status TEXT DEFAULT 'pending',
        total_value REAL DEFAULT 0,
        description TEXT,
        cause TEXT,
        notes TEXT,
        reported_by TEXT,
        approved_by TEXT,
        witness_employee_id TEXT,
        approved_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // جدول إعلانات الخسائر (loss_declarations) - مستخدم في syncLossDeclarations
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS loss_declarations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        declaration_number TEXT,
        loss_type TEXT DEFAULT 'damage',
        loss_date TEXT,
        status TEXT DEFAULT 'pending',
        total_value REAL DEFAULT 0,
        total_quantity INTEGER DEFAULT 0,
        description TEXT,
        cause TEXT,
        reason TEXT,
        reason_code TEXT,
        notes TEXT,
        images TEXT,
        reported_by TEXT,
        reported_by_name TEXT,
        approved_by TEXT,
        approved_by_name TEXT,
        rejected_by TEXT,
        rejected_by_name TEXT,
        witness_employee_id TEXT,
        witness_employee_name TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        inventory_updated INTEGER DEFAULT 0,
        inventory_updated_at TEXT,
        inventory_updated_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        local_created_at TEXT,
        local_updated_at TEXT,
        server_updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ loss_declarations بصيغة camelCase
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'declarationNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'lossType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'lossDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'totalValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'totalQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reasonCode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reportedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reportedByName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'approvedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'approvedByName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'rejectedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'rejectedByName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'witnessEmployeeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'witnessEmployeeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'approvedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'rejectedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'inventoryUpdated', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'inventoryUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'inventoryUpdatedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'localCreatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'localUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'serverUpdatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'pendingOperation', 'TEXT');
    // أعمدة إضافية لإعلانات الخسائر
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'lossNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_number_lower', 'TEXT'); // ⚡ للبحث السريع
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'remote_loss_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'remoteLossId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'local_loss_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'localLossId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'items', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'location', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'department', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_category', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'lossCategory', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'products', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'affected_products', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'affectedProducts', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'estimated_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'estimatedValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'actual_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'actualValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reference_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'referenceNumber', 'TEXT');
    // أعمدة إضافية لوصف الخسارة
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'lossDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'cause', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'resolution', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'preventive_action', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'preventiveAction', 'TEXT');
    // أعمدة إضافية لتاريخ الحادث
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incident_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incidentDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'discovery_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'discoveryDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reported_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reportedDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incident_location', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incidentLocation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incident_details', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incidentDetails', 'TEXT');
    // أعمدة القيم والتكاليف
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_cost_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'totalCostValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_retail_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'totalRetailValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'insurance_claim', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'insuranceClaim', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'insurance_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'insuranceAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'recovery_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'recoveryAmount', 'REAL');
    // أعمدة قيمة البيع والعدد الإجمالي
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_selling_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'totalSellingValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_items_count', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'totalItemsCount', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'items_count', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'itemsCount', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'selling_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'sellingValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'cost_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'costValue', 'REAL');

    // جدول عناصر إعلانات الخسائر (loss_declaration_items)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS loss_declaration_items (
        id TEXT PRIMARY KEY,
        loss_declaration_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_cost REAL DEFAULT 0,
        total_value REAL DEFAULT 0,
        notes TEXT,
        condition TEXT,
        inventory_adjusted INTEGER DEFAULT 0,
        inventory_adjusted_at TEXT,
        inventory_adjusted_by TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    // أعمدة إضافية لـ loss_declaration_items بصيغة camelCase
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'lossDeclarationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'productName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'colorId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'colorName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'sizeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'sizeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'unitCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'totalValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'inventoryAdjusted', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'inventoryAdjustedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'inventoryAdjustedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declaration_items', 'createdAt', 'TEXT');

    // جدول عناصر الخسائر - تعريف بدون قيود NOT NULL
    const lossItemsTableDef = `
      CREATE TABLE IF NOT EXISTS loss_items (
        id TEXT PRIMARY KEY,
        loss_id TEXT DEFAULT '',
        product_id TEXT,
        color_id TEXT,
        size_id TEXT,
        product_name TEXT,
        color_name TEXT,
        size_name TEXT,
        quantity INTEGER DEFAULT 0,
        unit_cost REAL,
        total_value REAL,
        notes TEXT,
        inventory_adjusted INTEGER DEFAULT 0,
        inventory_adjusted_by TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      )
    `;

    // إعادة بناء جدول loss_items لإزالة قيود NOT NULL
    await rebuildTableIfNeeded(organizationId, 'loss_items', lossItemsTableDef, [
      'id', 'loss_id', 'product_id', 'color_id', 'size_id', 'product_name',
      'color_name', 'size_name', 'quantity', 'unit_cost', 'total_value',
      'notes', 'inventory_adjusted', 'inventory_adjusted_by', 'created_at', 'synced'
    ], needsSchemaUpgrade);

    await exec(organizationId, lossItemsTableDef + ';');

    // أعمدة إضافية لـ loss_items
    await addColumnIfNotExists(organizationId, 'loss_items', 'product_sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'productSku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'productId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'productName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'colorId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'colorName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'sizeId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'sizeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lossId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unitCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'totalValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'inventoryAdjusted', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'inventoryAdjustedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'barcode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unit_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unitPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'selling_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'sellingPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'cost_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'costPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_declaration_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lossDeclarationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lost_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lostQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'damaged_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'damagedQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'original_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'originalQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'remaining_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'remainingQuantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unit_cost_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unitCostPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unit_selling_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unitSellingPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'total_cost_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'totalCostValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'total_selling_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'totalSellingValue', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lossCondition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lossReason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lossType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'updatedAt', 'TEXT');

    // جدول العناوين (addresses) - تحديث
    await addColumnIfNotExists(organizationId, 'addresses', 'customerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'streetAddress', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'postalCode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'isDefault', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'addresses', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'municipality', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'user_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'userId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'created_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'commune', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'label', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'address_line_1', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'addressLine1', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'address_line_2', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'addressLine2', 'TEXT');

    // جدول بيانات التعريف للمزامنة
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        last_sync_at TEXT,
        last_server_timestamp TEXT,
        records_synced INTEGER DEFAULT 0,
        status TEXT DEFAULT 'idle',
        error TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'sync_metadata', 'tableName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'lastSyncAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'lastServerTimestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'recordsSynced', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'updatedAt', 'TEXT');
    // أعمدة إضافية للمزامنة التدريجية
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'entity_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_sync_timestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_full_sync_timestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'sync_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_sync_error', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'organization_id', 'TEXT');

    // جدول العمليات الفاشلة للمزامنة (Retry Queue)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS failed_sync_operations (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        payload TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        next_retry_at TEXT,
        status TEXT DEFAULT 'pending',
        organization_id TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // فهرس للعمليات الجاهزة للإعادة
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_failed_sync_status_retry
      ON failed_sync_operations (organization_id, status, next_retry_at);
    `);

    // جدول التعارضات في المزامنة (Sync Conflicts)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_data TEXT,
        server_data TEXT,
        local_updated_at TEXT,
        server_updated_at TEXT,
        status TEXT DEFAULT 'pending',
        organization_id TEXT NOT NULL,
        created_at TEXT,
        resolved_at TEXT
      );
    `);

    // فهرس للتعارضات المعلقة
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_pending
      ON sync_conflicts (organization_id, status);
    `);

    // جدول الصور المخزنة محلياً (Cached Images for Offline)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS cached_images (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        base64_data TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        mime_type TEXT DEFAULT 'image/jpeg',
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // فهرس للبحث السريع عن الصور
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_cached_images_url
      ON cached_images (organization_id, url);
    `);

    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_cached_images_entity
      ON cached_images (organization_id, entity_type, entity_id);
    `);

    // جدول الموظفين (staff_members)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS staff_members (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        user_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT DEFAULT 'staff',
        permissions TEXT,
        pin_hash TEXT,
        salt TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'staff_members', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'userId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'pinHash', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'isActive', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'staff_members', 'lastLogin', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'avatar_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'avatarUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'first_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'firstName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'last_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'lastName', 'TEXT');

    // جدول المؤسسات (organizations)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        logo_url TEXT,
        owner_id TEXT,
        settings TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'organizations', 'logoUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'ownerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'city', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'country', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'currency', 'TEXT DEFAULT "DZD"');
    await addColumnIfNotExists(organizationId, 'organizations', 'timezone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'rib', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'activity', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'business_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'businessType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'is_active', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'organizations', 'isActive', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'organizations', 'trial_ends_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'trialEndsAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'subscription_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'subscriptionStatus', 'TEXT');

    // جدول حالات تأكيد الاتصال (call_confirmation_statuses)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS call_confirmation_statuses (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        color TEXT,
        icon TEXT,
        is_final INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        organization_id TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'call_confirmation_statuses', 'nameAr', 'TEXT');
    await addColumnIfNotExists(organizationId, 'call_confirmation_statuses', 'isFinal', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'call_confirmation_statuses', 'displayOrder', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'call_confirmation_statuses', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'call_confirmation_statuses', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'call_confirmation_statuses', 'updatedAt', 'TEXT');

    // جدول الولايات (wilayas)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS wilayas (
        id INTEGER PRIMARY KEY,
        code TEXT,
        name TEXT NOT NULL,
        name_ar TEXT,
        shipping_cost REAL DEFAULT 0,
        home_shipping_cost REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'wilayas', 'nameAr', 'TEXT');
    await addColumnIfNotExists(organizationId, 'wilayas', 'shippingCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'wilayas', 'homeShippingCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'wilayas', 'isActive', 'INTEGER');

    // جدول البلديات (communes)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS communes (
        id INTEGER PRIMARY KEY,
        wilaya_id INTEGER,
        code TEXT,
        name TEXT NOT NULL,
        name_ar TEXT,
        shipping_cost REAL,
        home_shipping_cost REAL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'communes', 'wilayaId', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'communes', 'nameAr', 'TEXT');
    await addColumnIfNotExists(organizationId, 'communes', 'shippingCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'communes', 'homeShippingCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'communes', 'isActive', 'INTEGER');

    // جدول نماذج النماذج (form_templates)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS form_templates (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        fields TEXT,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'form_templates', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'form_templates', 'isDefault', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'form_templates', 'isActive', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'form_templates', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'form_templates', 'updatedAt', 'TEXT');

    // جدول إعدادات المتجر (store_settings)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS store_settings (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        store_name TEXT,
        store_description TEXT,
        store_logo TEXT,
        store_banner TEXT,
        store_url TEXT,
        theme TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        accent_color TEXT,
        font_family TEXT,
        currency TEXT DEFAULT 'DZD',
        language TEXT DEFAULT 'ar',
        social_links TEXT,
        contact_info TEXT,
        seo_settings TEXT,
        shipping_settings TEXT,
        payment_settings TEXT,
        notification_settings TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'store_settings', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'storeName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'storeDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'storeLogo', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'storeBanner', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'storeUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'primaryColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'secondaryColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'accentColor', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'fontFamily', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'socialLinks', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'contactInfo', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'seoSettings', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'shippingSettings', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'paymentSettings', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'notificationSettings', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'isActive', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'store_settings', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'store_settings', 'updatedAt', 'TEXT');

    // فهارس للبحث السريع
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(name_lower);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON products(sku_lower);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_products_barcode_lower ON products(barcode_lower);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_products_organization ON products(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_customers_name_lower ON customers(name_lower);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_customers_phone_digits ON customers(phone_digits);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_customers_organization ON customers(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_pos_orders_organization ON pos_orders(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_pos_orders_customer ON pos_orders(customer_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_pos_orders_created ON pos_orders(created_at);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);`);
    } catch (indexError) {
      console.warn('[TauriSQLite] بعض الفهارس لم يتم إنشاؤها (قد تكون موجودة بالفعل):', indexError);
    }

    // جدول طلبات الإصلاح (repair_orders)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_orders (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        device_type TEXT,
        device_brand TEXT,
        device_model TEXT,
        serial_number TEXT,
        problem_description TEXT,
        diagnosis TEXT,
        repair_notes TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        estimated_cost REAL,
        final_cost REAL,
        deposit_amount REAL,
        paid_amount REAL,
        received_date TEXT,
        estimated_completion TEXT,
        completed_date TEXT,
        delivered_date TEXT,
        technician_id TEXT,
        technician_name TEXT,
        warranty_period INTEGER,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    // أعمدة إضافية لـ repair_orders (camelCase)
    await addColumnIfNotExists(organizationId, 'repair_orders', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'customerId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'customerName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'customerPhone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'deviceType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'deviceBrand', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'deviceModel', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'serialNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'problemDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'repairNotes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'estimatedCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'finalCost', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'depositAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'paidAmount', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'receivedDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'estimatedCompletion', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'completedDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'deliveredDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'technicianId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'technicianName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'warrantyPeriod', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'updatedAt', 'TEXT');

    // Missing columns for complete RepairOrder type support
    await addColumnIfNotExists(organizationId, 'repair_orders', 'order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'orderNumber', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'repair_location_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'repairLocationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'custom_location', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'customLocation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'issue_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'issueDescription', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'total_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'totalPrice', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'paid_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'price_to_be_determined_later', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'priceToBeDeterminedLater', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'received_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'receivedBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'pending_operation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'pendingOperation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'customer_name_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'device_type_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'repair_tracking_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'payment_method', 'TEXT');

    // جدول مواقع التصليح (repair_locations)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_locations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        address TEXT,
        phone TEXT,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ repair_locations (camelCase)
    await addColumnIfNotExists(organizationId, 'repair_locations', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_locations', 'isDefault', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'repair_locations', 'isActive', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'repair_locations', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_locations', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_locations', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_locations', 'pendingOperation', 'TEXT');

    // جدول صور التصليح (repair_images)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_images (
        id TEXT PRIMARY KEY,
        repair_order_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_type TEXT CHECK(image_type IN ('before', 'after')),
        description TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
      );
    `);

    // أعمدة إضافية لـ repair_images (camelCase)
    await addColumnIfNotExists(organizationId, 'repair_images', 'repairOrderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_images', 'imageUrl', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_images', 'imageType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_images', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_images', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_images', 'pendingOperation', 'TEXT');

    // جدول تاريخ حالات التصليح (repair_status_history)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_status_history (
        id TEXT PRIMARY KEY,
        repair_order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        created_by TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
      );
    `);

    // أعمدة إضافية لـ repair_status_history (camelCase)
    await addColumnIfNotExists(organizationId, 'repair_status_history', 'repairOrderId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_status_history', 'createdBy', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_status_history', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_status_history', 'syncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_status_history', 'pendingOperation', 'TEXT');

    // فهارس لجداول التصليح
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_organization ON repair_orders(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_customer ON repair_orders(customer_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_synced ON repair_orders(synced);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_locations_organization ON repair_locations(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_locations_synced ON repair_locations(synced);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_images_repair_order ON repair_images(repair_order_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_images_synced ON repair_images(synced);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_history_repair_order ON repair_status_history(repair_order_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_history_synced ON repair_status_history(synced);`);
    } catch (indexError) {
      console.warn('[TauriSQLite] بعض فهارس التصليح لم يتم إنشاؤها (قد تكون موجودة بالفعل):', indexError);
    }

    // جدول صلاحيات المستخدمين (user_permissions)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT NOT NULL,
        user_id TEXT,
        email TEXT,
        name TEXT,
        role TEXT,
        organization_id TEXT,
        is_active INTEGER DEFAULT 1,
        is_org_admin INTEGER DEFAULT 0,
        is_super_admin INTEGER DEFAULT 0,
        permissions TEXT,
        has_inventory_access INTEGER DEFAULT 0,
        can_manage_products INTEGER DEFAULT 0,
        can_view_reports INTEGER DEFAULT 0,
        can_manage_users INTEGER DEFAULT 0,
        can_manage_orders INTEGER DEFAULT 0,
        can_access_pos INTEGER DEFAULT 0,
        can_manage_settings INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        last_updated TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'user_permissions', 'authUserId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'userId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'isActive', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'isOrgAdmin', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'isSuperAdmin', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'hasInventoryAccess', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'canManageProducts', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'canViewReports', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'canManageUsers', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'canManageOrders', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'canAccessPos', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'canManageSettings', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'updatedAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'user_permissions', 'lastUpdated', 'TEXT');

    // جدول الاشتراكات (subscriptions) - للتوافق مع offlineSubscriptionService
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        plan_id TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        trial_end_date TEXT,
        grace_end_date TEXT,
        features TEXT,
        last_check TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'subscriptions', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'planId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'startDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'endDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'trialEndDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'graceEndDate', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'lastCheck', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'updatedAt', 'TEXT');

    // جدول بيانات المصادقة المحلية (local_auth_data) - للتخزين الآمن للأوفلاين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS local_auth_data (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT NOT NULL UNIQUE,
        email TEXT,
        name TEXT,
        role TEXT,
        organization_id TEXT,
        session_data TEXT,
        user_metadata TEXT,
        app_metadata TEXT,
        last_online_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'local_auth_data', 'authUserId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'local_auth_data', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'local_auth_data', 'sessionData', 'TEXT');
    await addColumnIfNotExists(organizationId, 'local_auth_data', 'userMetadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'local_auth_data', 'appMetadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'local_auth_data', 'lastOnlineAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'local_auth_data', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'local_auth_data', 'updatedAt', 'TEXT');

    // =====================================================
    // 🔄 جدول sync_metadata للتزامن التدريجي (Incremental Sync)
    // يخزن آخر وقت مزامنة لكل نوع من الكيانات
    // =====================================================
    try {
      // التحقق من وجود الجدول وهيكله
      const syncMetaTableExists = await tableExists(organizationId, 'sync_metadata');

      if (syncMetaTableExists) {
        // التحقق من وجود العمود entity_type
        const hasEntityType = await columnExists(organizationId, 'sync_metadata', 'entity_type');
        if (!hasEntityType) {
          // الجدول موجود لكن بدون العمود المطلوب - حذفه وإعادة إنشائه
          console.log('[TauriSQLite] 🔄 sync_metadata table exists but missing entity_type column, recreating...');
          await exec(organizationId, `DROP TABLE IF EXISTS sync_metadata;`);
        }
      }

      await exec(organizationId, `
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          last_sync_timestamp TEXT,
          last_full_sync_timestamp TEXT,
          sync_count INTEGER DEFAULT 0,
          last_sync_status TEXT DEFAULT 'success',
          last_sync_error TEXT,
          records_synced INTEGER DEFAULT 0,
          organization_id TEXT,
          created_at TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT ''
        );
      `);
      console.log('[TauriSQLite] ✅ sync_metadata table created successfully');
    } catch (syncMetaError) {
      console.error('[TauriSQLite] ⚠️ Failed to create sync_metadata table:', syncMetaError);
    }

    // إضافة أعمدة camelCase للتوافق
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'entityType', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'lastSyncTimestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'lastFullSyncTimestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'syncCount', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'lastSyncStatus', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'lastSyncError', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'recordsSynced', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'organizationId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'updatedAt', 'TEXT');

    // إنشاء فهرس sync_metadata منفصلاً بعد التأكد من وجود الجدول والعمود
    try {
      const syncMetaReady = await tableExists(organizationId, 'sync_metadata');
      const hasEntityTypeCol = await columnExists(organizationId, 'sync_metadata', 'entity_type');
      if (syncMetaReady && hasEntityTypeCol) {
        await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_metadata_entity_type ON sync_metadata(entity_type);`);
        console.log('[TauriSQLite] ✅ sync_metadata index created');
      } else {
        console.warn('[TauriSQLite] ⚠️ sync_metadata table or entity_type column not ready for index');
      }
    } catch (indexError) {
      console.warn('[TauriSQLite] ⚠️ Failed to create sync_metadata index:', indexError);
    }

    // =====================================================
    // 💰 جدول expense_categories - تصنيفات المصروفات
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS expense_categories (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        synced INTEGER DEFAULT 1,
        pendingOperation TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(organization_id);`);
    } catch {}

    // فهارس إضافية للبحث السريع
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_user_permissions_auth_user ON user_permissions(auth_user_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_user_permissions_org ON user_permissions(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_local_auth_data_auth_user ON local_auth_data(auth_user_id);`);
      // idx_sync_metadata_entity_type تم إنشاؤه بالفعل أعلاه
    } catch (indexError) {
      console.warn('[TauriSQLite] بعض فهارس الجداول الجديدة لم يتم إنشاؤها:', indexError);
    }

    // =====================================================
    // 🔔 جداول الإشعارات للأوفلاين
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS cached_notifications (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        is_read INTEGER DEFAULT 0,
        entity_type TEXT,
        entity_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        synced_at TEXT
      );
    `);

    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS notification_sync_queue (
        id TEXT PRIMARY KEY,
        notification_id TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT
      );
    `);

    // فهارس للإشعارات
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_cached_notifications_org ON cached_notifications(organization_id, created_at DESC);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_notification_sync_queue_attempts ON notification_sync_queue(attempts);`);
      console.log('[TauriSQLite] ✅ cached_notifications tables and indexes created');
    } catch (notifIndexError) {
      console.warn('[TauriSQLite] ⚠️ Some notification indexes may already exist:', notifIndexError);
    }

    // =====================================================
    // 📤 جدول sync_outbox - قائمة العمليات المعلقة للإرسال (Delta Sync)
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE', 'DELTA')),
        record_id TEXT NOT NULL,
        payload TEXT,
        local_seq INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sending', 'failed', 'sent')),
        next_retry_at TEXT
      );
    `);

    // فهارس لـ sync_outbox
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_local_seq ON sync_outbox(local_seq);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_table ON sync_outbox(table_name);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_record ON sync_outbox(table_name, record_id);`);
      console.log('[TauriSQLite] ✅ sync_outbox table and indexes created');
    } catch (outboxIndexError) {
      console.warn('[TauriSQLite] ⚠️ Some sync_outbox indexes may already exist:', outboxIndexError);
    }

    // أعمدة إضافية لـ sync_outbox (camelCase)
    await addColumnIfNotExists(organizationId, 'sync_outbox', 'tableName', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_outbox', 'recordId', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_outbox', 'localSeq', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'sync_outbox', 'createdAt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_outbox', 'retryCount', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'sync_outbox', 'lastError', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_outbox', 'nextRetryAt', 'TEXT');

    // تحديث إصدار الـ schema بعد الانتهاء بنجاح
    if (needsSchemaUpgrade) {
      await setSchemaVersion(organizationId, SCHEMA_VERSION);
      console.log(`[TauriSQLite] ✅ تم ترقية schema إلى الإصدار ${SCHEMA_VERSION}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[TauriSQLite] ✅ تم إنهاء تهيئة schema في ${duration}ms`);
    return { success: true };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[TauriSQLite] Schema initialization failed after ${duration}ms:`, error);
    return { success: false, error: error?.message || String(error) };
  }
}
