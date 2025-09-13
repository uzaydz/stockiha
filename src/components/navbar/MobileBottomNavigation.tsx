import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  Store, 
  Settings, 
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

interface MobileBottomNavigationProps {
  className?: string;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function MobileBottomNavigation({ 
  className, 
  onMenuToggle, 
  isMenuOpen = false 
}: MobileBottomNavigationProps) {
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const [isMobile, setIsMobile] = useState(false);

  // دالة لتوليد رابط المتجر الصحيح (نفس منطق QuickNavLinks)
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

  // كشف حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // إخفاء القائمة فقط إذا لم يكن المستخدم مسجل دخول
  if (!isMobile || !user) {
    return null;
  }

  const navigationItems = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: Home,
      href: '/',
      isActive: location.pathname === '/' || location.pathname === '/index'
    },
    {
      id: 'products',
      label: 'المنتجات',
      icon: Package,
      href: '/dashboard/products',
      isActive: location.pathname.startsWith('/dashboard/products') || location.pathname.startsWith('/products') || location.pathname.startsWith('/store-products')
    },
    {
      id: 'orders',
      label: 'الطلبات',
      icon: ShoppingCart,
      href: '/dashboard/orders-v2',
      isActive: location.pathname.startsWith('/dashboard/orders') || location.pathname.startsWith('/orders') || location.pathname.startsWith('/cart')
    },
    {
      id: 'store',
      label: 'المتجر',
      icon: Store,
      href: getStoreUrl(),
      isActive: false,
      isExternal: true
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: Settings,
      href: '/dashboard/settings',
      isActive: location.pathname.startsWith('/dashboard/settings') || location.pathname.startsWith('/settings')
    },
    {
      id: 'menu',
      label: 'القائمة',
      icon: isMenuOpen ? X : Menu,
      href: '#',
      isActive: false,
      isAction: true,
      onClick: onMenuToggle
    }
  ];

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-xl border-t border-border/20",
        "shadow-2xl shadow-black/10",
        "mobile-bottom-nav",
        className
      )}
    >
      {/* خط علوي للتأثير البصري */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="flex items-center justify-around px-1 py-2 max-w-md mx-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          
          if (item.isAction) {
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2 h-auto min-w-0",
                  "transition-all duration-300 hover:scale-105",
                  "rounded-xl hover:bg-primary/10 active:scale-95",
                  isActive && "bg-primary/15 text-primary shadow-sm"
                )}
                aria-label={item.label}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Button>
            );
          }

          if (item.isExternal) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2 h-auto min-w-0",
                  "transition-all duration-300 hover:scale-105 active:scale-95",
                  "rounded-xl hover:bg-primary/10",
                  "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5 transition-colors duration-200" />
                <span className="text-xs font-medium transition-colors duration-200">
                  {item.label}
                </span>
              </a>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 h-auto min-w-0",
                "transition-all duration-300 hover:scale-105 active:scale-95",
                "rounded-xl hover:bg-primary/10",
                isActive && "bg-primary/15 text-primary shadow-sm"
              )}
              aria-label={item.label}
            >
              <Icon className={cn(
                "h-5 w-5 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-xs font-medium transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      
      {/* خط سفلي للتأثير البصري */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
    </nav>
  );
}

export default MobileBottomNavigation;
