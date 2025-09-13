import { Link, useLocation } from 'react-router-dom';
import { 
  Store, Package, ShoppingBag, 
  BarChart3, ShoppingCart, Database
  
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useIsAppEnabled } from '@/context/SuperUnifiedDataContext';
import { useTenant } from '@/context/TenantContext';

// Hook آمن للتحقق من تفعيل التطبيقات
const useIsAppEnabledSafe = (appId: string): boolean => {
  try {
    return useIsAppEnabled(appId);
  } catch (error) {
    // إذا لم يكن SuperUnifiedDataProvider متوفر، إرجاع false
    return false;
  }
};

interface QuickLink {
  title: string;
  href: string;
  icon: any;
  color: string;
  bgColor: string;
  hoverColor?: string;
  hoverBgColor?: string;
  appId?: string;
  isExternal?: boolean;
}

interface QuickNavLinksProps {
  variant?: 'horizontal' | 'grid' | 'vertical' | 'navbar';
  className?: string;
  maxItems?: number;
  highlightActive?: boolean;
}

export function QuickNavLinks({ 
  variant = 'grid',
  className,
  maxItems,
  highlightActive = true
}: QuickNavLinksProps) {
  const location = useLocation();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [initialRender, setInitialRender] = useState(true);
  const { currentOrganization } = useTenant();
  
  // دالة لتوليد رابط المتجر الصحيح (نفس منطق NavbarUserMenu)
  const getStoreUrl = () => {
    if (!currentOrganization?.subdomain) {
      return '/';
    }
    
    // إذا كنا على localhost، استخدم النطاق الفرعي مع localhost
    if (window.location.hostname.includes('localhost')) {
      const port = window.location.port ? `:${window.location.port}` : '';
      return `http://${currentOrganization.subdomain}.localhost${port}`;
    }
    
    // إذا كنا على stockiha.com، استخدم النطاق الفرعي
    if (window.location.hostname.includes('stockiha.com')) {
      return `https://${currentOrganization.subdomain}.stockiha.com`;
    }
    
    // إذا كنا على stockiha.pages.dev، استخدم النطاق الفرعي مع stockiha.com
    if (window.location.hostname.includes('stockiha.pages.dev')) {
      return `https://${currentOrganization.subdomain}.stockiha.com`;
    }
    
    // إذا كنا على ktobi.online، استخدم النطاق الفرعي
    if (window.location.hostname.includes('ktobi.online')) {
      return `https://${currentOrganization.subdomain}.ktobi.online`;
    }
    
    // احتياطي: عودة إلى الصفحة الرئيسية
    return '/';
  };
  
  // تعيين الحالة الأولية بعد التحميل لتفعيل التأثيرات الانتقالية
  useEffect(() => {
    const timer = setTimeout(() => setInitialRender(false), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const quickNavLinks: QuickLink[] = [
    {
      title: 'نقطة البيع',
      href: '/dashboard/pos-advanced',
      icon: Store,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      hoverColor: 'text-blue-600 dark:text-blue-400',
      hoverBgColor: 'bg-blue-200 dark:bg-blue-800/40',
      appId: 'pos'
    },
    {
      title: 'المنتجات',
      href: '/dashboard/products',
      icon: Package,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      hoverColor: 'text-purple-600 dark:text-purple-400',
      hoverBgColor: 'bg-purple-200 dark:bg-purple-800/40'
    },
    {
      title: 'المخزون',
      href: '/dashboard/inventory',
      icon: Database,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      hoverColor: 'text-orange-600 dark:text-orange-400',
      hoverBgColor: 'bg-orange-200 dark:bg-orange-800/40'
    },
    {
      title: 'الطلبيات',
      href: '/dashboard/orders-v2',
      icon: ShoppingBag,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      hoverColor: 'text-red-600 dark:text-red-400',
      hoverBgColor: 'bg-red-200 dark:bg-red-800/40'
    },
    {
      title: 'التحليلات',
      href: '/dashboard/financial-analytics',
      icon: BarChart3,
      color: 'text-violet-500',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      hoverColor: 'text-violet-600 dark:text-violet-400',
      hoverBgColor: 'bg-violet-200 dark:bg-violet-800/40'
    },
    {
      title: 'المتجر',
      href: '#',
      icon: ShoppingCart,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      hoverColor: 'text-emerald-600 dark:text-emerald-400',
      hoverBgColor: 'bg-emerald-200 dark:bg-emerald-800/40',
      isExternal: true
    }
  ];
  
  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  // نمط عرض القائمة في النافبار - أصغر وأكثر أناقة
  const renderNavbarLinks = () => {
    // التحقق من تفعيل التطبيقات
    const isPOSEnabled = useIsAppEnabledSafe('pos');
    
    // تصفية الروابط حسب التطبيقات المفعلة
    const filteredLinks = quickNavLinks.filter(link => {
      if (link.appId === 'pos' && !isPOSEnabled) return false;
      return true;
    });
    
    const visibleLinks = maxItems ? filteredLinks.slice(0, maxItems) : filteredLinks.slice(0, 5);
    
    return (
      <div className={cn(
        "flex items-center gap-1.5 h-full",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => {
          const linkContent = (
            <>
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all duration-300 group-hover:scale-110 overflow-hidden",
                isActiveLink(link.href) ? link.bgColor : "bg-transparent group-hover:bg-muted/60"
              )}>
                {link.icon && (
                  <link.icon 
                    className={cn(
                      "h-4 w-4 transition-all duration-300", 
                      isActiveLink(link.href) ? link.color : "text-current group-hover:text-foreground",
                      (link.href === hoveredLink && !isActiveLink(link.href)) && "rotate-6 scale-110"
                    )} 
                  />
                )}
                
                {/* تأثير الموجة عند التحويم */}
                {link.href === hoveredLink && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out"></div>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium transition-all duration-300",
                isActiveLink(link.href) ? "font-semibold" : "",
                link.href === hoveredLink ? "scale-105" : "scale-100"
              )}>
                {link.title}
              </span>
              
              {/* خلفية تأثير التحويم */}
              {link.href === hoveredLink && !isActiveLink(link.href) && (
                <div className="absolute inset-0 -z-10 bg-muted/30 dark:bg-muted/20 rounded-md blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
            </>
          );

          if (link.isExternal) {
            return (
              <a
                key={index}
                href={link.title === 'المتجر' ? getStoreUrl() : link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group relative flex flex-col items-center justify-center px-2.5 py-1 h-full rounded-md transition-all duration-300",
                  "text-muted-foreground hover:text-foreground"
                )}
                onMouseEnter={() => setHoveredLink(link.href)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                {linkContent}
              </a>
            );
          }

          return (
            <Link
              key={index}
              to={link.href}
              className={cn(
                "group relative flex flex-col items-center justify-center px-2.5 py-1 h-full rounded-md transition-all duration-300",
                isActiveLink(link.href)
                  ? "text-primary after:content-[''] after:block after:h-0.5 after:w-1/2 after:bg-primary after:rounded-full after:mt-0.5 after:transition-all after:duration-300 after:ease-out hover:after:w-2/3"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onMouseEnter={() => setHoveredLink(link.href)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {linkContent}
            </Link>
          );
        })}
      </div>
    );
  };
  
  const renderGridLinks = () => {
    // التحقق من تفعيل التطبيقات
    const isPOSEnabled = useIsAppEnabledSafe('pos');
    
    // تصفية الروابط حسب التطبيقات المفعلة
    const filteredLinks = quickNavLinks.filter(link => {
      if (link.appId === 'pos' && !isPOSEnabled) return false;
      return true;
    });
    
    const visibleLinks = maxItems ? filteredLinks.slice(0, maxItems) : filteredLinks.slice(0, 6);
    
    return (
      <div className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 p-6 bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/20",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => {
          if (link.isExternal) {
            return (
              <a
                key={index}
                href={link.title === 'المتجر' ? getStoreUrl() : link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-500 relative overflow-hidden",
                  "bg-gradient-to-br from-card/60 to-card/40 hover:from-card/80 hover:to-card/60",
                  "border border-border/30 hover:border-border/50",
                  "hover:shadow-2xl hover:-translate-y-2 hover:scale-105",
                  "backdrop-blur-sm"
                )}
                onMouseEnter={() => setHoveredLink(link.href)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                {/* خلفية متدرجة */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                
                {/* أيقونة محسنة */}
                <div className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-500 group-hover:scale-110 relative overflow-hidden",
                  "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-800/10",
                  "shadow-lg group-hover:shadow-2xl"
                )}>
                  {link.icon && (
                    <link.icon 
                      className="h-8 w-8 text-emerald-600 dark:text-emerald-400 transition-all duration-500 group-hover:scale-110" 
                    />
                  )}
                  
                  {/* تأثير التوهج */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                </div>
                
                {/* النص */}
                <span className="text-sm font-semibold text-center text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all duration-300">
                  {link.title}
                </span>
                
                {/* تأثير الموجة عند التحويم */}
                {link.href === hoveredLink && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out rounded-2xl" />
                )}
              </a>
            );
          }

          return (
            <Link
              key={index}
              to={link.href}
              className={cn(
                "group flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-500 relative overflow-hidden",
                isActiveLink(link.href) && highlightActive
                  ? "bg-gradient-to-br from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border-primary/30 shadow-2xl"
                  : "bg-gradient-to-br from-card/60 to-card/40 hover:from-card/80 hover:to-card/60 border-transparent hover:border-border/50",
                "border hover:shadow-2xl hover:-translate-y-2 hover:scale-105",
                "backdrop-blur-sm"
              )}
              onMouseEnter={() => setHoveredLink(link.href)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {/* خلفية متدرجة */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl",
                isActiveLink(link.href) 
                  ? "bg-gradient-to-br from-primary/10 via-transparent to-primary/5" 
                  : "bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"
              )} />
              
              {/* أيقونة محسنة */}
              <div className={cn(
                "flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-500 group-hover:scale-110 relative overflow-hidden",
                link.bgColor,
                isActiveLink(link.href) ? "scale-110 shadow-2xl" : "shadow-lg group-hover:shadow-2xl",
                link.href === hoveredLink ? link.hoverBgColor : ""
              )}>
                {link.icon && (
                  <link.icon 
                    className={cn(
                      "h-8 w-8 transition-all duration-500 group-hover:scale-110", 
                      isActiveLink(link.href) && highlightActive ? link.hoverColor : link.color,
                      link.href === hoveredLink ? "scale-110" : ""
                    )} 
                  />
                )}
                
                {/* تأثير التوهج */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl",
                  isActiveLink(link.href) 
                    ? "bg-gradient-to-br from-primary/400/20 to-transparent" 
                    : "bg-gradient-to-br from-primary/400/20 to-transparent"
                )} />
                
                {/* تأثير النبض عند التنشيط */}
                {isActiveLink(link.href) && (
                  <span className="absolute inset-0 rounded-2xl animate-ping opacity-30 bg-primary/40"></span>
                )}
              </div>
              
              {/* النص */}
              <span className={cn(
                "text-sm font-semibold text-center transition-all duration-300",
                isActiveLink(link.href) && highlightActive 
                  ? "text-primary font-bold" 
                  : "text-foreground group-hover:text-primary"
              )}>
                {link.title}
              </span>
              
              {/* تأثير الموجة عند التحويم */}
              {link.href === hoveredLink && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out rounded-2xl" />
              )}
            </Link>
          );
        })}
      </div>
    );
  };
  
  const renderHorizontalLinks = () => {
    // التحقق من تفعيل التطبيقات
    const isPOSEnabled = useIsAppEnabledSafe('pos');
    
    // تصفية الروابط حسب التطبيقات المفعلة
    const filteredLinks = quickNavLinks.filter(link => {
      if (link.appId === 'pos' && !isPOSEnabled) return false;
      return true;
    });
    
    const visibleLinks = maxItems ? filteredLinks.slice(0, maxItems) : filteredLinks;
    
    return (
      <div className={cn(
        "flex items-center gap-3 overflow-x-auto p-4 bg-gradient-to-r from-background/95 to-background/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/20 no-scrollbar",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => {
          if (link.isExternal) {
            return (
              <a
                key={index}
                href={link.title === 'المتجر' ? getStoreUrl() : link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex items-center gap-3 min-w-max px-5 py-3 rounded-xl transition-all duration-500 relative overflow-hidden",
                  "bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10",
                  "border border-emerald-200 dark:border-emerald-700/30",
                  "hover:shadow-xl hover:-translate-y-1 hover:scale-105",
                  "backdrop-blur-sm"
                )}
                onMouseEnter={() => setHoveredLink(link.href)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                {/* خلفية متدرجة */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500 group-hover:scale-110 relative",
                  "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-800/20 dark:to-emerald-700/10",
                  "shadow-lg group-hover:shadow-xl"
                )}>
                  {link.icon && (
                    <link.icon 
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400 transition-all duration-500 group-hover:scale-110" 
                    />
                  )}
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 transition-all duration-300">
                  {link.title}
                </span>
                
                {/* تأثير الموجة عند التحويم */}
                {link.href === hoveredLink && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out rounded-xl" />
                )}
              </a>
            );
          }

          return (
            <Link
              key={index}
              to={link.href}
              className={cn(
                "group flex items-center gap-3 min-w-max px-5 py-3 rounded-xl transition-all duration-500 relative overflow-hidden",
                isActiveLink(link.href) && highlightActive
                  ? "bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border-primary/30 shadow-xl"
                  : "bg-gradient-to-r from-card/60 to-card/40 hover:from-card/80 hover:to-card/60 border-transparent hover:border-border/50",
                "border hover:shadow-xl hover:-translate-y-1 hover:scale-105",
                "backdrop-blur-sm"
              )}
              onMouseEnter={() => setHoveredLink(link.href)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {/* خلفية متدرجة */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl",
                isActiveLink(link.href) 
                  ? "bg-gradient-to-r from-primary/10 to-transparent" 
                  : "bg-gradient-to-r from-primary/5 to-transparent"
              )} />
              
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500 group-hover:scale-110 relative",
                link.bgColor,
                link.href === hoveredLink ? link.hoverBgColor : "",
                "shadow-lg group-hover:shadow-xl"
              )}>
                {link.icon && (
                  <link.icon 
                    className={cn(
                      "h-5 w-5 transition-all duration-500 group-hover:scale-110", 
                      link.color,
                      link.href === hoveredLink ? "scale-110" : ""
                    )} 
                  />
                )}
              </div>
              <span className={cn(
                "text-sm font-semibold transition-all duration-300",
                isActiveLink(link.href) && highlightActive 
                  ? "text-primary font-bold" 
                  : "text-foreground group-hover:text-primary"
              )}>
                {link.title}
              </span>
              
              {/* تأثير الموجة عند التحويم */}
              {link.href === hoveredLink && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out rounded-xl" />
              )}
            </Link>
          );
        })}
      </div>
    );
  };
  
  const renderVerticalLinks = () => {
    // التحقق من تفعيل التطبيقات
    const isPOSEnabled = useIsAppEnabledSafe('pos');
    
    // تصفية الروابط حسب التطبيقات المفعلة
    const filteredLinks = quickNavLinks.filter(link => {
      if (link.appId === 'pos' && !isPOSEnabled) return false;
      return true;
    });
    
    const visibleLinks = maxItems ? filteredLinks.slice(0, maxItems) : filteredLinks;
    
    return (
      <div className={cn(
        "flex flex-col gap-3 p-4 bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/20",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => {
          if (link.isExternal) {
            return (
              <a
                key={index}
                href={link.title === 'المتجر' ? getStoreUrl() : link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500 relative overflow-hidden",
                  "bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10",
                  "border border-emerald-200 dark:border-emerald-700/30",
                  "hover:shadow-xl hover:translate-x-2 rtl:hover:-translate-x-2 hover:scale-105",
                  "backdrop-blur-sm"
                )}
                onMouseEnter={() => setHoveredLink(link.href)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                {/* خلفية متدرجة */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-500 group-hover:scale-110 relative",
                  "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-800/20 dark:to-emerald-700/10",
                  "shadow-lg group-hover:shadow-xl"
                )}>
                  {link.icon && (
                    <link.icon 
                      className="h-6 w-6 text-emerald-600 dark:text-emerald-400 transition-all duration-500 group-hover:scale-110" 
                    />
                  )}
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 transition-all duration-300 flex-1">
                  {link.title}
                </span>
                
                {/* سهم للروابط الخارجية */}
                <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                  >
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
                
                {/* تأثير الموجة عند التحويم */}
                {link.href === hoveredLink && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out rounded-xl" />
                )}
              </a>
            );
          }

          return (
            <Link
              key={index}
              to={link.href}
              className={cn(
                "group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500 relative overflow-hidden",
                isActiveLink(link.href) && highlightActive
                  ? "bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border-primary/30 shadow-xl"
                  : "bg-gradient-to-r from-card/60 to-card/40 hover:from-card/80 hover:to-card/60 border-transparent hover:border-border/50",
                "border hover:shadow-xl hover:translate-x-2 rtl:hover:-translate-x-2 hover:scale-105",
                "backdrop-blur-sm"
              )}
              onMouseEnter={() => setHoveredLink(link.href)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {/* خلفية متدرجة */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl",
                isActiveLink(link.href) 
                  ? "bg-gradient-to-r from-primary/10 to-transparent" 
                  : "bg-gradient-to-r from-primary/5 to-transparent"
              )} />
              
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-500 group-hover:scale-110 relative",
                link.bgColor,
                link.href === hoveredLink ? link.hoverBgColor : "",
                "shadow-lg group-hover:shadow-xl"
              )}>
                {link.icon && (
                  <link.icon 
                    className={cn(
                      "h-6 w-6 transition-all duration-500 group-hover:scale-110", 
                      link.color,
                      link.href === hoveredLink ? "scale-110" : ""
                    )} 
                  />
                )}
              </div>
              <span className={cn(
                "text-sm font-semibold transition-all duration-300 flex-1",
                isActiveLink(link.href) && highlightActive 
                  ? "text-primary font-bold" 
                  : "text-foreground group-hover:text-primary"
              )}>
                {link.title}
              </span>
              
              {/* سهم للعناصر النشطة */}
              {(isActiveLink(link.href) || link.href === hoveredLink) && (
                <div className={cn(
                  "opacity-0 transition-opacity duration-300",
                  (isActiveLink(link.href) || link.href === hoveredLink) && "opacity-60 group-hover:opacity-100"
                )}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="text-primary transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                  >
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              )}
              
              {/* تأثير الموجة عند التحويم */}
              {link.href === hoveredLink && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out rounded-xl" />
              )}
            </Link>
          );
        })}
      </div>
    );
  };
  
  if (variant === 'navbar') return renderNavbarLinks();
  if (variant === 'horizontal') return renderHorizontalLinks();
  if (variant === 'vertical') return renderVerticalLinks();
  return renderGridLinks();
}
