import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, ChevronDown, ArrowRightToLine, ArrowLeftToLine, Sparkles, Bell, Settings, User, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavbarLogo } from './NavbarLogo';
import { NavbarLinks } from './NavbarLinks';
import { NavbarUserMenu } from './NavbarUserMenu';
import { NavbarNotifications } from './NavbarNotifications';
import { NavbarThemeToggle } from './NavbarThemeToggle';
import { NavbarMobileMenu } from './NavbarMobileMenu';
import { QuickNavLinks } from './QuickNavLinks';
import LanguageSwitcher from '@/components/language/LanguageSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useApps } from '@/context/AppsContext';
import { useStoreInfo, useOrganizationSettings } from '@/hooks/useAppInitData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { OrganizationSettings } from '@/types/settings';

// استيراد ملف CSS المخصص
import './admin-navbar.css';

interface AdminNavbarProps {
  className?: string;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isMobile?: boolean;
  organizationSettings?: OrganizationSettings | null;
  hideCategories?: boolean;
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

const useAppsSafe = () => {
  try {
    return useApps();
  } catch {
    return {
      isAppEnabled: () => false,
      organizationApps: []
    };
  }
};

// Throttle function for scroll events
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

export function AdminNavbar({
  className,
  toggleSidebar,
  isSidebarOpen,
  isMobile,
  organizationSettings: propOrganizationSettings,
  hideCategories = false
}: AdminNavbarProps) {
  const { user, userProfile } = useAuthSafe();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const { currentOrganization } = useTenantSafe();
  const { isAppEnabled, organizationApps } = useAppsSafe();

  const [isScrolled, setIsScrolled] = useState(false);
  const lastTitleRef = useRef<string>('');
  const lastFaviconRef = useRef<string>('');
  const lastLogoRef = useRef<string>('');
  
  // استخدام useStoreInfo مع البنية الصحيحة
  const storeInfo = useStoreInfo();
  const storeName = storeInfo?.name || null;
  const logoUrl = storeInfo?.logo_url || null;
  const storeInfoLoading = !storeInfo;
  
  // 🔧 نظام احتياطي لجلب بيانات الشعار
  const [fallbackLogo, setFallbackLogo] = useState<string | null>(null);
  const [fallbackSiteName, setFallbackSiteName] = useState<string | null>(null);
  
  // محاولة جلب البيانات من مصادر أخرى إذا فشل النظام الأساسي
  useEffect(() => {
    const fetchFallbackData = async () => {
      try {
        // محاولة جلب من localStorage مباشرة
        const appInitData = localStorage.getItem('bazaar_app_init_data');
        if (appInitData) {
          const data = JSON.parse(appInitData);
          if (data?.organization?.settings) {
            const settings = data.organization.settings;
            setFallbackLogo(settings.logo_url || null);
            setFallbackSiteName(settings.site_name || data.organization.name || null);
          }
        }
        
        // إذا لم تتوفر البيانات، محاولة إعادة تهيئة النظام
        if (!storeInfo && currentOrganization?.id) {
          const { initializeApp } = await import('@/lib/appInitializer');
          const initData = await initializeApp(currentOrganization.id);
          if (initData?.organization?.settings) {
            setFallbackLogo(initData.organization.settings.logo_url || null);
            setFallbackSiteName(initData.organization.settings.site_name || initData.organization.name || null);
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };
    
    // تشغيل البحث الاحتياطي بعد ثانية إذا لم تتوفر البيانات الأساسية
    const timeoutId = setTimeout(() => {
      if (!logoUrl && !storeName) {
        fetchFallbackData();
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [storeInfo, logoUrl, storeName, currentOrganization?.id]);
  
  // إصلاح مشكلة destructuring عندما يكون useOrganizationSettings يرجع null
  const organizationSettingsResult = useOrganizationSettings();
  const { settings: organizationSettings, isLoading: settingsLoading } = organizationSettingsResult || { 
    settings: null, 
    isLoading: false 
  };
  
  // 🔥 إصلاح: استخدام إعدادات المؤسسة المحسنة
  const finalOrganizationSettings = organizationSettings;
  
  // استخراج البيانات من إعدادات المؤسسة مع النظام الاحتياطي
  const orgLogo = logoUrl || fallbackLogo || finalOrganizationSettings?.logo_url || '';
  const siteName = storeName || fallbackSiteName || finalOrganizationSettings?.site_name || currentOrganization?.name || '';
  const displayTextWithLogo = finalOrganizationSettings?.display_text_with_logo !== false;

  const isAdmin = userProfile?.role === 'admin';
  const isEmployee = userProfile?.role === 'employee';
  const isStaff = isAdmin || isEmployee;

  // تعطيل إضافة المساحة التلقائية للمحتوى - سيتم التحكم بها من خلال كل صفحة حسب الحاجة
  useEffect(() => {
    // تحديد ارتفاع النافبار الثابت للاستخدام في CSS variables
    const navbarHeight = '64px'; // تطابق h-16 في tailwind
    document.documentElement.style.setProperty('--navbar-height', navbarHeight);
    
    // تنظيف التأثير عند إلغاء المكون
    return () => {
      document.documentElement.style.removeProperty('--navbar-height');
    };
  }, []);
  
  // Handle scroll events for advanced header effects with throttling
  useEffect(() => {
    const handleScroll = throttle(() => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
    }, 16); // ~60fps
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // تحديث عنوان الصفحة والأيقونة عند تغيير الإعدادات - محسن
  const updatePageMetadata = useCallback(() => {
    if (finalOrganizationSettings) {
      // تحديث عنوان الصفحة فقط إذا تغير
      if (siteName && lastTitleRef.current !== siteName) {
        document.title = siteName;
        lastTitleRef.current = siteName;
      }
      
      // تحديث الأيقونة فقط إذا تغيرت
      if (finalOrganizationSettings.favicon_url && lastFaviconRef.current !== finalOrganizationSettings.favicon_url) {
        const faviconElement = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (faviconElement) {
          faviconElement.href = `${finalOrganizationSettings.favicon_url}?t=${Date.now()}`;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = `${finalOrganizationSettings.favicon_url}?t=${Date.now()}`;
          document.head.appendChild(newFavicon);
        }
        lastFaviconRef.current = finalOrganizationSettings.favicon_url;
      }
      
      // تحديث صور الشعار فقط إذا تغيرت
      if (orgLogo && lastLogoRef.current !== orgLogo) {
        // استخدام requestAnimationFrame لتجنب forced reflow
        requestAnimationFrame(() => {
          document.querySelectorAll('img[data-logo="organization"]').forEach(img => {
            const imgElement = img as HTMLImageElement;
            if (imgElement.src !== orgLogo) {
              imgElement.src = `${orgLogo}?t=${Date.now()}`;
            }
          });
        });
        lastLogoRef.current = orgLogo;
      }
    }
  }, [finalOrganizationSettings, siteName, orgLogo]);

  // استخدام useCallback لتجنب إعادة التشغيل المتكررة
  useEffect(() => {
    updatePageMetadata();
  }, [updatePageMetadata]);

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

  // Enhanced mobile quick links rendering
  const renderMobileQuickLinks = useCallback(() => {
    return (
      <DropdownMenu open={isQuickLinksOpen} onOpenChange={setIsQuickLinksOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="admin-navbar-button rounded-full bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm border border-primary/20 shadow-sm hover:shadow-lg hover:from-primary/10 hover:to-primary/20 transition-all duration-300 px-3 text-xs font-medium group"
          >
            <Sparkles className="h-3.5 w-3.5 ml-1 text-primary/70 group-hover:text-primary transition-colors duration-300" />
            <span className="text-sm admin-text-sm">{t('navbar.categories')}</span>
            <ChevronDown className="h-3.5 w-3.5 mr-1 opacity-80 transition-transform duration-300" style={{ transform: isQuickLinksOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="admin-quick-links rounded-2xl p-3 border-border/30 shadow-xl backdrop-blur-md bg-background/95">
          <div className="w-64">
            <QuickNavLinks variant="vertical" maxItems={6} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, [isQuickLinksOpen, t]);

  return (
    <header 
      data-navbar="admin"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full flex flex-col admin-backdrop",
        "transition-all duration-500 ease-in-out",
        isScrolled 
          ? "bg-background/95 backdrop-blur-xl shadow-2xl border-b border-border/30 scrolled" 
          : "bg-gradient-to-r from-background/80 via-background/90 to-background/80 backdrop-blur-xl shadow-xl",
        className
      )}
      style={{
        background: isScrolled 
          ? undefined 
          : `linear-gradient(135deg, 
              hsl(var(--background)/0.8) 0%, 
              hsl(var(--background)/0.9) 50%, 
              hsl(var(--background)/0.8) 100%), 
            linear-gradient(45deg, 
              hsl(var(--primary)/0.03) 0%, 
              transparent 50%, 
              hsl(var(--primary)/0.03) 100%)`
      }}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="flex items-center justify-between h-16 py-2 px-4 mx-auto w-full max-w-7xl relative">
        {/* Animated background particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-primary/30 rounded-full animate-pulse admin-particle" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse admin-particle" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/2 w-0.5 h-0.5 bg-primary/35 rounded-full animate-pulse admin-particle" style={{ animationDelay: '2s' }} />
        </div>

        {/* Left Section - Logo and Sidebar Toggle */}
        <div className="flex items-center gap-3 relative z-10">
          {isStaff && toggleSidebar && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar} 
              className={cn(
                "hidden md:flex rounded-xl transition-all duration-300 group relative overflow-hidden admin-navbar-button",
                "bg-gradient-to-br from-background/60 to-background/80 hover:from-primary/15 hover:to-primary/25",
                "border border-border/40 hover:border-primary/40 shadow-md hover:shadow-lg",
                "h-10 w-10"
              )}
              aria-label={isSidebarOpen ? t('navbar.collapseSidebar') : t('navbar.expandSidebar')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {isSidebarOpen ? (
                <ArrowRightToLine className="h-4 w-4 text-foreground/90 group-hover:text-primary transition-colors duration-300 relative z-10" />
              ) : (
                <ArrowLeftToLine className="h-4 w-4 text-foreground/90 group-hover:text-primary transition-colors duration-300 relative z-10" />
              )}
            </Button>
          )}
          
          <div className="relative admin-logo">
            <NavbarLogo 
              orgLogo={orgLogo} 
              siteName={siteName} 
              displayTextWithLogo={displayTextWithLogo} 
              isAdminPage={true}
              withGradientEffect={true}
            />
          </div>
        </div>

        {/* Center Section - Navigation Links */}
        <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 admin-center-nav">
          <div className="admin-quick-links bg-gradient-to-r from-background/50 to-background/70 backdrop-blur-xl rounded-full border border-border/30 shadow-xl px-2 py-1.5">
            <QuickNavLinks variant="navbar" maxItems={6} />
          </div>
        </div>
        
        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center gap-2 relative z-10">
          {/* Search Button - Desktop */}
          <div className="hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "rounded-xl transition-all duration-300 group relative overflow-hidden admin-navbar-button admin-search-button",
                "bg-gradient-to-br from-background/60 to-background/80 hover:from-primary/15 hover:to-primary/25",
                "border border-border/40 hover:border-primary/40 shadow-md hover:shadow-lg",
                "h-10 w-10"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Search className="h-4 w-4 text-foreground/90 group-hover:text-primary transition-colors duration-300 relative z-10" />
            </Button>
          </div>

          {/* Mobile quick links */}
          <div className="md:hidden">
            {renderMobileQuickLinks()}
          </div>

          {/* Action buttons with enhanced styling */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle */}
            <div className="bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-xl rounded-full border border-border/40 shadow-md p-1">
              <NavbarThemeToggle />
            </div>
            
            {/* Notifications */}
            {user && (
              <div className="bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-xl rounded-full border border-border/40 shadow-md p-1 relative">
                <NavbarNotifications />
                <div className="admin-notification-badge"></div>
              </div>
            )}
            
            {/* Settings Button - Desktop */}
            <div className="hidden md:block">
              <div className="bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-xl rounded-full border border-border/40 shadow-md p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors duration-300 admin-settings-button"
                >
                  <Settings className="h-4 w-4 text-foreground/90" />
                </Button>
              </div>
            </div>
            
            {/* User Menu */}
            <div className="bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-xl rounded-full border border-border/40 shadow-md p-1 admin-user-menu">
              <NavbarUserMenu isAdminPage={true} />
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(true)}
              className={cn(
                "rounded-xl transition-all duration-300 group relative overflow-hidden admin-navbar-button",
                "bg-gradient-to-br from-background/60 to-background/80 hover:from-primary/15 hover:to-primary/25",
                "border border-border/40 hover:border-primary/40 shadow-md hover:shadow-lg",
                "h-10 w-10"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Menu className="h-5 w-5 text-foreground/90 group-hover:text-primary transition-colors duration-300 relative z-10" />
            </Button>
            
            <NavbarMobileMenu
              isOpen={isMenuOpen}
              onOpenChange={setIsMenuOpen}
              userProfile={userProfile}
              user={user}
              orgLogo={orgLogo}
              siteName={siteName}
              displayTextWithLogo={displayTextWithLogo}
              isAdminPage={true}
              categories={[]}
            >
              <div className="mb-4">
                <QuickNavLinks variant="vertical" />
              </div>
            </NavbarMobileMenu>
          </div>
        </div>
        
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>
    </header>
  );
}

// Optimize with React.memo to prevent unnecessary re-renders
export default memo(AdminNavbar);
