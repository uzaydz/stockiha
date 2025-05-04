-- ملف لإضافة خاصية واتساب للمسؤولين ودعم إرسال الإشعارات للعملاء
-- تم تحديثه ليتناسب مع هيكل قاعدة البيانات الحالية

-- إضافة الأعمدة اللازمة إلى جدول users لتخزين معلومات واتساب
ALTER TABLE users
ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT FALSE;

-- إضافة حقل رقم الهاتف لجدول حجوزات الخدمات للعملاء غير المسجلين
ALTER TABLE service_bookings
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

-- إنشاء جدول لتخزين قوالب رسائل واتساب
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (organization_id, template_name)
);

-- إدخال قوالب رسائل افتراضية
INSERT INTO whatsapp_templates (organization_id, template_name, template_content)
SELECT 
    org.id,
    'service_completed',
    'مرحباً {{customer_name}}، تم إكمال خدمة "{{service_name}}" بنجاح. شكراً لاستخدامك خدماتنا!'
FROM 
    organizations org
ON CONFLICT (organization_id, template_name) DO NOTHING;

-- إنشاء جدول لتخزين سجل الرسائل المرسلة
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    booking_id TEXT REFERENCES service_bookings(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- إنشاء سياسات أمان للجداول الجديدة
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة والتحديث لقوالب واتساب - تتيح للمسؤولين فقط الوصول
CREATE POLICY whatsapp_templates_policy ON whatsapp_templates
    USING (organization_id IN (
        SELECT organization_id FROM users
        WHERE auth.uid() = id AND (is_org_admin = true OR role = 'admin')
    ));

-- سياسة القراءة لرسائل واتساب المرسلة
CREATE POLICY whatsapp_messages_policy ON whatsapp_messages
    USING (organization_id IN (
        SELECT organization_id FROM users
        WHERE auth.uid() = id AND (is_org_admin = true OR role = 'admin')
    ));

-- أتأكد من تحديث وقت التعديل عند تحديث القوالب
CREATE OR REPLACE FUNCTION update_whatsapp_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_template_timestamp
BEFORE UPDATE ON whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_template_timestamp();

-- تحديث التابع (function) لتحديث حالة الحجز ليضيف إرسال رسالة واتساب
CREATE OR REPLACE FUNCTION update_booking_status_with_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_template TEXT;
    v_message TEXT;
    v_admin_connected BOOLEAN;
    v_service_name TEXT;
    v_customer_name TEXT;
    v_phone TEXT;
BEGIN
    -- تعيين متغيرات معلومات الحجز والخدمة
    SELECT s.name INTO v_service_name FROM services s WHERE s.id = NEW.service_id;
    v_customer_name := COALESCE(NEW.customer_name, 'العميل');
    
    -- الحصول على رقم الهاتف من العميل المرتبط أو من الحجز نفسه
    SELECT c.phone INTO v_phone FROM customers c WHERE c.id = NEW.customer_id;
    v_phone := COALESCE(v_phone, NEW.customer_phone);
    
    -- إذا تم تغيير الحالة إلى مكتملة وهناك رقم هاتف للعميل
    IF NEW.status = 'completed' AND v_phone IS NOT NULL THEN
        -- التحقق من وجود مسؤول متصل بواتساب
        SELECT EXISTS (
            SELECT 1 FROM users 
            WHERE organization_id = NEW.organization_id 
            AND whatsapp_connected = true
            AND (is_org_admin = true OR role = 'admin')
            LIMIT 1
        ) INTO v_admin_connected;
        
        IF v_admin_connected = true THEN
            -- استرجاع قالب الرسالة
            SELECT template_content INTO v_template 
            FROM whatsapp_templates 
            WHERE organization_id = NEW.organization_id 
            AND template_name = 'service_completed'
            AND is_active = true
            LIMIT 1;
            
            -- إذا كان هناك قالب، قم بتهيئة الرسالة
            IF v_template IS NOT NULL THEN
                v_message := v_template;
                v_message := REPLACE(v_message, '{{customer_name}}', v_customer_name);
                v_message := REPLACE(v_message, '{{service_name}}', v_service_name);
                
                -- إدخال الرسالة في جدول الرسائل (سيتم إرسالها بواسطة تطبيق واجهة المستخدم)
                INSERT INTO whatsapp_messages (
                    organization_id, 
                    booking_id, 
                    recipient_phone, 
                    message_content,
                    status
                ) VALUES (
                    NEW.organization_id,
                    NEW.id,
                    v_phone,
                    v_message,
                    'pending'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة الزناد (trigger) لاستدعاء التابع عند تحديث حالة الحجز
DROP TRIGGER IF EXISTS booking_status_notification_trigger ON service_bookings;

CREATE TRIGGER booking_status_notification_trigger
AFTER UPDATE OF status ON service_bookings
FOR EACH ROW
WHEN (OLD.status <> 'completed' AND NEW.status = 'completed')
EXECUTE FUNCTION update_booking_status_with_notification(); 