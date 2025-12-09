import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';
import { SmartAssistantButton } from '@/components/pos/SmartAssistantButton';
import WorkSessionIndicator from '@/components/pos/WorkSessionIndicator';
import {
  Undo2,
  Calculator,
  Settings,
  Wrench,
  DollarSign,
  Store,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface POSAdvancedHeaderProps {
  isReturnMode: boolean;
  returnItemsCount: number;
  toggleReturnMode: () => void;
  onCalculatorOpen: () => void;
  onSettingsOpen: () => void;
  onRepairOpen: () => void;
  onQuickExpenseOpen: () => void;
  isRepairEnabled: boolean;
  // ⚡ وضع الخسائر
  isLossMode?: boolean;
  lossItemsCount?: number;
  toggleLossMode?: () => void;
}

export const POSAdvancedHeader: React.FC<POSAdvancedHeaderProps> = ({
  isReturnMode,
  returnItemsCount,
  toggleReturnMode,
  onCalculatorOpen,
  onSettingsOpen,
  onRepairOpen,
  onQuickExpenseOpen,
  isRepairEnabled,
  // ⚡ وضع الخسائر
  isLossMode = false,
  lossItemsCount = 0,
  toggleLossMode
}) => {
  const isMobile = useIsMobile();

  const actionButtons = useMemo(() => {
    const base = [
      {
        key: 'return',
        label: isReturnMode ? 'إنهاء الإرجاع' : 'وضع الإرجاع',
        shortLabel: isReturnMode ? 'بيع' : 'إرجاع',
        icon: <Undo2 className="h-4 w-4" strokeWidth={2} />,
        onClick: toggleReturnMode,
        variant: isReturnMode ? 'destructive' as const : 'outline' as const,
        disabled: isLossMode, // لا يمكن الدخول لوضع الإرجاع أثناء وضع الخسائر
      },
      // ⚡ زر وضع الخسائر
      ...(toggleLossMode ? [{
        key: 'loss',
        label: isLossMode ? 'إنهاء الخسائر' : 'وضع الخسائر',
        shortLabel: isLossMode ? 'بيع' : 'خسائر',
        icon: <AlertTriangle className="h-4 w-4" strokeWidth={2} />,
        onClick: toggleLossMode,
        variant: isLossMode ? 'destructive' as const : 'outline' as const,
        disabled: isReturnMode, // لا يمكن الدخول لوضع الخسائر أثناء وضع الإرجاع
      }] : []),
      {
        key: 'calculator',
        label: 'آلة حاسبة',
        shortLabel: 'حاسبة',
        icon: <Calculator className="h-4 w-4" strokeWidth={2} />,
        onClick: onCalculatorOpen,
        variant: 'outline' as const,
      },
      {
        key: 'settings',
        label: 'إعدادات',
        shortLabel: 'إعدادات',
        icon: <Settings className="h-4 w-4" strokeWidth={2} />,
        onClick: onSettingsOpen,
        variant: 'outline' as const,
      },
      ...(isRepairEnabled
        ? [{
            key: 'repair',
            label: 'خدمة تصليح',
            shortLabel: 'تصليح',
            icon: <Wrench className="h-4 w-4" strokeWidth={2} />,
            onClick: onRepairOpen,
            variant: 'outline' as const,
          }]
        : []),
      {
        key: 'expense',
        label: 'مصروف سريع',
        shortLabel: 'مصروف',
        icon: <DollarSign className="h-4 w-4" strokeWidth={2} />,
        onClick: onQuickExpenseOpen,
        variant: 'outline' as const,
      }
    ];

    return base;
  }, [isReturnMode, isLossMode, toggleReturnMode, toggleLossMode, onCalculatorOpen, onSettingsOpen, onRepairOpen, onQuickExpenseOpen, isRepairEnabled]);

  return (
    <div className="relative overflow-hidden bg-card shadow-md">
      <div className="px-3 py-2.5 sm:px-4 sm:py-3.5 md:px-6 md:py-4">
        <div className="flex flex-col gap-2.5 sm:gap-3.5">
          {/* القسم العلوي */}
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2 sm:gap-3.5 min-w-0">
              {/* أيقونة رئيسية محسّنة */}
              <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-primary/90 shadow-md shadow-primary/20">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
              </div>
              
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    نقطة البيع
                  </h2>
                  {!isReturnMode && !isLossMode && (
                    <Badge className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold">
                      <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      نشط
                    </Badge>
                  )}
                  {isReturnMode && (
                    <Badge className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold">
                      <Undo2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.5} />
                      إرجاع
                    </Badge>
                  )}
                  {isLossMode && (
                    <Badge className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 border-0 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold">
                      <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.5} />
                      خسائر
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] sm:text-[13px] text-muted-foreground mt-0.5 sm:mt-1 leading-tight">
                  {isLossMode
                    ? `تسجيل الخسائر • ${lossItemsCount.toLocaleString('ar-DZ')} عنصر`
                    : isReturnMode
                    ? `معالجة الإرجاعات • ${returnItemsCount.toLocaleString('ar-DZ')} عنصر`
                    : 'نظام بيع متكامل وسريع'}
                </p>
              </div>
            </div>

            {/* مؤشر الجلسة وزر الذكاء الاصطناعي */}
            <div className="flex items-center gap-2">
              {/* مؤشر جلسة العمل */}
              <WorkSessionIndicator compact={isMobile} />

              {/* زر المساعد الذكي (شات) */}
              <SmartAssistantButton variant="header" />
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-wrap gap-2">
            {actionButtons.map(({ key, label, shortLabel, icon, onClick, variant, disabled }) => (
              <Button
                key={key}
                variant="ghost"
                size={isMobile ? 'sm' : 'default'}
                onClick={onClick}
                disabled={disabled}
                className={cn(
                  'group relative flex-1 sm:flex-none justify-center gap-1.5 sm:gap-2 rounded-lg border text-xs sm:text-[13px] font-semibold transition-all duration-150',
                  isMobile ? 'min-w-[30%] h-8 px-2' : 'px-4 h-10',
                  // زر الإرجاع في وضع نشط
                  key === 'return' && isReturnMode && [
                    'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    'hover:bg-amber-500/15 hover:border-amber-500/40',
                    'shadow-sm shadow-amber-500/10'
                  ],
                  // زر الإرجاع في وضع عادي
                  key === 'return' && !isReturnMode && [
                    'border-slate-700/50 bg-muted/50 text-foreground',
                    'hover:bg-muted hover:border-slate-600/60'
                  ],
                  // ⚡ زر الخسائر في وضع نشط
                  key === 'loss' && isLossMode && [
                    'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
                    'hover:bg-red-500/15 hover:border-red-500/40',
                    'shadow-sm shadow-red-500/10'
                  ],
                  // ⚡ زر الخسائر في وضع عادي
                  key === 'loss' && !isLossMode && [
                    'border-slate-700/50 bg-muted/50 text-foreground',
                    'hover:bg-muted hover:border-slate-600/60'
                  ],
                  // الأزرار الأخرى
                  key !== 'return' && key !== 'loss' && [
                    'border-slate-700/50 bg-muted/50 text-foreground',
                    'hover:bg-muted hover:border-slate-600/60'
                  ],
                  // تأثيرات hover عامة
                  'hover:shadow-sm active:scale-[0.98]',
                  // تعطيل
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="transition-transform duration-150 group-hover:scale-105">
                  {icon}
                </span>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
