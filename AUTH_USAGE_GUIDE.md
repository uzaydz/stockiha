# دليل استخدام نظام المصادقة المحدث

## المشكلة التي تم حلها
كانت المشكلة الأساسية هي أن عميل Supabase لا يحدث session headers بشكل صحيح، مما يؤدي إلى إرسال الطلبات بدور `anon` بدلاً من `authenticated`.

## الحل النهائي

### 1. استخدام SupabaseAuthManager
بدلاً من استيراد `supabase` مباشرة، استخدم:

```typescript
// ❌ الطريقة القديمة (مشكلة)
import { supabase } from '@/lib/supabase';

// ✅ الطريقة الجديدة (صحيحة)
import { getAuthenticatedSupabase } from '@/lib/supabase-auth-manager';

const supabase = await getAuthenticatedSupabase();
```

### 2. في ملفات API
```typescript
export const createSomething = async (data: any) => {
  // الحصول على عميل مصادق
  const supabase = await getAuthenticatedSupabase();
  
  // تنفيذ العملية
  const { data: result, error } = await supabase
    .from('table_name')
    .insert(data);
    
  if (error) throw error;
  return result;
};
```

### 3. في Components
```typescript
import { getAuthenticatedSupabase } from '@/lib/supabase-auth-manager';

const MyComponent = () => {
  const handleSubmit = async () => {
    try {
      const supabase = await getAuthenticatedSupabase();
      // تنفيذ العمليات...
    } catch (error) {
      // التعامل مع أخطاء المصادقة
      console.error('خطأ في المصادقة:', error);
    }
  };
};
```

## الميزات الجديدة

### 1. تحديث تلقائي للSession
- يراقب تغييرات المصادقة تلقائياً
- يحدث Authorization headers عند تسجيل الدخول/الخروج

### 2. التحقق من صحة المصادقة
```typescript
import { supabaseAuthManager } from '@/lib/supabase-auth-manager';

const authState = await supabaseAuthManager.checkAuthState();
if (!authState.isAuthenticated) {
  // إعادة توجيه لصفحة تسجيل الدخول
}
```

### 3. معالجة أخطاء المصادقة
```typescript
try {
  const supabase = await getAuthenticatedSupabase();
  // العمليات...
} catch (error) {
  if (error.message.includes('تسجيل الدخول')) {
    // إعادة توجيه لصفحة تسجيل الدخول
    router.push('/login');
  }
}
```

## ملاحظات مهمة

### 1. إزالة الحلول المؤقتة
تم إزالة:
- `insert_product_with_auth` function
- التحايل على RLS policies
- تحديد headers يدوياً

### 2. الصيانة
- لا حاجة لتحديث headers يدوياً
- يعمل مع جميع عمليات CRUD
- متوافق مع RLS policies

### 3. الأداء
- عميل واحد مشترك
- تحديث Session مرة واحدة فقط
- تخزين مؤقت للTokens

## الاختبار
```typescript
// اختبار المصادقة
const testAuth = async () => {
  try {
    const supabase = await getAuthenticatedSupabase();
    const { data, error } = await supabase.from('products').select('count');
    console.log('✅ المصادقة تعمل بشكل صحيح');
  } catch (error) {
    console.error('❌ مشكلة في المصادقة:', error);
  }
};
```

هذا الحل يضمن عدم تكرار مشكلة الخطأ 403 مرة أخرى.