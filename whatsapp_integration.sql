-- ملف لإضافة خاصية واتساب للمسؤولين
-- يضيف حقل رقم الهاتف وحالة الاتصال مع خدمة واتساب

-- إضافة الأعمدة اللازمة إلى جدول profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT FALSE;

-- إنشاء جدول لتخزين قوالب الرسائل
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

-- إنشاء سجل للرسائل المرسلة
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES service_bookings(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- إنشاء سياسات أمان للجداول الجديدة
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة والتحديث للقوالب
CREATE POLICY whatsapp_templates_policy ON whatsapp_templates
    USING (organization_id IN (
        SELECT org_id FROM user_organizations
        WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
    ));

-- سياسة القراءة للرسائل
CREATE POLICY whatsapp_messages_policy ON whatsapp_messages
    USING (organization_id IN (
        SELECT org_id FROM user_organizations
        WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
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