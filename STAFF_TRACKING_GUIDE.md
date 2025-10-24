# 📋 دليل تتبع الموظفين في الطلبيات

## 🎯 المشكلة التي تم حلها

**قبل:**
- الطلبيات تظهر باسم المدير (صاحب الحساب) فقط
- لا يمكن معرفة أي موظف قام بالبيع فعلياً

**بعد:**
- ✅ تتبع المدير (employee_id) - صاحب الحساب
- ✅ تتبع الموظف الفعلي (created_by_staff_id) - من نقطة البيع
- ✅ اسم الموظف محفوظ (created_by_staff_name) - للسرعة

---

## 📁 الملفات المعدلة

### 1. قاعدة البيانات:
```sql
/database/add_staff_tracking_simple.sql          # إضافة الحقول
/database/functions/create_pos_order_fast.sql   # تحديث الدالة
```

### 2. الكود (Frontend):
```typescript
/src/types/posOrder.ts                           # إضافة الحقول في Types
/src/context/shop/posOrderService.ts             # إرسال البيانات
/src/components/pos/Cart.tsx                     # جمع البيانات
/src/components/pos/CartOptimized.tsx            # جمع البيانات
/src/components/pos/hooks/usePOSOrderOptimized.ts # إرسال البيانات
```

---

## 🚀 خطوات التنفيذ

### الخطوة 1: تحديث قاعدة البيانات

```sql
-- في Supabase SQL Editor، نفذ:
/database/add_staff_tracking_simple.sql
```

هذا سيضيف:
- ✅ حقل `created_by_staff_id` (UUID)
- ✅ حقل `created_by_staff_name` (VARCHAR)
- ✅ Indexes للأداء

### الخطوة 2: تحديث الدالة

```sql
-- في Supabase SQL Editor، نفذ:
/database/functions/create_pos_order_fast.sql
```

هذا سيحدث الدالة لتقبل:
- ✅ `p_created_by_staff_id`
- ✅ `p_created_by_staff_name`

### الخطوة 3: الكود جاهز!

الكود تم تحديثه تلقائياً ليرسل:
```typescript
{
  employeeId: currentUser?.id,              // المدير (صاحب الحساب)
  createdByStaffId: currentStaff?.id,       // الموظف الفعلي
  createdByStaffName: currentStaff?.staff_name  // اسم الموظف
}
```

---

## 📊 كيف يعمل النظام؟

### سيناريو 1: المدير يبيع مباشرة
```typescript
currentUser = { id: "admin-123", name: "أحمد المدير" }
currentStaff = null  // لا يوجد موظف مسجل

النتيجة في قاعدة البيانات:
- employee_id = "admin-123"
- created_by_staff_id = NULL
- created_by_staff_name = NULL

العرض: "أحمد المدير" (من جدول users)
```

### سيناريو 2: موظف يبيع
```typescript
currentUser = { id: "admin-123", name: "أحمد المدير" }
currentStaff = { id: "staff-456", staff_name: "محمد الموظف" }

النتيجة في قاعدة البيانات:
- employee_id = "admin-123"
- created_by_staff_id = "staff-456"
- created_by_staff_name = "محمد الموظف"

العرض: "محمد الموظف" ✅
```

---

## 🔍 عرض البيانات

### في تفاصيل الطلبية:

```typescript
// الأولوية للموظف الفعلي
const displayName = order.created_by_staff_name || 
                    order.employee?.name || 
                    'غير محدد';
```

### في التقارير:

```sql
SELECT 
  o.id,
  o.customer_order_number,
  o.total,
  -- الموظف الفعلي (أولوية)
  COALESCE(o.created_by_staff_name, u.name, 'غير محدد') as staff_name,
  -- المدير (للمرجعية)
  u.name as manager_name,
  o.created_at
FROM orders o
LEFT JOIN users u ON o.employee_id = u.id
WHERE o.organization_id = 'YOUR_ORG_ID'
ORDER BY o.created_at DESC;
```

---

## 📈 التقارير المحسنة

### تقرير مبيعات الموظفين:

```sql
SELECT 
  COALESCE(o.created_by_staff_name, 'المدير') as staff_name,
  COUNT(*) as total_orders,
  SUM(o.total) as total_sales,
  AVG(o.total) as average_order
FROM orders o
WHERE o.organization_id = 'YOUR_ORG_ID'
  AND o.created_at >= CURRENT_DATE
GROUP BY o.created_by_staff_name
ORDER BY total_sales DESC;
```

### تقرير تفصيلي:

