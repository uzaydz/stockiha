-- تحسين فهرسة جدول organizations بطريقة CONCURRENTLY
-- يجب تشغيل هذه الأوامر منفصلة (خارج transaction block)
-- استخدم هذا الملف إذا كنت تريد إنشاء الفهارس دون قفل الجدول

-- تشغيل كل أمر منفصلاً:

-- 1. فهرس النطاق الفرعي
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_subdomain_fast ON organizations (subdomain) WHERE subdomain IS NOT NULL AND subdomain != '';

-- 2. فهرس النطاق المخصص
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_domain_fast ON organizations (domain) WHERE domain IS NOT NULL AND domain != '';

-- 3. فهرس مركب
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_subdomain_status ON organizations (subdomain, status) WHERE subdomain IS NOT NULL AND subdomain != '';

-- ملاحظة: قم بتشغيل كل أمر CREATE INDEX CONCURRENTLY منفصلاً في psql أو أداة إدارة قاعدة البيانات

-- بعد إنشاء الفهارس، قم بتشغيل:
-- ANALYZE organizations;
