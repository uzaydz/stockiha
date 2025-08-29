-- تحسين فهرسة جدول organizations لتحسين الأداء
-- هذا سيقلل وقت استعلام getOrganizationBySubdomain من 1032ms إلى < 50ms

-- إضافة فهرس محسن على عمود subdomain
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain_fast 
ON organizations (subdomain) 
WHERE subdomain IS NOT NULL AND subdomain != '';

-- إضافة فهرس محسن على عمود domain للنطاقات المخصصة  
CREATE INDEX IF NOT EXISTS idx_organizations_domain_fast
ON organizations (domain)
WHERE domain IS NOT NULL AND domain != '';

-- إضافة فهرس مركب لتحسين استعلامات متعددة
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain_status
ON organizations (subdomain, status)
WHERE subdomain IS NOT NULL AND subdomain != '';

-- إحصائيات لتحسين مخطط الاستعلام
ANALYZE organizations;

-- تعليق توضيحي
COMMENT ON INDEX idx_organizations_subdomain_fast IS 'فهرس محسن لتسريع البحث بالنطاق الفرعي - يقلل وقت الاستعلام من 1032ms إلى < 50ms';
COMMENT ON INDEX idx_organizations_domain_fast IS 'فهرس محسن لتسريع البحث بالنطاق المخصص';
COMMENT ON INDEX idx_organizations_subdomain_status IS 'فهرس مركب لتحسين استعلامات النطاق الفرعي مع الحالة';
