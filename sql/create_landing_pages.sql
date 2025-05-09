-- ملف إنشاء بنية صفحات الهبوط (Landing Pages)
-- متوافق تماماً مع قاعدة بيانات Bazaar الحالية

-- إنشاء جدول صفحات الهبوط
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  keywords TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (organization_id, slug)
);

-- إنشاء فهارس للجدول
CREATE INDEX IF NOT EXISTS landing_pages_organization_id_idx ON public.landing_pages(organization_id);
CREATE INDEX IF NOT EXISTS landing_pages_slug_idx ON public.landing_pages(slug);
CREATE INDEX IF NOT EXISTS landing_pages_is_published_idx ON public.landing_pages(is_published);

-- إنشاء جدول مكونات صفحات الهبوط
CREATE TABLE IF NOT EXISTS public.landing_page_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- نوع المكون (hero, form, text, image, features, testimonial, ...)
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهارس للجدول
CREATE INDEX IF NOT EXISTS landing_page_components_landing_page_id_idx ON public.landing_page_components(landing_page_id);
CREATE INDEX IF NOT EXISTS landing_page_components_type_idx ON public.landing_page_components(type);
CREATE INDEX IF NOT EXISTS landing_page_components_position_idx ON public.landing_page_components(position);

-- إنشاء جدول لحفظ بيانات النماذج المرسلة من صفحات الهبوط
CREATE TABLE IF NOT EXISTS public.landing_page_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.form_settings(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- إنشاء فهارس للجدول
CREATE INDEX IF NOT EXISTS landing_page_submissions_landing_page_id_idx ON public.landing_page_submissions(landing_page_id);
CREATE INDEX IF NOT EXISTS landing_page_submissions_form_id_idx ON public.landing_page_submissions(form_id);
CREATE INDEX IF NOT EXISTS landing_page_submissions_product_id_idx ON public.landing_page_submissions(product_id);
CREATE INDEX IF NOT EXISTS landing_page_submissions_created_at_idx ON public.landing_page_submissions(created_at);
CREATE INDEX IF NOT EXISTS landing_page_submissions_is_processed_idx ON public.landing_page_submissions(is_processed);

-- إضافة وظيفة لضمان ترتيب المكونات
CREATE OR REPLACE FUNCTION public.maintain_landing_page_components_order()
RETURNS TRIGGER AS $$
BEGIN
  -- عند إضافة مكون جديد، ضع ترتيبه في نهاية القائمة
  IF TG_OP = 'INSERT' THEN
    NEW.position = COALESCE(
      (SELECT MAX(position) + 1 FROM public.landing_page_components WHERE landing_page_id = NEW.landing_page_id),
      0
    );
  END IF;
  
  -- عند الحذف، أعد ترتيب المكونات لتجنب الفجوات
  IF TG_OP = 'DELETE' THEN
    UPDATE public.landing_page_components
    SET position = position - 1
    WHERE landing_page_id = OLD.landing_page_id
    AND position > OLD.position;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفزات على جدول مكونات صفحات الهبوط
DROP TRIGGER IF EXISTS landing_page_components_insert_trigger ON public.landing_page_components;
CREATE TRIGGER landing_page_components_insert_trigger
BEFORE INSERT ON public.landing_page_components
FOR EACH ROW
EXECUTE PROCEDURE public.maintain_landing_page_components_order();

DROP TRIGGER IF EXISTS landing_page_components_delete_trigger ON public.landing_page_components;
CREATE TRIGGER landing_page_components_delete_trigger
AFTER DELETE ON public.landing_page_components
FOR EACH ROW
EXECUTE PROCEDURE public.maintain_landing_page_components_order();

-- إضافة وظيفة لتحديث تاريخ التعديل عند تحديث السجلات
CREATE OR REPLACE FUNCTION public.update_landing_pages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفزات لتحديث تاريخ التعديل
DROP TRIGGER IF EXISTS landing_pages_update_timestamp ON public.landing_pages;
CREATE TRIGGER landing_pages_update_timestamp
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE PROCEDURE public.update_landing_pages_timestamp();

DROP TRIGGER IF EXISTS landing_page_components_update_timestamp ON public.landing_page_components;
CREATE TRIGGER landing_page_components_update_timestamp
BEFORE UPDATE ON public.landing_page_components
FOR EACH ROW
EXECUTE PROCEDURE public.update_landing_pages_timestamp();

DROP TRIGGER IF EXISTS landing_page_submissions_update_timestamp ON public.landing_page_submissions;
CREATE TRIGGER landing_page_submissions_update_timestamp
BEFORE UPDATE ON public.landing_page_submissions
FOR EACH ROW
EXECUTE PROCEDURE public.update_landing_pages_timestamp();

-- إضافة سياسات RLS للجداول
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_submissions ENABLE ROW LEVEL SECURITY;

-- سياسات قراءة صفحات الهبوط
DROP POLICY IF EXISTS "Organization members can view landing pages" ON public.landing_pages;
CREATE POLICY "Organization members can view landing pages"
  ON public.landing_pages
  FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND is_deleted = false
  );

