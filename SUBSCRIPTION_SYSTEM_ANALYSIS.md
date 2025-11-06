# تقرير شامل: نظام التحقق من الاشتراك والصلاحيات

## 1. كيفية التحقق من صلاحية الاشتراك

### أولاً: آليات التحقق (Multi-Layer)

#### المستوى الأول: دالة قاعدة البيانات المحسنة
- **الدالة**: `check_organization_subscription_enhanced()` 
- **الملف**: `src/lib/subscription-cache.ts`
- **العمل**: تعيد بيانات كاملة عن الاشتراك مع:
  - `status`: 'active' | 'trial' | 'expired' | 'canceled' | 'error' | 'not_found' | 'pending'
  - `days_left`: عدد الأيام المتبقية
  - `subscription_type`: 'paid' | 'trial_subscription' | 'organization_trial' | 'none'
  - `plan_name`, `plan_code`, `features`, `limits`

#### المستوى الثاني: التحقق من الأولويات
تتبع الدالة `check_organization_subscription()` في SQL ترتيب أولويات:

1. **الأولوية الأولى**: البحث عن اشتراك نشط مدفوع
   - شرط: `status = 'active' AND end_date > NOW()`
   - استبعاد الخطط التجريبية: `sp.code != 'trial'`

2. **الأولوية الثانية**: البحث عن اشتراك تجريبي نشط
   - شرط: `status IN ('trial', 'active') AND end_date > NOW() AND sp.code = 'trial'`

3. **الأولوية الثالثة**: الفترة التجريبية التقليدية (5 أيام من الإنشاء)
   - يتحقق من `org.settings.trial_end_date` أو يحسبها: `created_at + 5 days`

4. **الحالة الافتراضية**: منتهي الصلاحية (expired)
   - إذا لم تتطابق أي من الشروط السابقة

#### المستوى الثالث: مكون التحقق (SubscriptionCheck)
```typescript
// src/components/subscription/SubscriptionCheck.tsx
- يتحقق كل مرة يدخل المستخدم الصفحة
- يسمح بالوصول فقط للاشتراكات النشطة أو التجريبية
- يعيد التوجيه للصفحة الرئيسية للاشتراك إذا كان منتهياً
- لا يتحقق في صفحات: /subscription أو /settings
```

---

## 2. متى يتم التحقق: متصل بالإنترنت فقط أم دائماً؟

### التحقق الأساسي: **متصل بالإنترنت فقط**

#### أوقات التحقق المحددة:
1. **عند تحميل الصفحة الأولى** (component mount)
2. **كل 5 دقائق** (polling interval)
3. **عند عودة المستخدم للنافذة** (visibility change)
4. **عند تفعيل الاشتراك يدويً** (custom event)
5. **عند تحديث الصفحة يدويً** (button click)

#### أماكن التحقق:
```typescript
// src/hooks/useSubscriptionMonitor.ts
- checkSubscriptionStatus() كل 5 دقائق
- fallbackSubscriptionCheck() إذا فشل الاتصال
- monitor_and_fix_subscriptions() RPC function

// src/components/subscription/SubscriptionCheck.tsx
- الفحص يحدث مرة واحدة فقط عند التحميل (debounce 1 ثانية)
- cache لمدة 5 دقائق لتجنب الاستدعاءات المتكررة
```

### لا يوجد تحقق محلي بدون إنترنت
- لا يوجد آلية "grace period" أو فترة سماح حقيقية
- لا يتم التحقق من تاريخ الاشتراك المحلي بدون إنترنت

---

## 3. ماذا يحدث عند انتهاء الاشتراك

### الإجراءات الفورية:
1. **تحديث حالة قاعدة البيانات**
   ```sql
   UPDATE organization_subscriptions SET status = 'expired'
   UPDATE organizations SET subscription_status = 'expired'
   ```

