# 📋 خطة تنفيذ نظام الموظفين والصلاحيات Offline مع Delta Sync

## 🎯 الهدف
جعل نظام إدارة الموظفين والصلاحيات يعمل بالكامل في وضع Offline مع مزامنة تلقائية باستخدام Delta Sync.

---

## 📊 التحليل الحالي

### 1. الجداول الموجودة في SQLite

#### أ) `staff_members` (جدول الموظفين)
```sql
CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff',
  permissions TEXT,              -- ✅ JSON للصلاحيات
  pin_hash TEXT,
  salt TEXT,
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT,
  updated_at TEXT,
  synced INTEGER DEFAULT 0,      -- ✅ للمزامنة
  sync_status TEXT,              -- ✅ للمزامنة
  pending_operation TEXT         -- ✅ للمزامنة
);
```

**الأعمدة المهمة:**
- `permissions`: JSON يحتوي على صلاحيات الموظف
- `synced`: 0 = غير مزامن، 1 = مزامن
- `sync_status`: pending_sync, syncing, synced, failed
- `pending_operation`: create, update, delete

#### ب) `user_permissions` (جدول صلاحيات المستخدمين)
```sql
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
  permissions TEXT,              -- ✅ JSON للصلاحيات
  created_at TEXT,
  updated_at TEXT
);
```

#### ج) `staff_pins` (جدول PINs للموظفين - للأوفلاين)
```sql
CREATE TABLE IF NOT EXISTS staff_pins (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  staff_name TEXT,
  permissions TEXT,              -- ✅ JSON للصلاحيات
  created_at TEXT,
  updated_at TEXT
);
```

---

### 2. الخدمات الحالية (staffService.ts)

#### العمليات الموجودة:
1. ✅ `getAll()` - جلب جميع الموظفين (RPC: `get_pos_staff_sessions`)
2. ✅ `save()` - حفظ/تعديل موظف (RPC: `save_pos_staff_session`)
3. ✅ `updatePin()` - تحديث PIN (RPC: `update_staff_pin`)
4. ✅ `delete()` - حذف موظف (RPC: `delete_pos_staff_session`)
5. ✅ `toggleActive()` - تفعيل/تعطيل موظف
6. ✅ `createStaffWithAuth()` - إنشاء موظف مع حساب Auth
7. ✅ `verifyStaffLogin()` - التحقق من PIN (RPC: `verify_staff_login`)

**المشاكل:**
- ❌ كل العمليات تعتمد على Supabase RPC
- ❌ لا تعمل في وضع Offline
- ❌ لا توجد fallback إلى SQLite
- ❌ لا توجد مزامنة تلقائية

---

### 3. الجداول في Supabase

#### أ) `pos_staff_sessions`
- المصدر الرئيسي للموظفين في السيرفر
- يحتوي على: id, organization_id, staff_name, pin_code (encrypted), permissions, is_active, user_id

#### ب) `users`
- يربط الموظف بحساب Auth
- يحتوي على: id, email, name, role, organization_id, permissions, is_active

---

## 🚀 خطة التنفيذ

### المرحلة 1: إنشاء Local Services (2-3 ساعات)

#### 1.1 إنشاء `localStaffService.ts`

**الموقع:** `src/api/localStaffService.ts`

**الوظائف المطلوبة:**
```typescript
// جلب جميع الموظفين من SQLite
async getAll(organizationId: string): Promise<StaffMember[]>

// جلب موظف واحد
async getById(staffId: string, organizationId: string): Promise<StaffMember | null>

// حفظ/تحديث موظف محلياً
async upsert(staff: StaffMember, organizationId: string): Promise<void>

// حذف موظف محلياً
async delete(staffId: string, organizationId: string): Promise<void>

// التحقق من PIN محلياً
async verifyPin(pin: string, organizationId: string): Promise<{ success: boolean; staff?: StaffMember }>

// جلب الموظفين غير المزامنة
async getUnsynced(organizationId: string): Promise<StaffMember[]>

// تحديث حالة المزامنة
async updateSyncStatus(staffId: string, synced: boolean, organizationId: string): Promise<void>
```

