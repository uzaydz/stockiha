-- إنشاء جدول إعدادات نموذج الطلب
CREATE TABLE IF NOT EXISTS form_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]',
    product_ids JSONB DEFAULT '[]', -- يمكن أن يكون فارغًا لتطبيق الإعدادات على جميع المنتجات
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    version INTEGER DEFAULT 1
);

-- إضافة مؤشر للبحث السريع
CREATE INDEX IF NOT EXISTS idx_form_settings_organization_id ON form_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_settings_product_ids ON form_settings USING GIN(product_ids);

-- إنشاء تشغيل تلقائي لتحديث timestamp
CREATE OR REPLACE FUNCTION update_form_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة المشغل الآلي إذا كان موجودًا أولاً
DROP TRIGGER IF EXISTS update_form_settings_timestamp ON form_settings;

-- ثم إنشاء المشغل الآلي
CREATE TRIGGER update_form_settings_timestamp
BEFORE UPDATE ON form_settings
FOR EACH ROW
EXECUTE FUNCTION update_form_settings_timestamp();

-- إضافة سياسات الأمان للجدول (RLS - Row Level Security)
ALTER TABLE form_settings ENABLE ROW LEVEL SECURITY;

-- حذف السياسات السابقة إذا كانت موجودة
DROP POLICY IF EXISTS form_settings_select_policy ON form_settings;
DROP POLICY IF EXISTS form_settings_insert_policy ON form_settings;
DROP POLICY IF EXISTS form_settings_update_policy ON form_settings;
DROP POLICY IF EXISTS form_settings_delete_policy ON form_settings;

-- سياسة القراءة - المستخدمون يمكنهم فقط قراءة إعدادات مؤسستهم
CREATE POLICY form_settings_select_policy 
    ON form_settings 
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسة الإنشاء - المستخدمون يمكنهم إنشاء إعدادات لمؤسستهم فقط
CREATE POLICY form_settings_insert_policy 
    ON form_settings 
    FOR INSERT 
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسة التحديث - المستخدمون يمكنهم تحديث إعدادات مؤسستهم فقط
CREATE POLICY form_settings_update_policy 
    ON form_settings 
    FOR UPDATE 
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسة الحذف - المستخدمون يمكنهم حذف إعدادات مؤسستهم فقط
CREATE POLICY form_settings_delete_policy 
    ON form_settings 
    FOR DELETE 
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- وظيفة للحصول على إعدادات النموذج لمنتج معين
CREATE OR REPLACE FUNCTION get_form_settings_for_product(
    p_organization_id UUID, 
    p_product_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_settings JSONB;
    v_form_record RECORD;
BEGIN
    -- البحث عن إعدادات محددة لهذا المنتج
    SELECT * INTO v_form_record
    FROM form_settings
    WHERE 
        organization_id = p_organization_id AND
        is_active = true AND
        deleted_at IS NULL AND
        (
            -- إما أن يكون المنتج مدرج في قائمة المنتجات المحددة
            product_ids @> jsonb_build_array(p_product_id::TEXT)
            OR
            -- أو الإعدادات تنطبق على جميع المنتجات (قائمة فارغة)
            jsonb_array_length(product_ids) = 0
        )
    ORDER BY 
        -- الأولوية الأعلى للإعدادات المحددة لهذا المنتج
        CASE WHEN product_ids @> jsonb_build_array(p_product_id::TEXT) THEN 0 ELSE 1 END,
        -- ثم الإعدادات الافتراضية
        is_default DESC,
        -- ثم الإصدار الأحدث
        version DESC,
        -- ثم حسب تاريخ التحديث للحصول على الأحدث
        updated_at DESC
    LIMIT 1;

    -- إذا لم نجد إعدادات، نرجع مصفوفة فارغة
    IF v_form_record IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    -- إرجاع حقول النموذج كاملة
    RETURN v_form_record.fields;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لإنشاء أو تحديث إعدادات النموذج
CREATE OR REPLACE FUNCTION upsert_form_settings(
    p_organization_id UUID,
    p_name TEXT,
    p_fields JSONB,
    p_product_ids JSONB DEFAULT '[]',
    p_is_default BOOLEAN DEFAULT false,
    p_is_active BOOLEAN DEFAULT true,
    p_form_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_form_id UUID;
BEGIN
    -- إذا كانت الإعدادات الجديدة هي الافتراضية، نقوم بإلغاء تعيين الإعدادات الافتراضية السابقة
    IF p_is_default = true THEN
        UPDATE form_settings
        SET is_default = false
        WHERE organization_id = p_organization_id AND is_default = true AND id != COALESCE(p_form_id, uuid_nil());
    END IF;

    -- إذا كان هناك معرف للنموذج، نقوم بتحديثه، وإلا نقوم بإنشاء إعدادات جديدة
    IF p_form_id IS NOT NULL THEN
        UPDATE form_settings
        SET 
            name = p_name,
            fields = p_fields,
            product_ids = p_product_ids,
            is_default = p_is_default,
            is_active = p_is_active,
            updated_at = NOW()
        WHERE id = p_form_id AND organization_id = p_organization_id
        RETURNING id INTO v_form_id;
    ELSE
        INSERT INTO form_settings (
            organization_id,
            name,
            fields,
            product_ids,
            is_default,
            is_active,
            created_by
        )
        VALUES (
            p_organization_id,
            p_name,
            p_fields,
            p_product_ids,
            p_is_default,
            p_is_active,
            auth.uid()
        )
        RETURNING id INTO v_form_id;
    END IF;

    RETURN v_form_id;
END;
$$ LANGUAGE plpgsql; 