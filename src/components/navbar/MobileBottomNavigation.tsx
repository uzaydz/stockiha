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
import { motion, AnimatePresence } from 'framer-motion';

const MotionLink = motion(Link);

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
  const [isMobile, setIsMobile] = useState(false);

  // حالة وضع التاجر الإلكتروني
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

  if (!isMobile) return null;
  if (isMenuOpen) return null;

  const allNavigationItems = [
    {
      id: 'pos-dashboard',
      label: 'المراقبة',
      icon: BarChart3,
      href: '/dashboard/pos-dashboard',
      isActive: location.pathname === '/dashboard/pos-dashboard' || location.pathname === '/dashboard',
      isOnlineOnly: false
    },
    {
      id: 'pos-advanced',
      label: 'البيع',
      icon: ShoppingCart,
      href: '/dashboard/pos-advanced',
      isActive: location.pathname.startsWith('/dashboard/pos-advanced'),
      isOnlineOnly: false
    },
    {
      id: 'pos-operations',
      label: 'الطلبات',
      icon: Layers,
      href: '/dashboard/pos-operations/orders',
      isActive: location.pathname.startsWith('/dashboard/pos-operations'),
      isOnlineOnly: false
    },
    {
      id: 'sales-operations',
      label: 'المبيعات',
      icon: ShoppingBag,
      href: '/dashboard/sales-operations/onlineOrders',
      isActive: location.pathname.startsWith('/dashboard/sales-operations'),
      isOnlineOnly: true
    },
    {
      id: 'product-operations',
      label: 'المنتجات',
      icon: Package,
      href: '/dashboard/product-operations/products',
      isActive: location.pathname.startsWith('/dashboard/product-operations'),
      isOnlineOnly: true
    },
    {
      id: 'store-operations',
      label: 'المتجر',
      icon: Store,
      href: '/dashboard/store-operations/store-settings',
      isActive: location.pathname.startsWith('/dashboard/store-operations'),
      isOnlineOnly: true
    },
    {
      id: 'store-business-settings',
      label: 'الإعدادات',
      icon: Settings,
      href: '/dashboard/store-business-settings',
      isActive: location.pathname.startsWith('/dashboard/store-business-settings'),
      isOnlineOnly: false
    },
    {
      id: 'menu',
      label: 'القائمة',
      icon: isMenuOpen ? X : Menu,
      href: '#',
      isActive: false,
      isAction: true,
      onClick: onMenuToggle,
      isOnlineOnly: false
    }
  ];

  const navigationItems = isOnlineMode
    ? allNavigationItems.filter(item => item.isOnlineOnly === true || item.isAction)
    : allNavigationItems.filter(item => item.isOnlineOnly === false || item.isAction);

  const gridColsClass = navigationItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <div className="fixed inset-x-0 z-[100] pointer-events-none flex justify-center" style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 16px)' }}>
      <motion.nav
        initial={{ y: 150, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8
        }}
        className={cn(
          "pointer-events-auto relative mx-4 w-full max-w-[380px]",
          "h-[72px] rounded-[36px]",
          // Glass Effect - 2025 Style (Darker, Deeper, More Premium)
          "bg-[#0f0f0f]/85 dark:bg-black/85",
          "backdrop-blur-[30px] saturate-[180%]",
          // Borders
          "border border-white/10 dark:border-white/10",
          "shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5),_0_0_0_1px_rgba(255,255,255,0.05)_inset]",
          className
        )}
      >
        {/* Internal Glow Mesh */}
        <div className="absolute inset-0 rounded-[36px] overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className={cn("grid h-full w-full items-center px-2", gridColsClass)}>
          <AnimatePresence>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive;

              const Content = (
                <>
                  {/* Active Spotlight / Glow */}
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.div
                        layoutId="nav-spotlight"
                        className="w-14 h-14 bg-primary/20 rounded-full blur-xl"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                      <motion.div
                        layoutId="nav-pill-active"
                        className="absolute w-12 h-12 rounded-full bg-white/5 border border-white/10 shadow-inner"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col items-center justify-center gap-[6px]">
                    <motion.div
                      animate={{
                        y: isActive ? -4 : 0,
                        scale: isActive ? 1.1 : 1
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative"
                    >
                      <Icon
                        className={cn(
                          "w-[24px] h-[24px]",
                          "transition-colors duration-500",
                          isActive
                            ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.6)]"
                            : "text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-300"
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </motion.div>

                    {/* Tiny animated dot indicator with Label text for active only (optional) 
                        For "2025" vibe, simpler is better. Just a glowing dot.
                    */}
                    {isActive && (
                      <motion.div
                        layoutId="active-dot"
                        className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_rgba(var(--primary),1)]"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                </>
              );

              const wrapperClass = cn(
                "group relative flex h-full flex-col items-center justify-center",
                "cursor-pointer select-none rounded-full",
                "tap-highlight-transparent"
              );

              if (item.isAction) {
                return (
                  <motion.button
                    key={item.id}
                    onClick={item.onClick}
                    className={wrapperClass}
                    whileTap={{ scale: 0.85 }}
                    aria-label={item.label}
                  >
                    {Content}
                  </motion.button>
                );
              }

              return (
                <MotionLink
                  key={item.id}
                  to={item.href}
                  className={wrapperClass}
                  whileTap={{ scale: 0.85 }}
                  aria-label={item.label}
                >
                  {Content}
                </MotionLink>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.nav>
    </div>
  );
}

export default MobileBottomNavigation;
