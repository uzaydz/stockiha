/**
 * 📱 AppPortal - بوابة التطبيقات
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * قائمة شبكية للأدوات والتطبيقات الثانوية:
 * - حاسبة
 * - مصروفات
 * - إعدادات
 * - تحديث البيانات
 * - وأي تطبيقات مستقبلية
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3X3,
  Calculator,
  Receipt,
  Settings,
  RefreshCw,
  Truck,
  CreditCard,
  Clock,
  Users,
  BarChart3,
  Package,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { POSMode } from './CommandIsland';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AppPortalProps {
  onOpenCalculator?: () => void;
  onOpenExpense?: () => void;
  onOpenSettings?: () => void;
  onRefreshData?: () => void;
  mode: POSMode;
}

interface AppItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const AppPortal = memo<AppPortalProps>(({
  onOpenCalculator,
  onOpenExpense,
  onOpenSettings,
  onRefreshData,
  mode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ⚡ التعامل مع التحديث - تخزين مؤقت
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    onRefreshData?.();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [onRefreshData]);

  // ⚡ قائمة التطبيقات - تخزين مؤقت
  const apps: AppItem[] = useMemo(() => [
    {
      id: 'calculator',
      label: 'حاسبة',
      icon: Calculator,
      color: 'text-purple-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20',
      onClick: onOpenCalculator
    },
    {
      id: 'expense',
      label: 'مصروف',
      icon: Receipt,
      color: 'text-rose-500 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20',
      onClick: onOpenExpense
    },
    {
      id: 'refresh',
      label: 'تحديث',
      icon: RefreshCw,
      color: 'text-cyan-500 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-900/20',
      onClick: handleRefresh
    },
    {
      id: 'settings',
      label: 'إعدادات',
      icon: Settings,
      color: 'text-slate-500 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/20',
      onClick: onOpenSettings
    },
    // تطبيقات مستقبلية 
    {
      id: 'delivery',
      label: 'توصيل',
      icon: Truck,
      color: 'text-amber-500',
      badge: 'قريباً',
      disabled: true
    },
    {
      id: 'credit',
      label: 'ديون',
      icon: CreditCard,
      color: 'text-red-500',
      badge: 'قريباً',
      disabled: true
    },
    {
      id: 'reservations',
      label: 'حجوزات',
      icon: Clock,
      color: 'text-indigo-500',
      badge: 'قريباً',
      disabled: true
    },
    {
      id: 'customers',
      label: 'زبائن',
      icon: Users,
      color: 'text-emerald-500',
      badge: 'قريباً',
      disabled: true
    }
  ], [onOpenCalculator, onOpenExpense, handleRefresh, onOpenSettings]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative p-3 rounded-full",
            "hover:bg-zinc-100 dark:hover:bg-[#21262d]",
            "transition-colors duration-200",
            isOpen && "bg-zinc-100 dark:bg-[#21262d]"
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-zinc-500 dark:text-[#8b949e]" />
            ) : (
              <Grid3X3 className="h-6 w-6 text-zinc-400 dark:text-[#8b949e]" />
            )}
          </motion.div>
        </motion.button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={16}
        className={cn(
          "w-80 p-4 rounded-3xl",
          "bg-white/95 dark:bg-[#161b22]/98",
          "backdrop-blur-xl border border-zinc-200 dark:border-[#30363d]",
          "shadow-xl shadow-black/10 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/5"
        )}
      >
        {/* العنوان */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="font-bold text-lg text-zinc-800 dark:text-[#e6edf3] tracking-tight">التطبيقات</span>
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-[#484f58]" />
        </div>

        {/* شبكة التطبيقات */}
        <div className="grid grid-cols-4 gap-3">
          {apps.map((app, index) => {
            const Icon = app.icon;

            return (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.02,
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
                whileHover={{ scale: app.disabled ? 1 : 1.05 }}
                whileTap={{ scale: app.disabled ? 1 : 0.95 }}
                onClick={() => {
                  if (!app.disabled) {
                    app.onClick?.();
                    if (app.id !== 'refresh') setIsOpen(false);
                  }
                }}
                disabled={app.disabled}
                className={cn(
                  "group flex flex-col items-center gap-2",
                  app.disabled ? "opacity-40 grayscale" : "cursor-pointer"
                )}
              >
                {/* أيقونة التطبيق - Minimal */}
                <div className={cn(
                  "relative w-14 h-14 rounded-2xl flex items-center justify-center",
                  "bg-zinc-50 dark:bg-[#21262d] border border-zinc-100 dark:border-[#30363d]",
                  "transition-all duration-300 shadow-sm",
                  !app.disabled && app.color,
                  !app.disabled && "group-hover:shadow-md group-hover:border-transparent dark:group-hover:border-[#484f58]"
                )}>
                  <Icon className={cn(
                    "h-6 w-6 transition-colors duration-300",
                    !app.disabled ? app.color.split(' ')[0] : "text-zinc-400", // Extract text color class
                    app.id === 'refresh' && isRefreshing && "animate-spin"
                  )} />
                </div>

                {/* اسم التطبيق */}
                <span className="text-[11px] font-medium text-zinc-500 dark:text-[#8b949e] group-hover:text-zinc-800 dark:group-hover:text-[#e6edf3] transition-colors">
                  {app.label}
                </span>

                {/* شارة "قريباً" */}
                {app.badge && (
                  <span className="absolute top-0 right-1 translate-x-1 -translate-y-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-[#30363d] text-zinc-500 dark:text-[#8b949e] shadow-sm border border-zinc-200 dark:border-[#484f58]">
                    {app.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

AppPortal.displayName = 'AppPortal';

export default AppPortal;
