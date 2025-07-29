import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ACTIVE_GROUP_STORAGE_KEY } from '@/components/sidebar/types';

export const useSidebar = () => {
  const location = useLocation();
  
  // تحقق إذا كنا في صفحة POS
  const isInPOSPage = location.pathname === '/dashboard/pos-advanced' || 
                     location.pathname.startsWith('/dashboard/pos-advanced/');
  
  // تحديد الحالة الأولية بناءً على الصفحة الحالية
  const getInitialCollapsedState = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // إذا كنا في صفحة POS، فالقائمة مطوية دائماً
    if (isInPOSPage) {
      return true;
    }
    
    // وإلا، استعادة من localStorage مع قيمة افتراضية false (موسعة)
    const stored = localStorage.getItem('sidebarCollapsed');
    return stored === 'true';
  }, [isInPOSPage]);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(getInitialCollapsedState());
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false
  );

  // استعادة المجموعة النشطة من التخزين المحلي
  const getInitialActiveGroup = useCallback(() => {
    try {
      const storedGroup = localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
      return storedGroup || 'الرئيسية';
    } catch (e) {
      return 'الرئيسية';
    }
  }, []);
  
  const [activeGroup, setActiveGroup] = useState<string | null>(getInitialActiveGroup());

  // تبديل حالة طي القائمة الجانبية
  const toggleCollapse = useCallback(() => {
    // منع التوسيع في صفحة POS
    if (isInPOSPage) {
      return;
    }

    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      // حفظ الحالة المفضلة أيضاً
      localStorage.setItem('sidebarPreferredState', String(newState));
      return newState;
    });
    
    // إغلاق أي قائمة منبثقة مفتوحة عند تغيير حالة الطي
    setActivePopup(null);
  }, [isInPOSPage]);

  // تبديل وضع الظلام/الضوء
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', String(newMode));
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  }, []);

  // تبديل حالة القائمة المنبثقة
  const togglePopup = useCallback((groupName: string) => {
    setActivePopup(prev => prev === groupName ? null : groupName);
  }, []);

  // تبديل المجموعة النشطة
  const toggleGroup = useCallback((group: string) => {
    setActiveGroup(prevGroup => prevGroup === group ? null : group);
  }, []);

  // إدارة حالة القائمة الجانبية حسب الصفحة
  useEffect(() => {
    if (isInPOSPage && !isCollapsed) {
      // حفظ الحالة الحالية كحالة مفضلة قبل طي القائمة
      localStorage.setItem('sidebarPreferredState', 'false');
      
      // إذا دخلنا صفحة POS والقائمة موسعة، قم بطيها
      setIsCollapsed(true);
      localStorage.setItem('sidebarCollapsed', 'true');
      
      // إرسال حدث لإشعار المكونات الأخرى
      const event = new Event('localStorageChange');
      (event as any).key = 'sidebarCollapsed';
      (event as any).newValue = 'true';
      window.dispatchEvent(event);
    } else if (!isInPOSPage && isCollapsed) {
      // إذا لم نعد في صفحة POS والقائمة مطوية، استعيد الحالة المفضلة
      const preferredState = localStorage.getItem('sidebarPreferredState') || 'false';
      const shouldBeCollapsed = preferredState === 'true';
      
      if (!shouldBeCollapsed) {
        // إذا لم نعد في صفحة POS والقائمة مطوية، قم بتوسيعها
        // إزالة الشرط الذي يتحقق من localStorage لأنه قد يسبب مشاكل
        setIsCollapsed(false);
        localStorage.setItem('sidebarCollapsed', 'false');
        
        // إرسال حدث لإشعار المكونات الأخرى
        const event = new Event('localStorageChange');
        (event as any).key = 'sidebarCollapsed';
        (event as any).newValue = 'false';
        window.dispatchEvent(event);
      }
    }
  }, [isInPOSPage, isCollapsed]);

  // حفظ المجموعة النشطة في التخزين المحلي عند تغييرها
  useEffect(() => {
    if (activeGroup) {
      try {
        localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, activeGroup);
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  }, [activeGroup]);

  // استماع للتغييرات في localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        const newCollapsedState = e.newValue === 'true';
        // تجنب تحديث الحالة إذا كنا في صفحة POS
        if (!isInPOSPage) {
          setIsCollapsed(newCollapsedState);
        }
      }
    };
    
    const handleInternalChange = () => {
      // تجنب تحديث الحالة إذا كنا في صفحة POS
      if (!isInPOSPage) {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        setIsCollapsed(isCollapsed);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sidebar-toggled', handleInternalChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebar-toggled', handleInternalChange);
    };
  }, [isInPOSPage]);

  // التعامل مع تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      if (activePopup) {
        setActivePopup(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activePopup]);

  // إغلاق القوائم المنبثقة عند تغيير المسار
  useEffect(() => {
    if (activePopup) {
      setActivePopup(null);
    }
  }, [location.pathname]);

  // إعادة تعيين حالة القائمة الجانبية عند تغيير المسار لضمان التزامن
  useEffect(() => {
    // تأخير قصير لضمان تحديث isInPOSPage أولاً
    const timer = setTimeout(() => {
      if (isInPOSPage) {
        // في صفحة POS، تأكد من أن القائمة مطوية
        if (!isCollapsed) {
          // حفظ الحالة الحالية كحالة مفضلة
          localStorage.setItem('sidebarPreferredState', 'false');
          setIsCollapsed(true);
          localStorage.setItem('sidebarCollapsed', 'true');
        }
      } else {
        // خارج صفحة POS، استعيد الحالة المفضلة
        const preferredState = localStorage.getItem('sidebarPreferredState');
        const shouldBeCollapsed = preferredState === 'true';
        
        if (isCollapsed !== shouldBeCollapsed) {
          setIsCollapsed(shouldBeCollapsed);
          localStorage.setItem('sidebarCollapsed', String(shouldBeCollapsed));
          
          // إرسال حدث لإشعار Layout
          const event = new Event('localStorageChange');
          (event as any).key = 'sidebarCollapsed';
          (event as any).newValue = String(shouldBeCollapsed);
          window.dispatchEvent(event);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, isInPOSPage, isCollapsed]);

  // تعيين وضع الظلام عند التحميل
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return {
    isCollapsed,
    activePopup,
    isDarkMode,
    activeGroup,
    isInPOSPage,
    toggleCollapse,
    toggleDarkMode,
    togglePopup,
    toggleGroup,
    setActivePopup,
    setActiveGroup
  };
}; 