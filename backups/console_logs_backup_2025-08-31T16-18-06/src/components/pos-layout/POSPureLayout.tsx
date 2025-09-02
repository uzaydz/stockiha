import React, { useEffect, useState, useCallback, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Menu, X } from 'lucide-react';
import POSPureNavbar from './POSPureNavbar';
import POSPureSidebar from './POSPureSidebar';

interface POSPureLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  executionTime?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}

const POSPureLayout = memo(function POSPureLayout({ 
  children, 
  onRefresh,
  isRefreshing = false,
  executionTime,
  connectionStatus = 'connected'
}: POSPureLayoutProps) {
  const { user, userProfile, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const userRole = userProfile?.role || null;
  const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'employee';

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

  // معالج فتح/إغلاق السايدبار للجوال
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  // معالج إغلاق السايدبار عند النقر على الخلفية
  const handleOverlayClick = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  // منع التمرير عند فتح السايدبار في الجوال
  useEffect(() => {
    if (isMobileSidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileSidebarOpen, isMobile]);

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

  return (
    <div dir="rtl" className="bg-background min-h-screen relative">
      {/* Navbar العلوي */}
      <POSPureNavbar 
        className="fixed top-0 left-0 right-0 z-50"
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        executionTime={executionTime}
        connectionStatus={connectionStatus}
      />
      
      {/* أزرار السايدبار للجوال */}
      {isStaff && !isLoading && isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileSidebar}
          className="fixed top-20 right-4 z-50 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg"
        >
          {isMobileSidebarOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      )}
      
      {/* السايدبار - Desktop - أصغر حجماً */}
      {isStaff && !isLoading && !isMobile && (
        <aside className="fixed top-16 bottom-0 right-0 w-20 z-40">
          <POSPureSidebar />
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
          <aside className={cn(
            "fixed top-16 bottom-0 right-0 w-20 z-50 transition-transform duration-300 ease-in-out",
            isMobileSidebarOpen ? "translate-x-0" : "translate-x-full"
          )}>
            <POSPureSidebar />
          </aside>
        </>
      )}
      
      {/* المحتوى الرئيسي - مساحة أكبر */}
      <main className={cn(
        "pt-16 min-h-screen transition-all duration-300",
        !isMobile && isStaff && !isLoading ? "mr-20" : "mr-0"
      )}>
        {children}
      </main>
    </div>
  );
});

POSPureLayout.displayName = 'POSPureLayout';

export default POSPureLayout;
