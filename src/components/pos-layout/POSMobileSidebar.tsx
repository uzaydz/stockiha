import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Store, LogOut, ExternalLink, X, ShoppingCart, Users, UserCircle, Shield, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { toast } from 'sonner';
import { POSSidebarItem } from './POSPureSidebar';
import QuickStaffSwitch from '@/components/pos/QuickStaffSwitch';
import './POSMobileSidebar.css';

interface POSMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: POSSidebarItem[];
}

// --- Premium Mobile Sidebar Item ---
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
        'group relative flex items-center gap-3 p-3 rounded-xl mb-1',
        'transition-all duration-300 ease-out',
        isActive
          ? 'bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white shadow-lg shadow-orange-500/25'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      )}
    >
      {/* Active State Glow */}
      {isActive && (
        <>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-[3px] bg-white/40 rounded-full blur-[1px]" />
        </>
      )}

      {Icon && (
        <div className={cn(
          "relative z-10 flex items-center justify-center transition-transform duration-300",
          isActive ? "text-white scale-110" : "group-hover:scale-110 group-hover:text-orange-400"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      )}

      <span className={cn(
        "text-sm font-medium relative z-10 flex-1 transition-all duration-300",
        isActive ? "font-bold tracking-wide" : ""
      )}>
        {item.title}
      </span>

      {item.badge && (
        <span className={cn(
          "px-2 py-0.5 text-[10px] font-bold rounded-full relative z-10 shadow-sm",
          isActive ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-400 border border-orange-500/20"
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
});

MobileSidebarItem.displayName = 'MobileSidebarItem';

const POSMobileSidebar: React.FC<POSMobileSidebarProps> = memo(({ isOpen, onClose, items }) => {
  const location = useLocation();
  const { signOut, userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const { currentStaff, isAdminMode, clearSession } = useStaffSession();
  const unifiedPerms = useUnifiedPermissions();

  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar-online-mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-online-mode', String(isOnlineMode));
  }, [isOnlineMode]);

  const filteredItems = useMemo(() => {
    // استخدام الصلاحيات الموحدة
    const { has, anyOf, isOrgAdmin, isSuperAdmin, isAdminMode: isAdmin, ready } = unifiedPerms;

    let filtered = items;

    // تصفية حسب الوضع (أونلاين/أوفلاين)
    if (!isOnlineMode) {
      filtered = filtered.filter(item => item.alwaysShow === true || item.isOnlineOnly !== true);
    } else {
      filtered = filtered.filter(item => item.isOnlineOnly === true || item.alwaysShow === true);
    }

    // وضع المدير = صلاحيات كاملة
    if (isAdmin || isOrgAdmin || isSuperAdmin) {
      return filtered;
    }

    // تصفية حسب الصلاحيات (للموظفين)
    if (ready) {
      filtered = filtered.filter(item => {
        if (!item.permission && !item.permissions) return true;
        if (item.permission) return has(item.permission);
        if (item.permissions) return anyOf(item.permissions);
        return true;
      });
    }

    return filtered;
  }, [items, isOnlineMode, unifiedPerms]);

  const toggleOnlineMode = useCallback(() => {
    setIsOnlineMode(prev => !prev);
    toast.success(
      isOnlineMode ? 'تم التبديل إلى الوضع الكامل' : 'تم التبديل إلى وضع التاجر الإلكتروني',
      { duration: 2000, className: 'bg-slate-900 text-white border-slate-700' }
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
      toast.error('تعذر تسجيل الخروج');
    }
  }, [signOut, onClose]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="mobile-sidebar w-[85vw] max-w-[320px] p-0 flex flex-col border-none shadow-2xl"
      >
        {/* --- Header --- */}
        <SheetHeader className="px-4 py-4 border-b border-slate-800/50 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl flex items-center justify-center border border-slate-700/50 shadow-lg">
                <img
                  src="./images/logo-new.webp"
                  alt="Logo"
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    if (e.currentTarget.src.includes('./images/')) {
                      e.currentTarget.src = './images/logo.webp';
                    } else {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      e.currentTarget.nextElementSibling?.classList.add('flex');
                    }
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center bg-orange-600 text-white rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <SheetTitle className="text-lg font-bold text-white">
                  سطوكيها
                </SheetTitle>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Mobile POS
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* --- Store Link --- */}
        <div className="px-4 pt-4 pb-2">
          <a
            href={getStoreUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="text-sm font-medium">زيارة المتجر</span>
          </a>
        </div>

        {/* --- Navigation --- */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredItems.map((item) => (
            <MobileSidebarItem
              key={item.id}
              item={item}
              isActive={isPathActive(item.href)}
              onClose={onClose}
            />
          ))}
        </nav>

        {/* --- Footer --- */}
        <div className="p-4 border-t border-slate-800/50 bg-black/20 backdrop-blur-sm space-y-3">
          {/* عرض معلومات المستخدم/الموظف الحالي */}
          <div className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isAdminMode ? "bg-orange-500/20" : currentStaff ? "bg-blue-500/20" : "bg-slate-500/20"
              )}>
                {isAdminMode ? (
                  <Shield className="h-5 w-5 text-orange-400" />
                ) : currentStaff ? (
                  <UserCircle className="h-5 w-5 text-blue-400" />
                ) : (
                  <UserCircle className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-white truncate">
                  {unifiedPerms.displayName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {isAdminMode ? 'وضع المدير' : currentStaff ? 'موظف' : userProfile?.role || 'مستخدم'}
                  </span>
                  {/* عرض مدة الجلسة */}
                  {unifiedPerms.sessionDuration > 0 && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {unifiedPerms.sessionDuration < 60 
                        ? `${unifiedPerms.sessionDuration} دقيقة` 
                        : `${Math.floor(unifiedPerms.sessionDuration / 60)} ساعة`
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Online Mode Toggle */}
          <button
            onClick={toggleOnlineMode}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
              isOnlineMode
                ? "bg-blue-500/10 border-blue-500/30"
                : "bg-slate-800/30 border-slate-700/30"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-lg",
                isOnlineMode ? "bg-blue-500/20 text-blue-400" : "bg-slate-700/50 text-slate-400"
              )}>
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className={cn("text-sm font-medium", isOnlineMode ? "text-blue-400" : "text-slate-300")}>
                {isOnlineMode ? "وضع التاجر" : "الوضع الكامل"}
              </span>
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-colors duration-300",
              isOnlineMode ? "bg-blue-500/30" : "bg-slate-700"
            )}>
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300",
                isOnlineMode ? "left-4 bg-blue-400" : "left-0.5 bg-slate-400"
              )} />
            </div>
          </button>

          {/* زر تبديل الموظف السريع */}
          {(currentStaff || isAdminMode) && (
            <QuickStaffSwitch 
              iconOnly={false}
              className="w-full justify-center gap-2 p-3 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 border border-yellow-500/20"
              onSwitch={onClose}
            />
          )}

          {/* Logout Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

POSMobileSidebar.displayName = 'POSMobileSidebar';

export default POSMobileSidebar;
