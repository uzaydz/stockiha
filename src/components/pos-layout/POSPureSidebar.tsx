import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Store, BarChart3, Zap, Layers, Package, LogOut, Truck, GraduationCap, Settings, Users, Building2, FileSpreadsheet, ChevronRight, ChevronLeft, ExternalLink, ShoppingCart, Database, UserCircle, Shield, Clock, RefreshCw } from 'lucide-react';
import { ShoppingBag, Wrench, BarChart3 as ReportsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useStaffSession } from '@/context/StaffSessionContext';
import { toast } from 'sonner';
import QuickStaffSwitchModern from '@/components/staff/QuickStaffSwitchModern';
import './POSPureSidebar.css';

// --- Local Tooltip Implementation (with Portal) ---
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[100] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface POSSidebarItem {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
  isOnlineOnly?: boolean;
  alwaysShow?: boolean;
  permission?: string;
  permissions?: string[];
}

// --- Premium Sidebar Item Component ---
const SidebarItem = memo<{
  item: POSSidebarItem;
  isActive: boolean;
  isExpanded: boolean;
}>(({ item, isActive, isExpanded }) => {
  const Icon = item.icon;

  const linkContent = (
    <Link
      to={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center rounded-xl mb-2 transition-all duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50',
        isExpanded
          ? 'px-3 py-2.5 justify-start gap-3 w-full'
          : 'h-11 w-11 justify-center mx-auto', // Square shape in collapsed mode
        isActive
          ? 'bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white shadow-lg shadow-orange-500/25'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      )}
    >
      {/* Active State Glow & Highlight */}
      {isActive && (
        <>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none" />
          {/* Left indicator only when expanded */}
          {isExpanded && (
            <div className="absolute -left-[2px] top-1/2 -translate-y-1/2 h-1/2 w-[3px] bg-white/40 rounded-full blur-[1px]" />
          )}
        </>
      )}

      {/* Hover Effect Background (for non-active) */}
      {!isActive && (
        <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors duration-300 pointer-events-none" />
      )}

      {Icon && (
        <div className={cn(
          "relative z-10 flex items-center justify-center transition-transform duration-300",
          isActive ? "text-white scale-110" : "group-hover:scale-110 group-hover:text-orange-400"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      )}

      {isExpanded && (
        <span className={cn(
          "text-[13px] font-medium whitespace-nowrap relative z-10 transition-all duration-300",
          isActive ? "font-bold tracking-wide" : "group-hover:translate-x-1"
        )}>
          {item.title}
        </span>
      )}

      {isExpanded && item.badge && (
        <span className={cn(
          "mr-auto px-2 py-0.5 text-[10px] font-bold rounded-full relative z-10 shadow-sm",
          isActive ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-400 border border-orange-500/20"
        )}>
          {item.badge}
        </span>
      )}

      {/* Badge dot in collapsed mode */}
      {!isExpanded && item.badge && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-[#0f172a] z-20" />
      )}
    </Link>
  );

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-[#0f172a] text-white border border-slate-700/50 shadow-2xl backdrop-blur-xl px-3 py-1.5 rounded-lg z-[100] ml-2"
          sideOffset={5}
        >
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium">{item.title}</p>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded-full">
                {item.badge}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
});

SidebarItem.displayName = 'SidebarItem';

// --- Sidebar Items Data ---
export const posSidebarItems: POSSidebarItem[] = [
  {
    id: 'pos-dashboard',
    title: 'الصفحة الرئيسية',
    icon: BarChart3,
    href: '/dashboard/pos-dashboard',
    isOnlineOnly: false,
    alwaysShow: true,
    permission: 'accessPOS',
  },
  {
    id: 'pos-advanced',
    title: 'نقطة البيع',
    icon: Zap,
    href: '/dashboard/pos-advanced',
    isOnlineOnly: false,
    permission: 'accessPOS',
  },
  {
    id: 'pos-operations',
    title: 'إدارة الطلبات',
    icon: Layers,
    href: '/dashboard/pos-operations/orders',
    isOnlineOnly: false,
    permissions: ['accessPOS', 'managePOSOrders'],
  },
  {
    id: 'analytics-enhanced',
    title: 'التحليلات',
    icon: BarChart3,
    href: '/dashboard/analytics-enhanced',
    badge: 'PRO',
    isOnlineOnly: false,
    permissions: ['viewSalesReports', 'viewReports'],
  },
  {
    id: 'etat104',
    title: 'كشف حساب 104',
    icon: FileSpreadsheet,
    href: '/dashboard/etat104',
    isOnlineOnly: false,
    permission: 'accessPOS',
  },
  {
    id: 'store-business-settings',
    title: 'إعدادات المحل',
    icon: Building2,
    href: '/dashboard/store-business-settings',
    isOnlineOnly: false,
    permissions: ['manageSettings', 'manageOrganizationSettings'],
  },
  {
    id: 'staff-management',
    title: 'الموظفين',
    icon: Users,
    href: '/dashboard/staff-management',
    isOnlineOnly: false,
    alwaysShow: true,
    permissions: ['manageStaff', 'viewStaff', 'accessPOS'],
  },
  {
    id: 'product-operations',
    title: 'المنتجات',
    icon: Package,
    href: '/dashboard/product-operations/products',
    isOnlineOnly: true,
    alwaysShow: true,
    permissions: ['manageProducts', 'viewProducts'],
  },
  {
    id: 'sales-operations',
    title: 'المبيعات',
    icon: ShoppingBag,
    href: '/dashboard/sales-operations/onlineOrders',
    isOnlineOnly: true,
    permissions: ['manageOrders', 'viewOrders'],
  },
  {
    id: 'services-operations',
    title: 'الخدمات',
    icon: Wrench,
    href: '/dashboard/services-operations/repair',
    isOnlineOnly: false,
    permissions: ['manageRepairs', 'viewRepairs'],
  },
  {
    id: 'supplier-operations',
    title: 'الموردين',
    icon: Truck,
    href: '/dashboard/supplier-operations/suppliers',
    isOnlineOnly: false,
    permissions: ['manageSuppliers', 'viewSuppliers'],
  },
  {
    id: 'courses-operations',
    title: 'الأكاديمية',
    icon: GraduationCap,
    href: '/dashboard/courses-operations/all',
    isOnlineOnly: false,
    alwaysShow: true,
    permission: 'canAccessCoursesOperations',
  },
  {
    id: 'store-operations',
    title: 'المتجر',
    icon: Store,
    href: '/dashboard/store-operations/store-settings',
    isOnlineOnly: true,
    permissions: ['manageSettings'],
  },
  {
    id: 'settings-operations',
    title: 'الإعدادات',
    icon: Settings,
    href: '/dashboard/settings-operations/settings',
    isOnlineOnly: true,
    permissions: ['manageSettings'],
  },
  {
    id: 'reports-operations',
    title: 'التقارير',
    icon: ReportsIcon,
    href: '/dashboard/reports-operations/financial',
    isOnlineOnly: true,
    permissions: ['viewReports', 'accessPOS'],
  },
  {
    id: 'database-admin',
    title: 'قاعدة البيانات',
    icon: Database,
    href: '/dashboard/database-admin',
    badge: 'DEV',
    isOnlineOnly: false,
    alwaysShow: false,
    permissions: ['manageSettings', 'isSuperAdmin'],
  },
];

interface POSPureSidebarProps {
  className?: string;
  items?: POSSidebarItem[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const POSPureSidebar: React.FC<POSPureSidebarProps> = memo(({ className, items, isExpanded = false, onToggleExpand }) => {
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

  const toggleOnlineMode = useCallback(() => {
    setIsOnlineMode(prev => !prev);
    toast.success(
      isOnlineMode ? 'تم التبديل إلى الوضع الكامل' : 'تم التبديل إلى وضع التاجر الإلكتروني',
      { duration: 2000, className: 'bg-slate-900 text-white border-slate-700' }
    );
  }, [isOnlineMode]);

  const sidebarItems = useMemo(() => items ?? posSidebarItems, [items]);

  const filteredItems = useMemo(() => {
    // استخدام الصلاحيات الموحدة
    const { has, anyOf, isOrgAdmin, isSuperAdmin, isAdminMode: isAdmin, ready } = unifiedPerms;

    let filtered = sidebarItems;

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
        // العناصر بدون صلاحيات مطلوبة تظهر للجميع
        if (!item.permission && !item.permissions) return true;
        // فحص صلاحية واحدة
        if (item.permission) return has(item.permission);
        // فحص أي صلاحية من القائمة
        if (item.permissions) return anyOf(item.permissions);
        return true;
      });
    }

    return filtered;
  }, [sidebarItems, isOnlineMode, unifiedPerms]);

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
    } catch (error) {
      toast.error('تعذر تسجيل الخروج');
    }
  }, [signOut]);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'pos-sidebar-container flex flex-col h-full transition-all duration-500 ease-in-out',
          className
        )}
      >
        {/* --- Header Section --- */}
        <div className={cn(
          "relative px-3 pt-6 pb-4 flex flex-col transition-all duration-300",
          isExpanded ? "items-start" : "items-center"
        )}>
          {/* Logo Area */}
          <div className={cn(
            "flex items-center transition-all duration-300",
            isExpanded ? "gap-3 w-full" : "justify-center"
          )}>
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-orange-500/20 rounded-xl blur-lg group-hover:bg-orange-500/30 transition-all duration-500" />
              <div className="relative w-11 h-11 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl flex items-center justify-center border border-slate-700/50 shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                <img
                  src="./images/logo-new.webp"
                  alt="Logo"
                  className="w-7 h-7 object-contain relative z-10 drop-shadow-md"
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
                <div className="hidden w-full h-full items-center justify-center bg-orange-600 text-white">
                  <Store className="w-5 h-5" />
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                  سطوكيها
                </h2>
                <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">
                  {isOnlineMode ? 'E-Commerce Mode' : 'Enterprise System'}
                </p>
              </div>
            )}
          </div>

          {/* Store Link Button */}
          <div className={cn("mt-6 w-full transition-all duration-300")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={getStoreUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group relative flex items-center rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/80 transition-all duration-300",
                    isExpanded ? "px-3 py-2.5 gap-3" : "h-11 w-11 justify-center mx-auto"
                  )}
                >
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-orange-400 transition-colors" />
                  {isExpanded && (
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                      زيارة المتجر
                    </span>
                  )}
                </a>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white ml-2">
                  زيارة المتجر
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {/* --- Navigation Section --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 sidebar-scroll-area">
          {filteredItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={isPathActive(item.href)}
              isExpanded={isExpanded}
            />
          ))}
        </div>

        {/* --- Footer Section --- */}
        <div className="p-3 mt-auto space-y-2 border-t border-slate-800/50 bg-black/20 backdrop-blur-sm">

          {/* عرض معلومات المستخدم/الموظف الحالي */}
          {isExpanded && (
            <div className="mb-2 px-2 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <div className="flex items-center gap-2">
                {isAdminMode ? (
                  <Shield className="h-4 w-4 text-orange-400" />
                ) : currentStaff ? (
                  <UserCircle className="h-4 w-4 text-blue-400" />
                ) : (
                  <UserCircle className="h-4 w-4 text-slate-400" />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-medium text-white truncate">
                    {unifiedPerms.displayName}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">
                      {isAdminMode ? 'وضع المدير' : currentStaff ? 'موظف' : userProfile?.role || 'مستخدم'}
                    </span>
                    {/* عرض مدة الجلسة */}
                    {unifiedPerms.sessionDuration > 0 && (
                      <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {unifiedPerms.sessionDuration < 60 
                          ? `${unifiedPerms.sessionDuration}د` 
                          : `${Math.floor(unifiedPerms.sessionDuration / 60)}س`
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* شارة الوضع المصغرة عند طي القائمة */}
          {!isExpanded && (currentStaff || isAdminMode) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "mx-auto w-9 h-9 rounded-lg flex items-center justify-center",
                  isAdminMode ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  {isAdminMode ? <Shield className="h-4 w-4" /> : <UserCircle className="h-4 w-4" />}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white ml-2">
                <div className="text-right">
                  <div className="font-medium">{unifiedPerms.displayName}</div>
                  <div className="text-xs text-slate-400">
                    {isAdminMode ? 'وضع المدير' : 'موظف'}
                    {unifiedPerms.sessionDuration > 0 && ` • ${unifiedPerms.sessionDuration}د`}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Online Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleOnlineMode}
                className={cn(
                  "w-full relative group overflow-hidden rounded-xl transition-all duration-300 border",
                  isOnlineMode
                    ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50"
                    : "bg-slate-800/30 border-slate-700/30 hover:border-slate-600",
                  isExpanded ? "h-12 px-3" : "h-11 w-11 flex items-center justify-center mx-auto"
                )}
              >
                <div className={cn(
                  "flex items-center transition-all duration-300",
                  isExpanded ? "justify-between" : "justify-center"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isOnlineMode ? "bg-blue-500/20 text-blue-400" : "bg-slate-700/50 text-slate-400"
                    )}>
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    {isExpanded && (
                      <div className="flex flex-col items-start">
                        <span className={cn("text-xs font-bold", isOnlineMode ? "text-blue-400" : "text-slate-300")}>
                          {isOnlineMode ? "المتجر الإلكتروني" : "الوضع الكامل"}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {isOnlineMode ? "ON" : "OFF"}
                        </span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-colors duration-300",
                      isOnlineMode ? "bg-blue-500/30" : "bg-slate-700"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300",
                        isOnlineMode ? "left-4 bg-blue-400" : "left-0.5 bg-slate-400"
                      )} />
                    </div>
                  )}
                </div>
              </button>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white ml-2">
                {isOnlineMode ? "التبديل للوضع الكامل" : "التبديل لوضع المتجر"}
              </TooltipContent>
            )}
          </Tooltip>

          <div className={cn(
            "flex items-center gap-2",
            !isExpanded && "flex-col-reverse" // Stack buttons when collapsed, Expand at bottom
          )}>
            {/* Expand/Collapse Button */}
            {onToggleExpand && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleExpand}
                    className={cn(
                      "rounded-xl flex items-center justify-center transition-all duration-300",
                      "bg-slate-800/40 hover:bg-slate-700/50 text-slate-400 hover:text-white border border-slate-700/30",
                      isExpanded ? "flex-1 h-10" : "h-11 w-11"
                    )}
                  >
                    {isExpanded ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white ml-2">
                  {isExpanded ? "تصغير القائمة" : "توسيع القائمة"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* تبديل الموظف السريع */}
            {(currentStaff || isAdminMode) && (
              <>
                {isExpanded ? (
                  <QuickStaffSwitchModern 
                    iconOnly={false}
                    variant="ghost"
                    className={cn(
                      "flex-1 h-10 rounded-xl",
                      "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20",
                      "text-blue-400 hover:text-blue-300 border border-blue-500/20"
                    )}
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <QuickStaffSwitchModern 
                          iconOnly={true}
                          variant="ghost"
                          size="default"
                          className={cn(
                            "h-11 w-11 rounded-xl",
                            "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20"
                          )}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white ml-2">
                      تبديل الموظف
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}

            {/* Logout Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className={cn(
                    "rounded-xl flex items-center justify-center transition-all duration-300",
                    "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20",
                    isExpanded ? "w-10 h-10" : "h-11 w-11"
                  )}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 border-slate-700 text-white ml-2">
                تسجيل الخروج
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});

POSPureSidebar.displayName = 'POSPureSidebar';

export default POSPureSidebar;