#### 1.2 إنشاء `syncStaff.ts` (خدمة المزامنة)

**الموقع:** `src/api/syncStaff.ts`

**الوظائف المطلوبة:**
```typescript
// مزامنة الموظفين من السيرفر إلى SQLite
async syncStaffFromServer(organizationId: string): Promise<SyncResult>

// مزامنة التغييرات المحلية إلى السيرفر
async syncStaffToServer(organizationId: string): Promise<SyncResult>

// مزامنة كاملة (اتجاهين)
async fullStaffSync(organizationId: string): Promise<SyncResult>
```

---

### المرحلة 2: دمج مع Delta Sync (1-2 ساعة)

#### 2.1 إضافة `staff_members` إلى `DELTA_SYNC_TABLES`

**الموقع:** `src/lib/sync/delta/types.ts`

```typescript
export const DELTA_SYNC_TABLES: Record<string, string> = {
  // ... الجداول الموجودة

  staff_members: `
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
      synced INTEGER DEFAULT 0
    )
  `,
};
```

#### 2.2 إضافة `staff_members` إلى `SYNCED_TABLES`

**الموقع:** `src/lib/sync/delta/types.ts`

```typescript
export const DELTA_SYNC_CONSTANTS = {
  // ... الموجود
  SYNCED_TABLES: [
    'products',
    'customers',
    'orders',
    'invoices',
    'work_sessions',
    'repair_orders',
    'staff_members', // ✅ إضافة
  ],
};
```

#### 2.3 إضافة `staff_members` إلى `TABLES_WITH_SYNCED_COLUMN`

**الموقع:** `src/lib/sync/delta/DeltaSyncEngine.ts`

```typescript
private readonly TABLES_WITH_SYNCED_COLUMN: string[] = [
  'products',
  'customers',
  'orders',
  'pos_orders',
  'invoices',
  'work_sessions',
  'repair_orders',
  'staff_members', // ✅ إضافة
];
```

---

### المرحلة 3: تحديث staffService.ts (1-2 ساعة)

#### 3.1 إضافة Offline Fallback

**التعديلات المطلوبة:**

```typescript
// في getAll()
async getAll(organizationId?: string): Promise<POSStaffSession[]> {
  try {
    // ⚡ محاولة السيرفر أولاً
    const { data, error } = await supabase.rpc('get_pos_staff_sessions', {
      p_organization_id: organizationId || null,
    });

    if (!error) {
      // ✅ حفظ في SQLite للأوفلاين
      await localStaffService.syncToLocal(data, organizationId);
      return data;
    }
  } catch (error) {
    console.warn('[staffService] Server failed, using local data');
  }

  // ⚡ Fallback: جلب من SQLite
  return await localStaffService.getAll(organizationId);
}

// في save()
async save(input: SaveStaffSessionInput): Promise<SaveStaffSessionResponse> {
  try {
    // ⚡ محاولة السيرفر أولاً
    const { data, error } = await supabase.rpc('save_pos_staff_session', { ... });

    if (!error) {
      // ✅ حفظ في SQLite
      await localStaffService.upsert(data, input.organization_id);
      return data;
    }
  } catch (error) {
    console.warn('[staffService] Server failed, saving locally');
  }

  // ⚡ Fallback: حفظ في SQLite مع pending_operation
  await localStaffService.upsertWithPending(input);
  await outboxManager.add({
    tableName: 'staff_members',
    operation: input.id ? 'UPDATE' : 'INSERT',
    recordId: input.id || crypto.randomUUID(),
    payload: input,
  });

  return {
    success: true,
    action: input.id ? 'updated' : 'created',
    staff_id: input.id,
  };
}
```

---

### المرحلة 4: تحديث UI Components (1-2 ساعة)

#### 4.1 تحديث `StaffManagement.tsx`

**التعديلات المطلوبة:**

