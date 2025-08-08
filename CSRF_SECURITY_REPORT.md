# تقرير أمان CSRF (Cross-Site Request Forgery)

## 🔒 تحليل الثغرات الموجودة

### ✅ **الحماية الموجودة:**

#### 1. **استخدام Supabase مع JWT Tokens**
- **الموقع:** `src/lib/api/fetchWithAuth.ts`
- **التقييم:** ✅ **محمي جزئياً**
- **التفاصيل:**
  ```typescript
  const { data: { session } } = await supabase.auth.getSession();
  headers.set('Authorization', `Bearer ${session.access_token}`);
  ```
- **المخاطر:** JWT tokens يمكن أن تكون عرضة للسرقة عبر XSS

#### 2. **إعدادات CORS في Vercel**
- **الموقع:** `vercel.json`
- **التقييم:** ✅ **محمي**
- **التفاصيل:**
  ```json
  {
    "key": "X-Frame-Options",
    "value": "DENY"
  }
  ```

#### 3. **Content Security Policy (CSP)**
- **الموقع:** `index.html`
- **التقييم:** ✅ **محمي جزئياً**
- **التفاصيل:**
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self';...">
  ```

### 🚨 **الثغرات الموجودة:**

#### 1. **عدم وجود CSRF Tokens في النماذج**

**المواقع المتأثرة:**

1. **نموذج الطلب (`OrderFormSubmitter.ts`):**
   ```typescript
   // قبل الإصلاح
   const orderData = {
     fullName,
     phone,
     // ... بيانات أخرى
   };
   ```

2. **نموذج المنتج (`ProductForm.tsx`):**
   ```typescript
   // قبل الإصلاح
   const submissionData = {
     ...data,
     organization_id: currentOrganizationId,
     // ... بيانات أخرى
   };
   ```

3. **نموذج الهبوط (`FormComponent.tsx`):**
   ```typescript
   // قبل الإصلاح
   const jsonData = {
     ...updatedFormData,
     organization_id,
     submitted_at: new Date().toISOString(),
     status: 'new'
   };
   ```

#### 2. **استخدام `credentials: 'include'` بدون CSRF Protection**
```typescript
// في fetchWithAuth.ts
const fetchOptions: RequestInit = {
  credentials: 'include', // يرسل الكوكيز
  mode: 'cors'
};
```

#### 3. **عدم وجود SameSite Cookie Protection**
لا توجد إعدادات `SameSite` للكوكيز.

## 🛡️ **الحلول المطبقة:**

### 1. **إضافة نظام CSRF Protection**

**الملف:** `src/utils/csrf.ts`

```typescript
// إنشاء CSRF token
export const generateCSRFToken = (): string => {
  const token = crypto.getRandomValues(new Uint8Array(32))
    .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
  
  const tokenData = {
    token,
    timestamp: Date.now(),
    expiry: Date.now() + CSRF_TOKEN_EXPIRY
  };
  
  localStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
  return token;
};

// إضافة CSRF token إلى headers
export const addCSRFTokenToHeaders = (headers: Headers): void => {
  const csrfToken = getCSRFToken();
  headers.set('X-CSRF-Token', csrfToken);
};
```

### 2. **تحديث fetchWithAuth لإضافة CSRF Protection**

**الملف:** `src/lib/api/fetchWithAuth.ts`

```typescript
// إضافة CSRF token للحماية
addCSRFTokenToHeaders(headers);
```

### 3. **تحديث النماذج لإضافة CSRF Protection**

**نموذج الطلب:**
```typescript
// إعداد بيانات الطلب مع CSRF protection
const orderData = addCSRFTokenToFormData(prepareOrderData(props, formData));
```

**نموذج المنتج:**
```typescript
// إضافة CSRF protection
const protectedSubmissionData = addCSRFTokenToFormData(submissionData as any);
```

**نموذج الهبوط:**
```typescript
// بيانات JSON مع CSRF protection
const jsonData = addCSRFTokenToFormData({
  ...updatedFormData,
  organization_id,
  submitted_at: new Date().toISOString(),
  status: 'new'
});
```

## 📋 **خطوات التطبيق الإضافية:**

### 1. **تحديث إعدادات الكوكيز**
```typescript
// إضافة SameSite protection
document.cookie = "session=value; SameSite=Strict; Secure";
```

### 2. **تحديث CSP**
```html
<!-- إزالة 'unsafe-inline' من script-src -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval'...">
```

### 3. **إضافة CSRF Validation في Backend**
```sql
-- إضافة جدول للـ CSRF tokens
CREATE TABLE csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

## ✅ **الفوائد الأمنية:**

1. **منع CSRF Attacks:** حماية من الهجمات عبر المواقع الأخرى
2. **تحسين الأمان:** طبقة إضافية من الحماية
3. **توافق مع المعايير:** اتباع أفضل الممارسات الأمنية
4. **سهولة التطبيق:** نظام مرن وقابل للتوسع

## 🔍 **المراقبة والصيانة:**

- **مراجعة دورية** للـ CSRF tokens
- **اختبار الأمان** للتأكد من فعالية الحماية
- **مراقبة الأخطاء** المتعلقة بـ CSRF
- **تحديث التوكنات** بشكل دوري

## 📊 **مستوى الأمان بعد الإصلاح:**

- **قبل الإصلاح:** ⚠️ **متوسط** (يعتمد على JWT فقط)
- **بعد الإصلاح:** ✅ **عالي** (CSRF + JWT + CSP)

---

**ملاحظة:** يجب تطبيق نفس الحماية على جميع النماذج والطلبات في التطبيق. 