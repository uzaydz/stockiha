-- =========================================
-- بيانات اختبارية للمنتجات لتجربة نظام البحث والفلترة
-- =========================================

-- ملاحظة: هذا الملف مخصص للبيئة التطويرية فقط
-- يجب عدم تشغيله في بيئة الإنتاج

DO $$
DECLARE
    test_org_id UUID;
    test_user_id UUID;
BEGIN
    -- العثور على مؤسسة للاختبار (أول مؤسسة متاحة)
    SELECT id INTO test_org_id FROM organizations LIMIT 1;
    
    -- العثور على مستخدم للاختبار (أول مستخدم متاح)
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- التحقق من وجود المؤسسة والمستخدم
    IF test_org_id IS NULL OR test_user_id IS NULL THEN
        RAISE NOTICE 'تحذير: لم يتم العثور على مؤسسة أو مستخدم للاختبار. تخطي إنشاء بيانات الاختبار.';
        RETURN;
    END IF;
    
    -- إدراج بيانات اختبارية للمنتجات
    INSERT INTO products (
        name, description, price, compare_at_price, sku, barcode, 
        stock_quantity, is_digital, is_new, is_featured, 
        organization_id, created_by_user_id, updated_by_user_id,
        category, brand, is_active
    ) VALUES 
    -- منتجات إلكترونية
    ('هاتف ذكي سامسونغ جالاكسي', 'هاتف ذكي حديث مع كاميرا عالية الجودة', 45000.00, 50000.00, 'PHONE-SAM-001', '1234567890123', 15, false, true, true, test_org_id, test_user_id, test_user_id, 'إلكترونيات', 'سامسونغ', true),
    ('لابتوب آسوس فيفو بوك', 'لابتوب خفيف الوزن للاستخدام اليومي', 85000.00, 95000.00, 'LAPTOP-ASUS-001', '1234567890124', 8, false, true, false, test_org_id, test_user_id, test_user_id, 'إلكترونيات', 'آسوس', true),
    ('سماعة بلوتوث JBL', 'سماعة لاسلكية بجودة صوت عالية', 12000.00, 15000.00, 'HEADPHONE-JBL-001', '1234567890125', 25, false, false, true, test_org_id, test_user_id, test_user_id, 'إلكترونيات', 'JBL', true),
    ('كاميرا كانون ديجيتال', 'كاميرا احترافية للتصوير الفوتوغرافي', 150000.00, 180000.00, 'CAMERA-CANON-001', '1234567890126', 3, false, true, true, test_org_id, test_user_id, test_user_id, 'إلكترونيات', 'كانون', true),
    ('ساعة ذكية آبل', 'ساعة ذكية مع مراقب صحي', 65000.00, 75000.00, 'WATCH-APPLE-001', '1234567890127', 12, false, true, false, test_org_id, test_user_id, test_user_id, 'إلكترونيات', 'آبل', true),
    
    -- منتجات منزلية
    ('مكنسة كهربائية فيليبس', 'مكنسة كهربائية بقوة شفط عالية', 28000.00, 32000.00, 'VACUUM-PHILIPS-001', '1234567890128', 6, false, false, false, test_org_id, test_user_id, test_user_id, 'منزلية', 'فيليبس', true),
    ('مايكروويف LG', 'فرن مايكروويف بسعة 30 لتر', 35000.00, 40000.00, 'MICROWAVE-LG-001', '1234567890129', 4, false, false, true, test_org_id, test_user_id, test_user_id, 'منزلية', 'LG', true),
    ('ثلاجة سامسونغ', 'ثلاجة كبيرة بباب مزدوج', 120000.00, 140000.00, 'FRIDGE-SAM-001', '1234567890130', 2, false, true, true, test_org_id, test_user_id, test_user_id, 'منزلية', 'سامسونغ', true),
    ('غسالة بوش', 'غسالة أوتوماتيكية بسعة 8 كيلو', 95000.00, 110000.00, 'WASHER-BOSCH-001', '1234567890131', 1, false, false, false, test_org_id, test_user_id, test_user_id, 'منزلية', 'بوش', true),
    
    -- منتجات رياضية
    ('حذاء رياضي نايكي', 'حذاء رياضي مريح للجري', 18000.00, 22000.00, 'SHOES-NIKE-001', '1234567890132', 20, false, true, true, test_org_id, test_user_id, test_user_id, 'رياضة', 'نايكي', true),
    ('كرة قدم أديداس', 'كرة قدم احترافية للملاعب', 8500.00, 10000.00, 'BALL-ADIDAS-001', '1234567890133', 35, false, false, true, test_org_id, test_user_id, test_user_id, 'رياضة', 'أديداس', true),
    ('دراجة هوائية', 'دراجة هوائية للبالغين 26 بوصة', 45000.00, 55000.00, 'BIKE-GIANT-001', '1234567890134', 7, false, true, false, test_org_id, test_user_id, test_user_id, 'رياضة', 'جاينت', true),
    
    -- منتجات كتب ومكتبية
    ('كتاب تعلم البرمجة', 'كتاب شامل لتعلم لغات البرمجة', 3500.00, 4000.00, 'BOOK-PROG-001', '1234567890135', 50, false, true, true, test_org_id, test_user_id, test_user_id, 'كتب', 'دار النشر العربية', true),
    ('دفتر ملاحظات', 'دفتر ملاحظات بغلاف جلدي', 1200.00, 1500.00, 'NOTEBOOK-001', '1234567890136', 100, false, false, false, test_org_id, test_user_id, test_user_id, 'مكتبية', 'مكتبة الطالب', true),
    ('قلم حبر جاف', 'قلم حبر جاف أزرق', 150.00, 200.00, 'PEN-BLUE-001', '1234567890137', 200, false, false, false, test_org_id, test_user_id, test_user_id, 'مكتبية', 'بايلوت', true),
    
    -- منتجات نفدت من المخزون
    ('منتج نفد من المخزون 1', 'منتج لاختبار فلتر المخزون المنتهي', 5000.00, 6000.00, 'OUT-STOCK-001', '1234567890138', 0, false, false, false, test_org_id, test_user_id, test_user_id, 'متنوعة', 'مختلف', true),
    ('منتج نفد من المخزون 2', 'منتج آخر لاختبار فلتر المخزون المنتهي', 8000.00, 9000.00, 'OUT-STOCK-002', '1234567890139', 0, false, false, false, test_org_id, test_user_id, test_user_id, 'متنوعة', 'مختلف', true),
    
    -- منتجات مخزون منخفض
    ('منتج مخزون منخفض 1', 'منتج لاختبار فلتر المخزون المنخفض', 3000.00, 3500.00, 'LOW-STOCK-001', '1234567890140', 2, false, false, false, test_org_id, test_user_id, test_user_id, 'متنوعة', 'مختلف', true),
    ('منتج مخزون منخفض 2', 'منتج آخر لاختبار فلتر المخزون المنخفض', 4500.00, 5000.00, 'LOW-STOCK-002', '1234567890141', 3, false, false, false, test_org_id, test_user_id, test_user_id, 'متنوعة', 'مختلف', true),
    
    -- منتجات رقمية
    ('دورة تدريبية أونلاين', 'دورة تدريبية في تطوير المواقع', 15000.00, 20000.00, 'COURSE-WEB-001', NULL, 999, true, true, true, test_org_id, test_user_id, test_user_id, 'تعليم', 'أكاديمية التطوير', true),
    ('برنامج محاسبة', 'برنامج محاسبة للشركات الصغيرة', 25000.00, 30000.00, 'SOFTWARE-ACC-001', NULL, 999, true, false, true, test_org_id, test_user_id, test_user_id, 'برمجيات', 'شركة البرمجة', true);

    RAISE NOTICE 'تم إنشاء % منتج اختباري بنجاح', 21;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في إنشاء بيانات الاختبار: %', SQLERRM;
