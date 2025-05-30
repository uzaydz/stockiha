# تعليمات تعديل ملف OrdersDataContext.tsx

## الخطوات المطلوبة

يجب تعديل ملف `src/context/OrdersDataContext.tsx` لاستخدام الوظيفة الجديدة التي قمنا بإنشائها في ملف `fix_call_confirmation_statuses.sql`. فيما يلي التعديلات المقترحة:

### 1. تعديل وظيفة `refreshData`

البحث عن الجزء التالي في الملف (حوالي السطر 80):

```typescript
supabase
  .from('call_confirmation_statuses')
  .select('*')
  .eq('organization_id', currentOrganization.id)
  .order('is_default', { ascending: false })
  .order('name'),
```

واستبداله بـ:

```typescript
supabase
  .rpc('insert_call_confirmation_statuses_secure', {
    organization_id: currentOrganization.id,
    user_id: supabase.auth.getUser()?.data?.user?.id || null
  }),
```

### 2. تعديل وظيفة `addCallConfirmationStatus`

البحث عن وظيفة `addCallConfirmationStatus` (حوالي السطر 170) وتعديلها لاستخدام الوظيفة الجديدة كالتالي:

```typescript
const addCallConfirmationStatus = useCallback(async (name: string, color: string): Promise<number> => {
  if (!currentOrganization?.id) {
    const errorMsg = 'لا يوجد معرف منظمة';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    console.log('جاري إضافة حالة تأكيد اتصال جديدة:', { name, color });
    
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

    if (error) {
      console.error('خطأ في إضافة حالة تأكيد اتصال:', error);
      throw error;
    }

    // التحقق من وجود معرف
    if (!newStatusId) {
      throw new Error('لم يتم إنشاء معرف لحالة تأكيد الاتصال الجديدة');
    }

    console.log('تم إضافة حالة تأكيد اتصال جديدة بنجاح، المعرف:', newStatusId);

    // إضافة الحالة الجديدة للبيانات المحلية
    const newStatus: CallConfirmationStatus = {
      id: newStatusId,
      name: name.trim(),
      color: color,
      icon: null,
      is_default: false,
      organization_id: currentOrganization.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      callConfirmationStatuses: [...prev.callConfirmationStatuses, newStatus]
    }));

    return newStatusId;
  } catch (error: any) {
    console.error('خطأ في إضافة حالة تأكيد اتصال:', error);
    
    // إذا كان هناك خطأ 403 (Forbidden)، أظهر رسالة خاصة
    if (error.code === '403' || error.message?.includes('forbidden')) {
      toast({
        title: "خطأ في الصلاحيات",
        description: "ليس لديك صلاحية لإضافة حالات تأكيد اتصال جديدة. يرجى التواصل مع مدير النظام.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
}, [currentOrganization?.id, toast]);
```

### 3. تعديل النوع `CallConfirmationStatus`

تحديث تعريف النوع `CallConfirmationStatus` لتضمين جميع الحقول المطلوبة (في بداية الملف):

```typescript
export type CallConfirmationStatus = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_default: boolean | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
};
```

## كيفية تطبيق التعديلات

1. قم بتنفيذ ملف `fix_call_confirmation_statuses.sql` على قاعدة البيانات أولاً
2. قم بنسخ التعديلات المقترحة أعلاه وتطبيقها على ملف `src/context/OrdersDataContext.tsx`
3. أعد تشغيل التطبيق للتأكد من عمل التعديلات بشكل صحيح

## ملاحظات هامة

- تأكد من أن المستخدم لديه صلاحيات كافية لتنفيذ وظائف قاعدة البيانات الجديدة
- قد تحتاج إلى تعديل طريقة الوصول إلى معرف المستخدم الحالي حسب طريقة التوثيق المستخدمة في التطبيق
- راجع أي أخطاء في وحدة التحكم بعد تطبيق التعديلات
- قد تحتاج إلى إعادة تحميل بيانات حالات تأكيد المكالمات يدوياً بعد تنفيذ التعديلات

## اختبار التعديلات

بعد تطبيق التعديلات، يمكنك اختبار الوظائف التالية:

1. تحميل الصفحة وجلب حالات تأكيد المكالمات
2. إضافة حالة تأكيد مكالمة جديدة
3. تحديث حالة تأكيد مكالمة موجودة
4. تطبيق حالة تأكيد مكالمة على طلب 