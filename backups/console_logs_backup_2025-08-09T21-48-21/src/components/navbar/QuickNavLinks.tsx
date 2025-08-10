import { Link, useLocation } from 'react-router-dom';
import { 
  Store, Package, DollarSign, ShoppingBag, 
  FileText, BarChart3, Calendar, Users, Database 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface QuickLink {
  title: string;
  href: string;
  icon: any;
  color: string;
  bgColor: string;
  hoverColor?: string;
  hoverBgColor?: string;
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
      hoverBgColor: 'bg-blue-200 dark:bg-blue-800/40'
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
      title: 'المبيعات',
      href: '/dashboard/sales',
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      hoverColor: 'text-emerald-600 dark:text-emerald-400',
      hoverBgColor: 'bg-emerald-200 dark:bg-emerald-800/40'
    },
    {
      title: 'الطلبات',
      href: '/dashboard/orders',
      icon: ShoppingBag,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      hoverColor: 'text-red-600 dark:text-red-400',
      hoverBgColor: 'bg-red-200 dark:bg-red-800/40'
    },
    {
      title: 'الفواتير',
      href: '/dashboard/invoices',
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      hoverColor: 'text-orange-600 dark:text-orange-400',
      hoverBgColor: 'bg-orange-200 dark:bg-orange-800/40'
    },
    {
      title: 'التحليلات',
      href: '/dashboard/analytics',
      icon: BarChart3,
      color: 'text-violet-500',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      hoverColor: 'text-violet-600 dark:text-violet-400',
      hoverBgColor: 'bg-violet-200 dark:bg-violet-800/40'
    },
    {
      title: 'المستخدمين',
      href: '/dashboard/users',
      icon: Users,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      hoverColor: 'text-indigo-600 dark:text-indigo-400',
      hoverBgColor: 'bg-indigo-200 dark:bg-indigo-800/40'
    },
    {
      title: 'المواعيد',
      href: '/dashboard/appointments',
      icon: Calendar,
      color: 'text-teal-500',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
      hoverColor: 'text-teal-600 dark:text-teal-400',
      hoverBgColor: 'bg-teal-200 dark:bg-teal-800/40'
    }
  ];
  
  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  // نمط عرض القائمة في النافبار - أصغر وأكثر أناقة
  const renderNavbarLinks = () => {
    const visibleLinks = maxItems ? quickNavLinks.slice(0, maxItems) : quickNavLinks.slice(0, 5);
    
    return (
      <div className={cn(
        "flex items-center gap-1.5 h-full",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => (
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
          </Link>
        ))}
      </div>
    );
  };
  
  const renderGridLinks = () => {
    const visibleLinks = maxItems ? quickNavLinks.slice(0, maxItems) : quickNavLinks.slice(0, 6);
    
    return (
      <div className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3.5 bg-card/80 backdrop-blur-sm rounded-xl shadow-md border border-border/40",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => (
          <Link
            key={index}
            to={link.href}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 group hover:shadow-lg border relative overflow-hidden",
              isActiveLink(link.href) && highlightActive
                ? "bg-primary/10 hover:bg-primary/15 border-primary/20 shadow-lg"
                : "hover:bg-card-foreground/5 border-transparent hover:border-border/50",
              "hover:-translate-y-0.5"
            )}
            onMouseEnter={() => setHoveredLink(link.href)}
            onMouseLeave={() => setHoveredLink(null)}
          >
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full mb-2.5 transition-all duration-500 group-hover:scale-110 relative overflow-hidden",
              link.bgColor,
              isActiveLink(link.href) && !highlightActive ? "scale-110" : "",
              link.href === hoveredLink ? link.hoverBgColor : ""
            )}>
              {link.icon && (
                <link.icon 
                  className={cn(
                    "h-5.5 w-5.5 transition-all duration-500", 
                    isActiveLink(link.href) && highlightActive ? link.hoverColor : link.color,
                    link.href === hoveredLink ? "scale-110" : ""
                  )} 
                />
              )}
              
              {/* تأثير النبض عند التنشيط */}
                {isActiveLink(link.href) && (
                  <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary/30"></span>
                )}
            </div>
            <span className={cn(
              "text-sm font-medium text-center transition-all duration-300",
              isActiveLink(link.href) && highlightActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {link.title}
            </span>
            
            {/* تأثير الموجة عند التحويم */}
            {link.href === hoveredLink && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out"></div>
            )}
          </Link>
        ))}
      </div>
    );
  };
  
  const renderHorizontalLinks = () => {
    const visibleLinks = maxItems ? quickNavLinks.slice(0, maxItems) : quickNavLinks;
    
    return (
      <div className={cn(
        "flex items-center gap-2.5 overflow-x-auto p-2.5 bg-card/80 backdrop-blur-sm rounded-xl shadow-md border border-border/40 no-scrollbar pb-3",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => (
          <Link
            key={index}
            to={link.href}
            className={cn(
              "flex items-center gap-3 min-w-max px-4 py-2.5 rounded-lg transition-all duration-300 group border whitespace-nowrap relative overflow-hidden",
              isActiveLink(link.href) && highlightActive
                ? "bg-primary/10 hover:bg-primary/15 border-primary/30 text-primary shadow-sm"
                : "hover:bg-card-foreground/5 border-transparent hover:border-border/50",
              "hover:-translate-y-0.5 hover:shadow-md"
            )}
            onMouseEnter={() => setHoveredLink(link.href)}
            onMouseLeave={() => setHoveredLink(null)}
          >
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group-hover:scale-110 relative",
              link.bgColor,
              link.href === hoveredLink ? link.hoverBgColor : ""
            )}>
              {link.icon && (
                <link.icon 
                  className={cn(
                    "h-4.5 w-4.5 transition-all duration-300", 
                    link.color,
                    link.href === hoveredLink ? "scale-110" : ""
                  )} 
                />
              )}
            </div>
            <span className={cn(
              "text-sm font-medium transition-all duration-300",
              isActiveLink(link.href) && highlightActive ? "font-semibold" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {link.title}
            </span>
            
            {/* تأثير الموجة عند التحويم */}
            {link.href === hoveredLink && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out"></div>
            )}
          </Link>
        ))}
      </div>
    );
  };
  
  const renderVerticalLinks = () => {
    const visibleLinks = maxItems ? quickNavLinks.slice(0, maxItems) : quickNavLinks;
    
    return (
      <div className={cn(
        "flex flex-col gap-2 p-2.5 bg-card/80 backdrop-blur-sm rounded-xl shadow-md border border-border/40",
        initialRender ? "opacity-0" : "opacity-100 transition-opacity duration-500",
        className
      )}>
        {visibleLinks.map((link, index) => (
          <Link
            key={index}
            to={link.href}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-300 group border relative overflow-hidden",
              isActiveLink(link.href) && highlightActive
                ? "bg-primary/10 hover:bg-primary/15 border-primary/30 shadow-sm"
                : "hover:bg-card-foreground/5 border-transparent hover:border-border/50",
              "hover:translate-x-1 rtl:hover:-translate-x-1 hover:shadow-md"
            )}
            onMouseEnter={() => setHoveredLink(link.href)}
            onMouseLeave={() => setHoveredLink(null)}
          >
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group-hover:scale-110 relative",
              link.bgColor,
              link.href === hoveredLink ? link.hoverBgColor : ""
            )}>
              {link.icon && (
                <link.icon 
                  className={cn(
                    "h-4.5 w-4.5 transition-transform duration-300", 
                    link.color,
                    link.href === hoveredLink ? "rotate-6 scale-110" : ""
                  )} 
                />
              )}
            </div>
            <span className={cn(
              "text-sm font-medium transition-all duration-300",
              isActiveLink(link.href) && highlightActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {link.title}
            </span>
            
            {/* سهم للعناصر النشطة */}
            {(isActiveLink(link.href) || link.href === hoveredLink) && (
              <div className={cn(
                "ml-auto rtl:mr-auto rtl:ml-0 opacity-0 transition-opacity duration-300",
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
                  className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                >
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </div>
            )}
            
            {/* تأثير الموجة عند التحويم */}
            {link.href === hoveredLink && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out"></div>
            )}
          </Link>
        ))}
      </div>
    );
  };
  
  if (variant === 'navbar') return renderNavbarLinks();
  if (variant === 'horizontal') return renderHorizontalLinks();
  if (variant === 'vertical') return renderVerticalLinks();
  return renderGridLinks();
}
