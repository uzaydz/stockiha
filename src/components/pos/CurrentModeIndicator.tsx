/**
 * CurrentModeIndicator - مؤشر الوضع الحالي
 * 
 * يعرض معلومات عن الموظف/المدير الحالي ووقت الجلسة
 * يمكن استخدامه في Header أو Sidebar
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Shield, UserCircle, Clock, LogOut, Users } from 'lucide-react';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface CurrentModeIndicatorProps {
  /** عرض مختصر (للشاشات الصغيرة) */
  compact?: boolean;
  /** إظهار وقت الجلسة */
  showSessionTime?: boolean;
  /** CSS classes إضافية */
  className?: string;
  /** عرض القائمة المنسدلة */
  showDropdown?: boolean;
}

const CurrentModeIndicator: React.FC<CurrentModeIndicatorProps> = ({
  compact = false,
  showSessionTime = true,
  className,
  showDropdown = true,
}) => {
  const { currentStaff, isAdminMode, clearSession, sessionDuration } = useStaffSession();
  const { displayName, isStaffMode } = useUnifiedPermissions();

  // تنسيق وقت الجلسة
  const formattedDuration = useMemo(() => {
    if (sessionDuration < 60) {
      return `${sessionDuration} دقيقة`;
    }
    const hours = Math.floor(sessionDuration / 60);
    const mins = sessionDuration % 60;
    return `${hours} س ${mins} د`;
  }, [sessionDuration]);

  // لون المؤشر حسب الوضع
  const indicatorColor = useMemo(() => {
    if (isAdminMode) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (isStaffMode) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }, [isAdminMode, isStaffMode]);

  // أيقونة الوضع
  const ModeIcon = isAdminMode ? Shield : UserCircle;
  const modeLabel = isAdminMode ? 'وضع المدير' : isStaffMode ? 'موظف' : 'مستخدم';

  // إذا لم يكن هناك جلسة، لا تعرض شيء
  if (!currentStaff && !isAdminMode) {
    return null;
  }

  const handleSwitchUser = () => {
    clearSession();
    toast.success('تم تسجيل الخروج');
    window.location.href = '/staff-login';
  };

  const content = (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
        indicatorColor,
        className
      )}
    >
      <ModeIcon className="h-4 w-4" />
      
      {!compact && (
        <>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate max-w-[120px]">
              {displayName}
            </span>
            <span className="text-[10px] opacity-70">
              {modeLabel}
            </span>
          </div>

          {showSessionTime && sessionDuration > 0 && (
            <div className="flex items-center gap-1 text-[10px] opacity-70 mr-2">
              <Clock className="h-3 w-3" />
              <span>{formattedDuration}</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (!showDropdown) {
    return content;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          {content}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-right">
          <div className="flex flex-col">
            <span className="font-semibold">{displayName}</span>
            <span className="text-xs text-muted-foreground">{modeLabel}</span>
          </div>
        </DropdownMenuLabel>
        
        {showSessionTime && sessionDuration > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground text-right">
              <div className="flex items-center justify-end gap-1">
                <span>مدة الجلسة:</span>
                <Clock className="h-3 w-3" />
                <span className="font-medium">{formattedDuration}</span>
              </div>
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleSwitchUser}
          className="text-right cursor-pointer"
        >
          <Users className="h-4 w-4 ml-2" />
          <span>تبديل الموظف</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => {
            clearSession();
            toast.success('تم تسجيل الخروج');
          }}
          className="text-right cursor-pointer text-red-500 focus:text-red-500"
        >
          <LogOut className="h-4 w-4 ml-2" />
          <span>إنهاء الجلسة</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CurrentModeIndicator;

/**
 * مكون مصغر للعرض في الأماكن الضيقة
 */
export const CurrentModeBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { isAdminMode, currentStaff } = useStaffSession();

  if (!currentStaff && !isAdminMode) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        isAdminMode
          ? 'bg-orange-500/20 text-orange-400'
          : 'bg-blue-500/20 text-blue-400',
        className
      )}
    >
      {isAdminMode ? (
        <>
          <Shield className="h-3 w-3" />
          <span>مدير</span>
        </>
      ) : (
        <>
          <UserCircle className="h-3 w-3" />
          <span>{currentStaff?.staff_name?.split(' ')[0] || 'موظف'}</span>
        </>
      )}
    </div>
  );
};
