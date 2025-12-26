import React, { useState } from 'react';
import {
  PlayCircle,
  Clock,
  DollarSign,
  Shield,
  StopCircle,
  Pause,
  Play,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  Store,
  ShoppingCart,
  RefreshCcw,
  Wallet,
  Coins,
  Grid,
  Calculator,
  Receipt,
  RotateCw,
  Settings,
  Truck,
  CreditCard,
  CalendarDays,
  Users,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStaffSession } from '@/context/StaffSessionContext';
import { useWorkSession } from '@/context/WorkSessionContext';
import { usePOSMode } from '@/context/POSModeContext';
import { usePOSActions } from '@/context/POSActionsContext';
import { useToast } from '@/hooks/use-toast';
import StartSessionDialog from './StartSessionDialog';
import CloseSessionDialog from './CloseSessionDialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualNumpad } from '@/context/VirtualNumpadContext';

/**
 * 💎 POS TITLE ACTION BAR - WITH APPS MENU
 * 
 * Features:
 * - Unified Mode Switcher
 * - Apps Launcher (Calculator, Expenses, etc.)
 * - Session Controls
 */
const POSTitleBarActions: React.FC = () => {
  const { currentStaff, isAdminMode } = useStaffSession();
  const { activeSession, hasActiveSession, pauseSession, resumeSession } = useWorkSession();
  const { mode, setMode } = usePOSMode();
  const { toggleNumpad } = useVirtualNumpad();
  const { openCalculator, openQuickExpense, openSettings, openCustomers, triggerRefresh } = usePOSActions();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const { toast } = useToast();

  const handlePause = async () => {
    try {
      await pauseSession();
      toast({ title: '⏸️ تم إيقاف الجلسة مؤقتاً' });
    } catch (error) {
      toast({ title: '❌ خطأ', variant: 'destructive' });
    }
  };

  const handleResume = async () => {
    try {
      await resumeSession();
      toast({ title: '▶️ تم استئناف الجلسة' });
    } catch (error) {
      toast({ title: '❌ خطأ', variant: 'destructive' });
    }
  };

  const handleChangeMode = (newMode: 'sales' | 'return' | 'loss') => {
    setMode(newMode);

    const messages = {
      sales: { title: "✅ وضع البيع", desc: "العودة إلى نظام البيع الافتراضي" },
      return: { title: "🔄 وضع الإرجاع", desc: "تسجيل المرتجعات واسترداد الأموال" },
      loss: { title: "⚠️ وضع الخسائر", desc: "تسجيل المنتجات التالفة أو الخسائر" }
    };

    toast({
      title: messages[newMode].title,
      description: messages[newMode].desc,
      variant: newMode === 'sales' ? 'default' : (newMode === 'loss' ? 'destructive' : 'default')
    });
  };

  if (isAdminMode) {
    return (
      <div className="flex justify-center w-full h-full items-center">
        <div className="flex items-center gap-0.5 sm:gap-1 bg-white/5 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 h-6 sm:h-7 rounded-md sm:rounded-lg bg-blue-500/10 text-blue-400">
            <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="text-[10px] sm:text-xs font-medium">وضع المدير</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStaff) return null;

  // Active Mode Configuration
  const modeConfig = {
    sales: {
      icon: Store,
      label: 'بيع',
      color: 'text-white',
      bg: 'bg-white/10',
      ring: 'ring-white/10'
    },
    return: {
      icon: RefreshCcw,
      label: 'إرجاع',
      color: 'text-orange-500',
      bg: 'bg-orange-500/20',
      ring: 'ring-orange-500/30'
    },
    loss: {
      icon: ShieldAlert,
      label: 'خسائر',
      color: 'text-red-500',
      bg: 'bg-red-500/20',
      ring: 'ring-red-500/30'
    }
  };

  const ActiveIcon = modeConfig[mode].icon;

  return (
    <div className="flex justify-center w-full h-full items-center relative z-50">

      {/* 🟢 Unified Glass Container */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-white/5 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/5 backdrop-blur-sm">

        {/* === SECTION 0: POS APPS MENU === */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-md sm:rounded-lg transition-all duration-200 hover:bg-white/10 text-slate-300 hover:text-white outline-none active:scale-95"
              title="تطبيقات نقطة البيع"
            >
              <Grid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56 bg-[#050b15] backdrop-blur-xl border-white/10 text-white p-2">
            <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-2 mb-1">تطبيقات سريعة</DropdownMenuLabel>

            <div className="grid grid-cols-2 gap-1 mb-2">
              <DropdownMenuItem onClick={openCustomers} className="cursor-pointer flex-col items-center justify-center h-16 gap-1 bg-white/5 hover:bg-white/10 rounded-xl focus:bg-white/10">
                <Users className="h-5 w-5 text-blue-400" />
                <span className="text-[10px] font-medium">الزبائن</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openCalculator} className="cursor-pointer flex-col items-center justify-center h-16 gap-1 bg-white/5 hover:bg-white/10 rounded-xl focus:bg-white/10">
                <Calculator className="h-5 w-5 text-emerald-400" />
                <span className="text-[10px] font-medium">حاسبة</span>
              </DropdownMenuItem>
            </div>

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={openQuickExpense} className="cursor-pointer h-9 gap-2 focus:bg-white/5">
                <Receipt className="h-4 w-4 text-rose-400" />
                <span>مصروف</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={triggerRefresh} className="cursor-pointer h-9 gap-2 focus:bg-white/5">
                <RotateCw className="h-4 w-4 text-amber-400" />
                <span>تحديث البيانات</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={openSettings} className="cursor-pointer h-9 gap-2 focus:bg-white/5">
                <Settings className="h-4 w-4 text-slate-400" />
                <span>إعدادات</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuLabel className="text-[10px] text-slate-500 font-normal px-2">قريباً</DropdownMenuLabel>

            <div className="space-y-0.5 opacity-60">
              <div className="flex items-center px-2 py-1.5 gap-2 text-sm text-slate-400 cursor-not-allowed">
                <Truck className="h-4 w-4" />
                <span>توصيل</span>
                <span className="mr-auto text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-slate-500">قريباً</span>
              </div>
              <div className="flex items-center px-2 py-1.5 gap-2 text-sm text-slate-400 cursor-not-allowed">
                <CreditCard className="h-4 w-4" />
                <span>ديون</span>
                <span className="mr-auto text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-slate-500">قريباً</span>
              </div>
              <div className="flex items-center px-2 py-1.5 gap-2 text-sm text-slate-400 cursor-not-allowed">
                <CalendarDays className="h-4 w-4" />
                <span>حجوزات</span>
                <span className="mr-auto text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-slate-500">قريباً</span>
              </div>
            </div>

          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-3 sm:h-4 w-px bg-white/10 mx-0.5 sm:mx-1" />

        {/* === SECTION 1: UNIFIED MODE SWITCHER === */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1 sm:gap-2 h-6 sm:h-7 px-1.5 sm:px-2.5 rounded-md sm:rounded-lg transition-all duration-200 outline-none active:scale-95 group border border-transparent hover:border-white/5",
                modeConfig[mode].bg,
                modeConfig[mode].color
              )}
            >
              <ActiveIcon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", mode === 'return' && "animate-spin-slow")} />
              <span className="text-[10px] sm:text-xs font-bold">{modeConfig[mode].label}</span>
              <ChevronDown className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-70", modeConfig[mode].color)} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-48 bg-[#050b15] backdrop-blur-xl border-white/10 text-white p-2">
            <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-2">اختر وضع النظام</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => handleChangeMode('sales')} className="cursor-pointer h-9 gap-2 focus:bg-white/10">
              <Store className="h-4 w-4 text-slate-300" />
              <span>وضع البيع</span>
              {mode === 'sales' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-300" />}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleChangeMode('return')} className="cursor-pointer h-9 gap-2 focus:bg-orange-500/10 focus:text-orange-400 text-orange-500">
              <RefreshCcw className="h-4 w-4" />
              <span>وضع الإرجاع</span>
              {mode === 'return' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleChangeMode('loss')} className="cursor-pointer h-9 gap-2 focus:bg-red-500/10 focus:text-red-400 text-red-500">
              <ShieldAlert className="h-4 w-4" />
              <span>وضع الخسائر</span>
              {mode === 'loss' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>


        {/* === DIVIDER === */}
        <div className="h-3 sm:h-4 w-px bg-white/10 mx-0.5 sm:mx-1" />


        {/* === SECTION 2: SESSION CONTROLS === */}
        {hasActiveSession && activeSession ? (
          <div className="flex items-center gap-0.5 sm:gap-1">

            {/* Session Status Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1 sm:gap-2 h-6 sm:h-7 px-1.5 sm:px-2 rounded-md sm:rounded-lg transition-all duration-200 hover:bg-white/5 outline-none group border border-transparent hover:border-white/5",
                  activeSession.status === 'active' ? "text-emerald-400" : "text-amber-400"
                )}>
                  <div className="relative flex items-center justify-center w-1 h-1 sm:w-1.5 sm:h-1.5">
                    <span className={cn(
                      "absolute w-full h-full rounded-full animate-ping opacity-75",
                      activeSession.status === 'active' ? "bg-emerald-500" : "bg-amber-500"
                    )}></span>
                    <span className={cn(
                      "relative w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full",
                      activeSession.status === 'active' ? "bg-emerald-500" : "bg-amber-500"
                    )}></span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                    {activeSession.status === 'active' ? 'نشطة' : 'متوقفة'}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-500 group-hover:text-white transition-colors" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="center" className="w-64 bg-[#050b15] backdrop-blur-xl border-white/10 text-white p-2">
                <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-2">إدارة الوردية</DropdownMenuLabel>
                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">صندوق البداية</span>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-bold text-white">{activeSession.opening_cash}</span>
                      <span className="text-[9px] text-emerald-500">DA</span>
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">العمليات</span>
                    <span className="text-sm font-bold text-blue-400">{activeSession.total_orders}</span>
                  </div>
                </div>

                <DropdownMenuSeparator className="bg-white/10 my-1" />

                {activeSession.status === 'active' ? (
                  <DropdownMenuItem onClick={handlePause} className="cursor-pointer text-amber-500 focus:text-amber-400 focus:bg-amber-500/10 rounded-md">
                    <Pause className="h-3.5 w-3.5 mr-2" /> إيقاف مؤقت
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleResume} className="cursor-pointer text-emerald-500 focus:text-emerald-400 focus:bg-emerald-500/10 rounded-md">
                    <Play className="h-3.5 w-3.5 mr-2" /> استئناف
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowCloseDialog(true)} className="cursor-pointer text-red-500 focus:text-red-400 focus:bg-red-500/10 rounded-md mt-1">
                  <StopCircle className="h-3.5 w-3.5 mr-2" /> إغلاق الوردية
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-3 sm:h-4 w-px bg-white/10 mx-0.5 sm:mx-1" />

            {/* Opening Cash Display */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center h-6 sm:h-7 px-1.5 sm:px-2 rounded-md sm:rounded-lg cursor-help hover:bg-white/5 transition-colors gap-1">
                    <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline-block">صندوق</span>
                    <span className="text-[10px] sm:text-xs font-bold text-white tabular-nums">{activeSession.opening_cash}</span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-emerald-500">DA</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 border-slate-700 text-xs text-white">رصيد الافتتاح</TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </div>
        ) : (
          <div className="flex items-center px-0.5 sm:px-1">
            <Button
              onClick={() => setShowStartDialog(true)}
              variant="ghost"
              size="sm"
              className="h-6 sm:h-7 rounded-md sm:rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 gap-1 sm:gap-2 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
            >
              <PlayCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>فتح وردية</span>
            </Button>
          </div>
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
    </div>
  );
};

export default POSTitleBarActions;
