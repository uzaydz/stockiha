-- =================================================================
-- نظام التصريح بالخسائر - قاعدة البيانات
-- =================================================================

-- 1. جدول تصريحات الخسائر الرئيسي
CREATE TABLE IF NOT EXISTS losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loss_number VARCHAR(50) UNIQUE NOT NULL, -- رقم التصريح التسلسلي
    
    -- تفاصيل التصريح
    loss_type VARCHAR(30) NOT NULL CHECK (loss_type IN (
        'damaged', 'expired', 'theft', 'loss', 'defective', 
        'spoiled', 'broken', 'contaminated', 'recalled', 'other'
    )),
    loss_category VARCHAR(30) DEFAULT 'operational' CHECK (loss_category IN (
        'operational', 'theft', 'natural_disaster', 'employee_error', 
        'supplier_fault', 'customer_damage', 'system_error'
    )),
    
    -- وصف التفصيلي للخسارة
    loss_description TEXT NOT NULL,
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL, -- تاريخ اكتشاف الخسارة
    
    -- المسؤول عن التصريح
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    witness_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    witness_name VARCHAR(255), -- شاهد خارجي إذا لم يكن موظف
    
    -- الموافقات المطلوبة
    requires_manager_approval BOOLEAN DEFAULT true,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- حالة التصريح
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'approved', 'processed', 'rejected', 'cancelled'
    )),
    
    -- المعلومات المالية الإجمالية
    total_cost_value NUMERIC(12,2) NOT NULL DEFAULT 0, -- القيمة الإجمالية بسعر التكلفة
    total_selling_value NUMERIC(12,2) NOT NULL DEFAULT 0, -- القيمة الإجمالية بسعر البيع
    total_items_count INTEGER NOT NULL DEFAULT 0,
    
    -- معلومات إضافية
    location_description TEXT, -- مكان الحادث
    external_reference VARCHAR(100), -- مرجع خارجي (رقم بلاغ شرطة، تقرير تأمين، إلخ)
    insurance_claim BOOLEAN DEFAULT false,
    insurance_reference VARCHAR(100),
    
    -- ملاحظات
    notes TEXT,
    internal_notes TEXT, -- ملاحظات داخلية للإدارة
    
    -- معلومات المنظمة والتوقيت
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE -- تاريخ المعالجة النهائية
);

-- 2. جدول عناصر الخسائر التفصيلية
CREATE TABLE IF NOT EXISTS loss_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loss_id UUID NOT NULL REFERENCES losses(id) ON DELETE CASCADE,
    
    -- معلومات المنتج
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    product_barcode VARCHAR(100),
    
    -- تفاصيل الكمية والسعر
    lost_quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost_price NUMERIC(10,2) NOT NULL DEFAULT 0, -- سعر التكلفة للوحدة
    unit_selling_price NUMERIC(10,2) NOT NULL DEFAULT 0, -- سعر البيع للوحدة
    total_cost_value NUMERIC(10,2) NOT NULL DEFAULT 0, -- القيمة الإجمالية بسعر التكلفة
    total_selling_value NUMERIC(10,2) NOT NULL DEFAULT 0, -- القيمة الإجمالية بسعر البيع
    
    -- معلومات المتغيرات (الألوان والمقاسات)
    variant_info JSONB,
    
    -- تفاصيل الخسارة لهذا المنتج
    loss_condition VARCHAR(30) NOT NULL CHECK (loss_condition IN (
        'completely_damaged', 'partially_damaged', 'expired', 'missing', 
        'stolen', 'defective', 'contaminated', 'other'
    )),
    loss_percentage NUMERIC(5,2) DEFAULT 100.00 CHECK (loss_percentage BETWEEN 0 AND 100),
    
    -- معلومات المخزون
    stock_before_loss INTEGER, -- كمية المخزون قبل الخسارة
    stock_after_loss INTEGER, -- كمية المخزون بعد الخسارة
    inventory_adjusted BOOLEAN DEFAULT false, -- هل تم تعديل المخزون؟
    inventory_adjusted_at TIMESTAMP WITH TIME ZONE,
    inventory_adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- ملاحظات خاصة بالمنتج
    item_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. جدول صور الخسائر (للتوثيق)
