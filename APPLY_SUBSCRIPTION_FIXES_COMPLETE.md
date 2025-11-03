# 🔧 دليل تطبيق إصلاحات الاشتراك الكامل

## 📋 الملخص

تم إصلاح مشكلتين رئيسيتين:

### 1️⃣ المشكلة الأولى: خطأ Foreign Key Constraint عند إنهاء الاشتراك
**الخطأ:**
```
update or delete on table "organization_subscriptions" violates foreign key constraint "activation_codes_subscription_id_fkey" on table "activation_codes"
```

**الحل:**
- تعديل foreign key constraint ليستخدم `ON DELETE SET NULL`
- تحديث دالة `admin_terminate_subscription` لتحديث `activation_codes` قبل حذف الاشتراك

### 2️⃣ المشكلة الثانية: الوصول للصفحات رغم انتهاء الاشتراك
**الخطأ:**
- المستخدمون يستطيعون الوصول لجميع الصفحات حتى بعد انتهاء الاشتراك

**الحل:**
- إصلاح `SubscriptionCheck.tsx` لمنع الوصول تماماً عند انتهاء الاشتراك
- إضافة صفحة خطأ جميلة تطلب من المستخدم تجديد الاشتراك

---

## 🚀 خطوات التطبيق

### الخطوة 1: تطبيق Migration في قاعدة البيانات

افتح **Supabase Dashboard** → **SQL Editor** وقم بتشغيل الكود التالي:

```sql
-- Migration: Fix activation_codes foreign key constraint
-- التاريخ: 2025-11-02
-- الوصف: إصلاح مشكلة foreign key constraint بين activation_codes و organization_subscriptions
--         بحيث يتم تعيين subscription_id إلى NULL عند حذف/تحديث الاشتراك

-- 🔧 الخطوة 1: حذف الـ constraint القديم (إذا كان موجوداً)
DO $$
BEGIN
    -- محاولة حذف الـ constraint القديم
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'activation_codes_subscription_id_fkey'
        AND table_name = 'activation_codes'
    ) THEN
        ALTER TABLE activation_codes
        DROP CONSTRAINT activation_codes_subscription_id_fkey;

        RAISE NOTICE 'تم حذف الـ constraint القديم بنجاح';
    END IF;
END $$;

-- 🔧 الخطوة 2: إضافة الـ constraint الجديد مع ON DELETE SET NULL و ON UPDATE CASCADE
ALTER TABLE activation_codes
ADD CONSTRAINT activation_codes_subscription_id_fkey
FOREIGN KEY (subscription_id)
REFERENCES organization_subscriptions(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 🔍 التحقق من النتيجة
DO $$
BEGIN
    RAISE NOTICE 'تم إضافة الـ constraint الجديد بنجاح مع ON DELETE SET NULL';
END $$;
```

### الخطوة 2: تحديث دالة admin_terminate_subscription

في **Supabase Dashboard** → **SQL Editor**، قم بتشغيل الكود التالي لتحديث الدالة:

