# 🏗️ PowerSync Project Structure

## 📁 البنية الجديدة

```
src/
├── lib/
│   └── powersync/
│       ├── PowerSyncSchema.ts          # ⭐ Schema لجميع الجداول (31 جدول)
│       ├── SupabaseConnector.ts        # ⭐ موصل Supabase ↔ PowerSync
│       └── PowerSyncService.ts         # ⭐ خدمة PowerSync الرئيسية
│
├── hooks/
│   └── powersync/
│       ├── usePowerSync.ts             # Hook للوصول السريع
│       ├── usePowerSyncQuery.ts        # Hook للاستعلامات
│       └── usePowerSyncStatus.ts       # Hook لمراقبة المزامنة
│
├── context/
│   ├── PowerSyncProvider.tsx           # ⭐ Provider عام للتهيئة
│   ├── POSDataContext.tsx              # ✅ محدث لاستخدام PowerSync
│   └── POSOrdersDataContext.tsx        # ✅ محدث لاستخدام PowerSync
│
└── app-components/
    └── AppComponents.tsx                # ✅ يتضمن PowerSyncProvider

.env.local
└── VITE_POWERSYNC_URL                   # ⭐ PowerSync endpoint
```

---

## 🔄 Data Flow الجديد

```
┌─────────────────┐
│   UI Component  │
└────────┬────────┘
         │
         │ usePowerSyncQuery()
         ▼
┌─────────────────────┐
│  PowerSyncService   │ ◄─── Real-time updates
└──────────┬──────────┘
           │
           │ SQL queries
           ▼
┌───────────────────────┐
│  Local SQLite (wa)    │
│  (PowerSync manages)  │
└──────────┬────────────┘
           │
           │ Auto sync
           ▼
┌───────────────────────┐
│  SupabaseConnector    │
└──────────┬────────────┘
           │
           │ CRUD operations
           ▼
┌───────────────────────┐
│   Supabase (Cloud)    │
└───────────────────────┘
```

---

## 📊 الجداول المتزامنة (31 جدول)

### **Organizations & Users**
- `organizations`
- `users`
- `employees`

### **Products**
- `product_categories`
- `product_subcategories`
- `products`
- `product_variants`
- `serial_numbers`
- `batches`

### **Customers**
- `customers`
- `addresses`
- `customer_debts`
- `debt_payments`

### **Suppliers**
- `suppliers`

### **Orders**
- `staff_work_sessions`
- `orders`
- `order_items`
- `order_payments`

### **Returns & Losses**
- `returns`
- `losses`

### **Inventory**
- `inventory_adjustments`
- `stock_movements`

### **Expenses**
- `expenses`

### **Others**
- `repairs`
- `subscription_transactions`
- `sync_metadata`

---

## 🎯 Hooks Usage

### **1. usePowerSync**
```typescript
const { db, isReady, powerSyncService } = usePowerSync();
```

### **2. usePowerSyncQuery**
```typescript
const { data, isLoading, error } = usePowerSyncQuery({
  queryKey: ['products'],
  sql: 'SELECT * FROM products WHERE organization_id = ?',
  params: [orgId],
});
```

### **3. usePowerSyncStatus**
```typescript
const { isOnline, isSyncing, pendingUploads } = usePowerSyncStatus();
```

---

## ✅ **تم حذف الملفات القديمة**

الملفات التالية **لم تعد مطلوبة**:

```
src/lib/sync/
├── SmartSyncEngine.ts              ❌ حذف
├── SyncManager.ts                   ❌ حذف
├── PullEngine.ts                    ❌ حذف
├── PushEngine.ts                    ❌ حذف
├── OutboxManager.ts                 ❌ حذف
├── ConflictResolver.ts              ❌ حذف (PowerSync يحل التضاربات)
└── delta/                           ❌ حذف (جميع ملفات Delta Sync)
```

**PowerSync يفعل كل هذا تلقائياً!** ✨

---

**Created by:** Claude Code 🤖