-- سياسة للزوار لمشاهدة صفحات الهبوط المنشورة فقط
DROP POLICY IF EXISTS "Public users can view published landing pages" ON public.landing_pages;
CREATE POLICY "Public users can view published landing pages"
  ON public.landing_pages
  FOR SELECT
  USING (
    is_published = true
    AND is_deleted = false
  );

-- سياسات الإنشاء لصفحات الهبوط
DROP POLICY IF EXISTS "Organization admins can create landing pages" ON public.landing_pages;
CREATE POLICY "Organization admins can create landing pages"
  ON public.landing_pages
  FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_org_admin = true
    )
  );

-- سياسات التعديل لصفحات الهبوط
DROP POLICY IF EXISTS "Organization admins can update landing pages" ON public.landing_pages;
CREATE POLICY "Organization admins can update landing pages"
  ON public.landing_pages
  FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_org_admin = true
    )
    AND is_deleted = false
  );

-- سياسات حذف صفحات الهبوط (منطقياً عن طريق تحديث is_deleted)
DROP POLICY IF EXISTS "Organization admins can delete landing pages" ON public.landing_pages;
CREATE POLICY "Organization admins can delete landing pages"
  ON public.landing_pages
  FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND is_org_admin = true
    )
    AND is_deleted = false
  )
  WITH CHECK (is_deleted = true);

-- سياسات مكونات صفحات الهبوط
DROP POLICY IF EXISTS "Users can view landing page components" ON public.landing_page_components;
CREATE POLICY "Users can view landing page components"
  ON public.landing_page_components
  FOR SELECT
  USING (
    landing_page_id IN (
      SELECT id FROM public.landing_pages
      WHERE
        (is_published = true AND is_deleted = false)
        OR
        (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) AND is_deleted = false)
    )
  );

DROP POLICY IF EXISTS "Organization admins can manage landing page components" ON public.landing_page_components;
CREATE POLICY "Organization admins can manage landing page components"
  ON public.landing_page_components
  FOR ALL
  USING (
    landing_page_id IN (
      SELECT id FROM public.landing_pages
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_org_admin = true
      )
      AND is_deleted = false
    )
  );