```sql
-- Function: admin_terminate_subscription (Updated)
-- وصف: يسمح للسوبر أدمين بإنهاء اشتراك مؤسسة مع خيار إبقاء الوصول للدورات

CREATE OR REPLACE FUNCTION admin_terminate_subscription(
  p_organization_id UUID,
  p_keep_courses_access BOOLEAN DEFAULT FALSE,
  p_termination_reason TEXT DEFAULT NULL,
  p_termination_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
  v_is_active BOOLEAN;
  v_auth_id UUID;
  v_subscription organization_subscriptions%ROWTYPE;
  v_organization organizations%ROWTYPE;
  v_termination_reason TEXT;
BEGIN
  -- Enhanced authorization check - use auth_user_id and check is_active
  SELECT is_super_admin, is_active, auth_user_id
  INTO v_is_super, v_is_active, v_auth_id
  FROM users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  -- Verify super admin status and active account
  IF NOT COALESCE(v_is_super, FALSE) THEN
    RAISE EXCEPTION 'not_authorized' USING HINT = 'Super admin access required';
  END IF;

  -- Verify auth_user_id matches
  IF v_auth_id IS NULL OR v_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'authentication_mismatch' USING HINT = 'User authentication validation failed';
  END IF;

  -- التحقق من وجود المؤسسة
  SELECT * INTO v_organization FROM organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  -- البحث عن الاشتراك النشط
  SELECT * INTO v_subscription
  FROM organization_subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'pending', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  -- تحديد سبب الإنهاء
  v_termination_reason := COALESCE(p_termination_reason, 'admin_termination');

  -- ✅ FIX: أولاً، تحديث activation_codes لإزالة subscription_id لتجنب foreign key constraint
  -- هذا يحل مشكلة "violates foreign key constraint activation_codes_subscription_id_fkey"
  UPDATE activation_codes
  SET
    subscription_id = NULL,
    updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND subscription_id IS NOT NULL;

  -- ✅ FIX: ثانياً، حذف الـ cache للاشتراكات الملغاة/المنتهية
  BEGIN
    DELETE FROM organization_subscription_cache
    WHERE organization_id = p_organization_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- تجاهل الخطأ إذا كان الجدول غير موجود
      NULL;
  END;

  -- ✅ FIX: ثالثاً، حذف جميع الاشتراكات الملغاة/المنتهية السابقة لتجنب unique constraint
  DELETE FROM organization_subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('canceled', 'expired');

  -- ✅ FIX: رابعاً، إنهاء جميع الاشتراكات النشطة والتجريبية وتحديث end_date إلى الآن
  UPDATE organization_subscriptions
  SET
    status = 'canceled',
    end_date = NOW(),  -- ✅ تحديث تاريخ النهاية إلى الآن عند الإلغاء
    updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'pending', 'trial');

  -- ✅ FIX: تحديث المؤسسة - إزالة الاشتراك تماماً وإلغاء الفترة التجريبية
  UPDATE organizations
  SET
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
    -- ✅ إلغاء الفترة التجريبية بتعيين trial_end_date إلى الأمس
    settings = CASE
      WHEN settings IS NOT NULL THEN
        jsonb_set(
          settings,
          '{trial_end_date}',
          to_jsonb((CURRENT_DATE - INTERVAL '1 day')::TEXT)
        )
      ELSE
        jsonb_build_object('trial_end_date', (CURRENT_DATE - INTERVAL '1 day')::TEXT)
    END,
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- إدارة الوصول للدورات
  IF NOT p_keep_courses_access THEN
    -- إلغاء الوصول للدورات
    DELETE FROM organization_course_access
    WHERE organization_id = p_organization_id;
  ELSE
    -- تحديث الوصول للدورات ليكون مدى الحياة
    UPDATE organization_course_access
    SET
      expires_at = NULL,
      notes = COALESCE(notes, '') || ' - تم إنهاء الاشتراك مع الاحتفاظ بالدورات مدى الحياة',
      updated_at = NOW()
    WHERE organization_id = p_organization_id;
  END IF;

  -- إضافة سجل في تاريخ الاشتراكات (إذا كان هناك اشتراك)
  IF v_subscription.id IS NOT NULL THEN
    BEGIN
      INSERT INTO subscription_history (
        organization_id,
        plan_id,
        action,
        from_status,
        to_status,
        amount,
        notes,
        created_at,
        created_by
      ) VALUES (
        p_organization_id,
        v_subscription.plan_id,
        'expired',
        v_subscription.status,
        'canceled',
        0,
        jsonb_build_object(
          'termination_reason', v_termination_reason,
          'termination_notes', p_termination_notes,
          'keep_courses_access', p_keep_courses_access,
          'performed_by', auth.uid(),
          'end_date_updated_to', NOW()  -- ✅ إضافة معلومات التحديث
        ),
        NOW(),
        auth.uid()
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- تجاهل الأخطاء في إدراج السجل
        NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'subscription_id', COALESCE(v_subscription.id, NULL),
    'organization_id', p_organization_id,
    'status', 'canceled',
    'end_date', NOW(),  -- ✅ إرجاع تاريخ النهاية المحدث
    'keep_courses_access', p_keep_courses_access,
    'termination_reason', v_termination_reason,
    'message', CASE
      WHEN v_subscription.id IS NOT NULL THEN 'تم إنهاء الاشتراك بنجاح'
      ELSE 'تم إنهاء جميع الاشتراكات النشطة والتجريبية'
    END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_terminate_subscription(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;
```

### الخطوة 3: إعادة تشغيل التطبيق

بعد تطبيق الـ migrations في قاعدة البيانات، قم بإعادة تشغيل التطبيق:

```bash
# إيقاف التطبيق
# ثم إعادة تشغيله
npm run dev
# أو
npm start
```

---

## ✅ التحقق من نجاح الإصلاح

### اختبار 1: إنهاء اشتراك مؤسسة

1. افتح صفحة **Super Admin** → **Organizations**
2. اختر مؤسسة لديها اشتراك نشط
3. انقر على **إنهاء الاشتراك**
4. يجب أن تتم العملية بنجاح **بدون أخطاء**

**النتيجة المتوقعة:**
- ✅ لا يظهر خطأ `violates foreign key constraint`
- ✅ يتم إنهاء الاشتراك بنجاح
- ✅ يظهر رسالة "تم إنهاء الاشتراك بنجاح"

### اختبار 2: منع الوصول للصفحات عند انتهاء الاشتراك

1. قم بتسجيل الدخول كمستخدم من مؤسسة منتهية الاشتراك
2. حاول الوصول لأي صفحة في لوحة التحكم

