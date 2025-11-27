import React, { useState } from 'react';
import { PlayCircle, Clock, DollarSign, Shield, StopCircle, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useWorkSession } from '@/context/WorkSessionContext';
import { useToast } from '@/hooks/use-toast';
import StartSessionDialog from './StartSessionDialog';
import CloseSessionDialog from './CloseSessionDialog';
import { cn } from '@/lib/utils';

/**
 * أزرار إضافية في title bar خاصة بنقطة البيع
 */
const POSTitleBarActions: React.FC = () => {
  const { currentStaff, isAdminMode } = useStaffSession();
  const { activeSession, hasActiveSession, pauseSession, resumeSession, isLoading } = useWorkSession();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const { toast } = useToast();

  // إيقاف الجلسة مؤقتاً
  const handlePause = async () => {
    try {
      await pauseSession();
      toast({
        title: '⏸️ تم إيقاف الجلسة مؤقتاً',
        description: 'يمكنك استئناف الجلسة في أي وقت',
      });
    } catch (error) {
      toast({
        title: '❌ خطأ',
        description: 'فشل إيقاف الجلسة',
        variant: 'destructive',
      });
    }
  };

  // استئناف الجلسة
  const handleResume = async () => {
    try {
      await resumeSession();
      toast({
        title: '▶️ تم استئناف الجلسة',
        description: 'يمكنك متابعة العمل الآن',
      });
    } catch (error) {
      toast({
        title: '❌ خطأ',
        description: 'فشل استئناف الجلسة',
        variant: 'destructive',
      });
    }
  };

  // إذا لم يكن هناك موظف مسجل دخول، لا تعرض شيء
  if (!currentStaff && !isAdminMode) {
    return null;
  }

  // المدير لا يحتاج جلسة
  if (isAdminMode) {
    return (
      <div className="flex items-center gap-2 px-3 border-r border-white/10">
        <div className="flex items-center gap-2 bg-blue-500/20 rounded-lg px-3 py-1.5">
          <Shield className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-100">وضع المدير</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-2 border-r border-white/10 h-full">
        {hasActiveSession && activeSession ? (
          // عرض معلومات الجلسة النشطة مع أزرار التحكم
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1 h-8 transition-colors",
              activeSession.status === 'active'
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-amber-500/10 border border-amber-500/20'
            )}>
              <div className="flex items-center gap-1.5">
                {activeSession.status === 'active' ? (
                  <Clock className="h-3.5 w-3.5 text-green-400 animate-pulse" />
                ) : (
                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  activeSession.status === 'active' ? 'text-green-200' : 'text-amber-200'
                )}>
                  {activeSession.status === 'active' ? 'نشط' : 'متوقف'}
                </span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-white/60" />
                <span className="text-xs font-semibold text-white/90 whitespace-nowrap tabular-nums">
                  {activeSession.opening_cash.toFixed(0)}
                </span>
              </div>
              <Badge variant="secondary" className={cn(
                "text-[10px] px-1.5 h-5 min-w-[20px] justify-center",
                activeSession.status === 'active' ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              )}>
                {activeSession.total_orders}
              </Badge>
            </div>

            {/* أزرار التحكم */}
            <div className="flex items-center gap-1">
              {activeSession.status === 'active' ? (
                <Button
                  onClick={handlePause}
                  disabled={isLoading}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-lg hover:bg-amber-500/20 text-amber-400 hover:text-amber-300"
                  title="إيقاف مؤقت"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  disabled={isLoading}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-lg hover:bg-green-500/20 text-green-400 hover:text-green-300"
                  title="استئناف"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={() => setShowCloseDialog(true)}
                disabled={isLoading}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300"
                title="إغلاق الجلسة"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // زر بدء جلسة جديدة
          <Button
            onClick={() => setShowStartDialog(true)}
            size="sm"
            className={cn(
              'gap-2 px-4 h-8 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-xs font-medium rounded-lg shadow-lg shadow-green-900/20 border border-green-400/20',
              'animate-in fade-in zoom-in duration-300'
            )}
            title="بدء جلسة عمل"
          >
            <PlayCircle className="h-4 w-4" />
            <span>بدء جلسة</span>
          </Button>
        )}
      </div>

      <StartSessionDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
      />

      <CloseSessionDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
      />
    </>
  );
};

export default POSTitleBarActions;
