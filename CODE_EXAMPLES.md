# 💻 PowerSync Conversion - Code Examples

Real examples from already-converted files to copy and adapt.

---

## 📖 Table of Contents

1. [Basic Queries](#1-basic-queries)
2. [Write Operations](#2-write-operations)
3. [Upsert Pattern](#3-upsert-pattern)
4. [Delete Operations](#4-delete-operations)
5. [Complex Queries](#5-complex-queries)
6. [React Hooks](#6-react-hooks)
7. [Service Layer](#7-service-layer)
8. [Error Handling](#8-error-handling)

---

## 1. Basic Queries

### Example 1.1: Get All Records

**From**: `localProductService.ts`

```typescript
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// Get all products for an organization
export const getLocalProducts = async (
  organizationId: string
): Promise<LocalProduct[]> => {
  try {
    const products = await powerSyncService.getAll<LocalProduct>(
      'SELECT * FROM products WHERE organization_id = ?',
      [organizationId]
    );

    return products;
  } catch (error) {
    console.error('[LocalProduct] Get products error:', error);
    return [];
  }
};
```

### Example 1.2: Get Single Record

**From**: `localStaffService.ts`

```typescript
async getById(
  staffId: string,
  organizationId: string
): Promise<POSStaffSession | null> {
  try {
    const data = await powerSyncService.get<LocalStaffMember>(
      `SELECT * FROM staff_members WHERE id = ? AND organization_id = ?`,
      [staffId, organizationId]
    );

    if (!data) {
      return null;
    }

    return mapLocalToSession(data);
  } catch (error) {
    console.error('[localStaffService] getById error:', error);
    return null;
  }
}
```

### Example 1.3: Count Records

**From**: `localProductService.ts`

```typescript
export const countLocalProducts = async (organizationId: string): Promise<number> => {
  const result = await powerSyncService.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM products WHERE organization_id = ?',
    [organizationId]
  );
  return result?.count || 0;
};
```

---

## 2. Write Operations

### Example 2.1: Simple INSERT

**From**: `localCategoryService.ts`

```typescript
export const createLocalCategory = async (
  categoryData: Omit<LocalCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<LocalCategory> => {
  const now = new Date().toISOString();
  const categoryId = uuidv4();

  const newCategory: LocalCategory = {
    ...categoryData,
    id: categoryId,
    created_at: now,
    updated_at: now,
  };

  // ⚡ استخدام PowerSync مباشرة
  await powerSyncService.writeTransaction(async () => {
    const db = powerSyncService.getDatabase();
    const keys = Object.keys(newCategory).filter(k => k !== 'id');
    const values = keys.map(k => (newCategory as any)[k]);
    const placeholders = keys.map(() => '?').join(', ');

    await db.execute(
      `INSERT INTO categories (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
      [categoryId, ...values, now, now]
    );
  });

  console.log(`[LocalCategory] ⚡ Created category ${categoryId} via PowerSync`);
  return newCategory;
};
```

### Example 2.2: Simple UPDATE

**From**: `localCustomerService.ts`

```typescript
export const updateLocalCustomer = async (
  customerId: string,
  updates: Partial<LocalCustomer>
): Promise<LocalCustomer | null> => {
  try {
    const existing = await powerSyncService.get<LocalCustomer>(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updated_at: now,
    };

    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.writeTransaction(async () => {
      const db = powerSyncService.getDatabase();
      const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => (updates as any)[k]);

      await db.execute(
        `UPDATE customers SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, now, customerId]
      );
    });

    console.log(`[LocalCustomer] ⚡ Updated customer ${customerId} via PowerSync`);

    return {
      ...existing,
      ...updatedData
    } as LocalCustomer;
  } catch (error) {
    console.error(`[LocalCustomer] Update error:`, error);
    return null;
  }
};
```

---

## 3. Upsert Pattern

### Example 3.1: Upsert (UPDATE or INSERT)

**From**: `localStaffService.ts`

```typescript
async upsert(
  staff: Partial<POSStaffSession> & { id?: string; staff_name: string },
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const localStaff = mapSessionToLocal(staff, organizationId);

    // إنشاء ID جديد إذا لم يكن موجوداً
    if (!localStaff.id) {
      localStaff.id = crypto.randomUUID();
    }

    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.writeTransaction(async () => {
      const db = powerSyncService.getDatabase();
      const now = new Date().toISOString();

      // Try UPDATE first
      const keys = Object.keys(localStaff).filter(k => k !== 'id' && k !== 'created_at');
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => (localStaff as any)[k]);

      const updateResult = await db.execute(
        `UPDATE staff_members SET ${setClause}, updated_at = ? WHERE id = ? AND organization_id = ?`,
        [...values, now, localStaff.id, organizationId]
      );

      // If no rows updated, INSERT
      if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
        const insertKeys = Object.keys(localStaff).filter(k => k !== 'updated_at');
        const insertPlaceholders = insertKeys.map(() => '?').join(', ');
        const insertValues = insertKeys.map(k => (localStaff as any)[k]);

        await db.execute(
          `INSERT INTO staff_members (${insertKeys.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders}, ?, ?)`,
          [...insertValues, localStaff.created_at || now, now]
        );
      }
    });

    console.log(`[localStaffService] ✅ Upserted staff via PowerSync: ${localStaff.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('[localStaffService] upsert error:', error);
    return { success: false, error: error.message || String(error) };
  }
}
```

### Example 3.2: Helper Function for Upsert

**From**: `appInitializationService.ts`

```typescript
const powerSyncUpsert = async (table: string, data: any): Promise<{ success: boolean; changes?: number; error?: string }> => {
  try {
    await powerSyncService.writeTransaction(async () => {
      const db = powerSyncService.getDatabase();
      const keys = Object.keys(data).filter(k => k !== 'created_at' && k !== 'updated_at');
      const idKey = keys.find(k => k === 'id') || keys[0];
      const idValue = data[idKey];

      if (idValue) {
        // Try UPDATE first
        const updateKeys = keys.filter(k => k !== idKey);
        const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
        const updateValues = updateKeys.map(k => data[k]);
        const updateSql = `UPDATE ${table} SET ${updateSet}, updated_at = ? WHERE ${idKey} = ?`;
        const result = await db.execute(updateSql, [...updateValues, new Date().toISOString(), idValue]);

        // If no rows updated, INSERT
        if (!result || (Array.isArray(result) && result.length === 0)) {
          const insertKeys = keys;
          const insertPlaceholders = insertKeys.map(() => '?').join(', ');
          const insertValues = insertKeys.map(k => data[k]);
          const insertSql = `INSERT INTO ${table} (${insertKeys.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders}, ?, ?)`;
          await db.execute(insertSql, [...insertValues, data.created_at || new Date().toISOString(), new Date().toISOString()]);
        }
      }
    });
    return { success: true, changes: 1 };
  } catch (error: any) {
    console.error('[PowerSync] Upsert failed:', error);
    return { success: false, error: error?.message || 'Upsert failed' };
  }
};
```

---

## 4. Delete Operations

### Example 4.1: Hard Delete

**From**: `localStaffService.ts`

```typescript
async delete(
  staffId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.writeTransaction(async () => {
      const db = powerSyncService.getDatabase();
      await db.execute(
        'DELETE FROM staff_members WHERE id = ? AND organization_id = ?',
        [staffId, organizationId]
      );
    });

    console.log(`[localStaffService] ✅ Deleted staff via PowerSync: ${staffId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[localStaffService] delete error:', error);
    return { success: false, error: error.message || String(error) };
  }
}
```

### Example 4.2: Soft Delete (Mark as Deleted)

**From**: `localStaffService.ts`

```typescript
async markDeleted(
  staffId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.writeTransaction(async () => {
      const db = powerSyncService.getDatabase();
      await db.execute(
        `UPDATE staff_members
         SET is_active = 0,
             synced = 0,
             sync_status = 'pending_sync',
             pending_operation = 'delete',
             updated_at = ?
         WHERE id = ? AND organization_id = ?`,
        [now, staffId, organizationId]
      );
    });

    console.log(`[localStaffService] ✅ Marked staff as deleted via PowerSync: ${staffId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[localStaffService] markDeleted error:', error);
    return { success: false, error: error.message || String(error) };
  }
}
```

---

## 5. Complex Queries

### Example 5.1: Query with Multiple Conditions

**From**: `localCustomerDebtService.ts`

```typescript
export const getAllLocalCustomerDebts = async (organizationId: string): Promise<LocalCustomerDebt[]> => {
  console.log('[getAllLocalCustomerDebts] 🔍 Fetching via PowerSync', { organizationId });

  const debts = await powerSyncService.getAll<LocalCustomerDebt>(
    `SELECT * FROM customer_debts
     WHERE organization_id = ?
     AND (pending_operation IS NULL OR pending_operation != 'delete')
     AND remaining_amount > 0
     ORDER BY created_at DESC`,
    [organizationId]
  );

  console.log('[getAllLocalCustomerDebts] ✅ PowerSync result:', {
    count: debts.length,
    sample: debts[0]
  });

  return debts;
};
```

### Example 5.2: Search with LIKE

**From**: `localProductService.ts`

```typescript
export const searchLocalProducts = async (
  organizationId: string,
  searchTerm: string,
  limit: number = 50
): Promise<LocalProduct[]> => {
  const searchPattern = `%${searchTerm}%`;
  return await powerSyncService.getAll<LocalProduct>(
    `SELECT * FROM products
     WHERE organization_id = ?
     AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR description LIKE ?)
     LIMIT ?`,
    [organizationId, searchPattern, searchPattern, searchPattern, searchPattern, limit]
  );
};
```

### Example 5.3: Pagination

**From**: `localLossDeclarationService.ts`

```typescript
export async function getLocalLossDeclarationsPage(
  organizationId: string,
  options: { offset?: number; limit?: number; status?: string | string[]; createdSort?: 'asc' | 'desc' } = {}
): Promise<{ losses: LocalLossDeclaration[]; total: number }> {
  const { offset = 0, limit = 50, status, createdSort = 'desc' } = options;

  let whereClause = "organization_id = ?";
  const params: any[] = [organizationId];

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map(() => '?').join(',');
    whereClause += ` AND status IN (${placeholders})`;
    params.push(...statuses);
  }

  const losses = await powerSyncService.getAll<LocalLossDeclaration>(
    `SELECT * FROM loss_declarations
     WHERE ${whereClause}
     ORDER BY created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const totalResult = await powerSyncService.getAll<any>(
    `SELECT COUNT(*) as count FROM loss_declarations WHERE ${whereClause}`,
    params
  );
  const total = totalResult?.[0]?.count || 0;

  return { losses, total };
}
```

---

## 6. React Hooks

### Example 6.1: Database Initialization Hook

**From**: `useDatabaseInitialization.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export interface DatabaseStatus {
  isInitialized: boolean;
  isInitializing: boolean;
  databaseType: 'powersync' | null;
  error: string | null;
}

export const useDatabaseInitialization = () => {
  const { organization } = useAuth();
  const [status, setStatus] = useState<DatabaseStatus>({
    isInitialized: false,
    isInitializing: false,
    databaseType: null,
    error: null,
  });

  const initialize = useCallback(async () => {
    if (!organization?.id || status.isInitializing || status.isInitialized) {
      return;
    }

    setStatus(prev => ({
      ...prev,
      isInitializing: true,
      error: null,
    }));

    try {
      console.log('[DB Init] ⚡ Starting PowerSync initialization...');

      // ⚡ تهيئة PowerSync
      await powerSyncService.initialize();
      console.log('[DB Init] ✅ PowerSync initialized successfully');

      setStatus({
        isInitialized: true,
        isInitializing: false,
        databaseType: 'powersync',
        error: null,
      });
    } catch (error: any) {
      console.error('[DB Init] ❌ Initialization failed:', error);
      setStatus(prev => ({
        ...prev,
        isInitializing: false,
        error: error.message || 'Failed to initialize PowerSync',
      }));
    }
  }, [organization?.id, status.isInitializing, status.isInitialized]);

  useEffect(() => {
    if (organization?.id && !status.isInitialized && !status.isInitializing) {
      initialize();
    }
  }, [organization?.id, status.isInitialized, status.isInitializing, initialize]);

  return {
    ...status,
    initialize,
  };
};
```

### Example 6.2: Sync Status Hook (NEW - to create)

```typescript
import { useState, useEffect } from 'react';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export const usePowerSyncStatus = () => {
  const [status, setStatus] = useState({
    connected: false,
    hasSynced: false,
    lastSyncedAt: null as Date | null,
    pendingUploads: 0,
  });

  useEffect(() => {
    const handleStatusChange = (e: CustomEvent) => {
      setStatus({
        connected: e.detail.connected || false,
        hasSynced: e.detail.hasSynced || false,
        lastSyncedAt: e.detail.lastSyncedAt ? new Date(e.detail.lastSyncedAt) : null,
        pendingUploads: 0, // Will be updated by uploads event
      });
    };

    const handleUploadsChange = (e: CustomEvent) => {
      setStatus(prev => ({
        ...prev,
        pendingUploads: e.detail.count || 0,
      }));
    };

    window.addEventListener('powersync-status-changed', handleStatusChange as EventListener);
    window.addEventListener('powersync-uploads-changed', handleUploadsChange as EventListener);

    // Get initial status
    const initialStatus = powerSyncService.syncStatus;
    if (initialStatus) {
      setStatus({
        connected: initialStatus.connected || false,
        hasSynced: initialStatus.hasSynced || false,
        lastSyncedAt: initialStatus.lastSyncedAt ? new Date(initialStatus.lastSyncedAt) : null,
        pendingUploads: 0,
      });
    }

    return () => {
      window.removeEventListener('powersync-status-changed', handleStatusChange as EventListener);
      window.removeEventListener('powersync-uploads-changed', handleUploadsChange as EventListener);
    };
  }, []);

  return status;
};
```

---

## 7. Service Layer

### Example 7.1: Complete Service Example

**From**: `localCategoryService.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { LocalCategory } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export type { LocalCategory } from '@/database/localDb';

// CREATE
export const createLocalCategory = async (
  categoryData: Omit<LocalCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<LocalCategory> => {
  const now = new Date().toISOString();
  const categoryId = uuidv4();

  const newCategory: LocalCategory = {
    ...categoryData,
    id: categoryId,
    created_at: now,
    updated_at: now,
  };

  await powerSyncService.writeTransaction(async () => {
    const db = powerSyncService.getDatabase();
    const keys = Object.keys(newCategory).filter(k => k !== 'id');
    const values = keys.map(k => (newCategory as any)[k]);
    const placeholders = keys.map(() => '?').join(', ');

    await db.execute(
      `INSERT INTO categories (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`,
      [categoryId, ...values]
    );
  });

  return newCategory;
};

// READ ONE
export const getLocalCategory = async (categoryId: string): Promise<LocalCategory | null> => {
  return await powerSyncService.get<LocalCategory>(
    'SELECT * FROM categories WHERE id = ?',
    [categoryId]
  );
};

// READ ALL
export const getLocalCategories = async (organizationId: string): Promise<LocalCategory[]> => {
  return await powerSyncService.getAll<LocalCategory>(
    'SELECT * FROM categories WHERE organization_id = ? ORDER BY name ASC',
    [organizationId]
  );
};

// UPDATE
export const updateLocalCategory = async (
  categoryId: string,
  updates: Partial<LocalCategory>
): Promise<LocalCategory | null> => {
  const existing = await getLocalCategory(categoryId);
  if (!existing) return null;

  const now = new Date().toISOString();

  await powerSyncService.writeTransaction(async () => {
    const db = powerSyncService.getDatabase();
    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updates as any)[k]);

    await db.execute(
      `UPDATE categories SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...values, now, categoryId]
    );
  });

  return {
    ...existing,
    ...updates,
    updated_at: now,
  } as LocalCategory;
};

// DELETE
export const deleteLocalCategory = async (categoryId: string): Promise<boolean> => {
  try {
    await powerSyncService.writeTransaction(async () => {
      const db = powerSyncService.getDatabase();
      await db.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
    });
    return true;
  } catch (error) {
    console.error('[LocalCategory] Delete error:', error);
    return false;
  }
};
```

---

## 8. Error Handling

### Example 8.1: Try-Catch with Fallback

**From**: `localProductService.ts`

```typescript
export const getLocalProducts = async (
  organizationId?: string,
  synced?: boolean
): Promise<LocalProduct[]> => {
  try {
    if (!organizationId) {
      organizationId = localStorage.getItem('currentOrganizationId') ||
        localStorage.getItem('bazaar_organization_id') || '';
    }

    let products: LocalProduct[];

    if (synced !== undefined) {
      products = await powerSyncService.getAll<LocalProduct>(
        'SELECT * FROM products WHERE organization_id = ? AND synced = ?',
        [organizationId, synced ? 1 : 0]
      );
    } else {
      products = await powerSyncService.getAll<LocalProduct>(
        'SELECT * FROM products WHERE organization_id = ?',
        [organizationId]
      );
    }

    return products;
  } catch (error) {
    console.error(`[LocalProduct] Get products error:`, error);
    return []; // Return empty array instead of throwing
  }
};
```

### Example 8.2: Detailed Error Logging

**From**: `localStaffService.ts`

```typescript
async savePin(
  staffId: string,
  pin: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { hash, salt } = await hashPin(pin);
    const now = new Date().toISOString();

    await powerSyncService.writeTransaction(async () => {
      const db = powerSyncService.getDatabase();
      await db.execute(
        `UPDATE staff_members SET pin_hash = ?, salt = ?, updated_at = ? WHERE id = ?`,
        [hash, salt, now, staffId]
      );
    });

    console.log(`[localStaffService] ✅ Saved PIN via PowerSync for staff: ${staffId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[localStaffService] savePin error:', error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}
```

---

## 🎯 Quick Reference

### When to use what:

| Operation | Method | Transaction? |
|-----------|--------|--------------|
| SELECT (multiple) | `powerSyncService.getAll()` | ❌ No |
| SELECT (single) | `powerSyncService.get()` | ❌ No |
| INSERT | `writeTransaction(() => db.execute())` | ✅ Yes |
| UPDATE | `writeTransaction(() => db.execute())` | ✅ Yes |
| DELETE | `writeTransaction(() => db.execute())` | ✅ Yes |
| UPSERT | `writeTransaction(() => UPDATE then INSERT)` | ✅ Yes |

---

## 💡 Pro Tips

1. **Always use `writeTransaction` for writes** - This ensures data integrity
2. **Use TypeScript generics** - `getAll<Product>()` for type safety
3. **Handle errors gracefully** - Return empty arrays or null, don't crash
4. **Log operations** - Use console.log with ⚡ emoji for PowerSync operations
5. **Test incrementally** - Convert one function, test, then move to next

---

**These examples cover 90% of use cases!** Copy, adapt, and test! 🚀
