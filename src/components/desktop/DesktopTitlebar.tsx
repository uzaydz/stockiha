import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Minus, Square, X as CloseIcon, ChevronLeft, ChevronRight, Home, Sun, Moon, LogOut, Shield, User, Calculator, MoreHorizontal, Crown } from 'lucide-react';
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
import { SubscriptionButton } from './SubscriptionButton';
import { SmartAssistantChat } from '@/components/pos/SmartAssistantChat';
import { TitlebarNotifications } from './TitlebarNotifications';
import './DesktopTitlebar.css';

type Platform = 'darwin' | 'win32' | 'linux' | 'web';

const TITLEBAR_HEIGHT = 48;

const DesktopTitlebar: React.FC = () => {
  const { tabs, activeTabId, showTabs, actions } = useTitlebar();
  const { theme, fastThemeController } = useTheme();
  const { currentStaff, isAdminMode, clearSession } = useStaffSession();
  const { isEnabled, toggleNumpad } = useVirtualNumpad();
  const [showAIChat, setShowAIChat] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [platform, setPlatform] = useState<Platform>('web');
  const [canGoBack, setCanGoBack] = useState(false);
  const [activeToolsGroup, setActiveToolsGroup] = useState<'primary' | 'secondary'>('primary');
  const tabsContainerRef = useRef<HTMLDivElement>(null);

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
      className="desktop-titlebar fixed inset-x-0 top-0 z-[1000] flex h-[var(--titlebar-height,48px)] items-center bg-gradient-to-r from-slate-900/98 via-slate-900/96 to-slate-900/98 text-white backdrop-blur-xl border-b border-white/5 shadow-lg"
      style={{ WebkitAppRegion: 'drag', height: `var(--titlebar-height, ${TITLEBAR_HEIGHT}px)` } as any}
    >
      {/* القسم الأيسر: نظام تبديل الأزرار */}
      <div
        className="flex items-center gap-0.5 sm:gap-1.5 px-1 sm:px-2 lg:px-3 shrink-0 relative"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* Container مع أنيميشن التبديل */}
        <div className="relative overflow-hidden">
          {/* المجموعة الأساسية */}
          <div
            className={cn(
              "flex items-center gap-0.5 transition-all duration-300 ease-in-out",
              activeToolsGroup === 'primary'
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-full absolute inset-0 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-0.5 bg-white/5 rounded-md sm:rounded-lg p-0.5 border border-white/10 backdrop-blur-sm">
              {/* التنقل */}
              <button
                type="button"
                onClick={handleGoBack}
                disabled={!canGoBack}
                className={cn(
                  "flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded transition-colors duration-150",
                  canGoBack
                    ? "hover:bg-white/10 text-white hover:text-white active:bg-white/15"
                    : "text-white/25 cursor-not-allowed"
                )}
                aria-label="الرجوع"
                title="الرجوع"
              >
                <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
              </button>
              <button
                type="button"
                onClick={handleGoHome}
                className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded hover:bg-white/10 text-white/80 hover:text-white active:bg-white/15 transition-colors duration-150"
                aria-label="الصفحة الرئيسية"
                title="الصفحة الرئيسية"
              >
                <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
              </button>
              <div className="h-4 w-px bg-white/15" />
              <div className="flex items-center">
                <NavbarSyncIndicator />
              </div>
              <div className="h-4 w-px bg-white/15" />
              {/* الإشعارات */}
              <TitlebarNotifications />
              {/* تسجيل خروج الموظف */}
              {staffDisplayName && (
                <>
                  <div className="h-4 w-px bg-white/15" />
                  <button
                    type="button"
                    onClick={handleStaffLogout}
                    className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded hover:bg-red-500/15 text-red-400 hover:text-red-300 active:bg-red-500/25 transition-colors duration-150"
                    aria-label="تسجيل خروج الموظف"
                    title="تسجيل خروج الموظف"
                  >
                    <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* المجموعة الثانوية */}
          <div
            className={cn(
              "flex items-center gap-0.5 transition-all duration-300 ease-in-out",
              activeToolsGroup === 'secondary'
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-full absolute inset-0 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-0.5 bg-white/5 rounded-md sm:rounded-lg p-0.5 border border-white/10 backdrop-blur-sm">
              {/* SIRA */}
              <button
                type="button"
                onClick={() => setShowAIChat(true)}
                className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded hover:bg-white/10 active:bg-white/15 transition-colors duration-150 group"
                aria-label="SIRA – تتحدث لغة تجارتك"
                title="SIRA – تتحدث لغة تجارتك"
              >
                <img
                  src="/images/selkia-logo.webp"
                  alt="SIRA AI"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 object-contain"
                />
              </button>
              <div className="h-4 w-px bg-white/15" />
              {/* الثيم */}
              <button
                type="button"
                onClick={fastThemeController.toggleFast}
                className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded hover:bg-white/10 text-white/80 hover:text-white active:bg-white/15 transition-colors duration-150"
                aria-label="تبديل الثيم"
                title="تبديل الثيم"
              >
                {theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </button>
              <div className="h-4 w-px bg-white/15" />
              {/* الاشتراك */}
              <div className="flex items-center">
                <SubscriptionButton />
              </div>
              <div className="h-4 w-px bg-white/15" />
              {/* البروفايل */}
              <div className="flex items-center">
                <ProfileMenu />
              </div>
              <div className="h-4 w-px bg-white/15" />
              {/* لوحة الأرقام */}
              <button
                type="button"
                onClick={toggleNumpad}
                className={cn(
                  "flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded transition-colors duration-150",
                  isEnabled
                    ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/25 hover:text-blue-300 active:bg-blue-500/30"
                    : "hover:bg-white/10 text-white/80 hover:text-white active:bg-white/15"
                )}
                aria-label="لوحة الأرقام الافتراضية"
                title={isEnabled ? "تعطيل لوحة الأرقام" : "تفعيل لوحة الأرقام"}
              >
                <Calculator className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* زر التبديل بين المجموعتين */}
        <button
          type="button"
          onClick={() => setActiveToolsGroup(prev => prev === 'primary' ? 'secondary' : 'primary')}
          className={cn(
            "flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg transition-all duration-300",
            "bg-gradient-to-br shadow-lg border",
            activeToolsGroup === 'primary'
              ? "from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/25 border-orange-400/40"
              : "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25 border-blue-400/40"
          )}
          aria-label="تبديل الأدوات"
          title={activeToolsGroup === 'primary' ? 'عرض الأدوات الإضافية' : 'عرض الأدوات الأساسية'}
        >
          <div className={cn(
            "transition-transform duration-300",
            activeToolsGroup === 'secondary' && "rotate-180"
          )}>
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
        </button>
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
                  'relative flex items-center justify-center rounded-lg transition-colors duration-150 shrink-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                  // الأحجام تتناسب مع عدد التبويبات - بدون max-width
                  tabs.length <= 3
                    ? 'h-8 w-8 sm:h-9 sm:w-auto sm:gap-2 sm:px-4'
                    : tabs.length <= 5
                    ? 'h-8 w-8 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3'
                    : 'h-7 w-7 sm:h-7 sm:w-auto sm:gap-1.5 sm:px-2.5',
                  tab.id === activeTabId
                    ? 'bg-white text-slate-900 shadow-md font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/10 active:bg-white/15'
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
      
      {/* نافذة الذكاء الاصطناعي */}
      <SmartAssistantChat open={showAIChat} onOpenChange={setShowAIChat} />
    </div>
  );
};

export default DesktopTitlebar;
