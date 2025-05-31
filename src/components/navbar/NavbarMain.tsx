import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, ChevronDown, ArrowRightToLine, ArrowLeftToLine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavbarLogo } from './NavbarLogo';
import { NavbarSearch } from './NavbarSearch';
import { NavbarLinks } from './NavbarLinks';
import { NavbarUserMenu } from './NavbarUserMenu';
import { NavbarNotifications } from './NavbarNotifications';
import { NavbarThemeToggle } from './NavbarThemeToggle';
import { NavbarMobileMenu } from './NavbarMobileMenu';
import { QuickNavLinks } from './QuickNavLinks';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { getOrganizationSettings } from '@/lib/api/settings';
import { getProductCategories } from '@/api/store';
import type { Category } from '@/api/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarMainProps {
  className?: string;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  categories?: Category[];
  isMobile?: boolean;
}

export function NavbarMain({
  className,
  toggleSidebar,
  isSidebarOpen,
  categories: propCategories,
  isMobile
}: NavbarMainProps) {
  const { user, userProfile, isLoadingUserProfile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);
  const location = useLocation();
  const { currentOrganization } = useTenant();
  
  const cacheKey = useRef<string>(`org_settings_${window.location.hostname}`);
  const [orgLogo, setOrgLogo] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [displayTextWithLogo, setDisplayTextWithLogo] = useState<boolean>(true);
  const [storeCategories, setStoreCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isAdminPage = location.pathname.startsWith('/dashboard');
  const isAdmin = userProfile?.role === 'admin';
  const isEmployee = userProfile?.role === 'employee';
  const isStaff = isAdmin || isEmployee;
  
  // إضافة المساحة المطلوبة للمحتوى تحت النافبار الثابت
  useEffect(() => {
    // تحديد ارتفاع النافبار الثابت
    const navbarHeight = '64px'; // تطابق h-16 في tailwind
    
    // تحقق إذا لم تكن المساحة مضافة بالفعل
    if (!document.body.style.paddingTop || document.body.style.paddingTop !== navbarHeight) {
      document.documentElement.style.setProperty('--navbar-height', navbarHeight);
      document.body.style.paddingTop = navbarHeight;
    }
    
    // تنظيف التأثير عند إلغاء المكون
    return () => {
      // تأكد من عدم حذف المساحة إذا كان هناك navbar آخر يستخدمها
      const navbarsInPage = document.querySelectorAll('[data-navbar="true"]');
      if (navbarsInPage.length <= 1) {
        document.body.style.paddingTop = '';
        document.documentElement.style.removeProperty('--navbar-height');
      }
    };
  }, []);
  
  // Handle scroll events for advanced header effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Load cached organization settings immediately  
  const loadCachedOrgSettings = () => {
    try {
      const cached = localStorage.getItem(cacheKey.current);
      if (cached) {
        const data = JSON.parse(cached);
        setSiteName(data.site_name);
        setOrgLogo(data.logo_url);
        setDisplayTextWithLogo(data.display_text_with_logo !== false);
      }
    } catch (error) {
    }
  };

  // Load organization settings from database and cache them
  const loadOrgSettings = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const settings = await getOrganizationSettings(currentOrganization.id);
      if (settings) {
        const orgData = {
          site_name: settings.site_name || currentOrganization.name,
          logo_url: settings.logo_url || currentOrganization.logo_url,
          display_text_with_logo: settings.display_text_with_logo !== false
        };
        
        setSiteName(orgData.site_name);
        setOrgLogo(orgData.logo_url);
        setDisplayTextWithLogo(orgData.display_text_with_logo);
        
        localStorage.setItem(cacheKey.current, JSON.stringify(orgData));
      }
    } catch (error) {
    }
  };

  // Load organization settings
  useEffect(() => {
    loadCachedOrgSettings();
    
    if (currentOrganization?.id || currentOrganization?.name) {
      setTimeout(loadOrgSettings, 100);
    }
    
    // إضافة مستمع للتحديثات الحية
    const handleSettingsUpdate = () => {
      console.log('🔄 [NavbarMain] استجابة لتحديث إعدادات المؤسسة...');
      loadOrgSettings();
    };
    
    // الاشتراك في حدث تحديث إعدادات المؤسسة
    window.addEventListener('organization_settings_updated', handleSettingsUpdate);
    
    // مراقبة تغييرات DOM للعثور على تحديثات شعار المؤسسة
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'src' && 
            mutation.target instanceof HTMLImageElement && 
            mutation.target.dataset.logo === 'organization') {
          // تحديث شعار المؤسسة إذا تغير في مكان آخر
          const newLogoUrl = mutation.target.src;
          if (newLogoUrl && newLogoUrl !== orgLogo) {
            console.log('🔄 [NavbarMain] تم اكتشاف تغيير شعار المؤسسة، تحديث العرض');
            setOrgLogo(newLogoUrl);
          }
        }
      });
    });
    
    // بدء مراقبة التغييرات في جميع صور الشعار
    document.querySelectorAll('img[data-logo="organization"]').forEach(img => {
      observer.observe(img, { attributes: true });
    });
    
    return () => {
      window.removeEventListener('organization_settings_updated', handleSettingsUpdate);
      observer.disconnect();
    };
  }, [currentOrganization?.id, currentOrganization?.name]);
  
  // Load product categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (propCategories?.length) {
        setStoreCategories(propCategories);
        return;
      }
      if (!currentOrganization?.id) return;
      
      setIsLoadingCategories(true);
      try {
        const categoriesFromDB = await getProductCategories(currentOrganization.id);
        if (categoriesFromDB && categoriesFromDB.length > 0) {
          setStoreCategories(categoriesFromDB);
        }
      } catch (error) {
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [currentOrganization?.id, propCategories]);

  const handleSearch = (query: string) => {
  };
  
  // Enhanced notification sample data
  const sampleNotifications = [
    {
      id: '1',
      title: 'طلب جديد',
      message: 'تم إنشاء طلب جديد برقم #12345',
      time: 'منذ 5 دقائق',
      read: false
    },
    {
      id: '2',
      title: 'إشعار النظام',
      message: 'تم تحديث إعدادات المتجر بنجاح',
      time: 'منذ ساعة',
      read: false
    },
    {
      id: '3',
      title: 'تعليق جديد',
      message: 'علق أحمد على منتج "PlayStation 5"',
      time: 'منذ 3 ساعات',
      read: true
    }
  ];

  if (isLoadingUserProfile && user) {
    return (
      <div className={cn(
        "flex items-center justify-between p-3 shadow-sm bg-background/90 backdrop-blur-md",
        className
      )}>
        <NavbarLogo siteName="جاري التحميل..." />
        <div className="animate-pulse h-8 w-8 bg-muted rounded-full"></div>
      </div>
    );
  }

  // Enhanced mobile quick links rendering
  const renderMobileQuickLinks = () => {
    return (
      <DropdownMenu open={isQuickLinksOpen} onOpenChange={setIsQuickLinksOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm border border-primary/20 shadow-sm hover:shadow-lg hover:from-primary/10 hover:to-primary/20 transition-all duration-300 px-3 text-xs font-medium group"
          >
            <Sparkles className="h-3.5 w-3.5 ml-1 text-primary/70 group-hover:text-primary transition-colors duration-300" />
            <span className="text-sm">الأقسام</span>
            <ChevronDown className="h-3.5 w-3.5 mr-1 opacity-80 transition-transform duration-300" style={{ transform: isQuickLinksOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl p-3 border-border/30 shadow-xl backdrop-blur-md bg-background/95">
          <div className="w-64">
            <QuickNavLinks variant="vertical" maxItems={6} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header 
      data-navbar="true"
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
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="flex items-center justify-between h-16 py-2 px-4 mx-auto w-full relative">
        {/* Animated background particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/2 w-0.5 h-0.5 bg-primary/25 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {isStaff && toggleSidebar && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar} 
              className={cn(
                "hidden md:flex rounded-xl transition-all duration-300 group relative overflow-hidden",
                "bg-gradient-to-br from-background/50 to-background/80 hover:from-primary/10 hover:to-primary/20",
                "border border-border/30 hover:border-primary/30 shadow-sm hover:shadow-md"
              )}
              aria-label={isSidebarOpen ? "طي القائمة الجانبية" : "توسيع القائمة الجانبية"}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {isSidebarOpen ? (
                <ArrowRightToLine className="h-4 w-4 text-foreground/80 group-hover:text-primary transition-colors duration-300 relative z-10" />
              ) : (
                <ArrowLeftToLine className="h-4 w-4 text-foreground/80 group-hover:text-primary transition-colors duration-300 relative z-10" />
              )}
            </Button>
          )}
          
          <div className="relative">
            <NavbarLogo 
              orgLogo={orgLogo} 
              siteName={siteName} 
              displayTextWithLogo={displayTextWithLogo} 
              isAdminPage={isAdminPage}
              withGradientEffect={true}
            />
          </div>
        </div>

        {/* Center navigation with enhanced styling */}
        {isAdminPage && (
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-lg px-1 py-1">
              <QuickNavLinks variant="navbar" maxItems={5} />
            </div>
          </div>
        )}

        {!isAdminPage && (
          <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-lg px-2 py-1">
              <NavbarLinks 
                isAdminPage={isAdminPage} 
                categories={storeCategories} 
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3 relative z-10">
          {/* Mobile quick links with enhanced design */}
          {isAdminPage && (
            <div className="md:hidden">
              {renderMobileQuickLinks()}
            </div>
          )}
          
          {/* Search with glass morphism effect */}
          {!isAdminPage && (
            <div className="hidden lg:block">
              <div className="bg-gradient-to-r from-background/30 to-background/50 backdrop-blur-md rounded-xl border border-border/20 shadow-sm">
                <NavbarSearch variant="minimal" onSearch={handleSearch} />
              </div>
            </div>
          )}
          
          {/* Action buttons with enhanced styling */}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
              <NavbarThemeToggle />
            </div>
            
            {user && (
              <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
                <NavbarNotifications initialNotifications={sampleNotifications} />
              </div>
            )}
            
            <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
              <NavbarUserMenu isAdminPage={isAdminPage} />
            </div>
          </div>
          
          {/* Mobile menu with enhanced design */}
          <div className="lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(true)}
              className={cn(
                "rounded-xl transition-all duration-300 group relative overflow-hidden",
                "bg-gradient-to-br from-background/50 to-background/80 hover:from-primary/10 hover:to-primary/20",
                "border border-border/30 hover:border-primary/30 shadow-sm hover:shadow-md"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Menu className="h-5 w-5 text-foreground/80 group-hover:text-primary transition-colors duration-300 relative z-10" />
            </Button>
            
            <NavbarMobileMenu
              isOpen={isMenuOpen}
              onOpenChange={setIsMenuOpen}
              userProfile={userProfile}
              user={user}
              orgLogo={orgLogo}
              siteName={siteName}
              displayTextWithLogo={displayTextWithLogo}
              isAdminPage={isAdminPage}
              categories={storeCategories}
            >
              {isAdminPage && (
                <div className="mb-4">
                  <QuickNavLinks variant="vertical" />
                </div>
              )}
            </NavbarMobileMenu>
          </div>
        </div>
        
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      </div>
    </header>
  );
}
