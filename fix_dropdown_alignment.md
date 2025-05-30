# تعديل محاذاة القوائم المنسدلة

## المشكلة
هناك مشكلة في ظهور القوائم المنسدلة في تطبيق إدارة الطلبات حيث تظهر القوائم فوق مكان الضغط وليس في نفس المكان. المشكلة تحديداً في المكونات التالية:
- `CallConfirmationDropdown.tsx`
- `OrderStatusDropdown.tsx`
- `OrderActionsDropdown.tsx`

## الحل
يجب تعديل خصائص مكون `DropdownMenuContent` في الملفات المذكورة أعلاه لتغيير المحاذاة من "center" إلى "end" وتعديل قيمة `alignOffset` من -50 إلى 0.

## تعديلات مطلوبة

### 1. ملف CallConfirmationDropdown.tsx

البحث عن الكود التالي (حوالي السطر 240):

```tsx
<DropdownMenuContent
  align="end"
  alignOffset={-50}
  className="min-w-[180px] p-1 rounded-lg border shadow-lg"
>
```

وتعديله إلى:

```tsx
<DropdownMenuContent
  align="end"
  alignOffset={0}
  className="min-w-[180px] p-1 rounded-lg border shadow-lg"
>
```

### 2. ملف OrderStatusDropdown.tsx

البحث عن الكود التالي (حوالي السطر 112):

```tsx
<DropdownMenuContent
  align="center"
  alignOffset={-50}
  className="min-w-[180px] p-1 rounded-lg border shadow-lg"
>
```

وتعديله إلى:

```tsx
<DropdownMenuContent
  align="end"
  alignOffset={0}
  className="min-w-[180px] p-1 rounded-lg border shadow-lg"
>
```

### 3. ملف OrderActionsDropdown.tsx

البحث عن الكود التالي (حوالي السطر 297):

```tsx
<DropdownMenuContent
  align="center"
  alignOffset={-50}
  className="min-w-[180px] p-1 rounded-lg border shadow-lg"
>
```

وتعديله إلى:

```tsx
<DropdownMenuContent
  align="end"
  alignOffset={0}
  className="min-w-[180px] p-1 rounded-lg border shadow-lg"
>
```

## ملاحظات تنفيذية

1. خاصية `align="end"` تجعل القائمة المنسدلة تظهر بمحاذاة الجانب الأيمن من الزر (في حالة الواجهة العربية يفضل محاذاة "end" لتظهر القائمة بشكل أفضل)

2. خاصية `alignOffset={0}` تلغي الإزاحة السلبية التي كانت تسبب ظهور القائمة بعيداً عن مكان الضغط

3. بعد تنفيذ هذه التعديلات، ستظهر القوائم المنسدلة مباشرة أسفل الزر المضغوط بشكل صحيح ومتناسق مع الواجهة

4. لا تنس اختبار التغييرات في مختلف أحجام الشاشات للتأكد من أن المحاذاة تعمل بشكل صحيح في جميع الحالات 