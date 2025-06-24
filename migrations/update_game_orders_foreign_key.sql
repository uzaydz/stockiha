-- Migration: تحديث جدول game_download_orders لدعم حذف الألعاب دون حذف الطلبات
-- تاريخ الإنشاء: 2025-01-01

BEGIN;

-- 1. إضافة الحقول الجديدة لحفظ معلومات اللعبة
ALTER TABLE game_download_orders 
ADD COLUMN IF NOT EXISTS game_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS game_platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS game_price DECIMAL(10,2);

-- 2. تحديث الحقول الجديدة بالبيانات الموجودة
UPDATE game_download_orders 
SET 
    game_name = gc.name,
    game_platform = gc.platform,
    game_price = gc.price
FROM games_catalog gc 
WHERE game_download_orders.game_id = gc.id
AND game_download_orders.game_name IS NULL;

-- 3. حذف القيد الأجنبي القديم
ALTER TABLE game_download_orders 
DROP CONSTRAINT IF EXISTS game_download_orders_game_id_fkey;

-- 4. تعديل العمود ليصبح nullable
ALTER TABLE game_download_orders 
ALTER COLUMN game_id DROP NOT NULL;

-- 5. إضافة القيد الأجنبي الجديد مع SET NULL
ALTER TABLE game_download_orders 
ADD CONSTRAINT game_download_orders_game_id_fkey 
FOREIGN KEY (game_id) REFERENCES games_catalog(id) ON DELETE SET NULL;

-- 6. إنشاء trigger لتحديث معلومات اللعبة تلقائياً عند إنشاء طلب جديد
CREATE OR REPLACE FUNCTION update_game_info_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا تم تحديد game_id، احصل على معلومات اللعبة
    IF NEW.game_id IS NOT NULL THEN
        SELECT name, platform, price 
        INTO NEW.game_name, NEW.game_platform, NEW.game_price
        FROM games_catalog 
        WHERE id = NEW.game_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. إنشاء trigger للطلبات الجديدة
DROP TRIGGER IF EXISTS trigger_update_game_info_on_order ON game_download_orders;
CREATE TRIGGER trigger_update_game_info_on_order
    BEFORE INSERT OR UPDATE OF game_id ON game_download_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_game_info_on_order();

-- 8. إضافة index للبحث بالألعاب المحذوفة
CREATE INDEX IF NOT EXISTS idx_game_orders_deleted_games 
ON game_download_orders(organization_id, game_name) 
WHERE game_id IS NULL;

COMMIT; 