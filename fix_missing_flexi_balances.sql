-- fix_missing_flexi_balances.sql
-- هذا الملف يصلح مشكلة عدم ظهور شبكات الفليكسي عند عرض الأرصدة
-- عن طريق إنشاء سجلات أرصدة تلقائية لجميع شبكات الفليكسي التي ليس لها سجل رصيد

-- بدء المعاملة
BEGIN;

-- إنشاء أو استبدال وظيفة لإصلاح الأرصدة المفقودة
CREATE OR REPLACE FUNCTION fix_missing_flexi_balances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_counter INTEGER := 0;
    v_network RECORD;
BEGIN
    -- تكرار على جميع شبكات الفليكسي التي ليس لها رصيد
    FOR v_network IN 
        SELECT fn.* 
        FROM flexi_networks fn 
        WHERE NOT EXISTS (
            SELECT 1 
            FROM flexi_balances fb 
            WHERE fb.network_id = fn.id AND fb.organization_id = fn.organization_id
        )
    LOOP
        -- إدراج سجل رصيد جديد
        INSERT INTO flexi_balances(
            network_id,
            balance,
            organization_id,
            created_at,
            updated_at
        ) VALUES (
            v_network.id,
            0,  -- رصيد صفر افتراضي
            v_network.organization_id,
            NOW(),
            NOW()
        );
        
        v_counter := v_counter + 1;
    END LOOP;
    
    RETURN v_counter;
END;
$$;

-- تعديل وظيفة الحصول على أرصدة الفليكسي لتتأكد من إنشاء الأرصدة المفقودة أولاً
CREATE OR REPLACE FUNCTION get_all_flexi_balances()
RETURNS TABLE (
    id UUID,
    network_id UUID,
    balance NUMERIC,
    organization_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    network_name TEXT,
    network_icon TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- ابدأ بإصلاح الأرصدة المفقودة
    PERFORM fix_missing_flexi_balances();
    
    -- ثم قم بإرجاع جميع الأرصدة مع معلومات الشبكة
    RETURN QUERY
    SELECT 
        fb.id,
        fb.network_id,
        fb.balance,
        fb.organization_id,
        fb.created_at,
        fb.updated_at,
        fn.name AS network_name,
        fn.icon AS network_icon
    FROM 
        flexi_balances fb
    JOIN 
        flexi_networks fn ON fb.network_id = fn.id;
END;
$$;

-- تنفيذ الوظيفة لإصلاح الأرصدة المفقودة فوراً
SELECT fix_missing_flexi_balances();

-- منح صلاحيات الوصول للوظائف الجديدة
GRANT EXECUTE ON FUNCTION fix_missing_flexi_balances() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_flexi_balances() TO PUBLIC;

-- تحديث وظيفة إدارة رصيد الفليكسي
CREATE OR REPLACE FUNCTION manage_flexi_balance(
    p_network_id UUID,
    p_balance NUMERIC,
    p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_id UUID;
BEGIN
    -- تحقق مما إذا كان سجل الرصيد موجود
    SELECT id INTO v_balance_id
    FROM flexi_balances
    WHERE network_id = p_network_id AND organization_id = p_organization_id;
    
    -- إذا كان الرصيد موجود، قم بتحديثه
    IF v_balance_id IS NOT NULL THEN
        UPDATE flexi_balances
        SET 
            balance = p_balance,
            updated_at = NOW()
        WHERE id = v_balance_id;
    -- إذا لم يكن موجود، قم بإنشائه
    ELSE
        INSERT INTO flexi_balances(
            network_id,
            balance,
            organization_id,
            created_at,
            updated_at
        ) VALUES (
            p_network_id,
            p_balance,
            p_organization_id,
            NOW(),
            NOW()
        ) RETURNING id INTO v_balance_id;
    END IF;
    
    RETURN v_balance_id;
END;
$$;

-- منح الصلاحيات للوظيفة المحدثة
GRANT EXECUTE ON FUNCTION manage_flexi_balance(UUID, NUMERIC, UUID) TO PUBLIC;

-- إتمام المعاملة
COMMIT;

-- تأكد من إظهار كل شيء يعمل
SELECT fn.name AS network_name, fb.balance
FROM flexi_networks fn
LEFT JOIN flexi_balances fb ON fn.id = fb.network_id AND fn.organization_id = fb.organization_id
ORDER BY fn.name; 