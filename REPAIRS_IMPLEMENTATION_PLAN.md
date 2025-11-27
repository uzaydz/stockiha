# 📋 خطة تطبيق نظام الإصلاح الأوفلاين - مفصلة

## 🎯 الهدف النهائي
جعل نظام الإصلاح (Repairs) يعمل بشكل كامل أوفلاين مع Delta Sync، مثل نظام الموظفين (Staff) تماماً.

---

## 📊 المراحل السبع

### المرحلة 1️⃣: إضافة الجداول الناقصة إلى tauriSchema.ts
**الوقت:** 15 دقيقة
**الأولوية:** 🔴 عالية جداً

#### الملف: `/src/lib/db/tauriSchema.ts`

#### المهام:
1. إضافة جدول `repair_locations`
2. إضافة جدول `repair_images`
3. إضافة جدول `repair_status_history`
4. إضافة الأعمدة الإضافية (camelCase variants) لكل جدول

#### التفاصيل:

##### 1.1 جدول repair_locations
```typescript
await exec(organizationId, `
  CREATE TABLE IF NOT EXISTS repair_locations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    synced INTEGER DEFAULT 0,
    sync_status TEXT,
    pending_operation TEXT
  );
`);
```

##### 1.2 جدول repair_images
```typescript
await exec(organizationId, `
  CREATE TABLE IF NOT EXISTS repair_images (
    id TEXT PRIMARY KEY,
    repair_order_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_type TEXT DEFAULT 'before',
    description TEXT,
    storage_path TEXT,
    created_at TEXT,
    synced INTEGER DEFAULT 0,
    sync_status TEXT,
    pending_operation TEXT,
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
  );
`);
```

##### 1.3 جدول repair_status_history
```typescript
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
```

##### 1.4 تحديث repair_orders الموجود
```typescript
// إضافة الأعمدة الناقصة لـ repair_orders
await addColumnIfNotExists(organizationId, 'repair_orders', 'order_number', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'repair_tracking_code', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'repair_location_id', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'custom_location', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'issue_description', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'price_to_be_determined_later', 'INTEGER DEFAULT 0');
await addColumnIfNotExists(organizationId, 'repair_orders', 'received_by', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'customer_name_lower', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'device_type_lower', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'sync_status', 'TEXT');
await addColumnIfNotExists(organizationId, 'repair_orders', 'pending_operation', 'TEXT');
```

#### معايير الاكتمال:
- [ ] جدول repair_locations موجود مع جميع الأعمدة
- [ ] جدول repair_images موجود مع جميع الأعمدة
- [ ] جدول repair_status_history موجود مع جميع الأعمدة
- [ ] repair_orders محدّث بالأعمدة الناقصة
- [ ] لا توجد أخطاء عند تشغيل التطبيق

---

### المرحلة 2️⃣: تحديث Delta Sync - types.ts
**الوقت:** 5 دقائق
**الأولوية:** 🔴 عالية جداً

#### الملف: `/src/lib/sync/delta/types.ts`

#### المهام:
إضافة جداول الإصلاح إلى `SYNCED_TABLES`

#### التفاصيل:
```typescript
// السطر 284
SYNCED_TABLES: [
  'products',
  'customers',
  'orders',
  'product_categories',
  'staff_members',
  'repair_orders',      // ✅ جديد
  'repair_locations'    // ✅ جديد
] as const,
```

#### معايير الاكتمال:
- [ ] repair_orders موجود في SYNCED_TABLES
- [ ] repair_locations موجود في SYNCED_TABLES
- [ ] TypeScript لا يظهر أخطاء

---

### المرحلة 3️⃣: تحديث DeltaSyncEngine.ts
**الوقت:** 5 دقائق
**الأولوية:** 🔴 عالية

#### الملف: `/src/lib/sync/delta/DeltaSyncEngine.ts`

#### المهام:
إضافة الجداول إلى `TABLES_WITH_SYNCED_COLUMN`

