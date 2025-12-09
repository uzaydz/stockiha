import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Store, BarChart3, Zap, Layers, Package, LogOut, Truck, GraduationCap, Settings, Users, Building2,
  FileSpreadsheet, ChevronRight, ChevronLeft, ExternalLink, ShoppingCart, Database, UserCircle, Shield,
  Clock, RefreshCw, CreditCard, PieChart, MoreVertical, LayoutDashboard, ScanBarcode, ClipboardList,
  Globe, Crown, Gift
} from 'lucide-react';
import { ShoppingBag, Wrench } from 'lucide-react';
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
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-[#0f1419] z-20" />
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
          className="bg-[#161b22] text-white border border-[#30363d] shadow-2xl backdrop-blur-xl px-3 py-1.5 rounded-lg z-[100] ml-2"
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
  // 1. العمليات الأساسية (Core Operations)
  {
    id: 'pos-dashboard',
    title: 'نظرة عامة',
    icon: LayoutDashboard,
    href: '/dashboard/pos-dashboard',
    isOnlineOnly: false,
    alwaysShow: true,
    permission: 'accessPOS',
  },
  {
    id: 'pos-advanced',
    title: 'نقطة البيع',
    icon: ScanBarcode,
    href: '/dashboard/pos-advanced',
    isOnlineOnly: false,
    permission: 'accessPOS',
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
    id: 'pos-operations',
    title: 'سجل الطلبات',
    icon: ClipboardList,
    href: '/dashboard/pos-operations/orders',
    isOnlineOnly: false,
    permissions: ['accessPOS', 'managePOSOrders'],
  },
  {
    id: 'analytics',
    title: 'التقارير',
    icon: BarChart3,
    href: '/dashboard/analytics',
    badge: 'جديد',
    isOnlineOnly: false,
    alwaysShow: true,
    permissions: ['viewSalesReports', 'viewReports', 'accessPOS'],
  },

  // 2. إدارة العمليات (Operations Management)
  {
    id: 'supplier-operations',
    title: 'الموردين',
    icon: Truck,
    href: '/dashboard/supplier-operations/suppliers',
    isOnlineOnly: false,
    permissions: ['manageSuppliers', 'viewSuppliers'],
  },
  {
    id: 'services-operations',
    title: 'الصيانة',
    icon: Wrench,
    href: '/dashboard/services-operations/repair',
    isOnlineOnly: false,
    permissions: ['manageRepairs', 'viewRepairs'],
  },

  // 3. التجارة الإلكترونية (E-Commerce)
  {
    id: 'sales-operations',
    title: 'طلبات المتجر',
    icon: Globe,
    href: '/dashboard/sales-operations/onlineOrders',
    isOnlineOnly: true,
    permissions: ['manageOrders', 'viewOrders'],
  },
  {
    id: 'store-operations',
    title: 'إعدادات المتجر',
    icon: Store,
    href: '/dashboard/store-operations/store-settings',
    isOnlineOnly: true,
    permissions: ['manageSettings'],
  },

  // 4. الإدارة والفريق (Admin & Staff)
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
    id: 'settings-unified',
    title: 'الإعدادات',
    icon: Settings,
    href: '/dashboard/settings-unified',
    isOnlineOnly: false,
    alwaysShow: true,
    permissions: ['manageSettings', 'manageOrganizationSettings'],
  },
  {
    id: 'subscription',
    title: 'الاشتراك',
    icon: Crown,
    href: '/dashboard/subscription',
    isOnlineOnly: true,
    alwaysShow: true,
    permissions: ['manageOrganizationSettings'],
  },
  {
    id: 'referral',
    title: 'برنامج الإحالة',
    icon: Gift,
    href: '/dashboard/referral',
    badge: 'جديد',
    isOnlineOnly: true,
    alwaysShow: true,
    permissions: ['manageOrganizationSettings'],
  },

  // 5. أخرى (Extras)
  {
    id: 'etat104',
    title: 'كشف 104',
    icon: FileSpreadsheet,
    href: '/dashboard/etat104',
    isOnlineOnly: false,
    permission: 'accessPOS',
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
  const [logoError, setLogoError] = useState(false);

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
            isExpanded ? "gap-4 w-full px-1" : "justify-center"
          )}>
            <div className="relative group cursor-pointer shrink-0 py-1">
              {/* Premium Glow Background */}
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/50 to-amber-600/50 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-500 will-change-transform" />

              {/* Logo Box container */}
              <div className="relative w-11 h-11 bg-[#09090b] rounded-xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-300">

                {/* Internal gradient shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Animated Reflection (CSS keyframe) */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />

                {!logoError ? (
                  <img
                    src="./images/logo-new.webp"
                    alt="Stockiha"
                    className="w-7 h-7 object-contain relative z-10 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="relative z-10 text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 select-none">
                    S
                  </div>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-right-4 duration-500 delay-75">
                <h2 className="text-2xl font-black tracking-tighter leading-none bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-sm font-['Inter']">
                  Stockiha
                </h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="relative flex h-2 w-2">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isOnlineMode ? "bg-emerald-400" : "bg-indigo-400")} />
                    <span className={cn("relative inline-flex rounded-full h-2 w-2", isOnlineMode ? "bg-emerald-500" : "bg-indigo-500")} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase font-mono">
                    {isOnlineMode ? 'Online' : 'System'}
                  </span>
                </div>
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
                    "group relative flex items-center rounded-xl border border-[#30363d] bg-[#21262d]/50 hover:bg-[#21262d] transition-all duration-300",
                    isExpanded ? "px-3 py-2.5 gap-3" : "h-11 w-11 justify-center mx-auto"
                  )}
                >
                  <ExternalLink className="h-4 w-4 text-[#8b949e] group-hover:text-orange-400 transition-colors" />
                  {isExpanded && (
                    <span className="text-xs font-medium text-[#e6edf3] group-hover:text-white transition-colors">
                      زيارة المتجر
                    </span>
                  )}
                </a>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right" className="bg-[#161b22] border-[#30363d] text-white ml-2">
                  زيارة المتجر
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {/* --- Navigation Section --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 sidebar-scroll-area [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filteredItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={isPathActive(item.href)}
              isExpanded={isExpanded}
            />
          ))}
        </div>

        {/* --- Footer Section (Unified Compact) --- */}
        <div className="p-2 mt-auto space-y-2 border-t border-[#30363d] bg-[#0f1419]/50 backdrop-blur-sm">

          {/* 1. قائمة المستخدم الموحدة (Unified User Menu) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center rounded-xl transition-all duration-300 outline-none group",
                "hover:bg-[#21262d] border border-transparent hover:border-[#30363d]",
                isExpanded ? "w-full px-2 py-2 gap-3" : "h-11 w-11 justify-center mx-auto"
              )}>
                {/* Avatar */}
                <div className={cn(
                  "relative flex items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-105",
                  isAdminMode ? "bg-orange-500/10 text-orange-400" : "bg-blue-500/10 text-blue-400",
                  isExpanded ? "w-10 h-10" : "w-10 h-10"
                )}>
                  {isAdminMode ? <Shield className="h-5 w-5" /> : <UserCircle className="h-5 w-5" />}
                  {/* Online Indicator Dot */}
                  {isOnlineMode && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-[#0f1419]"></span>
                    </span>
                  )}
                </div>

                {/* Text Info (Expanded Only) */}
                {isExpanded && (
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-bold text-[#e6edf3] truncate w-full text-right">
                      {unifiedPerms.displayName}
                    </span>
                    <span className="text-[10px] text-[#8b949e] truncate w-full text-right">
                      {isAdminMode ? 'مدير النظام' : userProfile?.role || 'موظف'}
                    </span>
                  </div>
                )}

                {/* Menu Icon (Expanded Only) */}
                {isExpanded && (
                  <MoreVertical className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="left"
              align="end"
              sideOffset={10}
              collisionPadding={16}
              className="w-64 bg-[#050b15]/95 backdrop-blur-xl border-slate-700 text-slate-200 p-2 shadow-2xl"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white">{unifiedPerms.displayName}</p>
                  <p className="text-xs leading-none text-slate-400">{userProfile?.email || 'No Email'}</p>
                  {unifiedPerms.sessionDuration > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit">
                      <Clock className="w-3 h-3" />
                      <span>نشط منذ {Math.floor(unifiedPerms.sessionDuration / 60)} ساعة</span>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-slate-700/50" />

              {/* خيارات الوضع */}
              <DropdownMenuItem
                onClick={toggleOnlineMode}
                className="flex items-center gap-2 cursor-pointer focus:bg-slate-800 focus:text-white rounded-lg p-2"
              >
                <div className={cn(
                  "p-1.5 rounded-md",
                  isOnlineMode ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"
                )}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">المتجر الإلكتروني</span>
                  <span className="text-[10px] text-slate-500">{isOnlineMode ? 'مفعل (Online)' : 'معطل (Offline)'}</span>
                </div>
                {isOnlineMode && <div className="mr-auto w-2 h-2 rounded-full bg-blue-500" />}
              </DropdownMenuItem>

              {/* تبديل الموظف */}
              {(currentStaff || isAdminMode) && (
                <div className="p-1">
                  <QuickStaffSwitchModern
                    iconOnly={false}
                    variant="ghost"
                    className="w-full justify-start h-9 px-2 text-sm font-normal text-slate-200 hover:bg-slate-800 hover:text-white"
                  />
                </div>
              )}

              <DropdownMenuSeparator className="bg-slate-700/50" />

              {/* تسجيل الخروج */}
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 cursor-pointer focus:bg-red-950/30 focus:text-red-400 text-red-400 p-2 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2. زر التصغير/التوسيع */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className={cn(
                "w-full flex items-center justify-center rounded-xl transition-all duration-300",
                "hover:bg-slate-800/50 text-slate-500 hover:text-white h-8"
              )}
              title={isExpanded ? "تصغير القائمة" : "توسيع القائمة"}
            >
              {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
});

POSPureSidebar.displayName = 'POSPureSidebar';

export default POSPureSidebar;