```sql
SELECT 
  o.customer_order_number,
  o.created_at,
  COALESCE(o.created_by_staff_name, u.name, 'غير محدد') as staff_name,
  c.name as customer_name,
  o.total,
  o.payment_method,
  o.payment_status
FROM orders o
LEFT JOIN users u ON o.employee_id = u.id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE o.organization_id = 'YOUR_ORG_ID'
  AND o.created_by_staff_id IS NOT NULL  -- فقط الطلبيات من الموظفين
ORDER BY o.created_at DESC;
```

---

## 🔗 الربط مع جلسات العمل

يمكنك الآن ربط الطلبيات بجلسات العمل:

```sql
SELECT 
  ws.staff_name,
  ws.started_at,
  ws.ended_at,
  ws.total_orders as session_orders,
  COUNT(o.id) as actual_orders,
  ws.total_sales as session_sales,
  SUM(o.total) as actual_sales
FROM pos_work_sessions ws
LEFT JOIN orders o ON o.created_by_staff_id = ws.staff_id
  AND o.created_at BETWEEN ws.started_at AND COALESCE(ws.ended_at, NOW())
WHERE ws.organization_id = 'YOUR_ORG_ID'
  AND DATE(ws.started_at) = CURRENT_DATE
GROUP BY ws.id, ws.staff_name, ws.started_at, ws.ended_at, 
         ws.total_orders, ws.total_sales
ORDER BY ws.started_at DESC;
```

---

## ✅ التحقق من التنفيذ

### 1. تحقق من الحقول:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('created_by_staff_id', 'created_by_staff_name');
```

### 2. اختبر بطلبية جديدة:
```sql
-- بعد إنشاء طلبية من نقطة البيع
SELECT 
  customer_order_number,
  employee_id,
  created_by_staff_id,
  created_by_staff_name,
  total
FROM orders 
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

### 3. تحقق من الإحصائيات:
```sql
SELECT 
  COUNT(*) as total_orders,
  COUNT(created_by_staff_id) as orders_with_staff,
  COUNT(*) - COUNT(created_by_staff_id) as orders_without_staff
FROM orders 
WHERE organization_id = 'YOUR_ORG_ID'
  AND created_at >= CURRENT_DATE;
```

---

## 🎨 تحديث واجهة المستخدم (اختياري)

### في صفحة تفاصيل الطلبية:

```tsx
// قبل:
<div>الموظف: {order.employee?.name}</div>

// بعد:
<div>
  الموظف: {order.created_by_staff_name || order.employee?.name || 'غير محدد'}
  {order.created_by_staff_name && (
    <Badge variant="secondary">موظف نقطة البيع</Badge>
  )}
</div>
```

### في قائمة الطلبيات:

```tsx
{orders.map(order => (
  <TableRow key={order.id}>
    <TableCell>{order.customer_order_number}</TableCell>
    <TableCell>
      {order.created_by_staff_name || order.employee?.name}
    </TableCell>
    <TableCell>{order.total} دج</TableCell>
  </TableRow>
))}
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: الحقول NULL دائماً
```typescript
// تحقق من:
1. هل currentStaff موجود؟
   console.log('currentStaff:', currentStaff);

2. هل البيانات تُرسل؟
   console.log('Order data:', {
     createdByStaffId: currentStaff?.id,
     createdByStaffName: currentStaff?.staff_name
   });
```

### المشكلة: خطأ في SQL
```sql
-- تحقق من أن الحقول موجودة:
\d orders

-- تحقق من الدالة:
\df create_pos_order_fast
```

---

## 📝 ملاحظات مهمة

1. **التوافق مع الطلبيات القديمة:**
   - الطلبيات القديمة ستكون `created_by_staff_id = NULL`
   - هذا طبيعي ومقبول

2. **المدير vs الموظف:**
   - `employee_id` = صاحب الحساب (للمرجعية)
   - `created_by_staff_id` = الموظف الفعلي (للعرض)

3. **الأداء:**
   - تم إضافة Indexes للبحث السريع
   - `created_by_staff_name` يوفر استعلام JOIN

4. **المزامنة:**
   - النظام يعمل أوفلاين وأونلاين
   - البيانات تُحفظ في IndexedDB أولاً

---

## 🎉 الخلاصة

✅ **تم التنفيذ بنجاح!**

الآن يمكنك:
- معرفة أي موظف قام بكل عملية بيع
- إنشاء تقارير دقيقة لأداء الموظفين
- ربط الطلبيات بجلسات العمل
- تتبع المبيعات بدقة

**كل شيء جاهز للاستخدام!** 🚀
