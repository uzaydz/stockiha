-- fix_flexi_balances.sql
-- إنشاء أرصدة إفتراضية لشبكات الفليكسي التي ليس لها رصيد

-- وظيفة لإنشاء سجلات الأرصدة المفقودة
CREATE OR REPLACE FUNCTION initialize_missing_flexi_balances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_counter INTEGER := 0;
    v_network RECORD;
BEGIN
    -- تكرار على شبكات الفليكسي التي ليس لها رصيد
    FOR v_network IN 
        SELECT fn.* 
        FROM flexi_networks fn 
        WHERE NOT EXISTS (
            SELECT 1 
            FROM flexi_balances fb 
            WHERE fb.network_id = fn.id
        )
    LOOP
        -- إدراج سجل جديد للرصيد
        INSERT INTO flexi_balances(
            network_id,
            balance,
            organization_id,
            created_at,
            updated_at
        ) VALUES (
            v_network.id,
            0,  -- ابدأ برصيد صفر
            v_network.organization_id,
            NOW(),
            NOW()
        );
        
        v_counter := v_counter + 1;
    END LOOP;
    
    RETURN v_counter;
END;
$$;

-- تحسين وظيفة get_all_flexi_balances للتأكد من إظهار جميع الشبكات حتى لو لم يكن لها سجل رصيد
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
    -- ابدأ بإنشاء الأرصدة المفقودة
    PERFORM initialize_missing_flexi_balances();
    
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

-- تنفيذ الوظيفة لإنشاء الأرصدة المفقودة
SELECT initialize_missing_flexi_balances();

-- تحقق من الأرصدة الجديدة
SELECT * FROM get_all_flexi_balances();

-- منح صلاحيات الوصول للوظائف الجديدة
GRANT EXECUTE ON FUNCTION initialize_missing_flexi_balances() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_flexi_balances() TO PUBLIC; 