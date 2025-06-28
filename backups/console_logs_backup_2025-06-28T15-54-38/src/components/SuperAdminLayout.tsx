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
  
  // Check screen size
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
  
  // Check if user is super admin and handle loading state
  useEffect(() => {
    if (user) {
      // In a real implementation, this would verify the user is a super admin
      setIsLoading(false);
    } else {
      setIsLoading(true);
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
    return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  }

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
