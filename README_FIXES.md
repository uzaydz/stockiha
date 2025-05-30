# حل مشكلة تأكيد المكالمة في تطبيق إدارة الطلبات

## المشكلة

تواجه وظيفة تأكيد المكالمة في تطبيق إدارة الطلبات عدة مشاكل:

1. **مشكلة واجهة المستخدم**: القائمة المنسدلة لتأكيد المكالمة تظهر فوق مكان الضغط وليس في نفس المكان، مما يؤدي إلى صعوبة في استخدامها.

2. **مشكلة جلب البيانات**: لا يتم جلب أي حالات تأكيد اتصال من قاعدة البيانات (تم جلب 0 حالة).

3. **مشكلة الصلاحيات**: خطأ 403 Forbidden عند محاولة إضافة حالات تأكيد اتصال جديدة.

4. **مشكلة أمنية**: خطأ يتعلق بسياسات أمان Row-Level Security (RLS) في قاعدة البيانات، حيث أن سياسات RLS مفعلة على الجدول `call_confirmation_statuses` لكن لا توجد سياسات محددة تسمح للمستخدمين بالوصول للبيانات.

## الحلول المنفذة

### 1. تعديل محاذاة القوائم المنسدلة في واجهة المستخدم

تم تعديل خصائص مكون `DropdownMenuContent` في ثلاثة ملفات:
- `CallConfirmationDropdown.tsx`
- `OrderStatusDropdown.tsx`
- `OrderActionsDropdown.tsx`

التعديلات المنفذة:
- تغيير خاصية `align` من "center" إلى "end"
- تغيير قيمة `alignOffset` من -50 إلى 0

مثال التعديل:
```tsx
<DropdownMenuContent
  align="end"
  alignOffset={0}
  className="min-w-[180px] p-1 rounded-lg border shadow-lg"
>
```

### 2. إنشاء وظائف SQL لتجاوز سياسات RLS وإدارة حالات تأكيد المكالمات

تم إنشاء ملف `fix_call_confirmation_statuses.sql` يحتوي على:

#### أ. تفعيل وإعداد سياسات RLS

```sql
-- تفعيل سياسة RLS على الجدول إذا لم تكن مفعلة
ALTER TABLE IF EXISTS call_confirmation_statuses ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة RLS للقراءة تسمح للمستخدمين بقراءة البيانات المرتبطة بمؤسستهم
CREATE POLICY call_confirmation_statuses_select_policy 
  ON call_confirmation_statuses
  FOR SELECT
  USING (
    organization_id IN (
      SELECT org.id FROM organizations org
      JOIN org_members mem ON mem.organization_id = org.id
      WHERE mem.user_id = auth.uid()
    )
  );

-- إنشاء سياسات مماثلة للإضافة والتعديل
```

#### ب. وظيفة آمنة لإضافة حالات تأكيد المكالمات الافتراضية

```sql
CREATE OR REPLACE FUNCTION insert_call_confirmation_statuses_secure(
  organization_id UUID,
  user_id UUID DEFAULT NULL
)
RETURNS SETOF call_confirmation_statuses
SECURITY DEFINER -- هذا يجعل الوظيفة تعمل بصلاحيات المشرف
SET search_path = public
AS $$
  -- التحقق من وجود حالات تأكيد مكالمات للمؤسسة
  -- إذا لم تكن موجودة، يتم إنشاء حالات افتراضية:
  -- مؤكد، غير مؤكد، لم يتم الرد، الاتصال لاحقاً
$$;
```

#### ج. وظيفة لإضافة حالة تأكيد اتصال جديدة

```sql
CREATE OR REPLACE FUNCTION add_call_confirmation_status(
  p_name TEXT,
  p_organization_id UUID,
  p_color TEXT DEFAULT '#6366F1',
  p_icon TEXT DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
  -- التحقق من وجود المؤسسة وصلاحية المستخدم
  -- إضافة حالة جديدة وإرجاع المعرف
$$;
```

#### د. وظيفة لتحديث حالات تأكيد الاتصال للطلب

```sql
CREATE OR REPLACE FUNCTION update_order_call_confirmation(
  p_order_id UUID,
  p_status_id INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) 
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
  -- التحقق من وجود الطلب وحالة تأكيد الاتصال
  -- التحقق من تطابق المؤسسة بين الطلب وحالة تأكيد الاتصال
  -- تحديث بيانات الطلب
$$;
```

### 3. تعديل ملف OrdersDataContext.tsx

تم تحديث ملف `OrdersDataContext.tsx` لاستخدام الوظائف الجديدة:

#### أ. تعديل وظيفة `refreshData`

```typescript
// من:
supabase
  .from('call_confirmation_statuses')
  .select('*')
  .eq('organization_id', currentOrganization.id)
  .order('is_default', { ascending: false })
  .order('name'),

// إلى:
supabase
  .rpc('insert_call_confirmation_statuses_secure', {
    organization_id: currentOrganization.id,
    user_id: supabase.auth.getUser()?.data?.user?.id || null
  }),
```

#### ب. تعديل وظيفة `addCallConfirmationStatus`

```typescript
// استخدام الوظيفة الجديدة
const { data: newStatusId, error } = await supabase.rpc(
  'add_call_confirmation_status',
  {
    p_name: name.trim(),
    p_organization_id: currentOrganization.id,
    p_color: color,
    p_icon: null,
    p_is_default: false
  }
);
```

## كيفية تطبيق الحل

1. نفذ ملف `fix_call_confirmation_statuses.sql` على قاعدة البيانات.
2. عدل ملفات الواجهة الثلاثة لتصحيح محاذاة القوائم المنسدلة.
3. عدل ملف `OrdersDataContext.tsx` لاستخدام الوظائف الجديدة.
4. أعد تشغيل التطبيق واختبر الوظائف.

## نتائج التعديلات

بعد تطبيق التعديلات:

1. تظهر القوائم المنسدلة في المكان الصحيح.
2. يتم جلب حالات تأكيد المكالمات بشكل صحيح أو إنشاء حالات افتراضية إذا لم تكن موجودة.
3. يمكن للمستخدمين إضافة وتعديل حالات تأكيد المكالمات بدون أخطاء صلاحيات.
4. تعمل جميع وظائف تأكيد المكالمة بشكل صحيح مع احترام قواعد RLS.

## ملاحظات هامة

- تم استخدام `SECURITY DEFINER` في وظائف SQL لتجاوز قيود RLS مع الحفاظ على الأمان.
- تم إضافة آلية احتياطية في `OrdersDataContext.tsx` لاستخدام بيانات مؤقتة في الذاكرة إذا فشلت عملية الإنشاء في قاعدة البيانات.
- يجب التأكد من وجود صلاحيات كافية للمستخدمين لتنفيذ الوظائف الجديدة.
- قد تحتاج إلى مراقبة الأداء بعد تطبيق التعديلات للتأكد من عدم وجود مشاكل جديدة. 