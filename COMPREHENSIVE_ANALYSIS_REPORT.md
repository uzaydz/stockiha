# 📊 تقرير التحليل الشامل للنظام
## تاريخ التحليل: 2025-12-04

---

## 🎯 ملخص تنفيذي

تم إجراء تحليل شامل للنظام بهدف:
1. ✅ جعل نظام الاشتراكات يعمل **بشكل مثالي جدا**
2. ✅ منع الغش في الأوفلاين (Anti-Cheat)
3. ✅ حل جميع مشاكل قاعدة البيانات و PowerSync

---

## 🔴 المشاكل الحرجة المكتشفة

### 1. 🚨 مشكلة استعلام الاشتراك (الأولوية القصوى)

**الموقع:** `src/lib/license/licenseService.ts:145`

**المشكلة:**
```typescript
// الاستعلام الحالي (خاطئ):
'SELECT * FROM organization_subscriptions WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 1'
```

**التأثير:**
- يُرجع الاشتراك الملغى بدلاً من الاشتراك النشط لأن الملغى لديه `updated_at` أحدث
- يتم توجيه المستخدم لصفحة الاشتراكات رغم وجود اشتراك صالح

**البيانات الفعلية في Supabase:**
| الاشتراك | status | end_date | updated_at |
|---------|--------|----------|------------|
| الاشتراك 1 | **active** | 2026-06-28 | 2024-06-28 |
| الاشتراك 2 | canceled | 2025-03-07 | 2024-12-02 ⬅️ أحدث |

**الحل المطلوب:**
```typescript
// الاستعلام الصحيح - أولوية للاشتراك النشط:
`SELECT * FROM organization_subscriptions
 WHERE organization_id = ?
 ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'trial' THEN 2 ELSE 3 END,
          end_date DESC
 LIMIT 1`
```

---

### 2. ❌ جدول user_permissions مفقود

**الخطأ:**
```
SqliteError: no such table: user_permissions
```

**التأثير:**
- فشل التحقق من الصلاحيات
- أخطاء متكررة في الكونسول

**الحل:**
إضافة الجدول في `PowerSyncSchema.ts`:
```typescript
user_permissions: new Table({
  user_id: column.text,
  organization_id: column.text,
  permission_name: column.text,
  granted_at: column.text,
  granted_by: column.text
}, { indexes: { user_org: ['user_id', 'organization_id'] } })
```

---

### 3. ❌ عمود auth_user_id مفقود من جدول users

**الخطأ:**
```
SqliteError: no such column: auth_user_id
```

**السبب:**
- PowerSync Schema لا يحتوي على `auth_user_id` في جدول `users`
- Sync Rules تبحث عن `auth_user_id` للربط مع `request.user_id()`

**الحل:**
تحديث جدول `users` في PowerSync Schema:
```typescript
users: new Table({
  // ... الحقول الموجودة
  auth_user_id: column.text, // ⬅️ إضافة هذا
})
```

---

### 4. ⚠️ عمود pending_operation مفقود

**الخطأ:**
```
no such column: pending_operation
```

**السبب:**
- بعض الكود يبحث عن `pending_operation` الذي كان موجوداً في النظام القديم

**الحل:**
- إما إضافة العمود للـ schema
- أو تحديث الكود لاستخدام PowerSync outbox (`ps_crud`)

---

## 🔶 مشاكل متوسطة الأهمية

### 5. تناقض أسماء الأعمدة

| الاستخدام في الكود | الاسم الصحيح في Supabase |
|-------------------|-------------------------|
| `trial_end_date` | `trial_ends_at` ✅ |
| `repairs` | `repair_orders` |
| `staff_members` | `pos_staff_sessions` |

**الملفات المتأثرة:**
- معظم الملفات تم تصحيحها
- يجب التأكد من عدم وجود استخدامات قديمة

---

### 6. جداول في Sync Rules لكن ليست في PowerSync Schema

الجداول التالية موجودة في Sync Rules لكن غير معرفة في PowerSync Schema:

```
❌ activation_codes
❌ subscription_audit_logs
❌ payment_methods
❌ subscription_history
❌ subscription_invoices
❌ customers_audit (إذا كان موجوداً)
```

**التأثير:**
- البيانات تُزامن لكن لا يمكن قراءتها محلياً

---

## 🟢 نقاط القوة في Anti-Cheat

### ما هو موجود ويعمل بشكل جيد:

#### 1. SecureClock (ساعة آمنة)
```typescript
// في licenseService.ts
- التحقق من التلاعب بالوقت
- حظر بعد 5 محاولات تلاعب
- فترة حظر 24 ساعة
```

#### 2. نظام تشفير HMAC
```typescript
// في subscriptionCrypto.ts
- تشفير AES-GCM 256-bit
- توقيع HMAC-SHA256
- صلاحية 7 أيام للبيانات المشفرة
- بصمة الجهاز في المفتاح
```

#### 3. سجلات التدقيق
```typescript
// في subscriptionAudit.ts
- تسجيل محاولات التفعيل
- تتبع محاولات التلاعب
- تسجيل الأخطاء
```

---

