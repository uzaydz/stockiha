-- الخطوة 1: التحقق من وجود organization_id مكرر في organization_settings
-- قم بتشغيل هذا الاستعلام أولاً لمراجعة أي تكرارات محتملة.
-- إذا وجدت تكرارات، يجب عليك حلها يدويًا قبل المتابعة.
SELECT organization_id, COUNT(*)
FROM public.organization_settings
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- الخطوة 2: إضافة قيد فريد إلى organization_settings.organization_id
-- قم بتشغيل هذا فقط بعد التأكد من عدم وجود تكرارات من الخطوة 1.
ALTER TABLE public.organization_settings
ADD CONSTRAINT organization_settings_organization_id_unique UNIQUE (organization_id);

-- الخطوة 3: إزالة سياسات RLS القديمة وغير الآمنة على جدول users
-- تأكد من مراجعة هذه الأوامر قبل تشغيلها.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; -- تأكد من تفعيل RLS أولاً

DROP POLICY IF EXISTS users_select ON public.users;
DROP POLICY IF EXISTS users_insert ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;
DROP POLICY IF EXISTS users_delete ON public.users;

-- الخطوة 4: إضافة سياسات RLS جديدة وأكثر أمانًا لجدول users

-- السياسة 1: السماح للمستخدم بقراءة بياناته الخاصة
CREATE POLICY "Allow user to read own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- السياسة 2: السماح لمسؤول المؤسسة بقراءة بيانات المستخدمين في مؤسسته
-- ملاحظة: يفترض هذا أن لديك طريقة موثوقة لتحديد is_org_admin للمستخدم الذي يقوم بالاستعلام.
CREATE POLICY "Allow org admin to read users in their org"
ON public.users FOR SELECT
USING (
    (SELECT organization_id FROM public.users WHERE id = auth.uid()) = organization_id
    AND
    (SELECT is_org_admin FROM public.users WHERE id = auth.uid()) = true
);

-- السياسة 3: السماح للمسؤول العام (super admin) بقراءة جميع المستخدمين (إذا كان لديك هذا المفهوم)
-- CREATE POLICY "Allow super admin to read all users"
-- ON public.users FOR SELECT
-- USING (
--   (SELECT is_super_admin FROM public.users WHERE id = auth.uid()) = true
-- );

-- السياسة 4: السماح للمستخدم بتحديث بياناته الخاصة (باستثناء الأعمدة الحساسة مثل الدور أو المعرف)
-- قد تحتاج إلى تحديد الأعمدة المسموح بتحديثها بشكل أكثر دقة.
CREATE POLICY "Allow user to update own data"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); -- Ensure user doesn't change the ID to someone else's

-- السياسة 5: السماح لمسؤول المؤسسة بتحديث بيانات المستخدمين في مؤسسته (كن حذرًا هنا)
-- يجب تحديد الأعمدة التي يمكن للمسؤول تحديثها.
-- CREATE POLICY "Allow org admin to update users in their org"
-- ON public.users FOR UPDATE
-- USING (
--     (SELECT organization_id FROM public.users WHERE id = auth.uid()) = organization_id
--     AND
--     (SELECT is_org_admin FROM public.users WHERE id = auth.uid()) = true
-- )
-- WITH CHECK (
--     (SELECT organization_id FROM public.users WHERE id = auth.uid()) = organization_id
-- );

-- السياسة 6: تقييد الإدراج (INSERT). من الأفضل أن يتم الإدراج فقط من خلال دوال آمنة (SECURITY DEFINER).
-- بشكل افتراضي، لن يكون هناك سياسة INSERT، مما يمنع الإدراج المباشر ما لم يتم منح إذن صريح.
-- إذا كنت بحاجة للسماح بالإدراج المباشر في حالات معينة، يمكنك إضافة سياسة INSERT هنا.
-- مثال: السماح لأي مستخدم مصادق عليه بالإدراج (ربما ليس آمنًا، استخدم الدوال بدلاً من ذلك):
-- CREATE POLICY "Allow authenticated users to insert"
-- ON public.users FOR INSERT
-- TO authenticated
-- WITH CHECK (true);

-- السياسة 7: تقييد الحذف (DELETE). السماح فقط للمستخدم بحذف حسابه الخاص، أو للمسؤولين بحذف مستخدمين آخرين (كن حذرًا).
-- السماح للمستخدم بحذف حسابه الخاص
CREATE POLICY "Allow user to delete own account"
ON public.users FOR DELETE
USING (auth.uid() = id);

-- (اختياري) السماح لمسؤول المؤسسة بحذف المستخدمين في مؤسسته (تأكد من أن هذا هو السلوك المطلوب)
-- CREATE POLICY "Allow org admin to delete users in their org"
-- ON public.users FOR DELETE
-- USING (
--     (SELECT organization_id FROM public.users WHERE id = auth.uid()) = organization_id
--     AND
--     (SELECT is_org_admin FROM public.users WHERE id = auth.uid()) = true
--     AND
--     auth.uid() != id -- لا تسمح للمسؤول بحذف نفسه بهذه السياسة
-- );

-- ملاحظة هامة:
-- 1. راجع السياسات المقترحة أعلاه بعناية وقم بتعديلها لتناسب منطق الصلاحيات الدقيق لتطبيقك.
-- 2. السياسات المتعلقة بـ is_org_admin و is_super_admin تفترض أن هذه الأعمدة محدثة بشكل صحيح وموثوق.
-- 3. قد تحتاج إلى سياسات إضافية أو مختلفة بناءً على متطلباتك.
-- 4. من الأفضل دائمًا التعامل مع عمليات الإنشاء والتعديل الحساسة (مثل تعيين الأدوار) من خلال دوال PostgreSQL مع `SECURITY DEFINER`. 