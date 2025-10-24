import React, { useEffect, useState, useCallback, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTitlebar } from '@/context/TitlebarContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Menu, X, RefreshCw } from 'lucide-react';
import POSPureSidebar, { POSSidebarItem } from './POSPureSidebar';

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
  useEffect(() => {
    if (onRefresh) {
      setActions([
        {
          id: 'refresh',
          label: 'تحديث البيانات',
          icon: <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-orange-500")} />,
          onClick: onRefresh,
          disabled: isRefreshing
        }
      ]);
    }

    return () => {
      clearActions();
    };
  }, [onRefresh, isRefreshing, setActions, clearActions]);

  // معالج فتح/إغلاق السايدبار للجوال
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  // معالج إغلاق السايدبار عند النقر على الخلفية
  const handleOverlayClick = useCallback(() => {
    setIsMobileSidebarOpen(false);
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

  return (
    <div dir="rtl" className={cn("relative", disableScroll ? "overflow-hidden" : "overflow-auto")} style={{ background: layoutBackground, height: disableScroll ? 'calc(100vh - var(--titlebar-height, 48px))' : 'auto', minHeight: disableScroll ? undefined : 'calc(100vh - var(--titlebar-height, 48px))' }}>
      <div className="relative h-full w-full" style={{ background: layoutBackground }}>
        <div className={cn("relative flex w-full", disableScroll ? "h-full" : "min-h-full")} style={{ background: layoutBackground }}>
      {/* أزرار السايدبار للجوال */}
      {isStaff && !isLoading && isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileSidebar}
          className="fixed right-4 z-50 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg"
          style={{ top: mobileToggleOffset }}
        >
          {isMobileSidebarOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      )}
      
      {/* السايدبار - Desktop - مدمج مع البوردر */}
      {isStaff && !isLoading && !isMobile && (
        <aside
          className={cn(
            "fixed right-2 z-30 overflow-visible shadow-2xl transition-all duration-300",
            sidebarWidth
          )}
          style={{ top: sidebarOffset, bottom: '1rem' }}
        >
          <POSPureSidebar 
            items={sidebarItems} 
            isExpanded={isSidebarExpanded}
            onToggleExpand={toggleSidebarExpand}
          />
        </aside>
      )}
      
      {/* السايدبار - Mobile */}
      {isStaff && !isLoading && isMobile && (
        <>
          {/* Overlay */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={handleOverlayClick}
            />
          )}
          
          {/* Mobile Sidebar - عرض مناسب للجوال */}
          <aside
            className={cn(
              'fixed bottom-0 right-0 w-20 z-50 transition-transform duration-300 ease-in-out',
              isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            )}
            style={{ top: sidebarOffset }}
          >
            <POSPureSidebar 
              items={sidebarItems}
              isExpanded={false}
            />
          </aside>
        </>
      )}
      
      {/* المحتوى الرئيسي - مساحة أكبر */}
      <main className={cn(
        "transition-all duration-300 w-full",
        disableScroll ? "h-full overflow-hidden" : "min-h-full overflow-auto",
        !isMobile && isStaff && !isLoading ? `${contentMargin} p-2` : "p-2"
      )}>
        <div className={cn(
          "w-full bg-background rounded-sm border border-black/80",
          disableScroll ? "h-full" : "min-h-full"
        )}>
          {children}
        </div>
      </main>
        </div>
      </div>
    </div>
  );
});

POSPureLayout.displayName = 'POSPureLayout';

export default POSPureLayout;
