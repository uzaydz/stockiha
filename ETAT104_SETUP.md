# 📋 دليل إعداد نظام كشف 104

## 🔧 **الخطوة 1: تثبيت المكتبات المطلوبة**

قم بتشغيل الأمر التالي لتثبيت مكتبات التصدير:

```bash
npm install xlsx file-saver
npm install --save-dev @types/file-saver
```

أو باستخدام pnpm:

```bash
pnpm add xlsx file-saver
pnpm add -D @types/file-saver
```

---

## 🗄️ **الخطوة 2: تشغيل قاعدة البيانات**

1. افتح **Supabase SQL Editor**
2. قم بتشغيل ملف: `database/migrations/create_etat104_tables.sql`
3. تأكد من نجاح إنشاء الجداول الأربعة:
   - `etat104_declarations`
   - `etat104_clients`
   - `etat104_validations`
   - `etat104_verification_log`

---

## 🚀 **الخطوة 3: استخدام النظام**

### **A. التصدير إلى Excel:**

```typescript
import { exportEtat104ToExcel } from '@/utils/etat104ExportUtils';

// مثال
await exportEtat104ToExcel(
  declaration,    // بيانات الكشف
  clients,        // قائمة العملاء
  organizationInfo, // معلومات المؤسسة
  {
    includeErrors: false,   // استبعاد العملاء بأخطاء
    includeWarnings: true,  // تضمين التحذيرات
    language: 'ar'          // اللغة
  }
);
```

### **B. تنزيل نموذج Excel:**

```typescript
import { exportEtat104Template } from '@/utils/etat104ExportUtils';

// تنزيل نموذج فارغ
exportEtat104Template();
```

### **C. التحقق من NIF و RC:**

```typescript
import { verifyNIF, verifyRC } from '@/services/etat104Service';

// التحقق من NIF
const nifResult = await verifyNIF(
  '123456789012345',
  organizationId,
  clientId  // اختياري
);

// التحقق من RC
const rcResult = await verifyRC(
  '12345678',
  organizationId,
  clientId  // اختياري
);
```

---

## 🔗 **الخطوة 4: تخصيص API للتحقق**

### **استبدال المحاكاة بـ API حقيقي:**

#### **1. للتحقق من NIF (DGI):**

افتح ملف: `api/etat104/verify-nif.js`

استبدل دالة `simulateNIFVerification` بطلب حقيقي:

```javascript
// بدلاً من المحاكاة
const response = await fetch('https://dgi.gov.dz/api/verify-nif', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DGI_API_KEY}`
  },
  body: JSON.stringify({ nif })
});

const verificationResult = await response.json();
```

#### **2. للتحقق من RC (CNRC):**

افتح ملف: `api/etat104/verify-rc.js`

استبدل دالة `simulateRCVerification` بطلب حقيقي:

```javascript
// بدلاً من المحاكاة
const response = await fetch('https://cnrc.dz/api/verify-rc', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.CNRC_API_KEY}`
  },
  body: JSON.stringify({ rc })
});

const verificationResult = await response.json();
```

---

## 📝 **الخطوة 5: إضافة مفاتيح API**

أضف المفاتيح إلى ملف `.env`:

```env
# مفاتيح API للتحقق
DGI_API_KEY=your_dgi_api_key_here
CNRC_API_KEY=your_cnrc_api_key_here
```

---

## 🎯 **الخطوة 6: اختبار النظام**

1. **افتح الصفحة:**
   - انتقل إلى: `/dashboard/etat104`

2. **استورد ملف Excel:**
   - انقر "استيراد من Excel"
   - اختر ملف أو اسحبه

3. **راجع النتائج:**
   - شاهد الإحصائيات
   - راجع الأخطاء والتحذيرات

4. **صدّر الكشف:**
   - انقر "تصدير"
   - اختر Excel أو PDF

---

## 📊 **تنسيق ملف Excel للاستيراد**

يجب أن يحتوي ملف Excel على الأعمدة التالية:

| الاسم التجاري | NIF | RC | رقم المادة | العنوان | HT | TVA |
|---------------|-----|----|-----------|---------|----|-----|
| شركة مثال | 123456789012345 | 12345678 | 001 | الجزائر | 100000 | 19000 |

**ملاحظات:**
- NIF: 15 رقم بالضبط
- RC: أرقام فقط
- HT: المبلغ قبل الضريبة
- TVA: ضريبة القيمة المضافة

---

## ⚠️ **ملاحظات مهمة**

### **1. التحقق من NIF و RC:**
- حالياً يستخدم النظام محاكاة للتحقق
- يجب استبدالها بـ API الفعلي من DGI و CNRC
- احفظ لقطات شاشة للتحقق (مطلوب قانوناً)

### **2. التصدير:**
- تنسيق Excel متوافق مع DGI
- يمكن استبعاد العملاء بأخطاء
- يتم حفظ الملف تلقائياً

### **3. قاعدة البيانات:**
- جميع البيانات محمية بـ RLS
- الإحصائيات تُحدث تلقائياً
- سجل كامل للتحقق

---

## 🔍 **استكشاف الأخطاء**

### **خطأ: "xlsx is not defined"**
```bash
npm install xlsx file-saver
```

### **خطأ: "Table does not exist"**
قم بتشغيل ملف SQL في Supabase

### **خطأ: "Permission denied"**
تأكد من تفعيل RLS وإعداد السياسات

---

## 📞 **الدعم**

للمزيد من المساعدة:
1. راجع الذاكرة المحفوظة للنظام
2. تحقق من ملفات التوثيق
3. راجع الكود المصدري

---

## ✅ **قائمة التحقق النهائية**

- [ ] تثبيت المكتبات (xlsx, file-saver)
- [ ] تشغيل ملف SQL في Supabase
- [ ] إضافة مفاتيح API (اختياري)
- [ ] اختبار الاستيراد
- [ ] اختبار التصدير
- [ ] اختبار التحقق من NIF/RC
- [ ] مراجعة الإحصائيات

---

**🎉 النظام جاهز للاستخدام!**
