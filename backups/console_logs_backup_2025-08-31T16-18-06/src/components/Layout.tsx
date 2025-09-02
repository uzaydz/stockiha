import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import SideMenu from '@/components/sidebar/SideMenu';
import { cn } from '@/lib/utils';
import { X, Menu, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmployeePermissions } from '@/types/employee';

// استيراد ملف CSS المخصص لضمان عدم التداخل
import './layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

// تحسين: استخدام React.memo لمنع إعادة التصيير غير الضرورية
const Layout = memo(({ children }: LayoutProps) => {
  const { user, userProfile, isLoading } = useAuth();
  
  // تحسين: استخدام useMemo لحساب القيم المشتقة
  const userRole = useMemo(() => userProfile?.role || null, [userProfile?.role]);
  const userPermissions = useMemo(() => 
    (userProfile?.permissions || {}) as unknown as Record<string, boolean>, 
    [userProfile?.permissions]
  );
  const isStaff = useMemo(() => 
    userProfile?.role === 'admin' || userProfile?.role === 'employee', 
    [userProfile?.role]
  );

  // القائمة الجانبية دائماً مفتوحة - لا حاجة للحالة
  const isSidebarOpen = true;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      return window.innerWidth < 768;
    } catch {
      return false;
    }
  });
  
  // إزالة معالجات تغيير localStorage - القائمة دائماً مفتوحة

  // تحسين: إضافة debounce لتجنب التحديثات المتكررة
  const checkScreenSize = useCallback(() => {
    const newIsMobile = window.innerWidth < 768;
    
    // تجنب التحديثات غير الضرورية
    if (newIsMobile !== isMobile) {
      setIsMobile(newIsMobile);
      
      // إذا تحول إلى mobile، إغلاق قائمة الجوال فقط
      if (newIsMobile) {
        setIsMobileSidebarOpen(false);
      } else {
        // إذا تحول إلى desktop، إغلاق قائمة الجوال
        setIsMobileSidebarOpen(false);
      }
    }
  }, [isMobile]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    }
    // في desktop، القائمة دائماً مفتوحة - لا نفعل شيئاً
  }, [isMobile, isMobileSidebarOpen]);
  
  const handleOverlayClick = useCallback(() => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  // إزالة معالجة localStorage - القائمة دائماً مفتوحة
  
  // تحسين: إضافة debounce لتجنب التحديثات المتكررة عند resize
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedCheckScreenSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkScreenSize, 100);
    };
    
    // فحص أولي
    checkScreenSize();
    
    window.addEventListener('resize', debouncedCheckScreenSize);
    return () => {
      window.removeEventListener('resize', debouncedCheckScreenSize);
      clearTimeout(timeoutId);
    };
  }, [checkScreenSize]);
  
  // ملاحظة: لا نقوم بمزامنة localStorage قسريًا هنا لتفادي التذبذب
  // حيث أن المصدر الأساسي للحقيقة هو localStorage وتغييره يتم فقط
  // عبر أزرار التبديل أو منطق الاستجابة في useSidebar.
  
  // تحسين: إضافة timeout للكشف عن التحميل المعلق - يجب أن يكون خارج الشرط
  useEffect(() => {
    if (user && isLoading) {
      const timer = setTimeout(() => {
        // إضافة مؤشر للمشكلة إذا استمر التحميل أكثر من 15 ثانية
        const longTimer = setTimeout(() => {
        }, 15000);

        return () => clearTimeout(longTimer);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);

  // تحسين: استخدام useMemo لحساب classes - القائمة دائماً مفتوحة
  const sidebarClasses = useMemo(() => cn(
    "fixed top-16 bottom-0 right-0 z-30 border-l border-border/30 bg-background w-72"
  ), []);

  const mainClasses = useMemo(() => {
    // تحسين: منطق أكثر وضوحاً لتجنب التداخل
    if (isMobile) {
      return cn(
        "pt-16 min-h-screen",
        isMobileSidebarOpen ? "mr-72" : "mr-0"
      );
    } else {
      // في desktop، القائمة دائماً مفتوحة بعرض 72
      return cn(
        "pt-16 min-h-screen mr-72"
      );
    }
  }, [isMobile, isMobileSidebarOpen]);

  const mobileSidebarClasses = useMemo(() => cn(
    "fixed right-0 top-0 h-screen z-40 border-l border-border/30 shadow-xl w-72 bg-background",
    isMobileSidebarOpen ? "translate-x-0" : "translate-x-[100%]"
  ), [isMobileSidebarOpen]);

  if (user && isLoading) {
    return (
      <div dir="rtl" className="bg-background/95 min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">جاري تحميل ملف المستخدم...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="bg-background/95 min-h-screen relative layout-container">
      {/* Navbar - أعلى مستوى z-index */}
      <Navbar 
        className="layout-navbar shadow-sm h-16 bg-background/95 backdrop-blur-sm" 
        toggleSidebar={toggleSidebar} 
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
      />
      
      {/* القائمة الجانبية الثابتة - desktop فقط */}
      {isStaff && !isLoading && !isMobile && (
        <aside className={cn(sidebarClasses, "layout-sidebar")}>
          <SideMenu userRole={userRole} userPermissions={userPermissions} />
        </aside>
      )}
      
      {/* المحتوى الرئيسي */}
      <main className={cn(mainClasses, "layout-main")}>
        <div className="max-w-7xl mx-auto p-4 md:p-6 pb-8">
          {children}
        </div>
      </main>
      
      {/* القائمة الجانبية للجوال - mobile فقط */}
      {isStaff && !isLoading && isMobile && (
        <>
          {/* Overlay للخلفية */}
          {isMobileSidebarOpen && (
            <div 
              className="layout-overlay"
              onClick={handleOverlayClick}
            />
          )}
          
          {/* القائمة الجانبية للجوال */}
          <aside className={cn(mobileSidebarClasses, "layout-mobile-sidebar")}>
            <div className="flex items-center justify-between px-4 py-3 bg-card shadow-sm border-b border-sidebar-border">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Store className="w-5 h-5" />
                {userProfile?.store_name || 'متجر سطوكيها'}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className="text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SideMenu userRole={userRole} userPermissions={userPermissions} />
          </aside>
          
          {/* زر فتح القائمة للجوال */}
          {!isMobileSidebarOpen && (
            <Button
              className="layout-mobile-button bg-primary"
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
});

Layout.displayName = 'Layout';

export default Layout;
