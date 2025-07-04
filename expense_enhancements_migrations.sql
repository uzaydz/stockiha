-- ===============================================================
-- تحديثات قاعدة البيانات لتحسينات نظام المصاريف
-- يتضمن: دعم الفئات، المصاريف السريعة، والتكامل مع نقطة البيع
-- ===============================================================

-- 1. التأكد من وجود جدول فئات المصاريف مع التحسينات
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT '📁',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- قيود
    CONSTRAINT expense_categories_org_name_unique UNIQUE (organization_id, name),
    CONSTRAINT expense_categories_name_not_empty CHECK (length(trim(name)) > 0)
);

-- 2. تحديث جدول المصاريف لدعم الميزات الجديدة (إضافة أعمدة جديدة فقط إذا لم تكن موجودة)
DO $$
BEGIN
    -- إضافة عمود source إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'source') THEN
        ALTER TABLE expenses ADD COLUMN source TEXT DEFAULT 'web' CHECK (source IN ('web', 'pos', 'mobile', 'api'));
    END IF;
    
    -- إضافة عمود category_id إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'category_id') THEN
        ALTER TABLE expenses ADD COLUMN category_id UUID;
    END IF;
    
    -- إضافة عمود tags إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'tags') THEN
        ALTER TABLE expenses ADD COLUMN tags TEXT[];
    END IF;
    
    -- إضافة عمود reference_number إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'reference_number') THEN
        ALTER TABLE expenses ADD COLUMN reference_number TEXT;
    END IF;
    
    -- إضافة عمود metadata إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'metadata') THEN
        ALTER TABLE expenses ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- إضافة عمود is_deleted إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_deleted') THEN
        ALTER TABLE expenses ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;
    
    -- إضافة عمود deleted_at إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'deleted_at') THEN
        ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. إضافة قيود جدول المصاريف (بطريقة آمنة)
DO $$
BEGIN
    -- إضافة المفتاح الخارجي للفئة إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expenses_category_id_fkey' 
        AND table_name = 'expenses'
    ) THEN
        ALTER TABLE expenses 
        ADD CONSTRAINT expenses_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_is_deleted ON expenses(is_deleted);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

CREATE INDEX IF NOT EXISTS idx_expense_categories_organization_id ON expense_categories(organization_id);

