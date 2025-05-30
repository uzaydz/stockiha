-- إضافة عمود للسماح بالدخول من النطاق العام في جدول user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS allow_public_domain_login BOOLEAN DEFAULT TRUE;

-- إضافة عمود للسماح بالدخول من النطاق العام في جدول المؤسسات
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS allow_public_domain_login BOOLEAN DEFAULT TRUE;

-- إضافة عمود متابع للقيمة القديمة للسماح بالمقارنة
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS previous_public_domain_setting BOOLEAN DEFAULT TRUE;

-- إنشاء إعداد للتحكم الشامل في خاصية الدخول من النطاق العام
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'global_settings') THEN
    CREATE TABLE public.global_settings (
      id SERIAL PRIMARY KEY,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value JSONB NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id),
      updated_by UUID REFERENCES auth.users(id)
    );
    
    -- إنشاء سياسة الأمان للجدول الجديد
    ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admin users can read global settings"
      ON public.global_settings FOR SELECT
      USING (
        auth.uid() IN (
          SELECT id FROM users WHERE role = 'admin' OR is_super_admin = TRUE
        )
      );
      
    CREATE POLICY "Only super admins can modify global settings"
      ON public.global_settings FOR ALL
      USING (
        auth.uid() IN (
          SELECT id FROM users WHERE is_super_admin = TRUE
        )
      );
  END IF;
END $$;

