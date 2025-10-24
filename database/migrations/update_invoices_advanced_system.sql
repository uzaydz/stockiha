-- تحديث نظام الفواتير لدعم TVA, HT, TTC والتخفيض المتقدم
-- Migration: update_invoices_advanced_system
-- Date: 2025-01-22

-- إضافة حقول جديدة لجدول الفواتير
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC DEFAULT 19 CHECK (tva_rate >= 0 AND tva_rate <= 100),
ADD COLUMN IF NOT EXISTS amount_ht NUMERIC DEFAULT 0, -- المبلغ قبل الضريبة (Hors Taxe)
ADD COLUMN IF NOT EXISTS amount_tva NUMERIC DEFAULT 0, -- قيمة الضريبة (TVA)
ADD COLUMN IF NOT EXISTS amount_ttc NUMERIC DEFAULT 0; -- المبلغ شامل الضريبة (Toutes Taxes Comprises)

-- إضافة حقول جديدة لجدول عناصر الفواتير
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS sku TEXT, -- رمز المنتج الفريد
ADD COLUMN IF NOT EXISTS barcode TEXT, -- الباركود
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC DEFAULT 19 CHECK (tva_rate >= 0 AND tva_rate <= 100),
ADD COLUMN IF NOT EXISTS unit_price_ht NUMERIC DEFAULT 0, -- سعر الوحدة قبل الضريبة
ADD COLUMN IF NOT EXISTS unit_price_ttc NUMERIC DEFAULT 0, -- سعر الوحدة شامل الضريبة
ADD COLUMN IF NOT EXISTS total_ht NUMERIC DEFAULT 0, -- الإجمالي قبل الضريبة
ADD COLUMN IF NOT EXISTS total_tva NUMERIC DEFAULT 0, -- قيمة الضريبة
ADD COLUMN IF NOT EXISTS total_ttc NUMERIC DEFAULT 0, -- الإجمالي شامل الضريبة
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0, -- قيمة التخفيض على العنصر
ADD COLUMN IF NOT EXISTS is_editable_price BOOLEAN DEFAULT true; -- هل يمكن تعديل السعر

-- إنشاء مؤشرات للبحث السريع
CREATE INDEX IF NOT EXISTS idx_invoice_items_sku ON public.invoice_items(sku);
CREATE INDEX IF NOT EXISTS idx_invoice_items_barcode ON public.invoice_items(barcode);

-- دالة لحساب قيم الفاتورة تلقائياً
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_invoice_id UUID)
RETURNS void AS $$
DECLARE
    v_total_ht NUMERIC := 0;
    v_total_tva NUMERIC := 0;
    v_total_ttc NUMERIC := 0;
    v_discount_amount NUMERIC := 0;
    v_discount_type TEXT;
    v_discount_percentage NUMERIC;
    v_shipping_amount NUMERIC;
BEGIN
    -- حساب المجاميع من العناصر
    SELECT 
        COALESCE(SUM(total_ht), 0),
        COALESCE(SUM(total_tva), 0),
        COALESCE(SUM(total_ttc), 0)
    INTO v_total_ht, v_total_tva, v_total_ttc
    FROM invoice_items
    WHERE invoice_id = p_invoice_id;
    
    -- جلب معلومات التخفيض والشحن
    SELECT 
        COALESCE(discount_type, 'none'),
        COALESCE(discount_percentage, 0),
        COALESCE(shipping_amount, 0)
    INTO v_discount_type, v_discount_percentage, v_shipping_amount
    FROM invoices
    WHERE id = p_invoice_id;
    
    -- حساب قيمة التخفيض
    IF v_discount_type = 'percentage' THEN
        v_discount_amount := v_total_ttc * (v_discount_percentage / 100);
    ELSIF v_discount_type = 'fixed' THEN
        v_discount_amount := COALESCE((SELECT discount_amount FROM invoices WHERE id = p_invoice_id), 0);
    ELSE
        v_discount_amount := 0;
    END IF;
    
    -- تحديث الفاتورة
    UPDATE invoices SET
        amount_ht = v_total_ht,
        amount_tva = v_total_tva,
        amount_ttc = v_total_ttc + v_shipping_amount - v_discount_amount,
        subtotal_amount = v_total_ht,
        tax_amount = v_total_tva,
        discount_amount = v_discount_amount,
        total_amount = v_total_ttc + v_shipping_amount - v_discount_amount,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- دالة لحساب قيم عنصر الفاتورة
