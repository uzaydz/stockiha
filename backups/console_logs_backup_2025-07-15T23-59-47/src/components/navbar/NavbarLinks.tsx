import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Tag, Settings, 
  Package, ShoppingCart, ShieldCheck, Wrench
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApps } from '@/context/AppsContext';
import { cn } from '@/lib/utils';
import type { Category } from '@/api/store';

interface NavbarLinksProps {
  isAdminPage?: boolean;
  categories?: Category[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

interface NavLink {
  name: string;
  path: string;
  icon: any;
  hasNew?: boolean;
}

export function NavbarLinks({ 
  isAdminPage = false, 
  categories = [], 
  orientation = 'horizontal',
  className
}: NavbarLinksProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAppEnabled, organizationApps } = useApps();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  
  // تحسين فحص تفعيل تطبيق التصليحات مع memoization
  const isRepairServicesEnabled = useMemo(() => {
    return isAppEnabled('repair-services');
  }, [organizationApps, isAppEnabled]);
  
  const getLinks = (): NavLink[] => {
    if (isAdminPage) {
      return [
        { name: t('navbar.dashboard'), path: '/dashboard', icon: ShieldCheck },
        { name: t('navbar.products'), path: '/dashboard/products', icon: Package },
        { name: t('navbar.orders'), path: '/dashboard/orders', icon: ShoppingCart },
      ];
    } else {
      const links = [
        { name: t('navbar.home'), path: '/', icon: Home },
        { name: t('navbar.products'), path: '/products', icon: Tag },
      ];
      
      // إضافة روابط التصليح فقط إذا كان التطبيق مفعل
      if (isRepairServicesEnabled) {
        links.push(
          { name: t('navbar.repairServices'), path: '/services', icon: Settings },
          { name: t('navbar.repairTracking'), path: '/repair-tracking', icon: Wrench }
        );
      }
      
      return links;
    }
  };
  
  const links = getLinks();

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Horizontal layout for desktop
  if (orientation === 'horizontal') {
    return (
      <div className={cn("flex items-center gap-1 px-1", className)}>
        {links.map((link, index) => {
          // تحويل جميع الروابط إلى روابط مباشرة (بدون قوائم منسدلة)
          return (
            <Link
              key={index}
              to={link.path}
              className={cn(
                "navbar-link group flex items-center gap-2 px-3 py-2 h-9 rounded-lg text-sm font-medium",
                "transition-all duration-300 hover:bg-primary relative overflow-hidden",
                isActiveLink(link.path) 
                  ? "active bg-primary/10 text-primary" 
                  : "text-foreground/90 hover:text-primary-foreground"
              )}
              onMouseEnter={() => setHoveredLink(link.path)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {link.icon && <link.icon className={cn(
                "h-4 w-4 transition-colors duration-300",
                isActiveLink(link.path) ? "text-primary" : "text-muted-foreground group-hover:text-primary-foreground"
              )} />}
              <span>{link.name}</span>
              
              {hoveredLink === link.path && !isActiveLink(link.path) && (
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/5 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              )}
              
              {isActiveLink(link.path) && (
                <div className="absolute bottom-1.5 left-3 right-3 h-0.5 rounded-full bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              )}
              
              {link.hasNew && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </Link>
                     );
        })}
      </div>
    );
  }
  
  // Vertical layout for mobile - روابط مباشرة بدون قوائم منسدلة
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {links.map((link, index) => {
        const isActive = isActiveLink(link.path);
        
        return (
          <Link
            key={index}
            to={link.path}
            className={cn(
              "flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 border",
              isActive
                ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                : "hover:bg-muted/60 border-transparent hover:border-muted hover:shadow-sm"
            )}
          >
            {link.icon && <link.icon className={cn(
              "h-5 w-5",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />}
            <span className={cn(
              "font-medium",
              isActive ? "text-primary" : ""
            )}>{link.name}</span>
            
            {link.hasNew && (
              <span className="absolute top-3 right-14 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