-- إضافة الإعداد العام للسماح بالدخول من النطاق العام
INSERT INTO public.global_settings (setting_key, setting_value, description)
VALUES (
  'allow_public_domain_login', 
  '{"enabled": true, "exceptions": [], "last_modified": "' || NOW()::TEXT || '"}', 
  'السماح للمستخدمين بالدخول من النطاق العام، بغض النظر عن مؤسساتهم'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = jsonb_set(public.global_settings.setting_value, '{last_modified}', '"' || NOW()::TEXT || '"'),
  updated_at = NOW();

-- إنشاء دالة مساعدة للتحقق من حالة السماح بالدخول من النطاق العام
CREATE OR REPLACE FUNCTION check_public_domain_login_allowed(
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_global_setting JSONB;
  v_user_setting BOOLEAN;
  v_org_setting BOOLEAN;
  v_organization_id UUID;
BEGIN
  -- 1. تحقق من الإعداد العام أولاً
  SELECT setting_value INTO v_global_setting
  FROM global_settings
  WHERE setting_key = 'allow_public_domain_login';
  
  IF v_global_setting IS NULL OR NOT (v_global_setting->>'enabled')::BOOLEAN THEN
    RETURN FALSE;
  END IF;
  
  -- 2. إذا لم يتم تحديد معرف المستخدم، نعتمد على الإعداد العام فقط
  IF p_user_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- 3. تحقق من إعداد المستخدم
  SELECT allow_public_domain_login, u.organization_id
  INTO v_user_setting, v_organization_id
  FROM user_settings us
  JOIN users u ON us.user_id = u.id
  WHERE us.user_id = p_user_id;
  
  -- 4. تحقق من إعداد المؤسسة إذا كان المستخدم ينتمي لمؤسسة
  IF v_organization_id IS NOT NULL THEN
    SELECT allow_public_domain_login INTO v_org_setting
    FROM organizations
    WHERE id = v_organization_id;
    
    -- إعداد المؤسسة له الأولوية على إعداد المستخدم
    IF v_org_setting IS NOT NULL THEN
      RETURN v_org_setting;
    END IF;
  END IF;
  
  -- 5. إعداد المستخدم إذا كان موجوداً
  IF v_user_setting IS NOT NULL THEN
    RETURN v_user_setting;
  END IF;
  
  -- 6. العودة إلى الإعداد العام
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION check_public_domain_login_allowed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_public_domain_login_allowed(UUID) TO anon;

-- تحديث دالة check_user_requires_2fa لتستخدم الدالة المساعدة الجديدة
CREATE OR REPLACE FUNCTION check_user_requires_2fa(
    p_user_email TEXT,
    p_organization_id UUID DEFAULT NULL,
    p_domain TEXT DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_record RECORD;
    v_organization_record RECORD;
    v_domain_org_id UUID;
    v_result JSONB;
    v_allow_public_domain BOOLEAN;
BEGIN
    -- البحث عن المستخدم بالإيميل
    SELECT 
        u.id,
        u.email,
        u.name,
        u.first_name,
        u.last_name,
        u.organization_id,
        u.two_factor_enabled,
        COALESCE(uss.two_factor_enabled, false) as security_2fa_enabled
    INTO v_user_record
    FROM users u
    LEFT JOIN user_security_settings uss ON u.id = uss.user_id
    WHERE LOWER(u.email) = LOWER(p_user_email)
    LIMIT 1;
    
    -- إذا لم يتم العثور على المستخدم
    IF v_user_record IS NULL THEN
        RETURN jsonb_build_object(
            'user_exists', false,
            'user_id', NULL,
            'user_name', NULL,
            'requires_2fa', false,
            'organization_id', NULL,
            'error', 'المستخدم غير موجود'
        );
    END IF;
    
    -- التحقق من إعداد السماح بالدخول من النطاق العام
    SELECT check_public_domain_login_allowed(v_user_record.id) INTO v_allow_public_domain;
    
    -- الحصول على معرف المؤسسة من النطاق إذا لم يتم تمريره
    IF p_organization_id IS NULL AND (p_domain IS NOT NULL OR p_subdomain IS NOT NULL) THEN
        v_domain_org_id := get_organization_by_domain(p_domain, p_subdomain);
        
        -- إذا لم نجد مؤسسة للنطاق المحدد
        IF v_domain_org_id IS NULL THEN
            -- نتجاهل الخطأ إذا كان النطاق هو النطاق العام وكان المستخدم مسموح له
            IF v_allow_public_domain AND (p_domain IS NOT NULL AND p_domain IN ('ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev')) THEN
                -- لا نفعل شيئًا ونستمر
                NULL;
            ELSE
                RETURN jsonb_build_object(
                    'user_exists', false,
                    'user_id', NULL,
                    'user_name', NULL,
                    'requires_2fa', false,
                    'organization_id', NULL,
                    'error', 'النطاق غير مسجل في النظام'
                );
            END IF;
        ELSE
            p_organization_id := v_domain_org_id;
        END IF;
    END IF;
    
    -- التحقق من أن المستخدم ينتمي للمؤسسة المحددة (فقط إذا لم يكن النطاق العام)
    IF p_organization_id IS NOT NULL AND v_user_record.organization_id != p_organization_id THEN
        -- نتحقق إذا كان النطاق هو نطاق عام والمستخدم مسموح له
        IF v_allow_public_domain AND (p_domain IS NOT NULL AND p_domain IN ('ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev')) THEN
            -- نسمح بالدخول من النطاق العام
            NULL;
        ELSE
            -- تسجيل محاولة وصول غير مصرح بها
            PERFORM log_security_activity(
                v_user_record.id,
                'unauthorized_domain_access',
                'محاولة دخول من نطاق غير مصرح به',
                'blocked',
                'high',
                NULL,
                NULL,
                jsonb_build_object(
                    'email', p_user_email,
                    'attempted_domain', p_domain,
                    'attempted_subdomain', p_subdomain,
                    'user_organization_id', v_user_record.organization_id,
                    'domain_organization_id', p_organization_id
                )
            );
            
            RETURN jsonb_build_object(
                'user_exists', false,
                'user_id', NULL,
                'user_name', NULL,
                'requires_2fa', false,
                'organization_id', NULL,
                'error', 'غير مصرح لك بالدخول من هذا النطاق'
            );
        END IF;
    END IF;
    
    -- إذا لم يتم تحديد مؤسسة ولا نطاق، نتحقق من المؤسسة الافتراضية
    IF p_organization_id IS NULL AND p_domain IS NULL AND p_subdomain IS NULL THEN
        -- هنا التغيير الرئيسي: السماح لجميع المستخدمين بالدخول من النطاق العام إذا كان مسموحًا لهم
        IF v_user_record.organization_id IS NOT NULL AND NOT v_allow_public_domain THEN
            -- جلب معلومات المؤسسة
            SELECT subdomain, domain INTO v_organization_record
            FROM organizations
            WHERE id = v_user_record.organization_id;
            
            RETURN jsonb_build_object(
                'user_exists', false,
                'user_id', NULL,
                'user_name', NULL,
                'requires_2fa', false,
                'organization_id', NULL,
                'error', 'يجب الدخول من نطاق مؤسستك: ' || COALESCE(v_organization_record.subdomain || '.ktobi.online', v_organization_record.domain, 'النطاق الخاص بمؤسستك')
            );
        END IF;
    END IF;
    
    -- تحديد ما إذا كانت المصادقة الثنائية مطلوبة
    v_result := jsonb_build_object(
        'user_exists', true,
        'user_id', v_user_record.id,
        'user_name', COALESCE(
            v_user_record.name,
            CONCAT(v_user_record.first_name, ' ', v_user_record.last_name),
            v_user_record.email
        ),
        'requires_2fa', COALESCE(v_user_record.two_factor_enabled, v_user_record.security_2fa_enabled, false),
        'organization_id', v_user_record.organization_id,
        'error', NULL
    );
    
    -- تسجيل محاولة التحقق الناجحة
    PERFORM log_security_activity(
        v_user_record.id,
        '2fa_check',
        'تم التحقق من متطلبات المصادقة الثنائية',
        'success',
        'low',
        NULL,
        NULL,
        jsonb_build_object(
            'email', p_user_email,
            'domain', p_domain,
            'subdomain', p_subdomain,
            'requires_2fa', COALESCE(v_user_record.two_factor_enabled, v_user_record.security_2fa_enabled, false)
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'user_exists', false,
            'user_id', NULL,
            'user_name', NULL,
            'requires_2fa', false,
            'organization_id', NULL,
            'error', 'حدث خطأ في التحقق من المصادقة الثنائية: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 