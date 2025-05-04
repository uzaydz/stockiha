-- جدول طرق الدفع
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    instructions TEXT,
    icon TEXT,
    fields JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إضافة Trigger لتحديث timestamp
CREATE TRIGGER update_payment_methods_timestamp
BEFORE UPDATE ON payment_methods
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- إضافة طرق دفع افتراضية
INSERT INTO payment_methods (name, code, description, instructions, icon, fields, is_active, display_order)
VALUES
-- الدفع عند الاستلام
('الدفع عند الاستلام', 'cash_on_delivery', 'دفع قيمة الاشتراك نقداً عند الاستلام', 
 'سيتم التواصل معك لتحديد موعد وعنوان الاستلام.', 
 'cash', 
 '[
    {"name": "address", "label": "العنوان", "type": "textarea", "placeholder": "أدخل عنوان الاستلام بالتفصيل", "required": true},
    {"name": "phone", "label": "رقم الهاتف", "type": "tel", "placeholder": "أدخل رقم هاتف للتواصل", "required": true}
 ]'::JSONB,
 TRUE, 0),

-- CCP (بريد الجزائر)
('CCP حساب بريدي', 'ccp', 'الدفع عبر الحساب البريدي الجاري', 
 'يرجى تحويل المبلغ إلى الحساب البريدي الجاري رقم: 0012345678 واسم صاحب الحساب: شركة بازار للتجارة الإلكترونية.', 
 'mail', 
 '[
    {"name": "sender_ccp", "label": "رقم CCP المرسل", "type": "text", "placeholder": "00000000000", "required": true},
    {"name": "receipt_number", "label": "رقم الوصل", "type": "text", "placeholder": "أدخل رقم الوصل", "required": true},
    {"name": "transaction_date", "label": "تاريخ التحويل", "type": "text", "placeholder": "DD/MM/YYYY", "required": true}
 ]'::JSONB,
 TRUE, 1),

-- بريدي موب
('بريدي موب', 'baridi_mob', 'الدفع عبر تطبيق بريدي موب', 
 'قم بتحويل المبلغ عبر تطبيق بريدي موب إلى الرقم: 0770123456.', 
 'smartphone', 
 '[
    {"name": "sender_phone", "label": "رقم الهاتف المرسل", "type": "tel", "placeholder": "07XXXXXXXX", "required": true},
    {"name": "transaction_id", "label": "رقم العملية", "type": "text", "placeholder": "أدخل رقم عملية التحويل", "required": true},
    {"name": "transaction_date", "label": "تاريخ التحويل", "type": "text", "placeholder": "DD/MM/YYYY", "required": true}
 ]'::JSONB,
 TRUE, 2),

-- USDT تيثر
('USDT تيثر', 'usdt', 'الدفع باستخدام العملة المشفرة USDT', 
 'قم بتحويل المبلغ المعادل بالـ USDT إلى المحفظة التالية: 0x1234567890abcdef1234567890abcdef12345678.', 
 'currency', 
 '[
    {"name": "sender_wallet", "label": "عنوان المحفظة المرسلة", "type": "text", "placeholder": "أدخل عنوان محفظتك", "required": true},
    {"name": "transaction_hash", "label": "رقم العملية (Hash)", "type": "text", "placeholder": "أدخل رقم عملية التحويل", "required": true},
    {"name": "network", "label": "الشبكة", "type": "text", "placeholder": "مثل: TRC20، ERC20، BEP20", "required": true}
 ]'::JSONB,
 TRUE, 3); 