END $$;

-- =========================================
-- تحديث التواريخ لمحاكاة منتجات مختلفة العمر
-- =========================================

DO $$
BEGIN
    -- تحديث تواريخ بعض المنتجات لتكون قديمة
    UPDATE products 
    SET created_at = NOW() - INTERVAL '30 days',
        updated_at = NOW() - INTERVAL '5 days'
    WHERE sku LIKE 'LAPTOP%' OR sku LIKE 'CAMERA%';
    
    -- تحديث تواريخ بعض المنتجات لتكون حديثة جداً
    UPDATE products 
    SET created_at = NOW() - INTERVAL '1 day',
        updated_at = NOW() - INTERVAL '1 hour'
    WHERE sku LIKE 'PHONE%' OR sku LIKE 'WATCH%';
    
    -- تحديث تواريخ بعض المنتجات لتكون متوسطة العمر
    UPDATE products 
    SET created_at = NOW() - INTERVAL '15 days',
        updated_at = NOW() - INTERVAL '2 days'
    WHERE sku LIKE 'SHOES%' OR sku LIKE 'BOOK%';
    
    RAISE NOTICE 'تم تحديث تواريخ المنتجات بنجاح';
END $$;

-- =========================================
-- عرض ملخص للبيانات المُدرجة
-- =========================================

DO $$
DECLARE
    total_products INTEGER;
    in_stock INTEGER;
    low_stock INTEGER;
    out_of_stock INTEGER;
    digital_products INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_products FROM products WHERE name LIKE '%اختبار%' OR sku LIKE '%-001' OR sku LIKE '%-002';
    SELECT COUNT(*) INTO in_stock FROM products WHERE stock_quantity > 5 AND (name LIKE '%اختبار%' OR sku LIKE '%-001' OR sku LIKE '%-002');
    SELECT COUNT(*) INTO low_stock FROM products WHERE stock_quantity BETWEEN 1 AND 5 AND (name LIKE '%اختبار%' OR sku LIKE '%-001' OR sku LIKE '%-002');
    SELECT COUNT(*) INTO out_of_stock FROM products WHERE stock_quantity = 0 AND (name LIKE '%اختبار%' OR sku LIKE '%-001' OR sku LIKE '%-002');
    SELECT COUNT(*) INTO digital_products FROM products WHERE is_digital = true AND (name LIKE '%اختبار%' OR sku LIKE '%-001' OR sku LIKE '%-002');
    
    RAISE NOTICE '=== ملخص بيانات الاختبار ===';
    RAISE NOTICE 'إجمالي المنتجات: %', total_products;
    RAISE NOTICE 'منتجات متوفرة (أكثر من 5): %', in_stock;
    RAISE NOTICE 'منتجات مخزون منخفض (1-5): %', low_stock;
    RAISE NOTICE 'منتجات نفدت من المخزون (0): %', out_of_stock;
    RAISE NOTICE 'منتجات رقمية: %', digital_products;
    RAISE NOTICE '=== انتهى الملخص ===';
END $$; 