2. **مسح التخزين المؤقت المحلي**
   ```typescript
   clearPermissionsCache() // مسح صلاحيات المستخدم
   subscriptionCache.clearCache() // مسح كاش الاشتراك
   ```

3. **تحديث بيانات المؤسسة**
   ```typescript
   await refreshOrganizationData()
   ```

4. **إعادة تحميل الصفحة**
   ```typescript
   window.location.reload() // في بعض الحالات
   ```

### عرض الرسالة:
- يتم عرض صفحة `SubscriptionExpiredPage` مع:
  - رسالة "اشتراكك منتهي الصلاحية"
  - زر لتجديد الاشتراك
  - زر للدورات التدريبية (إذا كان لديه وصول)

### المنع من الوصول:
```typescript
// في SubscriptionCheck.tsx
if (subscriptionData.status === 'expired' || subscriptionData.days_left <= 0) {
  navigate('/dashboard/subscription', { replace: true })
}
```

---

## 4. هل يستمر البرنامج في العمل بدون إنترنت بعد انتهاء الاشتراك؟

### الإجابة: **نعم، لكن بشكل محدود جداً**

#### آلية العمل بدون إنترنت:
1. **البيانات المحفوظة محلياً**
   ```typescript
   // src/context/auth/utils/authStorage.ts
   - OFFLINE_SNAPSHOT_KEY: بيانات المستخدم
   - subscription_cache_*: بيانات الاشتراك السابقة
   - secure_offline_session_v1: الجلسة الآمنة
   ```

2. **التحقق المحلي البسيط**
   ```typescript
   - يحتفظ ببيانات الاشتراك السابقة في localStorage
   - لا يتحقق من صلاحية التاريخ محلياً
   - يستخدم البيانات المخزنة القديمة فقط
   ```

3. **الوصول المحدود**
   ```typescript
   - لا يمنع الوصول إذا كانت البيانات المحفوظة تشير لاشتراك نشط
   - لكن بمجرد الاتصال بالإنترنت، يتم التحقق الحقيقي
   - إذا كان الاشتراك منتهياً فعلاً، يتم منع الوصول
   ```

#### السيناريوهات:
| الحالة | بدون إنترنت | مع الإنترنت |
|--------|-----------|-----------|
| اشتراك نشط سابقاً | وصول كامل (استخدام البيانات القديمة) | وصول كامل |
| اشتراك انتهى | **وصول كامل!** (لا يعرف أنه انتهى) | منع الوصول |
| اشتراك جديد | رفض (لا توجد بيانات) | وصول فوري |

---

## 5. أين يتم تخزين بيانات الاشتراك محلياً

### التخزين المحلي (localStorage):

```typescript
// 1. بيانات الاشتراك المحفوظة (مدة 24 ساعة)
localStorage.getItem('subscription_cache_${organizationId}')
{
  data: SubscriptionData,
  expires: timestamp (24 ساعة من الآن),
  version: '1.0'
}

// 2. لقطة من بيانات المستخدم للعمل بدون إنترنت
localStorage.getItem('bazaar_offline_auth_snapshot_v1')
{
  user: { id, email, user_metadata, ... },
  sessionMeta: { expiresAt, storedAt },
  organizationId: string,
  lastUpdatedAt: timestamp
}

// 3. بيانات الجلسة الآمنة
localStorage.getItem('bazaar_organization_id')
localStorage.getItem('bazaar_organization_name')

// 4. بيانات المستخدم المحلية
localStorage.getItem('user_profile_*')
localStorage.getItem('organization_*')
```

### التخزين في sessionStorage:

```typescript
// 1. كاش الاشتراك الموقت (30 دقيقة)
sessionStorage.getItem('subscription_cache_${organizationId}')
{
  data: SubscriptionData,
  timestamp: Date.now()
}

// 2. بيانات الجلسة
sessionStorage.getItem('bazaar_organization_data')
sessionStorage.getItem('session_cache')
```

### التخزين في الذاكرة (Memory):

