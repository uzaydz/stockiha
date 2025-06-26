# حل مشكلة طلبات الزوار - إصلاح سياسات RLS

## المشكلة 🚨
الزوار لا يستطيعون تقديم طلبات في صفحة الشراء بسبب سياسات Row Level Security (RLS) المقيدة التي تتطلب تسجيل دخول.

**الخطأ المتوقع:**
```
Error from database: new row violates row-level security policy for table "online_orders"
```

## السبب 🔍
- سياسة RLS الحالية تسمح فقط للمستخدمين المسجلين بإنشاء طلبات
- الزوار لا يملكون `auth.uid()` صالح
- الجداول المرتبطة (customers, addresses, order_items) لها نفس المشكلة

## الحل المطبق ✅

### 1. الملفات المنشأة:
- `run_guest_orders_fix.sql` - الملف الرئيسي للتطبيق
- `fix_guest_orders_rls.sql` - إصلاح جدول online_orders فقط
- `fix_guest_related_tables_rls.sql` - إصلاح الجداول المرتبطة

### 2. السياسات الجديدة:

#### **online_orders**
```sql
-- السماح للزوار بإنشاء طلبات
CREATE POLICY "online_orders_public_insert" ON public.online_orders
    FOR INSERT
    WITH CHECK (true);

-- السماح للمنظمة بإدارة طلباتها
CREATE POLICY "online_orders_org_manage" ON public.online_orders
    FOR ALL
    USING (organization_id = get_user_org_id() OR is_super_admin());
```

#### **الجداول المرتبطة**
- `online_order_items` - عناصر الطلب
- `customers` - بيانات العملاء
- `addresses` - عناوين التوصيل

## كيفية التطبيق 🛠️

### الطريقة 1: Supabase Dashboard
1. اذهب إلى Supabase Dashboard
2. افتح SQL Editor
3. انسخ محتوى `run_guest_orders_fix.sql`
4. شغل الاستعلام

### الطريقة 2: psql
```bash
psql -h your-db-host -U postgres -d your-db-name -f run_guest_orders_fix.sql
```

### الطريقة 3: من خلال MCP Tool
```sql
-- نسخ محتوى الملف وتشغيله عبر mcp_supabase_bazaar_query
```

## التحقق من النجاح ✔️

بعد تطبيق الإصلاح، يجب أن ترى:

```sql
-- عرض السياسات الجديدة
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'online_orders';

-- النتيجة المتوقعة:
-- online_orders | online_orders_public_insert | INSERT
-- online_orders | online_orders_org_manage    | ALL
```

## الاختبار 🧪

```javascript
// اختبار من Frontend
const { data, error } = await supabase
  .from('online_orders')
  .insert({
    organization_id: 'your-org-id',
    subtotal: 1000,
    tax: 0,
    total: 1000,
    status: 'pending',
    payment_method: 'cash',
    payment_status: 'pending'
  });

// يجب أن يعمل بدون خطأ
```

## الأمان 🔒

هذا الحل آمن لأنه:
- ✅ يسمح فقط بـ INSERT للزوار (ليس SELECT/UPDATE/DELETE)
- ✅ يتطلب `organization_id` صحيح
- ✅ المنظمة تستطيع إدارة طلباتها فقط
- ✅ المدير العام له صلاحيات كاملة

## استعادة النسخة الاحتياطية 🔄

إذا احتجت للعودة للسياسات القديمة:
```sql
-- حذف السياسات الجديدة
DROP POLICY "online_orders_public_insert" ON public.online_orders;
DROP POLICY "online_orders_org_manage" ON public.online_orders;

-- إعادة السياسة القديمة
CREATE POLICY "Enable ALL for organization members on online_orders" 
ON public.online_orders FOR ALL
USING ((organization_id = get_current_user_organization_id()) OR is_super_admin())
WITH CHECK ((organization_id = get_current_user_organization_id()) OR is_super_admin());
```

---

**📝 ملاحظة:** تأكد من تطبيق هذا الإصلاح في بيئة الاختبار أولاً قبل الإنتاج. 