# 🏗️ معمارية نظام الموظفين والصلاحيات Offline

## 📐 نظرة عامة

```
┌─────────────────────────────────────────────────────────────┐
│                      TAURI APPLICATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Online     │  │   Offline    │  │   Syncing    │     │
│  │              │  │              │  │              │     │
│  │ Supabase RPC │  │  SQLite DB   │  │ Delta Sync   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │ staffService │                          │
│                    │  (Unified)   │                          │
│                    └──────┬──────┘                          │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐              │
│         │                 │                 │              │
│   ┌─────▼──────┐   ┌─────▼──────┐   ┌─────▼──────┐       │
│   │   Staff    │   │ Permissions│   │    Sync    │       │
│   │ Management │   │   Dialog   │   │   Button   │       │
│   └────────────┘   └────────────┘   └────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 تدفق البيانات (Data Flow)

### 1. إنشاء موظف جديد

#### أ) Online Mode:
```
User Input → StaffManagement.tsx
    ↓
staffService.save()
    ↓
Supabase RPC (save_pos_staff_session)
    ↓
localStaffService.upsert() [Cache]
    ↓
SQLite (staff_members)
    ↓
UI Update
```

#### ب) Offline Mode:
```
User Input → StaffManagement.tsx
    ↓
staffService.save() [Detect Offline]
    ↓
localStaffService.upsertWithPending()
    ↓
SQLite (staff_members, synced=0)
    ↓
outboxManager.add()
    ↓
SQLite (sync_outbox)
    ↓
UI Update + Pending Badge
    ↓
[When Online]
    ↓
batchSender.sendBatch()
    ↓
Supabase RPC
    ↓
Update synced=1
```

---

### 2. تحديث الصلاحيات

#### أ) Online Mode:
```
User Input → StaffPermissionsDialog.tsx
    ↓
staffService.save({ permissions })
    ↓
Supabase RPC
    ↓
localPermissionsService.saveStaffPermissions()
    ↓
SQLite UPDATE permissions
    ↓
UI Update
```

#### ب) Offline Mode:
```
User Input → StaffPermissionsDialog.tsx
    ↓
localPermissionsService.saveStaffPermissions()
    ↓
SQLite UPDATE (permissions, synced=0)
    ↓
outboxManager.add({ operation: 'UPDATE' })
    ↓
UI Update + Pending Badge
    ↓
[When Online] → Delta Sync
```

---

### 3. التحقق من PIN (Login)

#### أ) Online Mode:
```
User Input PIN → StaffLoginForm
    ↓
staffService.verifyPin()
    ↓
Supabase RPC (verify_staff_login)
    ↓
Save to staff_pins [For Offline]
    ↓
Return Staff + Token
    ↓
Login Success
```

#### ب) Offline Mode:
```
User Input PIN → StaffLoginForm
    ↓
staffService.verifyPin() [Detect Offline]
    ↓
localStaffService.verifyPin()
    ↓
SQLite Query (staff_pins)
    ↓
Hash Comparison
    ↓
Login Success/Failure
```

---

### 4. المزامنة التلقائية

```
[Network Status Change: Online]
    ↓
deltaSyncEngine.fullSync()
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
▼                 ▼                  ▼
Download          Upload            Resolve
Staff from        Local             Conflicts
Server            Changes
    │                 │                  │
    ↓                 ↓                  ↓
syncStaffFromServer  syncStaffToServer  conflictResolver
    │                 │                  │
    ↓                 ↓                  ↓
UPDATE SQLite    UPDATE Supabase    last-write-wins
(synced=1)       (from outbox)
    │                 │                  │
    └─────────────────┴──────────────────┘
                      │
                      ↓
              Update UI + Toast
