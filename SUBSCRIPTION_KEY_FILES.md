# ملخص الملفات الأساسية لنظام الاشتراك

## 1. خدمات الاشتراك الأساسية

### src/lib/subscription-cache.ts (375 سطر)
**الدور**: خدمة التخزين المؤقت الذكي للاشتراكات
- **الفئة**: `SubscriptionCacheService` (Singleton)
- **الوظائف الرئيسية**:
  - `getSubscriptionStatus(organizationId)` - الحصول على حالة الاشتراك مع 4 مستويات كاش
  - `isSubscriptionValid(organizationId)` - التحقق السريع من الصلاحية
  - `forceRefresh(organizationId)` - تحديث فوري (تجاوز الكاش)
  - `clearCache(organizationId)` - مسح الكاش
- **مستويات الكاش**:
  1. sessionStorage (30 دقيقة)
  2. كاش الجلسة في الذاكرة (5 دقائق)
  3. كاش الذاكرة (24 ساعة)
  4. localStorage (24 ساعة)
- **RPC المستدعاة**: `check_organization_subscription_enhanced`

### src/lib/subscription-service.ts (616 سطر)
**الدور**: خدمة إدارة الاشتراكات الشاملة
- **الواجهات**:
  - `SubscriptionPlan` - معلومات الخطة
  - `Subscription` - بيانات الاشتراك
  - `PaymentMethod` - طرق الدفع
  - `SubscriptionValidationResult` - نتيجة التحقق
- **الدوال الرئيسية**:
  - `getActivePlans()` - جلب الخطط النشطة
  - `getCurrentSubscription()` - جلب الاشتراك الحالي
  - `validateSubscriptionReliably()` - التحقق مع عدة fallbacks
  - `calculateTotalDaysLeft()` - حساب الأيام (trial + paid)
  - `activateWithCode()` - تفعيل باستخدام كود
- **مدات الكاش**:
  - `daysLeftCache`: 15 دقيقة
  - `subscriptionDetailsCache`: 20 دقيقة

---

## 2. المكونات الأساسية

### src/components/subscription/SubscriptionCheck.tsx (267 سطر)
**الدور**: مكون حراسة لفحص الاشتراك
- **الفئة**: Component (React.FC)
- **الوظائف**:
  - فحص الاشتراك عند التحميل
  - منع الوصول للصفحات إذا كان الاشتراك منتهياً
  - عرض صفحة الانتهاء (SubscriptionExpiredPage)
- **الآليات**:
  - `debounce`: 1 ثانية
  - `cache`: 5 دقائق
  - `hasCheckedRef`: تتبع الفحوصات السابقة
- **تجاهل الفحص في**:
  - /subscription
  - /settings
- **الحالات المسموح بها**:
  - active (نشط)
  - trial (تجريبي)
  - pending (قيد الانتظار)

### src/components/subscription/SubscriptionExpiredPage.tsx (171 سطر)
**الدور**: صفحة عرض انتهاء الاشتراك
- **العناصر**:
  - رسالة رئيسية بالأحمر
  - معلومات الحساب
  - رسالة إرشادية
  - زر تجديد الاشتراك
  - زر الدورات التدريبية (إذا كان لديه وصول)
- **الوظيفة**: بديل الصفحة الرئيسية عند انتهاء الاشتراك

### src/components/subscription/SubscriptionStatus.tsx (197 سطر)
**الدور**: عرض حالة الاشتراك في مكان واحد
- **الحالات المعروضة**:
  - pending: في انتظار التفعيل
  - active: اشتراك نشط
  - trial: فترة تجريبية
  - expired: منتهي
  - no subscription: بدون اشتراك
- **التنبيهات**:
  - تحذير عند اقتراب الانتهاء (7 أيام أو أقل)

---

## 3. Hooks مخصصة

