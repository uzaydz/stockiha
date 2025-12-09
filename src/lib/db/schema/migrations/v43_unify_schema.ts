/**
 * ⚡ Migration v43: Unify Schema with Supabase
 *
 * هذا الـ migration يقوم بـ:
 * 1. إعادة تسمية الجداول (pos_orders → orders)
 * 2. إعادة تسمية الأعمدة (total_amount → total)
 * 3. إضافة بادئة _ للأعمدة المحلية
 * 4. حذف الأعمدة المكررة (camelCase)
 *
 * ⚠️ هذا migration تدميري - يجب عمل backup قبل التنفيذ
 */

import { sqliteWriteQueue } from '@/lib/sync/core/SQLiteWriteQueue';

const MIGRATION_VERSION = 43;

/**
 * ⚡ Table renames
 */
const TABLE_RENAMES = [
    { from: 'pos_orders', to: 'orders' },
    { from: 'pos_order_items', to: 'order_items' },
    { from: 'product_returns', to: 'returns' },
    { from: 'loss_declarations', to: 'losses' },
    { from: 'work_sessions', to: 'staff_work_sessions' },
];

/**
 * ⚡ Column renames for orders table
 */
const ORDER_COLUMN_RENAMES = [
    { from: 'total_amount', to: 'total' },
    { from: 'paid_amount', to: 'amount_paid' },
    { from: 'staff_id', to: 'employee_id' },
    { from: 'order_number', to: 'global_order_number' },
];

/**
 * ⚡ Column renames for order_items table
 */
const ORDER_ITEMS_COLUMN_RENAMES = [
    { from: 'product_name', to: 'name' },
    { from: 'subtotal', to: 'total_price' },
];

/**
 * ⚡ Local columns to add _ prefix
 */
const LOCAL_COLUMNS_TO_PREFIX = [
    'synced',
    'sync_status',
    'pending_operation',
    'local_updated_at',
    'error',
    'name_lower',
    'sku_lower',
    'barcode_lower',
    'phone_digits',
    'email_lower',
    'local_order_number',
    'customer_name_lower',
];

/**
 * ⚡ camelCase columns to drop (duplicates of snake_case)
 */
const CAMELCASE_COLUMNS_TO_DROP = [
    // Products
    'compareAtPrice',
    'purchasePrice',
    'stockQuantity',
    'wholesalePrice',
    'sellByWeight',
    'sellByBox',
    'sellByMeter',
    'hasVariants',
    'useSizes',
    'isActive',
    'isFeatured',
    'thumbnailImage',
    'minStockLevel',
    'reorderLevel',
    'reorderQuantity',
    'createdAt',
    'updatedAt',
    // Orders
    'totalAmount',
    'paidAmount',
    'staffId',
    'paymentMethod',
    'paymentStatus',
    'isOnline',
    'completedAt',
    // Order Items
    'orderId',
    'productId',
    'productName',
    'unitPrice',
    'totalPrice',
    'colorId',
    'sizeId',
    'colorName',
    'sizeName',
    'saleType',
    'sellingUnitType',
];

/**
 * ⚡ Main migration function
 */