CREATE OR REPLACE FUNCTION calculate_invoice_item_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_tva_rate NUMERIC;
BEGIN
    -- استخدام معدل TVA من العنصر أو القيمة الافتراضية
    v_tva_rate := COALESCE(NEW.tva_rate, 19);
    
    -- حساب السعر قبل الضريبة إذا تم إدخال السعر شامل الضريبة
    IF NEW.unit_price_ttc > 0 AND NEW.unit_price_ht = 0 THEN
        NEW.unit_price_ht := NEW.unit_price_ttc / (1 + (v_tva_rate / 100));
    ELSIF NEW.unit_price_ht > 0 AND NEW.unit_price_ttc = 0 THEN
        NEW.unit_price_ttc := NEW.unit_price_ht * (1 + (v_tva_rate / 100));
    END IF;
    
    -- حساب الإجماليات
    NEW.total_ht := NEW.unit_price_ht * NEW.quantity;
    NEW.total_tva := NEW.total_ht * (v_tva_rate / 100);
    NEW.total_ttc := NEW.total_ht + NEW.total_tva - COALESCE(NEW.discount_amount, 0);
    
    -- تحديث total_price للتوافق مع النظام القديم
    NEW.total_price := NEW.total_ttc;
    NEW.unit_price := NEW.unit_price_ttc;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- محفز لحساب قيم العنصر تلقائياً
DROP TRIGGER IF EXISTS calculate_invoice_item_totals_trigger ON public.invoice_items;
CREATE TRIGGER calculate_invoice_item_totals_trigger
BEFORE INSERT OR UPDATE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION calculate_invoice_item_totals();

-- دالة مساعدة لإعادة حساب إجماليات الفاتورة
CREATE OR REPLACE FUNCTION recalculate_invoice_totals_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_invoice_totals(OLD.invoice_id);
    ELSE
        PERFORM calculate_invoice_totals(NEW.invoice_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- محفز لإعادة حساب إجماليات الفاتورة عند تغيير العناصر
DROP TRIGGER IF EXISTS recalculate_invoice_totals_trigger ON public.invoice_items;
CREATE TRIGGER recalculate_invoice_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION recalculate_invoice_totals_trigger();

-- تعليقات على الحقول الجديدة
COMMENT ON COLUMN invoices.discount_type IS 'نوع التخفيض: percentage (نسبة مئوية), fixed (قيمة ثابتة), none (بدون تخفيض)';
COMMENT ON COLUMN invoices.discount_percentage IS 'نسبة التخفيض المئوية (0-100)';
COMMENT ON COLUMN invoices.tva_rate IS 'معدل الضريبة على القيمة المضافة (TVA) الافتراضي';
COMMENT ON COLUMN invoices.amount_ht IS 'المبلغ الإجمالي قبل الضريبة (Hors Taxe)';
COMMENT ON COLUMN invoices.amount_tva IS 'قيمة الضريبة على القيمة المضافة (TVA)';
COMMENT ON COLUMN invoices.amount_ttc IS 'المبلغ الإجمالي شامل الضريبة (Toutes Taxes Comprises)';

COMMENT ON COLUMN invoice_items.sku IS 'رمز المنتج الفريد (Stock Keeping Unit)';
COMMENT ON COLUMN invoice_items.barcode IS 'الباركود الخاص بالمنتج';
COMMENT ON COLUMN invoice_items.tva_rate IS 'معدل الضريبة على القيمة المضافة للعنصر';
COMMENT ON COLUMN invoice_items.unit_price_ht IS 'سعر الوحدة قبل الضريبة';
COMMENT ON COLUMN invoice_items.unit_price_ttc IS 'سعر الوحدة شامل الضريبة';
COMMENT ON COLUMN invoice_items.total_ht IS 'الإجمالي قبل الضريبة';
COMMENT ON COLUMN invoice_items.total_tva IS 'قيمة الضريبة';
COMMENT ON COLUMN invoice_items.total_ttc IS 'الإجمالي شامل الضريبة';
COMMENT ON COLUMN invoice_items.is_editable_price IS 'هل يمكن تعديل سعر العنصر في الفاتورة';

-- تحديث البيانات الموجودة (إذا كانت هناك فواتير قديمة)
UPDATE invoices SET
    discount_type = 'none',
    tva_rate = 19,
    amount_ht = subtotal_amount,
    amount_tva = tax_amount,
    amount_ttc = total_amount
WHERE discount_type IS NULL;

UPDATE invoice_items SET
    tva_rate = 19,
    unit_price_ht = unit_price / 1.19,
    unit_price_ttc = unit_price,
    total_ht = total_price / 1.19,
    total_tva = (total_price / 1.19) * 0.19,
    total_ttc = total_price,
    is_editable_price = true
WHERE tva_rate IS NULL;