```typescript
// في SubscriptionCacheService
private memoryCache: Map<string, { 
  data: SubscriptionData; 
  expires: number 
}>
// مدة ا��صلاحية: 24 ساعة
```

### التخزين في Electron (إن وجد):

```javascript
// electron/secureStorage.cjs
- SecureStorage: مشفر (بيانات حساسة)
- SessionStorage: مؤقت (يُحذف عند إعادة التشغيل)
- CacheStorage: غير مشفر (بيانات عامة)
```

### ملخص المفاتيح المستخدمة:
```
subscription_cache_${organizationId}      → 24 ساعة
subscription_cache_${organizationId}      → sessionStorage (30 دقيقة)
bazaar_offline_auth_snapshot_v1           → بدون انتهاء
bazaar_organization_id                    → دائم
bazaar_organization_name                  → دائم
bazaar_organization_data                  → dائم/sessionStorage
```

---

## 6. هل هناك Grace Period أو فترة سماح؟

### الإجابة: **لا، لا توجد فترة سماح رسمية**

#### الحالات الموجودة:

1. **حالة pending (قيد الانتظار)**
   ```typescript
   // في SubscriptionCheck.tsx
   if (subscription.status === 'pending') {
     // السماح بالوصول أثناء انتظار التفعيل
     return; // لا تعيد التوجيه
   }
   ```
   - المدة: حتى يتم الموافقة على الاشتراك يدويً

2. **تنبيه عند اقتراب الانتهاء**
   ```typescript
   // في SubscriptionStatus.tsx
   if (daysLeft <= 7 && daysLeft > 0) {
     // عرض تنبيه فقط (ليس منع وصول)
     // Alert: "اشتراكك سينتهي خلال X يوم"
   }
   ```
   - لا يمنع الوصول، فقط تنبيه

3. **التحقق المحلي بدون إنترنت** (كما ذُكر أعلاه)
   ```typescript
   // إذا كانت البيانات المحفوظة تشير لاشتراك نشط
   // يسمح بالوصول حتى بدون إنترنت
   ```

#### عدم وجود فترة سماح يعني:
- ✗ لا توجد أيام إضافية بعد انتهاء التاريخ
- ✗ لا توجد رسالة تحذير قبل الإبطال بيومين مثلاً
- ✓ فقط تنبيهات عند اقتراب (7 أيام أو أقل)
- ✓ وصول فوري بعد التجديد

---

## ملخص العملية الكاملة

```
┌─────────────────────────────────────────────────────────┐
│        التحقق من الاشتراك (Subscription Check)         │
└─────────────────────────────────────────────────────────┘
              │
              ├─ تحديث دوري؟ (كل 5 دقائق)
              │  └─ اتصال بالإنترنت؟
              │     ├─ نعم → استدعاء RPC function
              │     └─ لا → استخدام البيانات المحفوظة
              │
              ├─ النتيجة؟
              │  ├─ active → وصول كامل
              │  ├─ trial → وصول كامل (+ تنبيه قبل 7 أيام)
              │  ├─ pending → وصول مع رسالة انتظار
              │  ├─ expired → منع الوصول (عرض SubscriptionExpiredPage)
              │  └─ error → محاولة استخدام البيانات المحفوظة
              │
              └─ مسح البيانات المحلية عند التغيير
                 └─ clearPermissionsCache()
                 └─ subscriptionCache.clearCache()
                 └─ refreshOrganizationData()
```

---

## التوصيات الأمنية

1. **لا تعتمد على التحقق المحلي**: البيانات المحفوظة قد تكون قديمة
2. **تحديث منتظم**: التحقق الدوري كل 5 دقائق (جيد)
3. **عرض الحالة للمستخدم**: التنبيهات مفيدة جداً
4. **منع الوصول الكامل**: عند انتهاء الاشتراك (تم تنفيذه)
5. **حفظ البيانات المهمة**: قبل الانتهاء (توصية عملية)

