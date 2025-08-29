import { useState, useEffect, useRef, useCallback, memo } from 'react';
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
      document.title = siteName;
    }
  }, [siteName]);

  if (!userProfile && user) {
    return (
      <div className={cn(
        "flex items-center justify-between p-3 shadow-sm bg-background/90 backdrop-blur-md admin-loading",
        className
      )}>
        <NavbarLogo siteName={t('common.loading')} />
        <div className="animate-pulse h-8 w-8 bg-muted rounded-full"></div>
      </div>
    );
  }



  return (
    <header 
      data-navbar="admin"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full",
        "bg-gradient-to-r from-background via-background/98 to-background",
        "backdrop-blur-xl border-b border-border/10",
        "shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500",
        className
      )}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="flex items-center justify-between h-16 px-6 mx-auto w-full max-w-7xl">
        
        {/* Left Section - Logo with enhanced styling */}
        <div className="flex items-center">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative">
                <NavbarLogo 
                  orgLogo={orgLogo} 
                  siteName={siteName} 
                  displayTextWithLogo={displayTextWithLogo} 
                  isAdminPage={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Section - Elegant Quick Navigation */}
        <div className="hidden lg:flex flex-1 justify-center max-w-xl mx-8">
          <div className="navbar-shortcuts-container">
            <QuickNavLinks variant="navbar" maxItems={5} />
          </div>
        </div>

        {/* Right Section - Refined Actions */}
        <div className="flex items-center gap-3">
          
          {/* Theme Toggle - Always visible but smaller on mobile */}
          <div className="navbar-action-item">
            <NavbarThemeToggle />
          </div>
          
          {/* Notifications - Always visible but smaller on mobile */}
          {user && (
            <div className="navbar-action-item">
              <NavbarNotifications />
            </div>
          )}
          
          {/* Elegant Separator - Desktop only */}
          <div className="hidden sm:block w-px h-6 bg-gradient-to-b from-transparent via-border/50 to-transparent" />
          
          {/* User Menu - Desktop only */}
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
                className="h-9 w-9 rounded-lg bg-muted/60 hover:bg-muted/80 border border-border/30 transition-all duration-200"
                aria-label="فتح القائمة الجانبية"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom subtle gradient line */}
      <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
    </header>
  );
}

// Optimize with React.memo to prevent unnecessary re-renders
export default memo(AdminNavbar);