## 📋 خطة الإصلاح (مرتبة حسب الأولوية)

### 🔴 الأولوية القصوى (يجب الإصلاح فوراً)

| # | المشكلة | الملف | الإصلاح |
|---|---------|------|---------|
| 1 | استعلام الاشتراك | `licenseService.ts:145` | تغيير ORDER BY |
| 2 | جدول user_permissions | `PowerSyncSchema.ts` | إضافة الجدول |
| 3 | عمود auth_user_id | `PowerSyncSchema.ts` | إضافة للجدول users |

### 🟡 الأولوية المتوسطة

| # | المشكلة | الملف | الإصلاح |
|---|---------|------|---------|
| 4 | pending_operation | متعدد | تحديث الكود |
| 5 | الجداول المفقودة | `PowerSyncSchema.ts` | إضافة 6 جداول |

### 🟢 الأولوية المنخفضة

| # | المشكلة | الإصلاح |
|---|---------|---------|
| 6 | تنظيف console logs | إزالة logs غير ضرورية |
| 7 | توثيق Schema | إضافة تعليقات |

---

## 💻 الإصلاحات المقترحة بالكود

### الإصلاح #1: استعلام الاشتراك

```typescript
// src/lib/license/licenseService.ts - السطر 144-148

// قبل (خاطئ):
const rows = await powerSyncService.execute(
  'SELECT * FROM organization_subscriptions WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 1',
  [orgId]
);

// بعد (صحيح):
const rows = await powerSyncService.execute(
  `SELECT * FROM organization_subscriptions
   WHERE organization_id = ?
   ORDER BY
     CASE status
       WHEN 'active' THEN 1
       WHEN 'trial' THEN 2
       ELSE 3
     END,
     end_date DESC
   LIMIT 1`,
  [orgId]
);
```

### الإصلاح #2: إضافة جدول user_permissions

```typescript
// src/lib/powersync/PowerSyncSchema.ts

user_permissions: new Table({
  user_id: column.text,
  organization_id: column.text,
  permission_name: column.text,
  granted_at: column.text,
  granted_by: column.text,
  created_at: column.text,
  updated_at: column.text
}, {
  indexes: {
    user_org: ['user_id', 'organization_id'],
    permission: ['permission_name']
  }
})
```

### الإصلاح #3: إضافة auth_user_id لجدول users

```typescript
// src/lib/powersync/PowerSyncSchema.ts - جدول users

users: new Table({
  // الحقول الموجودة...
  auth_user_id: column.text, // ⬅️ إضافة
}, {
  indexes: {
    auth_user: ['auth_user_id'], // ⬅️ إضافة index
    // ... indexes موجودة
  }
})
```

---

## 🔒 تحسينات Anti-Cheat المقترحة

### 1. تحسين التحقق الأوفلاين

```typescript
// إضافة في licenseService.ts

async function validateOfflineSubscription(orgId: string): Promise<boolean> {
  // 1. التحقق من SecureClock
  const { secureNowMs, tamperDetected, isLocked } = await getSecureNow(orgId);

  if (tamperDetected || isLocked) {
    await subscriptionAudit.logTamperDetected(orgId, 'clock', { secureNowMs });
    return false;
  }

  // 2. جلب الاشتراك بالترتيب الصحيح
  const subscription = await getLocalSubscription(orgId);

  if (!subscription) {
    return false;
  }

  // 3. التحقق من الصلاحية بالوقت الآمن
  const { expired } = isExpired(subscription, secureNowMs);

  return !expired;
}
```

### 2. إضافة تحقق دوري

```typescript
// في appInitializationService.ts

// التحقق كل 5 دقائق في الأوفلاين
setInterval(async () => {
  if (!navigator.onLine) {
    const isValid = await validateOfflineSubscription(organizationId);
    if (!isValid) {
      // إعادة توجيه لصفحة الاشتراكات
    }
  }
}, 5 * 60 * 1000);
```

---

## 📊 ملخص الأخطاء في Console

| نوع الخطأ | العدد التقريبي | الحل |
|-----------|---------------|------|
| no such table: user_permissions | متكرر | إضافة الجدول |
| no such column: auth_user_id | متكرر | إضافة العمود |
| Subscription redirect | كل تحميل | إصلاح ORDER BY |
| pending_operation | أحياناً | تحديث الكود |

---

## ✅ الخلاصة

**المشكلة الرئيسية:** استعلام الاشتراك يُرجع الاشتراك الخاطئ (الملغى بدلاً من النشط)

**الحل السريع:** تغيير `ORDER BY updated_at DESC` إلى `ORDER BY CASE status...`

**الوقت المتوقع للإصلاح الكامل:**
- الإصلاحات الحرجة: مباشرة
- الإصلاحات المتوسطة: بعد اختبار الحرجة
- التحسينات: حسب الحاجة

---

## 🚀 الخطوة التالية الموصى بها

**ابدأ بإصلاح استعلام الاشتراك في `licenseService.ts:145`** - هذا سيحل مشكلة التوجيه لصفحة الاشتراكات فوراً.

---

*تم إنشاء هذا التقرير بواسطة Claude Code*
