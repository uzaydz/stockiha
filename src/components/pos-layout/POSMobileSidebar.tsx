import React, { memo, useCallback, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Store, LogOut, ExternalLink, X, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { POSSidebarItem } from './POSPureSidebar';
import './POSMobileSidebar.css';

interface POSMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: POSSidebarItem[];
}

// Component محسّن لعنصر القائمة في الموبايل - مضغوط للعرض الأصغر
const MobileSidebarItem = memo<{
  item: POSSidebarItem;
  isActive: boolean;
  onClose: () => void;
}>(({ item, isActive, onClose }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onClose}
      className={cn(
        'mobile-sidebar-item group relative flex items-center gap-1.5 p-2 rounded-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
        'transition-all duration-200 border',
        isActive
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 border-orange-400/40'
          : 'text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/30 hover:border-slate-600/50 active:bg-slate-800/90'
      )}
    >
      {/* خلفية متدرجة للعنصر النشط */}
      {isActive && (
        <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      )}

      {/* الأيقونة - مضغوطة */}
      {Icon && (
        <Icon className={cn(
          "h-4 w-4 relative z-10 flex-shrink-0 transition-transform",
          isActive && "scale-110"
        )} />
      )}

      {/* النص - مضغوط */}
      <span className={cn(
        "text-xs font-semibold relative z-10 flex-1 transition-all truncate",
        isActive ? "tracking-wide" : ""
      )}>
        {item.title}
      </span>

      {/* البادج - مضغوط */}
      {item.badge && (
        <span className={cn(
          "px-1.5 py-0.5 text-[8px] font-bold rounded-full relative z-10 transition-all whitespace-nowrap",
          isActive
            ? "bg-white text-orange-600"
            : "bg-orange-500 text-white"
        )}>
          {item.badge}
        </span>
      )}

      {/* مؤشر العنصر النشط - مضغوط */}
      {isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-l-full" />
      )}
    </Link>
  );
});

MobileSidebarItem.displayName = 'MobileSidebarItem';