-- سياسات النماذج المرسلة
DROP POLICY IF EXISTS "Organization members can view landing page submissions" ON public.landing_page_submissions;
CREATE POLICY "Organization members can view landing page submissions"
  ON public.landing_page_submissions
  FOR SELECT
  USING (
    landing_page_id IN (
      SELECT id FROM public.landing_pages
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Any user can insert landing page submissions" ON public.landing_page_submissions;
CREATE POLICY "Any user can insert landing page submissions"
  ON public.landing_page_submissions
  FOR INSERT
  WITH CHECK (
    landing_page_id IN (
      SELECT id FROM public.landing_pages
      WHERE is_published = true
    )
  );

DROP POLICY IF EXISTS "Organization admins can update landing page submissions" ON public.landing_page_submissions;
CREATE POLICY "Organization admins can update landing page submissions"
  ON public.landing_page_submissions
  FOR UPDATE
  USING (
    landing_page_id IN (
      SELECT id FROM public.landing_pages
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_org_admin = true
      )
    )
  );

-- وظائف API

-- الحصول على صفحة هبوط مع مكوناتها
CREATE OR REPLACE FUNCTION public.get_landing_page_with_components(
  p_slug VARCHAR,
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  name VARCHAR,
  slug VARCHAR,
  title VARCHAR,
  description TEXT,
  keywords TEXT,
  is_published BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  components JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page_id UUID;
  v_is_published BOOLEAN;
  v_organization_id UUID;
  v_user_org_id UUID;
BEGIN
  -- الحصول على معرف مؤسسة المستخدم الحالي إن وجد
  SELECT organization_id INTO v_user_org_id
  FROM public.users
  WHERE id = auth.uid();

  -- البحث عن صفحة الهبوط
  SELECT lp.id, lp.is_published, lp.organization_id
  INTO v_page_id, v_is_published, v_organization_id
  FROM public.landing_pages lp
  WHERE lp.slug = p_slug 
  AND (p_organization_id IS NULL OR lp.organization_id = p_organization_id)
  AND lp.is_deleted = false
  LIMIT 1;
  
  -- تحقق من الصلاحيات
  IF v_page_id IS NULL THEN
    RETURN;
  END IF;
  
  -- إذا لم تكن الصفحة منشورة، تحقق من أن المستخدم مرتبط بالمؤسسة
  IF NOT v_is_published AND (v_user_org_id IS NULL OR v_user_org_id != v_organization_id) THEN
    RETURN;
  END IF;
  
  -- استرجاع الصفحة مع المكونات
  RETURN QUERY
  SELECT 
    lp.id,
    lp.organization_id,
    lp.name,
    lp.slug,
    lp.title,
    lp.description,
    lp.keywords,
    lp.is_published,
    lp.created_at,
    lp.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', lpc.id,
            'type', lpc.type,
            'settings', lpc.settings,
            'isActive', lpc.is_active,
            'position', lpc.position
          ) ORDER BY lpc.position
        )
        FROM public.landing_page_components lpc
        WHERE lpc.landing_page_id = lp.id
        AND lpc.is_active = true
      ),
      '[]'::jsonb
    ) as components
  FROM public.landing_pages lp
  WHERE lp.id = v_page_id;
END;
$$;

