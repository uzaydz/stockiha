import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth, type Json } from '@/context/AuthContext';
import SideMenu from '@/components/sidebar/SideMenu';
import { cn } from '@/lib/utils';
import { X, Menu, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmployeePermissions } from '@/types/employee';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, userProfile, isLoadingUserProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const userRole = userProfile?.role || null;
  const userPermissions = (userProfile?.permissions || {}) as unknown as Record<string, boolean>;
  const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'employee';
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setIsSidebarOpen(e.newValue !== 'true');
      }
    };
    
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    setIsSidebarOpen(!isCollapsed);

    window.addEventListener('storage', handleStorageChange);
    
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      const event = new Event('localStorageChange');
      (event as any).key = key;
      (event as any).newValue = value;
      window.dispatchEvent(event);
      originalSetItem.apply(this, [key, value]);
    };

    const handleLocalChange = (e: Event) => {
      if ((e as any).key === 'sidebarCollapsed') {
        setIsSidebarOpen((e as any).newValue !== 'true');
      }
    };

    window.addEventListener('localStorageChange', handleLocalChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleLocalChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    
    checkScreenSize();
    
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  useEffect(() => {
    if (!isMobile) {
      const isCurrentlyCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      const shouldBeCollapsed = !isSidebarOpen;
      
      if (isCurrentlyCollapsed !== shouldBeCollapsed) {
        localStorage.setItem('sidebarCollapsed', shouldBeCollapsed.toString());
      }
    }
  }, [isSidebarOpen, isMobile]);
  
  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      const newState = !isSidebarOpen;
      setIsSidebarOpen(newState);
      localStorage.setItem('sidebarCollapsed', (!newState).toString());
      
      const event = new Event('sidebar-toggled');
      window.dispatchEvent(event);
    }
  };
  
  const handleOverlayClick = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };
  
  // إضافة timeout للكشف عن التحميل المعلق - يجب أن يكون خارج الشرط
  useEffect(() => {
    if (user && isLoadingUserProfile) {
      const timer = setTimeout(() => {
        console.warn('⚠️ تحميل ملف المستخدم يأخذ وقتاً أطول من المتوقع');
        
        // إضافة مؤشر للمشكلة إذا استمر التحميل أكثر من 15 ثانية
        const longTimer = setTimeout(() => {
          console.error('🚨 تحميل ملف المستخدم معلق - قد تحتاج لإعادة تحميل الصفحة');
        }, 15000);

        return () => clearTimeout(longTimer);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoadingUserProfile]);

  if (user && isLoadingUserProfile) {
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
      
      {/* القائمة الجانبية الثابتة */}
      {isStaff && !isLoadingUserProfile && !isMobile && (
        <aside
          className={cn(
            "fixed top-16 bottom-0 right-0 z-40 border-l border-border/30 bg-background/95 backdrop-blur-sm transition-all duration-300",
            isSidebarOpen ? "w-72" : "w-20"
          )}
        >
          <SideMenu userRole={userRole} userPermissions={userPermissions} />
        </aside>
      )}
      
      {/* المحتوى الرئيسي */}
      <main 
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          isSidebarOpen && !isMobile ? "mr-72" : isMobile ? "mr-0" : "mr-20"
        )}
      >
        <div className="max-w-7xl mx-auto p-4 md:p-6 pb-8">
          {children}
        </div>
      </main>
      
      {isStaff && !isLoadingUserProfile && isMobile && (
        <>
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={handleOverlayClick}
            />
          )}
          <aside 
            className={cn(
              "fixed right-0 top-0 h-screen z-50 border-l border-border/30 transition-all duration-300 shadow-xl w-72 bg-background/95",
              isMobileSidebarOpen ? "translate-x-0" : "translate-x-[100%]"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-card shadow-sm border-b border-sidebar-border">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Store className="w-5 h-5" />
                {userProfile?.store_name || 'متجر بازار'}
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
    </div>
  );
}