```typescript
// إضافة مؤشر حالة الاتصال
const { isOnline } = useNetworkStatus();

// تحديث useQuery لدعم offline
const { data: staffSessions = [], isLoading, error, refetch } = useQuery({
  queryKey: ['pos-staff-sessions', organization?.id],
  queryFn: () => staffService.getAll(organization?.id),
  staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // ✅ لا تنتهي في offline
  gcTime: 30 * 60 * 1000,
  // ✅ استخدام البيانات المحلية أثناء الانتظار
  placeholderData: (previousData) => previousData,
});

// عرض مؤشر offline
{!isOnline && (
  <Alert className="mb-4">
    <AlertTitle>وضع عدم الاتصال</AlertTitle>
    <AlertDescription>
      أنت تعمل حالياً في وضع عدم الاتصال. التغييرات ستُزامن تلقائياً عند عودة الاتصال.
    </AlertDescription>
  </Alert>
)}

// إضافة عداد الموظفين غير المزامنة
const unsyncedCount = staffSessions.filter(s => !s.synced).length;

{unsyncedCount > 0 && (
  <Badge variant="secondary">
    {unsyncedCount} في انتظار المزامنة
  </Badge>
)}
```

#### 4.2 إضافة مؤشرات المزامنة للموظفين

```typescript
// في StaffTable.tsx
<TableCell>
  <div className="flex items-center gap-2">
    <span>{staff.name}</span>
    {!staff.synced && (
      <Badge variant="outline" size="sm">
        <Clock className="w-3 h-3 mr-1" />
        معلق
      </Badge>
    )}
  </div>
</TableCell>
```

---

### المرحلة 5: إضافة إلى زر المزامنة (30 دقيقة)

#### 5.1 تحديث `TauriSyncService.ts`

**الموقع:** `src/lib/sync/TauriSyncService.ts`

**إضافة staff إلى fullSync:**

```typescript
export async function fullSync(organizationId: string): Promise<FullSyncResult> {
  const results: FullSyncResult = {
    success: true,
    results: {
      products: { success: true, count: 0 },
      customers: { success: true, count: 0 },
      orders: { success: true, count: 0 },
      invoices: { success: true, count: 0 },
      staff: { success: true, count: 0 }, // ✅ إضافة
      uploaded: { success: true, uploaded: 0 },
    },
  };

  // ... sync products, customers, etc.

  // ✅ مزامنة الموظفين
  try {
    console.log('[TauriSync] 👥 Syncing staff...');
    const staffResult = await syncStaffFromServer(organizationId);
    results.results.staff = {
      success: staffResult.success,
      count: staffResult.syncedCount || 0,
      error: staffResult.error,
    };
  } catch (error: any) {
    results.results.staff = {
      success: false,
      count: 0,
      error: error.message,
    };
    results.success = false;
  }

  // ... upload pending changes

  return results;
}
```

#### 5.2 تحديث `UpdateButton.tsx`

**الموقع:** `src/components/desktop/UpdateButton.tsx`

**إضافة staff إلى عرض النتائج:**

```typescript
<div className="space-y-2">
  <SyncResultItem label="المنتجات" result={results.products} />
  <SyncResultItem label="العملاء" result={results.customers} />
  <SyncResultItem label="الطلبات" result={results.orders} />
  <SyncResultItem label="الفواتير" result={results.invoices} />
  <SyncResultItem label="الموظفين" result={results.staff} /> {/* ✅ إضافة */}
</div>
```

---

### المرحلة 6: إضافة الصلاحيات Offline (1 ساعة)

#### 6.1 إنشاء `localPermissionsService.ts`

**الموقع:** `src/api/localPermissionsService.ts`