### src/hooks/useSubscriptionStatus.ts (157 سطر)
**الدور**: Hook لجلب حالة الاشتراك مع معلومات الطلبات
```typescript
interface SubscriptionStatus {
  hasActiveSubscription: boolean
  planName: string | null
  daysRemaining: number
  hasOrdersLimit: boolean
  currentOrders: number
  maxOrders: number | null
  remainingOrders: number | null
}
```
- **التحديث**: كل 5 دقائق
- **RPC المستدعاة**: 
  - `get_organization_subscription_details`
  - `check_online_orders_limit`

### src/hooks/useSubscriptionMonitor.ts (164 سطر)
**الدور**: Hook لمراقبة الاشتراك الدورية
- **الفحوصات**:
  - كل 5 دقائق
  - عند العودة للنافذة (visibility change)
- **الإجراءات عند التغيير**:
  - حذف كاش الصلاحيات
  - تحديث بيانات المؤسسة
  - إعادة تحميل الصفحة (إذا تحول لـ expired)
- **RPC المستدعاة**:
  - `monitor_and_fix_subscriptions`
  - `sync_organization_subscription_data`

### src/hooks/useUnifiedSubscription.ts (373 سطر)
**الدور**: Hook موحد لإدارة الاشتراك والطلبات
- **المميزات**:
  - API call واحد بدلاً من 3
  - polling واحد
  - cache موحد
- **البيانات المعادة**:
  ```typescript
  {
    hasActiveSubscription, planName, daysRemaining,
    hasOrdersLimit, currentOrders, maxOrders,
    isLoading, error, lastUpdated,
    refresh(), isExpiringSoon, isOrdersLimitNearMax
  }
  ```
- **الخيارات**:
  - `pollingInterval`: 5 دقائق افتراضياً
  - `enablePolling`: تفعيل التحديث
  - `refreshOnFocus`: تحديث عند العودة
  - `onSubscriptionChange`: callback

---

## 4. التخزين والمصادقة

### src/context/auth/utils/authStorage.ts (523 سطر)
**الدور**: أدوات التخزين المحلي لـ Auth
- **الدوال الرئيسية**:
  - `saveOfflineAuthSnapshot()` - حفظ لقطة للعمل بدون إنترنت
  - `loadOfflineAuthSnapshot()` - جلب اللقطة
  - `clearOfflineAuthSnapshot()` - مسح اللقطة
  - `saveAuthToStorage()` - حفظ بيانات المصادقة
  - `loadAuthFromStorage()` - جلب بيانات المصادقة
- **المفاتيح المستخدمة**:
  - `bazaar_offline_auth_snapshot_v1`
  - `bazaar_organization_id`
  - `bazaar_organization_name`
  - `bazaar_organization_data`

### src/context/auth/services/permissionsService.ts (122 سطر)
**الدور**: خدمة إدارة الصلاحيات
- **الفئة**: `PermissionsService`
- **الوظائف**:
  - `fetchUnified()` - جلب الصلاحيات الموحدة
  - `hasPermission()` - التحقق من صلاحية معينة
  - `hasAnyPermission()` - التحقق من أي صلاحية
  - `hasAllPermissions()` - التحقق من جميع الصلاحيات
- **الكاش**: 5 دقائق

---

## 5. دوال قاعدة البيانات (SQL)

### database/functions/check_organization_subscription.sql (287 سطر)
**الدور**: دالة فحص حالة الاشتراك المثالية
```sql
CREATE FUNCTION check_organization_subscription(org_id UUID) 
RETURNS JSON
```
- **الأولويات**:
  1. اشتراك نشط مدفوع
  2. اشتراك تجريبي نشط
  3. فترة تجريبية تقليدية (5 أيام من الإنشاء)
  4. منتهي الصلاحية
- **العودة**: JSON بهيكل موحد
- **الأداء**: محسنة مع جدول كاش

### supabase/functions/get_organization_subscription_details.sql (44 سطر)
**الدور**: جلب تفاصيل الاشتراك النشط
```sql
CREATE FUNCTION get_organization_subscription_details(org_id UUID) 
RETURNS JSON
```
- **الحقول المعادة**:
  - subscription_id, status, plan_name, plan_code
  - billing_cycle, start_date, end_date
  - days_remaining, amount_paid, currency
