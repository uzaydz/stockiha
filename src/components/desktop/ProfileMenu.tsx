import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, Shield, Bell, Lock, Palette, HelpCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';

const ProfileMenu: React.FC = () => {
  const { user, userProfile, signOut } = useAuth();
  const { currentStaff, isAdminMode, clearSession } = useStaffSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
    <div className="relative" ref={menuRef}>
      {/* زر البروفايل */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 h-8 pl-1 pr-2 rounded-lg transition-all duration-200 active:scale-95",
          "hover:bg-white/10 active:bg-white/15",
          isOpen && "bg-white/15 text-white"
        )}
        aria-label="قائمة البروفايل"
      >
        {/* صورة البروفايل أو الحرف الأول */}
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold shadow-sm ring-1 ring-white/10">
          {getInitial()}
        </div>

        {/* اسم المستخدم (مخفي في الشاشات الصغيرة) */}
        <span className="hidden lg:block text-xs font-medium text-white/90 max-w-[100px] truncate">
          {displayName.split(' ')[0]}
        </span>

        {/* سهم للأسفل */}
        <ChevronDown className={cn(
          "h-3 w-3 text-white/50 transition-transform duration-200",
          isOpen && "rotate-180 text-white"
        )} />
      </button>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-white/10 overflow-hidden z-[9999]"
          style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as any}
        >
          {/* معلومات المستخدم */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-bold shadow-md">
                {getInitial()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {userProfile?.role === 'admin' ? (
                    <Shield className="h-3 w-3 text-yellow-400" />
                  ) : (
                    <User className="h-3 w-3 text-blue-400" />
                  )}
                  <p className="text-xs text-white/60">{userRole}</p>
                </div>
              </div>
            </div>
          </div>

          {/* قائمة الإعدادات */}
          <div className="py-2">
            {/* الإعدادات العامة - للمديرين فقط */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard/settings')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors duration-150"
              >
                <Settings className="h-4 w-4" />
                <span>الإعدادات</span>
              </button>
            )}

            {/* إعدادات الحساب - للجميع */}
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard/profile')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors duration-150"
            >
              <User className="h-4 w-4" />
              <span>الملف الشخصي</span>
            </button>

            {/* الإشعارات - للمديرين فقط */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard/notifications')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors duration-150"
              >
                <Bell className="h-4 w-4" />
                <span>الإشعارات</span>
              </button>
            )}

            {/* الأمان - للمديرين فقط */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard/security')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors duration-150"
              >
                <Lock className="h-4 w-4" />
                <span>الأمان والخصوصية</span>
              </button>
            )}

            {/* المظهر - للجميع */}
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard/appearance')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors duration-150"
            >
              <Palette className="h-4 w-4" />
              <span>المظهر</span>
            </button>

            {/* المساعدة - للجميع */}
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard/help')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors duration-150"
            >
              <HelpCircle className="h-4 w-4" />
              <span>المساعدة والدعم</span>
            </button>
          </div>

          {/* تسجيل الخروج */}
          <div className="border-t border-white/10 py-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
