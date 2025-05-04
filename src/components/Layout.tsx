import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import SideMenu from '@/components/SideMenu';
import { cn } from '@/lib/utils';
import { getCurrentUserProfile } from '@/lib/api/users';
import { X, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // استخدام معرفة حجم الشاشة
  const [isMobile, setIsMobile] = useState(false);
  
  // التعرف على حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    
    // التحقق عند تحميل الصفحة
    checkScreenSize();
    
    // التحقق عند تغيير حجم النافذة
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const userProfile = await getCurrentUserProfile();
          if (userProfile) {
            setUserRole(userProfile.role);
            setUserPermissions(userProfile.permissions || {});
            setIsStaff(userProfile.role === 'admin' || userProfile.role === 'employee');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUserRole(null);
        setUserPermissions(null);
        setIsStaff(false);
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  // استرجاع حالة القائمة الجانبية من المتصفح
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null && !isMobile) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }
  }, [isMobile]);
  
  // حفظ حالة القائمة الجانبية في المتصفح
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isSidebarOpen.toString());
  }, [isSidebarOpen]);
  
  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };
  
  // إغلاق القائمة الجانبية في الجوال عند النقر خارجها
  const handleOverlayClick = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <div dir="rtl" className="bg-background/95 min-h-screen">
      <Navbar 
        className="fixed top-0 left-0 right-0 z-30 shadow-sm bg-background/80 backdrop-blur-md" 
        toggleSidebar={toggleSidebar} 
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
      />
      
      <div className="pt-16 flex min-h-[calc(100vh-4rem)] relative">
        {/* القائمة الجانبية للشاشات الكبيرة */}
        {isStaff && !isLoading && !isMobile && (
          <aside 
            className={cn(
              "fixed right-0 top-16 h-[calc(100vh-4rem)] z-20 border-l border-border/30 transition-all duration-300",
              isSidebarOpen ? "translate-x-0" : "translate-x-64"
            )}
          >
            <SideMenu userRole={userRole} userPermissions={userPermissions} />
          </aside>
        )}
        
        {/* القائمة الجانبية للهواتف المحمولة */}
        {isStaff && !isLoading && isMobile && (
          <>
            {/* طبقة التظليل عند فتح القائمة */}
            {isMobileSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                onClick={handleOverlayClick}
              />
            )}
            
            <aside 
              className={cn(
                "fixed right-0 top-0 h-screen z-40 border-l border-border/30 transition-all duration-300 shadow-xl",
                isMobileSidebarOpen ? "translate-x-0" : "translate-x-[100%]"
              )}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-card shadow-sm">
                <h2 className="text-lg font-bold text-primary">لوحة التحكم</h2>
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
            
            {/* زر فتح القائمة الجانبية للهواتف */}
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
        
        <main className={cn(
          "w-full transition-all duration-300",
          isStaff && !isLoading && !isMobile && isSidebarOpen ? "mr-64" : "mr-0"
        )}>
          <div className="max-w-7xl mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