```typescript
export const localPermissionsService = {
  // حفظ صلاحيات موظف
  async saveStaffPermissions(
    staffId: string,
    permissions: Record<string, boolean>,
    organizationId: string
  ): Promise<void> {
    await tauriExecute(
      organizationId,
      `UPDATE staff_members SET permissions = ?, updated_at = ?, synced = 0 WHERE id = ?`,
      [JSON.stringify(permissions), new Date().toISOString(), staffId]
    );
  },

  // جلب صلاحيات موظف
  async getStaffPermissions(
    staffId: string,
    organizationId: string
  ): Promise<Record<string, boolean>> {
    const result = await tauriQueryOne(
      organizationId,
      `SELECT permissions FROM staff_members WHERE id = ?`,
      [staffId]
    );

    if (result.data?.permissions) {
      return JSON.parse(result.data.permissions);
    }

    return {};
  },

  // تحديث صلاحية معينة
  async updatePermission(
    staffId: string,
    permissionKey: string,
    value: boolean,
    organizationId: string
  ): Promise<void> {
    const currentPermissions = await this.getStaffPermissions(staffId, organizationId);
    currentPermissions[permissionKey] = value;
    await this.saveStaffPermissions(staffId, currentPermissions, organizationId);
  },
};
```

#### 6.2 إضافة واجهة تحرير الصلاحيات

**إنشاء:** `src/components/staff/StaffPermissionsDialog.tsx`

