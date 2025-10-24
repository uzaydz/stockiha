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
      <div className="flex items-center gap-2 px-3 border-r border-white/10">
        {hasActiveSession && activeSession ? (
          // عرض معلومات الجلسة النشطة مع أزرار التحكم
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-1.5",
              activeSession.status === 'active' ? 'bg-green-500/20' : 'bg-amber-500/20'
            )}>
              <div className="flex items-center gap-1.5">
                {activeSession.status === 'active' ? (
                  <Clock className="h-4 w-4 text-green-400 animate-pulse" />
                ) : (
                  <Pause className="h-4 w-4 text-amber-400" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  activeSession.status === 'active' ? 'text-green-100' : 'text-amber-100'
                )}>
                  {activeSession.status === 'active' ? 'جلسة نشطة' : 'متوقف مؤقتاً'}
                </span>
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-white/70" />
                <span className="text-xs text-white/90">
                  {activeSession.opening_cash.toFixed(2)} دج
                </span>
              </div>
              <Badge variant="secondary" className={cn(
                "text-xs",
                activeSession.status === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
              )}>
                {activeSession.total_orders} طلب
              </Badge>
            </div>
            
            {/* أزرار التحكم */}
            <div className="flex items-center gap-1">
              {activeSession.status === 'active' ? (
                <Button
                  onClick={handlePause}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30"
                >
                  <Pause className="h-3.5 w-3.5" />
                  إيقاف مؤقت
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
                >
                  <Play className="h-3.5 w-3.5" />
                  استئناف
                </Button>
              )}
              <Button
                onClick={() => setShowCloseDialog(true)}
                disabled={isLoading}
                size="sm"
                variant="destructive"
                className="gap-2 h-8"
              >
                <StopCircle className="h-3.5 w-3.5" />
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          // زر بدء جلسة جديدة
          <Button
            onClick={() => setShowStartDialog(true)}
            size="sm"
            className={cn(
              'gap-2 bg-green-600 hover:bg-green-700 text-white',
              'animate-pulse'
            )}
          >
            <PlayCircle className="h-4 w-4" />
            بدء جلسة عمل
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