- **الشرط**: `status = 'active' AND end_date > NOW()`

---

## 6. التخزين الآمن (Electron)

### electron/secureStorage.cjs (375 سطر)
**الدور**: تخزين آمن للبيانات المحلية
- **الفئات**:
  - `SecureStorage`: مشفر للبيانات الحساسة
  - `SessionStorage`: مؤقت (يُحذف عند الإعادة)
  - `CacheStorage`: غير مشفر للبيانات العامة
- **الوظائف**:
  - `get(key, defaultValue)`
  - `set(key, value)`
  - `remove(key)`
  - `clear()`
  - `cleanExpired()`: تنظيف البيانات المنتهية
- **التشفير**: `'stockiha-secure-encryption-key-2024'`

---

## 7. صفحات الاشتراك

### src/pages/dashboard/subscription/index.tsx (150+ سطر)
**الدور**: صفحة إدارة الاشتراكات الرئيسية
- **الميزات**:
  - عرض الخطط المتاحة
  - عرض حالة الاشتراك الحالي
  - أزرار للتجديد والترقية
  - عرض طلبات الاشتراك
- **الـ Tabs**:
  1. خطط الاشتراك
  2. حالة الاشتراك
  3. طلبات الاشتراك
  4. تفعيل باستخدام الكود

---

## مخطط تدفق البيانات

```
┌─────────────────────────────────────────────┐
│         الوصول للصفحة (Page Load)           │
└────────────────┬────────────────────────────┘
                 │
                 v
        ┌────────────────┐
        │ SubscriptionCheck
        │ Component       │
        └────────┬───────┘
                 │
                 v
    ┌────────────────────────┐
    │ subscriptionCache      │
    │ .getSubscriptionStatus │
    └────────┬───────────────┘
             │
        ┌────┴────┐
        v         v
   ┌─────────┐  ┌────────────┐
   │ 4 مستويات│ │ RPC Call:  │
   │  كاش    │──┤ check_org_ │
   │(Session,│  │ subscription_
   │Memory,  │  │ enhanced   │
   │Storage) │  │            │
   └────┬────┘  └──────┬─────┘
        │               │
        v               v
    ┌─────────────────────┐
    │ SubscriptionData:   │
    │ status: 'active'    │
    │ days_left: 45       │
    │ plan_name: 'Pro'    │
    └────────┬────────────┘
             │
        ┌────┴────┐
        v         v
   ┌──────────┐ ┌──────────┐
   │ ALLOW    │ │ DENY &   │
   │ACCESS    │ │ REDIRECT │
   │          │ │ to /sub  │
   └──────────┘ └──────────┘
```

---

## معدلات التحديث

| الخدمة | الفترة | المصدر |
|-------|--------|--------|
| useSubscriptionStatus | 5 دقائق | Hook |
| useSubscriptionMonitor | 5 دقائق | Hook |
| useUnifiedSubscription | قابل للتعديل | Hook |
| SubscriptionCheck | مرة واحدة | Component |
| subscription_cache (localStorage) | 24 ساعة | Storage |
| subscription_cache (sessionStorage) | 30 دقيقة | Storage |
| memory cache | 24 ساعة | RAM |
| database cache | 24 ساعة (مع cleanup يومي) | DB |

---

## نقاط ضعف معروفة

1. **لا توجد grace period** - انقطاع فوري عند انتهاء الاشتراك
2. **العمل بدون إنترنت** - قد يسمح بالوصول بعد انتهاء الاشتراك
3. **الكاش الطويل** - قد لا يعكس التغييرات الفورية
4. **الفحص عند التحميل فقط** - لا يتحقق المكون بشكل دوري، فقط الـ Hook
5. **عدم وجود تحديث فوري** - يعتمد على polling 5 دقائق

