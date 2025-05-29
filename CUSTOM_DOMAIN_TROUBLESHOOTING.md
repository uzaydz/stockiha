# دليل استكشاف أخطاء النطاقات المخصصة وإصلاحها

## المشاكل الشائعة والحلول

### 1. خطأ Content Security Policy (CSP)

**الخطأ:**
```
Refused to connect to 'https://api.vercel.com/v9/projects/stockiha/domains' because it violates the following Content Security Policy directive
```

**السبب:**
سياسة أمان المحتوى (CSP) تمنع الاتصال بـ Vercel API.

**الحل:**
تم إصلاح هذه المشكلة بتحديث ملف `vercel.json` لضمان ترتيب صحيح لـ `connect-src` يتضمن:
```
connect-src 'self' https://api.vercel.com https://*.vercel.app
```

### 2. مشكلة AlertDialog الوصولية

**الخطأ:**
```
`AlertDialogContent` requires a `AlertDialogTitle` for the component to be accessible for screen reader users.
Warning: Missing `Description` or `aria-describedby={undefined}` for {AlertDialogContent}.
```

**السبب:**
مكونات AlertDialog تفتقر إلى عناصر الوصولية المطلوبة.

**الحل:**
تم إنشاء مكونات جديدة:
- `VisuallyHidden`: لإخفاء العناصر بصرياً مع الحفاظ على الوصولية
- `AccessibleAlertDialog`: مكون محسن يضمن وجود Title و Description

**الاستخدام:**
```tsx
import { AccessibleAlertDialog } from '@/components/ui/accessible-alert-dialog'
import { AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'

<AccessibleAlertDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="تأكيد الإجراء"
  description="هل أنت متأكد من هذا الإجراء؟"
  hideTitle={false} // أو true لإخفاء العنوان بصرياً
  hideDescription={false} // أو true لإخفاء الوصف بصرياً
>
  <AlertDialogFooter>
    <AlertDialogCancel>إلغاء</AlertDialogCancel>
    <AlertDialogAction>تأكيد</AlertDialogAction>
  </AlertDialogFooter>
</AccessibleAlertDialog>
```

### 3. مشاكل إعداد النطاق

**المشاكل الشائعة:**
- فشل التحقق من النطاق
- مشاكل DNS
- عدم عمل شهادة SSL

**الحلول:**

1. **التحقق من إعدادات DNS:**
   - تأكد من إضافة سجلات CNAME/A بشكل صحيح
   - انتظر انتشار DNS (يمكن أن يستغرق حتى 48 ساعة)

2. **التحقق من صلاحيات Vercel:**
   - تأكد من وجود VERCEL_TOKEN صالح
   - تأكد من VERCEL_PROJECT_ID صحيح

3. **إعادة المحاولة:**
   - انتظر 24 ساعة قبل إعادة المحاولة
   - تحقق من حالة النطاق في لوحة تحكم Vercel

### 4. متغيرات البيئة المطلوبة

تأكد من وجود المتغيرات التالية في ملف `.env`:

```env
VERCEL_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=your_project_id_here
```

### 5. طرق التحقق من المشاكل

1. **فحص Console للأخطاء:**
   - افتح Developer Tools (F12)
   - راجع تبويب Console للأخطاء

2. **فحص Network Tab:**
   - تحقق من طلبات API المرفوضة
   - راجع رسائل الخطأ التفصيلية

3. **اختبار النطاق:**
   ```bash
   # فحص سجلات DNS
   nslookup your-domain.com
   
   # فحص CNAME
   dig CNAME your-domain.com
   ```

### 6. جهات الاتصال للدعم

إذا استمرت المشاكل:
1. تحقق من حالة خدمات Vercel
2. راجع وثائق Vercel API
3. تواصل مع فريق الدعم الفني

### 7. نصائح إضافية

- استخدم نطاقات فرعية للاختبار أولاً
- تأكد من دفع اشتراك النطاق قبل الإعداد
- احتفظ بنسخة احتياطية من إعدادات DNS الحالية
- قم بالاختبار في بيئة staging قبل Production

---

**آخر تحديث:** 16 يناير 2025
**الإصدار:** 1.0 