```

---

## 🗄️ هيكل قاعدة البيانات

### SQLite Tables

```sql
┌─────────────────────────────────────────────────────────┐
│                     staff_members                        │
├──────────────┬──────────────────────────────────────────┤
│ id           │ TEXT PRIMARY KEY                         │
│ org_id       │ TEXT NOT NULL                            │
│ user_id      │ TEXT (Link to users table)               │
│ name         │ TEXT NOT NULL                            │
│ email        │ TEXT                                     │
│ phone        │ TEXT                                     │
│ role         │ TEXT DEFAULT 'staff'                     │
│ permissions  │ TEXT (JSON)  ← الصلاحيات               │
│ pin_hash     │ TEXT                                     │
│ salt         │ TEXT                                     │
│ is_active    │ INTEGER DEFAULT 1                        │
│ last_login   │ TEXT                                     │
│ created_at   │ TEXT                                     │
│ updated_at   │ TEXT                                     │
│ synced       │ INTEGER DEFAULT 0  ← حالة المزامنة      │
│ sync_status  │ TEXT                                     │
│ pending_op   │ TEXT                                     │
└──────────────┴──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      staff_pins                          │
├──────────────┬──────────────────────────────────────────┤
│ id           │ TEXT PRIMARY KEY                         │
│ staff_id     │ TEXT NOT NULL UNIQUE                     │
│ org_id       │ TEXT NOT NULL                            │
│ pin_hash     │ TEXT NOT NULL                            │
│ salt         │ TEXT NOT NULL                            │
│ staff_name   │ TEXT                                     │
│ permissions  │ TEXT (JSON)  ← للتحقق السريع           │
│ created_at   │ TEXT                                     │
│ updated_at   │ TEXT                                     │
└──────────────┴──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    user_permissions                      │
├──────────────┬──────────────────────────────────────────┤
│ id           │ TEXT PRIMARY KEY                         │
│ auth_user_id │ TEXT NOT NULL                            │
│ user_id      │ TEXT                                     │
│ email        │ TEXT                                     │
│ name         │ TEXT                                     │
│ role         │ TEXT                                     │
│ org_id       │ TEXT                                     │
│ is_active    │ INTEGER                                  │
│ is_org_admin │ INTEGER                                  │
│ is_super     │ INTEGER                                  │
│ permissions  │ TEXT (JSON)  ← صلاحيات المستخدم        │
│ created_at   │ TEXT                                     │
│ updated_at   │ TEXT                                     │
└──────────────┴──────────────────────────────────────────┘
```

---

## 🔐 نظام الصلاحيات

### Permissions Structure (JSON)

```json
{
  "viewInventory": true,
  "manageProducts": true,
  "editProducts": true,
  "deleteProducts": false,
  "accessPOS": true,
  "manageOrders": true,
  "viewReports": true,
  "manageCustomers": true,
  "manageEmployees": false,
  "manageSettings": false,
  "canGiveDiscounts": true,
  "maxDiscountPercent": 20,
  "canDeleteOrders": false,
  "canVoidTransactions": false,
  "canAccessCashDrawer": true,
  "canRefund": true,
  "maxRefundAmount": 5000
}
```

### Permission Levels

```
┌─────────────────────────────────────────────────┐
│                 Owner/Admin                      │
│         (Full Access - All Permissions)          │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│    Manager      │  │   Supervisor    │
│ (Most Perms)    │  │ (Moderate Perms)│
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    │
                    ▼
         ┌─────────────────┐
         │      Staff      │
         │ (Basic Perms)   │
         └─────────────────┘
```

---

## 🔄 Delta Sync Flow

### Full Sync Process

```
1. Initialize Delta Sync Engine
   ↓
2. Check Connection Status
   ↓
3. Download Phase
   ├─→ Fetch staff_members from Supabase
   ├─→ Compare with local data (by updated_at)
   ├─→ INSERT new staff
   ├─→ UPDATE changed staff
   └─→ Mark synced=1
   ↓
4. Upload Phase
   ├─→ Get pending operations from outbox
   ├─→ Filter staff operations
   ├─→ Send batch to Supabase
   └─→ Remove from outbox on success
   ↓
5. Conflict Resolution
   ├─→ Detect conflicts (same record updated both sides)
   ├─→ Apply strategy: last-write-wins
   └─→ Update both local and remote
   ↓
6. Update UI
   ├─→ Refresh staff list
   ├─→ Update sync badges
   └─→ Show toast notification
```

### Incremental Sync (Real-time)

```
[Supabase Realtime Event]
    ↓