const POSMobileSidebar: React.FC<POSMobileSidebarProps> = memo(({ isOpen, onClose, items }) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { currentOrganization } = useTenant();

  // حالة وضع التاجر الإلكتروني (محفوظة في localStorage)
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar-online-mode');
    return saved === 'true';
  });

  // حفظ الوضع في localStorage عند تغييره
  useEffect(() => {
    localStorage.setItem('sidebar-online-mode', String(isOnlineMode));
  }, [isOnlineMode]);

  // تصفية العناصر بناءً على الوضع
  const filteredItems = React.useMemo(() => {
    if (!isOnlineMode) {
      return items;
    }
    return items.filter(item => item.isOnlineOnly === true);
  }, [items, isOnlineMode]);

  // تبديل الوضع
  const toggleOnlineMode = useCallback(() => {
    setIsOnlineMode(prev => !prev);
    toast.success(
      isOnlineMode ? 'تم التبديل إلى الوضع الكامل' : 'تم التبديل إلى وضع التاجر الإلكتروني',
      { duration: 2000 }
    );
  }, [isOnlineMode]);

  const isPathActive = useCallback((href: string): boolean => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    const basePath = href.split('/').slice(0, 3).join('/');
    const currentBasePath = location.pathname.split('/').slice(0, 3).join('/');
    return currentBasePath === basePath;
  }, [location.pathname]);

  const getStoreUrl = useCallback((): string => {
    const sub = currentOrganization?.subdomain;
    if (!sub) return '/';
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
    if (host.includes('localhost')) return `http://${sub}.localhost${port}`;
    if (host.includes('stockiha.com') || host.includes('stockiha.pages.dev')) return `https://${sub}.stockiha.com`;
    if (host.includes('ktobi.online')) return `https://${sub}.ktobi.online`;
    return '/';
  }, [currentOrganization?.subdomain]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      toast.error('تعذر تسجيل الخروج، يرجى المحاولة مرة أخرى');
    }
  }, [signOut, onClose]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="mobile-sidebar w-[75vw] max-w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-l-2 border-orange-500/30 p-0 flex flex-col shadow-2xl !z-[60]"
        style={{ zIndex: 60 }}
      >
        {/* Header مُحسّن - مضغوط */}
        <SheetHeader className="px-2.5 py-2.5 border-b border-slate-800/50 bg-gradient-to-b from-orange-500/5 to-transparent relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5">
              <div className="relative w-8 h-8 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25 border border-orange-400/40">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/15 to-transparent" />
                <img
                  src="./images/logo-new.webp"
                  alt="سطوكيها"
                  className="w-5 h-5 object-contain relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                  onError={(e) => {
                    // محاولة المسار البديل
                    if (e.currentTarget.src.includes('./images/')) {
                      e.currentTarget.src = './images/logo.webp';
                    } else {
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) nextElement.style.display = 'flex';
                    }
                  }}
                />
                <div className="w-5 h-5 hidden items-center justify-center relative z-10">
                  <Store className="h-3 w-3 text-white drop-shadow-lg" />
                </div>
              </div>
              <SheetTitle className="text-sm font-bold bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                سطوكيها
              </SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all duration-200"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetHeader>

        {/* مؤشر وضع التاجر الإلكتروني - مضغوط */}
        {isOnlineMode && (
          <div className="mx-2 mt-1.5 px-2 py-1.5 bg-gradient-to-r from-blue-500/15 to-blue-600/10 border border-blue-500/30 rounded-md">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-blue-400 truncate">وضع التاجر</p>
            </div>
          </div>
        )}

        {/* زر واجهة المتجر - مضغوط */}
        <div className="px-2 pt-1.5">
          <a
            href={getStoreUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group relative flex items-center gap-1.5 p-2 rounded-md",
              "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
              "shadow-lg shadow-orange-500/25",
              "transition-all duration-200",
              "hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:shadow-orange-500/30",
              "active:scale-[0.98] active:from-orange-700 active:to-orange-800",
              "border border-orange-400/40"
            )}
          >
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <ExternalLink className="h-4 w-4 relative z-10 flex-shrink-0" />
            <span className="text-xs font-bold relative z-10 flex-1 truncate">
              واجهة المتجر
            </span>
          </a>
        </div>

        {/* Navigation Items - مضغوطة */}
        <nav className="flex-1 px-2 py-1.5 space-y-0.5 overflow-y-auto custom-scrollbar">
          {filteredItems.map((item) => (
            <MobileSidebarItem
              key={item.id}
              item={item}
              isActive={isPathActive(item.href)}
              onClose={onClose}
            />
          ))}
        </nav>

        {/* Footer Buttons - مضغوطة */}
        <div className="px-2 py-1.5 border-t border-slate-800/50 space-y-1 bg-gradient-to-t from-slate-950/80 to-transparent">
          {/* زر التبديل بين الوضع العادي ووضع التاجر الإلكتروني - مضغوط */}
          <Button
            variant="ghost"
            onClick={toggleOnlineMode}
            className={cn(
              "w-full justify-start gap-1.5 px-2 h-9 rounded-md transition-all duration-200 border",
              isOnlineMode
                ? "bg-gradient-to-r from-blue-500/20 to-blue-600/15 text-blue-300 border-blue-500/40 hover:from-blue-500/30 hover:to-blue-600/25"
                : "bg-slate-800/60 text-slate-400 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-blue-600/15 hover:text-blue-300 border-slate-700/50 hover:border-blue-500/40"
            )}
          >
            <ShoppingCart className={cn("h-4 w-4 transition-transform flex-shrink-0", isOnlineMode && "scale-110")} />
            <span className="text-xs font-semibold flex-1 text-right truncate">
              {isOnlineMode ? "وضع التاجر" : "الوضع الكامل"}
            </span>
          </Button>

          {/* زر تسجيل الخروج - مضغوط */}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={cn(
              "w-full justify-start gap-1.5 px-2 h-9 border",
              "bg-slate-800/60 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/15",
              "text-slate-400 hover:text-red-300 border-slate-700/50 hover:border-red-500/40",
              "rounded-md transition-all duration-200"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-semibold flex-1 text-right truncate">تسجيل الخروج</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

POSMobileSidebar.displayName = 'POSMobileSidebar';

export default POSMobileSidebar;
