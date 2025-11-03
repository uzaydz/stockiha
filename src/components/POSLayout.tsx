import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Store, X, Menu } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SideMenu from '@/components/sidebar/SideMenu';
import MobileBottomNavigation from '@/components/navbar/MobileBottomNavigation';

interface POSLayoutProps {
  children: React.ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  const { user, userProfile, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const userRole = userProfile?.role || null;
  const userPermissions = (userProfile?.permissions || {}) as unknown as Record<string, boolean>;
  const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'employee';

  // القائمة الجانبية مطوية دائماً في POS
  const isSidebarOpen = false;

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // ضمان أن القائمة الجانبية مطوية دائماً في POS
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', 'true');
    
    // إرسال حدث لإشعار المكونات الأخرى
    const event = new Event('localStorageChange');
    (event as any).key = 'sidebarCollapsed';
    (event as any).newValue = 'true';
    window.dispatchEvent(event);
  }, []);
  
  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    }
    // لا نسمح بتوسيع القائمة في صفحة POS على الشاشات الكبيرة
  };
  
  const handleOverlayClick = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  if (user && isLoading) {
    return (
      <div dir="rtl" className="bg-background/95 min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">جاري تحميل ملف المستخدم...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="bg-background/95 min-h-screen">
      <Navbar 
        className="fixed top-0 left-0 right-0 z-50 shadow-sm h-16" 
        toggleSidebar={toggleSidebar} 
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
      />
      
      {/* القائمة الجانبية الثابتة - مطوية دائماً في POS */}
      {isStaff && !isLoading && !isMobile && (
        <aside
          className={cn(
            "fixed top-16 bottom-0 right-0 z-40 border-l border-border/30 bg-background transition-all duration-300",
            "w-16" // تقليل عرض القائمة من 20 إلى 16 لتوفير مساحة أكبر
          )}
        >
          <SideMenu userRole={userRole} userPermissions={userPermissions} />
        </aside>
      )}
      
      {/* المحتوى الرئيسي - مع مسافة أقل للقائمة المطوية */}
      <main 
        className={cn(
          "pt-16 min-h-screen transition-all duration-300", // عودة إلى pt-16 لتقليل المساحة
          !isMobile ? "mr-16" : isMobileSidebarOpen ? "mr-72" : "mr-0" // تقليل المسافة من mr-20 إلى mr-16
        )}
      >
        {children}
      </main>
      
      {/* القائمة الجانبية للجوال */}
      {isStaff && !isLoading && isMobile && (
        <>
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={handleOverlayClick}
            />
          )}
          <aside 
            className={cn(
              "fixed right-0 top-0 h-screen z-50 border-l border-border/30 transition-all duration-300 shadow-xl w-72 bg-background",
              isMobileSidebarOpen ? "translate-x-0" : "translate-x-[100%]"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-card shadow-sm border-b border-sidebar-border">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Store className="w-5 h-5" />
                {userProfile?.store_name || 'متجر سطوكيها'}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SideMenu userRole={userRole} userPermissions={userPermissions} />
          </aside>
          {!isMobileSidebarOpen && (
            <Button
              className="fixed bottom-6 right-6 z-30 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              size="icon"
              onClick={toggleSidebar}
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </>
      )}
      
      {/* القائمة الثابتة في الأسفل للهاتف */}
      <MobileBottomNavigation 
        onMenuToggle={toggleSidebar}
        isMenuOpen={isMobileSidebarOpen}
      />
    </div>
  );
}