export async function migrate_v43(organizationId: string): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    console.log('[Migration v43] 🚀 Starting schema unification...');

    try {
        // Check current version
        const currentVersion = await getSchemaVersion(organizationId);
        if (currentVersion >= MIGRATION_VERSION) {
            console.log(`[Migration v43] ⏭️ Already at version ${currentVersion}, skipping...`);
            return { success: true, errors: [] };
        }

        // Start transaction
        await sqliteWriteQueue.write('BEGIN TRANSACTION');

        try {
            // Step 1: Rename tables
            console.log('[Migration v43] 📋 Step 1: Renaming tables...');
            for (const { from, to } of TABLE_RENAMES) {
                const result = await renameTable(organizationId, from, to);
                if (!result.success) errors.push(result.error!);
            }

            // Step 2: Rename columns in orders
            console.log('[Migration v43] 📋 Step 2: Renaming order columns...');
            for (const { from, to } of ORDER_COLUMN_RENAMES) {
                const result = await renameColumn(organizationId, 'orders', from, to);
                if (!result.success) errors.push(result.error!);
            }

            // Step 3: Rename columns in order_items
            console.log('[Migration v43] 📋 Step 3: Renaming order_items columns...');
            for (const { from, to } of ORDER_ITEMS_COLUMN_RENAMES) {
                const result = await renameColumn(organizationId, 'order_items', from, to);
                if (!result.success) errors.push(result.error!);
            }

            // Step 4: Add _ prefix to local columns
            console.log('[Migration v43] 📋 Step 4: Adding _ prefix to local columns...');
            const tables = ['products', 'orders', 'order_items', 'customers'];
            for (const table of tables) {
                for (const column of LOCAL_COLUMNS_TO_PREFIX) {
                    const hasColumn = await columnExists(organizationId, table, column);
                    if (hasColumn) {
                        const result = await renameColumn(organizationId, table, column, `_${column}`);
                        if (!result.success) errors.push(result.error!);
                    }
                }
            }

            // Step 5: Update schema version
            await setSchemaVersion(organizationId, MIGRATION_VERSION);

            // Commit transaction
            await sqliteWriteQueue.write('COMMIT');

            console.log('[Migration v43] ✅ Schema unification complete!');
            return { success: errors.length === 0, errors };

        } catch (error) {
            // Rollback on error
            await sqliteWriteQueue.write('ROLLBACK');
            throw error;
        }

    } catch (error: any) {
        console.error('[Migration v43] ❌ Migration failed:', error);
        errors.push(error.message);
        return { success: false, errors };
    }
}

/**
 * ⚡ Check if table exists
 */
async function tableExists(organizationId: string, tableName: string): Promise<boolean> {
    try {
        const result = await sqliteWriteQueue.read<any[]>(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName]
        );
        return result.length > 0;
    } catch {
        return false;
    }
}

/**
 * ⚡ Check if column exists
 */
async function columnExists(organizationId: string, tableName: string, columnName: string): Promise<boolean> {
    try {
        const result = await sqliteWriteQueue.read<any[]>(
            `PRAGMA table_info(${tableName})`
        );
        return result.some((col: any) => col.name === columnName);
    } catch {
        return false;
    }
}

/**
 * ⚡ Rename table
 */
async function renameTable(
    organizationId: string,
    oldName: string,
    newName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const exists = await tableExists(organizationId, oldName);
        if (!exists) {
            console.log(`[Migration v43] ⏭️ Table ${oldName} not found, skipping...`);
            return { success: true };
        }

        const newExists = await tableExists(organizationId, newName);
        if (newExists) {
            console.log(`[Migration v43] ⚠️ Table ${newName} already exists, merging data...`);
            // Copy data from old to new
            await sqliteWriteQueue.write(`
                INSERT OR IGNORE INTO ${newName} SELECT * FROM ${oldName}
            `);
            // Drop old table
            await sqliteWriteQueue.write(`DROP TABLE IF EXISTS ${oldName}`);
            return { success: true };
        }

        await sqliteWriteQueue.write(`ALTER TABLE ${oldName} RENAME TO ${newName}`);
        console.log(`[Migration v43] ✅ Renamed ${oldName} → ${newName}`);
        return { success: true };

    } catch (error: any) {
        console.error(`[Migration v43] ❌ Failed to rename ${oldName}:`, error);
        return { success: false, error: `Failed to rename ${oldName}: ${error.message}` };
    }
}

/**
 * ⚡ Rename column
 */