realtimeReceiver.subscribe('staff_members')
    ↓
Receive INSERT/UPDATE/DELETE
    ↓
operationQueue.enqueue()
    ↓
Apply to Local SQLite
    ↓
Invalidate React Query Cache
    ↓
UI Auto-Updates
```

---

## 📱 UI Components Architecture

```
┌─────────────────────────────────────────────────┐
│          StaffManagement.tsx                     │
│  ┌───────────────────────────────────────────┐  │
│  │  Header + Search + Filters                │  │
│  │  [+ إضافة موظف] [🔄 مزامنة]               │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Offline Indicator (if offline)           │  │
│  │  ⚠️ وضع عدم الاتصال - 5 في انتظار       │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │          StaffTable.tsx                   │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │ Name │ Email │ Role │ Active │ Sync│  │  │
│  │  ├─────────────────────────────────────┤  │  │
│  │  │ أحمد │ a@.. │ staff │  ✅   │  ⏳ │  │  │
│  │  │ محمد │ m@.. │ manager│ ✅   │  ✅ │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Dialogs:                                        │
│  ├─→ AddStaffDialog.tsx                         │
│  ├─→ UpdatePinDialog.tsx                        │
│  └─→ StaffPermissionsDialog.tsx  ← NEW          │
└─────────────────────────────────────────────────┘
```

---

## 🎮 User Interactions

### 1. إضافة موظف جديد

```
User → Click [+ إضافة موظف]
  ↓
AddStaffDialog Opens
  ↓
Fill Form:
  - Name
  - Email
  - Phone
  - PIN
  - Permissions Checkboxes
  ↓
Click [حفظ]
  ↓
[Online] → Save to Supabase → Cache in SQLite
[Offline] → Save to SQLite (synced=0) → Add to Outbox
  ↓
Show Toast: "تم إضافة الموظف"
  ↓
Close Dialog → Refresh List
```

### 2. تحديث الصلاحيات

```
User → Click [🔐 صلاحيات] on Staff Row
  ↓
StaffPermissionsDialog Opens
  ↓
Show Permissions List with Switches:
  ☑️ عرض المخزون
  ☑️ إدارة المنتجات
  ☐ إدارة الموظفين
  ☑️ الوصول لنقطة البيع
  ↓
Toggle Switches
  ↓
Click [حفظ]
  ↓
[Online] → Update Supabase → Update SQLite
[Offline] → Update SQLite (synced=0) → Add to Outbox
  ↓
Show Toast: "تم تحديث الصلاحيات"
  ↓
[Offline] Show Badge: "معلق"
```

### 3. مزامنة يدوية

```
User → Click [🔄 مزامنة] in Titlebar
  ↓
Show Progress Dialog
  ↓
Run fullSync()
  ├─→ المنتجات: 150 ✅
  ├─→ العملاء: 75 ✅
  ├─→ الطلبات: 30 ✅
  ├─→ الموظفين: 8 ✅  ← NEW
  └─→ رفع التغييرات: 5 ✅
  ↓
Show Toast: "تمت المزامنة بنجاح"
  ↓
