import { useState, useEffect, useRef, startTransition, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  Search, 
  LogOut, 
  Bell, 
  ShieldCheck, 
  Settings, 
  UserCircle, 
  Store, 
  Package,
  ShoppingBag,
  Users,
  Sun,
  Moon,
  Layers,
  BarChart3,
  DollarSign,
  FileText,
  Database,
  Tag,
  Wrench,
  Calendar,
  Truck,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { getCurrentUserProfile } from '@/lib/api/users';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
import { useTenant } from '@/context/TenantContext';
import { getOrganizationSettings } from '@/lib/api/settings';
import { getProductCategories } from '@/api/store';
import { Category } from '@/api/store';
import { flushSync } from 'react-dom';

interface NavbarProps {
  className?: string;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  categories?: Category[];
  isMobile?: boolean;
}

const Navbar = ({ className, toggleSidebar, isSidebarOpen, categories: propCategories, isMobile }: NavbarProps) => {
  const { cart = [] } = {}; // استخدام كارت فارغ مؤقتاً بدلاً من useShop
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(3);
  const [showNotificationDot, setShowNotificationDot] = useState(true);
  const { currentOrganization } = useTenant();
  
  // استخدام useRef للحفاظ على مفتاح التخزين المؤقت
  const cacheKey = useRef<string>(`org_settings_${window.location.hostname}`);
  const [orgLogo, setOrgLogo] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [displayTextWithLogo, setDisplayTextWithLogo] = useState<boolean>(true);
  const [storeCategories, setStoreCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const isAdminPage = location.pathname.startsWith('/dashboard');
  
  // تطبيق View Transitions API للتغييرات المرئية
  const applyViewTransition = (callback: () => void) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          callback();
        });
      });
    } else {
      callback();
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setIsLoadingProfile(true);
        try {
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchUserProfile();
  }, [user]);
  
  // محسن - استرجاع إعدادات المنظمة من التخزين المؤقت أولاً للعرض الفوري
  useEffect(() => {
    // تحميل البيانات من التخزين المحلي أولاً للعرض الفوري
    const loadCachedOrgSettings = () => {
      const cachedData = localStorage.getItem(cacheKey.current);
      if (cachedData) {
        try {
          const { orgLogo, siteName, displayTextWithLogo, timestamp } = JSON.parse(cachedData);
          
          // استخدام البيانات المخزنة مؤقتًا فقط إذا كانت حديثة (أقل من ساعة)
          const isRecent = (Date.now() - timestamp) < (60 * 60 * 1000);
          
          if (isRecent) {
            applyViewTransition(() => {
              setOrgLogo(orgLogo || '');
              setSiteName(siteName || currentOrganization?.name || '');
              setDisplayTextWithLogo(displayTextWithLogo !== false);
            });
            return true;
          }
        } catch (e) {
          console.error('خطأ في تحليل البيانات المخزنة مؤقتًا:', e);
        }
      }
      return false;
    };
    
    // إذا لم نجد بيانات في التخزين المؤقت، نضع اسم المنظمة مؤقتًا
    if (!loadCachedOrgSettings() && currentOrganization?.name) {
      setSiteName(currentOrganization.name);
    }
    
    // تحميل البيانات من السيرفر فقط إذا كان هناك معرف منظمة
    const loadOrgSettings = async () => {
      if (currentOrganization?.id) {
        try {
          const settings = await getOrganizationSettings(currentOrganization.id);
          if (settings) {
            applyViewTransition(() => {
              setOrgLogo(settings.logo_url || '');
              setSiteName(settings.site_name || currentOrganization.name || '');
              setDisplayTextWithLogo(settings.display_text_with_logo !== false);
            });
            
            // تخزين البيانات في التخزين المحلي
            localStorage.setItem(cacheKey.current, JSON.stringify({
              orgLogo: settings.logo_url || '',
              siteName: settings.site_name || currentOrganization.name || '',
              displayTextWithLogo: settings.display_text_with_logo !== false,
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error('Error loading organization settings:', error);
        }
      }
    };
    
    // استخدام requestIdleCallback لتحميل البيانات الحقيقية في وقت الخمول
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => loadOrgSettings(), { timeout: 1000 });
    } else {
      // للمتصفحات التي لا تدعم requestIdleCallback
      setTimeout(loadOrgSettings, 100);
    }
  }, [currentOrganization?.id, currentOrganization?.name]);
  
  // تحميل فئات المتجر من قاعدة البيانات إذا لم يتم تمريرها كخصائص
  useEffect(() => {
    const fetchCategories = async () => {
      // إذا تم تمرير الفئات كخصائص، استخدمها
      if (propCategories?.length) {
        setStoreCategories(propCategories);
        return;
      }
      
      // إذا لم تكن هناك منظمة حالية، لا داعي للاستعلام
      if (!currentOrganization?.id) return;
      
      setIsLoadingCategories(true);
      try {
        const categories = await getProductCategories(currentOrganization.id);
        if (categories && categories.length > 0) {
          setStoreCategories(categories);
        }
      } catch (error) {
        console.error('Error fetching store categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, [currentOrganization?.id, propCategories]);
  
  const isAdmin = userProfile?.role === 'admin';
  const isEmployee = userProfile?.role === 'employee';
  const isStaff = isAdmin || isEmployee;
  
  // القائمة تختلف حسب نوع المستخدم
  const getCategories = () => {
    if (isAdminPage) {
      // قائمة اختصارات الأدمن/الموظف
      return [
        { name: 'لوحة التحكم', path: '/dashboard', icon: ShieldCheck },
        { name: 'المنتجات', path: '/dashboard/products', icon: Package },
        { name: 'الطلبات', path: '/dashboard/orders', icon: ShoppingCart },
      ];
    } else if (storeCategories.length > 0) {
      // بدلاً من إظهار كل الفئات، سنستخدم زر واحد لعرض جميع الفئات
      return [
        { name: 'الرئيسية', path: '/', icon: Store },
        { name: 'الفئات', path: '/products', icon: Tag, hasSubmenu: true, submenuItems: storeCategories },
        { name: 'خدمات الإصلاح', path: '/services', icon: Settings },
        { name: 'تتبع الخدمات', path: '/service-tracking-public', icon: Truck },
      ];
    } else {
      // القائمة الافتراضية للزوار والمستخدمين العاديين
      return [
        { name: 'الرئيسية', path: '/', icon: Store },
        { name: 'الفئات', path: '/products', icon: Tag, hasSubmenu: true, submenuItems: [
          { name: 'أجهزة', path: '/category/consoles', id: 'consoles' },
          { name: 'ألعاب', path: '/category/games', id: 'games' },
          { name: 'إكسسوارات', path: '/category/accessories', id: 'accessories' },
        ]},
        { name: 'خدمات الإصلاح', path: '/services', icon: Settings },
        { name: 'تتبع الخدمات', path: '/service-tracking-public', icon: Truck },
      ];
    }
  };
  
  const categories = getCategories();

  // قائمة الروابط السريعة للصفحات المهمة
  const quickNavLinks = [
    {
      title: 'نقطة البيع',
      href: '/dashboard/pos',
      icon: Store,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'المنتجات',
      href: '/dashboard/products',
      icon: Package,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'المبيعات',
      href: '/dashboard/sales',
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'الطلبات',
      href: '/dashboard/orders',
      icon: ShoppingBag,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'الفواتير',
      href: '/dashboard/invoices',
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      title: 'التحليلات',
      href: '/dashboard/analytics',
      icon: BarChart3,
      color: 'text-violet-500',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    }
  ];

  const handleLogout = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج بنجاح");
    window.location.href = '/login';
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    toast.success(`تم التغيير إلى ${theme === "dark" ? "الوضع الفاتح" : "الوضع المظلم"}`);
  };

  const clearNotifications = () => {
    setNotifications(0);
    setShowNotificationDot(false);
  };

  useEffect(() => {
    setShowNotificationDot(notifications > 0);
  }, [notifications]);

  // عرض القائمة في الشريط العلوي
  const renderNavLinks = () => {
    const navLinks = getCategories();
    
    return navLinks.map((link, index) => {
      // إذا كان للرابط قائمة فرعية
      if (link.hasSubmenu) {
        return (
          <DropdownMenu key={index}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="group flex items-center gap-1 hover:bg-background/80">
                <span className="text-sm font-medium">{link.name}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to={link.path} className="flex items-center justify-between w-full">
                  <span>تصفح كل المنتجات</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {link.submenuItems && link.submenuItems.map((subItem, subIndex) => (
                <DropdownMenuItem key={subIndex} asChild>
                  <Link 
                    to={`/products?category=${subItem.id}`} 
                    className="flex items-center justify-between w-full"
                  >
                    <span>{subItem.name}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
      
      // الروابط العادية
      return (
        <Link
          key={index}
          to={link.path}
          className={cn(
            "text-sm font-medium hover:text-primary transition-all duration-300 relative group py-2",
            location.pathname === link.path && "text-primary font-semibold"
          )}
        >
          {link.name}
          <span className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 bg-primary transition-transform duration-300 origin-left",
            location.pathname === link.path ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
          )}></span>
        </Link>
      );
    });
  };

  // تقديم قائمة الهاتف المحمول
  const renderMobileNavLinks = () => {
    const navLinks = getCategories();
    
    return navLinks.map((link, index) => {
      // إذا كان للرابط قائمة فرعية
      if (link.hasSubmenu) {
        const isOpen = openMobileCategory === link.name;
        
        return (
          <div key={index} className="relative">
            <div 
              className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg cursor-pointer"
              onClick={() => setOpenMobileCategory(isOpen ? null : link.name)}
            >
              <div className="flex items-center gap-2">
                {link.icon && <link.icon className="h-5 w-5 text-muted-foreground" />}
                <span className="font-medium">{link.name}</span>
              </div>
              <ChevronDown 
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
            
            {isOpen && (
              <div className="mr-8 mt-1 mb-2 pr-2 border-r border-muted">
                <Link 
                  to={link.path}
                  className="flex items-center py-2 px-4 text-sm hover:bg-muted/50 rounded-lg"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setOpenMobileCategory(null);
                  }}
                >
                  تصفح كل المنتجات
                </Link>
                
                {link.submenuItems && link.submenuItems.map((subItem, subIndex) => (
                  <Link 
                    key={subIndex}
                    to={`/products?category=${subItem.id}`}
                    className="flex items-center py-2 px-4 text-sm hover:bg-muted/50 rounded-lg"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setOpenMobileCategory(null);
                    }}
                  >
                    {subItem.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }
      
      // الروابط العادية
      return (
        <Link
          key={index}
          to={link.path}
          className="flex items-center gap-2 py-3 px-4 hover:bg-muted/50 rounded-lg"
          onClick={() => setIsMenuOpen(false)}
        >
          {link.icon && <link.icon className="h-5 w-5 text-muted-foreground" />}
          <span className="font-medium">{link.name}</span>
        </Link>
      );
    });
  };

  return (
    <nav 
      className={cn(
        "bg-card text-card-foreground shadow-md border-b border-muted",
        isAdminPage ? "bg-gradient-to-l from-primary/5 to-background" : "bg-card",
        className
      )} 
      dir="rtl"
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center">
            {/* زر فتح/إغلاق القائمة الجانبية في حالة الأدمن أو الموظف */}
            {isStaff && toggleSidebar && !isMobile && (
              <button
                onClick={toggleSidebar}
                className="ml-2 p-2 rounded-md hover:bg-primary/10 transition-colors mr-1"
                aria-label={isSidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          
            <Link to="/" className={cn(
              "flex items-center gap-2 text-xl font-bold ml-4",
              isAdminPage ? "text-primary/90" : "text-primary"
            )}>
              {orgLogo ? (
                <div className="h-8 w-auto flex items-center justify-center">
                  <img src={orgLogo} alt="شعار المنصة" className="h-full max-h-8 w-auto object-contain" />
                </div>
              ) : (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isAdminPage ? "bg-primary/10" : "bg-primary/5"
                )}>
                  <Package className="h-4 w-4 text-primary" />
                </div>
              )}
              {displayTextWithLogo && (
                <span className={cn(
                  "hidden sm:inline",
                  isAdminPage && isAdmin && "bg-gradient-to-l from-primary/90 to-primary/70 bg-clip-text text-transparent"
                )}>
                  {siteName}
                  {isAdminPage && isAdmin && <span className="text-xs mr-1 bg-primary/20 text-primary px-1 py-0.5 rounded-sm">مسؤول</span>}
                  {isAdminPage && isEmployee && <span className="text-xs mr-1 bg-primary/20 text-primary px-1 py-0.5 rounded-sm">موظف</span>}
                </span>
              )}
            </Link>
            
            {/* فقط أظهر زر القائمة المتنقلة إذا كنا لسنا في صفحة لوحة التحكم أو إذا كنا في صفحة لوحة التحكم ولكن ليس في وضع الجوال */}
            {(!isAdminPage || !isMobile) && (
              <button
                className="inline-flex items-center justify-center p-2 rounded-md md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <span className="sr-only">فتح القائمة الرئيسية</span>
                {isMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            {renderNavLinks()}
            
            {/* قائمة الوصول السريع - تظهر فقط للمسؤولين والموظفين */}
            {isStaff && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mr-2 border-dashed border-primary/30 hover:border-primary/50 bg-background/80"
                  >
                    <Layers className="h-4 w-4 ml-1 text-primary" />
                    <span>الصفحات المهمة</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>الوصول السريع</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {quickNavLinks.map((link) => (
                      <DropdownMenuItem asChild key={link.href}>
                        <Link 
                          to={link.href} 
                          className="cursor-pointer group flex items-center gap-2 py-2"
                        >
                          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center transition-colors", 
                            link.bgColor)}>
                            <link.icon className={cn("h-4 w-4", link.color)} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{link.title}</span>
                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              {location.pathname === link.href ? "الصفحة الحالية" : "انتقل إلى الصفحة"}
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground">عرض كل الصفحات</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Search, Cart, User */}
          <div className="flex items-center space-x-2 space-x-reverse">
            {/* روابط سريعة للصفحات المهمة في شريط الأدوات العلوي */}
            {isStaff && isAdminPage && (
              <div className="hidden lg:flex items-center space-x-1 space-x-reverse ml-2">
                {quickNavLinks.slice(0, 3).map((link) => (
                  <TooltipProvider key={link.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link 
                          to={link.href}
                          className={cn(
                            "p-2 rounded-md transition-all hover:scale-110",
                            location.pathname === link.href 
                              ? link.bgColor
                              : "hover:" + link.bgColor
                          )}
                        >
                          <link.icon className={cn("h-5 w-5", link.color)} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{link.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}

            {/* زر تبديل الثيم */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="relative rounded-full hover:bg-muted"
                    aria-label={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع المظلم"}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Moon className="h-5 w-5 text-slate-700" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{theme === "dark" ? "الوضع الفاتح" : "الوضع المظلم"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {!isAdminPage && (
              <>
                <div className="hidden md:flex relative">
                  <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="ابحث عن منتجات..."
                    className="w-[200px] pr-8 pl-4"
                    dir="rtl"
                  />
                </div>
                
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <ShoppingCart className="h-5 w-5" />
                      {totalItems > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {totalItems}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] sm:w-[350px] px-0">
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                          <Link to={isAdminPage ? '/dashboard' : '/'} className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                            {orgLogo ? (
                              <img src={orgLogo} alt="Logo" className="h-8 w-8 object-contain" />
                            ) : (
                              <ShoppingBag className="h-6 w-6 text-primary" />
                            )}
                            <span className="font-bold text-xl">{siteName}</span>
                          </Link>
                          
                          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="px-3 py-4 flex-1 overflow-auto">
                        {isStaff && (
                          <>
                            <div className="mb-2 px-3">
                              <h3 className="text-sm font-medium text-muted-foreground mb-2">وصول سريع</h3>
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                {quickNavLinks.slice(0, 4).map((link, i) => (
                                  <Link
                                    key={i}
                                    to={link.href}
                                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl hover:bg-muted/80 transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    <div className={cn("p-2 rounded-full", link.bgColor)}>
                                      <link.icon className={cn("h-5 w-5", link.color)} />
                                    </div>
                                    <span className="text-xs font-medium">{link.title}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                            <div className="h-px bg-border my-4"></div>
                          </>
                        )}
                        
                        <div className="space-y-1">
                          {renderMobileNavLinks()}
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}
            
            {/* إشعارات للأدمن والموظف */}
            {isStaff && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {showNotificationDot && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary">
                          {notifications}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>الإشعارات</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={isAdminPage ? "outline" : "ghost"} 
                    size="sm" 
                    className={cn(
                      "rounded-full p-0",
                      isAdminPage && "border-primary/20 hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className={cn(
                        "h-8 w-8",
                        isAdminPage && "border-2 border-primary/20"
                      )}>
                        <AvatarImage src="/user-avatar.png" alt={userProfile?.name || user.email} />
                        <AvatarFallback className={isAdminPage ? "bg-primary/10 text-primary" : ""}>
                          {userProfile?.name?.charAt(0) || user.email?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {isAdminPage && (
                        <div className="hidden md:block text-right">
                          <p className="text-sm font-medium">
                            {isAdmin ? 'المسؤول' : isEmployee ? 'الموظف' : 'المستخدم'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-primary" />
                    <span>حسابي</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* زر تبديل الثيم في القائمة */}
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer flex items-center gap-2">
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-700" />
                    )}
                    <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع المظلم"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isStaff && !isAdminPage && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="w-full cursor-pointer flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>لوحة التحكم</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdminPage && (
                    <DropdownMenuItem asChild>
                      <Link to="/" className="w-full cursor-pointer flex items-center gap-2">
                        <Store className="h-4 w-4 text-primary" />
                        <span>العودة للمتجر</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full cursor-pointer flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      <span>الملف الشخصي</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="w-full cursor-pointer flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>طلباتي</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="cursor-pointer flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>الإعدادات</span>
                    </Link>
                  </DropdownMenuItem>
                  {/* إضافة رابط للوصول إلى لوحة المسؤول الرئيسي إذا كان المستخدم مسؤولاً رئيسياً */}
                  {userProfile?.is_super_admin && (
                    <DropdownMenuItem asChild>
                      <Link to="/super-admin" className="cursor-pointer flex items-center gap-2 text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>لوحة المسؤول الرئيسي</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" asChild className="border-primary/20 hover:border-primary/40">
                      <Link to="/login" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-sm">تسجيل الدخول</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>تسجيل الدخول إلى حسابك</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
          <div className="pt-2 pb-4 space-y-1">
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن منتجات..."
                  className="w-full pr-8 pl-4"
                  dir="rtl"
                />
              </div>
            </div>
            {/* إضافة زر تبديل الثيم في القائمة المحمولة */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium hover:bg-primary/10 transition-colors"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-5 w-5 ml-1 text-yellow-500" />
                  <span>الوضع الفاتح</span>
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5 ml-1 text-slate-700" />
                  <span>الوضع المظلم</span>
                </>
              )}
            </button>
            {categories.map((category) => (
              <Link
                key={category.path}
                to={category.path}
                className="flex items-center gap-2 block px-3 py-2 rounded-md text-base font-medium hover:bg-primary/10"
                onClick={() => setIsMenuOpen(false)}
              >
                <category.icon className="h-5 w-5 ml-1 text-primary/70" />
                {category.name}
              </Link>
            ))}
            
            {isStaff && !isAdminPage && (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 block px-3 py-2 mt-2 rounded-md text-base font-medium bg-primary/10 text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShieldCheck className="h-5 w-5 ml-1" />
                لوحة التحكم
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


