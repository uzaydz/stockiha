import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Minus, Square, X as CloseIcon, ChevronLeft, ChevronRight, Home, RefreshCw, Sun, Moon, LogOut, Shield, User, Calculator } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTitlebar } from '@/context/TitlebarContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useVirtualNumpad } from '@/context/VirtualNumpadContext';
import { cn } from '@/lib/utils';
import { NavbarSyncIndicator } from '@/components/navbar/NavbarSyncIndicator';
import POSTitleBarActions from '@/components/pos/POSTitleBarActions';
import ProfileMenu from './ProfileMenu';

type Platform = 'darwin' | 'win32' | 'linux' | 'web';

const TITLEBAR_HEIGHT = 48;

const DesktopTitlebar: React.FC = () => {
  const { tabs, activeTabId, showTabs, actions } = useTitlebar();
  const { theme, fastThemeController } = useTheme();
  const { currentStaff, isAdminMode, clearSession } = useStaffSession();
  const { isEnabled, toggleNumpad } = useVirtualNumpad();
  const navigate = useNavigate();
  const location = useLocation();
  const [platform, setPlatform] = useState<Platform>('web');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.platform) {
      setPlatform((window as any).electronAPI.platform as Platform);
    }
  }, []);

  const isElectron = useMemo(
    () => typeof window !== 'undefined' && Boolean((window as any).electronAPI),
    []
  );

  const handleMinimize = useCallback(() => {
    (window as any).electronAPI?.minimizeWindow?.();
  }, []);

  const handleMaximize = useCallback(() => {
    (window as any).electronAPI?.maximizeWindow?.();
  }, []);

  const handleClose = useCallback(() => {
    (window as any).electronAPI?.closeWindow?.();
  }, []);

  const appTitle = useMemo(() => 'سطوكيها - منصة إدارة المتاجر', []);

  // تتبع حالة التنقل
  useEffect(() => {
    // التحقق من إمكانية الرجوع والتقدم
    setCanGoBack(window.history.length > 1);
    setCanGoForward(false); // React Router لا يوفر طريقة مباشرة للتحقق من Forward
  }, [location]);

  const handleGoBack = useCallback(() => {
    if (canGoBack) {
      navigate(-1);
    }
  }, [navigate, canGoBack]);

  const handleGoForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleStaffLogout = useCallback(() => {
    clearSession();
    navigate('/staff-login');
  }, [clearSession, navigate]);

  // اسم العرض للموظف أو الأدمن
  const staffDisplayName = useMemo(() => {
    if (isAdminMode) return 'مدير';
    if (currentStaff) return currentStaff.staff_name;
    return null;
  }, [isAdminMode, currentStaff]);

  // التحقق من أننا في صفحة POS
  const isInPOS = useMemo(() => {
    return location.pathname.includes('/pos-') || 
           location.pathname.includes('/pos/') ||
           location.pathname.includes('/pos-advanced') ||
           location.pathname.includes('/pos-dashboard');
  }, [location.pathname]);

  return (
    <div
      className="desktop-titlebar fixed inset-x-0 top-0 z-[1000] flex h-[var(--titlebar-height,48px)] items-center justify-between bg-slate-900/95 text-white backdrop-blur-md"
      style={{ WebkitAppRegion: 'drag', height: `var(--titlebar-height, ${TITLEBAR_HEIGHT}px)` } as any}
    >
      {/* أزرار التنقل والأدوات */}
      <div 
        className="flex items-center gap-2 px-3"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* مجموعة أزرار التنقل - تصميم محسّن */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            type="button"
            onClick={handleGoBack}
            disabled={!canGoBack}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md transition-all duration-200",
              canGoBack
                ? "hover:bg-white/15 text-white/90 hover:text-white active:scale-95"
                : "text-white/30 cursor-not-allowed opacity-50"
            )}
            aria-label="الرجوع"
            title="الرجوع"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleGoForward}
            className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-white/15 text-white/90 hover:text-white active:scale-95 transition-all duration-200"
            aria-label="التقدم"
            title="التقدم"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={handleGoHome}
            className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-white/15 text-white/90 hover:text-white active:scale-95 transition-all duration-200"
            aria-label="الصفحة الرئيسية"
            title="الصفحة الرئيسية"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
        
        {/* مجموعة أزرار الأدوات - تصميم محسّن */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {/* أيقونة المزامنة */}
          <NavbarSyncIndicator />
          
          {/* أزرار الـ actions من TitlebarContext */}
          {actions && actions.length > 0 && (
            <>
              <div className="h-4 w-px bg-white/15" />
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-md transition-all duration-200",
                    action.disabled
                      ? "text-white/30 cursor-not-allowed opacity-50"
                      : "hover:bg-white/15 text-white/90 hover:text-white active:scale-95"
                  )}
                  aria-label={action.label}
                  title={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </>
          )}
          
          {/* معلومات وزر تسجيل خروج الموظف */}
          {staffDisplayName && (
            <>
              <div className="h-4 w-px bg-white/15" />
              <div className="flex items-center gap-1 px-2">
                <div className="flex items-center gap-1.5 text-xs text-white/80">
                  {isAdminMode ? (
                    <Shield className="h-3.5 w-3.5 text-yellow-400" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className="font-medium">{staffDisplayName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleStaffLogout}
                  className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 active:scale-95 transition-all duration-200"
                  aria-label="تسجيل خروج الموظف"
                  title="تسجيل خروج الموظف"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
          
          {/* زر لوحة الأرقام الافتراضية */}
          <div className="h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={toggleNumpad}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md transition-all duration-200 active:scale-95",
              isEnabled
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300"
                : "hover:bg-white/15 text-white/90 hover:text-white"
            )}
            aria-label="لوحة الأرقام الافتراضية"
            title={isEnabled ? "تعطيل لوحة الأرقام" : "تفعيل لوحة الأرقام"}
          >
            <Calculator className="h-4 w-4" />
          </button>
          
          {/* زر تبديل الثيم */}
          <div className="h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={fastThemeController.toggleFast}
            className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-white/15 text-white/90 hover:text-white active:scale-95 transition-all duration-200"
            aria-label="تبديل الثيم"
            title="تبديل الثيم"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          
          {/* زر البروفايل */}
          <div className="h-4 w-px bg-white/15" />
          <ProfileMenu />
        </div>
      </div>

      {showTabs && tabs.length > 0 && (
        <div
          className="flex-1 flex items-center justify-center px-6 overflow-hidden"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div
            className="flex h-9 items-center gap-1 rounded-full bg-slate-800/95 px-2 py-1 shadow-inner border border-white/10 transition-colors"
            style={{ pointerEvents: 'none', WebkitAppRegion: 'drag' } as any}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onSelect}
                className={cn(
                  'relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                  tab.id === activeTabId
                    ? 'bg-slate-100 text-slate-900 shadow-md'
                    : 'text-slate-200 hover:bg-slate-700/80 hover:text-white'
                )}
                style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as any}
              >
                {tab.icon && <span className="inline-flex h-4 w-4 items-center justify-center">{tab.icon}</span>}
                <span className="whitespace-nowrap">{tab.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* عند عدم وجود تبويبات: عرض عنوان التطبيق أو أزرار POS في المنتصف */}
      {!showTabs && (!tabs || tabs.length === 0) && (
        <div
          className="flex-1 flex items-center justify-center px-6 overflow-hidden"
          style={{ WebkitAppRegion: isInPOS ? 'no-drag' : 'drag' } as any}
        >
          {isInPOS ? (
            // في صفحات POS: عرض أزرار الجلسة
            <POSTitleBarActions />
          ) : (
            // في باقي الصفحات: عرض العنوان
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white/90 tracking-wide select-none">
                سطوكيها - منصة المتاجر الإلكترونية
              </h1>
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          'flex items-center gap-1',
          platform === 'darwin' ? 'px-3' : 'px-0'
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* تمت إزالة الأزرار من الجهة اليمنى لإبقائها في المنتصف */}
        {isElectron ? (
          platform === 'darwin' ? (
            <div className="px-1 text-[11px] text-slate-300 select-none">
              {/* rely on native traffic lights; provide subtle title */}
            </div>
          ) : (
            <div className="flex h-full items-center">
              <button
                type="button"
                aria-label="تصغير النافذة"
                onClick={handleMinimize}
                className="titlebar-button"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="تكبير النافذة"
                onClick={handleMaximize}
                className="titlebar-button"
              >
                <Square className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="إغلاق النافذة"
                onClick={handleClose}
                className="titlebar-button titlebar-button--close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          )
        ) : (
          <div className="px-4 text-xs text-slate-400 select-none">نسخة المتصفح</div>
        )}
      </div>
    </div>
  );
};

export default DesktopTitlebar;