Update All UI + Remove Pending Badges
```

---

## 🔧 Services Layer

### staffService.ts (Unified)

```typescript
┌─────────────────────────────────────────┐
│         staffService.ts                  │
├─────────────────────────────────────────┤
│                                          │
│  getAll()                                │
│    ├─→ Try Supabase RPC                 │
│    ├─→ [Success] Cache in SQLite        │
│    └─→ [Fail] Fallback to SQLite        │
│                                          │
│  save()                                  │
│    ├─→ Try Supabase RPC                 │
│    ├─→ [Success] Update SQLite          │
│    └─→ [Fail] Save to SQLite + Outbox   │
│                                          │
│  delete()                                │
│    ├─→ Try Supabase RPC                 │
│    ├─→ [Success] Delete from SQLite     │
│    └─→ [Fail] Mark deleted + Outbox     │
│                                          │
│  updatePin()                             │
│    ├─→ Try Supabase RPC                 │
│    ├─→ [Success] Update staff_pins      │
│    └─→ [Fail] Update local + Outbox     │
│                                          │
│  verifyPin()                             │
│    ├─→ Try Supabase RPC                 │
│    └─→ [Fail] Verify from staff_pins    │
└─────────────────────────────────────────┘
```

### localStaffService.ts (New)

```typescript
┌─────────────────────────────────────────┐
│      localStaffService.ts               │
├─────────────────────────────────────────┤
│                                          │
│  getAll(orgId)                          │
│    └─→ SELECT * FROM staff_members      │
│                                          │
│  getById(staffId, orgId)                │
│    └─→ SELECT * WHERE id = ?           │
│                                          │
│  upsert(staff, orgId)                   │
│    └─→ INSERT OR REPLACE                │
│                                          │
│  delete(staffId, orgId)                 │
│    └─→ DELETE FROM staff_members        │
│                                          │
│  verifyPin(pin, orgId)                  │
│    └─→ SELECT + Hash Comparison         │
│                                          │
│  getUnsynced(orgId)                     │
│    └─→ SELECT WHERE synced = 0          │
│                                          │
│  updateSyncStatus(staffId, synced)      │
│    └─→ UPDATE SET synced = ?            │
└─────────────────────────────────────────┘
```

### localPermissionsService.ts (New)

```typescript
┌─────────────────────────────────────────┐
│    localPermissionsService.ts           │
├─────────────────────────────────────────┤
│                                          │
│  saveStaffPermissions()                 │
│    └─→ UPDATE permissions JSON          │
│                                          │
│  getStaffPermissions()                  │
│    └─→ SELECT permissions + JSON.parse  │
│                                          │
│  updatePermission(key, value)           │
│    └─→ Merge + UPDATE                   │
│                                          │
│  hasPermission(staffId, permKey)        │
│    └─→ Check specific permission        │
└─────────────────────────────────────────┘
```

---

## 🧪 Test Scenarios

### Scenario 1: Create Staff Offline → Sync Online

```
1. Disconnect Network
2. Add New Staff "علي" with PIN "1234"
3. ✅ Staff appears in list with "معلق" badge
4. ✅ Can login with PIN offline
5. Reconnect Network
6. ✅ Auto-sync uploads staff to Supabase
7. ✅ Badge removed
8. ✅ Staff visible on other devices
```

### Scenario 2: Update Permissions Offline

```
1. Disconnect Network
2. Edit Staff "أحمد"
3. Enable "manageEmployees" permission
4. ✅ Permission saved locally
5. ✅ Staff shows "معلق" badge
6. Reconnect Network
7. ✅ Auto-sync uploads permission change
8. ✅ Badge removed
```

### Scenario 3: Concurrent Updates (Conflict)

```
1. Device A: Update Staff name "محمد" → "محمد أحمد" (offline)
2. Device B: Update Staff phone "محمد" → "0500000000" (online)
3. Device A: Reconnect → Sync
4. ✅ Conflict detected
5. ✅ Resolver applies last-write-wins
6. ✅ Result: Both changes merged or latest wins
```

---

## 📈 Performance Metrics

### Target Metrics:

| عملية | الهدف | الملاحظات |
|------|-------|-----------|
| عرض قائمة الموظفين | < 100ms | من SQLite |
| إضافة موظف offline | < 50ms | كتابة مباشرة |
| التحقق من PIN | < 100ms | hash comparison |
| مزامنة 100 موظف | < 3s | مع صلاحياتهم |
| Upload pending changes | < 2s | batch upload |

---

## 🎯 Success Criteria

✅ يمكن إضافة موظف جديد offline
✅ يمكن تحديث بيانات الموظف offline
✅ يمكن تحديث الصلاحيات offline
✅ يمكن التحقق من PIN offline
✅ المزامنة التلقائية تعمل في الخلفية
✅ عرض واضح لحالة المزامنة
✅ لا توجد data loss
✅ الأداء سريع (< 100ms للعمليات المحلية)
✅ واجهة سلسة بين online/offline

---

**تاريخ الإنشاء:** 2025-01-24
**النسخة:** 1.0
**الحالة:** 📐 تصميم مكتمل
