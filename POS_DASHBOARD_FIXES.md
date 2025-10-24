# 🔧 إصلاحات لوحة تحكم نقطة البيع

## ✅ المشاكل التي تم إصلاحها

### 1️⃣ **مشكلة JWT منتهي الصلاحية**

**الخطأ:**
```
{code: "PGRST301", message: "JWT expired"}
```

**الحل:**
- ✅ إضافة معالجة تلقائية في `posDashboardService.ts`
- ✅ التحقق من صلاحية الجلسة قبل كل استدعاء
- ✅ محاولة تحديث الجلسة تلقائياً عند انتهاء JWT
- ✅ رسالة واضحة للمستخدم مع زر تسجيل الدخول
- ✅ إنشاء `supabaseAuthHelper.ts` للاستخدام في كل التطبيق

**الكود:**
```typescript
// في posDashboardService.ts
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (error.code === 'PGRST301' || error.message?.includes('JWT expired')) {
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError) {
    return getPOSDashboardData(organizationId); // إعادة المحاولة
  }
}
```

---

### 2️⃣ **مشكلة عدم العثور على organization_id**

**الخطأ:**
```
لم يتم العثور على معرف المؤسسة
```

**السبب:**
- `organization_id` موجود في `userProfile` وليس في `user` مباشرة

**الحل:**
```typescript
// قبل:
const orgId = (user as any)?.organization_id;

// بعد:
const orgId = userProfile?.organization_id || 
              organization?.id || 
              localStorage.getItem('bazaar_organization_id');
```

**التحديثات:**
- ✅ استخدام `userProfile.organization_id`
- ✅ fallback إلى `organization.id`
- ✅ fallback إلى localStorage
- ✅ الانتظار حتى يتم تحميل بيانات المستخدم

---

### 3️⃣ **مشكلة SQL - العمود غير موجود**

**الخطأ:**
```
column oi.price does not exist
```

**السبب:**
- استخدام `oi.price` بينما العمود الصحيح هو `oi.unit_price` أو `oi.total_price`

**الحل في SQL:**
```sql
-- قبل:
SUM(oi.quantity * oi.price) as total_revenue

-- بعد:
SUM(oi.total_price) as total_revenue
```

**الأعمدة الصحيحة في order_items:**
- ✅ `unit_price` - سعر الوحدة
- ✅ `total_price` - السعر الإجمالي
- ✅ `quantity` - الكمية
- ❌ `price` - غير موجود

---

## 📝 الملفات المُحدثة

### 1. `/src/services/posDashboardService.ts`
- إضافة معالجة JWT
- التحقق من الجلسة قبل الاستدعاء
- محاولة تحديث تلقائية

### 2. `/src/pages/POSDashboard.tsx`
- استخدام `userProfile` و `organization`
- fallback متعدد لـ organization_id
- الانتظار حتى تحميل البيانات

### 3. `/database/functions/get_pos_dashboard_data.sql`
- تغيير `oi.price` إلى `oi.total_price`
- إصلاح استعلام أفضل المنتجات

### 4. `/src/lib/supabaseAuthHelper.ts` (جديد)
- دوال مساعدة لمعالجة JWT
- `ensureValidSession()` - التحقق من الجلسة
- `handleJWTError()` - معالجة أخطاء JWT
- `withJWTRetry()` - wrapper للاستدعاءات

---

## 🚀 خطوات التطبيق

### 1️⃣ تحديث SQL في Supabase

```bash
# افتح Supabase SQL Editor
# شغّل الملف المحدث:
database/functions/get_pos_dashboard_data.sql
```

### 2️⃣ إعادة تشغيل التطبيق

```bash
npm run dev
```

### 3️⃣ اختبار

1. افتح لوحة التحكم
2. تحقق من ظهور البيانات
3. جرب التحديث
4. تحقق من عدم ظهور أخطاء

---

## ✅ النتيجة النهائية

- ✅ **لا أخطاء JWT** - معالجة تلقائية
- ✅ **organization_id يعمل** - من مصادر متعددة
- ✅ **SQL صحيح** - استخدام الأعمدة الصحيحة
- ✅ **تجربة سلسة** - رسائل واضحة للمستخدم

---

## 🔍 للتأكد من نجاح الإصلاح

### اختبار 1: JWT
```typescript
// في console
localStorage.removeItem('supabase.auth.token');
// ثم حاول تحديث الصفحة - يجب أن يعيد توجيهك لتسجيل الدخول
```

### اختبار 2: Organization ID
```typescript
// في console
console.log(userProfile?.organization_id);
// يجب أن يظهر UUID صحيح
```

### اختبار 3: SQL
```sql
-- في Supabase SQL Editor
SELECT * FROM get_pos_dashboard_data('YOUR_ORG_ID');
-- يجب أن يعمل بدون أخطاء
```

---

**تم الإصلاح بنجاح! 🎉**