-- إنشاء وظيفة لحفظ ترتيب المكونات
CREATE OR REPLACE FUNCTION public.update_landing_page_components_order(
  p_landing_page_id UUID,
  p_component_order JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_record RECORD;
  v_new_position INTEGER;
BEGIN
  -- التحقق من صلاحيات المستخدم
  SELECT u.organization_id, u.is_org_admin
  INTO v_user_org_id, v_is_admin
  FROM public.users u
  WHERE u.id = auth.uid();
  
  -- التحقق من وجود صفحة الهبوط وصلاحيات الوصول إليها
  SELECT organization_id INTO v_organization_id
  FROM public.landing_pages
  WHERE id = p_landing_page_id
  AND is_deleted = false;
  
  IF v_organization_id IS NULL OR v_user_org_id != v_organization_id OR v_is_admin IS NOT TRUE THEN
    RETURN false;
  END IF;
  
  -- تحديث ترتيب المكونات
  v_new_position := 0;
  FOR v_record IN 
    SELECT value->>'id' as component_id
    FROM jsonb_array_elements(p_component_order)
  LOOP
    UPDATE public.landing_page_components
    SET position = v_new_position
    WHERE id = v_record.component_id::UUID
    AND landing_page_id = p_landing_page_id;
    
    v_new_position := v_new_position + 1;
  END LOOP;
  
  RETURN true;
END;
$$;

-- إنشاء وظيفة لإنشاء صفحة هبوط جديدة
CREATE OR REPLACE FUNCTION public.create_landing_page(
  p_organization_id UUID,
  p_name VARCHAR,
  p_slug VARCHAR,
  p_title VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_keywords TEXT DEFAULT NULL,
  p_is_published BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_landing_page_id UUID;
BEGIN
  -- الحصول على معلومات المستخدم
  v_user_id := auth.uid();
  
  SELECT u.organization_id, u.is_org_admin
  INTO v_user_org_id, v_is_admin
  FROM public.users u
  WHERE u.id = v_user_id;
  
  -- التحقق من صلاحيات المستخدم
  IF v_user_org_id != p_organization_id OR v_is_admin IS NOT TRUE THEN
    RETURN NULL;
  END IF;
  
  -- التحقق من عدم وجود صفحة أخرى بنفس الرابط
  IF EXISTS (
    SELECT 1 FROM public.landing_pages
    WHERE organization_id = p_organization_id
    AND slug = p_slug
    AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'صفحة هبوط بنفس الرابط موجودة بالفعل';
  END IF;
  
  -- إنشاء صفحة هبوط جديدة
  INSERT INTO public.landing_pages (
    organization_id,
    name,
    slug,
    title,
    description,
    keywords,
    is_published,
    created_by
  ) VALUES (
    p_organization_id,
    p_name,
    p_slug,
    COALESCE(p_title, p_name),
    p_description,
    p_keywords,
    p_is_published,
    v_user_id
  )
  RETURNING id INTO v_landing_page_id;
  
  RETURN v_landing_page_id;
END;
$$;

-- إنشاء وظيفة لإضافة مكون إلى صفحة هبوط
CREATE OR REPLACE FUNCTION public.add_landing_page_component(
  p_landing_page_id UUID,
  p_type VARCHAR,
  p_settings JSONB DEFAULT '{}'::jsonb,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_organization_id UUID;
  v_component_id UUID;
BEGIN
  -- التحقق من صلاحيات المستخدم
  SELECT u.organization_id, u.is_org_admin
  INTO v_user_org_id, v_is_admin
  FROM public.users u
  WHERE u.id = auth.uid();
  
  -- التحقق من وجود صفحة الهبوط وصلاحيات الوصول إليها
  SELECT organization_id INTO v_organization_id
  FROM public.landing_pages
  WHERE id = p_landing_page_id
  AND is_deleted = false;
  
  IF v_organization_id IS NULL OR v_user_org_id != v_organization_id OR v_is_admin IS NOT TRUE THEN
    RETURN NULL;
  END IF;
  
  -- إضافة مكون جديد
  INSERT INTO public.landing_page_components (
    landing_page_id,
    type,
    settings,
    is_active
  ) VALUES (
    p_landing_page_id,
    p_type,
    p_settings,
    p_is_active
  )
  RETURNING id INTO v_component_id;
  
  RETURN v_component_id;
END;
$$;

-- إنشاء وظيفة لتحديث إعدادات مكون
CREATE OR REPLACE FUNCTION public.update_landing_page_component(
  p_component_id UUID,
  p_settings JSONB,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_landing_page_id UUID;
  v_organization_id UUID;
BEGIN
  -- التحقق من صلاحيات المستخدم
  SELECT u.organization_id, u.is_org_admin
  INTO v_user_org_id, v_is_admin
  FROM public.users u
  WHERE u.id = auth.uid();
  
  -- الحصول على معرف صفحة الهبوط والمؤسسة
  SELECT lpc.landing_page_id, lp.organization_id
  INTO v_landing_page_id, v_organization_id
  FROM public.landing_page_components lpc
  JOIN public.landing_pages lp ON lp.id = lpc.landing_page_id
  WHERE lpc.id = p_component_id
  AND lp.is_deleted = false;
  
  -- تحقق من أن المستخدم لديه صلاحية التعديل
  IF v_organization_id IS NULL OR v_user_org_id != v_organization_id OR v_is_admin IS NOT TRUE THEN
    RETURN false;
  END IF;
  
  -- تحديث المكون
  UPDATE public.landing_page_components
  SET 
    settings = p_settings,
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_component_id;
  
  RETURN true;
END;
$$;

-- إنشاء وظيفة للحصول على قائمة صفحات الهبوط للمؤسسة
CREATE OR REPLACE FUNCTION public.get_organization_landing_pages(
  p_organization_id UUID
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  title VARCHAR,
  is_published BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  components_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_org_id UUID;
BEGIN
  -- تحقق من أن المستخدم عضو في المؤسسة
  SELECT organization_id INTO v_user_org_id
  FROM public.users
  WHERE id = auth.uid();
  
  IF v_user_org_id != p_organization_id THEN
    RETURN;
  END IF;
  
  -- استرجاع الصفحات مع عدد المكونات
  RETURN QUERY
  SELECT 
    lp.id,
    lp.name,
    lp.slug,
    lp.title,
    lp.is_published,
    lp.created_at,
    lp.updated_at,
    COUNT(lpc.id) as components_count
  FROM public.landing_pages lp
  LEFT JOIN public.landing_page_components lpc ON lpc.landing_page_id = lp.id
  WHERE lp.organization_id = p_organization_id
  AND lp.is_deleted = false
  GROUP BY lp.id
  ORDER BY lp.updated_at DESC;
END;
$$;

-- وظيفة لإضافة نموذج إرسال من صفحة هبوط
CREATE OR REPLACE FUNCTION public.add_landing_page_submission(
  p_landing_page_id UUID,
  p_form_id UUID,
  p_product_id UUID,
  p_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission_id UUID;
  v_is_published BOOLEAN;
BEGIN
  -- تحقق من أن الصفحة منشورة
  SELECT is_published INTO v_is_published
  FROM public.landing_pages
  WHERE id = p_landing_page_id
  AND is_deleted = false;
  
  IF v_is_published IS NULL OR NOT v_is_published THEN
    RETURN NULL;
  END IF;
  
  -- إضافة إرسال جديد
  INSERT INTO public.landing_page_submissions (
    landing_page_id,
    form_id,
    product_id,
    data
  ) VALUES (
    p_landing_page_id,
    p_form_id,
    p_product_id,
    p_data
  )
  RETURNING id INTO v_submission_id;
  
  RETURN v_submission_id;
END;
$$;

-- إضافة تعليقات توضيحية على الجداول والحقول
COMMENT ON TABLE public.landing_pages IS 'صفحات الهبوط للمؤسسات في نظام بازار';
COMMENT ON TABLE public.landing_page_components IS 'مكونات صفحات الهبوط (قسم العرض، نموذج، صور، نصوص، وغيرها)';
COMMENT ON TABLE public.landing_page_submissions IS 'البيانات المرسلة من النماذج في صفحات الهبوط';

COMMENT ON COLUMN public.landing_pages.id IS 'المعرف الفريد للصفحة';
COMMENT ON COLUMN public.landing_pages.organization_id IS 'معرف المؤسسة المالكة للصفحة';
COMMENT ON COLUMN public.landing_pages.name IS 'اسم الصفحة للاستخدام الداخلي';
COMMENT ON COLUMN public.landing_pages.slug IS 'رابط الصفحة (URL)';
COMMENT ON COLUMN public.landing_pages.title IS 'عنوان الصفحة (SEO)';
COMMENT ON COLUMN public.landing_pages.description IS 'وصف الصفحة (SEO)';
COMMENT ON COLUMN public.landing_pages.keywords IS 'الكلمات المفتاحية (SEO)';
COMMENT ON COLUMN public.landing_pages.is_published IS 'حالة نشر الصفحة (منشورة أم لا)';
COMMENT ON COLUMN public.landing_pages.is_deleted IS 'تم حذف الصفحة (حذف منطقي)';

COMMENT ON COLUMN public.landing_page_components.type IS 'نوع المكون (hero, form, text, image, features, testimonial, ...)';
COMMENT ON COLUMN public.landing_page_components.settings IS 'إعدادات المكون بتنسيق JSON';
COMMENT ON COLUMN public.landing_page_components.position IS 'ترتيب المكون في الصفحة';
COMMENT ON COLUMN public.landing_page_components.is_active IS 'حالة تفعيل المكون';

COMMENT ON COLUMN public.landing_page_submissions.form_id IS 'معرف النموذج المستخدم';
COMMENT ON COLUMN public.landing_page_submissions.product_id IS 'معرف المنتج المرتبط بالإرسال';
COMMENT ON COLUMN public.landing_page_submissions.data IS 'بيانات الإرسال بتنسيق JSON';
COMMENT ON COLUMN public.landing_page_submissions.is_processed IS 'تمت معالجة الطلب'; 