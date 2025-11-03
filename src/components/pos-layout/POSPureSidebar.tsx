import React, { memo, useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Store, BarChart3, Zap, Layers, Package, LogOut, Truck, GraduationCap, Settings, Users, Building2, FileSpreadsheet, ChevronRight, ChevronLeft } from 'lucide-react';
import { ShoppingBag, Wrench, BarChart3 as ReportsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface POSSidebarItem {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
}

// ترتيب العناصر بحيث تكون "الرئيسية" أولاً لسهولة الوصول
const posSidebarItems: POSSidebarItem[] = [
  {
    id: 'pos-dashboard',
    title: 'لوحة تحكم نقطة البيع',
    icon: BarChart3,
    href: '/dashboard/pos-dashboard',
  },
  {
    id: 'pos-advanced',
    title: 'نقطة البيع',
    icon: Zap,
    href: '/dashboard/pos-advanced',
  },
  {
    id: 'pos-operations',
    title: 'إدارة نقطة البيع',
    icon: Layers,
    href: '/dashboard/pos-operations/orders',
  }
  ,
  {
    id: 'etat104',
    title: 'كشف حساب 104',
    icon: FileSpreadsheet,
    href: '/dashboard/etat104',
    badge: 'جديد',
  }
  ,
  {
    id: 'store-business-settings',
    title: 'إعدادات المحل',
    icon: Building2,
    href: '/dashboard/store-business-settings',
  }
  ,
  {
    id: 'staff-management',
    title: 'إدارة الموظفين والجلسات',
    icon: Users,
    href: '/dashboard/staff-management',
  }
  ,
  {
    id: 'product-operations',
    title: 'مركز المنتجات',
    icon: Package,
    href: '/dashboard/product-operations/products',
  }
  ,
  {
    id: 'sales-operations',
    title: 'مركز المبيعات والطلبات',
    icon: ShoppingBag,
    href: '/dashboard/sales-operations/onlineOrders',
  }
  ,
  {
    id: 'services-operations',
    title: 'مركز الخدمات',
    icon: Wrench,
    href: '/dashboard/services-operations/repair',
  }
  ,
  {
    id: 'supplier-operations',
    title: 'مركز الموردين',
    icon: Truck,
    href: '/dashboard/supplier-operations/suppliers',
  }
  ,
  {
    id: 'courses-operations',
    title: 'دورات سطوكيها',
    icon: GraduationCap,
    href: '/dashboard/courses-operations/all',
  }
  ,
  {
    id: 'store-operations',
    title: 'إدارة المتجر',
    icon: Store,
    href: '/dashboard/store-operations/store-settings',
  }
  ,
  {
    id: 'settings-operations',
    title: 'الإعدادات',
    icon: Settings,
    href: '/dashboard/settings-operations/settings',
  }
  ,
  {
    id: 'reports-operations',
    title: 'مركز التقارير',
    icon: ReportsIcon,
    href: '/dashboard/reports-operations/financial',
  }
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

  // مرموز البيانات الثابتة لتحسين الأداء
  const sidebarItems = useMemo(() => items ?? posSidebarItems, [items]);

  // تحسين منطق تمييز الرابط النشط: يدعم المسارات الفرعية باستثناء الرئيسية
  const isPathActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    // استخراج المسار الأساسي من href (مثل /dashboard/pos-operations من /dashboard/pos-operations/orders)
    const basePath = href.split('/').slice(0, 3).join('/');
    const currentBasePath = location.pathname.split('/').slice(0, 3).join('/');
    return currentBasePath === basePath;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-col h-full rounded-none transition-all duration-300',
          className
        )}
      >
        {/* الشعار الحقيقي مع تصميم محسّن */}
        <div className={cn(
          "px-4 py-6 flex items-center relative transition-all duration-300",
          isExpanded ? "justify-start gap-4" : "justify-center"
        )}>
          {/* خلفية متدرجة مع تأثير الضوء */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-orange-400/30 shadow-2xl shadow-orange-500/20 flex-shrink-0 transform transition-all duration-300 hover:scale-110 hover:shadow-orange-500/40">
            {/* تأثير التوهج الداخلي */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-70" />
            <img 
              src="/images/logo-new.webp" 
              alt="سطوكيها" 
              className="w-9 h-9 object-contain relative z-10 drop-shadow-lg"
              onError={(e) => {
                // fallback إلى الشعار القديم
                e.currentTarget.src = '/images/logo.webp';
                e.currentTarget.onerror = () => {
                  // fallback نهائي إلى الأيقونة
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) {
                    nextElement.style.display = 'flex';
                  }
                };
              }}
            />
            <div className="w-9 h-9 hidden items-center justify-center relative z-10">
              <Store className="h-6 w-6 text-white drop-shadow-lg" />
            </div>
          </div>
          
          {isExpanded && (
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-extrabold bg-gradient-to-br from-orange-500 to-orange-600 bg-clip-text text-transparent whitespace-nowrap drop-shadow-sm">
                سطوكيها
              </h2>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">النظام الشامل في التجارة الإلكترونية</p>
            </div>
          )}
        </div>
        <nav className="flex-1 px-2 pb-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const active = isPathActive(item.href);
            const Icon = item.icon;

            const linkContent = (
              <Link
                to={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.title}
                className={cn(
                  'group relative flex items-center rounded-xl p-3 mx-1',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50',
                  'transition-all duration-300 ease-out',
                  isExpanded ? 'justify-start gap-3' : 'justify-center',
                  active
                    ? 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-500 text-white shadow-xl shadow-orange-500/40 scale-[1.02] border border-orange-400/30'
                    : 'text-slate-400 hover:text-orange-400 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/20 hover:bg-slate-800/50 hover:border hover:border-orange-500/20'
                )}
              >
                {/* خلفية متحركة عند الـ hover */}
                {!active && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/0 to-orange-600/0 group-hover:from-orange-500/10 group-hover:to-orange-600/10 transition-all duration-300" />
                )}
                
                {/* دائرة مضيئة خلف الأيقونة عند الـ hover */}
                {!active && (
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 rounded-xl bg-orange-500/5 blur-sm" />
                  </div>
                )}
                
                {Icon ? (
                  <Icon
                    className={cn(
                      'h-5 w-5 relative z-10 transition-all duration-300 flex-shrink-0',
                      active 
                        ? 'drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]' 
                        : 'group-hover:drop-shadow-[0_0_12px_rgba(249,115,22,0.5)] group-hover:scale-110'
                    )}
                  />
                ) : null}
                
                {isExpanded && (
                  <span className={cn(
                    "text-sm font-semibold whitespace-nowrap relative z-10 transition-all duration-300",
                    active ? 'tracking-wide' : 'group-hover:tracking-wide'
                  )}>
                    {item.title}
                  </span>
                )}
                
                {isExpanded && item.badge && (
                  <span className="mr-auto px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full relative z-10 shadow-lg shadow-orange-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            // إذا كانت القائمة مصغرة، نعرض Tooltip
            if (!isExpanded) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent 
                    side="left" 
                    align="center"
                    className="bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/50 shadow-2xl backdrop-blur-sm"
                    style={{ zIndex: 99999 }}
                    sideOffset={8}
                    avoidCollisions={true}
                  >
                    <div className="px-3 py-2 text-sm font-medium">
                      {item.title}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            // إذا كانت القائمة موسعة، نعرض بدون Tooltip
            return <div key={item.id}>{linkContent}</div>;
          })}
        </nav>

      <div className="p-3 border-t border-slate-700/30 space-y-2">
        {/* زر التوسيع/التصغير */}
        {onToggleExpand && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className={cn(
                  "group w-full h-11 bg-slate-800/50 hover:bg-gradient-to-br hover:from-orange-500 hover:to-orange-600 text-slate-400 hover:text-white rounded-xl flex items-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30",
                  isExpanded ? "justify-start gap-3 px-3" : "justify-center"
                )}
              >
                {isExpanded ? (
                  <ChevronRight className="h-5 w-5 transition-transform duration-300" />
                ) : (
                  <ChevronLeft className="h-5 w-5 transition-transform duration-300" />
                )}
                {isExpanded && (
                  <span className="text-sm font-medium">تصغير القائمة</span>
                )}
              </Button>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent 
                side="left" 
                align="center"
                className="bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/50 shadow-2xl backdrop-blur-sm"
                style={{ zIndex: 99999 }}
                sideOffset={8}
                avoidCollisions={true}
              >
                <div className="px-3 py-2 text-sm font-medium">
                  توسيع القائمة
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        )}
        
        {/* زر تسجيل الخروج */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  toast.error('تعذر تسجيل الخروج، يرجى المحاولة مرة أخرى');
                }
              }}
              className={cn(
                "group w-full h-11 bg-slate-800/50 hover:bg-gradient-to-br hover:from-red-500 hover:to-red-600 text-slate-400 hover:text-white rounded-xl flex items-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30",
                isExpanded ? "justify-start gap-3 px-3" : "justify-center"
              )}
            >
              <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
              {isExpanded && (
                <span className="text-sm font-medium">تسجيل الخروج</span>
              )}
            </Button>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent 
              side="left" 
              align="center"
              className="bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/50 shadow-2xl backdrop-blur-sm"
              style={{ zIndex: 99999 }}
              sideOffset={8}
              avoidCollisions={true}
            >
              <div className="px-3 py-2 text-sm font-medium">
                تسجيل الخروج
              </div>
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