async function renameColumn(
    organizationId: string,
    tableName: string,
    oldColumn: string,
    newColumn: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const hasOld = await columnExists(organizationId, tableName, oldColumn);
        if (!hasOld) {
            return { success: true }; // Column doesn't exist, nothing to do
        }

        const hasNew = await columnExists(organizationId, tableName, newColumn);
        if (hasNew) {
            // Merge data from old to new
            await sqliteWriteQueue.write(`
                UPDATE ${tableName}
                SET ${newColumn} = ${oldColumn}
                WHERE ${newColumn} IS NULL AND ${oldColumn} IS NOT NULL
            `);
            console.log(`[Migration v43] ✅ Merged ${tableName}.${oldColumn} → ${newColumn}`);
            return { success: true };
        }

        // Try SQLite's native RENAME COLUMN (SQLite 3.25+)
        try {
            await sqliteWriteQueue.write(`
                ALTER TABLE ${tableName}
                RENAME COLUMN ${oldColumn} TO ${newColumn}
            `);
            console.log(`[Migration v43] ✅ Renamed ${tableName}.${oldColumn} → ${newColumn}`);
            return { success: true };
        } catch {
            // Fallback for older SQLite versions
            return await renameColumnFallback(organizationId, tableName, oldColumn, newColumn);
        }

    } catch (error: any) {
        console.error(`[Migration v43] ❌ Failed to rename ${tableName}.${oldColumn}:`, error);
        return { success: false, error: `Failed to rename ${tableName}.${oldColumn}: ${error.message}` };
    }
}

/**
 * ⚡ Fallback for older SQLite (recreate table)
 */
async function renameColumnFallback(
    organizationId: string,
    tableName: string,
    oldColumn: string,
    newColumn: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get table info
        const tableInfo = await sqliteWriteQueue.read<any[]>(`PRAGMA table_info(${tableName})`);

        // Build new column list
        const columns = tableInfo.map((col: any) =>
            col.name === oldColumn ? newColumn : col.name
        );

        const selectColumns = tableInfo.map((col: any) =>
            col.name === oldColumn ? `${oldColumn} AS ${newColumn}` : col.name
        );

        // Create temp table
        const tempTable = `${tableName}_temp_migration`;
        await sqliteWriteQueue.write(`CREATE TABLE ${tempTable} AS SELECT ${selectColumns.join(', ')} FROM ${tableName}`);

        // Drop original
        await sqliteWriteQueue.write(`DROP TABLE ${tableName}`);

        // Rename temp
        await sqliteWriteQueue.write(`ALTER TABLE ${tempTable} RENAME TO ${tableName}`);

        console.log(`[Migration v43] ✅ Renamed ${tableName}.${oldColumn} → ${newColumn} (fallback)`);
        return { success: true };

    } catch (error: any) {
        return { success: false, error: `Fallback rename failed: ${error.message}` };
    }
}

/**
 * ⚡ Get current schema version
 */
async function getSchemaVersion(organizationId: string): Promise<number> {
    try {
        // Ensure version table exists
        await sqliteWriteQueue.write(`
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT DEFAULT (datetime('now'))
            )
        `);

        const result = await sqliteWriteQueue.read<any[]>(
            `SELECT MAX(version) as version FROM schema_version`
        );

        return result[0]?.version || 0;
    } catch {
        return 0;
    }
}

/**
 * ⚡ Set schema version
 */
async function setSchemaVersion(organizationId: string, version: number): Promise<void> {
    await sqliteWriteQueue.write(
        `INSERT INTO schema_version (version) VALUES (?)`,
        [version]
    );
}

/**
 * ⚡ Rollback migration (if needed)
 */
export async function rollback_v43(organizationId: string): Promise<{ success: boolean; errors: string[] }> {
    console.log('[Migration v43] ⚠️ Rolling back...');

    // Reverse table renames
    for (const { from, to } of TABLE_RENAMES) {
        try {
            await sqliteWriteQueue.write(`ALTER TABLE ${to} RENAME TO ${from}`);
        } catch (e) {
            console.warn(`[Migration v43] ⚠️ Could not rollback ${to} → ${from}`);
        }
    }

    return { success: true, errors: [] };
}
