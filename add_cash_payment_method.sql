-- إضافة طريقة دفع Cash إلى جدول طرق الدفع إذا لم تكن موجودة
DO $$
BEGIN
    -- التحقق من وجود Cash في جدول طرق الدفع
    IF NOT EXISTS (SELECT 1 FROM payment_methods WHERE code = 'cash') THEN
        INSERT INTO payment_methods (name, code, is_active, description, icon, created_at, updated_at)
        VALUES ('كاش', 'cash', true, 'الدفع نقداً عند استلام المنتج', '💰', NOW(), NOW());
    END IF;
END $$;

-- تأكد من وجود الحقل الخاص بمزود الشحن في جدول إعدادات النموذج
DO $$
BEGIN
    -- التحقق من وجود عمود settings في جدول form_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'form_settings' AND column_name = 'settings') THEN
        ALTER TABLE form_settings ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- إضافة أو تحديث وظيفة قاعدة البيانات للمساعدة في تحديث رقم الإصدار
CREATE OR REPLACE FUNCTION increment_version(row_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_version INTEGER;
BEGIN
    -- الحصول على الإصدار الحالي
    SELECT version INTO current_version FROM form_settings WHERE id = row_id;
    
    -- إذا كان الإصدار غير موجود، بدأ من 1
    IF current_version IS NULL THEN
        current_version := 0;
    END IF;
    
    -- إرجاع الإصدار الجديد
    RETURN current_version + 1;
END;
$$ LANGUAGE plpgsql;

-- تعديل جدول إعدادات النموذج لضمان وجود حقل الإصدار
DO $$
BEGIN
    -- التحقق من وجود عمود version في جدول form_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'form_settings' AND column_name = 'version') THEN
        ALTER TABLE form_settings ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- تعديل نظام Yalidine Cache لإضافة دعم Cash
DO $$
BEGIN
    -- إذا كانت جداول Yalidine موجودة، تأكد من أن لديها الحقول اللازمة
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yalidine_parcels') THEN
        -- التأكد من وجود حقل payment_method في جدول yalidine_parcels إذا لم يكن موجودًا
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'yalidine_parcels' AND column_name = 'payment_method') THEN
            ALTER TABLE yalidine_parcels ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash_on_delivery';
        END IF;
    END IF;
END $$;

-- إنشاء دالة لربط إعدادات النموذج مع مزود الشحن
CREATE OR REPLACE FUNCTION link_form_with_shipping_provider(
    p_form_id UUID,
    p_provider_id INTEGER,
    p_enabled BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- تحديث إعدادات النموذج
    UPDATE form_settings
    SET settings = jsonb_set(
            COALESCE(settings, '{}'::jsonb),
            '{shipping_integration}',
            jsonb_build_object(
                'enabled', p_enabled,
                'provider_id', p_provider_id,
                'linked_at', EXTRACT(EPOCH FROM NOW())::text
            )
        ),
        version = increment_version(id)
    WHERE id = p_form_id
    RETURNING settings INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql; 