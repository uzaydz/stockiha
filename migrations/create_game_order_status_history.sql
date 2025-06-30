-- إنشاء جدول سجل حالات طلبات الألعاب
CREATE TABLE IF NOT EXISTS game_order_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_game_order_status_history_order_id ON game_order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_game_order_status_history_created_at ON game_order_status_history(created_at);

-- تعليق على الجدول
COMMENT ON TABLE game_order_status_history IS 'سجل تاريخ تغييرات حالات طلبات الألعاب';
COMMENT ON COLUMN game_order_status_history.order_id IS 'معرف الطلب';
COMMENT ON COLUMN game_order_status_history.status IS 'الحالة الجديدة';
COMMENT ON COLUMN game_order_status_history.notes IS 'ملاحظات حول التغيير'; 