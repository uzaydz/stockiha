import { useEffect, useState } from 'react';
import { X, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import SuperAdminNavbar from './SuperAdminNavbar';
import SuperAdminSidebar from './SuperAdminSidebar';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // إضافة logging للتشخيص
  useEffect(() => {
    console.log('🔍 [SuperAdminLayout] Component mounted');
    console.log('🔍 [SuperAdminLayout] User:', user?.id);
    console.log('🔍 [SuperAdminLayout] IsLoading:', isLoading);
  }, [user, isLoading]);
  
  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      console.log('🔍 [SuperAdminLayout] Screen size check:', { width: window.innerWidth, isMobile: mobile });
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    
    checkScreenSize();
    
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // Check if user is super admin and handle loading state
  useEffect(() => {
    console.log('🔍 [SuperAdminLayout] Checking user status...');
    
    if (user) {
      console.log('🔍 [SuperAdminLayout] User found, checking super admin status...');
      
      // التحقق من localStorage للتأكد من أن المستخدم هو super admin
      const isSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
      const superAdminSession = localStorage.getItem('super_admin_session');
      
      console.log('🔍 [SuperAdminLayout] LocalStorage check:', { isSuperAdmin, hasSession: !!superAdminSession });
      
      if (isSuperAdmin && superAdminSession) {
        try {
          const sessionData = JSON.parse(superAdminSession);
          const now = Date.now();
          
          // التحقق من أن الجلسة صالحة (24 ساعة)
          if (sessionData.userId === user.id && (now - sessionData.timestamp) < 24 * 60 * 60 * 1000) {
            console.log('🔍 [SuperAdminLayout] Valid super admin session found');
            setIsLoading(false);
            setDebugInfo('تم تأكيد صلاحيات السوبر أدمين');
          } else {
            console.log('🔍 [SuperAdminLayout] Super admin session expired');
            setIsLoading(false);
            setDebugInfo('انتهت صلاحية جلسة السوبر أدمين');
          }
        } catch (error) {
          console.error('🔍 [SuperAdminLayout] Error parsing super admin session:', error);
          setIsLoading(false);
          setDebugInfo('خطأ في قراءة جلسة السوبر أدمين');
        }
      } else {
        console.log('🔍 [SuperAdminLayout] No super admin session found');
        setIsLoading(false);
        setDebugInfo('لم يتم العثور على جلسة السوبر أدمين');
      }
    } else {
      console.log('🔍 [SuperAdminLayout] No user found');
      setIsLoading(true);
      setDebugInfo('لم يتم العثور على مستخدم');
    }
  }, [user]);
  
  // Restore sidebar state from local storage
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('superAdminSidebarOpen');
    if (savedSidebarState !== null && !isMobile) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }
  }, [isMobile]);
  
  // Save sidebar state to local storage
  useEffect(() => {
    localStorage.setItem('superAdminSidebarOpen', isSidebarOpen.toString());
  }, [isSidebarOpen]);
  
  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };
  
  // Close mobile sidebar when clicking outside
  const handleOverlayClick = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  if (isLoading) {
    console.log('🔍 [SuperAdminLayout] Rendering loading state');
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">جاري تحميل لوحة السوبر أدمين...</p>
          {debugInfo && (
            <p className="mt-2 text-sm text-gray-500">{debugInfo}</p>
          )}
        </div>
      </div>
    );
  }

  console.log('🔍 [SuperAdminLayout] Rendering main layout');
  return (
    <div dir="rtl" className="bg-background/95 min-h-screen">
      <SuperAdminNavbar 
        className="fixed top-0 left-0 right-0 z-50 shadow-sm bg-primary/10 backdrop-blur-md" 
        toggleSidebar={toggleSidebar} 
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
      />
      
      {/* تخطيط المحتوى الرئيسي مع الشريط الجانبي */}
      <div className="flex h-screen pt-16">
        {/* الشريط الجانبي للشاشات الكبيرة */}
        {!isLoading && !isMobile && (
          <div 
            className={cn(
              "fixed top-16 bottom-0 right-0 z-40 border-l border-border/30 transition-all duration-300 bg-primary-foreground/5 overflow-y-auto",
              isSidebarOpen ? "w-64" : "w-0"
            )}
          >
            <SuperAdminSidebar />
          </div>
        )}
        
        {/* المحتوى الرئيسي مع هامش لترك مساحة للشريط الجانبي */}
        <main 
          className={cn(
            "flex-1 overflow-x-hidden",
            !isLoading && !isMobile && isSidebarOpen ? "mr-64" : "mr-0"
          )}
        >
          <div className="max-w-7xl mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* الشريط الجانبي للجوال */}
      {!isLoading && isMobile && (
        <>
          {/* Overlay when sidebar is open */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={handleOverlayClick}
            />
          )}
          
          <aside 
            className={cn(
              "fixed right-0 top-0 h-screen z-50 border-l border-border/30 transition-all duration-300 shadow-xl bg-card w-64",
              isMobileSidebarOpen ? "translate-x-0" : "translate-x-[100%]"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-primary shadow-sm">
              <h2 className="text-lg font-bold text-primary-foreground">لوحة المسؤول الرئيسي</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className="text-primary-foreground hover:text-primary-foreground hover:bg-primary/90"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SuperAdminSidebar />
          </aside>
          
          {/* Mobile toggle button */}
          {!isMobileSidebarOpen && (
            <Button
              className="fixed bottom-6 right-6 z-30 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              size="icon"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
