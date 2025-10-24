-- =====================================================
-- جداول نظام كشف حساب 104 (État 104)
-- الكشف التفصيلي بالعملاء - المادة 183 مكرر من CIDTA
-- =====================================================

-- 1. جدول الكشوفات (Declarations)
CREATE TABLE IF NOT EXISTS etat104_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- معلومات الكشف
    year INTEGER NOT NULL, -- السنة المالية
    declaration_number VARCHAR(50), -- رقم الكشف (اختياري)
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, validated, submitted, corrected
    
    -- إحصائيات
    total_clients INTEGER DEFAULT 0,
    valid_clients INTEGER DEFAULT 0,
    warning_clients INTEGER DEFAULT 0,
    error_clients INTEGER DEFAULT 0,
    
    -- المبالغ المالية
    total_amount_ht DECIMAL(15, 2) DEFAULT 0, -- المبلغ خارج الرسوم
    total_tva DECIMAL(15, 2) DEFAULT 0, -- ضريبة القيمة المضافة
    total_amount_ttc DECIMAL(15, 2) DEFAULT 0, -- المبلغ الإجمالي
    
    -- تواريخ
    submission_date TIMESTAMP WITH TIME ZONE, -- تاريخ التقديم
    validation_date TIMESTAMP WITH TIME ZONE, -- تاريخ المصادقة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- معلومات إضافية
    notes TEXT, -- ملاحظات
    file_path TEXT, -- مسار ملف Excel المستورد
    exported_file_path TEXT, -- مسار ملف Excel المصدر
    
    -- فهرس فريد لكل سنة ومؤسسة
    UNIQUE(organization_id, year)
);

-- 2. جدول بيانات العملاء في الكشف
CREATE TABLE IF NOT EXISTS etat104_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id UUID NOT NULL REFERENCES etat104_declarations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- البيانات الإلزامية
    commercial_name VARCHAR(255) NOT NULL, -- الاسم التجاري
    nif VARCHAR(15) NOT NULL, -- رقم التعريف الجبائي (15 رقم)
    rc VARCHAR(50) NOT NULL, -- رقم السجل التجاري
    article_number VARCHAR(50), -- رقم مادة جدول الضرائب (اختياري)
    address TEXT NOT NULL, -- العنوان الكامل
    
    -- المبالغ المالية
    amount_ht DECIMAL(15, 2) NOT NULL, -- المبلغ خارج الرسوم
    tva DECIMAL(15, 2) NOT NULL, -- ضريبة القيمة المضافة
    amount_ttc DECIMAL(15, 2) GENERATED ALWAYS AS (amount_ht + tva) STORED, -- المبلغ الإجمالي
    
    -- حالة التحقق
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- valid, warning, error
    nif_verified BOOLEAN DEFAULT FALSE, -- تم التحقق من NIF
    rc_verified BOOLEAN DEFAULT FALSE, -- تم التحقق من RC
    
    -- تواريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- فهرس لتسريع البحث
    CONSTRAINT check_nif_length CHECK (LENGTH(nif) = 15),
    CONSTRAINT check_amounts CHECK (amount_ht >= 0 AND tva >= 0)
);

-- 3. جدول أخطاء وتحذيرات التحقق
CREATE TABLE IF NOT EXISTS etat104_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES etat104_clients(id) ON DELETE CASCADE,
    
    -- نوع المشكلة
    type VARCHAR(20) NOT NULL, -- error, warning
    field VARCHAR(50) NOT NULL, -- الحقل الذي به المشكلة
    message TEXT NOT NULL, -- رسالة الخطأ/التحذير
    
    -- معلومات التحقق
    verification_source VARCHAR(50), -- cnrc, dgi, internal
    verification_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- حالة الحل
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول سجل التحقق من NIF و RC
CREATE TABLE IF NOT EXISTS etat104_verification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES etat104_clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- نوع التحقق
    verification_type VARCHAR(10) NOT NULL, -- nif, rc
    identifier VARCHAR(50) NOT NULL, -- الرقم المراد التحقق منه
    
    -- نتيجة التحقق
    is_valid BOOLEAN NOT NULL,
    response_data JSONB, -- البيانات المرجعة من API
    error_message TEXT,
    
    -- معلومات الطلب
    api_source VARCHAR(50) NOT NULL, -- cnrc, dgi
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- لقطة شاشة (مطلوب قانوناً)
    screenshot_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- الفهارس (Indexes) لتحسين الأداء
-- =====================================================

-- فهارس جدول الكشوفات
CREATE INDEX idx_etat104_declarations_org ON etat104_declarations(organization_id);
CREATE INDEX idx_etat104_declarations_year ON etat104_declarations(year);
CREATE INDEX idx_etat104_declarations_status ON etat104_declarations(status);

-- فهارس جدول العملاء
CREATE INDEX idx_etat104_clients_declaration ON etat104_clients(declaration_id);
CREATE INDEX idx_etat104_clients_org ON etat104_clients(organization_id);
CREATE INDEX idx_etat104_clients_nif ON etat104_clients(nif);
CREATE INDEX idx_etat104_clients_rc ON etat104_clients(rc);
CREATE INDEX idx_etat104_clients_status ON etat104_clients(validation_status);

-- فهارس جدول التحقق
CREATE INDEX idx_etat104_validations_client ON etat104_validations(client_id);
CREATE INDEX idx_etat104_validations_type ON etat104_validations(type);
CREATE INDEX idx_etat104_validations_resolved ON etat104_validations(resolved);

