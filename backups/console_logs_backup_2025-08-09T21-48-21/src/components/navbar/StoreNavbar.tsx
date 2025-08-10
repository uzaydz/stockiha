import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavbarLogo } from './NavbarLogo';
import { NavbarLinks } from './NavbarLinks';
import { NavbarUserMenu } from './NavbarUserMenu';
import { NavbarNotifications } from './NavbarNotifications';
import { NavbarThemeToggle } from './NavbarThemeToggle';
// import { NavbarMobileMenu } from './NavbarMobileMenu';
// import LanguageSwitcher from '@/components/language/LanguageSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useStoreInfo, useOrganizationSettings } from '@/hooks/useAppInitData';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
// Dropdowns لم تعد مطلوبة على الهاتف
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

import type { OrganizationSettings } from '@/types/settings';

interface StoreNavbarProps {
  className?: string;
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

export function StoreNavbar({
  className,
  isMobile,
  organizationSettings: propOrganizationSettings,
  hideCategories = false
}: StoreNavbarProps) {
  const { user, userProfile } = useAuthSafe();
  const { t } = useTranslation();
  // تمت إزالة قائمة الجوال المنسدلة لصالح زر أيقونة "كل المنتجات"
  const location = useLocation();
  const { currentOrganization } = useTenantSafe();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const lastTitleRef = useRef<string>('');
  const lastFaviconRef = useRef<string>('');
  const lastLogoRef = useRef<string>('');
  
  // استخدام useStoreInfo مع البنية الصحيحة + قراءة من البيانات المشتركة القادمة من RPC
  const storeInfo = useStoreInfo();
  const { organizationSettings: sharedOrgSettings, organization: sharedOrg } = useSharedStoreDataContext();
  const storeName = storeInfo?.name || sharedOrg?.name || null;
  const logoUrl = storeInfo?.logo_url || sharedOrgSettings?.logo_url || null;
  const storeInfoLoading = !storeInfo;
  
  // 🔧 نظام احتياطي لجلب بيانات الشعار
  const [fallbackLogo, setFallbackLogo] = useState<string | null>(null);
  const [fallbackSiteName, setFallbackSiteName] = useState<string | null>(null);
  
  // محاولة جلب بيانات احتياطية من localStorage فقط بدون أي نداءات شبكة
  useEffect(() => {
    const applyLocalFallback = () => {
      try {
        const appInitData = localStorage.getItem('bazaar_app_init_data');
        if (appInitData) {
          const data = JSON.parse(appInitData);
          if (data?.organization?.settings) {
            const settings = data.organization.settings;
            setFallbackLogo(settings.logo_url || null);
            setFallbackSiteName(settings.site_name || data.organization.name || null);
          }
        }
      } catch {}
    };
    const timeoutId = setTimeout(() => {
      if (!logoUrl && !storeName) {
        applyLocalFallback();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [logoUrl, storeName]);
  
  // إصلاح مشكلة destructuring عندما يكون useOrganizationSettings يرجع null
  const organizationSettingsResult = useOrganizationSettings();
  const { settings: organizationSettings, isLoading: settingsLoading } = organizationSettingsResult || { 
    settings: null, 
    isLoading: false 
  };
  
  // 🔥 إصلاح: استخدام إعدادات المؤسسة المحسنة مع أولوية لإعدادات RPC
  const finalOrganizationSettings = sharedOrgSettings || organizationSettings;
  
  // استخراج البيانات من إعدادات المؤسسة مع النظام الاحتياطي
  const orgLogo = sharedOrgSettings?.logo_url || logoUrl || fallbackLogo || finalOrganizationSettings?.logo_url || '';
  const siteName = sharedOrgSettings?.site_name || storeName || sharedOrg?.name || fallbackSiteName || finalOrganizationSettings?.site_name || currentOrganization?.name || '';
  const displayTextWithLogo = finalOrganizationSettings?.display_text_with_logo !== false;

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

  // كشف حجم الشاشة وتحديثه (محسّن للهاتف)
  useEffect(() => {
    const checkScreen = () => {
      try {
        setIsSmallScreen(window.innerWidth < 1024); // يطابق حد lg في Tailwind
      } catch {}
    };
    checkScreen();
    const onResize = throttle(checkScreen, 150) as unknown as () => void;
    window.addEventListener('resize', onResize as EventListener, { passive: true } as AddEventListenerOptions);
    return () => window.removeEventListener('resize', onResize as EventListener);
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
        "flex items-center justify-between p-3 shadow-sm bg-background/90 backdrop-blur-md",
        className
      )}>
        <NavbarLogo siteName={t('common.loading')} />
        <div className="animate-pulse h-8 w-8 bg-muted rounded-full"></div>
      </div>
    );
  }

  return (
    <header 
      data-navbar="store"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full flex flex-col",
        "transition-all duration-500 ease-in-out",
        isScrolled 
          ? "bg-background/85 backdrop-blur-xl shadow-xl border-b border-border/20" 
          : "bg-gradient-to-r from-background/60 via-background/70 to-background/60 backdrop-blur-lg shadow-lg",
        className
      )}
      style={{
        background: isScrolled 
          ? undefined 
          : `linear-gradient(135deg, 
              hsl(var(--background)/0.6) 0%, 
              hsl(var(--background)/0.8) 50%, 
              hsl(var(--background)/0.6) 100%), 
            linear-gradient(45deg, 
              hsl(var(--primary)/0.02) 0%, 
              transparent 50%, 
              hsl(var(--primary)/0.02) 100%)`
      }}
    >
      {/* Top gradient line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      )} />
      
      <div className={cn(
        "flex items-center justify-between py-2 px-4 mx-auto w-full relative",
        isSmallScreen ? "h-14" : "h-16"
      )}>
        {/* Animated background particles effect */}
        <div className={cn(
          "absolute inset-0 overflow-hidden pointer-events-none",
          isSmallScreen && "hidden"
        )}>
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/2 w-0.5 h-0.5 bg-primary/25 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <NavbarLogo 
              orgLogo={orgLogo} 
              siteName={siteName} 
              displayTextWithLogo={displayTextWithLogo} 
              isAdminPage={false}
              withGradientEffect={true}
            />
          </div>
        </div>

        {/* Center navigation for store pages */}
        <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-lg px-2 py-1">
            <NavbarLinks 
              isAdminPage={false} 
              categories={[]} 
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          {/* Action buttons with enhanced styling */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
              <NavbarThemeToggle />
            </div>
            
            {user && (
              <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
                <NavbarNotifications />
              </div>
            )}
            
            <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
              <NavbarUserMenu isAdminPage={false} />
            </div>
          </div>
          
          {/* Mobile actions: إظهار زر السويتش + أيقونة كل المنتجات */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
              <NavbarThemeToggle />
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-xl transition-all duration-200 group relative overflow-hidden",
                "bg-background/70 hover:bg-background/90",
                "border border-border/30 hover:border-primary/30 shadow-sm hover:shadow-md"
              )}
            >
              <Link to="/products" aria-label="كل المنتجات">
                <Sparkles className="h-5 w-5 text-foreground/80 group-hover:text-primary transition-colors duration-300 relative z-10" />
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Bottom gradient line */}
        <div className={cn(
          "absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent"
        )} />
      </div>
    </header>
  );
}

// Optimize with React.memo to prevent unnecessary re-renders
export default memo(StoreNavbar);