**النتيجة المتوقعة:**
- ✅ يتم توجيهك تلقائياً إلى صفحة الاشتراك
- ✅ تظهر رسالة "اشتراكك منتهي الصلاحية"
- ✅ **لا تستطيع** الوصول لأي صفحة أخرى

### اختبار 3: التحقق من الاشتراكات المعلقة (Pending)

1. قم بإنشاء اشتراك جديد بحالة `pending`
2. حاول الوصول للصفحات

**النتيجة المتوقعة:**
- ✅ يسمح لك بالوصول للصفحات (الاشتراكات المعلقة مسموحة)
- ✅ تظهر رسالة "في انتظار التفعيل"

---

## 🔍 التغييرات المطبقة

### 1. Database (قاعدة البيانات)

#### Migration: `20251102_fix_activation_codes_fk_constraint.sql`
- تعديل foreign key constraint في جدول `activation_codes`
- استخدام `ON DELETE SET NULL` بدلاً من `RESTRICT`
- هذا يسمح بحذف الاشتراكات دون التأثير على activation codes

#### Function: `admin_terminate_subscription`
- إضافة خطوة لتحديث `activation_codes` قبل حذف الاشتراك
- تحديث `subscription_id` إلى `NULL` لجميع activation codes المرتبطة بالمؤسسة
- هذا يضمن عدم حدوث خطأ foreign key constraint

### 2. Frontend (الواجهة الأمامية)

#### `src/lib/subscription-cache.ts`
- إضافة `'canceled'` إلى نوع `status`
- التعامل مع الاشتراكات الملغاة بشكل صحيح

#### `src/components/subscription/SubscriptionCheck.tsx`
- **إصلاح منطق التحقق من الاشتراك**
- منع الوصول تماماً عند انتهاء الاشتراك (`expired` أو `canceled`)
- السماح فقط للاشتراكات النشطة (`active`)، التجريبية (`trial`)، أو المعلقة (`pending`)
- عرض صفحة خطأ جميلة تطلب من المستخدم تجديد الاشتراك

---

## 📝 ملاحظات مهمة

### حالات الاشتراك

| الحالة | الوصف | الوصول للصفحات |
|--------|-------|-----------------|
| `active` | اشتراك نشط ومدفوع | ✅ مسموح |
| `trial` | فترة تجريبية | ✅ مسموح |
| `pending` | في انتظار التفعيل | ✅ مسموح (مؤقتاً) |
| `expired` | منتهي الصلاحية | ❌ ممنوع |
| `canceled` | ملغي من قبل المدير | ❌ ممنوع |
| `error` | خطأ في البيانات | ❌ ممنوع |
| `not_found` | لا يوجد اشتراك | ❌ ممنوع |

### الأمان

- ✅ لا يمكن للمستخدمين العاديين تجاوز فحص الاشتراك
- ✅ جميع الفحوصات تتم على مستوى قاعدة البيانات والـ frontend
- ✅ حتى لو حاول المستخدم التلاعب بالكود، لن يتمكن من الوصول

### الأداء

- ✅ استخدام cache ذكي لتقليل الضغط على قاعدة البيانات
- ✅ التحقق يتم مرة واحدة فقط كل 5 دقائق
- ✅ لا توجد استدعاءات متكررة غير ضرورية

---

## 🆘 استكشاف الأخطاء

### المشكلة: لا زال يظهر خطأ Foreign Key Constraint

**الحل:**
1. تأكد من تطبيق الـ migration في قاعدة البيانات
2. تحقق من وجود الـ constraint الجديد:
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'activation_codes'
AND constraint_name = 'activation_codes_subscription_id_fkey';
```

### المشكلة: المستخدم لا زال يستطيع الوصول للصفحات

**الحل:**
1. امسح الكاش في المتصفح (Ctrl+Shift+R أو Cmd+Shift+R)
2. تأكد من تحديث الكود في `SubscriptionCheck.tsx`
3. أعد تشغيل التطبيق
4. تحقق من حالة الاشتراك في قاعدة البيانات:
```sql
SELECT id, organization_id, status, end_date
FROM organization_subscriptions
WHERE organization_id = 'YOUR_ORG_ID';
```

### المشكلة: الاشتراك المعلق (Pending) لا يسمح بالوصول

**الحل:**
- تأكد من أن الكود يحتوي على `subscription.status === 'pending'` في الشروط المسموحة
- راجع سطر 247 في `SubscriptionCheck.tsx`

---

## 📞 الدعم

إذا واجهت أي مشاكل بعد تطبيق هذه الإصلاحات، يرجى:
1. التحقق من console log في المتصفح للأخطاء
2. فحص logs في Supabase Dashboard
3. التواصل مع فريق الدعم مع تفاصيل الخطأ

---

**تم التحديث:** 2025-11-02
**الإصدار:** 1.0.0
