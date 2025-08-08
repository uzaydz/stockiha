# نظام نسيت كلمة المرور

هذا النظام يوفر وظيفة "نسيت كلمة المرور" مع تجربة مستخدم ممتازة وتصميم متناسق مع باقي المكونات.

## المكونات

### 1. ForgotPasswordForm
المكون الرئيسي لطلب إعادة تعيين كلمة المرور.

**الميزات:**
- إدخال البريد الإلكتروني
- التحقق من صحة البريد الإلكتروني
- إرسال رابط إعادة التعيين
- عرض رسالة نجاح بعد الإرسال
- إمكانية إعادة الإرسال

### 2. ResetPasswordForm
مكون إعادة تعيين كلمة المرور.

**الميزات:**
- التحقق من صحة الرابط (access_token و refresh_token)
- إدخال كلمة مرور جديدة
- تأكيد كلمة المرور
- مؤشر قوة كلمة المرور
- التحقق من تطابق كلمات المرور
- عرض رسالة نجاح بعد التحديث

### 3. PasswordStrengthIndicator
مكون منفصل لعرض قوة كلمة المرور.

**الميزات:**
- شريط تقدم ملون
- قائمة المتطلبات مع أيقونات
- تقييم قوة كلمة المرور (5 مستويات)
- تصميم متجاوب مع الوضع المظلم

### 4. PasswordInput
مكون منفصل لحقل إدخال كلمة المرور.

**الميزات:**
- إظهار/إخفاء كلمة المرور
- أيقونة القفل
- دعم مؤشر قوة كلمة المرور
- تصميم متجاوب

### 5. AuthLayout
مكون مشترك لتخطيط صفحات المصادقة.

**الميزات:**
- تخطيط موحد لجميع صفحات المصادقة
- أيقونة قابلة للتخصيص
- عنوان ووصف قابلان للتخصيص
- دعم الوضع المظلم

### 6. SuccessMessage
مكون مشترك لعرض رسائل النجاح.

**الميزات:**
- تصميم موحد لرسائل النجاح
- أزرار قابلة للتخصيص
- أيقونة قابلة للتخصيص
- دعم الوضع المظلم

## الاستخدام

### إضافة رابط نسيت كلمة المرور إلى LoginForm

```tsx
import { ForgotPasswordForm, ResetPasswordForm } from '@/components/auth';

// في LoginForm
<div className="text-center">
  <a 
    href="/forgot-password" 
    className="text-sm font-medium text-[#fc5d41] hover:text-[#fc5d41]/80"
  >
    نسيت كلمة المرور؟
  </a>
</div>
```

### استخدام PasswordInput مع مؤشر القوة

```tsx
import { PasswordInput, PasswordStrengthIndicator } from '@/components/auth';

const [password, setPassword] = useState('');
const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });

<PasswordInput
  id="password"
  label="كلمة المرور"
  value={password}
  onChange={setPassword}
  showStrengthIndicator={true}
  onStrengthChange={setPasswordStrength}
/>

{password && <PasswordStrengthIndicator password={password} passwordStrength={passwordStrength} />}
```

### استخدام AuthLayout

```tsx
import { AuthLayout } from '@/components/auth';
import { Lock } from 'lucide-react';

<AuthLayout
  title="إعادة تعيين كلمة المرور"
  subtitle="أدخل كلمة المرور الجديدة"
  icon={<Lock className="w-8 h-8 text-white" />}
>
  {/* محتوى الصفحة */}
</AuthLayout>
```

### استخدام SuccessMessage

```tsx
import { SuccessMessage } from '@/components/auth';
import { CheckCircle } from 'lucide-react';

<SuccessMessage
  title="تم التحديث بنجاح"
  description="تم تحديث كلمة المرور بنجاح"
  icon={<CheckCircle className="w-8 h-8 text-white" />}
  primaryButtonText="تسجيل الدخول"
  onPrimaryButtonClick={() => navigate('/login')}
  secondaryButtonText="العودة للصفحة الرئيسية"
  onSecondaryButtonClick={() => navigate('/')}
/>
```

## التصميم

### الألوان
- اللون الأساسي: `#fc5d41`
- الأخضر للنجاح: `green-500` إلى `green-600`
- الأحمر للخطأ: `red-500`
- البرتقالي للتحذير: `orange-500`
- الأصفر للضعيف: `yellow-500`
- الأزرق للقوي: `blue-500`

### الوضع المظلم
جميع المكونات تدعم الوضع المظلم تلقائياً مع:
- خلفيات شفافة مع تأثير blur
- ألوان نص متجاوبة
- حدود وألوان متجاوبة

### التأثيرات
- انتقالات سلسة (duration-200)
- تأثيرات hover مع scale
- تأثيرات focus مع ring
- تأثيرات backdrop-blur

## الأمان

### التحقق من قوة كلمة المرور
- الحد الأدنى: 8 أحرف
- حرف صغير واحد على الأقل
- حرف كبير واحد على الأقل
- رقم واحد على الأقل
- رمز خاص واحد على الأقل

### التحقق من الرابط
- التحقق من وجود access_token و refresh_token
- إعادة التوجيه في حالة عدم صحة الرابط

### معالجة الأخطاء
- رسائل خطأ واضحة ومفيدة
- تسجيل الأخطاء في console
- معالجة الأخطاء غير المتوقعة

## التكامل مع Supabase

النظام يستخدم Supabase للمصادقة:
- `supabase.auth.resetPasswordForEmail()` لإرسال رابط إعادة التعيين
- `supabase.auth.updateUser()` لتحديث كلمة المرور
- معالجة الأخطاء من Supabase

## المسارات المطلوبة

تأكد من إضافة المسارات التالية في تطبيقك:

```tsx
// في ملف الراوتر
<Route path="/forgot-password" element={<ForgotPasswordForm />} />
<Route path="/reset-password" element={<ResetPasswordForm />} />
```

## الملفات المطلوبة

1. `src/components/auth/ForgotPasswordForm.tsx`
2. `src/components/auth/ResetPasswordForm.tsx`
3. `src/components/auth/PasswordStrengthIndicator.tsx`
4. `src/components/auth/PasswordInput.tsx`
5. `src/components/auth/AuthLayout.tsx`
6. `src/components/auth/SuccessMessage.tsx`
7. `src/components/auth/index.ts`

## التبعيات

- React Router DOM
- Lucide React (للأيقونات)
- Supabase Client
- Sonner (للإشعارات)
- Tailwind CSS 