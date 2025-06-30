-- ===================================================
-- دالة محدثة لجلب بيانات POS الكاملة مع إصلاح الأخطاء
-- ===================================================

CREATE OR REPLACE FUNCTION public.get_pos_complete_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    org_id UUID;
BEGIN
    -- الحصول على organization_id للمستخدم الحالي
    SELECT organization_id INTO org_id
    FROM users 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1;
    
    IF org_id IS NULL THEN
        RETURN '{\"error\": \"No organization found\"}'::json;
    END IF;
    
    SELECT json_build_object(
        'settings', (
            -- جلب إعدادات POS من جدول pos_settings
            SELECT json_build_object(
                'id', ps.id,
                'organization_id', ps.organization_id,
                'store_name', ps.store_name,
                'store_phone', ps.store_phone,
                'store_email', ps.store_email,
                'store_address', ps.store_address,
                'currency_symbol', ps.currency_symbol,
                'allow_price_edit', ps.allow_price_edit,
                'require_manager_approval', ps.require_manager_approval,
                -- إضافة إعدادات التنظيم إذا لزم الأمر
                'organization_settings', (
                    SELECT json_build_object(
                        'id', os.id,
                        'organization_id', os.organization_id,
                        'shipping_settings', os.shipping_settings,
                        'payment_settings', os.payment_settings
                    )
                    FROM organization_settings os
                    WHERE os.organization_id = org_id
                    LIMIT 1
                )
            )
            FROM pos_settings ps
            WHERE ps.organization_id = org_id
            LIMIT 1
        ),
        'products', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', id,
                'name', name,
                'price', price,
                'wholesale_price', wholesale_price,
                'stock_quantity', stock_quantity,
                'category_id', category_id,
                'is_active', is_active,
                'sku', sku,
                'barcode', barcode,
                'description', description,
                'image_url', image_url
            )), '[]'::json)
            FROM products 
            WHERE organization_id = org_id 
            AND is_active = true
            ORDER BY name
            LIMIT 200
        ),
        'categories', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', id,
                'name', name,
                'organization_id', organization_id,
                'description', description,
                'is_active', is_active
            )), '[]'::json)
            FROM categories 
            WHERE organization_id = org_id
            AND is_active = true
            ORDER BY name
        ),
        'customers', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', id,
                'name', name,
                'phone', phone,
                'email', email,
                'address', address
            )), '[]'::json)
            FROM customers 
            WHERE organization_id = org_id
            ORDER BY name
            LIMIT 100
        ),
        'employees', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', id,
                'name', name,
                'email', email,
                'role', role
            )), '[]'::json)
            FROM users
            WHERE organization_id = org_id
            AND is_active = true
            ORDER BY name
            LIMIT 50
        )
    ) INTO result;
    
    RETURN result;
END;
$function$; 