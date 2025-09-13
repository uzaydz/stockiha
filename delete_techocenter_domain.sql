-- حذف النطاق techocenter.com من النظام
-- يجب تشغيل هذا في Supabase SQL Editor

BEGIN;

-- 1. حذف سجل التحقق من domain_verifications
DELETE FROM domain_verifications 
WHERE domain = 'techocenter.com' 
AND organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe';

-- 2. حذف النطاق من organizations (تعيينه إلى null)
UPDATE organizations 
SET domain = NULL, updated_at = NOW()
WHERE id = 'fed872f9-1ade-4351-b020-5598fda976fe' 
AND domain = 'techocenter.com';

-- 3. التحقق من النتيجة
-- فحص جدول organizations
SELECT 
    'organizations' as table_name,
    id::text as id, 
    name, 
    COALESCE(domain, 'NULL') as domain 
FROM organizations 
WHERE id = 'fed872f9-1ade-4351-b020-5598fda976fe';

-- فحص جدول domain_verifications  
SELECT 
    'domain_verifications' as table_name,
    organization_id::text as id, 
    domain as name, 
    status as domain
FROM domain_verifications 
WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe';

COMMIT;
