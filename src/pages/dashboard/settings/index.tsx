import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '@/styles/settings-enhanced.css';
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
  HelpCircle,
  Menu,
  X,
  Home,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

// استيراد مكونات الإعدادات
import ProfileSettings from '@/components/settings/ProfileSettings';
import OrganizationSettingsPage from '@/components/settings/OrganizationSettings';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import DomainSettings from '@/components/settings/DomainSettings';
import PasswordSettings from '@/components/settings/PasswordSettings';
import { SecurityPrivacySettings } from '@/components/settings/SecurityPrivacySettings';
import NotificationsSettings from '@/components/settings/NotificationsSettings';

// متغيرات الحركة للرسوم المتحركة
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 }
};

interface SettingsPageProps extends POSSharedLayoutControls {}

const SettingsPage: React.FC<SettingsPageProps> = ({ useStandaloneLayout = true } = {}) => {
  const { section = 'profile' } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization, isOrgAdmin } = useTenant();
  const [activeTab, setActiveTab] = useState(section);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setActiveTab(section);
  }, [section]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/dashboard/settings/${value}`);
    setIsMobileMenuOpen(false); // إغلاق القائمة المحمولة عند التغيير
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                    <CreditCard className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">الفوترة والاشتراكات</CardTitle>
                    <CardDescription className="mt-1">
                      إدارة اشتراكاتك والمدفوعات
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-6"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
                        <CreditCard className="h-10 w-10 text-emerald-600" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3">إعدادات الفوترة قيد التطوير</h3>
                  <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                    نعمل على إضافة نظام فوترة متقدم وسهل الاستخدام. سيتم إطلاقه قريباً مع ميزات رائعة.
                  </p>
                  <div className="mt-8">
                    <Badge variant="secondary" className="px-4 py-2">
                      قريباً
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'integrations':
        return <IntegrationsSettings />;
      case 'advanced':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                    <Settings2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">إعدادات متقدمة</CardTitle>
                      <Badge variant="secondary" className="text-xs">متقدم</Badge>
                    </div>
                    <CardDescription className="mt-1">
                      إعدادات تقنية متقدمة للمطورين والمسؤولين
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-6"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center">
                        <Settings2 className="h-10 w-10 text-purple-600" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3">الإعدادات المتقدمة قيد التطوير</h3>
                  <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                    ستتضمن أدوات متقدمة للمطورين وخيارات تخصيص عميقة للنظام.
                  </p>
                  <div className="mt-8">
                    <Badge variant="secondary" className="px-4 py-2">
                      قريباً
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'docs':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">أدلة المساعدة</CardTitle>
                    <CardDescription className="mt-1">
                      الوثائق والأدلة التعليمية لاستخدام النظام
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  <motion.div variants={itemVariants}>
                    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border cursor-pointer">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 group-hover:scale-110 transition-transform duration-300">
                            <Globe className="h-8 w-8 text-blue-600" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <h3 className="font-bold mb-3 text-lg">دليل النطاقات المخصصة</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                          تعلم كيفية إعداد وتكوين النطاقات المخصصة لمتجرك الإلكتروني بخطوات واضحة ومفصلة
                        </p>
                        <Button asChild variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Link to="/docs/custom-domains">
                            <span>عرض الدليل</span>
                            <ChevronRight className="h-4 w-4 mr-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border cursor-pointer">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 group-hover:scale-110 transition-transform duration-300">
                            <HelpCircle className="h-8 w-8 text-emerald-600" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <h3 className="font-bold mb-3 text-lg">الأسئلة الشائعة</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                          إجابات شاملة على الأسئلة الأكثر شيوعاً حول استخدام النظام وحل المشاكل
                        </p>
                        <Button asChild variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Link to="/docs/faq">
                            <span>عرض الأسئلة</span>
                            <ChevronRight className="h-4 w-4 mr-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        );
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="text-muted-foreground mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-6">
                    <Settings2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">صفحة غير موجودة</h3>
                  <p className="max-w-md mx-auto leading-relaxed">
                    القسم المطلوب غير متوفر حالياً. يمكنك العودة للملف الشخصي أو اختيار قسم آخر.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/dashboard/settings/profile')} 
                  variant="outline"
                  className="mt-4"
                >
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  العودة للملف الشخصي
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
    }
  };

  const getCurrentTabInfo = () => {
    const currentTab = getAvailableTabs().find(tab => tab.id === activeTab);
    return currentTab || { label: 'غير محدد', description: '' };
  };

  const content = (
    <motion.div 
      className="min-h-screen settings-gradient-bg settings-container"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
        <div className="container max-w-7xl py-4 md:py-6 px-4 md:px-6 settings-scroll-container">
          {/* رأس الصفحة المحسن للهاتف */}
          <motion.div 
            className="mb-6 md:mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* شريط التنقل للهاتف */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="p-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <SheetHeader className="p-6 pb-4">
                    <SheetTitle className="text-right">أقسام الإعدادات</SheetTitle>
                  </SheetHeader>
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="البحث في الإعدادات..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4">
                    <SettingsNav 
                      tabs={filteredTabs} 
                      activeTab={activeTab} 
                      onTabChange={handleTabChange}
                      enhanced={true}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* العنوان الرئيسي */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                    الإعدادات
                  </span>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  إدارة حسابك وتخصيص تجربتك في النظام
                </p>
              </div>
              
              {/* شريط البحث للحاسوب */}
              <div className="hidden md:block">
                <div className="relative w-80">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث في الإعدادات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 bg-background/50 backdrop-blur-sm border-border/50"
                  />
                </div>
              </div>
            </div>

            {/* مؤشر المسار المحسن */}
            <motion.div 
              className="flex items-center gap-2 mt-4 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="p-1 h-auto text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4" />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الإعدادات</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">
                {getCurrentTabInfo().label}
              </span>
            </motion.div>
          </motion.div>

                     {/* قائمة التنقل الأفقية */}
           <motion.div 
             className="mb-8"
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.2 }}
           >
             <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-background/50">
               <CardHeader className="pb-4">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                   <div>
                     <CardTitle className="text-lg flex items-center gap-2">
                       <Settings2 className="h-5 w-5" />
                       أقسام الإعدادات
                     </CardTitle>
                     {searchQuery && (
                       <CardDescription className="mt-1">
                         {filteredTabs.length} نتيجة للبحث "{searchQuery}"
                       </CardDescription>
                     )}
                   </div>
                   
                   {/* معلومات القسم النشط */}
                   <div className="text-right">
                     <div className="text-sm font-medium text-primary">
                       {getCurrentTabInfo().label}
                     </div>
                     {getCurrentTabInfo().description && (
                       <div className="text-xs text-muted-foreground mt-1">
                         {getCurrentTabInfo().description}
                       </div>
                     )}
                   </div>
                 </div>
               </CardHeader>
               <Separator />
               <CardContent className="p-4">
                 <SettingsNav 
                   tabs={filteredTabs} 
                   activeTab={activeTab} 
                   onTabChange={handleTabChange}
                   enhanced={true}
                 />
               </CardContent>
             </Card>
           </motion.div>

           {/* محتوى الإعدادات المحسن */}
           <motion.div 
             className="w-full"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.3 }}
           >
             <Tabs value={activeTab} className="w-full">
               <TabsContent value={activeTab} forceMount className="mt-0">
                 <AnimatePresence mode="wait">
                   <motion.div
                     key={activeTab}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     transition={{ duration: 0.3 }}
                     className="w-full"
                   >
                     {renderTabContent()}
                   </motion.div>
                 </AnimatePresence>
               </TabsContent>
             </Tabs>
           </motion.div>
        </div>
    </motion.div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default SettingsPage;
