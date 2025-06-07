-- إنشاء سياسات الأمان (RLS)
ALTER TABLE subscription_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_service_inventory ENABLE ROW LEVEL SECURITY;

-- سياسة لفئات الخدمات (قراءة عامة)
CREATE POLICY "Allow read subscription_service_categories for all users" ON subscription_service_categories
    FOR SELECT USING (true);

-- سياسات خدمات الاشتراكات (خاصة بالمؤسسة)
CREATE POLICY "Allow all operations on subscription_services for organization members" ON subscription_services
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_users 
            WHERE user_id = auth.uid()
        )
    );

-- سياسة المخزون
CREATE POLICY "Allow all operations on subscription_service_inventory for organization members" ON subscription_service_inventory
    FOR ALL USING (
        service_id IN (
            SELECT id 
            FROM subscription_services 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_users 
                WHERE user_id = auth.uid()
            )
        )
    ); 