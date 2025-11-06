# مسارات الملفات الكاملة لنظام الاشتراك

## المسارات المطلقة لجميع الملفات ذات الصلة

### 1. ملفات الخدمات الأساسية

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/lib/subscription-cache.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/lib/subscription-service.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/lib/PermissionsCache.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/lib/activation-service.ts
```

### 2. مكونات React

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/components/subscription/SubscriptionCheck.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/components/subscription/SubscriptionExpiredPage.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/components/subscription/SubscriptionStatus.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/components/subscription/SubscriptionDialog.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/components/subscription/SubscriptionDataRefresher.tsx
```

### 3. Custom Hooks

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/hooks/useSubscriptionStatus.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/hooks/useSubscriptionMonitor.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/hooks/useUnifiedSubscription.ts
```

### 4. التخزين والمصادقة

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/context/auth/utils/authStorage.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/context/auth/utils/secureSessionStorage.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/context/auth/services/permissionsService.ts
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/context/auth/services/userDataManager.ts
```

### 5. صفحات الاشتراك

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/pages/dashboard/subscription/index.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/pages/dashboard/subscription/ActivateWithCode.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/pages/dashboard/subscription/SubscriptionOrders.tsx
```

### 6. قاعدة البيانات (SQL)

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/database/functions/check_organization_subscription.sql
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/supabase/functions/get_organization_subscription_details.sql
```

### 7. Electron Storage

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/electron/secureStorage.cjs
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/electron/preload.cjs
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/electron/updater.cjs
```

### 8. Context و Providers

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/context/tenant/TenantContext.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/context/PermissionsContext.tsx
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/src/context/auth/index.ts
```

### 9. التقارير المنشأة

```
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/SUBSCRIPTION_SYSTEM_ANALYSIS.md
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/SUBSCRIPTION_KEY_FILES.md
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/SUBSCRIPTION_SYSTEM_EXECUTIVE_SUMMARY.md
/Users/gherbitravel/Downloads/bazaar-console-connect-main copy 2/SUBSCRIPTION_ANALYSIS_FILE_PATHS.md
```

---

## البحث عن الملفات

### للعثور على ملفات الاشتراك:
```bash
grep -r "subscription" src --include="*.tsx" --include="*.ts" | head -50
grep -r "subscription_cache" src --include="*.tsx" --include="*.ts"
```

### للعثور على ملفات التخزين:
```bash
grep -r "localStorage\|sessionStorage" src --include="*.tsx" --include="*.ts"
grep -r "authStorage" src --include="*.tsx" --include="*.ts"
```

### للعثور على ملفات الصلاحيات:
```bash
grep -r "permission" src --include="*.tsx" --include="*.ts"
grep -r "clearPermissionsCache" src --include="*.tsx" --include="*.ts"
```

---

## الفئات المهمة والواجهات

### SubscriptionData
```typescript
{
  success: boolean
  status: 'active' | 'trial' | 'expired' | 'canceled' | 'error' | 'not_found' | 'pending'
  subscription_type: 'paid' | 'trial_subscription' | 'organization_trial' | 'none'
  subscription_id: string | null
  plan_name: string
  plan_code: string
  start_date: string | null
  end_date: string | null
  days_left: number
  features: string[]
  limits: { max_pos, max_users, max_products }
  billing_cycle?: string
  amount_paid?: number
  currency?: string
  trial_period_days?: number
  message: string
  error?: string
}
```

### OfflineAuthSnapshot
```typescript
{
  user: Partial<SupabaseUser> | null
  sessionMeta: { expiresAt: number | null, storedAt: number } | null
  organizationId?: string | null
  lastUpdatedAt: number
}
```

### SubscriptionStatus (من Hook)
```typescript
{
  hasActiveSubscription: boolean
  planName: string | null
  planCode: string | null
  daysRemaining: number
  subscriptionStatus: 'active' | 'trial' | 'expired' | null
  hasOrdersLimit: boolean
  currentOrders: number
  maxOrders: number | null
  remainingOrders: number | null
  isLoading: boolean
  error: string | null
}
```

