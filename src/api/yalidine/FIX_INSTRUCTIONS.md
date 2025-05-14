# تعليمات إصلاح مشكلة مزامنة رسوم ياليدين

هذا الملف يحتوي على تعليمات خطوة بخطوة لإصلاح المشكلة التي تواجهها في مزامنة بيانات رسوم ياليدين. المشكلة الرئيسية هي أن السجلات تُدخل في قاعدة البيانات ثم تُحذف تلقائياً بسبب قيود CASCADE في المفاتيح الأجنبية.

## المشكلة المحددة

1. يتم جلب بيانات رسوم الشحن من API ياليدين بنجاح.
2. يتم إدخال البيانات في جدول `yalidine_fees`.
3. يتم حذف البيانات تلقائياً بسبب قيد `CASCADE` على عمود `organization_id`.
4. نتيجة لذلك، لا توجد بيانات في الجدول رغم نجاح عملية المزامنة.

## الحل المقترح

قمنا بإنشاء ملف SQL خاص لإصلاح المشكلة بطريقة نهائية. الملف متوفر في:
`migrations/yalidine_fees_final_fix.sql`

## خطوات التنفيذ

### 1. تنفيذ ملف الإصلاح النهائي

```sql
-- تنفيذ الملف كاملاً باستثناء القسم 7 (تبديل الجداول) - فهو معلق بشكل افتراضي
```

### 2. التحقق من صحة الحل

بعد تنفيذ الملف، تأكد من أن الإصلاح يعمل عن طريق:

1. مراقبة الجدول الجديد `yalidine_fees_new` بعد عملية المزامنة التالية.
2. فحص صحة البيانات باستخدام الدالة التي أنشأناها `check_yalidine_fees_health()`:

```sql
SELECT * FROM check_yalidine_fees_health();
```

### 3. تنفيذ تبديل الجداول (بعد التأكد من صحة البيانات)

إذا تم تأكيد صحة البيانات في الجدول الجديد `yalidine_fees_new`، قم بتنفيذ الخطوة 7 (تبديل الجداول) من ملف الإصلاح:

```sql
-- إزالة المؤشرات والقيود من الجدول القديم
DROP TRIGGER IF EXISTS yalidine_fees_redirect_trigger ON yalidine_fees;
DROP TRIGGER IF EXISTS sync_yalidine_fees_columns_trigger ON yalidine_fees;
ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_organization_id_fkey;
ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_fkey;
ALTER TABLE yalidine_fees DROP CONSTRAINT IF EXISTS yalidine_fees_to_wilaya_id_fkey;

-- إعادة تسمية الجدول القديم
ALTER TABLE yalidine_fees RENAME TO yalidine_fees_old;

-- إعادة تسمية الجدول الجديد ليكون الجدول الرئيسي
ALTER TABLE yalidine_fees_new RENAME TO yalidine_fees;

-- إعادة إنشاء المؤشرات
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_org ON yalidine_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_route ON yalidine_fees(from_wilaya_id, to_wilaya_id, organization_id);
```

### 4. حل بديل سريع (في حالة الحاجة لإصلاح مؤقت سريع)

إذا كنت بحاجة إلى حل سريع دون إعادة هيكلة الجدول، يمكنك تنفيذ الأمر التالي فقط:

```sql
-- تعديل قيد المفتاح الأجنبي organization_id لمنع الحذف التلقائي
ALTER TABLE yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_organization_id_fkey,
ADD CONSTRAINT yalidine_fees_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id) ON DELETE RESTRICT;
```

## ملاحظات هامة

1. الحل النهائي ينشئ جدولاً جديداً مع قيود أكثر أماناً، ويعيد توجيه كل العمليات من الجدول القديم إلى الجدول الجديد.
2. الترغر `yalidine_fees_redirect_trigger` يضمن تحويل كل العمليات التي تتم على الجدول القديم إلى الجدول الجديد.
3. لن تتأثر الوظائف الحالية التي تستخدم الجدول، لأن كل العمليات يتم إعادة توجيهها تلقائياً.
4. إذا واجهت أي مشاكل، يمكنك العودة إلى الحالة السابقة بسهولة عن طريق إعادة تسمية الجداول مرة أخرى.

## بعد التنفيذ

بعد تنفيذ الإصلاح، قم بإعادة تشغيل عملية المزامنة وتأكد من:

1. أن البيانات تظهر في جدول `yalidine_fees`.
2. عدم حذف البيانات بعد إدخالها.
3. أن واجهة المستخدم تعرض بيانات رسوم الشحن بشكل صحيح.

إذا استمرت المشكلة، راجع سجلات الخطأ للحصول على مزيد من المعلومات. 