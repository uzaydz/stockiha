-- ======================================================================
-- إضافة عمود permissions إلى جدول subscription_plans
-- تاريخ الإنشاء: 2025-08-25
-- ======================================================================

-- 1. إضافة عمود permissions إلى جدول subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- 2. تحديث خطط الاشتراك الموجودة بالصلاحيات المناسبة
UPDATE subscription_plans 
SET permissions = '{
  "accessPOS": true,
  "viewPOSOrders": true,
  "viewDebts": true,
  "manageOrders": true,
  "manageInventory": true,
  "read:repairs": true,
  "write:repairs": true,
  "manage:repair-locations": true,
  "read:subscriptions": true,
  "write:subscriptions": true,
  "manage:subscription-categories": true,
  "read:flexi": true,
  "write:flexi": true,
  "read:crypto": true,
  "write:crypto": true,
  "manage:flexi-networks": true,
  "manageCallCenter": true,
  "viewCallCenterReports": true,
  "manageCallCenterAgents": true,
  "viewCallCenterMonitoring": true,
  "manageGameDownloads": true,
  "viewGameOrders": true,
  "manageGameCatalog": true,
  "viewGameReports": true
}'::jsonb
WHERE code = 'trial';

UPDATE subscription_plans 
SET permissions = '{
  "accessPOS": true,
  "viewPOSOrders": true,
  "viewDebts": true,
  "manageOrders": true,
  "manageInventory": true,
  "read:repairs": true,
  "write:repairs": true,
  "manage:repair-locations": true,
  "read:subscriptions": true,
  "write:subscriptions": true,
  "manage:subscription-categories": true,
  "read:flexi": true,
  "write:flexi": true,
  "read:crypto": true,
  "write:crypto": true,
  "manage:flexi-networks": true,
  "manageCallCenter": true,
  "viewCallCenterReports": true,
  "manageCallCenterAgents": true,
  "viewCallCenterMonitoring": true,
  "manageGameDownloads": true,
  "viewGameOrders": true,
  "manageGameCatalog": true,
  "viewGameReports": true
}'::jsonb
WHERE code = 'basic';

UPDATE subscription_plans 
SET permissions = '{
  "accessPOS": true,
  "viewPOSOrders": true,
  "viewDebts": true,
  "manageOrders": true,
  "manageInventory": true,
  "read:repairs": true,
  "write:repairs": true,
  "manage:repair-locations": true,
  "read:subscriptions": true,
  "write:subscriptions": true,
  "manage:subscription-categories": true,
  "read:flexi": true,
  "write:flexi": true,
  "read:crypto": true,
  "write:crypto": true,
  "manage:flexi-networks": true,
  "manageCallCenter": true,
  "viewCallCenterReports": true,
  "manageCallCenterAgents": true,
  "viewCallCenterMonitoring": true,
  "manageGameDownloads": true,
  "viewGameOrders": true,
  "manageGameCatalog": true,
  "viewGameReports": true
}'::jsonb
WHERE code = 'premium';

UPDATE subscription_plans 
SET permissions = '{
  "accessPOS": true,
  "viewPOSOrders": true,
  "viewDebts": true,
  "manageOrders": true,
  "manageInventory": true,
  "read:repairs": true,
  "write:repairs": true,
  "manage:repair-locations": true,
  "read:subscriptions": true,
  "write:subscriptions": true,
  "manage:subscription-categories": true,
  "read:flexi": true,
  "write:flexi": true,
  "read:crypto": true,
  "write:crypto": true,
  "manage:flexi-networks": true,
  "manageCallCenter": true,
  "viewCallCenterReports": true,
  "manageCallCenterAgents": true,
  "viewCallCenterMonitoring": true,
  "manageGameDownloads": true,
  "viewGameOrders": true,
  "manageGameCatalog": true,
  "viewGameReports": true
}'::jsonb
WHERE code = 'enterprise';

-- 3. تحديث خطة "تجار إلكترونيين مبتدئين" لتتضمن فقط صلاحيات التجارة الإلكترونية
UPDATE subscription_plans 
SET permissions = '{
  "accessPOS": false,
  "viewPOSOrders": false,
  "viewDebts": false,
  "manageOrders": false,
  "manageInventory": false,
  "read:repairs": false,
  "write:repairs": false,
  "manage:repair-locations": false,
  "read:subscriptions": true,
  "write:subscriptions": true,
  "manage:subscription-categories": true,
  "read:flexi": false,
  "write:flexi": false,
  "read:crypto": false,
  "write:crypto": false,
  "manage:flexi-networks": false,
  "manageCallCenter": false,
  "viewCallCenterReports": false,
  "manageCallCenterAgents": false,
  "viewCallCenterMonitoring": false,
  "manageGameDownloads": false,
  "viewGameOrders": false,
  "manageGameCatalog": false,
  "viewGameReports": false
}'::jsonb
WHERE code = 'ecommerce_starter';

-- 4. التحقق من التحديثات
SELECT 
  code,
  name,
  permissions
FROM subscription_plans 
ORDER BY display_order;

-- ======================================================================
-- ملاحظات:
-- ======================================================================
-- 1. تم إضافة عمود permissions إلى جدول subscription_plans
-- 2. تم تحديث جميع الخطط بالصلاحيات المناسبة
-- 3. خطة "تجار إلكترونيين مبتدئين" لا تتضمن صلاحيات POS
-- 4. خطة "تجار إلكترونيين مبتدئين" تتضمن فقط صلاحيات التجارة الإلكترونية
-- ======================================================================