-- فهارس جدول سجل التحقق
CREATE INDEX idx_etat104_verification_log_client ON etat104_verification_log(client_id);
CREATE INDEX idx_etat104_verification_log_org ON etat104_verification_log(organization_id);
CREATE INDEX idx_etat104_verification_log_type ON etat104_verification_log(verification_type);

-- =====================================================
-- الدوال (Functions) المساعدة
-- =====================================================

-- دالة لتحديث إحصائيات الكشف
CREATE OR REPLACE FUNCTION update_etat104_declaration_stats(p_declaration_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE etat104_declarations
    SET 
        total_clients = (
            SELECT COUNT(*) FROM etat104_clients WHERE declaration_id = p_declaration_id
        ),
        valid_clients = (
            SELECT COUNT(*) FROM etat104_clients 
            WHERE declaration_id = p_declaration_id AND validation_status = 'valid'
        ),
        warning_clients = (
            SELECT COUNT(*) FROM etat104_clients 
            WHERE declaration_id = p_declaration_id AND validation_status = 'warning'
        ),
        error_clients = (
            SELECT COUNT(*) FROM etat104_clients 
            WHERE declaration_id = p_declaration_id AND validation_status = 'error'
        ),
        total_amount_ht = (
            SELECT COALESCE(SUM(amount_ht), 0) FROM etat104_clients 
            WHERE declaration_id = p_declaration_id
        ),
        total_tva = (
            SELECT COALESCE(SUM(tva), 0) FROM etat104_clients 
            WHERE declaration_id = p_declaration_id
        ),
        total_amount_ttc = (
            SELECT COALESCE(SUM(amount_ttc), 0) FROM etat104_clients 
            WHERE declaration_id = p_declaration_id
        ),
        updated_at = NOW()
    WHERE id = p_declaration_id;
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث حالة التحقق للعميل
CREATE OR REPLACE FUNCTION update_etat104_client_validation_status(p_client_id UUID)
RETURNS void AS $$
DECLARE
    v_error_count INTEGER;
    v_warning_count INTEGER;
BEGIN
    -- حساب عدد الأخطاء والتحذيرات
    SELECT 
        COUNT(*) FILTER (WHERE type = 'error' AND NOT resolved),
        COUNT(*) FILTER (WHERE type = 'warning' AND NOT resolved)
    INTO v_error_count, v_warning_count
    FROM etat104_validations
    WHERE client_id = p_client_id;
    
    -- تحديث حالة العميل
    UPDATE etat104_clients
    SET 
        validation_status = CASE
            WHEN v_error_count > 0 THEN 'error'
            WHEN v_warning_count > 0 THEN 'warning'
            ELSE 'valid'
        END,
        updated_at = NOW()
    WHERE id = p_client_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- المحفزات (Triggers)
-- =====================================================

-- محفز لتحديث إحصائيات الكشف عند تغيير بيانات العميل
CREATE OR REPLACE FUNCTION trigger_update_declaration_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_etat104_declaration_stats(OLD.declaration_id);
        RETURN OLD;
    ELSE
        PERFORM update_etat104_declaration_stats(NEW.declaration_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER etat104_clients_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON etat104_clients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_declaration_stats();

-- محفز لتحديث حالة التحقق عند تغيير الأخطاء/التحذيرات
CREATE OR REPLACE FUNCTION trigger_update_client_validation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_etat104_client_validation_status(OLD.client_id);
        RETURN OLD;
    ELSE
        PERFORM update_etat104_client_validation_status(NEW.client_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER etat104_validations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON etat104_validations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_client_validation();

-- =====================================================
-- سياسات الأمان (Row Level Security)
-- =====================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE etat104_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE etat104_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE etat104_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE etat104_verification_log ENABLE ROW LEVEL SECURITY;

-- سياسة للكشوفات: المستخدم يرى فقط كشوفات مؤسسته
CREATE POLICY etat104_declarations_policy ON etat104_declarations
    FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE auth_user_id = auth.uid()
        AND organization_id IS NOT NULL
    ));

-- سياسة للعملاء: المستخدم يرى فقط عملاء مؤسسته
CREATE POLICY etat104_clients_policy ON etat104_clients
    FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE auth_user_id = auth.uid()
        AND organization_id IS NOT NULL
    ));

-- سياسة للتحقق: المستخدم يرى فقط تحقق عملاء مؤسسته
CREATE POLICY etat104_validations_policy ON etat104_validations
    FOR ALL
    USING (client_id IN (
        SELECT id FROM etat104_clients 
        WHERE organization_id IN (
            SELECT organization_id FROM users 
            WHERE auth_user_id = auth.uid()
            AND organization_id IS NOT NULL
        )
    ));

-- سياسة لسجل التحقق: المستخدم يرى فقط سجل مؤسسته
CREATE POLICY etat104_verification_log_policy ON etat104_verification_log
    FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE auth_user_id = auth.uid()
        AND organization_id IS NOT NULL
    ));

-- =====================================================
-- بيانات تجريبية (Optional - للاختبار فقط)
-- =====================================================

-- يمكن إضافة بيانات تجريبية هنا للاختبار

-- =====================================================
-- ملاحظات مهمة
-- =====================================================

-- 1. يجب تشغيل هذا الملف على قاعدة بيانات Supabase
-- 2. تأكد من وجود جدول organizations و user_organizations
-- 3. RLS مفعّل لضمان أمان البيانات
-- 4. الدوال والمحفزات تحدّث الإحصائيات تلقائياً
-- 5. جدول verification_log يحفظ سجل كامل للتحقق (مطلوب قانوناً)
