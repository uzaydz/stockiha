import React, { useState, useEffect, useMemo } from 'react';
import {
  User, Clock, DollarSign, ShoppingCart,
  Play, Pause, StopCircle, ChevronDown,
  TrendingUp, AlertCircle, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useWorkSession } from '@/context/WorkSessionContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import { formatCurrency } from '@/lib/utils';
import CloseSessionDialog from './CloseSessionDialog';
import StartSessionDialog from './StartSessionDialog';
import { toast } from 'sonner';

interface WorkSessionIndicatorProps {
  className?: string;
  compact?: boolean;
}

/**
 * مؤشر جلسة العمل - يعرض حالة الجلسة الحالية
 * يظهر في الـ Header ويسمح بالتحكم في الجلسة
 */
const WorkSessionIndicator: React.FC<WorkSessionIndicatorProps> = ({
  className = '',
  compact = false
}) => {
  const {
    activeSession,
    hasActiveSession,
    isAdminMode,
    pauseSession,
    resumeSession,
    isLoading
  } = useWorkSession();
  const { currentStaff } = useStaffSession();

  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isPausing, setIsPausing] = useState(false);

  // حساب الوقت المنقضي
  useEffect(() => {
    if (!activeSession?.started_at) return;

    const updateElapsed = () => {
      const start = new Date(activeSession.started_at).getTime();
      const pauseDuration = (activeSession.total_pause_duration || 0) * 1000;

      // إذا كانت الجلسة متوقفة، نحسب الوقت حتى الإيقاف
      let endTime = Date.now();
      if (activeSession.status === 'paused' && activeSession.paused_at) {
        endTime = new Date(activeSession.paused_at).getTime();
      }

      const elapsed = endTime - start - pauseDuration;

      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.started_at, activeSession?.status, activeSession?.paused_at, activeSession?.total_pause_duration]);

  // حالة الجلسة
  const sessionStatus = useMemo(() => {
    if (!activeSession) return null;

    if (activeSession.status === 'paused') {
      return {
        label: 'متوقفة',
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        icon: Pause
      };
    }

    return {
      label: 'نشطة',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      icon: Play
    };
  }, [activeSession?.status]);

  // معالجة الإيقاف المؤقت
  const handlePauseResume = async () => {
    if (isPausing) return;
    setIsPausing(true);

    try {
      if (activeSession?.status === 'paused') {
        await resumeSession();
        toast.success('تم استئناف الجلسة');
      } else {
        await pauseSession();
        toast.info('تم إيقاف الجلسة مؤقتاً');
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setIsPausing(false);
    }
  };

  // إذا كان المدير ولا جلسة، لا نعرض شيء
  if (isAdminMode && !activeSession) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <User className="h-3 w-3 ml-1" />
          وضع المدير
        </Badge>
      </div>
    );
  }

  // إذا لا جلسة نشطة
  if (!hasActiveSession || !activeSession) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStartDialog(true)}
          className={`gap-2 ${className}`}
        >
          <Play className="h-4 w-4" />
          بدء جلسة
        </Button>

        <StartSessionDialog
          open={showStartDialog}
          onOpenChange={setShowStartDialog}
          allowClose={true}
        />
      </>
    );
  }

  // الوضع المختصر
  if (compact) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 px-2 ${className}`}
            >
              <div className={`h-2 w-2 rounded-full ${sessionStatus?.color} animate-pulse`} />
              <span className="font-mono text-xs">{elapsedTime}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64" dir="rtl">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {activeSession.staff_name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <div className="px-2 py-1.5 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المبيعات:</span>
                <span className="font-medium">{formatCurrency(activeSession.total_sales)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الطلبات:</span>
                <span className="font-medium">{activeSession.total_orders}</span>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handlePauseResume} disabled={isPausing}>
              {activeSession.status === 'paused' ? (
                <>
                  <Play className="h-4 w-4 ml-2" />
                  استئناف الجلسة
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 ml-2" />
                  إيقاف مؤقت
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setShowCloseDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <StopCircle className="h-4 w-4 ml-2" />
              إغلاق الجلسة
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <CloseSessionDialog
          open={showCloseDialog}
          onOpenChange={setShowCloseDialog}
        />
      </>
    );
  }

  // الوضع الكامل
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 h-auto py-1.5 ${className}`}
          >
            {/* مؤشر الحالة */}
            <div className={`h-2.5 w-2.5 rounded-full ${sessionStatus?.color} ${activeSession.status !== 'paused' ? 'animate-pulse' : ''}`} />

            {/* اسم الموظف */}
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium">{activeSession.staff_name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{elapsedTime}</span>
            </div>

            {/* المبيعات */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                {formatCurrency(activeSession.total_sales)}
              </span>
            </div>

            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72" dir="rtl">
          <DropdownMenuLabel className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{activeSession.staff_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Badge variant={activeSession.status === 'paused' ? 'secondary' : 'default'} className="text-[10px] h-4">
                      {sessionStatus?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* إحصائيات الجلسة */}
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  مدة العمل
                </div>
                <div className="font-mono font-medium">{elapsedTime}</div>
              </div>

              <div className="rounded-lg border p-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  الطلبات
                </div>
                <div className="font-medium">{activeSession.total_orders}</div>
              </div>
            </div>

            <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                إجمالي المبيعات
              </div>
              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                {formatCurrency(activeSession.total_sales)}
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                <span>نقدي: {formatCurrency(activeSession.cash_sales)}</span>
                <span>|</span>
                <span>بطاقة: {formatCurrency(activeSession.card_sales)}</span>
              </div>
            </div>

            <div className="rounded-lg border p-2">
              <div className="text-xs text-muted-foreground">رأس المال الأولي</div>
              <div className="font-medium">{formatCurrency(activeSession.opening_cash)}</div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* أزرار التحكم */}
          <div className="p-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handlePauseResume}
              disabled={isPausing}
            >
              {activeSession.status === 'paused' ? (
                <>
                  <Play className="h-4 w-4 ml-2 text-green-600" />
                  استئناف الجلسة
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 ml-2 text-amber-600" />
                  إيقاف مؤقت
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowCloseDialog(true)}
            >
              <StopCircle className="h-4 w-4 ml-2" />
              إغلاق الجلسة
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <CloseSessionDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
      />
    </>
  );
};

export default WorkSessionIndicator;
