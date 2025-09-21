import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavbarLogo } from './NavbarLogo';
import { NavbarLinks } from './NavbarLinks';
import { NavbarUserMenu } from './NavbarUserMenu';
import NavbarCartButton from './NavbarCartButton';
import { NavbarNotifications } from './NavbarNotifications';
import { NavbarThemeToggle } from './NavbarThemeToggle';
import { canMutateHead } from '@/lib/headGuard';
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
  const navbarStartTime = performance.now();

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
  
  // 🚀 إضافة fallback من window object إذا لم تكن البيانات متوفرة
  const windowStoreData = (window as any).__CURRENT_STORE_DATA__;
  const windowEarlyData = (window as any).__EARLY_STORE_DATA__ || (window as any).__PREFETCHED_STORE_DATA__;
  
  const storeInfoLoading = !storeInfo;
  
  let storeName: string | null = null;
  let logoUrl: string | null = null;

  // البحث عن اسم المتجر من مصادر متعددة
  storeName = storeInfo?.name ||
              sharedOrg?.name ||
              windowStoreData?.organization?.name ||
              windowEarlyData?.data?.organization_details?.name ||
              (window as any).__STORE_ORGANIZATION__?.name ||
              null;

  // البحث عن رابط الشعار من مصادر متعددة
  logoUrl = storeInfo?.logo_url ||
            sharedOrgSettings?.logo_url ||
            windowStoreData?.organizationSettings?.logo_url ||
            windowEarlyData?.data?.organization_settings?.logo_url ||
            (window as any).__STORE_SETTINGS__?.logo_url ||
            null;

  // إضافة logs لتتبع البيانات في Navbar - تقليل اللوجات
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) { // 10% فقط من المرات
    console.log('🎯 [StoreNavbar] البيانات المتوفرة:', {
      hasStoreInfo: !!storeInfo,
      hasSharedOrg: !!sharedOrg,
      hasSharedOrgSettings: !!sharedOrgSettings,
      storeInfoName: storeInfo?.name,
      sharedOrgName: sharedOrg?.name,
      logoFromStoreInfo: storeInfo?.logo_url,
      logoFromSettings: sharedOrgSettings?.logo_url,
      hasWindowStoreData: !!windowStoreData,
      hasWindowEarlyData: !!windowEarlyData,
      windowOrgName: windowStoreData?.organization?.name || windowEarlyData?.data?.organization_details?.name,
      // إضافة معلومات إضافية للتشخيص
      storeInfoLoading: storeInfoLoading,
      currentOrganization: currentOrganization?.name,
      currentOrganizationId: currentOrganization?.id,
      // البيانات الجديدة
      hasStoreOrganization: !!(window as any).__STORE_ORGANIZATION__,
      hasStoreSettings: !!(window as any).__STORE_SETTINGS__,
      storeOrgName: (window as any).__STORE_ORGANIZATION__?.name,
      storeSettingsLogo: (window as any).__STORE_SETTINGS__?.logo_url,
      storeSettingsSiteName: (window as any).__STORE_SETTINGS__?.site_name,
      // إعدادات السلة
      sharedOrgSettingsCustomJs: sharedOrgSettings?.custom_js,
      sharedOrgSettingsType: typeof sharedOrgSettings?.custom_js,
      windowStoreDataCustomJs: windowStoreData?.organizationSettings?.custom_js,
      windowEarlyDataCustomJs: windowEarlyData?.data?.organization_settings?.custom_js,
      storeSettingsCustomJs: (window as any).__STORE_SETTINGS__?.custom_js,
      finalStoreName: storeName,
      finalLogoUrl: logoUrl,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }
  
  // 🔧 نظام احتياطي لجلب بيانات الشعار
  const [fallbackLogo, setFallbackLogo] = useState<string | null>(null);
  const [fallbackSiteName, setFallbackSiteName] = useState<string | null>(null);
  
  // محاولة جلب بيانات احتياطية من localStorage فقط بدون أي نداءات شبكة
  useEffect(() => {
    const fallbackStartTime = performance.now();


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
      } catch (error) {
        console.error('❌ [StoreNavbar] خطأ في قراءة البيانات الاحتياطية:', error);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!logoUrl && !storeName) {
        
        applyLocalFallback();
      } else {
        
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
    const heightStartTime = performance.now();

    

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
    const screenStartTime = performance.now();

    

    // قلل ضوضاء السجلات وأثر الأداء
    const resizeLogCount = { current: 0 } as any;
    const checkScreen = () => {
      try {
        const newIsSmallScreen = window.innerWidth < 1024;
        if (process.env.NODE_ENV === 'development' && resizeLogCount.current < 4) {
          resizeLogCount.current++;
        }
        setIsSmallScreen(newIsSmallScreen);
      } catch (error) {
        console.error('❌ [StoreNavbar] خطأ في فحص حجم الشاشة:', error);
      }
    };

    checkScreen();

    const onResize = throttle(checkScreen, 150) as unknown as () => void;
    window.addEventListener('resize', onResize as EventListener, { passive: true } as AddEventListenerOptions);


    return () => {
      
      window.removeEventListener('resize', onResize as EventListener);
    };
  }, []);

  // Handle scroll events for advanced header effects with throttling
  useEffect(() => {
    const scrollStartTime = performance.now();

    

    let scrollCount = 0;
    const handleScroll = throttle(() => {
      const scrollY = window.scrollY;
      const newIsScrolled = scrollY > 10;
      scrollCount++;

      if (process.env.NODE_ENV === 'development' && scrollCount <= 10) {
      }

      setIsScrolled(newIsScrolled);
    }, 16); // ~60fps

    window.addEventListener('scroll', handleScroll, { passive: true });


    return () => {
      
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // تحديث عنوان الصفحة والأيقونة عند تغيير الإعدادات - محسن
  const updatePageMetadata = useCallback(() => {
    const metadataStartTime = performance.now();


    if (finalOrganizationSettings) {
      // تحديث عنوان الصفحة فقط إذا تغير
      if (canMutateHead() && siteName && lastTitleRef.current !== siteName) {
        const oldTitle = document.title;
        document.title = siteName;
        lastTitleRef.current = siteName;

      }

      // تحديث الأيقونة فقط إذا تغيرت
      if (canMutateHead() && finalOrganizationSettings.favicon_url && lastFaviconRef.current !== finalOrganizationSettings.favicon_url) {
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
          const logoImages = document.querySelectorAll('img[data-logo="organization"]');
          

          logoImages.forEach(img => {
            const imgElement = img as HTMLImageElement;
            if (imgElement.src !== orgLogo) {
              imgElement.src = `${orgLogo}?t=${Date.now()}`;
            }
          });

          
        });
        lastLogoRef.current = orgLogo;
      }
    }

    const metadataTime = performance.now() - metadataStartTime;
  }, [finalOrganizationSettings, siteName, orgLogo]);

  // استخدام useCallback لتجنب إعادة التشغيل المتكررة
  useEffect(() => {
    updatePageMetadata();
  }, [updatePageMetadata]);

  if (!userProfile && user) {
    const loadingTime = performance.now() - navbarStartTime;

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

  const totalRenderTime = performance.now() - navbarStartTime;

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
            {/* Cart Button */}
            <NavbarCartButton />
            {/* Theme Toggle Button - طوقل الثيم */}
            <div className="bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-md rounded-full border border-border/30 shadow-lg p-1.5 hover:shadow-xl transition-all duration-300 hover:scale-105 group relative">
              <div className="relative">
                <NavbarThemeToggle />
                {/* Tooltip for theme toggle */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="bg-foreground/90 text-background px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
                    تبديل الثيم
                  </div>
                </div>
              </div>
              {/* إضافة تأثير بصري إضافي */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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
            <NavbarCartButton />
            {/* Theme Toggle Button - طوقل الثيم للهاتف */}
            <div className="bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-md rounded-full border border-border/30 shadow-lg p-1.5 hover:shadow-xl transition-all duration-300 hover:scale-105 group relative">
              <div className="relative">
                <NavbarThemeToggle />
                {/* Tooltip for theme toggle on mobile */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="bg-foreground/90 text-background px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
                    تبديل الثيم
                  </div>
                </div>
              </div>
              {/* إضافة تأثير بصري إضافي */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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
