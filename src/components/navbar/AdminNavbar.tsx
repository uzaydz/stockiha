import React, { memo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavbarLogo } from './NavbarLogo';
import { NavbarUserMenu } from './NavbarUserMenu';
import { NavbarNotifications } from './NavbarNotifications';
import { NavbarThemeToggle } from './NavbarThemeToggle';
import { QuickNavLinks } from './QuickNavLinks';
import OnlineOrdersCounter from './OnlineOrdersCounter';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useApps } from '@/context/AppsContext';
import { useStoreInfo, useOrganizationSettings } from '@/hooks/useAppInitData';

import type { OrganizationSettings } from '@/types/settings';

// استيراد ملف CSS المخصص
import './admin-navbar.css';

interface AdminNavbarProps {
  className?: string;
  isMobile?: boolean;
  toggleSidebar?: () => void;
  organizationSettings?: OrganizationSettings | null;
}

// دوال آمنة للـ hooks
const useAuthSafe = () => {
  try {
    return useAuth();
  } catch {
    return {
      user: null,
      userProfile: null,
      loading: false
    };
  }
};

const useTenantSafe = () => {
  try {
    return useTenant();
  } catch {
    return {
      currentOrganization: null,
      isLoading: false
    };
  }
};

export function AdminNavbar({
  className,
  isMobile,
  toggleSidebar,
  organizationSettings: propOrganizationSettings
}: AdminNavbarProps) {
  const location = useLocation();
  const isStoreEditorPage = location.pathname.startsWith('/dashboard/store-editor');
  const { user, userProfile } = useAuthSafe();
  const { t } = useTranslation();
  const { currentOrganization } = useTenantSafe();

  // استخدام useStoreInfo مع البنية الصحيحة
  const storeInfo = useStoreInfo();
  const storeName = storeInfo?.name || null;
  const logoUrl = storeInfo?.logo_url || null;
  
  // إصلاح مشكلة destructuring عندما يكون useOrganizationSettings يرجع null
  const organizationSettingsResult = useOrganizationSettings();
  const { settings: organizationSettings } = organizationSettingsResult || { 
    settings: null, 
    isLoading: false 
  };
  
  // استخراج البيانات من إعدادات المؤسسة
  const orgLogo = logoUrl || organizationSettings?.logo_url || '';
  const siteName = storeName || organizationSettings?.site_name || currentOrganization?.name || '';
  const displayTextWithLogo = organizationSettings?.display_text_with_logo !== false;

  // تحديد ارتفاع النافبار الثابت للاستخدام في CSS variables
  useEffect(() => {
    const navbarHeight = '64px'; // تطابق h-16 في tailwind
    document.documentElement.style.setProperty('--navbar-height', navbarHeight);
    
    // تنظيف التأثير عند إلغاء المكون
    return () => {
      document.documentElement.style.removeProperty('--navbar-height');
    };
  }, []);
  
  // تحديث عنوان الصفحة
  useEffect(() => {
    if (siteName) {
      import('@/lib/headGuard')
        .then(({ canMutateHead }) => {
          if (!canMutateHead || canMutateHead()) {
            document.title = siteName;
          }
        })
        .catch(() => {
          document.title = siteName;
        });
    }
  }, [siteName]);

  if (!userProfile && user) {
    return (
      <div className={cn(
        "flex items-center justify-between p-4 bg-background/95 backdrop-blur-md border-b border-border/50 admin-loading",
        className
      )}>
        <NavbarLogo siteName={t('common.loading')} />
        <div className="animate-pulse h-8 w-8 bg-muted rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <header
        data-navbar="admin"
        className={cn(
          "fixed top-0 left-0 right-0 z-50 w-full",
          "bg-background/95 backdrop-blur-md border-b border-border/50",
          "shadow-sm transition-all duration-200",
          className
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 mx-auto w-full max-w-7xl">
          
          {/* Left Section - Clean Logo */}
          <div className="flex items-center">
            <NavbarLogo 
              orgLogo={orgLogo} 
              siteName={siteName} 
              displayTextWithLogo={displayTextWithLogo} 
              isAdminPage={true}
            />
          </div>

          {/* Center Section - Clean Quick Navigation (skip on store-editor to avoid extra fetches) */}
          {!isStoreEditorPage && (
            <div className="hidden lg:flex flex-1 justify-center max-w-xl mx-8">
              <QuickNavLinks variant="navbar" maxItems={5} />
            </div>
          )}

          {/* Right Section - Clean Actions */}
          <div className="flex items-center gap-3">
            {/* Online Orders Counter (skip on store-editor) */}
            {!isStoreEditorPage && (
              <div className="navbar-action-item">
                <OnlineOrdersCounter variant="compact" />
              </div>
            )}

            {/* Theme Toggle */}
            <div className="navbar-action-item">
              <NavbarThemeToggle />
            </div>

            {/* Notifications (skip on store-editor to avoid data load) */}
            {user && !isStoreEditorPage && (
              <div className="navbar-action-item">
                <NavbarNotifications />
              </div>
            )}
            
            {/* Clean Separator */}
            <div className="hidden sm:block w-px h-6 bg-border/60" />
            
            {/* User Menu */}
            <div className="hidden sm:block navbar-user-menu">
              <NavbarUserMenu isAdminPage={true} />
            </div>
            
            {/* Mobile Menu Button */}
            {toggleSidebar && (
              <div className="sm:hidden navbar-mobile-button">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleSidebar}
                  className="h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors duration-200"
                  aria-label="فتح القائمة الجانبية"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

// Optimize with React.memo to prevent unnecessary re-renders
export default memo(AdminNavbar);
