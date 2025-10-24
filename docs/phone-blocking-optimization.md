# تحسين فحص أرقام الهواتف المحظورة

## المشكلة
كانت هناك عدة استدعاءات منفصلة لدالة `is_phone_blocked` لكل رقم هاتف، مما يؤدي إلى:
- 6+ طلبات منفصلة للتحقق من أرقام الهواتف
- بطء في التحميل
- ضغط غير ضروري على قاعدة البيانات

## الحلول المطبقة

### 1. دالة محسنة للتحقق من عدة أرقام (check_multiple_phones_blocked)
```sql
-- ملف: supabase/functions/check_multiple_phones_blocked.sql
CREATE OR REPLACE FUNCTION check_multiple_phones_blocked(
  p_org_id UUID,
  p_phones TEXT[]
)
RETURNS TABLE(phone TEXT, is_blocked BOOLEAN, reason TEXT, blocked_id UUID, name TEXT)
```

### 2. تحديث دالة get_orders_complete_data
تم إضافة معلومات الحظر مباشرة في استعلام الطلبات:
```sql
-- إضافة JOIN مع blocked_customers
LEFT JOIN blocked_customers bc ON bc.organization_id = p_organization_id 
    AND bc.phone_normalized = normalize_phone(COALESCE(c.phone, gc.phone, o.form_data->>'phone'))

-- إضافة phone_blocked_info في النتيجة
'phone_blocked_info', o.phone_blocked_info
```

### 3. دالة API محسنة
```typescript
// ملف: src/lib/api/blocked-customers.ts
export async function checkMultiplePhonesBlocked(orgId: string, phones: string[])
```

### 4. تحديث ResponsiveOrdersTable
```typescript
// استخدام الدالة المحسنة بدلاً من الحلقة
const blockedResults = await checkMultiplePhonesBlocked(currentOrganization.id, newPhones);
```

## النتائج المتوقعة

### قبل التحسين:
- 6+ طلبات منفصلة لـ `is_phone_blocked`
- وقت استجابة أطول
- ضغط على قاعدة البيانات

### بعد التحسين:
- طلب واحد فقط لجميع الأرقام
- تحسين الأداء بنسبة 80%+
- تقليل الضغط على قاعدة البيانات

## كيفية الاستخدام

### الطريقة الأولى: استخدام الدالة المحسنة
```typescript
import { checkMultiplePhonesBlocked } from '@/lib/api/blocked-customers';

const phones = ['06555222', '0655880124', '0655880128'];
const results = await checkMultiplePhonesBlocked(orgId, phones);

for (const phone of phones) {
  const result = results.get(phone);
  if (result?.isBlocked) {
    console.log(`Phone ${phone} is blocked: ${result.reason}`);
  }
}
```

### الطريقة الثانية: استخدام البيانات المدمجة
```typescript
// البيانات تأتي مباشرة من get_orders_complete_data
const order = orders[0];
if (order.phone_blocked_info?.isBlocked) {
  console.log(`Customer is blocked: ${order.phone_blocked_info.reason}`);
}
```

## الملفات المعدلة

1. `supabase/functions/check_multiple_phones_blocked.sql` - دالة SQL جديدة
2. `database/functions/get_orders_complete_data.sql` - إضافة معلومات الحظر
3. `src/lib/api/blocked-customers.ts` - دالة API محسنة
4. `src/components/orders/ResponsiveOrdersTable.tsx` - استخدام الدالة المحسنة

## اختبار التحسين

لاختبار التحسين:
1. افتح Developer Tools
2. انتقل إلى Network tab
3. قم بتحميل صفحة الطلبات
4. لاحظ انخفاض عدد طلبات `is_phone_blocked` من 6+ إلى 1

## ملاحظات إضافية

- تم الحفاظ على نظام Cache الموجود
- الدوال القديمة ما زالت تعمل للتوافق مع الكود الموجود
- يمكن استخدام أي من الطريقتين حسب الحاجة
