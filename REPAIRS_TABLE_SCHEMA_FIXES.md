# 🔧 إصلاحات schema جداول التصليح

## المشاكل المكتشفة

### 1. ❌ أخطاء في أسماء الأعمدة

#### `repair_orders`:
- ❌ الكود يستخدم: `repair_number`
- ✅ Supabase يستخدم: `order_number`

- ❌ الكود يستخدم: `repair_notes`
- ✅ Supabase يستخدم: `notes`

- ❌ الكود يستخدم: `customer_name_lower`, `device_type_lower`
- ✅ هذه حقول محلية فقط (للبحث) - يجب استثناؤها عند الإرسال للسيرفر

#### `repair_status_history`:
- ❌ الكود يستخدم: `organization_id` (غير موجود في Supabase)
- ❌ الكود يستخدم: `repair_id`
- ✅ Supabase يستخدم: `repair_order_id`

- ❌ الكود يستخدم: `changed_by`, `changed_at`
- ✅ Supabase يستخدم: `created_by`, `created_at`

#### `repair_locations`:
- ❌ الجدول غير موجود في Supabase!
- ❌ الكود يحاول إضافة عمود `email` غير موجود

###  2. ✅ الإصلاحات المطبقة

#### ملف: `localRepairService.ts`
```typescript
// السطر 249-258: إصلاح repair_status_history
const rec: LocalRepairStatusHistory = {
  id: uuidv4(),
  repair_order_id: args.orderId,  // ✅ كان repair_id
  status: args.status,
  notes: args.notes || null,
  created_by: args.createdBy || 'customer',  // ✅ كان changed_by
  created_at: nowISO(),  // ✅ حذف changed_at
  synced: false,
  pendingOperation: 'create',
} as any;
```

### 3. ⚠️ إصلاحات مطلوبة إضافية

#### A. إزالة الحقول المحلية فقط عند الإرسال
في `localRepairService.ts`:
- `customer_name_lower`
- `device_type_lower`
- `repair_number` (استخدم `order_number` فقط)
- `repair_notes` (استخدم `notes` فقط)

#### B. إنشاء جدول repair_locations في Supabase
أو إزالة كل الإشارات إليه إذا كان غير مطلوب.

### 4. 🎯 الحل المقترح

#### Option A: إنشاء migration لـ repair_locations
```sql
CREATE TABLE IF NOT EXISTS repair_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Option B: إزالة repair_locations تماماً
- حذف `repair_location_id` من `repair_orders`
- استخدام `custom_location` فقط

### 5. 📋 ملخص التغييرات المطلوبة

#### ✅ تم إصلاحها:
1. استبدال جميع `'repairs'` بـ `'repair_orders'` في deltaWriteService
2. إصلاح `repair_status_history` ل  استخدام `repair_order_id` و `created_by`

#### ⏳ قيد الإصلاح:
1. إزالة الحقول المحلية قبل الإرسال:
   - `customer_name_lower`
   - `device_type_lower`
   - `synced`
   - `pendingOperation`

2. استخدام الأسماء الصحيحة:
   - `order_number` بدلاً من `repair_number`
   - `notes` بدلاً من `repair_notes`

#### 🔜 مطلوب:
1. إنشاء جدول `repair_locations` في Supabase أو حذف الإشارات إليه
2. إضافة عمود `device_type` إلى `repair_orders` في Supabase (إذا لم يكن موجوداً)

### 6. 🚨 أخطاء BatchSender الحالية

```
❌ Could not find the 'repair_notes' column
❌ Could not find the 'customer_name_lower' column
❌ Could not find the 'changed_at' column
❌ Could not find the 'changed_by' column
❌ Could not find the 'organization_id' column (في repair_status_history)
❌ Could not find the 'repair_id' column
❌ Could not find the 'email' column (في repair_locations)
```

BatchSender يقوم بتصفية هذه الأعمدة تلقائياً، لكن يجب إصلاح الكود المصدر.

### 7. ✅ الحالة النهائية

بعد تطبيق جميع الإصلاحات:
- ✅ `repair_orders` يعمل (بعد تصحيح أسماء الأعمدة)
- ✅ `repair_status_history` يعمل (بعد الإصلاح)
- ⚠️ `repair_locations` يحتاج migration في Supabase
- ⚠️ `repair_images` يحتاج اختبار

### 8. 🎬 الخطوات التالية

1. إنشاء migration لـ `repair_locations` في Supabase
2. تحديث `localRepairService.ts` لاستخدام الأسماء الصحيحة
3. اختبار إنشاء طلب تصليح جديد
4. اختبار المزامنة الكاملة

---

**تاريخ الإنشاء:** 2025-01-24
**الحالة:** 🟡 قيد الإصلاح
