import React, { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Store,
  Receipt, 
  Banknote, 
  RotateCcw, 
  AlertTriangle,
  Home
} from 'lucide-react';

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
    id: 'home',
    title: 'الرئيسية',
    icon: Home,
    href: '/dashboard',
  },
  {
    id: 'pos',
    title: 'نقطة البيع',
    icon: Store,
    href: '/dashboard/pos-advanced',
    badge: '🔥'
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
    <div
      className={cn(
        'flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
        'border-l border-slate-200/60 dark:border-slate-700/60 shadow-sm',
        'transition-colors duration-300',
        className
      )}
    >
      {/* Header أنيق ومينيمالي بدون أيقونة */}
      <div className="p-3 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-center">
          {/* تمت إزالة أيقونة المتجر من الترويسة */}
        </div>
      </div>

      {/* Navigation Items مع Tooltips */}
      <TooltipProvider>
        <nav className="flex-1 p-2 space-y-1.5">
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
                      'group relative flex flex-col items-center justify-center gap-1 rounded-xl p-2.5',
                      'transition-all duration-200 transform-gpu',
                      'border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60',
                      'hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:shadow-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                      active
                        ? 'bg-slate-100 dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 border-slate-200/60 dark:border-slate-700/60 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {/* Active vertical indicator */}
                    {active && (
                      <span className="absolute right-1.5 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                    )}

                    {/* Icon */}
                    {Icon ? (
                      <div className="relative">
                        <Icon
                          className={cn(
                            'h-5 w-5 transition-colors duration-200',
                            active
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                          )}
                        />

                        {/* Badge مع الأيقونة فقط */}
                        {item.badge && (
                          <Badge
                            variant="purple"
                            className="absolute -top-2 -left-2 px-1.5 py-0 text-[10px] leading-4 rounded-full shadow-sm"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    ) : null}

                    {/* Title */}
                    <span
                      className={cn(
                        'text-[11px] font-medium mt-1 text-center transition-colors duration-200',
                        active
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100'
                      )}
                    >
                      {item.title}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="left" align="center">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* Footer بسيط مع مؤشر حالة */}
      <div className="p-2 border-t border-slate-200/60 dark:border-slate-700/60">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              متصل
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

POSPureSidebar.displayName = 'POSPureSidebar';

export default POSPureSidebar;
