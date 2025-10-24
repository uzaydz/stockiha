import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Minus, Square, X as CloseIcon, ChevronLeft, ChevronRight, Home, Sun, Moon, LogOut, Shield, User, Calculator, MoreHorizontal } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTitlebar } from '@/context/TitlebarContext';
import { useTheme } from '@/context/ThemeContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useVirtualNumpad } from '@/context/VirtualNumpadContext';
import { cn } from '@/lib/utils';
import { NavbarSyncIndicator } from '@/components/navbar/NavbarSyncIndicator';
import POSTitleBarActions from '@/components/pos/POSTitleBarActions';
import ProfileMenu from './ProfileMenu';
import UpdateButton from './UpdateButton';

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
  const [showMoreTools, setShowMoreTools] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const moreToolsRef = useRef<HTMLDivElement>(null);

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

  // تتبع حالة التنقل
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
    setCanGoForward(false);
  }, [location]);

  // إغلاق قائمة المزيد عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreToolsRef.current && !moreToolsRef.current.contains(event.target as Node)) {
        setShowMoreTools(false);
      }
    };

    if (showMoreTools) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreTools]);

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
      className="desktop-titlebar fixed inset-x-0 top-0 z-[1000] flex h-[var(--titlebar-height,48px)] items-center bg-gradient-to-r from-slate-900/98 via-slate-900/96 to-slate-900/98 text-white backdrop-blur-xl border-b border-white/5 shadow-lg"
      style={{ WebkitAppRegion: 'drag', height: `var(--titlebar-height, ${TITLEBAR_HEIGHT}px)` } as any}
    >
      {/* القسم الأيسر: أزرار التنقل والأدوات */}
      <div 
        className="flex items-center gap-1.5 px-2 sm:px-3 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* مجموعة أزرار التنقل */}
        <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/10 backdrop-blur-sm">
          <button
            type="button"
            onClick={handleGoBack}
            disabled={!canGoBack}
            className={cn(
              "flex items-center justify-center h-6 w-6 lg:h-7 lg:w-7 rounded-md transition-all duration-200",
              canGoBack
                ? "hover:bg-white/15 text-white/90 hover:text-white active:scale-95"
                : "text-white/30 cursor-not-allowed opacity-50"
            )}
            aria-label="الرجوع"
            title="الرجوع"
          >
            <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
          <button
            type="button"
            onClick={handleGoForward}
            className="hidden sm:flex items-center justify-center h-6 w-6 lg:h-7 lg:w-7 rounded-md hover:bg-white/15 text-white/90 hover:text-white active:scale-95 transition-all duration-200"
            aria-label="التقدم"
            title="التقدم"
          >
            <ChevronLeft className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
          <div className="hidden sm:block h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={handleGoHome}
            className="flex items-center justify-center h-6 w-6 lg:h-7 lg:w-7 rounded-md hover:bg-white/15 text-white/90 hover:text-white active:scale-95 transition-all duration-200"
            aria-label="الصفحة الرئيسية"
            title="الصفحة الرئيسية"
          >
            <Home className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
        </div>
        
        {/* مجموعة الأدوات */}
        <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/10 backdrop-blur-sm">
          {/* المزامنة - دائماً ظاهرة */}
          <div className="flex items-center">
            <NavbarSyncIndicator />
          </div>
          
          {/* أزرار Actions - مخفية في الشاشات الصغيرة */}
          {actions && actions.length > 0 && (
            <>
              <div className="hidden md:block h-4 w-px bg-white/15" />
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    "hidden md:flex items-center justify-center h-6 w-6 lg:h-7 lg:w-7 rounded-md transition-all duration-200",
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
          
          {/* معلومات الموظف */}
          {staffDisplayName && (
            <>
              <div className="h-4 w-px bg-white/15" />
              <div className="flex items-center gap-0.5 px-1 lg:px-2">
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/80">
                  {isAdminMode ? (
                    <Shield className="h-3.5 w-3.5 text-yellow-400" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className="font-medium truncate max-w-[80px]">{staffDisplayName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleStaffLogout}
                  className="flex items-center justify-center h-6 w-6 lg:h-7 lg:w-7 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 active:scale-95 transition-all duration-200"
                  aria-label="تسجيل خروج الموظف"
                  title="تسجيل خروج الموظف"
                >
                  <LogOut className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                </button>
              </div>
            </>
          )}
          
          {/* التحديثات - Electron فقط */}
          {isElectron && (
            <>
              <div className="h-4 w-px bg-white/15" />
              <UpdateButton />
            </>
          )}
          
          {/* الثيم - دائماً ظاهر */}
          <div className="h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={fastThemeController.toggleFast}
            className="flex items-center justify-center h-6 w-6 lg:h-7 lg:w-7 rounded-md hover:bg-white/15 text-white/90 hover:text-white active:scale-95 transition-all duration-200"
            aria-label="تبديل الثيم"
            title="تبديل الثيم"
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            ) : (
              <Moon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            )}
          </button>
          
          {/* البروفايل - دائماً ظاهر */}
          <div className="h-4 w-px bg-white/15" />
          <ProfileMenu />
          
          {/* زر المزيد للشاشات الصغيرة/المتوسطة */}
          <div className="relative lg:hidden" ref={moreToolsRef}>
            <div className="h-4 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => setShowMoreTools(!showMoreTools)}
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-md transition-all duration-200 active:scale-95",
                showMoreTools
                  ? "bg-white/15 text-white"
                  : "hover:bg-white/15 text-white/90 hover:text-white"
              )}
              aria-label="المزيد من الأدوات"
              title="المزيد"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            
            {/* قائمة منسدلة للأدوات الإضافية */}
            {showMoreTools && (
              <div 
                className="absolute left-0 mt-2 w-48 bg-slate-800/98 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      toggleNumpad();
                      setShowMoreTools(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>{isEnabled ? 'تعطيل' : 'تفعيل'} لوحة الأرقام</span>
                    {isEnabled && <span className="mr-auto text-blue-400 text-xs">✓</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* لوحة الأرقام - ظاهر فقط في الشاشات الكبيرة */}
          <div className="hidden lg:block h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={toggleNumpad}
            className={cn(
              "hidden lg:flex items-center justify-center h-7 w-7 rounded-md transition-all duration-200 active:scale-95",
              isEnabled
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300"
                : "hover:bg-white/15 text-white/90 hover:text-white"
            )}
            aria-label="لوحة الأرقام الافتراضية"
            title={isEnabled ? "تعطيل لوحة الأرقام" : "تفعيل لوحة الأرقام"}
          >
            <Calculator className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* القسم الأوسط: التبويبات أو العنوان */}
      {showTabs && tabs.length > 0 ? (
        <div
          className="flex-1 flex items-center justify-center px-2 overflow-hidden min-w-0"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div
            ref={tabsContainerRef}
            className={cn(
              "flex items-center bg-white/[0.06] rounded-xl shadow-lg backdrop-blur-sm border border-white/[0.08]",
              // مسافات أكبر لمنع الالتصاق
              tabs.length <= 3 ? "gap-2 px-2 py-1.5" :
              tabs.length <= 5 ? "gap-1.5 px-1.5 py-1" :
              "gap-1 px-1 py-1"
            )}
            style={{ 
              pointerEvents: 'none', 
              WebkitAppRegion: 'drag',
              maxWidth: 'min(95%, 800px)' // عرض أكبر للنصوص الطويلة
            } as any}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onSelect}
                className={cn(
                  'relative flex items-center justify-center rounded-lg transition-all duration-200 shrink-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                  // الأحجام تتناسب مع عدد التبويبات - بدون max-width
                  tabs.length <= 3 
                    ? 'h-8 w-8 sm:h-9 sm:w-auto sm:gap-2 sm:px-4'
                    : tabs.length <= 5
                    ? 'h-8 w-8 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3'
                    : 'h-7 w-7 sm:h-7 sm:w-auto sm:gap-1.5 sm:px-2.5',
                  tab.id === activeTabId
                    ? 'bg-white text-slate-900 shadow-lg scale-[1.02] font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.12] active:scale-95'
                )}
                style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as any}
                title={tab.title}
              >
                {tab.icon && (
                  <span className={cn(
                    "inline-flex items-center justify-center shrink-0",
                    tabs.length <= 5 ? "h-[18px] w-[18px]" : "h-4 w-4"
                  )}>
                    {tab.icon}
                  </span>
                )}
                {/* النص يظهر فقط في الشاشات المتوسطة وما فوق */}
                <span className={cn(
                  "hidden sm:inline font-medium whitespace-nowrap",
                  tabs.length <= 3 ? "text-sm" : 
                  tabs.length <= 5 ? "text-xs" : "text-[11px]"
                )}>
                  {tab.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="flex-1 flex items-center justify-center px-2 sm:px-4 lg:px-6 overflow-hidden min-w-0"
          style={{ WebkitAppRegion: isInPOS ? 'no-drag' : 'drag' } as any}
        >
          {isInPOS ? (
            <POSTitleBarActions />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-[10px] sm:text-xs lg:text-sm font-semibold text-white/90 tracking-wide select-none truncate">
                <span className="hidden sm:inline">سطوكيها - منصة المتاجر الإلكترونية</span>
                <span className="sm:hidden">سطوكيها</span>
              </h1>
            </div>
          )}
        </div>
      )}

      {/* القسم الأيمن: أزرار النافذة (Windows/Linux) */}
      <div
        className={cn(
          'flex items-center shrink-0',
          platform === 'darwin' ? 'px-2' : 'px-0'
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {isElectron ? (
          platform === 'darwin' ? (
            <div className="w-2" />
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
          <div className="px-3 text-[10px] text-slate-400 select-none hidden sm:block">نسخة المتصفح</div>
        )}
      </div>
    </div>
  );
};

export default DesktopTitlebar;
