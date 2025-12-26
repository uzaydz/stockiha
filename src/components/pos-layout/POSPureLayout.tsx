import React, { useEffect, useState, useCallback, memo, useRef, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { useTitlebar } from '@/context/TitlebarContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Menu, X, RefreshCw } from 'lucide-react';
import POSPureSidebar, { POSSidebarItem, posSidebarItems } from './POSPureSidebar';
import POSMobileSidebar from './POSMobileSidebar';
import MobileBottomNavigation from '@/components/navbar/MobileBottomNavigation';
import { usePermissions } from '@/hooks/usePermissions';

interface POSPureLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  executionTime?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
  sidebarItems?: POSSidebarItem[];
  disableScroll?: boolean; // للتحكم في السكرول - true لنقطة البيع فقط
}

// Safe hook that doesn't throw if AuthProvider is not available
// Using try-catch to handle any potential errors during context access
const useSafeAuth = () => {
  try {
    const context = useContext(AuthContext);
    if (context === undefined) {
      // Return default values if AuthProvider is not available
      return {
        user: null,
        userProfile: null,
        isLoading: true,
        organization: null,
        session: null,
        currentSubdomain: null,
        isProcessingToken: false,
        isExplicitSignOut: false,
        hasInitialSessionCheck: false,
        authReady: false,
        isLoadingProfile: false,
        isLoadingOrganization: false,
        profileLoaded: false,
        organizationLoaded: false,
        dataLoadingComplete: false,
        signIn: async () => ({ success: false, error: new Error('Auth not available') }),
        signUp: async () => ({ success: false, error: new Error('Auth not available') }),
        signOut: async () => {},
        refreshData: async () => {},
        updateAuthState: () => {},
        forceUpdateAuthState: () => {},
        initialize: async () => {},
      };
    }
    return context;
  } catch (error) {
    // If there's any error accessing the context, return default values
    console.warn('[POSPureLayout] Error accessing auth context:', error);
    return {
      user: null,
      userProfile: null,
      isLoading: true,
      organization: null,
      session: null,
      currentSubdomain: null,
      isProcessingToken: false,
      isExplicitSignOut: false,
      hasInitialSessionCheck: false,
      authReady: false,
      isLoadingProfile: false,
      isLoadingOrganization: false,
      profileLoaded: false,
      organizationLoaded: false,
      dataLoadingComplete: false,
      signIn: async () => ({ success: false, error: new Error('Auth not available') }),
      signUp: async () => ({ success: false, error: new Error('Auth not available') }),
      signOut: async () => {},
      refreshData: async () => {},
      updateAuthState: () => {},
      forceUpdateAuthState: () => {},
      initialize: async () => {},
    };
  }
};

