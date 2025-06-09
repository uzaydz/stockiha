-- =================================================================
-- نظام إرجاع المنتجات - قاعدة البيانات
-- =================================================================

-- 1. جدول طلبات الإرجاع الرئيسي
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(50) UNIQUE NOT NULL, -- رقم الإرجاع التسلسلي
    
    -- معلومات الطلبية الأصلية
    original_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    original_order_number VARCHAR(50),
    
    -- معلومات العميل
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- تفاصيل الإرجاع
    return_type VARCHAR(20) NOT NULL CHECK (return_type IN ('full', 'partial')),
    return_reason VARCHAR(50) NOT NULL CHECK (return_reason IN (
        'defective', 'wrong_item', 'customer_request', 'damaged', 
        'expired', 'wrong_size', 'wrong_color', 'quality_issue', 'other'
    )),
    return_reason_description TEXT,
    
    -- المبالغ المالية
    original_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    return_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    restocking_fee NUMERIC(10,2) DEFAULT 0,
    
    -- حالة الإرجاع
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'
    )),
    
    -- معلومات الموافقة والمعالجة
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- طريقة الاسترداد
    refund_method VARCHAR(20) DEFAULT 'cash' CHECK (refund_method IN (
        'cash', 'card', 'credit', 'exchange', 'store_credit'
    )),
    
    -- معلومات إضافية
    notes TEXT,
    internal_notes TEXT, -- ملاحظات داخلية للموظفين
    requires_manager_approval BOOLEAN DEFAULT false,
    
    -- معلومات المنظمة والتوقيت
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. جدول عناصر الإرجاع
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    
    -- معلومات المنتج الأصلي
    original_order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    
    -- تفاصيل الكمية والسعر
    original_quantity INTEGER NOT NULL DEFAULT 0,
    return_quantity INTEGER NOT NULL DEFAULT 0,
    original_unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    return_unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_return_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- معلومات المتغيرات (الألوان والمقاسات)
    variant_info JSONB,
    
    -- حالة العنصر
    condition_status VARCHAR(20) DEFAULT 'good' CHECK (condition_status IN (
        'good', 'damaged', 'defective', 'expired', 'opened'
    )),
    
    -- هل يمكن إعادة بيعه؟
    resellable BOOLEAN DEFAULT true,
    
    -- معلومات إرجاع المخزون
    inventory_returned BOOLEAN DEFAULT false,
    inventory_returned_at TIMESTAMP WITH TIME ZONE,
    inventory_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. جدول معاملات الاسترداد المالي
CREATE TABLE IF NOT EXISTS refund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    
    -- تفاصيل المعاملة
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'cash_refund', 'card_refund', 'store_credit', 'exchange'
    )),
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    reference_number VARCHAR(100),
    
    -- معلومات الدفع
    payment_method VARCHAR(20) NOT NULL,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- حالة المعاملة
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
        'pending', 'completed', 'failed', 'cancelled'
    )),
    
    -- ملاحظات
    notes TEXT,
    
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_returns_organization_id ON returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_returns_original_order_id ON returns(original_order_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product_id ON return_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_items_original_order_item_id ON return_items(original_order_item_id);

CREATE INDEX IF NOT EXISTS idx_refund_transactions_return_id ON refund_transactions(return_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_organization_id ON refund_transactions(organization_id);

-- 5. إنشاء متسلسل لأرقام الإرجاع
CREATE SEQUENCE IF NOT EXISTS return_number_seq START 1;

-- 6. دالة لتوليد رقم الإرجاع التلقائي
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.return_number IS NULL THEN
        NEW.return_number := 'RET-' || TO_CHAR(now(), 'YYYY') || '-' || 
                           LPAD(nextval('return_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز لتوليد رقم الإرجاع
DROP TRIGGER IF EXISTS trigger_generate_return_number ON returns;
CREATE TRIGGER trigger_generate_return_number
    BEFORE INSERT ON returns
    FOR EACH ROW
    EXECUTE FUNCTION generate_return_number();

-- 7. دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفزات للتحديث التلقائي
DROP TRIGGER IF EXISTS trigger_update_returns_updated_at ON returns;
CREATE TRIGGER trigger_update_returns_updated_at
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_returns_updated_at();

DROP TRIGGER IF EXISTS trigger_update_return_items_updated_at ON return_items;
CREATE TRIGGER trigger_update_return_items_updated_at
    BEFORE UPDATE ON return_items
    FOR EACH ROW
    EXECUTE FUNCTION update_returns_updated_at();

-- 8. إضافة أنواع معاملات جديدة لجدول transactions الموجود
DO $$
BEGIN
    -- تحديث قيود جدول transactions إذا كان موجوداً
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        -- إضافة أنواع معاملات الإرجاع
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
        CHECK (type IN ('sale', 'payment', 'refund', 'return', 'exchange', 'store_credit'));
    END IF;
END $$;

-- 9. تعليقات الجداول
COMMENT ON TABLE returns IS 'جدول طلبات إرجاع المنتجات';
COMMENT ON TABLE return_items IS 'جدول عناصر الإرجاع التفصيلية';
COMMENT ON TABLE refund_transactions IS 'جدول معاملات الاسترداد المالي';

COMMENT ON COLUMN returns.return_type IS 'نوع الإرجاع: كامل أو جزئي';
COMMENT ON COLUMN returns.return_reason IS 'سبب الإرجاع';
COMMENT ON COLUMN return_items.resellable IS 'هل يمكن إعادة بيع المنتج؟';
COMMENT ON COLUMN return_items.inventory_returned IS 'هل تم إرجاع المنتج للمخزون؟'; 