CREATE TABLE IF NOT EXISTS loss_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loss_id UUID NOT NULL REFERENCES losses(id) ON DELETE CASCADE,
    loss_item_id UUID REFERENCES loss_items(id) ON DELETE CASCADE,
    
    -- معلومات الملف
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, image/png, application/pdf, etc.
    file_size INTEGER, -- بالبايت
    
    -- وصف الدليل
    evidence_type VARCHAR(30) DEFAULT 'photo' CHECK (evidence_type IN (
        'photo', 'video', 'document', 'receipt', 'report'
    )),
    description TEXT,
    
    -- معلومات الرفع
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- 4. جدول تقارير الخسائر الدورية
CREATE TABLE IF NOT EXISTS loss_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- فترة التقرير
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    report_type VARCHAR(20) DEFAULT 'monthly' CHECK (report_type IN (
        'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
    )),
    
    -- ملخص إحصائي
    total_loss_incidents INTEGER DEFAULT 0,
    total_items_lost INTEGER DEFAULT 0,
    total_cost_value NUMERIC(12,2) DEFAULT 0,
    total_selling_value NUMERIC(12,2) DEFAULT 0,
    
    -- تفاصيل حسب النوع
    loss_by_type JSONB, -- تفصيل الخسائر حسب النوع
    loss_by_category JSONB, -- تفصيل الخسائر حسب الفئة
    top_lost_products JSONB, -- أكثر المنتجات خسارة
    
    -- معلومات التقرير
    generated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    report_status VARCHAR(20) DEFAULT 'draft' CHECK (report_status IN (
        'draft', 'finalized', 'submitted', 'approved'
    )),
    
    -- ملاحظات التقرير
    executive_summary TEXT,
    recommendations TEXT,
    
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- 5. إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_losses_organization_id ON losses(organization_id);
CREATE INDEX IF NOT EXISTS idx_losses_status ON losses(status);
CREATE INDEX IF NOT EXISTS idx_losses_loss_type ON losses(loss_type);
CREATE INDEX IF NOT EXISTS idx_losses_reported_by ON losses(reported_by);
CREATE INDEX IF NOT EXISTS idx_losses_incident_date ON losses(incident_date);
CREATE INDEX IF NOT EXISTS idx_losses_created_at ON losses(created_at);
CREATE INDEX IF NOT EXISTS idx_losses_loss_number ON losses(loss_number);

CREATE INDEX IF NOT EXISTS idx_loss_items_loss_id ON loss_items(loss_id);
CREATE INDEX IF NOT EXISTS idx_loss_items_product_id ON loss_items(product_id);
CREATE INDEX IF NOT EXISTS idx_loss_items_loss_condition ON loss_items(loss_condition);

CREATE INDEX IF NOT EXISTS idx_loss_evidence_loss_id ON loss_evidence(loss_id);
CREATE INDEX IF NOT EXISTS idx_loss_evidence_organization_id ON loss_evidence(organization_id);

CREATE INDEX IF NOT EXISTS idx_loss_reports_organization_id ON loss_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_loss_reports_period ON loss_reports(report_period_start, report_period_end);

-- 6. إنشاء متسلسل لأرقام التصريح
CREATE SEQUENCE IF NOT EXISTS loss_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS loss_report_number_seq START 1;

