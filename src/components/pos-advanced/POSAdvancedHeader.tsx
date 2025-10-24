import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';
import {
  Undo2,
  Calculator,
  Settings,
  Wrench,
  DollarSign,
  Store,
  TrendingUp
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
}

export const POSAdvancedHeader: React.FC<POSAdvancedHeaderProps> = ({
  isReturnMode,
  returnItemsCount,
  toggleReturnMode,
  onCalculatorOpen,
  onSettingsOpen,
  onRepairOpen,
  onQuickExpenseOpen,
  isRepairEnabled
}) => {
  const isMobile = useIsMobile();

  const actionButtons = useMemo(() => {
    const base = [
      {
        key: 'return',
        label: isReturnMode ? 'إنهاء الإرجاع' : 'وضع الإرجاع',
        icon: <Undo2 className="h-4 w-4" strokeWidth={2} />,
        onClick: toggleReturnMode,
        variant: isReturnMode ? 'destructive' as const : 'outline' as const,
      },
      {
        key: 'calculator',
        label: 'آلة حاسبة',
        icon: <Calculator className="h-4 w-4" strokeWidth={2} />,
        onClick: onCalculatorOpen,
        variant: 'outline' as const,
      },
      {
        key: 'settings',
        label: 'إعدادات',
        icon: <Settings className="h-4 w-4" strokeWidth={2} />,
        onClick: onSettingsOpen,
        variant: 'outline' as const,
      },
      ...(isRepairEnabled
        ? [{
            key: 'repair',
            label: 'خدمة تصليح',
            icon: <Wrench className="h-4 w-4" strokeWidth={2} />,
            onClick: onRepairOpen,
            variant: 'outline' as const,
          }]
        : []),
      {
        key: 'expense',
        label: 'مصروف سريع',
        icon: <DollarSign className="h-4 w-4" strokeWidth={2} />,
        onClick: onQuickExpenseOpen,
        variant: 'outline' as const,
      }
    ];

    return base;
  }, [isReturnMode, toggleReturnMode, onCalculatorOpen, onSettingsOpen, onRepairOpen, onQuickExpenseOpen, isRepairEnabled]);

  return (
    <div className="relative overflow-hidden bg-card shadow-md">
      <div className="px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3.5">
          {/* القسم العلوي */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5 min-w-0">
              {/* أيقونة رئيسية محسّنة */}
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-primary/90 shadow-md shadow-primary/20">
                <Store className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    نقطة البيع
                  </h2>
                  {!isReturnMode && (
                    <Badge className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 px-2 py-0.5 text-xs font-semibold">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      نشط
                    </Badge>
                  )}
                  {isReturnMode && (
                    <Badge className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 px-2 py-0.5 text-xs font-semibold">
                      <Undo2 className="h-3 w-3" strokeWidth={2.5} />
                      إرجاع
                    </Badge>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground mt-1 leading-tight">
                  {isReturnMode
                    ? `معالجة الإرجاعات • ${returnItemsCount.toLocaleString('ar-DZ')} عنصر`
                    : 'نظام بيع متكامل وسريع'}
                </p>
              </div>
            </div>

            {/* مؤشر الحالة */}
            {!isReturnMode && (
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-800/40 bg-muted/50 px-3.5 py-2 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
                <span className="text-xs font-semibold text-foreground">جاهز للبيع</span>
              </div>
            )}
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-wrap gap-2">
            {actionButtons.map(({ key, label, icon, onClick, variant }) => (
              <Button
                key={key}
                variant="ghost"
                size={isMobile ? 'sm' : 'default'}
                onClick={onClick}
                className={cn(
                  'group relative flex-1 sm:flex-none justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-all duration-150',
                  isMobile ? 'min-w-[47%] h-9 px-3' : 'px-4 h-10',
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
                  // الأزرار الأخرى
                  key !== 'return' && [
                    'border-slate-700/50 bg-muted/50 text-foreground',
                    'hover:bg-muted hover:border-slate-600/60'
                  ],
                  // تأثيرات hover عامة
                  'hover:shadow-sm active:scale-[0.98]'
                )}
              >
                <span className="transition-transform duration-150 group-hover:scale-105">
                  {icon}
                </span>
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