-- 5. دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. إضافة triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- التحقق من وجود trigger للمصاريف وإضافته إذا لم يكن موجوداً
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. دالة لإنشاء الفئات الافتراضية لمنظمة جديدة
CREATE OR REPLACE FUNCTION create_default_expense_categories(org_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO expense_categories (organization_id, name, description, icon, is_default)
    VALUES 
        (org_id, 'أجور الموظفين', 'رواتب ومكافآت الموظفين', '👥', true),
        (org_id, 'إيجار المحل', 'إيجار المتجر والمساحات التجارية', '🏪', true),
        (org_id, 'فواتير الكهرباء', 'فواتير الطاقة والكهرباء والمياه', '⚡', true),
        (org_id, 'مصاريف التسويق', 'إعلانات ومواد تسويقية وترويجية', '📢', true),
        (org_id, 'صيانة وإصلاح', 'صيانة المعدات والأجهزة والمباني', '🔧', true),
        (org_id, 'مواد التنظيف', 'مستلزمات التنظيف والنظافة', '🧽', true),
        (org_id, 'مشتريات عامة', 'مشتريات متنوعة للمتجر', '🛒', true),
        (org_id, 'نقل ومواصلات', 'مصاريف النقل والتوصيل', '🚗', true),
        (org_id, 'أخرى', 'مصاريف متنوعة أخرى', '📁', true)
    ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 8. دالة للحصول على إحصائيات المصاريف المحسنة
CREATE OR REPLACE FUNCTION get_expense_stats_enhanced(org_id UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS TABLE (
    total_expenses NUMERIC,
    total_count BIGINT,
    avg_expense NUMERIC,
    max_expense NUMERIC,
    min_expense NUMERIC,
    pos_expenses NUMERIC,
    web_expenses NUMERIC,
    mobile_expenses NUMERIC,
    by_category JSONB,
    by_month JSONB,
    recent_trend NUMERIC
) AS $$
DECLARE
    _start_date DATE := COALESCE(start_date, DATE_TRUNC('month', CURRENT_DATE));
    _end_date DATE := COALESCE(end_date, CURRENT_DATE);
    _prev_start DATE := _start_date - INTERVAL '1 month';
    _prev_end DATE := _end_date - INTERVAL '1 month';
BEGIN
    RETURN QUERY
    WITH expense_data AS (
        SELECT 
            e.amount,
            e.source,
            ec.name as category_name,
            ec.icon as category_icon,
            DATE_TRUNC('month', e.expense_date) as expense_month
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.organization_id = org_id
          AND e.expense_date BETWEEN _start_date AND _end_date
          AND COALESCE(e.is_deleted, false) = false
    ),
    prev_total AS (
        SELECT COALESCE(SUM(amount), 0) as prev_amount
        FROM expenses e
        WHERE e.organization_id = org_id
          AND e.expense_date BETWEEN _prev_start AND _prev_end
          AND COALESCE(e.is_deleted, false) = false
    ),
    stats AS (
        SELECT 
            COALESCE(SUM(ed.amount), 0) as total_amt,
            COUNT(*) as total_cnt,
            COALESCE(AVG(ed.amount), 0) as avg_amt,
            COALESCE(MAX(ed.amount), 0) as max_amt,
            COALESCE(MIN(ed.amount), 0) as min_amt,
            COALESCE(SUM(CASE WHEN ed.source = 'pos' THEN ed.amount ELSE 0 END), 0) as pos_amt,
            COALESCE(SUM(CASE WHEN ed.source = 'web' THEN ed.amount ELSE 0 END), 0) as web_amt,
            COALESCE(SUM(CASE WHEN ed.source = 'mobile' THEN ed.amount ELSE 0 END), 0) as mobile_amt,
            (
                SELECT jsonb_object_agg(
                    COALESCE(category_name, 'غير مصنف'),
                    jsonb_build_object(
                        'amount', SUM(amount),
                        'count', COUNT(*),
                        'icon', COALESCE(category_icon, '📁')
                    )
                )
                FROM expense_data
                GROUP BY category_name, category_icon
            ) as by_cat,
            (
                SELECT jsonb_object_agg(
                    TO_CHAR(expense_month, 'YYYY-MM'),
                    SUM(amount)
                )
                FROM expense_data
                GROUP BY expense_month
            ) as by_mon,
            pt.prev_amount
        FROM expense_data ed, prev_total pt
    )
    SELECT 
        s.total_amt,
        s.total_cnt,
        s.avg_amt,
        s.max_amt,
        s.min_amt,
        s.pos_amt,
        s.web_amt,
        s.mobile_amt,
        COALESCE(s.by_cat, '{}'::jsonb),
        COALESCE(s.by_mon, '{}'::jsonb),
        CASE 
            WHEN s.prev_amount > 0 THEN 
                ROUND(((s.total_amt - s.prev_amount) / s.prev_amount * 100)::numeric, 2)
            ELSE 0 
        END
    FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- 9. دالة للحصول على أهم الفئات
CREATE OR REPLACE FUNCTION get_top_expense_categories(org_id UUID, limit_count INTEGER DEFAULT 5, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    category_name TEXT,
    category_icon TEXT,
    total_amount NUMERIC,
    expense_count BIGINT,
    avg_amount NUMERIC,
    percentage NUMERIC
) AS $$
DECLARE
    _start_date DATE := CURRENT_DATE - INTERVAL '1 day' * days_back;
    _total_expenses NUMERIC;
BEGIN
    -- حساب إجمالي المصاريف
    SELECT COALESCE(SUM(amount), 0) INTO _total_expenses
    FROM expenses e
    WHERE e.organization_id = org_id
      AND e.expense_date >= _start_date
      AND COALESCE(e.is_deleted, false) = false;
    
    RETURN QUERY
    SELECT 
        COALESCE(ec.name, 'غير مصنف') as cat_name,
        COALESCE(ec.icon, '📁') as cat_icon,
        SUM(e.amount) as total_amt,
        COUNT(e.id) as exp_count,
        ROUND(AVG(e.amount), 2) as avg_amt,
        CASE 
            WHEN _total_expenses > 0 THEN 
                ROUND((SUM(e.amount) / _total_expenses * 100)::numeric, 2)
            ELSE 0 
        END as pct
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.organization_id = org_id
      AND e.expense_date >= _start_date
      AND COALESCE(e.is_deleted, false) = false
    GROUP BY ec.name, ec.icon
    ORDER BY total_amt DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 10. دالة للبحث في المصاريف
CREATE OR REPLACE FUNCTION search_expenses(
    org_id UUID,
    search_term TEXT DEFAULT NULL,
    category_ids UUID[] DEFAULT NULL,
    source_filter TEXT DEFAULT NULL,
    min_amount NUMERIC DEFAULT NULL,
    max_amount NUMERIC DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    amount NUMERIC,
    expense_date DATE,
    category_name TEXT,
    category_icon TEXT,
    source TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.amount,
        e.expense_date,
        COALESCE(ec.name, 'غير مصنف') as category_name,
        COALESCE(ec.icon, '📁') as category_icon,
        COALESCE(e.source, 'web') as source,
        e.description as notes,
        e.created_at
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.organization_id = org_id
      AND COALESCE(e.is_deleted, false) = false
      AND (search_term IS NULL OR (
          e.title ILIKE '%' || search_term || '%' OR
          e.description ILIKE '%' || search_term || '%' OR
          ec.name ILIKE '%' || search_term || '%'
      ))
      AND (category_ids IS NULL OR e.category_id = ANY(category_ids))
      AND (source_filter IS NULL OR e.source = source_filter)
      AND (min_amount IS NULL OR e.amount >= min_amount)
      AND (max_amount IS NULL OR e.amount <= max_amount)
      AND (start_date IS NULL OR e.expense_date >= start_date)
      AND (end_date IS NULL OR e.expense_date <= end_date)
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- 11. إنشاء view للمصاريف مع الفئات
CREATE OR REPLACE VIEW expenses_with_categories AS
SELECT 
    e.id,
    e.organization_id,
    e.title,
    e.amount,
    e.expense_date,
    e.description,
    COALESCE(e.source, 'web') as source,
    e.payment_method,
    e.receipt_url,
    e.created_by,
    e.is_recurring,
    e.status,
    e.tags,
    e.reference_number,
    e.metadata,
    e.created_at,
    e.updated_at,
    ec.id as category_id,
    COALESCE(ec.name, 'غير مصنف') as category_name,
    COALESCE(ec.icon, '📁') as category_icon,
    COALESCE(ec.color, '#3B82F6') as category_color,
    ec.description as category_description
FROM expenses e
LEFT JOIN expense_categories ec ON e.category_id = ec.id
WHERE COALESCE(e.is_deleted, false) = false;

-- 12. إنشاء trigger لضمان وجود فئة افتراضية عند إضافة مصروف بدون فئة
CREATE OR REPLACE FUNCTION ensure_expense_category()
RETURNS TRIGGER AS $$
DECLARE
    default_category_id UUID;
BEGIN
    -- إذا لم يتم تحديد فئة، استخدم الفئة الافتراضية "أخرى"
    IF NEW.category_id IS NULL THEN
        SELECT id INTO default_category_id
        FROM expense_categories
        WHERE organization_id = NEW.organization_id
          AND name = 'أخرى'
        LIMIT 1;
        
        -- إذا لم توجد فئة "أخرى"، أنشئها
        IF default_category_id IS NULL THEN
            INSERT INTO expense_categories (organization_id, name, description, icon, is_default)
            VALUES (NEW.organization_id, 'أخرى', 'مصاريف متنوعة', '📁', true)
            RETURNING id INTO default_category_id;
        END IF;
        
        NEW.category_id := default_category_id;
    END IF;
    
    -- تعيين مصدر افتراضي إذا لم يتم تحديده
    IF NEW.source IS NULL THEN
        NEW.source := 'web';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_expense_category_trigger ON expenses;
CREATE TRIGGER ensure_expense_category_trigger
    BEFORE INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_expense_category();

-- 13. دالة للحصول على ملخص المصاريف للوحة المراقبة
CREATE OR REPLACE FUNCTION get_expense_dashboard_summary(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    today_expenses NUMERIC;
    week_expenses NUMERIC;
    month_expenses NUMERIC;
    year_expenses NUMERIC;
    pos_percentage NUMERIC;
    top_categories JSONB;
    recent_expenses JSONB;
BEGIN
    -- مصاريف اليوم
    SELECT COALESCE(SUM(amount), 0) INTO today_expenses
    FROM expenses
    WHERE organization_id = org_id
      AND expense_date = CURRENT_DATE
      AND COALESCE(is_deleted, false) = false;
    
    -- مصاريف الأسبوع
    SELECT COALESCE(SUM(amount), 0) INTO week_expenses
    FROM expenses
    WHERE organization_id = org_id
      AND expense_date >= DATE_TRUNC('week', CURRENT_DATE)
      AND COALESCE(is_deleted, false) = false;
    
    -- مصاريف الشهر
    SELECT COALESCE(SUM(amount), 0) INTO month_expenses
    FROM expenses
    WHERE organization_id = org_id
      AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND COALESCE(is_deleted, false) = false;
    
    -- مصاريف السنة
    SELECT COALESCE(SUM(amount), 0) INTO year_expenses
    FROM expenses
    WHERE organization_id = org_id
      AND expense_date >= DATE_TRUNC('year', CURRENT_DATE)
      AND COALESCE(is_deleted, false) = false;
    
    -- نسبة المصاريف من نقطة البيع
    SELECT 
        CASE 
            WHEN month_expenses > 0 THEN
                ROUND((COALESCE(SUM(CASE WHEN source = 'pos' THEN amount ELSE 0 END), 0) / month_expenses * 100)::numeric, 1)
            ELSE 0 
        END INTO pos_percentage
    FROM expenses
    WHERE organization_id = org_id
      AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND COALESCE(is_deleted, false) = false;
    
    -- أهم الفئات
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', category_name,
            'icon', category_icon,
            'amount', total_amount,
            'count', expense_count
        )
    ) INTO top_categories
    FROM get_top_expense_categories(org_id, 5, 30);
    
    -- آخر المصاريف
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'category', category_name,
            'icon', category_icon,
            'source', source,
            'date', expense_date,
            'created_at', created_at
        )
    ) INTO recent_expenses
    FROM (
        SELECT *
        FROM search_expenses(org_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, 0)
    ) recent;
    
    -- بناء النتيجة
    result := jsonb_build_object(
        'today', today_expenses,
        'week', week_expenses,
        'month', month_expenses,
        'year', year_expenses,
        'pos_percentage', COALESCE(pos_percentage, 0),
        'top_categories', COALESCE(top_categories, '[]'::jsonb),
        'recent_expenses', COALESCE(recent_expenses, '[]'::jsonb),
        'generated_at', CURRENT_TIMESTAMP
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 14. إدراج الفئات الافتراضية للمنظمات الموجودة
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN 
        SELECT DISTINCT organization_id 
        FROM users 
        WHERE organization_id IS NOT NULL
    LOOP
        PERFORM create_default_expense_categories(org_record.organization_id);
    END LOOP;
END $$;

-- 15. تحديث المصاريف الموجودة لربطها بالفئات (إذا كانت تستخدم النظام القديم)
DO $$
DECLARE
    expense_record RECORD;
    category_id_var UUID;
BEGIN
    FOR expense_record IN 
        SELECT id, organization_id, category
        FROM expenses 
        WHERE category_id IS NULL 
          AND category IS NOT NULL
          AND category != ''
    LOOP
        -- البحث عن الفئة بالاسم
        SELECT ec.id INTO category_id_var
        FROM expense_categories ec
        WHERE ec.organization_id = expense_record.organization_id
          AND ec.name = expense_record.category
        LIMIT 1;
        
        -- إذا لم توجد، إنشاء فئة جديدة
        IF category_id_var IS NULL THEN
            INSERT INTO expense_categories (organization_id, name, description, icon)
            VALUES (expense_record.organization_id, expense_record.category, 'فئة تم إنشاؤها تلقائياً', '📁')
            RETURNING id INTO category_id_var;
        END IF;
        
        -- تحديث المصروف
        UPDATE expenses 
        SET category_id = category_id_var
        WHERE id = expense_record.id;
    END LOOP;
END $$;

-- 16. إشعار عند إكمال التحديثات
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'تم إكمال تحديثات قاعدة البيانات لنظام المصاريف المحسن بنجاح!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'الميزات الجديدة:';
    RAISE NOTICE '  ✓ نظام فئات المصاريف المحسن';
    RAISE NOTICE '  ✓ دعم المصاريف السريعة من نقطة البيع';
    RAISE NOTICE '  ✓ تتبع مصدر المصاريف (ويب، نقطة بيع، موبايل)';
    RAISE NOTICE '  ✓ دوال البحث والإحصائيات المحسنة';
    RAISE NOTICE '  ✓ العلامات والبيانات الوصفية';
    RAISE NOTICE '  ✓ الحذف الناعم والأمان المحسن';
    RAISE NOTICE '  ✓ واجهات برمجة التطبيقات المحسنة';
    RAISE NOTICE '=================================================';
END $$; 