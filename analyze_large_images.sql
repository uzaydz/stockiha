-- تحليل الصور الكبيرة التي تحتاج ضغط وتحسين
-- يحدد هذا الاستعلام الصور التي يزيد حجمها عن 100KB

SELECT
    pc.id as color_id,
    pc.name as color_name,
    p.name as product_name,
    length(pc.image_url) as image_size_bytes,
    ROUND(length(pc.image_url) / 1024.0, 2) as image_size_kb,
    ROUND(length(pc.image_url) / (1024.0 * 1024.0), 2) as image_size_mb,
    CASE
        WHEN length(pc.image_url) > 1000000 THEN 'ضخم (>1MB)'
        WHEN length(pc.image_url) > 500000 THEN 'كبير (500KB-1MB)'
        WHEN length(pc.image_url) > 200000 THEN 'متوسط (200-500KB)'
        WHEN length(pc.image_url) > 100000 THEN 'صغير (100-200KB)'
        ELSE 'صغير جداً (<100KB)'
    END as size_category,
    CASE
        WHEN pc.image_url LIKE 'data:image/png%' THEN 'PNG'
        WHEN pc.image_url LIKE 'data:image/jpeg%' THEN 'JPEG'
        WHEN pc.image_url LIKE 'data:image/jpg%' THEN 'JPG'
        WHEN pc.image_url LIKE 'data:image/webp%' THEN 'WebP'
        ELSE 'غير محدد'
    END as format,
    CASE
        WHEN length(pc.image_url) > 500000 THEN 'يحتاج ضغط عالي'
        WHEN length(pc.image_url) > 200000 THEN 'يحتاج ضغط متوسط'
        WHEN length(pc.image_url) > 100000 THEN 'يحتاج ضغط خفيف'
        ELSE 'جيد'
    END as compression_recommendation
FROM product_colors pc
JOIN products p ON pc.product_id = p.id
WHERE pc.image_url IS NOT NULL
    AND length(pc.image_url) > 100000 -- أكبر من 100KB
ORDER BY length(pc.image_url) DESC;
