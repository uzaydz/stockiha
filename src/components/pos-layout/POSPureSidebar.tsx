import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Store, BarChart3, Zap, Layers, Package, LogOut, Truck, GraduationCap, Settings, Users, Building2, FileSpreadsheet, ChevronRight, ChevronLeft, ExternalLink, ShoppingCart } from 'lucide-react';
import { ShoppingBag, Wrench, BarChart3 as ReportsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import './POSPureSidebar.css';

export interface POSSidebarItem {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
  isOnlineOnly?: boolean; // خاص بالتجار الإلكترونيين فقط
  alwaysShow?: boolean; // يظهر في جميع الأوضاع
}

// Component محسّن لعنصر القائمة الفردي
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
      aria-label={item.title}
      className={cn(
        'sidebar-item group relative flex items-center rounded-lg p-2.5',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400',
        'transition-colors duration-150',
        isExpanded ? 'justify-start gap-2.5' : 'justify-center',
        isActive
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
      )}
    >
      {/* تأثير بسيط للحالة النشطة فقط */}
      {isActive && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      )}

      {Icon && (
        <Icon
          className={cn(
            'h-[18px] w-[18px] relative z-10 flex-shrink-0',
            'transition-transform duration-150',
            !isActive && 'group-hover:scale-105'
          )}
        />
      )}

      {isExpanded && (
        <span className="text-[13px] font-semibold whitespace-nowrap relative z-10">
          {item.title}
        </span>
      )}

      {isExpanded && item.badge && (
        <span className="mr-auto px-2 py-0.5 text-[10px] font-bold bg-orange-400 text-white rounded-full relative z-10">
          {item.badge}
        </span>
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
          side="left"
          className="bg-slate-900/95 text-white border border-slate-700/50 shadow-xl backdrop-blur-sm"
          sideOffset={8}
        >
          <p className="text-xs font-medium">{item.title}</p>
          {item.badge && (
            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded-full">
              {item.badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
});

SidebarItem.displayName = 'SidebarItem';

// ترتيب العناصر بشكل منطقي لسهولة الوصول والتنقل
export const posSidebarItems: POSSidebarItem[] = [
  {
    id: 'pos-dashboard',
    title: 'الصفحة الرئيسية',
    icon: BarChart3,
    href: '/dashboard/pos-dashboard',
    isOnlineOnly: false,
    alwaysShow: true, // يظهر في جميع الأوضاع
  },
  {
    id: 'pos-advanced',
    title: 'نقطة البيع',
    icon: Zap,
    href: '/dashboard/pos-advanced',
    isOnlineOnly: false,
  },
  {
    id: 'pos-operations',
    title: 'إدارة نقطة البيع',
    icon: Layers,
    href: '/dashboard/pos-operations/orders',
    isOnlineOnly: false,
  },
  {
    id: 'etat104',
    title: 'كشف حساب 104',
    icon: FileSpreadsheet,
    href: '/dashboard/etat104',
    badge: 'جديد',
    isOnlineOnly: false,
  },
  {
    id: 'store-business-settings',
    title: 'إعدادات المحل',
    icon: Building2,
    href: '/dashboard/store-business-settings',
    isOnlineOnly: false,
  },
  {
    id: 'staff-management',
    title: 'الموظفين والجلسات',
    icon: Users,
    href: '/dashboard/staff-management',
    isOnlineOnly: false,
    alwaysShow: true, // يظهر في جميع الأوضاع
  },
  {
    id: 'product-operations',
    title: 'مركز المنتجات',
    icon: Package,
    href: '/dashboard/product-operations/products',
    isOnlineOnly: true, // خاص بالتجار الإلكترونيين
  },
  {
    id: 'sales-operations',
    title: 'المبيعات والطلبات',
    icon: ShoppingBag,
    href: '/dashboard/sales-operations/onlineOrders',
    isOnlineOnly: true, // خاص بالتجار الإلكترونيين
  },
  {
    id: 'services-operations',
    title: 'مركز الخدمات',
    icon: Wrench,
    href: '/dashboard/services-operations/repair',
    isOnlineOnly: false,
  },
  {
    id: 'supplier-operations',
    title: 'مركز الموردين',
    icon: Truck,
    href: '/dashboard/supplier-operations/suppliers',
    isOnlineOnly: false,
  },
  {
    id: 'courses-operations',
    title: 'دورات سطوكيها',
    icon: GraduationCap,
    href: '/dashboard/courses-operations/all',
    isOnlineOnly: false,
  },
  {
    id: 'store-operations',
    title: 'إدارة المتجر',
    icon: Store,
    href: '/dashboard/store-operations/store-settings',
    isOnlineOnly: true, // خاص بالتجار الإلكترونيين
  },
  {
    id: 'settings-operations',
    title: 'الإعدادات',
    icon: Settings,
    href: '/dashboard/settings-operations/settings',
    isOnlineOnly: true, // خاص بالتجار الإلكترونيين
  },
  {
    id: 'reports-operations',
    title: 'مركز التقارير',
    icon: ReportsIcon,
    href: '/dashboard/reports-operations/financial',
    isOnlineOnly: true, // خاص بالتجار الإلكترونيين
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

  // تبديل الوضع
  const toggleOnlineMode = useCallback(() => {
    setIsOnlineMode(prev => !prev);
    toast.success(
      isOnlineMode ? 'تم التبديل إلى الوضع الكامل' : 'تم التبديل إلى وضع التاجر الإلكتروني',
      { duration: 2000 }
    );
  }, [isOnlineMode]);

  // مرموز البيانات الثابتة لتحسين الأداء
  const sidebarItems = useMemo(() => items ?? posSidebarItems, [items]);

  // تصفية العناصر بناءً على الوضع
  const filteredItems = useMemo(() => {
    if (!isOnlineMode) {
      // الوضع الكامل: إظهار جميع العناصر التي ليست خاصة بالتجار الإلكترونيين فقط
      return sidebarItems.filter(item => item.isOnlineOnly !== true);
    }
    // وضع التاجر الإلكتروني: إظهار العناصر الخاصة بالتجار + العناصر التي تظهر دائماً
    return sidebarItems.filter(item => item.isOnlineOnly === true || item.alwaysShow === true);
  }, [sidebarItems, isOnlineMode]);

  // تحسين منطق تمييز الرابط النشط مع useCallback لتحسين الأداء
  const isPathActive = useCallback((href: string): boolean => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    const basePath = href.split('/').slice(0, 3).join('/');
    const currentBasePath = location.pathname.split('/').slice(0, 3).join('/');
    return currentBasePath === basePath;
  }, [location.pathname]);

  // دالة للحصول على رابط المتجر - memoized
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

  // دالة تسجيل الخروج - memoized
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error('تعذر تسجيل الخروج، يرجى المحاولة مرة أخرى');
    }
  }, [signOut]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-col h-full rounded-none transition-all duration-300',
          className
        )}
      >
        {/* الشعار مع تصميم احترافي محسّن */}
        <div className={cn(
          "px-3 py-5 flex items-center relative transition-all duration-300",
          isExpanded ? "justify-start gap-3" : "justify-center"
        )}>
          {/* خلفية متدرجة ناعمة */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/8 via-orange-500/3 to-transparent pointer-events-none" />

          <div className="sidebar-logo relative w-12 h-12 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-xl flex items-center justify-center overflow-hidden border border-orange-400/40 shadow-xl shadow-orange-500/25 flex-shrink-0 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/35 hover:border-orange-400/60">
            {/* تأثير التوهج الداخلي المحسّن */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-tl from-orange-800/30 to-transparent" />

            <img
              src="/images/logo-new.webp"
              alt="سطوكيها"
              className="w-8 h-8 object-contain relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              onError={(e) => {
                e.currentTarget.src = '/images/logo.webp';
                e.currentTarget.onerror = () => {
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) nextElement.style.display = 'flex';
                };
              }}
            />
            <div className="w-8 h-8 hidden items-center justify-center relative z-10">
              <Store className="h-5 w-5 text-white drop-shadow-lg" />
            </div>
          </div>

          {isExpanded && (
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="text-lg font-bold bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 bg-clip-text text-transparent whitespace-nowrap drop-shadow-sm">
                سطوكيها
              </h2>
              <p className={cn(
                "text-[9px] font-medium tracking-wide truncate",
                isOnlineMode ? "text-blue-400" : "text-slate-400"
              )}>
                {isOnlineMode ? "وضع التاجر الإلكتروني" : "نظام إدارة شامل"}
              </p>
            </div>
          )}
        </div>

        {/* مؤشر وضع التاجر الإلكتروني */}
        {isOnlineMode && (
          <div className="mx-2 mb-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-400 flex-shrink-0" />
              {isExpanded && (
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-xs font-semibold text-blue-400">وضع التاجر الإلكتروني</p>
                  <p className="text-[10px] text-blue-300/70 truncate">
                    إظهار الصفحات الخاصة بالمتجر فقط
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* زر واجهة المتجر المحسّن */}
        <div className="px-2 pb-3">
          {!isExpanded ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={getStoreUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group relative flex items-center rounded-lg p-2.5",
                    "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
                    "shadow-md shadow-orange-500/25",
                    "transition-colors duration-150",
                    "hover:from-orange-600 hover:to-orange-700",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400",
                    "justify-center"
                  )}
                  aria-label="فتح واجهة المتجر"
                >
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <ExternalLink className="h-4 w-4 relative z-10" />
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="bg-slate-900/95 text-white border border-slate-700/50 shadow-xl backdrop-blur-sm"
                sideOffset={8}
              >
                <p className="text-xs font-medium">واجهة المتجر</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <a
              href={getStoreUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative flex items-center rounded-lg p-2.5 gap-2.5",
                "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
                "shadow-md shadow-orange-500/25",
                "transition-colors duration-150",
                "hover:from-orange-600 hover:to-orange-700",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400"
              )}
              aria-label="فتح واجهة المتجر"
            >
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <ExternalLink className="h-4 w-4 relative z-10 flex-shrink-0" />
              <span className="text-sm font-semibold whitespace-nowrap relative z-10">
                واجهة المتجر
              </span>
            </a>
          )}
        </div>
        
        <nav className="sidebar-nav flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
          {filteredItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={isPathActive(item.href)}
              isExpanded={isExpanded}
            />
          ))}
        </nav>

      <div className="p-2 border-t border-slate-700/30 space-y-1.5">
        {/* زر التبديل بين الوضع العادي ووضع التاجر الإلكتروني */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleOnlineMode}
              className={cn(
                "sidebar-button group w-full h-10 rounded-lg flex items-center transition-colors duration-150 border",
                isOnlineMode
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 hover:from-blue-600 hover:to-blue-700"
                  : "bg-slate-800/60 text-slate-400 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white border-transparent",
                isExpanded ? "justify-start gap-2.5 px-2.5" : "justify-center"
              )}
            >
              <ShoppingCart className={cn(
                "h-[18px] w-[18px] transition-transform duration-150",
                isOnlineMode ? "scale-105" : "group-hover:scale-105"
              )} />
              {isExpanded && (
                <span className="text-[13px] font-semibold">
                  {isOnlineMode ? "وضع التاجر الإلكتروني" : "الوضع الكامل"}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent
              side="left"
              className="bg-slate-900/95 text-white border border-slate-700/50 shadow-xl backdrop-blur-sm"
              sideOffset={8}
            >
              <p className="text-xs font-medium">
                {isOnlineMode ? "التبديل إلى الوضع الكامل" : "وضع التاجر الإلكتروني"}
              </p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* زر التوسيع/التصغير المحسّن */}
        {onToggleExpand && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className={cn(
                  "sidebar-button group w-full h-10 bg-slate-800/60 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 text-slate-400 hover:text-white rounded-lg flex items-center transition-colors duration-150 border border-transparent",
                  isExpanded ? "justify-start gap-2.5 px-2.5" : "justify-center"
                )}
              >
                {isExpanded ? (
                  <ChevronRight className="h-[18px] w-[18px] transition-transform duration-150 group-hover:scale-105" />
                ) : (
                  <ChevronLeft className="h-[18px] w-[18px] transition-transform duration-150 group-hover:scale-105" />
                )}
                {isExpanded && (
                  <span className="text-[13px] font-semibold">تصغير القائمة</span>
                )}
              </Button>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent
                side="left"
                className="bg-slate-900/95 text-white border border-slate-700/50 shadow-xl backdrop-blur-sm"
                sideOffset={8}
              >
                <p className="text-xs font-medium">توسيع القائمة</p>
              </TooltipContent>
            )}
          </Tooltip>
        )}

        {/* زر تسجيل الخروج المحسّن */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={cn(
                "sidebar-button group w-full h-10 bg-slate-800/60 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 text-slate-400 hover:text-white rounded-lg flex items-center transition-colors duration-150 border border-transparent",
                isExpanded ? "justify-start gap-2.5 px-2.5" : "justify-center"
              )}
            >
              <LogOut className="h-[18px] w-[18px] transition-transform duration-150 group-hover:scale-105" />
              {isExpanded && (
                <span className="text-[13px] font-semibold">تسجيل الخروج</span>
              )}
            </Button>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent
              side="left"
              className="bg-slate-900/95 text-white border border-slate-700/50 shadow-xl backdrop-blur-sm"
              sideOffset={8}
            >
              <p className="text-xs font-medium">تسجيل الخروج</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
      </div>
    </TooltipProvider>
  );
});

POSPureSidebar.displayName = 'POSPureSidebar';

export default POSPureSidebar;
