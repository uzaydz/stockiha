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
  ShieldCheck, 
  Bell, 
  Building, 
  CreditCard, 
  Link2, 
  Settings2,
  BookOpen,
  Globe,
  ChevronRight,
  Search,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

// استيراد مكونات الإعدادات
import ProfileSettings from '@/components/settings/ProfileSettings';
import OrganizationSettingsPage from '@/components/settings/OrganizationSettings';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import DomainSettings from '@/components/settings/DomainSettings';
import PasswordSettings from '@/components/settings/PasswordSettings';
import { SecurityPrivacySettings } from '@/components/settings/SecurityPrivacySettings';
import NotificationsSettings from '@/components/settings/NotificationsSettings';

const SettingsPage = () => {
  const { section = 'profile' } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization, isOrgAdmin } = useTenant();
  const [activeTab, setActiveTab] = useState(section);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveTab(section);
  }, [section]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/dashboard/settings/${value}`);
  };

  // تحديد الإعدادات المتاحة حسب دور المستخدم
  const getAvailableTabs = (): SettingsTab[] => {
    const baseTabs: SettingsTab[] = [
      {
        id: 'profile',
        label: 'الملف الشخصي',
        icon: 'User',
        description: 'إدارة معلوماتك الشخصية وإعداداتك'
      },
      {
        id: 'security',
        label: 'الأمان والخصوصية',
        icon: 'ShieldCheck',
        description: 'إدارة كلمة المرور وإعدادات الأمان'
      },
      {
        id: 'notifications',
        label: 'الإشعارات',
        icon: 'Bell',
        description: 'إعدادات الإشعارات والتنبيهات'
      }
    ];
    
    // إعدادات إضافية للمسؤول
    if (isOrgAdmin) {
      baseTabs.push(
        { 
          id: 'organization', 
          label: 'المؤسسة', 
          icon: 'Building',
          description: 'إعدادات المؤسسة والفريق'
        },
        { 
          id: 'domains', 
          label: 'النطاقات المخصصة', 
          icon: 'Globe',
          description: 'إدارة النطاقات المخصصة'
        },
        { 
          id: 'billing', 
          label: 'الفوترة والاشتراكات', 
          icon: 'CreditCard',
          description: 'إدارة اشتراكاتك والمدفوعات'
        },
        { 
          id: 'integrations', 
          label: 'الربط والتكامل', 
          icon: 'Link2',
          description: 'ربط التطبيقات والخدمات الخارجية'
        },
        { 
          id: 'advanced', 
          label: 'إعدادات متقدمة', 
          icon: 'Settings2',
          description: 'إعدادات تقنية متقدمة'
        },
        { 
          id: 'docs', 
          label: 'أدلة المساعدة', 
          icon: 'BookOpen',
          description: 'الوثائق والأدلة التعليمية'
        }
      );
    }
    
    return baseTabs;
  };

  // فلترة التبويبات حسب البحث
  const filteredTabs = getAvailableTabs().filter(tab => 
    tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tab.description && tab.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // عرض المكون المطلوب حسب التبويب النشط
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'security':
        return <SecurityPrivacySettings />;
      case 'notifications':
        return <NotificationsSettings />;
      case 'organization':
        return <OrganizationSettingsPage />;
      case 'domains':
        return <DomainSettings />;
      case 'billing':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                الفوترة والاشتراكات
              </CardTitle>
              <CardDescription>
                إدارة اشتراكاتك والمدفوعات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">إعدادات الفوترة قيد التطوير</h3>
                  <p className="text-muted-foreground">
                    سيتم إضافة إعدادات الفوترة والاشتراكات قريباً
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'integrations':
        return <IntegrationsSettings />;
      case 'advanced':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                إعدادات متقدمة
                <Badge variant="secondary">متقدم</Badge>
              </CardTitle>
              <CardDescription>
                إعدادات تقنية متقدمة للمطورين والمسؤولين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center py-12">
                  <Settings2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">الإعدادات المتقدمة قيد التطوير</h3>
                  <p className="text-muted-foreground">
                    سيتم إضافة الإعدادات المتقدمة قريباً
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'docs':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                أدلة المساعدة
              </CardTitle>
              <CardDescription>
                الوثائق والأدلة التعليمية لاستخدام النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Globe className="h-8 w-8 text-blue-500" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-medium mb-2">دليل النطاقات المخصصة</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      تعلم كيفية إعداد وتكوين النطاقات المخصصة لمتجرك الإلكتروني
                    </p>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/docs/custom-domains">
                        عرض الدليل
                        <ChevronRight className="h-4 w-4 mr-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <HelpCircle className="h-8 w-8 text-green-500" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-medium mb-2">الأسئلة الشائعة</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      إجابات على الأسئلة الأكثر شيوعاً حول استخدام النظام
                    </p>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/docs/faq">
                        عرض الأسئلة
                        <ChevronRight className="h-4 w-4 mr-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Settings2 className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">صفحة غير موجودة</h3>
                <p>القسم المطلوب غير متوفر حالياً</p>
              </div>
              <Button onClick={() => navigate('/dashboard/settings/profile')} variant="outline">
                العودة للملف الشخصي
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  const getCurrentTabInfo = () => {
    const currentTab = getAvailableTabs().find(tab => tab.id === activeTab);
    return currentTab || { label: 'غير محدد', description: '' };
  };

  return (
    <Layout>
      <div className="container max-w-7xl py-6">
        {/* رأس الصفحة المحسن */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                الإعدادات
              </h1>
              <p className="text-muted-foreground mt-1">
                إدارة حسابك وتخصيص تجربتك في النظام
              </p>
            </div>
            
            {/* شريط البحث */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الإعدادات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* مؤشر المسار */}
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <span>الإعدادات</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">
              {getCurrentTabInfo().label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* قائمة تنقل الإعدادات المحسنة */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">أقسام الإعدادات</CardTitle>
                {searchQuery && (
                  <CardDescription>
                    {filteredTabs.length} نتيجة للبحث "{searchQuery}"
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <SettingsNav 
                  tabs={filteredTabs} 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange}
                  enhanced={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* محتوى الإعدادات المحسن */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value={activeTab} forceMount className="mt-0">
                <div className="animate-in fade-in-50 duration-200">
                  {renderTabContent()}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