```typescript
export function StaffPermissionsDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: StaffMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { organization } = useOrganization();
  const { isOnline } = useNetworkStatus();
  const [permissions, setPermissions] = useState(staff.permissions || {});

  // قائمة الصلاحيات
  const availablePermissions = [
    { key: 'viewInventory', label: 'عرض المخزون' },
    { key: 'manageProducts', label: 'إدارة المنتجات' },
    { key: 'accessPOS', label: 'الوصول لنقطة البيع' },
    { key: 'manageOrders', label: 'إدارة الطلبات' },
    { key: 'viewReports', label: 'عرض التقارير' },
    { key: 'manageCustomers', label: 'إدارة العملاء' },
    { key: 'manageEmployees', label: 'إدارة الموظفين' },
    { key: 'manageSettings', label: 'إدارة الإعدادات' },
  ];

  const handleSave = async () => {
    try {
      if (isOnline) {
        // ✅ حفظ في السيرفر
        await staffService.save({
          ...staff,
          permissions,
        });
      } else {
        // ⚡ حفظ محلياً
        await localPermissionsService.saveStaffPermissions(
          staff.id,
          permissions,
          organization.id
        );

        // إضافة للـ outbox
        await outboxManager.add({
          tableName: 'staff_members',
          operation: 'UPDATE',
          recordId: staff.id,
          payload: { permissions },
        });
      }

      toast.success('تم تحديث الصلاحيات');
      onOpenChange(false);
    } catch (error) {
      toast.error('فشل تحديث الصلاحيات');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>صلاحيات {staff.name}</DialogTitle>
          {!isOnline && (
            <Alert>
              <AlertDescription>
                وضع عدم الاتصال - سيتم المزامنة لاحقاً
              </AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {availablePermissions.map((perm) => (
            <div key={perm.key} className="flex items-center justify-between">
              <Label>{perm.label}</Label>
              <Switch
                checked={permissions[perm.key] || false}
                onCheckedChange={(checked) => {
                  setPermissions({ ...permissions, [perm.key]: checked });
                }}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📊 جدول الأولويات

| المرحلة | الوقت المقدر | الأولوية | الحالة |
|---------|--------------|---------|--------|
| 1. Local Services | 2-3 ساعات | عالية جداً | ⏳ معلق |
| 2. Delta Sync | 1-2 ساعة | عالية جداً | ⏳ معلق |
| 3. staffService Update | 1-2 ساعة | عالية | ⏳ معلق |
| 4. UI Updates | 1-2 ساعة | متوسطة | ⏳ معلق |
| 5. زر المزامنة | 30 دقيقة | متوسطة | ⏳ معلق |
| 6. الصلاحيات Offline | 1 ساعة | متوسطة | ⏳ معلق |

**الوقت الإجمالي المقدر:** 7-10 ساعات

---

## ✅ Checklist التنفيذ

### Phase 1: Foundation
- [ ] إنشاء `src/api/localStaffService.ts`
- [ ] إنشاء `src/api/syncStaff.ts`
- [ ] إضافة types في `src/types/staff.ts`
- [ ] كتابة unit tests

### Phase 2: Delta Sync Integration
- [ ] إضافة `staff_members` إلى `DELTA_SYNC_TABLES`
- [ ] إضافة إلى `SYNCED_TABLES`
- [ ] إضافة إلى `TABLES_WITH_SYNCED_COLUMN`
- [ ] اختبار المزامنة

### Phase 3: Service Layer
- [ ] تحديث `staffService.getAll()` مع fallback
- [ ] تحديث `staffService.save()` مع fallback
- [ ] تحديث `staffService.delete()` مع fallback
- [ ] تحديث `staffService.updatePin()` مع fallback
- [ ] اختبار جميع العمليات offline

### Phase 4: UI Layer
- [ ] تحديث `StaffManagement.tsx`
- [ ] إضافة offline indicator
- [ ] إضافة pending sync badges
- [ ] تحديث `StaffTable.tsx`
- [ ] اختبار UI في offline mode

### Phase 5: Sync Button
- [ ] تحديث `TauriSyncService.ts`
- [ ] إضافة staff sync إلى `fullSync()`
- [ ] تحديث `UpdateButton.tsx`
- [ ] إضافة عرض نتائج staff
- [ ] اختبار زر المزامنة

### Phase 6: Permissions
- [ ] إنشاء `localPermissionsService.ts`
- [ ] إنشاء `StaffPermissionsDialog.tsx`
- [ ] دمج مع staffService
- [ ] اختبار الصلاحيات offline

---

## 🧪 خطة الاختبار

### اختبارات Offline Mode:
1. ✅ إنشاء موظف جديد offline
2. ✅ تحديث بيانات موظف offline
3. ✅ حذف موظف offline
4. ✅ تحديث صلاحيات offline
5. ✅ تحديث PIN offline
6. ✅ التحقق من PIN offline

### اختبارات المزامنة:
1. ✅ مزامنة موظفين من السيرفر
2. ✅ مزامنة تغييرات محلية للسيرفر
3. ✅ حل التعارضات
4. ✅ عرض حالة المزامنة
5. ✅ إعادة المحاولة عند الفشل

### اختبارات UI:
1. ✅ عرض مؤشر offline
2. ✅ عرض عدد العمليات المعلقة
3. ✅ تعطيل/تفعيل الأزرار حسب الحالة
4. ✅ عرض رسائل toast مناسبة

---

## 📝 ملاحظات مهمة

### 1. أمان PINs:
- ✅ يتم تخزين PINs مع hash + salt
- ✅ لا يتم إرسال plain text PINs
- ✅ التحقق يتم عبر hash comparison

### 2. الصلاحيات:
- ✅ تُخزن كـ JSON في `permissions` column
- ✅ يمكن تحديثها offline
- ✅ تُزامن تلقائياً

### 3. المزامنة:
- ✅ استخدام Delta Sync للكفاءة
- ✅ Outbox للعمليات المعلقة
- ✅ Conflict resolution باستخدام last-write-wins

### 4. التوافقية:
- ✅ يعمل في Tauri و Electron و Web
- ✅ نفس الـ schema في جميع البيئات
- ✅ نفس الـ API interface

---

## 🎯 النتيجة المتوقعة

بعد التنفيذ الكامل:
- ✅ إدارة كاملة للموظفين offline
- ✅ تحديث الصلاحيات offline
- ✅ التحقق من PIN offline
- ✅ مزامنة تلقائية ثنائية الاتجاه
- ✅ عرض حالة المزامنة في UI
- ✅ دمج كامل مع زر المزامنة
- ✅ تجربة مستخدم سلسة بين online/offline

---

**تاريخ الإنشاء:** 2025-01-24
**آخر تحديث:** 2025-01-24
**الحالة:** 📋 جاهز للتنفيذ
