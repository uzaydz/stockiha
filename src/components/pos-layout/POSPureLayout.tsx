import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
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

const POSPureLayout = memo(function POSPureLayout({ 
  children, 
  onRefresh,
  isRefreshing = false,
  executionTime,
  connectionStatus = 'connected',
  sidebarItems,
  disableScroll = false
}: POSPureLayoutProps) {
  const { user, userProfile, isLoading } = useAuth();
  const perms = usePermissions();
  const { setActions, clearActions } = useTitlebar();
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

  const layoutBackground = '#050b15';
  
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
      const key = requiredKeyFor(item.href);
      if (!key) return true;
      if (!perms.ready) return true;
      return perms.has(key);
    });

    return filtered;
  }, [sidebarItems, perms.ready, perms.has]);

  return (
    <div dir="rtl" className="relative overflow-hidden" style={{ 
      background: layoutBackground, 
      height: 'calc(100vh - var(--titlebar-height, 48px))'
    }}>
      <div className="relative h-full w-full overflow-hidden" style={{ background: layoutBackground }}>
        <div className={cn("relative flex w-full h-full overflow-hidden")} style={{ background: layoutBackground }}>
      {/* أزرار السايدبار للجوال */}
      {isStaff && !isLoading && isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileSidebar}
          className="fixed right-4 z-50 bg-slate-900/95 backdrop-blur-sm border-2 border-orange-500/30 shadow-xl rounded-xl hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-300"
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

      {/* المحتوى الرئيسي - مع بوردر سميك ومنع الخروج */}
      <main className={cn(
        "transition-all duration-300 w-full h-full overflow-hidden",
        !isMobile && isStaff && !isLoading ? `${contentMargin} p-3` : isMobile ? "p-2 pb-2" : "p-3"
      )}>
        <div className={cn(
          "w-full h-full bg-background shadow-2xl overflow-hidden",
          "relative flex flex-col",
          isMobile ? "rounded-t-2xl border-t-[3px] border-x-[3px] border-black/80" : "rounded-2xl border-[3px] border-black/80"
        )}>
          <div className={cn(
            "w-full flex-1 overflow-hidden",
            disableScroll ? "" : "overflow-y-auto"
          )}>
            {children}
          </div>
        </div>
      </main>
        </div>
      </div>
      
      {/* القائمة الثابتة في الأسفل للهاتف */}
      <MobileBottomNavigation 
        onMenuToggle={toggleMobileSidebar}
        isMenuOpen={isMobileSidebarOpen}
      />
    </div>
  );
});

POSPureLayout.displayName = 'POSPureLayout';

export default POSPureLayout;