---

## مفاتيح localStorage/sessionStorage

### الاشتراك:
- `subscription_cache_${organizationId}` (localStorage, 24ساعة)
- `subscription_cache_${organizationId}` (sessionStorage, 30 دقيقة)

### المصادقة:
- `bazaar_offline_auth_snapshot_v1` (localStorage)
- `bazaar_auth_state` (localStorage)
- `bazaar_organization_id` (localStorage)
- `bazaar_organization_name` (localStorage)
- `bazaar_organization_data` (localStorage/sessionStorage)

### الجلسة:
- `auth_user_id` (sessionStorage)
- `session_cache` (sessionStorage)
- `last_login_redirect` (sessionStorage)

---

## RPC Functions (Supabase)

```
check_organization_subscription_enhanced(org_id)
get_organization_subscription_details(org_id)
get_organization_subscription_cached(org_id)
monitor_and_fix_subscriptions()
sync_organization_subscription_data()
check_online_orders_limit(p_organization_id)
get_unified_subscription_data(p_organization_id)
activate_subscription_with_code(org_id, code)
get_user_with_permissions_unified(...)
```

---

## معدلات التحديث المحددة

| الخدمة | الفترة | الملف |
|-------|--------|-------|
| useSubscriptionStatus | 5 دقائق | src/hooks/useSubscriptionStatus.ts |
| useSubscriptionMonitor | 5 دقائق | src/hooks/useSubscriptionMonitor.ts |
| useUnifiedSubscription | قابل | src/hooks/useUnifiedSubscription.ts |
| SubscriptionCheck | مرة | src/components/subscription/SubscriptionCheck.tsx |
| localStorage cache | 24 ساعة | src/lib/subscription-cache.ts |
| sessionStorage cache | 30 دقيقة | src/lib/subscription-cache.ts |
| memory cache | 24 ساعة | src/lib/subscription-cache.ts |
| database cache | 24 ساعة + cleanup يومي | database/functions/check_organization_subscription.sql |

---

## نقاط الوصول الرئيسية (Entry Points)

1. **صفحة الاشتراك**: `/dashboard/subscription`
   - الملف: `src/pages/dashboard/subscription/index.tsx`

2. **صفحة انتهاء الاشتراك**: يتم العرض عند الانتهاء
   - الملف: `src/components/subscription/SubscriptionExpiredPage.tsx`

3. **نقطة الحراسة**: تُستخدم في جميع الصفحات المحمية
   - الملف: `src/components/subscription/SubscriptionCheck.tsx`

4. **المراقبة الدورية**: تعمل في الخلفية
   - الملف: `src/hooks/useSubscriptionMonitor.ts`

---

## خريطة التدفق

```
User visits page
    ↓
LazyRoutes / ConditionalProviders
    ↓
SubscriptionCheck Component
    ↓
subscriptionCache.getSubscriptionStatus()
    ↓
Check 4 layers (sessionStorage → memory → localStorage → RPC)
    ↓
Return SubscriptionData
    ↓
Check if active/trial/expired
    ↓
Allow/Deny access
    ↓
Show appropriate component or page
```

---

## الملفات المرتبطة الأخرى

### للتحديثات:
- `electron/updater.cjs`
- `src/components/desktop/UpdateButton.tsx`

### للإذونات:
- `src/lib/PermissionsCache.ts`
- `src/context/auth/services/permissionsService.ts`
- `src/context/PermissionsContext.tsx`

### للطلبات عبر الإنترنت:
- `src/pages/dashboard/subscription/SubscriptionOrders.tsx`
- حد الطلبات المحقق عبر RPC `check_online_orders_limit`

### لتفعيل الاشتراك:
- `src/lib/activation-service.ts`
- `src/pages/dashboard/subscription/ActivateWithCode.tsx`
- `src/pages/client/activate-subscription/index.tsx`

---

**آخر تحديث**: 2025-11-04
**الحالة**: شامل
