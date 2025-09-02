import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ACTIVE_GROUP_STORAGE_KEY } from '@/components/sidebar/types';

export const useSidebar = () => {
  const location = useLocation();
  
  // نقاط التوقف لضبط سلوك القائمة تلقائيًا
  const MOBILE_BREAKPOINT = 768; // أقل من هذا يعتبر هاتف ويُدار من تخطيط الجوال
  const AUTO_COLLAPSE_BREAKPOINT = 1024; // حتى هذا المقاس تُطوى القائمة تلقائيًا
  
  // تحقق إذا كنا في صفحة POS
  const isInPOSPage = location.pathname === '/dashboard/pos-advanced' || 
                     location.pathname.startsWith('/dashboard/pos-advanced/');
  
  // القائمة الجانبية دائماً مفتوحة - لا حاجة لحالة الطي
  const isCollapsed = false;
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

  // إزالة وظيفة الطي - القائمة دائماً مفتوحة
  const toggleCollapse = useCallback(() => {
    // لا تفعل شيئاً - القائمة دائماً مفتوحة
    return;
  }, []);

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

  // إزالة منطق إدارة الحالة حسب الصفحة - القائمة دائماً مفتوحة

  // إزالة منطق إدارة حجم الشاشة - القائمة دائماً مفتوحة

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

  // إزالة استماع تغييرات localStorage - لا حاجة له

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

  // إزالة منطق إدارة الحالة المكرر - القائمة دائماً مفتوحة

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
