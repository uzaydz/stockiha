import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import SettingsNav from '@/components/settings/components/SettingsNav';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { SettingsTab } from '@/components/settings/components/SettingsNav';
import { 
  User, 
  Palette, 
  ShieldCheck, 
  Bell, 
  Building, 
  CreditCard, 
  Link2, 
  Settings2 
} from 'lucide-react';

// استيراد مكونات الإعدادات
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import OrganizationSettingsPage from '@/components/settings/OrganizationSettings';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';

const SettingsPage = () => {
  const { section = 'profile' } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization, isOrgAdmin } = useTenant();
  const [activeTab, setActiveTab] = useState(section);

  useEffect(() => {
    setActiveTab(section);
  }, [section]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/dashboard/settings/${value}`);
  };

  // تحديد الإعدادات المتاحة حسب دور المستخدم
  const getAvailableTabs = (): SettingsTab[] => {
    const tabs: SettingsTab[] = [
      { id: 'profile', label: 'الملف الشخصي', icon: 'User' },
      { id: 'appearance', label: 'المظهر', icon: 'Palette' },
      { id: 'security', label: 'الأمان والخصوصية', icon: 'ShieldCheck' },
      { id: 'notifications', label: 'الإشعارات', icon: 'Bell' }
    ];
    
    // إعدادات إضافية للمسؤول
    if (isOrgAdmin) {
      tabs.push(
        { id: 'organization', label: 'المؤسسة', icon: 'Building' },
        { id: 'billing', label: 'الفوترة والاشتراكات', icon: 'CreditCard' },
        { id: 'integrations', label: 'الربط والتكامل', icon: 'Link2' },
        { id: 'advanced', label: 'إعدادات متقدمة', icon: 'Settings2' }
      );
    }
    
    return tabs;
  };

  // عرض المكون المطلوب حسب التبويب النشط
  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'profile':
        return <div>صفحة الملف الشخصي قيد الإنشاء...</div>;
      case 'security':
        return <div>صفحة الأمان والخصوصية قيد الإنشاء...</div>;
      case 'notifications':
        return <div>صفحة الإشعارات قيد الإنشاء...</div>;
      case 'organization':
        return <OrganizationSettingsPage />;
      case 'billing':
        return <div>صفحة الفوترة والاشتراكات قيد الإنشاء...</div>;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'advanced':
        return <div>صفحة الإعدادات المتقدمة قيد الإنشاء...</div>;
      default:
        return <div>صفحة غير موجودة</div>;
    }
  };

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
            <p className="text-muted-foreground">
              إدارة حسابك وتخصيص تجربتك في النظام
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* قائمة تنقل الإعدادات */}
          <div className="md:w-1/4">
            <SettingsNav 
              tabs={getAvailableTabs()} 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>

          {/* محتوى الإعدادات */}
          <div className="md:w-3/4">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value={activeTab} forceMount>
                {renderTabContent()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage; 