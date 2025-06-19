-- إضافة منتجات تجريبية لاختبار نظام المخزون
-- يمكن تشغيل هذا الملف في Supabase SQL Editor

-- التأكد من وجود جدول المنتجات
-- إذا لم يكن موجوداً، قم بإنشاؤه أولاً

-- إضافة منتجات تجريبية
INSERT INTO products (
  id,
  name,
  description,
  price,
  sku,
  category,
  stock_quantity,
  min_stock_level,
  reorder_level,
  reorder_quantity,
  images,
  thumbnail_image,
  is_digital,
  is_featured,
  created_at,
  updated_at
) VALUES 
-- منتج 1: تيشرت قطني
(
  'test-product-1',
  'تيشرت قطني أزرق',
  'تيشرت قطني عالي الجودة باللون الأزرق، مناسب للاستخدام اليومي',
  50.00,
  'TSHIRT-BLUE-001',
  'clothing',
  25,
  5,
  10,
  50,
  '[]',
  '',
  false,
  true,
  NOW(),
  NOW()
),

-- منتج 2: حذاء رياضي
(
  'test-product-2',
  'حذاء رياضي أبيض',
  'حذاء رياضي مريح للجري والرياضة، مصنوع من مواد عالية الجودة',
  120.00,
  'SHOE-WHITE-002',
  'footwear',
  15,
  3,
  5,
  20,
  '[]',
  '',
  false,
  false,
  NOW(),
  NOW()
),

-- منتج 3: حقيبة يد
(
  'test-product-3',
  'حقيبة يد جلدية',
  'حقيبة يد أنيقة مصنوعة من الجلد الطبيعي، مناسبة للمناسبات الرسمية',
  200.00,
  'BAG-LEATHER-003',
  'accessories',
  8,
  2,
  5,
  15,
  '[]',
  '',
  false,
  true,
  NOW(),
  NOW()
),

-- منتج 4: ساعة ذكية (مخزون منخفض)
(
  'test-product-4',
  'ساعة ذكية سوداء',
  'ساعة ذكية متقدمة مع مراقب معدل ضربات القلب وGPS',
  300.00,
  'WATCH-SMART-004',
  'electronics',
  3,
  5,
  10,
  25,
  '[]',
  '',
  false,
  true,
  NOW(),
  NOW()
),

-- منتج 5: كتاب (نفذ من المخزون)
(
  'test-product-5',
  'كتاب البرمجة المتقدمة',
  'دليل شامل لتعلم البرمجة المتقدمة باللغة العربية',
  80.00,
  'BOOK-PROG-005',
  'books',
  0,
  5,
  10,
  30,
  '[]',
  '',
  false,
  false,
  NOW(),
  NOW()
),

-- منتج 6: سماعات (مخزون جيد)
(
  'test-product-6',
  'سماعات لاسلكية',
  'سماعات بلوتوث عالية الجودة مع إلغاء الضوضاء',
  150.00,
  'HEADPHONES-006',
  'electronics',
  35,
  5,
  10,
  40,
  '[]',
  '',
  false,
  true,
  NOW(),
  NOW()
);

-- إضافة رسالة تأكيد
SELECT 'تم إضافة 6 منتجات تجريبية بنجاح!' as message;

-- عرض المنتجات المضافة
SELECT 
  name,
  sku,
  category,
  stock_quantity,
  price,
  CASE 
    WHEN stock_quantity = 0 THEN 'نفذ من المخزون'
    WHEN stock_quantity <= min_stock_level THEN 'مخزون منخفض'
    ELSE 'متوفر'
  END as stock_status
FROM products 
WHERE id LIKE 'test-product-%'
ORDER BY stock_quantity DESC; 