# 🔧 دليل حل المشاكل - App Initialization Optimization

## ❌ المشكلة: relation "role_permissions" does not exist

### **الخطأ الكامل:**
```
Error in get_app_initialization_data: relation "role_permissions" does not exist
```

### **السبب:**
الدالة `get_app_initialization_data` كانت تحاول جلب الصلاحيات من جدول `role_permissions` الذي لا يوجد في قاعدة البيانات.

### **الحل:**
تم تعديل الدالة لإرجاع قائمة فارغة من الصلاحيات بدلاً من الاستعلام عن جدول غير موجود.

**قبل:**
```sql
'permissions', COALESCE(
  (
    SELECT json_agg(DISTINCT p.permission_name)
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_name = u.role
  ),
  '[]'::json
)
```

**بعد:**
```sql
'permissions', '[]'::json
```

---

## ✅ خطوات التطبيق

### 1. تطبيق الدالة المحدثة

```bash
# في Supabase SQL Editor
# انسخ محتوى database/functions/get_app_initialization_data.sql
# والصقه في SQL Editor ثم اضغط Run
```

### 2. اختبار الدالة

```sql
-- اختبار بسيط
SELECT get_app_initialization_data();

-- يجب أن ترى نتيجة JSON تحتوي على:
-- user, organization, organization_settings, pos_settings,
-- categories, subcategories, employees, confirmation_agents
```

### 3. التحقق من التطبيق

افتح التطبيق في المتصفح وتحقق من:
- ✅ لا توجد أخطاء في Console
- ✅ البيانات تُحمّل بنجاح
- ✅ استدعاء واحد فقط لـ `get_app_initialization_data`

---

## 🔍 مشاكل محتملة أخرى

### المشكلة: جدول غير موجود

إذا ظهرت أخطاء مشابهة لجداول أخرى:

```
relation "table_name" does not exist
```

**الحل:**
1. تحقق من وجود الجدول في قاعدة البيانات
2. إذا كان غير موجود، أضف معالجة أخطاء في الدالة:

```sql
BEGIN
  SELECT ... FROM table_name ...;
EXCEPTION
  WHEN OTHERS THEN
    v_variable := '[]'::json; -- أو قيمة افتراضية
END;
```

### المشكلة: بطء في التحميل

إذا كانت الدالة بطيئة:

1. **أضف Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_id ON organizations(id);
```

2. **قلل عدد السجلات:**
```sql
-- في الدالة، قلل LIMIT
LIMIT 20  -- بدلاً من 50 أو 100
```

### المشكلة: 401 Unauthorized

إذا ظهر خطأ 401:

```
POST .../rpc/get_app_initialization_data 401 (Unauthorized)
```

**الحل:**
تأكد من منح الصلاحيات للدالة:

```sql
GRANT EXECUTE ON FUNCTION get_app_initialization_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_app_initialization_data(UUID, UUID) TO anon;
```

---

## 📊 مراقبة الأداء

### في Chrome DevTools

1. افتح **Network** tab
2. ابحث عن `get_app_initialization_data`
3. تحقق من:
   - **Status:** يجب أن يكون 200
   - **Time:** يجب أن يكون أقل من 500ms
   - **Size:** يعتمد على حجم البيانات

### في Console

ابحث عن هذه الرسائل:

```
✅ [AppInitialization] تم جلب البيانات بنجاح في XXXms
📊 [AppInitialization] إحصائيات البيانات: {...}
```

---

## 🆘 الحصول على المساعدة

إذا استمرت المشاكل:

1. **افتح Console** وانسخ الأخطاء الكاملة
2. **تحقق من Network tab** وانظر إلى Response
3. **شغّل الدالة يدوياً** في Supabase SQL Editor
4. **تحقق من Logs** في Supabase Dashboard

---

## ✅ Checklist للتأكد من نجاح التطبيق

- [ ] الدالة `get_app_initialization_data` تعمل في SQL Editor
- [ ] لا توجد أخطاء في Console
- [ ] استدعاء واحد فقط في Network tab
- [ ] البيانات تظهر في التطبيق
- [ ] الوقت أقل من 500ms
- [ ] التطبيق يعمل بسلاسة

---

**آخر تحديث:** أكتوبر 2025
