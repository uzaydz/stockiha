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

// كشف البيئة مرة واحدة عند التحميل
const detectEnvironment = () => {
  if (typeof window === 'undefined') return { isTauri: false, isElectron: false, platform: 'web' as Platform };

  const w = window as any;
  const isTauri = Boolean(w.__TAURI_IPC__ || w.__TAURI__ || w.__TAURI_INTERNALS__);
  const isElectron = Boolean(w.electronAPI);

  let platform: Platform = 'web';
  if (isTauri) {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) platform = 'darwin';
    else if (ua.includes('win')) platform = 'win32';
    else platform = 'linux';
  } else if (isElectron && w.electronAPI?.platform) {
    platform = w.electronAPI.platform as Platform;
  }

  return { isTauri, isElectron, platform };
};

const DesktopTitlebar: React.FC = () => {
  const { tabs, activeTabId, showTabs, actions } = useTitlebar();
  const { theme, fastThemeController } = useTheme();
  const { currentStaff, isAdminMode, clearSession } = useStaffSession();
  const { isEnabled, toggleNumpad } = useVirtualNumpad();
  const [showAIChat, setShowAIChat] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // كشف البيئة مباشرة عند التهيئة
  const env = useMemo(() => detectEnvironment(), []);

  const [platform, setPlatform] = useState<Platform>(env.platform);
  const [canGoBack, setCanGoBack] = useState(false);
  const [tauriUpdate, setTauriUpdate] = useState<any>(null);
  const [activeToolsGroup, setActiveToolsGroup] = useState<'primary' | 'secondary'>('primary');
  const [isDesktopApp, setIsDesktopApp] = useState(env.isTauri || env.isElectron);
  const [isTauriApp, setIsTauriApp] = useState(env.isTauri);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Log للتشخيص
  useEffect(() => {
    console.log('[DesktopTitlebar] 🎯 Environment:', {
      isTauriApp,
      isDesktopApp,
      platform,
      showWindowControls: isDesktopApp && platform !== 'darwin'
    });
  }, [isTauriApp, isDesktopApp, platform]);


  const handleMinimize = useCallback(async () => {
    const w = window as any;
    if (isTauriApp) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
      } catch (err) {
        console.error('[TitleBar] Failed to minimize:', err);
      }
    } else if (w.electronAPI?.minimizeWindow) {
      w.electronAPI.minimizeWindow();
    }
  }, [isTauriApp]);

  const handleMaximize = useCallback(async () => {
    const w = window as any;
    if (isTauriApp) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const isMaximized = await win.isMaximized();
        if (isMaximized) {
          await win.unmaximize();
        } else {
          await win.maximize();
        }
      } catch (err) {
        console.error('[TitleBar] Failed to maximize:', err);
      }
    } else if (w.electronAPI?.maximizeWindow) {
      w.electronAPI.maximizeWindow();
    }
  }, [isTauriApp]);

  const handleClose = useCallback(async () => {
    const w = window as any;
    if (isTauriApp) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch (err) {
        console.error('[TitleBar] Failed to close:', err);
      }
    } else if (w.electronAPI?.closeWindow) {
      w.electronAPI.closeWindow();
    }
  }, [isTauriApp]);

  // الاستماع لأحداث القائمة الأصلية (Tauri Native Menu)
  useEffect(() => {
    if (!isTauriApp) return;

    let unlisten: (() => void) | undefined;

    const setupMenuListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        unlisten = await listen('menu-event', (event: any) => {
          const action = event.payload;
          console.log('[TitleBar] Menu event received:', action);

          if (action === 'about') {
            // يمكن استبدال هذا بحوار مخصص لاحقاً
            import('react-hot-toast').then(({ default: toast }) => {
              toast('Stockiha App v0.1.0', {
                icon: 'ℹ️',
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
              });
            });
          } else if (action === 'docs') {
            window.open('https://stockiha.com/docs', '_blank');
          } else if (action === 'support') {
            window.open('https://stockiha.com/support', '_blank');
          }
        });
      } catch (err) {
        console.error('[TitleBar] Failed to setup menu listener:', err);
      }
    };

    setupMenuListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauriApp]);

  // تتبع حالة التنقل

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

  // Debug: طباعة الحالة عند كل render
  useEffect(() => {
    console.log('[DesktopTitlebar] 🔄 Render state:', {
      isDesktopApp,
      isTauriApp,
      platform,
      showWindowControls: isDesktopApp && platform !== 'darwin'
    });
  }, [isDesktopApp, isTauriApp, platform]);

  return (
    <div
      className="desktop-titlebar fixed inset-x-0 top-0 z-[1000] flex h-[var(--titlebar-height,48px)] items-center bg-[#0a0f1c] border-b border-white/5 shadow-sm transition-all duration-300 select-none"
      style={{ height: `var(--titlebar-height, ${TITLEBAR_HEIGHT}px)` } as any}
      data-tauri-drag-region="true"
    >
      {/* القسم الأيسر: نظام تبديل الأزرار */}
      <div
        className="flex items-center gap-2 px-3 shrink-0 relative z-10"
        data-no-drag="true"
      >
        {/* زر التبديل بين المجموعتين */}
        <button
          type="button"
          onClick={() => setActiveToolsGroup(prev => prev === 'primary' ? 'secondary' : 'primary')}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-300 group relative overflow-hidden",
            activeToolsGroup === 'primary'
              ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
              : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
          )}
          aria-label="تبديل الأدوات"
        >
          <div className={cn(
            "transition-transform duration-500 ease-out absolute",
            activeToolsGroup === 'primary' ? "scale-100 rotate-0" : "scale-0 rotate-90 opacity-0"
          )}>
            <MoreHorizontal className="h-5 w-5" />
          </div>
          <div className={cn(
            "transition-transform duration-500 ease-out absolute",
            activeToolsGroup === 'secondary' ? "scale-100 rotate-0" : "scale-0 -rotate-90 opacity-0"
          )}>
            <ChevronLeft className="h-5 w-5" />
          </div>
        </button>

        {/* Container مع أنيميشن التبديل */}
        <div className="relative h-8 overflow-hidden flex items-center">
          {/* المجموعة الأساسية */}
          <div
            className={cn(
              "flex items-center gap-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              activeToolsGroup === 'primary'
                ? "opacity-100 translate-x-0 visible"
                : "opacity-0 -translate-x-8 absolute invisible pointer-events-none"
            )}
          >
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5 backdrop-blur-sm">
              {/* التنقل */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-200",
                    canGoBack
                      ? "hover:bg-white/10 text-gray-400 hover:text-white active:scale-95"
                      : "text-gray-600 cursor-not-allowed"
                  )}
                  title="الرجوع"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 active:scale-95"
                  title="الصفحة الرئيسية"
                >
                  <Home className="h-4 w-4" />
                </button>
              </div>

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* المزامنة - دائماً مرئية */}
              <div className="flex items-center">
                <NavbarSyncIndicator />
              </div>

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* الإشعارات */}
              <TitlebarNotifications />

              {/* التحديثات - فقط في التطبيق */}
              {isDesktopApp && (
                <>
                  <div className="h-4 w-px bg-white/10 mx-1" />
                  <div className="flex items-center">
                    <UpdateButton />
                  </div>
                </>
              )}

              {/* تسجيل خروج الموظف */}
              {staffDisplayName && (
                <>
                  <div className="h-4 w-px bg-white/10 mx-1" />
                  <button
                    type="button"
                    onClick={handleStaffLogout}
                    className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-200 active:scale-95"
                    title="تسجيل خروج الموظف"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* المجموعة الثانوية */}
          <div
            className={cn(
              "flex items-center gap-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              activeToolsGroup === 'secondary'
                ? "opacity-100 translate-x-0 visible"
                : "opacity-0 translate-x-8 absolute invisible pointer-events-none"
            )}
          >
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5 backdrop-blur-sm">
              {/* SIRA */}
              <button
                type="button"
                onClick={() => setShowAIChat(true)}
                className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 transition-all duration-200 active:scale-95 group relative"
                title="SIRA AI"
              >
                <span className="absolute inset-0 bg-purple-500/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                <img
                  src="./images/selkia-logo.webp"
                  alt="SIRA AI"
                  className="h-4 w-4 object-contain relative z-10"
                />
              </button>

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* الثيم */}
              <button
                type="button"
                onClick={fastThemeController.toggleFast}
                className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 active:scale-95"
                title="تبديل الثيم"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* الاشتراك */}
              <div className="flex items-center">
                <SubscriptionButton />
              </div>

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* البروفايل */}
              <div className="flex items-center">
                <ProfileMenu />
              </div>

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* لوحة الأرقام */}
              <button
                type="button"
                onClick={toggleNumpad}
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-200 active:scale-95",
                  isEnabled
                    ? "bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    : "hover:bg-white/10 text-gray-400 hover:text-white"
                )}
                title={isEnabled ? "تعطيل لوحة الأرقام" : "تفعيل لوحة الأرقام"}
              >
                <Calculator className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* القسم الأوسط: التبويبات أو العنوان */}
      {showTabs && tabs.length > 0 ? (
        <div
          className="flex-1 flex items-center justify-center px-4 overflow-hidden min-w-0 relative z-10 cursor-default"
        >
          <div
            ref={tabsContainerRef}
            className={cn(
              "flex items-center bg-[#0f172a]/50 rounded-xl p-1 border border-white/5 backdrop-blur-md shadow-inner max-w-full overflow-x-auto no-scrollbar",
              tabs.length > 3 ? "justify-start sm:justify-center" : "justify-center"
            )}
            data-no-drag="true"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onSelect}
                className={cn(
                  'relative flex items-center justify-center rounded-lg transition-all duration-200 shrink-0 px-3 py-1.5 gap-2 group',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50',
                  tab.id === activeTabId
                    ? 'bg-white/10 text-white shadow-sm font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                )}
                title={tab.title}
              >
                {tab.icon && (
                  <span className={cn(
                    "inline-flex items-center justify-center transition-colors",
                    tab.id === activeTabId ? "text-orange-400" : "text-gray-500 group-hover:text-gray-400"
                  )}>
                    {tab.icon}
                  </span>
                )}
                <span className="text-xs sm:text-sm whitespace-nowrap">
                  {tab.title}
                </span>
                {tab.id === activeTabId && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-500 rounded-full opacity-50" />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="flex-1 flex items-center justify-center px-4 overflow-hidden min-w-0 relative z-10 cursor-default"
        >
          {isInPOS ? (
            <div data-no-drag="true" className="w-full">
              <POSTitleBarActions />
            </div>
          ) : (
            <div
              className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <h1 className="text-sm font-medium text-gray-200 tracking-wide select-none truncate font-tajawal">
                <span className="hidden sm:inline">سطوكيها - منصة المتاجر الإلكترونية</span>
                <span className="sm:hidden">سطوكيها</span>
              </h1>
            </div>
          )}
        </div>
      )}

      {/* القسم الأيمن: أزرار النافذة */}
      <div
        className="flex items-center shrink-0 pl-2 relative z-10"
        data-no-drag="true"
      >
        {isDesktopApp && (
          <div className="flex items-center gap-1 mr-2">
            <button
              type="button"
              onClick={handleMinimize}
              className="h-8 w-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="تصغير"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleMaximize}
              className="h-8 w-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="تكبير/استعادة"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="h-8 w-10 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white text-gray-400 transition-all duration-200"
              title="إغلاق"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* نافذة الذكاء الاصطناعي */}
      <SmartAssistantChat open={showAIChat} onOpenChange={setShowAIChat} />
    </div>
  );
};

export default DesktopTitlebar;
