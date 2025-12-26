import React, { useState } from 'react';
import { User, Settings, LogOut, Shield, Bell, Lock, Palette, HelpCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ProfileMenu: React.FC = () => {
  const { user, userProfile, signOut } = useAuth();
  const { currentStaff, isAdminMode, clearSession } = useStaffSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    // إذا كان موظف مسجل، نسجل خروج الموظف فقط
    if (currentStaff || isAdminMode) {
      clearSession();
      navigate('/staff-login');
    } else {
      // إذا كان مستخدم عادي، نسجل خروج كامل
      await signOut();
      navigate('/login');
    }
    setIsOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  // الحصول على الحرف الأول من الاسم
  const getInitial = () => {
    // إذا كان موظف مسجل، نعرض الحرف الأول من اسمه
    if (currentStaff?.staff_name) {
      return currentStaff.staff_name.charAt(0).toUpperCase();
    }
    // إذا كان في وضع المدير
    if (isAdminMode) {
      return 'م'; // مدير
    }
    // المستخدم العادي
    if (userProfile?.full_name) {
      return userProfile.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // تحديد الاسم والدور بناءً على من هو مسجل الدخول
  const displayName = currentStaff?.staff_name || (isAdminMode ? 'مدير' : userProfile?.full_name || user?.email || 'مستخدم');
  const userRole = isAdminMode ? 'مدير' : (currentStaff ? 'موظف' : (userProfile?.role === 'admin' ? 'مدير' : userProfile?.role === 'employee' ? 'موظف' : 'مستخدم'));
  const isAdmin = isAdminMode || userProfile?.role === 'admin';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 sm:gap-2 rounded-lg transition-all duration-200 active:scale-95",
            "h-7 sm:h-8 pl-0.5 sm:pl-1 pr-1.5 sm:pr-2",
            "hover:bg-white/10 active:bg-white/15",
            isOpen && "bg-white/15 text-white"
          )}
          aria-label="قائمة البروفايل"
        >
          <div className="flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-[10px] sm:text-xs font-bold shadow-sm ring-1 ring-white/10">
            {getInitial()}
          </div>

          <span className="hidden lg:block text-xs font-medium text-white/90 max-w-[100px] truncate">
            {displayName.split(' ')[0]}
          </span>

          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/50 transition-transform duration-200",
              isOpen && "rotate-180 text-white"
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-56 sm:w-64 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl p-0 text-white z-[9999]"
        style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as any}
      >
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-bold shadow-md">
              {getInitial()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isAdmin ? (
                  <Shield className="h-3 w-3 text-yellow-400" />
                ) : (
                  <User className="h-3 w-3 text-blue-400" />
                )}
                <p className="text-xs text-white/60">{userRole}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-2">
          {isAdmin && (
            <DropdownMenuItem
              onSelect={() => handleNavigate('/dashboard/settings')}
              className="gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white focus:text-white focus:bg-white/10"
            >
              <Settings className="h-4 w-4" />
              <span>الإعدادات</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onSelect={() => handleNavigate('/dashboard/profile')}
            className="gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white focus:text-white focus:bg-white/10"
          >
            <User className="h-4 w-4" />
            <span>الملف الشخصي</span>
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem
              onSelect={() => handleNavigate('/dashboard/notifications')}
              className="gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white focus:text-white focus:bg-white/10"
            >
              <Bell className="h-4 w-4" />
              <span>الإشعارات</span>
            </DropdownMenuItem>
          )}

          {isAdmin && (
            <DropdownMenuItem
              onSelect={() => handleNavigate('/dashboard/security')}
              className="gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white focus:text-white focus:bg-white/10"
            >
              <Lock className="h-4 w-4" />
              <span>الأمان والخصوصية</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onSelect={() => handleNavigate('/dashboard/appearance')}
            className="gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white focus:text-white focus:bg-white/10"
          >
            <Palette className="h-4 w-4" />
            <span>المظهر</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => handleNavigate('/dashboard/help')}
            className="gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white focus:text-white focus:bg-white/10"
          >
            <HelpCircle className="h-4 w-4" />
            <span>المساعدة والدعم</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          onSelect={handleLogout}
          className="gap-3 px-4 py-2.5 text-sm text-red-400 focus:text-red-300 focus:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