#### التفاصيل:
```typescript
// السطر 89-93
private readonly TABLES_WITH_SYNCED_COLUMN: string[] = [
  'products', 'customers', 'orders', 'pos_orders', 'invoices',
  'work_sessions', 'repair_orders', 'pos_order_items', 'order_items',
  'staff_members',
  'repair_locations',         // ✅ جديد
  'repair_images',            // ✅ جديد
  'repair_status_history'     // ✅ جديد
];
```

#### معايير الاكتمال:
- [ ] repair_locations في TABLES_WITH_SYNCED_COLUMN
- [ ] repair_images في TABLES_WITH_SYNCED_COLUMN
- [ ] repair_status_history في TABLES_WITH_SYNCED_COLUMN
- [ ] التطبيق يعمل بدون أخطاء

---

### المرحلة 4️⃣: إنشاء repairService.ts الموحد
**الوقت:** 45 دقيقة
**الأولوية:** 🔴 عالية جداً

#### الملف الجديد: `/src/services/repairService.ts`

#### المهام:
1. إنشاء الملف الأساسي
2. إضافة دوال طلبات الإصلاح
3. إضافة دوال المواقع
4. إضافة دوال الصور
5. إضافة دوال التاريخ

#### التفاصيل:

##### 4.1 الهيكل الأساسي
```typescript
import { supabase } from '@/lib/supabase';
import * as localRepairService from '@/api/localRepairService';
import type { RepairOrder, RepairLocation, RepairImage, RepairHistory } from '@/types/repair';

export const repairService = {
  // ... الدوال
};
```

##### 4.2 دوال طلبات الإصلاح
```typescript
/**
 * جلب جميع طلبات الإصلاح
 * ⚡ يدعم الأوفلاين
 */
async getAll(organizationId?: string): Promise<RepairOrder[]> {
  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .select(`
        *,
        repair_location:repair_locations(*),
        images:repair_images(*),
        history:repair_status_history(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[repairService] ⚠️ خطأ في السيرفر، الجلب محلياً');
      if (organizationId) {
        return await localRepairService.listLocalRepairOrders(organizationId);
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[repairService] ❌ خطأ في getAll:', error);
    if (organizationId) {
      try {
        return await localRepairService.listLocalRepairOrders(organizationId);
      } catch (localError) {
        console.error('[repairService] ❌ فشل الجلب المحلي:', localError);
      }
    }
    throw error;
  }
}

/**
 * جلب طلب إصلاح واحد
 * ⚡ يدعم الأوفلاين
 */
