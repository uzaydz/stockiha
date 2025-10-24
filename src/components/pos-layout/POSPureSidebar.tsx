import React, { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Store,
  BarChart3,
  TrendingUp,
  Activity,
  PieChart,
  Receipt, 
  Banknote, 
  RotateCcw, 
  AlertTriangle,
  Settings2,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface POSSidebarItem {
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
    badge: '📊'
  },
  {
    id: 'pos',
    title: 'نقطة البيع',
    icon: Store,
    href: '/dashboard/pos-advanced',
    badge: '🔥'
  },
  {
    id: 'pos-settings',
    title: 'إعدادات نقطة البيع',
    icon: Settings2,
    href: '/dashboard/pos-settings',
  },
  {
    id: 'orders',
    title: 'الطلبيات',
    icon: Receipt,
    href: '/dashboard/pos-orders',
  },
  {
    id: 'debts',
    title: 'المديونيات',
    icon: Banknote,
    href: '/dashboard/customer-debts',
  },
  {
    id: 'returns',
    title: 'الإرجاع',
    icon: RotateCcw,
    href: '/dashboard/returns',
  },
  {
    id: 'losses',
    title: 'الخسائر',
    icon: AlertTriangle,
    href: '/dashboard/losses',
  }
];

interface POSPureSidebarProps {
  className?: string;
}

const POSPureSidebar: React.FC<POSPureSidebarProps> = memo(({ className }) => {
  const location = useLocation();
  const { signOut } = useAuth();

  // مرموز البيانات الثابتة لتحسين الأداء
  const sidebarItems = useMemo(() => posSidebarItems, []);

  // تحسين منطق تمييز الرابط النشط: يدعم المسارات الفرعية باستثناء الرئيسية
  const isPathActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-col h-full rounded-none',
          className
        )}
      >
        {/* الشعار الحقيقي */}
        <div className="px-3 py-6 flex items-center justify-center relative">
          <div className="w-14 h-14 bg-transparent flex items-center justify-center overflow-hidden">
            <img 
              src="/images/logo-new.webp" 
              alt="ستوكيها" 
              className="w-10 h-10 object-contain"
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
            <div className="w-10 h-10 hidden items-center justify-center">
              <Store className="h-6 w-6 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 pb-4 space-y-1.5">
          {sidebarItems.map((item) => {
            const active = isPathActive(item.href);
            const Icon = item.icon;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.title}
                    className={cn(
                      'relative flex items-center justify-center rounded-xl p-3 mx-1',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40',
                      'transform-none transition-none',
                      active
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    {Icon ? (
                      <Icon
                        className="h-6 w-6 transform-none"
                      />
                    ) : null}

                  </Link>
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
          })}
        </nav>

      <div className="p-4 border-t border-slate-700/50">
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
              className="w-full h-12 bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl flex items-center justify-center"
            >
              <LogOut className="h-6 w-6" />
            </Button>
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
              تسجيل الخروج
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      </div>
    </TooltipProvider>
  );
});

POSPureSidebar.displayName = 'POSPureSidebar';

export default POSPureSidebar;
