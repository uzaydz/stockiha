import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Package, 
  ShoppingCart, 
  Settings, 
  Menu,
  X,
  Layers,
  BarChart3,
  Store,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { useAuth } from '@/context/AuthContext'; // مُعطل للصفحات العامة

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
  // const { user, userProfile } = useAuth(); // مُعطل للصفحات العامة
  const [isMobile, setIsMobile] = useState(false);
  
  // حالة وضع التاجر الإلكتروني (محفوظة في localStorage - مزامنة مع POSPureSidebar)
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar-online-mode');
    return saved === 'true';
  });

  // مراقبة تغييرات localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebar-online-mode');
      setIsOnlineMode(saved === 'true');
    };
    
    window.addEventListener('storage', handleStorageChange);
    // مراقبة التغييرات المحلية أيضاً
    const interval = setInterval(() => {
      const saved = localStorage.getItem('sidebar-online-mode');
      const newValue = saved === 'true';
      if (newValue !== isOnlineMode) {
        setIsOnlineMode(newValue);
      }
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isOnlineMode]);

  // كشف حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // إخفاء القائمة فقط على الشاشات الكبيرة
  if (!isMobile) {
    return null;
  }

  // جميع العناصر مع تحديد isOnlineOnly
  const allNavigationItems = [
    {
      id: 'pos-dashboard',
      label: 'المراقبة',
      icon: BarChart3,
      href: '/dashboard/pos-dashboard',
      isActive: location.pathname === '/dashboard/pos-dashboard' || location.pathname === '/dashboard',
      isOnlineOnly: false // متاح في الوضع الكامل
    },
    {
      id: 'pos-advanced',
      label: 'البيع',
      icon: ShoppingCart,
      href: '/dashboard/pos-advanced',
      isActive: location.pathname.startsWith('/dashboard/pos-advanced'),
      isOnlineOnly: false // متاح في الوضع الكامل
    },
    {
      id: 'pos-operations',
      label: 'الطلبات',
      icon: Layers,
      href: '/dashboard/pos-operations/orders',
      isActive: location.pathname.startsWith('/dashboard/pos-operations'),
      isOnlineOnly: false // متاح في الوضع الكامل
    },
    {
      id: 'sales-operations',
      label: 'المبيعات',
      icon: ShoppingBag,
      href: '/dashboard/sales-operations/onlineOrders',
      isActive: location.pathname.startsWith('/dashboard/sales-operations'),
      isOnlineOnly: true // خاص بالتاجر الإلكتروني
    },
    {
      id: 'product-operations',
      label: 'المنتجات',
      icon: Package,
      href: '/dashboard/product-operations/products',
      isActive: location.pathname.startsWith('/dashboard/product-operations'),
      isOnlineOnly: true // خاص بالتاجر الإلكتروني
    },
    {
      id: 'store-operations',
      label: 'المتجر',
      icon: Store,
      href: '/dashboard/store-operations/store-settings',
      isActive: location.pathname.startsWith('/dashboard/store-operations'),
      isOnlineOnly: true // خاص بالتاجر الإلكتروني
    },
    {
      id: 'store-business-settings',
      label: 'الإعدادات',
      icon: Settings,
      href: '/dashboard/store-business-settings',
      isActive: location.pathname.startsWith('/dashboard/store-business-settings'),
      isOnlineOnly: false // متاح في الوضع الكامل
    },
    {
      id: 'menu',
      label: 'القائمة',
      icon: isMenuOpen ? X : Menu,
      href: '#',
      isActive: false,
      isAction: true,
      onClick: onMenuToggle,
      isOnlineOnly: false // دائماً متاح
    }
  ];

  // تصفية العناصر بناءً على الوضع (نفس منطق POSPureSidebar)
  const navigationItems = isOnlineMode
    ? allNavigationItems.filter(item => item.isOnlineOnly === true || item.isAction)
    : allNavigationItems.filter(item => item.isOnlineOnly === false || item.isAction);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
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
