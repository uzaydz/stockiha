-- إضافة أعمدة واتساب إلى جدول المستخدمين
ALTER TABLE users
ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT false;

-- إنشاء جدول لقوالب رسائل واتساب
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  template_name VARCHAR(255) NOT NULL,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (org_id, template_name)
);

-- إنشاء جدول لتخزين رسائل واتساب المرسلة
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  to_phone VARCHAR(20) NOT NULL,
  message_content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  booking_id UUID REFERENCES service_bookings(id),
  template_id UUID REFERENCES whatsapp_templates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- التأكد من وجود جدول المؤسسات
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END$$;

-- إضافة حقل completed_at إلى جدول الحجوزات إذا لم يكن موجوداً
ALTER TABLE service_bookings
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE; 