-- 7. دالة لتوليد رقم التصريح التلقائي
CREATE OR REPLACE FUNCTION generate_loss_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.loss_number IS NULL THEN
        NEW.loss_number := 'LOSS-' || TO_CHAR(now(), 'YYYY') || '-' || 
                          LPAD(nextval('loss_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز لتوليد رقم التصريح
DROP TRIGGER IF EXISTS trigger_generate_loss_number ON losses;
CREATE TRIGGER trigger_generate_loss_number
    BEFORE INSERT ON losses
    FOR EACH ROW
    EXECUTE FUNCTION generate_loss_number();

-- 8. دالة لتوليد رقم التقرير التلقائي
CREATE OR REPLACE FUNCTION generate_loss_report_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_number IS NULL THEN
        NEW.report_number := 'LRPT-' || TO_CHAR(now(), 'YYYY') || '-' || 
                            LPAD(nextval('loss_report_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز لتوليد رقم التقرير
DROP TRIGGER IF EXISTS trigger_generate_loss_report_number ON loss_reports;
CREATE TRIGGER trigger_generate_loss_report_number
    BEFORE INSERT ON loss_reports
    FOR EACH ROW
    EXECUTE FUNCTION generate_loss_report_number();

-- 9. دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_losses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفزات للتحديث التلقائي
DROP TRIGGER IF EXISTS trigger_update_losses_updated_at ON losses;
CREATE TRIGGER trigger_update_losses_updated_at
    BEFORE UPDATE ON losses
    FOR EACH ROW
    EXECUTE FUNCTION update_losses_updated_at();

DROP TRIGGER IF EXISTS trigger_update_loss_items_updated_at ON loss_items;
CREATE TRIGGER trigger_update_loss_items_updated_at
    BEFORE UPDATE ON loss_items
    FOR EACH ROW
    EXECUTE FUNCTION update_losses_updated_at();

-- 10. دالة لتحديث إجمالي الخسائر تلقائياً
CREATE OR REPLACE FUNCTION update_loss_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_total_cost NUMERIC(12,2);
    v_total_selling NUMERIC(12,2);
    v_total_items INTEGER;
BEGIN
    -- حساب الإجماليات من عناصر الخسارة
    SELECT 
        COALESCE(SUM(total_cost_value), 0),
        COALESCE(SUM(total_selling_value), 0),
        COALESCE(SUM(lost_quantity), 0)
    INTO v_total_cost, v_total_selling, v_total_items
    FROM loss_items
    WHERE loss_id = COALESCE(NEW.loss_id, OLD.loss_id);
    
    -- تحديث الإجماليات في جدول الخسائر
    UPDATE losses 
    SET 
        total_cost_value = v_total_cost,
        total_selling_value = v_total_selling,
        total_items_count = v_total_items,
        updated_at = now()
    WHERE id = COALESCE(NEW.loss_id, OLD.loss_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفزات لتحديث الإجماليات
DROP TRIGGER IF EXISTS trigger_update_loss_totals_insert ON loss_items;
CREATE TRIGGER trigger_update_loss_totals_insert
    AFTER INSERT ON loss_items
    FOR EACH ROW
    EXECUTE FUNCTION update_loss_totals();

DROP TRIGGER IF EXISTS trigger_update_loss_totals_update ON loss_items;
CREATE TRIGGER trigger_update_loss_totals_update
    AFTER UPDATE ON loss_items
    FOR EACH ROW
    EXECUTE FUNCTION update_loss_totals();

DROP TRIGGER IF EXISTS trigger_update_loss_totals_delete ON loss_items;
CREATE TRIGGER trigger_update_loss_totals_delete
    AFTER DELETE ON loss_items
    FOR EACH ROW
    EXECUTE FUNCTION update_loss_totals();

-- 11. إضافة أسباب جديدة للمعاملات المالية
DO $$
BEGIN
    -- تحديث قيود جدول inventory_transactions إذا كان موجوداً
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transactions') THEN
        -- إضافة أسباب الخسائر
        ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_reason_check;
        ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_reason_check 
        CHECK (reason IN ('sale', 'purchase', 'adjustment', 'return', 'loss', 'damage', 'theft', 'expired', 'transfer'));
    END IF;
END $$;

-- 12. تعليقات الجداول
COMMENT ON TABLE losses IS 'جدول تصريحات الخسائر الرئيسي';
COMMENT ON TABLE loss_items IS 'جدول عناصر الخسائر التفصيلية';
COMMENT ON TABLE loss_evidence IS 'جدول أدلة الخسائر (صور، مستندات)';
COMMENT ON TABLE loss_reports IS 'جدول تقارير الخسائر الدورية';

COMMENT ON COLUMN losses.loss_type IS 'نوع الخسارة (تالف، منتهي الصلاحية، مسروق، إلخ)';
COMMENT ON COLUMN losses.loss_category IS 'فئة الخسارة (تشغيلية، سرقة، كارثة طبيعية، إلخ)';
COMMENT ON COLUMN loss_items.loss_percentage IS 'نسبة الخسارة للمنتج (0-100%)';
COMMENT ON COLUMN loss_items.inventory_adjusted IS 'هل تم تعديل المخزون لهذا المنتج؟'; 