const POSPureLayout = memo(function POSPureLayout({ 
  children, 
  onRefresh,
  isRefreshing = false,
  executionTime,
  connectionStatus = 'connected',
  sidebarItems,
  disableScroll = false
}: POSPureLayoutProps) {
  const { user, userProfile, isLoading } = useSafeAuth();
  const perms = usePermissions();
  const { setActions, clearActions } = useTitlebar();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // حالة توسيع القائمة الجانبية مع حفظها في localStorage
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('pos-sidebar-expanded');
    return saved ? JSON.parse(saved) : false;
  });
  
  const userRole = userProfile?.role || null;
  const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'staff' || userProfile?.role === 'employee';

  // كشف حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      
      // إغلاق السايدبار تلقائياً في الشاشات الصغيرة
      if (mobile) {
        setIsMobileSidebarOpen(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // POS layout manages its own titlebar offset; disable app-shell padding to avoid double spacing.
  useEffect(() => {
    document.body.classList.add('pos-shell-active');
    return () => {
      document.body.classList.remove('pos-shell-active');
    };
  }, []);

  // إضافة زر التحديث إلى titlebar actions
  // ✅ استخدام ref لتتبع حالة الـ mount وتجنب infinite loop
  const actionsSetRef = useRef(false);
  const prevIsRefreshingRef = useRef(isRefreshing);
  
  useEffect(() => {
    // فقط تحديث إذا تغيرت حالة isRefreshing فعلاً أو لم يتم الإعداد بعد
    if (!onRefresh) return;
    
    if (actionsSetRef.current && prevIsRefreshingRef.current === isRefreshing) {
      return; // لا تحديث إذا لم تتغير الحالة
    }
    
    prevIsRefreshingRef.current = isRefreshing;
    actionsSetRef.current = true;
    
    setActions([
      {
        id: 'refresh',
        label: 'تحديث البيانات',
        icon: <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-orange-500")} />,
        onClick: onRefresh,
        disabled: isRefreshing
      }
    ]);
    
    // ✅ لا نستدعي clearActions في cleanup لتجنب infinite loop
  }, [onRefresh, isRefreshing, setActions]);

  // معالج فتح/إغلاق السايدبار للجوال
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);
  
  // معالج توسيع/تصغير القائمة الجانبية
  const toggleSidebarExpand = useCallback(() => {
    setIsSidebarExpanded(prev => {
      const newValue = !prev;
      localStorage.setItem('pos-sidebar-expanded', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  // شاشة التحميل
  if (user && isLoading) {
    return (
      <div dir="rtl" className="bg-background/95 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">جاري تحميل ملف المستخدم...</p>
        </div>
      </div>
    );
  }

  const titlebarOffset = 'calc(var(--titlebar-height, 48px) + 0.5rem)';
  const sidebarOffset = 'calc(var(--titlebar-height, 48px) + 0.25rem)';
  const mobileToggleOffset = 'calc(var(--titlebar-height, 48px) + 3.5rem)';

  // خلفية POS داكنة دائماً في كلا الوضعين (مثل التايتل بار)
  // 🎨 استخدام لون Midnight Navy للتناسق
  const layoutBackground = '#080f1a';

  // في صفحة نقطة البيع (البيع) يوجد شريط سلة سفلي خاص بها،
  // لذلك نُخفي شريط التنقل السفلي لتجنب التداخل فوق بعض.
  const hideMobileBottomNav = location.pathname.startsWith('/dashboard/pos-advanced');
  
  // عرض القائمة الجانبية حسب الحالة
  const sidebarWidth = isSidebarExpanded ? 'w-64' : 'w-20';
  const contentMargin = isSidebarExpanded ? 'mr-[17rem]' : 'mr-24';

  // حساب عناصر السايدبار حسب الصلاحيات
  const gatedSidebarItems = React.useMemo(() => {
    if (sidebarItems) return sidebarItems;
    // خريطة سريعة من المسار إلى مفتاح الصلاحية المناسب
    const requiredKeyFor = (href: string): string | null => {
      if (href.startsWith('/dashboard/sales-operations/groups')) return 'manageOrders';
      if (href.startsWith('/dashboard/pos-dashboard')) return 'accessPOS';
      if (href.startsWith('/dashboard/pos-advanced')) return 'accessPOS';
      if (href.startsWith('/dashboard/pos-operations')) return 'accessPOS';
      if (href.startsWith('/dashboard/pos-stocktake')) return 'accessPOS';
      if (href.startsWith('/dashboard/etat104')) return 'accessPOS';
      if (href.startsWith('/dashboard/store-business-settings')) return 'manageSettings';
      if (href.startsWith('/dashboard/staff-management')) return 'manageUsers';
      if (href.startsWith('/dashboard/product-operations')) return 'viewProducts';
      if (href.startsWith('/dashboard/sales-operations')) return 'viewOrders';
      if (href.startsWith('/dashboard/services-operations')) return 'viewServices';
      if (href.startsWith('/dashboard/supplier-operations')) return 'viewSuppliers';
      if (href.startsWith('/dashboard/courses-operations')) return null;
      if (href.startsWith('/dashboard/store-operations')) return 'manageSettings';
      if (href.startsWith('/dashboard/settings-operations')) return 'manageSettings';
      if (href.startsWith('/dashboard/reports-operations')) return 'viewReports';
      return null;
    };

    // استخدام القائمة الكاملة مع الأيقونات من POSPureSidebar
    const filtered = posSidebarItems.filter(item => {
      // حالة خاصة: الجرد يتطلب accessPOS + أي صلاحية من صلاحيات الجرد
      if (item.href.startsWith('/dashboard/pos-stocktake')) {
        if (!perms.ready) return true;
        return perms.has('accessPOS') && perms.anyOf([
          'startStocktake',
          'performStocktake',
          'reviewStocktake',
          'approveStocktake',
          'deleteStocktake',
          // staff-style keys (للتوافق)
          'canStartStocktake',
          'canPerformStocktake',
          'canReviewStocktake',
          'canApproveStocktake',
          'canDeleteStocktake',
        ]);
      }

      const key = requiredKeyFor(item.href);
      if (!key) return true;
      if (!perms.ready) return true;
      return perms.has(key);
    });

    return filtered;
  }, [sidebarItems, perms.ready, perms.has]);

  return (
    <div
      dir="rtl"
      className="relative flex flex-col"
      style={{
        background: layoutBackground,
        height: '100dvh',
        minHeight: '100vh',
        paddingTop: 'var(--titlebar-height, 48px)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div className="relative flex-1 min-h-0 w-full" style={{ background: layoutBackground, overflow: 'hidden' }}>
        <div className={cn("relative flex w-full h-full min-h-0")} style={{ background: layoutBackground }}>
      {/* أزرار السايدبار للجوال */}
      {isStaff && !isLoading && isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileSidebar}
          className="fixed right-4 z-50 bg-[#161b22]/95 backdrop-blur-sm border-2 border-orange-500/30 shadow-xl rounded-xl hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-300"
          style={{ top: mobileToggleOffset }}
        >
          {isMobileSidebarOpen ? (
            <X className="h-5 w-5 text-orange-400" />
          ) : (
            <Menu className="h-5 w-5 text-orange-400" />
          )}
        </Button>
      )}

      {/* السايدبار - Desktop - مدمج مع البوردر */}
      {isStaff && !isLoading && !isMobile && (
        <aside
          className={cn(
            "fixed right-3 z-30 overflow-visible transition-all duration-300 rounded-2xl",
            sidebarWidth
          )}
          style={{ top: sidebarOffset, bottom: '1rem' }}
        >
          <POSPureSidebar
            items={gatedSidebarItems}
            isExpanded={isSidebarExpanded}
            onToggleExpand={toggleSidebarExpand}
          />
        </aside>
      )}

      {/* السايدبار - Mobile */}
      {isStaff && !isLoading && isMobile && (
        <POSMobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          items={gatedSidebarItems}
        />
      )}

      {/* المحتوى الرئيسي - مع بوردر سميك */}
      <main className={cn(
        "transition-all duration-300 w-full flex-1 min-h-0 flex flex-col",
        !isMobile && isStaff && !isLoading ? `${contentMargin} p-3` : isMobile ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "w-full flex-1 min-h-0 bg-background shadow-2xl",
          "relative flex flex-col",
          isMobile
            ? "rounded-t-2xl border-t-[3px] border-x-[3px] border-border/50 dark:border-white/10"
            : "rounded-2xl border-[3px] border-border/50 dark:border-white/10"
        )}>
          <div className={cn(
            "w-full flex-1 min-h-0",
            disableScroll ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"
          )}
            style={
              disableScroll
                ? undefined
                : ({
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    paddingBottom: isMobile ? 'calc(96px + env(safe-area-inset-bottom, 0px))' : undefined,
                  } as React.CSSProperties)
            }
          >
            {children}
          </div>
        </div>
      </main>
        </div>
      </div>
      
      {/* القائمة الثابتة في الأسفل للهاتف */}
      {!hideMobileBottomNav && (
        <MobileBottomNavigation
          onMenuToggle={toggleMobileSidebar}
          isMenuOpen={isMobileSidebarOpen}
        />
      )}
    </div>
  );
});

POSPureLayout.displayName = 'POSPureLayout';

export default POSPureLayout;
