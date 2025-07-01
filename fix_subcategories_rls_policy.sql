-- إصلاح سياسات RLS للفئات الفرعية
-- إزالة السياسات المتضاربة وإنشاء سياسات جديدة مبسطة

-- إزالة السياسات القديمة المتضاربة
DROP POLICY IF EXISTS "Allow public to view product subcategories" ON product_subcategories;
DROP POLICY IF EXISTS "public_view_product_subcategories" ON product_subcategories;
DROP POLICY IF EXISTS "tenant_subcategories_select" ON product_subcategories;

-- إنشاء سياسة بسيطة للقراءة (للجميع)
CREATE POLICY "subcategories_select_all" ON product_subcategories
    FOR SELECT 
    USING (true);

-- إنشاء سياسة للإدراج (للمستخدمين المصادق عليهم فقط)
DROP POLICY IF EXISTS "tenant_subcategories_insert" ON product_subcategories;
CREATE POLICY "subcategories_insert_authenticated" ON product_subcategories
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- إنشاء سياسة للتحديث (للمستخدمين المصادق عليهم فقط)
CREATE POLICY "subcategories_update_authenticated" ON product_subcategories
    FOR UPDATE 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- إنشاء سياسة للحذف (للمستخدمين المصادق عليهم فقط)
CREATE POLICY "subcategories_delete_authenticated" ON product_subcategories
    FOR DELETE 
    USING (auth.uid() IS NOT NULL);

-- التحقق من السياسات الجديدة
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'product_subcategories'
ORDER BY policyname; 