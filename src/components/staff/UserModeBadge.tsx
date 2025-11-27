/**
 * UserModeBadge - شارة عرض المستخدم/الموظف الحالي
 * 
 * يعرض معلومات المستخدم أو الموظف بشكل أنيق مع إمكانية التبديل السريع
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Shield, 
  Users, 
  ChevronDown, 
  LogOut, 
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserModeBadgeProps {
  className?: string;
  compact?: boolean;
  showDropdown?: boolean;
}

export const UserModeBadge: React.FC<UserModeBadgeProps> = ({
  className,
  compact = false,
  showDropdown = true,
}) => {
  const navigate = useNavigate();
  const { currentStaff, isAdminMode, clearSession, sessionDuration } = useStaffSession();
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // تحديد المستخدم الحالي
  const isStaffMode = !isAdminMode && !!currentStaff;
  const displayName = isStaffMode 
    ? currentStaff?.staff_name 
    : userProfile?.name || userProfile?.email?.split('@')[0] || 'مستخدم';
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}س ${mins}د`;
    }
    return `${mins} دقيقة`;
  };

  const handleSwitchUser = () => {
    navigate('/staff-login');
    setIsOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/staff-login');
    setIsOpen(false);
  };

  const badgeContent = (
    <motion.div
      className={cn(
        'flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl cursor-pointer',
        'bg-gradient-to-r transition-all duration-300',
        isAdminMode 
          ? 'from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40' 
          : isStaffMode
            ? 'from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40'
            : 'from-slate-500/10 to-slate-600/10 border border-slate-500/20 hover:border-slate-500/40',
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className={cn(
          'h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-offset-2 ring-offset-background transition-all',
          isAdminMode 
            ? 'ring-amber-500/50' 
            : isStaffMode 
              ? 'ring-blue-500/50' 
              : 'ring-slate-500/50'
        )}>
          <AvatarFallback className={cn(
            'text-xs sm:text-sm font-bold',
            isAdminMode 
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' 
              : isStaffMode 
                ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white' 
                : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
          )}>
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        {/* مؤشر الحالة */}
        <motion.div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
            isAdminMode 
              ? 'bg-amber-500' 
              : isStaffMode 
                ? 'bg-blue-500' 
                : 'bg-green-500'
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>

      {!compact && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate max-w-[100px] sm:max-w-[120px]">
              {displayName}
            </span>
            {isAdminMode && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] border-amber-500/50 text-amber-500 bg-amber-500/10">
                <Shield className="h-2.5 w-2.5 ml-0.5" />
                مدير
              </Badge>
            )}
          </div>
          
          {isStaffMode && sessionDuration > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
          )}
        </div>
      )}

      {showDropdown && (
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      )}
    </motion.div>
  );

  if (!showDropdown) {
    return badgeContent;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {badgeContent}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 p-2"
      >
        <DropdownMenuLabel className="flex items-center gap-2 pb-2">
          <div className={cn(
            'p-1.5 rounded-lg',
            isAdminMode 
              ? 'bg-amber-500/10 text-amber-500' 
              : isStaffMode 
                ? 'bg-blue-500/10 text-blue-500' 
                : 'bg-slate-500/10 text-slate-500'
          )}>
            {isAdminMode ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">{displayName}</span>
            <span className="text-xs text-muted-foreground font-normal">
              {isAdminMode ? 'وضع المدير' : isStaffMode ? 'موظف' : 'مستخدم'}
            </span>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSwitchUser}
          className="gap-2 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>تبديل المستخدم</span>
        </DropdownMenuItem>
        
        {(isStaffMode || isAdminMode) && (
          <DropdownMenuItem 
            onClick={handleLogout}
            className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserModeBadge;
