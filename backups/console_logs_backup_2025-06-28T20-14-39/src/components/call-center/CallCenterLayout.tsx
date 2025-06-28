import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import CallCenterHeader from './CallCenterHeader';
import CallCenterSideMenu from './CallCenterSideMenu';
import { useTenant } from '@/context/TenantContext';
import { getOrganizationSettings } from '@/lib/api/settings';
import { 
  initializeCallCenterTheme, 
  applyOrganizationThemeToCallCenter,
  removeCallCenterTheme 
} from '@/lib/callCenterTheme';
import '@/styles/call-center.css';

const CallCenterLayout: React.FC = () => {
  const { currentOrganization } = useTenant();

  // تهيئة وتطبيق ثيم مركز الاتصالات
  useEffect(() => {
    // تهيئة الثيم الأساسي لمركز الاتصالات
    initializeCallCenterTheme();

    // تطبيق ثيم المؤسسة إذا كان متوفراً
    if (currentOrganization?.id) {
      loadOrganizationTheme(currentOrganization.id);
    }

    // تنظيف عند إلغاء التحميل
    return () => {
      // إزالة ثيم مركز الاتصالات عند مغادرة الصفحة
      removeCallCenterTheme();
    };
  }, [currentOrganization?.id]);

  // تحميل وتطبيق ثيم المؤسسة
  const loadOrganizationTheme = async (organizationId: string) => {
    try {
      const settings = await getOrganizationSettings(organizationId);
      if (settings) {
        applyOrganizationThemeToCallCenter({
          theme_primary_color: settings.theme_primary_color,
          theme_secondary_color: settings.theme_secondary_color,
          theme_mode: settings.theme_mode,
          custom_css: settings.custom_css
        });
      }
    } catch (error) {
      // تطبيق ثيم افتراضي في حالة الفشل
      applyOrganizationThemeToCallCenter({
        theme_primary_color: '#3B82F6',
        theme_secondary_color: '#10B981',
        theme_mode: 'light',
        custom_css: null
      });
    }
  };

  return (
    <div className="h-screen flex bg-call-center-bg">
      {/* خلفية متدرجة مخصصة لمركز الاتصالات */}
      <div className="fixed inset-0 bg-gradient-to-br from-call-center-bg via-call-center-bg-secondary to-call-center-bg-muted -z-10" />
      
      {/* تأثيرات الخلفية */}
      <div className="fixed inset-0 -z-10">
        {/* دوائر الخلفية */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-call-center-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-call-center-accent/5 rounded-full blur-3xl" />
        
        {/* خطوط الشبكة */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="h-full w-full" style={{
            backgroundImage: `
              linear-gradient(hsl(var(--call-center-border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--call-center-border)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
      </div>

      {/* القائمة الجانبية */}
      <div className="w-64 flex-shrink-0 shadow-lg relative z-10">
        <CallCenterSideMenu />
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header مركز الاتصالات */}
        <CallCenterHeader />
        
        {/* المحتوى */}
        <main className="flex-1 overflow-y-auto">
          <div className="call-center-glass m-6 rounded-xl border border-call-center-border/50 shadow-xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CallCenterLayout;