async getById(id: string, organizationId?: string): Promise<RepairOrder | null> {
  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .select(`
        *,
        repair_location:repair_locations(*),
        images:repair_images(*),
        history:repair_status_history(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.warn('[repairService] ⚠️ خطأ في السيرفر، الجلب محلياً');
      return await localRepairService.getLocalRepairOrderDetailed(id);
    }

    return data;
  } catch (error) {
    console.error('[repairService] ❌ خطأ في getById:', error);
    try {
      return await localRepairService.getLocalRepairOrderDetailed(id);
    } catch {
      return null;
    }
  }
}

/**
 * إنشاء طلب إصلاح جديد
 * ⚡ يدعم الأوفلاين
 */
async create(input: RepairOrderCreateInput, organizationId?: string): Promise<RepairOrder> {
  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .insert({
        ...input,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (error) {
      console.warn('[repairService] ⚠️ خطأ في الإنشاء على السيرفر، الحفظ محلياً');
      if (organizationId) {
        return await localRepairService.createLocalRepairOrder(input);
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[repairService] ❌ خطأ في create:', error);
    if (organizationId) {
      try {
        return await localRepairService.createLocalRepairOrder(input);
      } catch (localError) {
        console.error('[repairService] ❌ فشل الحفظ المحلي:', localError);
      }
    }
    throw error;
  }
}

/**
 * تحديث طلب إصلاح
 * ⚡ يدعم الأوفلاين
 */
async update(id: string, updates: Partial<RepairOrderCreateInput>, organizationId?: string): Promise<RepairOrder> {
  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('[repairService] ⚠️ خطأ في التحديث على السيرفر، الحفظ محلياً');
      if (organizationId) {
        const updated = await localRepairService.updateLocalRepairOrder(id, updates);
        if (updated) return updated;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[repairService] ❌ خطأ في update:', error);
    if (organizationId) {
      try {
        const updated = await localRepairService.updateLocalRepairOrder(id, updates);
        if (updated) return updated;
      } catch (localError) {
        console.error('[repairService] ❌ فشل التحديث المحلي:', localError);
      }
    }
    throw error;
  }
}

/**
 * حذف طلب إصلاح
 * ⚡ يدعم الأوفلاين
 */
async delete(id: string, organizationId?: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('repair_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[repairService] ⚠️ خطأ في الحذف من السيرفر، الحذف محلياً');
      if (organizationId) {
        await localRepairService.deleteLocalRepairOrder(id);
        return { success: true };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('[repairService] ❌ خطأ في delete:', error);
    if (organizationId) {
      try {
        await localRepairService.deleteLocalRepairOrder(id);
        return { success: true };
      } catch (localError) {
        console.error('[repairService] ❌ فشل الحذف المحلي:', localError);
      }
    }
    throw error;
  }
}

/**
 * تحديث حالة طلب الإصلاح
 * ⚡ يدعم الأوفلاين
 */
async updateStatus(
  id: string,
  status: string,
  notes?: string,
  organizationId?: string
): Promise<RepairOrder> {
  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('[repairService] ⚠️ خطأ في تحديث الحالة على السيرفر، الحفظ محلياً');
      if (organizationId) {
        const updated = await localRepairService.updateRepairStatus(id, status, notes);
        if (updated) return updated;
      }
      throw error;
    }

    // إضافة سجل في التاريخ
    if (notes) {
      await this.addHistory(id, status, notes);
    }

    return data;
  } catch (error) {
    console.error('[repairService] ❌ خطأ في updateStatus:', error);
    if (organizationId) {
      try {
        const updated = await localRepairService.updateRepairStatus(id, status, notes);
        if (updated) return updated;
      } catch (localError) {
        console.error('[repairService] ❌ فشل تحديث الحالة المحلي:', localError);
      }
    }
    throw error;
  }
}
```

##### 4.3 دوال المواقع
```typescript
/**
 * جلب جميع مواقع الإصلاح
 * ⚡ يدعم الأوفلاين
 */
async getLocations(organizationId?: string): Promise<RepairLocation[]>

/**
 * إنشاء موقع إصلاح جديد
 * ⚡ يدعم الأوفلاين
 */
async createLocation(input: CreateLocationInput, organizationId?: string): Promise<RepairLocation>

/**
 * تحديث موقع إصلاح
 * ⚡ يدعم الأوفلاين
 */
async updateLocation(id: string, updates: Partial<CreateLocationInput>, organizationId?: string): Promise<RepairLocation>

/**
 * حذف موقع إصلاح
 * ⚡ يدعم الأوفلاين
 */
async deleteLocation(id: string, organizationId?: string): Promise<{ success: boolean }>
```

##### 4.4 دوال الصور
```typescript
/**
 * جلب صور طلب إصلاح
 * ⚡ يدعم الأوفلاين
 */
async getImages(repairOrderId: string): Promise<RepairImage[]>

/**
 * إضافة صورة
 * ⚡ يدعم الأوفلاين
 */
async addImage(input: AddImageInput): Promise<RepairImage>

/**
 * حذف صورة
 * ⚡ يدعم الأوفلاين
 */
async deleteImage(id: string): Promise<{ success: boolean }>
```

##### 4.5 دوال التاريخ
```typescript
/**
 * جلب تاريخ تغيير حالات طلب الإصلاح
 * ⚡ يدعم الأوفلاين
 */
async getHistory(repairOrderId: string): Promise<RepairHistory[]>

/**
 * إضافة سجل تاريخ
 * ⚡ يدعم الأوفلاين
 */
async addHistory(repairOrderId: string, status: string, notes?: string): Promise<RepairHistory>
```

#### معايير الاكتمال:
- [ ] الملف `/src/services/repairService.ts` موجود
- [ ] جميع الدوال الأساسية موجودة
- [ ] كل دالة تدعم offline fallback
- [ ] TypeScript لا يظهر أخطاء
- [ ] الدوال تعمل أونلاين وأوفلاين

---

### المرحلة 5️⃣: تحديث syncRepairs.ts
**الوقت:** 30 دقيقة
**الأولوية:** 🔴 عالية

#### الملف: `/src/api/syncRepairs.ts`

#### المهام:
1. إضافة دوال مزامنة منفصلة لكل جدول
2. تحديث `syncPendingRepairs()` للاستدعاء الفعلي
3. إضافة `fullRepairSync()`

#### التفاصيل:

##### 5.1 دوال المزامنة المنفصلة
```typescript
/**
 * ⚡ مزامنة طلبات الإصلاح من السيرفر
 */
export async function syncRepairOrdersFromServer(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    console.log('[syncRepairOrdersFromServer] ⚡ جلب طلبات الإصلاح...');

    const { data, error } = await supabase
      .from('repair_orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    let count = 0;
    for (const order of data || []) {
      await localRepairService.saveRemoteRepairOrder(order, organizationId);
      count++;
    }

    console.log(`[syncRepairOrdersFromServer] ✅ تم جلب ${count} طلب`);
    return { success: true, count };
  } catch (error: any) {
    console.error('[syncRepairOrdersFromServer] ❌ خطأ:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * ⚡ مزامنة مواقع الإصلاح من السيرفر
 */
export async function syncRepairLocationsFromServer(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}>

/**
 * ⚡ مزامنة صور الإصلاح من السيرفر
 */
export async function syncRepairImagesFromServer(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}>

/**
 * ⚡ مزامنة تاريخ الحالات من السيرفر
 */
export async function syncRepairHistoryFromServer(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}>
```

##### 5.2 تحديث syncPendingRepairs
```typescript
/**
 * ⚡ مزامنة الإصلاحات المعلقة
 */
export async function syncPendingRepairs(organizationId?: string) {
  const orgId = organizationId || getOrgId();
  if (!orgId) return { ok: false };

  console.log('[syncPendingRepairs] ⚡ بدء المزامنة...');

  try {
    await Promise.all([
      syncRepairOrdersFromServer(orgId),
      syncRepairLocationsFromServer(orgId),
      syncRepairImagesFromServer(orgId),
      syncRepairHistoryFromServer(orgId)
    ]);

    return { ok: true };
  } catch (error) {
    console.error('[syncPendingRepairs] ❌ خطأ:', error);
    return { ok: false };
  }
}
```

##### 5.3 إضافة fullRepairSync
```typescript
/**
 * ⚡ مزامنة كاملة للإصلاحات
 */
export async function fullRepairSync(organizationId: string): Promise<{
  success: boolean;
  downloaded: number;
  uploaded: number;
  error?: string;
}> {
  try {
    console.log('[fullRepairSync] ⚡ بدء المزامنة الكاملة...');

    // 1. جلب من السيرفر
    const [orders, locations, images, history] = await Promise.all([
      syncRepairOrdersFromServer(organizationId),
      syncRepairLocationsFromServer(organizationId),
      syncRepairImagesFromServer(organizationId),
      syncRepairHistoryFromServer(organizationId)
    ]);

    const downloaded =
      orders.count +
      locations.count +
      images.count +
      history.count;

    console.log(`[fullRepairSync] ✅ تم تنزيل ${downloaded} سجل`);

    // 2. رفع التغييرات المحلية (يتم تلقائياً عبر BatchSender)
    const unsynced = await localRepairService.getUnsyncedRepairOrders(organizationId);
    console.log(`[fullRepairSync] 📤 ${unsynced.length} طلب في انتظار الرفع`);

    return {
      success: true,
      downloaded,
      uploaded: 0 // BatchSender سيتعامل معها
    };
  } catch (error: any) {
    console.error('[fullRepairSync] ❌ خطأ:', error);
    return {
      success: false,
      downloaded: 0,
      uploaded: 0,
      error: error.message
    };
  }
}
```

#### معايير الاكتمال:
- [ ] دوال المزامنة المنفصلة موجودة
- [ ] `syncPendingRepairs()` يستدعي الدوال الفعلية
- [ ] `fullRepairSync()` موجود ويعمل
- [ ] لا توجد أخطاء في الكونسول

---

### المرحلة 6️⃣: إضافة دوال في localRepairService.ts
**الوقت:** 20 دقيقة
**الأولوية:** 🟡 متوسطة

#### الملف: `/src/api/localRepairService.ts`

#### المهام:
1. إضافة `saveRemoteRepairOrder()`
2. إضافة `saveRemoteRepairLocation()`
3. إضافة `saveRemoteRepairImage()`
4. إضافة `saveRemoteRepairHistory()`
5. إضافة `getUnsyncedRepairOrders()`
6. إضافة دوال CRUD لمواقع الإصلاح

#### التفاصيل:

##### 6.1 دوال حفظ من السيرفر
```typescript
/**
 * حفظ طلب إصلاح من السيرفر (بدون إضافته للـ Outbox)
 */
export async function saveRemoteRepairOrder(
  order: any,
  organizationId?: string
): Promise<LocalRepairOrder> {
  const orgId = organizationId || getOrgId();
  const now = nowISO();

  const rec: LocalRepairOrder = {
    ...order,
    organization_id: orgId,
    customer_name_lower: normAr(order.customer_name),
    device_type_lower: normAr(order.device_type),
    synced: true, // ✅ من السيرفر
    pendingOperation: undefined,
    updated_at: order.updated_at || now
  };

  await deltaWriteService.saveFromServer('repairs', rec);
  console.log(`[LocalRepair] ✅ حفظ طلب ${order.id} من السيرفر`);
  return rec;
}

/**
 * حفظ موقع إصلاح من السيرفر
 */
export async function saveRemoteRepairLocation(
  location: any,
  organizationId?: string
): Promise<LocalRepairLocation>

/**
 * حفظ صورة إصلاح من السيرفر
 */
export async function saveRemoteRepairImage(
  image: any
): Promise<LocalRepairImage>

/**
 * حفظ سجل تاريخ من السيرفر
 */
export async function saveRemoteRepairHistory(
  history: any
): Promise<LocalRepairStatusHistory>
```

##### 6.2 جلب غير المتزامن
```typescript
/**
 * جلب طلبات الإصلاح غير المتزامنة
 */
export async function getUnsyncedRepairOrders(
  organizationId?: string
): Promise<LocalRepairOrder[]> {
  const orgId = organizationId || getOrgId();

  const all = await deltaWriteService.getAll<LocalRepairOrder>('repairs', orgId, {
    where: 'synced = 0 OR synced = false',
    orderBy: 'created_at DESC'
  });

  return all;
}
```

##### 6.3 دوال CRUD لمواقع الإصلاح
```typescript
/**
 * إنشاء موقع إصلاح محلياً
 */
export async function createLocalRepairLocation(
  input: CreateLocationInput
): Promise<LocalRepairLocation>

/**
 * تحديث موقع إصلاح محلياً
 */
export async function updateLocalRepairLocation(
  id: string,
  updates: Partial<CreateLocationInput>
): Promise<LocalRepairLocation | null>

/**
 * حذف موقع إصلاح محلياً
 */
export async function deleteLocalRepairLocation(id: string): Promise<void>

/**
 * قائمة مواقع الإصلاح محلياً
 */
export async function listLocalRepairLocations(
  organizationId?: string
): Promise<LocalRepairLocation[]>

/**
 * جلب موقع إصلاح محلياً
 */
export async function getLocalRepairLocation(
  id: string
): Promise<LocalRepairLocation | null>
```

#### معايير الاكتمال:
- [ ] دوال `saveRemote*` موجودة
- [ ] `getUnsyncedRepairOrders()` موجود
- [ ] دوال CRUD للمواقع موجودة
- [ ] جميع الدوال تعمل بشكل صحيح

---

### المرحلة 7️⃣: تحديث UI Components (اختياري)
**الوقت:** 30 دقيقة
**الأولوية:** 🟢 منخفضة

#### المهام:
1. البحث عن المكونات التي تستخدم `localRepairService`
2. تحديثها لاستخدام `repairService`
3. إضافة رسائل offline indicators

#### التفاصيل:

##### 7.1 البحث عن المكونات
```bash
grep -r "localRepairService" src/components/
grep -r "repair" src/pages/
```

##### 7.2 الاستبدال
```typescript
// قبل:
import { createLocalRepairOrder } from '@/api/localRepairService';

const handleCreate = async () => {
  await createLocalRepairOrder(input);
};

// بعد:
import { repairService } from '@/services/repairService';

const handleCreate = async () => {
  await repairService.create(input, organizationId);
};
```

##### 7.3 إضافة offline indicators
```typescript
const { isOnline } = useNetworkStatus();

// في UI:
{!isOnline && (
  <div className="bg-yellow-50 text-yellow-800 p-2">
    ⚠️ وضع أوفلاين - سيتم المزامنة عند عودة الاتصال
  </div>
)}
```

#### معايير الاكتمال:
- [ ] المكونات تستخدم `repairService`
- [ ] يعمل الإنشاء أوفلاين
- [ ] يعمل التحديث أوفلاين
- [ ] يعمل الحذف أوفلاين
- [ ] المزامنة تلقائية عند عودة الاتصال

---

## ✅ قائمة التحقق النهائية

### البنية التحتية:
- [ ] repair_locations في tauriSchema.ts
- [ ] repair_images في tauriSchema.ts
- [ ] repair_status_history في tauriSchema.ts
- [ ] repair_orders محدّث في tauriSchema.ts
- [ ] repair_orders في SYNCED_TABLES
- [ ] repair_locations في SYNCED_TABLES
- [ ] جميع الجداول في TABLES_WITH_SYNCED_COLUMN

### الخدمات:
- [ ] repairService.ts موجود وكامل
- [ ] syncRepairs.ts محدّث ومتكامل
- [ ] localRepairService.ts يحتوي على دوال saveRemote*
- [ ] localRepairService.ts يحتوي على دوال CRUD للمواقع

### الاختبار:
- [ ] إنشاء طلب إصلاح أوفلاين يعمل
- [ ] تحديث طلب أوفلاين يعمل
- [ ] حذف طلب أوفلاين يعمل
- [ ] إضافة موقع أوفلاين يعمل
- [ ] إضافة صورة أوفلاين يعمل
- [ ] المزامنة تلقائية عند عودة الاتصال
- [ ] يظهر العدد الصحيح في NavbarSyncIndicator
- [ ] لا توجد أخطاء في الكونسول

---

## 🚀 الخلاصة

**الوقت الإجمالي:** ~2.5 ساعة
**الأولوية:** 🔴 عالية جداً

**الخطوات الأساسية:**
1. تحديث tauriSchema.ts (15 دقيقة)
2. تحديث types.ts و DeltaSyncEngine.ts (10 دقائق)
3. إنشاء repairService.ts (45 دقيقة)
4. تحديث syncRepairs.ts (30 دقيقة)
5. تحديث localRepairService.ts (20 دقيقة)
6. تحديث UI (اختياري) (30 دقيقة)

**النتيجة النهائية:** نظام إصلاح يعمل بشكل كامل أوفلاين، مثل نظام الموظفين! 🎉
